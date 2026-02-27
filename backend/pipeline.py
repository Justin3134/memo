"""Core pipeline: Vapi Recording → Modulate Velma-2 → GLiNER2 → OpenAI → Neo4j → Tavily."""
import os, json, time, logging, asyncio
import httpx
from openai import OpenAI
import neo4j_service as neo4j
import modulate_service as modulate
import audio_analysis

logger = logging.getLogger(__name__)
openai_client = OpenAI(api_key=os.environ.get("OPENAI_API_KEY", ""))

_gliner = None
def get_gliner():
    global _gliner
    if _gliner is None:
        try:
            from gliner2 import GLiNER2
            _gliner = GLiNER2.from_api() if os.environ.get("PIONEER_API_KEY") else GLiNER2.from_pretrained("fastino/gliner2-base-v1")
            logger.info("GLiNER2 loaded")
        except Exception as e:
            logger.error(f"GLiNER2 failed: {e}")
    return _gliner

COGNITIVE_LABELS = ["memory_lapse","confusion_indicator","word_finding_difficulty",
                    "repetition","disorientation","medication_mention","pain_mention",
                    "loneliness_indicator","emotional_distress","sleep_problem","forgetting_event"]

def extract_entities(transcript: str) -> dict:
    g = get_gliner()
    if not g: return {}
    try:
        return g.extract_entities(transcript, COGNITIVE_LABELS).get("entities", {})
    except Exception as e:
        logger.error(f"GLiNER2 error: {e}"); return {}

def analyze_with_openai(transcript: str, duration: float, entities: dict,
                        baseline: float, modulate_signals: dict | None = None) -> dict:
    entity_str = json.dumps({k: v for k, v in entities.items() if v}, indent=2) if entities else "(none)"

    modulate_context = ""
    if modulate_signals and modulate_signals.get("source") == "modulate_velma2":
        modulate_context = f"""
MODULATE VELMA-2 VOICE ANALYSIS (real audio signals):
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

    prompt = f"""You are a clinical speech analysis AI for an elderly care platform.
Analyze this call and return ONLY valid JSON.

TRANSCRIPT: {transcript[:5000]}
DURATION: {duration}s | BASELINE COGNITIVE: {baseline}
ENTITIES DETECTED BY GLiNER2: {entity_str}
{modulate_context}

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
                logger.info(f"Modulate Velma-2: {acoustic_signals.get('patient_utterance_count', 0)} patient utterances, "
                            f"dominant emotion={acoustic_signals.get('dominant_emotion')}, "
                            f"rate={acoustic_signals.get('speech_rate_wpm')}wpm, "
                            f"fluency={acoustic_signals.get('fluency_score')}")
            else:
                logger.warning("Modulate returned no utterances, falling back to transcript")

    # Step 2: GLiNER2 entity extraction
    entities = extract_entities(transcript)

    # Step 3: OpenAI cognitive analysis (fed with Modulate signals for better accuracy)
    analysis = analyze_with_openai(transcript, duration, entities, baseline,
                                    modulate_signals=acoustic_signals)

    # Step 4: Build final acoustic signals (Modulate real data or transcript fallback)
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

    # Step 5: Neo4j — write full analysis to knowledge graph
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
            entities=entities,
            anomaly_detected=bool(analysis.get("anomalyDetected",False)),
            anomaly_type=analysis.get("anomalyType"),
            anomaly_severity=analysis.get("anomalySeverity"),
            anomaly_description=analysis.get("anomalyDescription"),
        )
    except Exception as e:
        logger.error(f"Neo4j write failed: {e}")

    # Step 6: Fetch clinical research for anomalies
    research = []
    if analysis.get("anomalyDetected") and analysis.get("anomalyType"):
        research = await fetch_research(analysis["anomalyType"])
        if research:
            try: neo4j.attach_research(call_id, research)
            except Exception as e: logger.error(f"Research attach failed: {e}")

    return {
        **analysis,
        "entities": entities,
        "researchItems": research,
        "timestamp": timestamp,
        "acousticSignals": acoustic_signals,
    }
