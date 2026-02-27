"""Memo FastAPI backend — all-in-one: REST API, Vapi webhook, analysis pipeline."""
import os, json, logging, time, asyncio
from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException, Request, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
from dotenv import load_dotenv

load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), "../.env"), override=True)

import neo4j_service as neo4j
import pipeline
import modulate_service as modulate
import tavily_service as tavily
import senso_service as senso
import reka_service as reka
from database import init_db, get_db, Patient, Call, Memory, Alert, new_id, now_ms

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Lifespan
# ---------------------------------------------------------------------------

@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    neo4j.ensure_constraints()
    try:
        neo4j.seed_clinical_knowledge()
    except Exception as e:
        logger.warning(f"Clinical knowledge seed skipped: {e}")
    yield

app = FastAPI(title="Memo Backend", lifespan=lifespan)
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

# ---------------------------------------------------------------------------
# Pydantic models
# ---------------------------------------------------------------------------

class AnalyzeRequest(BaseModel):
    patient_id: str; call_id: str; transcript: str; duration: float
    patient_name: str = "Patient"; baseline_cognitive: float = 75.0
    recording_url: Optional[str] = None

class EnrollRequest(BaseModel):
    patient_id: Optional[str] = None; name: str; phone: str; age: Optional[int] = None

class CareSearchRequest(BaseModel):
    query: str; signal_type: Optional[str] = None

class PatientCreateRequest(BaseModel):
    name: str
    phoneNumber: str
    familyUserId: str = ""
    memoTime: str = "10:00"
    timezone: str = "America/Chicago"
    consentGiven: bool = True
    interests: Optional[list[str]] = None
    knownPeople: Optional[list[dict]] = None
    healthContext: Optional[str] = None
    voiceId: Optional[str] = None
    emergencyContact: Optional[str] = None

class PatientPatchRequest(BaseModel):
    name: Optional[str] = None
    memoTime: Optional[str] = None
    timezone: Optional[str] = None
    emergencyContact: Optional[str] = None
    voiceId: Optional[str] = None
    knownPeople: Optional[list[dict]] = None
    healthContext: Optional[str] = None

class AlertPatchRequest(BaseModel):
    reviewed: Optional[bool] = None

class HistoryCall(BaseModel):
    call_id: str
    timestamp: int
    duration: float = 0
    summary: str = ""
    transcript: str = ""
    speech_rate: float = 0
    pause_frequency: float = 0
    hesitation_count: int = 0
    word_finding_score: float = 75
    cognitive_score: float = 75
    emotional_score: float = 75
    motor_score: float = 75
    anomaly_detected: bool = False
    anomaly_type: Optional[str] = None
    anomaly_severity: Optional[str] = None
    anomaly_description: Optional[str] = None

class SyncHistoryRequest(BaseModel):
    patient_id: str
    patient_name: str = "Patient"
    patient_phone: str = ""
    calls: list[HistoryCall]

# ---------------------------------------------------------------------------
# Health
# ---------------------------------------------------------------------------

@app.get("/health")
def health():
    return {"status": "ok"}

@app.get("/health/neo4j")
def health_neo4j():
    ok, msg = neo4j.verify_connection()
    return {"connected": ok, "message": msg}

@app.get("/health/modulate")
def health_modulate():
    return modulate.get_status()

# ---------------------------------------------------------------------------
# Patients CRUD
# ---------------------------------------------------------------------------

@app.get("/api/patients")
def list_patients():
    db = get_db()
    try:
        rows = db.query(Patient).order_by(Patient.name).all()
        return [p.to_dict() for p in rows]
    finally:
        db.close()

@app.get("/api/patients/{patient_id}")
def get_patient(patient_id: str):
    db = get_db()
    try:
        p = db.query(Patient).filter(Patient.id == patient_id).first()
        if not p:
            raise HTTPException(404, "Patient not found")
        return p.to_dict()
    finally:
        db.close()

