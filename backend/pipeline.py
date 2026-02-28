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
  "anomalyDescription": "<detailed evidence-based description: 3-5 sentences. Reference SPECIFIC voice metrics from Modulate (e.g. 'Speech rate measured at X wpm, pause frequency at Y/min'). Explain what these acoustic patterns may indicate clinically (e.g. 'Elevated pause frequency above 6/min is associated with word-finding difficulty, an early marker of MCI'). Connect to potential conditions (dementia, depression, cognitive decline). Explain WHY this matters for early detection. Never be vague — use the actual numbers.>",
  "healthMentions": ["<meaningful multi-word phrases describing what was discussed, e.g. 'difficulty sleeping', 'forgetting recent events', 'trouble with daily tasks' — NOT single words>"],
  "topicPhrases": ["<3-6 meaningful conversation topic phrases that capture key themes, e.g. 'Struggling with computer tasks', 'Only slept 3 hours', 'Missing daughter's calls' — multi-word, descriptive>"],
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

PROVIDER_OUTPUT_SCHEMA = {
    "type": "array",
    "items": {
        "type": "object",
        "properties": {
            "name": {"type": "string", "description": "Provider or clinic name"},
            "specialty": {"type": "string", "description": "Medical specialty"},
            "address": {"type": "string", "description": "Full address"},
            "phone": {"type": "string", "description": "Phone number"},
            "website": {"type": "string", "description": "Website URL"},
            "availability": {"type": "string", "description": "Next available appointment or scheduling info"},
            "rating": {"type": "string", "description": "Patient rating if available"},
            "why_relevant": {"type": "string", "description": "Why this provider matches the patient's needs"},
        },
    },
}


async def find_providers_via_yutori(signal_type: str, location: str = "San Francisco Bay Area") -> list[dict]:
    """Find care providers using Tavily (fast) + Yutori (deep). Returns merged results."""
    signal = signal_type.replace("_", " ") if signal_type else "cognitive decline"

    # Run Tavily immediately (fast, reliable) while Yutori searches in parallel
    tavily_task = asyncio.to_thread(_tavily_provider_search, signal, location)
    yutori_task = _yutori_provider_search(signal, location)

    tavily_results: list[dict] = []
    yutori_results: list[dict] = []

    try:
        tavily_results = await asyncio.wait_for(tavily_task, timeout=15)
        for p in tavily_results:
            p["found_by"] = "tavily"
    except Exception as e:
        logger.warning(f"Tavily provider search: {e}")

    try:
        yutori_results = await asyncio.wait_for(yutori_task, timeout=60)
        for p in yutori_results:
            p["found_by"] = "yutori"
    except Exception as e:
        logger.warning(f"Yutori provider search: {e}")

    # Prefer Yutori results (deeper), supplement with Tavily
    seen_names: set[str] = set()
    merged: list[dict] = []
    for p in yutori_results + tavily_results:
        name_key = p.get("name", "").lower().strip()
        if name_key and name_key not in seen_names:
            seen_names.add(name_key)
            merged.append(p)
    return merged[:8]


async def _yutori_provider_search(signal: str, location: str) -> list[dict]:
    key = os.environ.get("YUTORI_API_KEY")
    if not key:
        logger.warning("YUTORI_API_KEY not set")
        return []

    # Parse location into city, region, country for user_location
    loc_parts = [p.strip() for p in location.split(",")]
    user_loc = location if len(loc_parts) >= 2 else f"{location}, CA, US"

    query = (
        f"Find real geriatric neurologists, memory care clinics, and cognitive health specialists "
        f"near {location}. For each provider, find their actual name, address, phone number, "
        f"website URL, patient ratings, and whether they accept Medicare. "
        f"Focus on providers who treat {signal} in elderly patients. "
        f"Check at least 5 different provider directory websites like Healthgrades, Zocdoc, "
        f"WebMD, Vitals, and hospital websites."
    )
    headers = {"X-API-Key": key, "Content-Type": "application/json"}
    try:
        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.post(
                f"{YUTORI_BASE}/research/tasks",
                headers=headers,
                json={
                    "query": query,
                    "output_schema": PROVIDER_OUTPUT_SCHEMA,
                    "user_location": user_loc,
                },
            )
            resp.raise_for_status()
            task = resp.json()
            task_id = task["task_id"]
            logger.info(f"Yutori provider task created: {task_id} (view: {task.get('view_url', '')})")

            elapsed = 0
            while elapsed < 120:
                await asyncio.sleep(YUTORI_POLL_INTERVAL)
                elapsed += YUTORI_POLL_INTERVAL
                status_resp = await client.get(
                    f"{YUTORI_BASE}/research/tasks/{task_id}",
                    headers=headers,
                )
                status_resp.raise_for_status()
                data = status_resp.json()
                status = data.get("status")
                logger.info(f"Yutori task {task_id} status: {status} ({elapsed}s)")

                if status == "succeeded":
                    structured = data.get("structured_result")
                    if isinstance(structured, list) and len(structured) > 0:
                        logger.info(f"Yutori returned {len(structured)} providers")
                        return structured[:8]
                    # Check updates for structured results
                    for update in data.get("updates", []):
                        sr = update.get("structured_result")
                        if isinstance(sr, list) and len(sr) > 0:
                            logger.info(f"Yutori returned {len(sr)} providers via updates")
                            return sr[:8]
                    # Even if structured is empty, try to parse from result text
                    result_text = data.get("result", "")
                    if result_text:
                        logger.info(f"Yutori succeeded but no structured result, raw text length: {len(result_text)}")
                    return []
                if status == "failed":
                    logger.error(f"Yutori provider task {task_id} failed")
                    return []
            logger.warning(f"Yutori provider task {task_id} timed out after 120s")
            return []
    except Exception as e:
        logger.error(f"Yutori provider search failed: {e}")
        return []


