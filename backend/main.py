"""Memo FastAPI backend."""
import os, logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
from dotenv import load_dotenv

load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), "../.env"))

import neo4j_service as neo4j
import pipeline

logging.basicConfig(level=logging.INFO)

@asynccontextmanager
async def lifespan(app: FastAPI):
    neo4j.ensure_constraints()
    yield

app = FastAPI(title="Memo Backend", lifespan=lifespan)
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

class AnalyzeRequest(BaseModel):
    patient_id: str; call_id: str; transcript: str; duration: float
    patient_name: str = "Patient"; baseline_cognitive: float = 75.0

class EnrollRequest(BaseModel):
    patient_id: str; name: str; phone: str; age: Optional[int] = None

class CareSearchRequest(BaseModel):
    query: str; signal_type: Optional[str] = None

@app.get("/health")
def health(): return {"status": "ok"}

@app.post("/analyze")
async def analyze(req: AnalyzeRequest):
    try:
        result = await pipeline.run_pipeline(req.patient_id, req.call_id, req.transcript,
                                             req.duration, req.patient_name, req.baseline_cognitive)
        return {"success": True, **result}
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
    try: return neo4j.get_patient_graph(patient_id)
    except Exception as e: raise HTTPException(status_code=500, detail=str(e))

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