@app.post("/api/patients")
def create_patient(req: PatientCreateRequest):
    db = get_db()
    try:
        phone = req.phoneNumber.replace(" ", "").strip()
        existing = db.query(Patient).filter(Patient.phone_number == phone).first()
        if existing:
            existing.name = req.name
            existing.memo_time = req.memoTime
            existing.timezone = req.timezone
            existing.consent_given = req.consentGiven
            if req.knownPeople is not None:
                existing.known_people_json = json.dumps(req.knownPeople)
            if req.interests is not None:
                existing.interests_json = json.dumps(req.interests)
            if req.emergencyContact is not None:
                existing.emergency_contact = req.emergencyContact
            db.commit()
            return {"_id": existing.id}

        pid = new_id()
        p = Patient(
            id=pid,
            name=req.name,
            phone_number=phone,
            family_user_id=req.familyUserId,
            memo_time=req.memoTime,
            timezone=req.timezone,
            consent_given=req.consentGiven,
            interests_json=json.dumps(req.interests or []),
            known_people_json=json.dumps(req.knownPeople or []),
            health_context=req.healthContext,
            voice_id=req.voiceId,
            emergency_contact=req.emergencyContact,
        )
        db.add(p)
        db.commit()
        try:
            neo4j.upsert_patient(pid, req.name, phone)
        except Exception:
            pass
        return {"_id": pid}
    finally:
        db.close()

@app.patch("/api/patients/{patient_id}")
def patch_patient(patient_id: str, req: PatientPatchRequest):
    db = get_db()
    try:
        p = db.query(Patient).filter(Patient.id == patient_id).first()
        if not p:
            raise HTTPException(404, "Patient not found")
        if req.name is not None: p.name = req.name
        if req.memoTime is not None: p.memo_time = req.memoTime
        if req.timezone is not None: p.timezone = req.timezone
        if req.emergencyContact is not None: p.emergency_contact = req.emergencyContact
        if req.voiceId is not None: p.voice_id = req.voiceId
        if req.knownPeople is not None: p.known_people_json = json.dumps(req.knownPeople)
        if req.healthContext is not None: p.health_context = req.healthContext
        db.commit()
        return {"success": True}
    finally:
        db.close()

@app.delete("/api/patients/{patient_id}")
def delete_patient(patient_id: str):
    db = get_db()
    try:
        p = db.query(Patient).filter(Patient.id == patient_id).first()
        if not p:
            raise HTTPException(404, "Patient not found")
        db.delete(p)
        db.commit()
        return {"success": True}
    finally:
        db.close()

# ---------------------------------------------------------------------------
# Calls
# ---------------------------------------------------------------------------

@app.get("/api/patients/{patient_id}/calls")
def list_calls(patient_id: str, limit: int = 30):
    db = get_db()
    try:
        rows = db.query(Call).filter(Call.patient_id == patient_id)\
            .order_by(Call.started_at.desc()).limit(min(limit, 120)).all()
        return [c.to_dict() for c in rows]
    finally:
        db.close()

# ---------------------------------------------------------------------------
# Memories
# ---------------------------------------------------------------------------

@app.get("/api/patients/{patient_id}/memories")
def list_memories(patient_id: str, limit: int = 20):
    db = get_db()
    try:
        rows = db.query(Memory).filter(Memory.patient_id == patient_id)\
            .order_by(Memory.timestamp.desc()).limit(min(limit, 100)).all()
        return [m.to_dict() for m in rows]
    finally:
        db.close()

# ---------------------------------------------------------------------------
# Alerts
# ---------------------------------------------------------------------------

@app.get("/api/patients/{patient_id}/alerts")
def list_alerts(patient_id: str, limit: int = 20):
    db = get_db()
    try:
        rows = db.query(Alert).filter(Alert.patient_id == patient_id)\
            .order_by(Alert.timestamp.desc()).limit(min(limit, 100)).all()
        return [a.to_dict() for a in rows]
    finally:
        db.close()

@app.patch("/api/alerts/{alert_id}")
def patch_alert(alert_id: str, req: AlertPatchRequest):
    db = get_db()
    try:
        a = db.query(Alert).filter(Alert.id == alert_id).first()
        if not a:
            raise HTTPException(404, "Alert not found")
        if req.reviewed is not None:
            a.reviewed = req.reviewed
        db.commit()
        return {"success": True}
    finally:
        db.close()

# ---------------------------------------------------------------------------
# Analysis pipeline (direct call)
# ---------------------------------------------------------------------------

