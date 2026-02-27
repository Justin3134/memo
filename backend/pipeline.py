"""
Core pipeline: Vapi → Modulate Velma-2 → Senso (retrieve) → OpenAI → Reka → Neo4j → Tavily → Senso (index).

The autonomous agent loop:
  OBSERVE  → Vapi + Modulate (collect voice data)
  REMEMBER → Senso retrieval (past conversation context)
  REASON   → OpenAI + Reka cross-validation (analyze cognition)
  ACT      → Tavily (fetch evidence) + Alerts (notify family)
  LEARN    → Senso (index new memory) + Neo4j (knowledge graph)
"""
import os, json, time, logging, asyncio
import httpx
from openai import OpenAI
import neo4j_service as neo4j
import modulate_service as modulate
import audio_analysis
import tavily_service as tavily
import senso_service as senso
import reka_service as reka

logger = logging.getLogger(__name__)
openai_client = OpenAI(api_key=os.environ.get("OPENAI_API_KEY", ""))


def analyze_with_openai(transcript: str, duration: float,
                        baseline: float, modulate_signals: dict | None = None,
                        senso_context: str = "") -> dict:

    modulate_context = ""
    if modulate_signals and modulate_signals.get("source") == "modulate_velma2":
        modulate_context = f"""
MODULATE VELMA-2 VOICE ANALYSIS (real acoustic signals from audio):
  Speech Rate: {modulate_signals.get('speech_rate_wpm', 0)} wpm
  Pause Frequency: {modulate_signals.get('pause_frequency_per_min', 0)}/min
  Long Pauses (>1.5s): {modulate_signals.get('long_pauses_over_1s', 0)}
  Dominant Emotion: {modulate_signals.get('dominant_emotion', 'Unknown')}
  Emotion Breakdown: {json.dumps(modulate_signals.get('emotion_breakdown', {}))}
  Hesitation Events: {modulate_signals.get('hesitation_events', 0)}
  Word-Finding Delays: {modulate_signals.get('word_finding_delays', 0)}
  Fluency Score: {modulate_signals.get('fluency_score', 0)}
  Vocal Tremor: {modulate_signals.get('vocal_tremor', 'none')}
  Engagement: {modulate_signals.get('engagement_level', 0)}
Use these REAL audio measurements to inform your scoring — they are more accurate than transcript-only analysis."""

    memory_context = ""
    if senso_context:
        memory_context = f"""
CONVERSATION HISTORY (from Senso memory — what the patient discussed in recent calls):
{senso_context}
Use this to detect changes: are they forgetting topics they used to mention? Are they repeating things? Has their mood shifted compared to previous calls?"""

    prompt = f"""You are a clinical speech analysis AI for an elderly care platform.
Analyze this call and return ONLY valid JSON.

TRANSCRIPT: {transcript[:5000]}
DURATION: {duration}s | BASELINE COGNITIVE: {baseline}
{modulate_context}
{memory_context}

Return JSON:
{{
  "cognitiveScore": <0-100>,
  "emotionalScore": <0-100>,
  "motorScore": <0-100>,
  "wordFindingScore": <0-100>,
  "hesitationCount": <int>,
  "speechRate": <wpm int>,
  "pauseFrequency": <float>,
  "callSummary": "<3 warm sentences for family, never clinical>",
  "anomalyDetected": <true|false>,
  "anomalyType": "<word_finding_decline|memory_gaps|emotional_distress|physical_concern|cognitive_decline|null>",
  "anomalySeverity": "<low|medium|high|null>",
  "anomalyDescription": "<plain English for family or null>",
  "healthMentions": ["<topics>"],
  "conversationSignals": [{{"quote":"<verbatim>","signal":"<label>","explanation":"<one sentence>"}}],
  "memories": [{{"category":"<daily_life|health|family|mood>","content":"<memory>","entities":[],"sentiment":"<positive|neutral|negative>"}}],
  "videoGuidanceTopic": "<topic or null>",
  "videoTone": "<encouraging|calming|educational|null>"
}}
RULES: quotes must be verbatim. anomalyDetected=true if score<60 or dropped>15 from baseline."""
    try:
        r = openai_client.chat.completions.create(model="gpt-4o", messages=[{"role":"user","content":prompt}], temperature=0.1, max_tokens=1500)
        raw = r.choices[0].message.content or "{}"
        raw = raw.strip()
        if raw.startswith("```"): raw = raw.split("```")[1]; raw = raw[4:] if raw.startswith("json") else raw
        return json.loads(raw.strip())
    except Exception as e:
        logger.error(f"OpenAI error: {e}")
        return {"cognitiveScore":70,"emotionalScore":70,"motorScore":70,"wordFindingScore":70,
                "hesitationCount":0,"speechRate":120,"pauseFrequency":2.0,
                "callSummary":"Call completed.","anomalyDetected":False,"anomalyType":None,
                "anomalySeverity":None,"anomalyDescription":None,"healthMentions":[],
                "conversationSignals":[],"memories":[],"videoGuidanceTopic":None,"videoTone":None}