def _tavily_provider_search(signal: str, location: str) -> list[dict]:
    """Fallback: use Tavily to search for providers when Yutori is unavailable."""
    tavily_key = os.environ.get("TAVILY_API_KEY")
    if not tavily_key:
        return []
    try:
        from tavily import TavilyClient
        client = TavilyClient(api_key=tavily_key)
        queries = [
            f"best {signal} doctor specialist near {location} reviews appointment",
            f"geriatric neurologist memory care clinic {location} accepting patients",
        ]
        providers = []
        seen_urls: set[str] = set()
        for q in queries:
            try:
                result = client.search(query=q, search_depth="advanced", max_results=5)
                for r in result.get("results", []):
                    url = r.get("url", "")
                    if url in seen_urls:
                        continue
                    seen_urls.add(url)
                    title = r.get("title", "")
                    content = r.get("content", "")
                    name = title.split("|")[0].split(" - ")[0].strip()[:80]
                    if not name or len(name) < 3:
                        continue
                    providers.append({
                        "name": name,
                        "specialty": signal.replace("_", " ").title(),
                        "address": location,
                        "phone": "",
                        "website": url,
                        "availability": "Check website for scheduling",
                        "rating": "",
                        "why_relevant": content[:250] if content else f"Specialist in {signal}",
                    })
            except Exception as e:
                logger.warning(f"Tavily provider query failed: {e}")
        logger.info(f"Tavily provider fallback: {len(providers)} results")
        return providers[:8]
    except Exception as e:
        logger.error(f"Tavily provider fallback failed: {e}")
        return []


async def fetch_research(anomaly_type: str) -> tuple[list[dict], str]:
    """Use Tavily Research API for deep clinical evidence. Returns (items, report)."""
    try:
        result = await tavily.research_clinical_evidence(anomaly_type)
        items = result.get("items", [])
        report = result.get("report", "")
        if items:
            logger.info(f"Tavily Research: {len(items)} sources for '{anomaly_type}'")
            return items, report
    except Exception as e:
        logger.error(f"Tavily Research failed: {e}")
    return [], ""

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
    topic_phrases = analysis.get("topicPhrases") or analysis.get("healthMentions") or []
    conversation_signals = analysis.get("conversationSignals") or []
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
            topic_phrases=topic_phrases,
            conversation_signals=conversation_signals,
        )
        neo4j.build_temporal_chain(patient_id)
        neo4j.build_cross_patient_similarity(patient_id)
    except Exception as e:
        logger.error(f"Neo4j write failed: {e}")

    # Step 7: Tavily Research — deep clinical evidence for anomalies
    research = []
    research_report = ""
    if analysis.get("anomalyDetected") and analysis.get("anomalyType"):
        research, research_report = await fetch_research(analysis["anomalyType"])
        if not research:
            try:
                research = await asyncio.to_thread(tavily.search_clinical_research, analysis["anomalyType"])
            except Exception:
                research = []
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
        "researchReport": research_report,
        "timestamp": timestamp,
        "acousticSignals": acoustic_signals,
        "rekaValidation": reka_result,
        "sensoContextUsed": bool(senso_context),
    }
