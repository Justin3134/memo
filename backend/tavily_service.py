"""
Tavily clinical research integration.

Uses Tavily Research API for deep clinical evidence when anomalies are detected,
and Tavily Search for care resources on the Care page.

Research API: Deep multi-source synthesis of clinical evidence (dementia,
cognitive decline, acoustic biomarkers). Returns a full report + cited sources.

Search API: Quick search for care resources, helplines, and support groups.
"""
import os
import asyncio
import logging
import time

logger = logging.getLogger(__name__)

TAVILY_API_KEY = os.environ.get("TAVILY_API_KEY", "")

CARE_DOMAINS = [
    "alz.org",
    "nia.nih.gov",
    "eldercare.acl.gov",
    "caregiver.org",
    "cms.gov",
    "mayoclinic.org",
    "helpguide.org",
    "aarp.org",
]


def _get_client():
    if not TAVILY_API_KEY:
        return None
    try:
        from tavily import TavilyClient
        return TavilyClient(api_key=TAVILY_API_KEY)
    except Exception as e:
        logger.error(f"Tavily client init failed: {e}")
        return None


def _get_async_client():
    if not TAVILY_API_KEY:
        return None
    try:
        from tavily import AsyncTavilyClient
        return AsyncTavilyClient(api_key=TAVILY_API_KEY)
    except Exception as e:
        logger.error(f"Tavily async client init failed: {e}")
        return None


# ─── Tavily Research API (deep clinical evidence) ────────────────────────────

async def research_clinical_evidence(anomaly_type: str, max_wait: int = 120) -> dict:
    """
    Use Tavily Research API for deep clinical evidence synthesis.
    Returns { "report": str, "sources": list[dict], "items": list[dict] }.
    """
    client = _get_async_client()
    if not client:
        return _fallback_search_evidence(anomaly_type)

    signal = anomaly_type.replace("_", " ")
    query = (
        f"What clinical research exists on early detection of {signal} in elderly patients "
        f"through voice analysis and acoustic biomarkers? Include studies on speech rate changes, "
        f"pause patterns, hesitation frequency, and word-finding difficulty as predictors of "
        f"mild cognitive impairment (MCI), Alzheimer's disease, and depression. "
        f"Cite specific studies with authors, journals, and findings."
    )

    try:
        logger.info(f"Tavily Research: starting deep research for '{signal}'")
        response = await client.research(
            input=query,
            model="auto",
            citation_format="numbered",
        )

        request_id = response.get("request_id")
        if not request_id:
            logger.warning("Tavily Research: no request_id, using immediate response")
            return _parse_research_response(response, anomaly_type)

        elapsed = 0
        while elapsed < max_wait:
            await asyncio.sleep(3)
            elapsed += 3
            result = await client.get_research(request_id)
            status = result.get("status", "")

            if status == "completed":
                logger.info(f"Tavily Research completed in {elapsed}s")
                return _parse_research_response(result, anomaly_type)
            elif status == "failed":
                logger.error(f"Tavily Research task failed")
                break

        logger.warning(f"Tavily Research timed out after {max_wait}s")
    except Exception as e:
        logger.error(f"Tavily Research failed: {e}")

    return _fallback_search_evidence(anomaly_type)


def _parse_research_response(data: dict, anomaly_type: str) -> dict:
    """Parse the Tavily Research response into our standard format."""
    report = data.get("content", data.get("result", ""))
    sources = data.get("sources", [])

    items = []
    for src in sources[:5]:
        if isinstance(src, dict):
            items.append({
                "title": src.get("title", src.get("name", "")),
                "url": src.get("url", ""),
                "source": _extract_source(src.get("url", "")),
                "excerpt": src.get("content", src.get("snippet", ""))[:300],
                "markers": [anomaly_type],
                "found_by": "tavily_research",
            })
        elif isinstance(src, str):
            items.append({
                "title": "",
                "url": src,
                "source": _extract_source(src),
                "excerpt": "",
                "markers": [anomaly_type],
                "found_by": "tavily_research",
            })

    logger.info(f"Tavily Research: {len(items)} sources, report length: {len(report)}")
    return {"report": report, "sources": sources, "items": items}


def _fallback_search_evidence(anomaly_type: str) -> dict:
    """Fallback to Tavily Search when Research API is unavailable."""
    items = search_clinical_research(anomaly_type)
    return {"report": "", "sources": [], "items": items}


# ─── Tavily Search API (quick search) ────────────────────────────────────────

def search_clinical_research(anomaly_type: str, max_results: int = 3) -> list[dict]:
    """Quick search for clinical studies. Used as fallback for Research API."""
    client = _get_client()
    if not client:
        return []

    query = (
        f"early detection {anomaly_type.replace('_', ' ')} "
        f"elderly voice acoustic biomarkers cognitive decline clinical research"
    )

    try:
        result = client.search(
            query=query,
            search_depth="advanced",
            max_results=max_results,
        )
        items = []
        for r in result.get("results", [])[:max_results]:
            items.append({
                "title": r.get("title", ""),
                "url": r.get("url", ""),
                "source": _extract_source(r.get("url", "")),
                "excerpt": (r.get("content", "") or "")[:300],
                "markers": [anomaly_type],
                "found_by": "tavily_search",
            })
        logger.info(f"Tavily Search: {len(items)} clinical studies for '{anomaly_type}'")
        return items
    except Exception as e:
        logger.error(f"Tavily clinical search failed: {e}")
        return []


def search_care_resources(query: str, signal_type: str = "", max_results: int = 5) -> list[dict]:
    """Search for care resources, support groups, and treatment info."""
    client = _get_client()
    if not client:
        return []

    full_query = f"{signal_type} {query} elderly cognitive care treatment support".strip()

    try:
        result = client.search(
            query=full_query,
            search_depth="advanced",
            max_results=max_results,
            include_domains=CARE_DOMAINS,
        )
        items = []
        for r in result.get("results", [])[:max_results]:
            items.append({
                "title": r.get("title", ""),
                "url": r.get("url", ""),
                "content": (r.get("content", "") or "")[:400],
                "source": _extract_source(r.get("url", "")),
            })
        logger.info(f"Tavily: {len(items)} care resources for '{full_query[:50]}'")
        return items
    except Exception as e:
        logger.error(f"Tavily care search failed: {e}")
        return []


def _extract_source(url: str) -> str:
    try:
        return url.split("/")[2].replace("www.", "")
    except Exception:
        return url


def get_status() -> dict:
    return {
        "configured": bool(TAVILY_API_KEY),
        "mode": "research_api" if TAVILY_API_KEY else "not_configured",
    }