YUTORI_BASE = "https://api.yutori.com/v1"
YUTORI_POLL_INTERVAL = 3
YUTORI_MAX_WAIT = 120

RESEARCH_OUTPUT_SCHEMA = {
    "type": "array",
    "items": {
        "type": "object",
        "properties": {
            "title": {"type": "string", "description": "Title of the finding"},
            "url": {"type": "string", "description": "Source URL"},
            "content": {"type": "string", "description": "Brief excerpt or summary (max 300 chars)"},
        },
    },
}


async def _yutori_research(query: str, max_wait: int = YUTORI_MAX_WAIT) -> list[dict]:
    """Create a Yutori Research task, poll until done, return structured results."""
    key = os.environ.get("YUTORI_API_KEY")
    if not key:
        return []
    headers = {"X-API-Key": key, "Content-Type": "application/json"}
    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.post(
            f"{YUTORI_BASE}/research/tasks",
            headers=headers,
            json={"query": query, "output_schema": RESEARCH_OUTPUT_SCHEMA},
        )
        resp.raise_for_status()
        task = resp.json()
        task_id = task["task_id"]
        logger.info(f"Yutori research task created: {task_id}")

        elapsed = 0
        while elapsed < max_wait:
            await asyncio.sleep(YUTORI_POLL_INTERVAL)
            elapsed += YUTORI_POLL_INTERVAL
            status_resp = await client.get(
                f"{YUTORI_BASE}/research/tasks/{task_id}",
                headers=headers,
            )
            status_resp.raise_for_status()
            data = status_resp.json()
            status = data.get("status")
            if status == "succeeded":
                structured = data.get("structured_result")
                if isinstance(structured, list):
                    return structured
                for update in data.get("updates", []):
                    sr = update.get("structured_result")
                    if isinstance(sr, list):
                        return sr
                return []
            if status == "failed":
                logger.error(f"Yutori task {task_id} failed")
                return []
        logger.warning(f"Yutori task {task_id} timed out after {max_wait}s")
        return []


async def fetch_research(anomaly_type: str) -> list[dict]:
    key = os.environ.get("YUTORI_API_KEY")
    if not key:
        return []
    query = f"early detection {anomaly_type.replace('_', ' ')} elderly voice cognitive decline clinical research 2025"
    try:
        results = await _yutori_research(query, max_wait=90)
        return [
            {
                "title": r.get("title", ""),
                "url": r.get("url", ""),
                "source": r.get("url", "").split("/")[2] if r.get("url") else "",
                "excerpt": r.get("content", "")[:300],
                "markers": [anomaly_type],
            }
            for r in results[:3]
        ]
    except Exception as e:
        logger.error(f"Yutori error: {e}")
        return []

