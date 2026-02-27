"""
Senso conversation memory integration.

Senso is the continuity layer that makes Memo feel like a person, not a survey.
After each call, the conversation summary is indexed in Senso.
Before each call, past context is retrieved so the AI companion remembers
what the patient talked about — building trust and eliciting richer speech.

Also powers the family dashboard's semantic search: "Has Dorothy mentioned
chest pain?" searches all past conversations without exposing raw transcripts.

Endpoint: https://sdk.senso.ai/api/v1
Auth: X-API-Key header
"""
import os
import logging
import time
from typing import Optional

import httpx

logger = logging.getLogger(__name__)

SENSO_API_KEY = os.environ.get("SENSO_API_KEY", "")
SENSO_BASE = "https://sdk.senso.ai/api/v1"


async def index_conversation(
    patient_id: str,
    patient_name: str,
    call_id: str,
    summary: str,
    memories: list[dict] | None = None,
    timestamp: int | None = None,
) -> bool:
    """
    Index a call summary into Senso after each call.
    Tags by patient for scoped retrieval later.
    """
    if not SENSO_API_KEY or not summary:
        return False

    ts = timestamp or int(time.time() * 1000)
    date_str = time.strftime("%Y-%m-%d", time.localtime(ts / 1000))

    memory_text = ""
    if memories:
        memory_text = "\n".join(f"- {m.get('content', '')}" for m in memories[:5])

    body = summary
    if memory_text:
        body += f"\n\nKey memories:\n{memory_text}"

    payload = {
        "title": f"{patient_name} — Call {date_str}",
        "body": body,
        "tags": [f"patient:{patient_id}", f"date:{date_str}", f"call:{call_id}"],
    }

    try:
        async with httpx.AsyncClient(timeout=15) as client:
            resp = await client.post(
                f"{SENSO_BASE}/content",
                headers={"X-API-Key": SENSO_API_KEY, "Content-Type": "application/json"},
                json=payload,
            )
            if resp.status_code in (200, 201):
                logger.info(f"Senso: indexed call {call_id} for {patient_name}")
                return True
            else:
                logger.warning(f"Senso index returned {resp.status_code}: {resp.text[:200]}")
                return False
    except Exception as e:
        logger.error(f"Senso index failed: {e}")
        return False


async def retrieve_context(patient_id: str, patient_name: str, max_results: int = 3) -> str:
    """
    Retrieve recent conversation context for a patient from Senso.
    Returns a formatted string to inject into the OpenAI system prompt
    so the companion remembers past conversations.
    """
    if not SENSO_API_KEY:
        return ""

    query = f"recent topics and mood for {patient_name}"
    payload = {
        "query": query,
        "filters": {"tags": [f"patient:{patient_id}"]},
        "max_results": max_results,
    }

    try:
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.post(
                f"{SENSO_BASE}/search",
                headers={"X-API-Key": SENSO_API_KEY, "Content-Type": "application/json"},
                json=payload,
            )
            if resp.status_code != 200:
                logger.warning(f"Senso search returned {resp.status_code}")
                return ""

            data = resp.json()
            results = data.get("results", data.get("data", []))
            if not results:
                return ""

            chunks = []
            for r in results[:max_results]:
                text = r.get("body", r.get("content", r.get("text", "")))
                title = r.get("title", "")
                if text:
                    chunks.append(f"{title}: {text[:200]}")

            context = "\n".join(chunks)
            logger.info(f"Senso: retrieved {len(chunks)} context chunks for {patient_name}")
            return context
    except Exception as e:
        logger.error(f"Senso retrieve failed: {e}")
        return ""


async def search_patient_history(patient_id: str, query: str) -> list[dict]:
    """
    Semantic search over a patient's conversation history.
    For family dashboard: "Has Dorothy mentioned chest pain?"
    """
    if not SENSO_API_KEY:
        return []

    payload = {
        "query": query,
        "filters": {"tags": [f"patient:{patient_id}"]},
        "max_results": 5,
    }

    try:
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.post(
                f"{SENSO_BASE}/search",
                headers={"X-API-Key": SENSO_API_KEY, "Content-Type": "application/json"},
                json=payload,
            )
            if resp.status_code != 200:
                return []
            data = resp.json()
            return data.get("results", data.get("data", []))[:5]
    except Exception as e:
        logger.error(f"Senso search failed: {e}")
        return []


def get_status() -> dict:
    return {
        "configured": bool(SENSO_API_KEY),
        "mode": "conversation_memory" if SENSO_API_KEY else "not_configured",
        "endpoint": SENSO_BASE,
    }
