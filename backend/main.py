"""Memo FastAPI backend."""
import os, logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
from dotenv import load_dotenv

load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), "../.env"), override=True)

import neo4j_service as neo4j
import pipeline
import modulate_service as modulate

logging.basicConfig(level=logging.INFO)

@asynccontextmanager
async def lifespan(app: FastAPI):
    neo4j.ensure_constraints()
    try:
        neo4j.seed_clinical_knowledge()
    except Exception as e:
        logging.warning(f"Clinical knowledge seed skipped: {e}")
    yield

app = FastAPI(title="Memo Backend", lifespan=lifespan)
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

class AnalyzeRequest(BaseModel):
    patient_id: str; call_id: str; transcript: str; duration: float
    patient_name: str = "Patient"; baseline_cognitive: float = 75.0
    recording_url: Optional[str] = None

class EnrollRequest(BaseModel):
    patient_id: str; name: str; phone: str; age: Optional[int] = None

class CareSearchRequest(BaseModel):
    query: str; signal_type: Optional[str] = None

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

@app.get("/health")
def health(): return {"status": "ok"}

@app.get("/health/neo4j")
def health_neo4j():
    ok, msg = neo4j.verify_connection()
    return {"connected": ok, "message": msg}

@app.get("/health/modulate")
def health_modulate():
    return modulate.get_status()

@app.post("/analyze")
async def analyze(req: AnalyzeRequest):
    try:
        result = await pipeline.run_pipeline(req.patient_id, req.call_id, req.transcript,
                                             req.duration, req.patient_name, req.baseline_cognitive,
                                             recording_url=req.recording_url)
        return {"success": True, **result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/sync/history")
def sync_history(req: SyncHistoryRequest):
    """Seed Neo4j with existing Convex call history — builds full knowledge graph."""
    ok, msg = neo4j.verify_connection()
    if not ok:
        raise HTTPException(status_code=503, detail=msg)
    try:
        neo4j.seed_clinical_knowledge()
        neo4j.upsert_patient(req.patient_id, req.patient_name, req.patient_phone)
        synced = 0
        for c in req.calls:
            neo4j.write_call_analysis(
                patient_id=req.patient_id,
                call_id=c.call_id,
                duration=c.duration,
                summary=c.summary,
                timestamp=c.timestamp,
                speech_rate=c.speech_rate,
                pause_frequency=c.pause_frequency,
                hesitation_count=c.hesitation_count,
                word_finding_score=c.word_finding_score,
                cognitive_score=c.cognitive_score,
                emotional_score=c.emotional_score,
                motor_score=c.motor_score,
                entities={},
                anomaly_detected=c.anomaly_detected,
                anomaly_type=c.anomaly_type,
                anomaly_severity=c.anomaly_severity,
                anomaly_description=c.anomaly_description,
                transcript=c.transcript,
            )
            synced += 1
        neo4j.build_temporal_chain(req.patient_id)
        return {"success": True, "synced": synced}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/patients/enroll")
def enroll(req: EnrollRequest):
    try:
        neo4j.upsert_patient(req.patient_id, req.name, req.phone, req.age)
        return {"success": True}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/patients/{patient_id}/graph")
def patient_graph(patient_id: str):
    ok, msg = neo4j.verify_connection()
    if not ok:
        raise HTTPException(status_code=503, detail=msg)
    try:
        return neo4j.get_patient_graph(patient_id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/patients/{patient_id}/timeline")
def patient_timeline(patient_id: str):
    try: return {"timeline": neo4j.get_timeline(patient_id)}
    except Exception as e: raise HTTPException(status_code=500, detail=str(e))

@app.post("/search/care")
async def search_care(req: CareSearchRequest):
    key = os.environ.get("TAVILY_API_KEY")
    if not key: raise HTTPException(status_code=400, detail="TAVILY_API_KEY not set")
    from tavily import TavilyClient
    try:
        q = f"{req.signal_type or ''} {req.query} elderly cognitive care treatment 2024"
        results = TavilyClient(api_key=key).search(query=q.strip(), search_depth="advanced", max_results=5)
        return {"results": [{"title":r.get("title",""),"url":r.get("url",""),
                              "content":r.get("content","")[:400]} for r in results.get("results",[])]}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