async def run_pipeline(patient_id: str, call_id: str, transcript: str, duration: float,
                       patient_name: str = "Patient", baseline: float = 75.0,
                       recording_url: str | None = None) -> dict:
    timestamp = int(time.time() * 1000)

    # Step 1: Download Vapi recording and send to Modulate Velma-2
    acoustic_signals = None
    if recording_url:
        logger.info(f"Downloading recording: {recording_url[:80]}...")
        audio_bytes = audio_analysis.download_recording(recording_url)
        if audio_bytes:
            ext = audio_analysis.guess_extension(recording_url)
            filename = f"call_{call_id}{ext}"
            logger.info(f"Sending {len(audio_bytes)} bytes to Modulate Velma-2...")
            modulate_result = await modulate.analyze_recording(audio_bytes, filename)
            if modulate_result and modulate_result.get("utterances"):
                acoustic_signals = modulate.extract_biomarkers(modulate_result, transcript)
                logger.info(f"Modulate Velma-2 SUCCESS: {acoustic_signals.get('patient_utterance_count', 0)} patient utterances, "
                            f"dominant emotion={acoustic_signals.get('dominant_emotion')}, "
                            f"rate={acoustic_signals.get('speech_rate_wpm')}wpm, "
                            f"fluency={acoustic_signals.get('fluency_score')}")
            else:
                logger.warning("Modulate returned no utterances — falling back to transcript-only analysis")
        else:
            logger.warning(f"Audio download failed for {recording_url[:80]} — Modulate skipped")
    else:
        logger.warning("No recording_url from Vapi — Modulate skipped. "
                        "Enable recording in your Vapi assistant config (recordingEnabled: true).")

    # Step 2: Senso — retrieve past conversation context (the "memory" of the agent)
    senso_context = ""
    try:
        senso_context = await senso.retrieve_context(patient_id, patient_name)
        if senso_context:
            logger.info(f"Senso: loaded {len(senso_context)} chars of past context for {patient_name}")
        else:
            logger.info(f"Senso: no prior context for {patient_name} (first call or key not set)")
    except Exception as e:
        logger.warning(f"Senso retrieval failed (continuing without): {e}")

    # Step 3: OpenAI cognitive analysis (fed with Modulate signals + Senso memory)
    analysis = analyze_with_openai(transcript, duration, baseline,
                                    modulate_signals=acoustic_signals,
                                    senso_context=senso_context)

    # Step 4: Build acoustic signals (Modulate real data or transcript-derived fallback)
    if acoustic_signals:
        speech_rate = float(acoustic_signals["speech_rate_wpm"])
        pause_freq = float(acoustic_signals["pause_frequency_per_min"])
        hesitations = int(acoustic_signals["hesitation_events"])
        emotional = float(acoustic_signals.get("emotional_score", analysis.get("emotionalScore", 70)))
    else:
        speech_rate = float(analysis.get("speechRate", 120))
        pause_freq = float(analysis.get("pauseFrequency", 2.0))
        hesitations = int(analysis.get("hesitationCount", 0))
        emotional = float(analysis.get("emotionalScore", 70))
        acoustic_signals = modulate.transcript_fallback(
            transcript=transcript, duration=duration,
            speech_rate=speech_rate, pause_frequency=pause_freq,
            hesitation_count=hesitations, emotional_score=emotional,
        )

    logger.info(f"Acoustic signals [{acoustic_signals.get('source', 'unknown')}]: "
                f"fluency={acoustic_signals.get('fluency_score')}, "
                f"tremor={acoustic_signals.get('vocal_tremor')}, "
                f"engagement={acoustic_signals.get('engagement_level')}")

    # Step 5: Reka cross-validation (independent second opinion)
    reka_result = None
    try:
        reka_result = await reka.cross_validate(
            transcript=transcript, duration=duration,
            openai_scores=analysis, modulate_signals=acoustic_signals,
        )
    except Exception as e:
        logger.error(f"Reka cross-validation failed: {e}")

    # If both models agree on anomaly → high confidence
    # If they disagree → note it in the output
    if reka_result:
        if reka_result.get("anomalyDetected") and not analysis.get("anomalyDetected"):
            analysis["anomalyDetected"] = True
            analysis["anomalyType"] = "cognitive_decline"
            analysis["anomalySeverity"] = "low"
            analysis["anomalyDescription"] = (
                f"Reka AI flagged a concern the primary model missed: "
                f"{reka_result.get('reasoning', 'potential cognitive change detected')}"
            )
            logger.info("Reka escalated: anomaly detected by second opinion")

    # Step 6: Neo4j — write full analysis to knowledge graph
    try:
        neo4j.write_call_analysis(
            patient_id=patient_id, call_id=call_id, duration=duration,
            summary=analysis.get("callSummary",""), timestamp=timestamp,
            speech_rate=speech_rate,
            pause_frequency=pause_freq,
            hesitation_count=hesitations,
            word_finding_score=float(analysis.get("wordFindingScore",70)),
            cognitive_score=float(analysis.get("cognitiveScore",70)),
            emotional_score=emotional,
            motor_score=float(analysis.get("motorScore",70)),
            entities={},
            anomaly_detected=bool(analysis.get("anomalyDetected",False)),
            anomaly_type=analysis.get("anomalyType"),
            anomaly_severity=analysis.get("anomalySeverity"),
            anomaly_description=analysis.get("anomalyDescription"),
        )
        neo4j.build_temporal_chain(patient_id)
        neo4j.build_cross_patient_similarity(patient_id)
    except Exception as e:
        logger.error(f"Neo4j write failed: {e}")

    # Step 7: Tavily — fetch clinical research for anomalies (runs in thread to avoid blocking)
    research = []
    if analysis.get("anomalyDetected") and analysis.get("anomalyType"):
        try:
            research = await asyncio.to_thread(tavily.search_clinical_research, analysis["anomalyType"])
        except Exception:
            research = []
        if not research:
            research = await fetch_research(analysis["anomalyType"])
        if research:
            try: neo4j.attach_research(call_id, research)
            except Exception as e: logger.error(f"Research attach failed: {e}")

    # Step 8: Senso — index conversation for memory continuity
    try:
        await senso.index_conversation(
            patient_id=patient_id, patient_name=patient_name,
            call_id=call_id, summary=analysis.get("callSummary", ""),
            memories=analysis.get("memories"), timestamp=timestamp,
        )
    except Exception as e:
        logger.error(f"Senso index failed: {e}")

    return {
        **analysis,
        "researchItems": research,
        "timestamp": timestamp,
        "acousticSignals": acoustic_signals,
        "rekaValidation": reka_result,
        "sensoContextUsed": bool(senso_context),
    }