@app.post("/analyze")
async def analyze(req: AnalyzeRequest):
    try:
        result = await pipeline.run_pipeline(
            req.patient_id, req.call_id, req.transcript, req.duration,
            req.patient_name, req.baseline_cognitive,
            recording_url=req.recording_url)
        return {"success": True, **result}
    except Exception as e:
        raise HTTPException(500, str(e))

# ---------------------------------------------------------------------------
# Neo4j graph endpoints
# ---------------------------------------------------------------------------

@app.post("/patients/enroll")
def enroll(req: EnrollRequest):
    try:
        pid = req.patient_id or new_id()
        neo4j.upsert_patient(pid, req.name, req.phone, req.age)
        return {"success": True, "patient_id": pid}
    except Exception as e:
        raise HTTPException(500, str(e))

@app.get("/patients/{patient_id}/graph")
def patient_graph(patient_id: str):
    ok, msg = neo4j.verify_connection()
    if not ok:
        raise HTTPException(503, msg)
    try:
        return neo4j.get_patient_graph(patient_id)
    except Exception as e:
        raise HTTPException(500, str(e))

@app.get("/patients/{patient_id}/timeline")
def patient_timeline(patient_id: str):
    try:
        return {"timeline": neo4j.get_timeline(patient_id)}
    except Exception as e:
        raise HTTPException(500, str(e))

@app.post("/sync/history")
def sync_history(req: SyncHistoryRequest):
    ok, msg = neo4j.verify_connection()
    if not ok:
        raise HTTPException(503, msg)
    try:
        neo4j.seed_clinical_knowledge()
        neo4j.upsert_patient(req.patient_id, req.patient_name, req.patient_phone)
        synced = 0
        for c in req.calls:
            neo4j.write_call_analysis(
                patient_id=req.patient_id, call_id=c.call_id,
                duration=c.duration, summary=c.summary, timestamp=c.timestamp,
                speech_rate=c.speech_rate, pause_frequency=c.pause_frequency,
                hesitation_count=c.hesitation_count,
                word_finding_score=c.word_finding_score,
                cognitive_score=c.cognitive_score, emotional_score=c.emotional_score,
                motor_score=c.motor_score, entities={},
                anomaly_detected=c.anomaly_detected, anomaly_type=c.anomaly_type,
                anomaly_severity=c.anomaly_severity, anomaly_description=c.anomaly_description,
                transcript=c.transcript,
            )
            synced += 1
        neo4j.build_temporal_chain(req.patient_id)
        try:
            neo4j.build_cross_patient_similarity(req.patient_id)
        except Exception:
            pass
        return {"success": True, "synced": synced}
    except Exception as e:
        raise HTTPException(500, str(e))

# ---------------------------------------------------------------------------
# Care / Research — Tavily (clinical evidence) + Yutori (web monitoring)
# ---------------------------------------------------------------------------

@app.post("/search/care")
async def search_care(req: CareSearchRequest):
    results = tavily.search_care_resources(
        query=req.query, signal_type=req.signal_type or "",
    )
    if results:
        return {"results": results, "source": "tavily"}

    key = os.environ.get("YUTORI_API_KEY")
    if key:
        try:
            q = f"{req.signal_type or ''} {req.query} elderly cognitive care treatment".strip()
            yutori_results = await pipeline._yutori_research(q, max_wait=120)
            return {"results": [{"title": r.get("title", ""), "url": r.get("url", ""),
                                 "content": r.get("content", "")[:400],
                                 "source": "yutori"} for r in yutori_results[:5]],
                    "source": "yutori"}
        except Exception:
            pass

    return {"results": [], "source": "none"}


class SensoSearchRequest(BaseModel):
    patient_id: str
    query: str


@app.post("/search/memory")
async def search_memory(req: SensoSearchRequest):
    """Semantic search over a patient's conversation history via Senso."""
    results = await senso.search_patient_history(req.patient_id, req.query)
    return {"results": results}


# ---------------------------------------------------------------------------
# Health — all services
# ---------------------------------------------------------------------------

@app.get("/health/services")
def health_services():
    return {
        "neo4j": neo4j.verify_connection()[0],
        "modulate": modulate.get_status(),
        "tavily": tavily.get_status(),
        "senso": senso.get_status(),
        "reka": reka.get_status(),
    }

# ---------------------------------------------------------------------------
# Vapi webhook (replaces Convex /vapi-webhook)
# ---------------------------------------------------------------------------

def _run_analysis_pipeline(patient_id: str, call_id: str, transcript: str,
                           duration: float, patient_name: str, baseline: float,
                           recording_url: str | None):
    """Run the full analysis pipeline in background and write results to Postgres + Neo4j."""
    import asyncio
    loop = asyncio.new_event_loop()
    try:
        result = loop.run_until_complete(pipeline.run_pipeline(
            patient_id, call_id, transcript, duration, patient_name, baseline,
            recording_url=recording_url))
    except Exception as e:
        logger.error(f"Pipeline failed for call {call_id}: {e}")
        return
    finally:
        loop.close()

    db = get_db()
    try:
        acoustic = result.get("acousticSignals", {})
        call = db.query(Call).filter(Call.vapi_call_id == call_id).first()
        if not call:
            call = Call(
                id=new_id(), patient_id=patient_id, vapi_call_id=call_id,
                started_at=now_ms(), status="completed",
            )
            db.add(call)

        call.duration = duration
        call.transcript = transcript
        call.summary = result.get("callSummary", "")
        call.cognitive_score = _num(result.get("cognitiveScore"))
        call.emotional_score = _num(result.get("emotionalScore"))
        call.motor_score = _num(result.get("motorScore"))
        call.speech_rate = _num(acoustic.get("speech_rate_wpm") or result.get("speechRate"))
        call.pause_frequency = _num(acoustic.get("pause_frequency_per_min") or result.get("pauseFrequency"))
        call.health_mentions_json = json.dumps(result.get("healthMentions", []))
        call.conversation_signals_json = json.dumps(result.get("conversationSignals", []))
        call.anomaly_detected = bool(result.get("anomalyDetected"))
        call.recording_url = recording_url
        call.acoustic_source = acoustic.get("source", "unknown")
        call.status = "completed"
        call.ended_at = now_ms()
        db.commit()

        patient = db.query(Patient).filter(Patient.id == patient_id).first()
        if patient:
            patient.last_called_at = now_ms()
            db.commit()

        for m in result.get("memories", []):
            mem = Memory(
                id=new_id(), patient_id=patient_id, call_id=call.id,
                timestamp=now_ms(),
                category=m.get("category", "daily_life"),
                content=m.get("content", ""),
                entities_json=json.dumps(m.get("entities", [])),
                sentiment=m.get("sentiment", "neutral"),
            )
            db.add(mem)

        if result.get("anomalyDetected"):
            alert = Alert(
                id=new_id(), patient_id=patient_id, call_id=call.id,
                timestamp=now_ms(),
                severity=result.get("anomalySeverity", "medium"),
                signal_type=result.get("anomalyType", "composite"),
                description=result.get("anomalyDescription", "Memo detected a change worth reviewing."),
                current_value=_num(result.get("cognitiveScore")),
                baseline_value=baseline,
                reviewed=False,
                recommended_action=result.get("recommendedAction"),
                evidence_quotes_json=json.dumps(result.get("evidenceQuotes", [])),
            )
            db.add(alert)

        db.commit()

        _recalculate_baseline(db, patient_id)
    except Exception as e:
        logger.error(f"DB write failed for call {call_id}: {e}")
        db.rollback()
    finally:
        db.close()


def _num(v, fb=0.0):
    if v is None:
        return fb
    try:
        f = float(v)
        return f if f == f else fb  # NaN check
    except (TypeError, ValueError):
        return fb


def _recalculate_baseline(db, patient_id: str):
    calls = db.query(Call).filter(
        Call.patient_id == patient_id,
        Call.cognitive_score.isnot(None)
    ).order_by(Call.started_at.desc()).limit(5).all()
    if not calls:
        return
    filtered = [c for c in calls if c.cognitive_score is not None and c.emotional_score is not None and c.motor_score is not None]
    if not filtered:
        return
    n = len(filtered)
    baseline = {
        "speechRate": sum(c.speech_rate or 0 for c in filtered) / n,
        "pauseFrequency": sum(c.pause_frequency or 0 for c in filtered) / n,
        "responseLatency": sum(c.response_latency or 0 for c in filtered) / n,
        "cognitiveScore": sum(c.cognitive_score for c in filtered) / n,
        "emotionalScore": sum(c.emotional_score for c in filtered) / n,
        "motorScore": sum(c.motor_score for c in filtered) / n,
        "callCount": n,
        "calculatedAt": now_ms(),
    }
    patient = db.query(Patient).filter(Patient.id == patient_id).first()
    if patient:
        patient.baseline_json = json.dumps(baseline)
        db.commit()


@app.post("/vapi-webhook")
async def vapi_webhook(request: Request, bg: BackgroundTasks):
    try:
        event = await request.json()
    except Exception:
        return {"status": "ok"}

    message_type = (event.get("message") or {}).get("type")
    if message_type != "end-of-call-report":
        return {"status": "ok"}

    msg = event.get("message") or {}
    call = msg.get("call") or {}
    artifact = msg.get("artifact") or call.get("artifact") or {}
    duration = float(msg.get("duration") or call.get("duration") or 0)

    transcript_source = msg.get("transcript")
    raw_transcript = ""
    if isinstance(transcript_source, str):
        raw_transcript = transcript_source
    elif isinstance(transcript_source, list):
        raw_transcript = "\n".join(
            l.get("text") or l.get("transcript") or l.get("content") or ""
            for l in transcript_source
        )
    else:
        msgs = artifact.get("messages") or []
        raw_transcript = "\n".join(
            f"{'AI' if m.get('role') == 'assistant' else 'User'}: {m.get('message') or m.get('text') or m.get('content') or ''}"
            for m in msgs if m.get("message") or m.get("text") or m.get("content")
        )

    call_id = call.get("id") or f"call-{int(time.time()*1000)}"
    transcript = raw_transcript or "No transcript available for this call."

    recording_url = (
        artifact.get("recordingUrl")
        or artifact.get("stereoRecordingUrl")
        or artifact.get("recording")
        or call.get("recordingUrl")
        or call.get("stereoRecordingUrl")
        or ""
    )

    logger.info(f"Vapi webhook: call_id={call_id}, duration={duration}, "
                f"recording_url={'YES' if recording_url else 'NONE'}, "
                f"artifact_keys={list(artifact.keys())}")

    customer_phone = (call.get("customer") or {}).get("number", "")
    metadata_patient_id = (call.get("metadata") or {}).get("patientId")

    db = get_db()
    try:
        patient_id = metadata_patient_id
        if not patient_id:
            all_patients = db.query(Patient).all()
            if all_patients:
                digits = customer_phone.replace("+", "").replace("-", "").replace(" ", "")
                matched = None
                for p in all_patients:
                    p_digits = p.phone_number.replace("+", "").replace("-", "").replace(" ", "")
                    if p_digits == digits or p_digits[-10:] == digits[-10:]:
                        matched = p
                        break
                resolved = matched or all_patients[0]
                patient_id = resolved.id
                logger.info(f"Resolved patient: {resolved.name} ({patient_id}) — phone match: {matched is not None}")

        if not patient_id:
            logger.warning("No patient found — register one first")
            return {"status": "no patient"}

        patient = db.query(Patient).filter(Patient.id == patient_id).first()
        patient_name = patient.name if patient else "Patient"
        baseline = 75.0
        if patient and patient.baseline_json:
            try:
                baseline = json.loads(patient.baseline_json).get("cognitiveScore", 75.0)
            except Exception:
                pass

        initial_call = Call(
            id=new_id(), patient_id=patient_id, vapi_call_id=call_id,
            started_at=now_ms(), status="processing",
            duration=duration, transcript=transcript,
        )
        db.add(initial_call)
        db.commit()
    finally:
        db.close()

    bg.add_task(_run_analysis_pipeline, patient_id, call_id, transcript,
                duration, patient_name, baseline, recording_url or None)

    logger.info(f"Scheduled pipeline for call {call_id} — patient {patient_id}"
                f"{' (with recording)' if recording_url else ''}")
    return {"status": "ok"}
