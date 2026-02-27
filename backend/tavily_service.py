"""
Tavily clinical research integration.

When Memo detects an anomaly, Tavily fetches supporting clinical evidence
from PubMed, JAMA, Nature, and Alzheimer's & Dementia journals.

This turns raw pattern detection into evidence-backed clinical reports:
  "Dorothy's word-finding score dropped 15%, consistent with acoustic
   biomarker patterns described in a 2024 Framingham Heart Study paper
   that detected MCI with 77% accuracy."

Also powers the Care page search for families seeking resources.
"""
import os
import logging
from typing import Optional

logger = logging.getLogger(__name__)

TAVILY_API_KEY = os.environ.get("TAVILY_API_KEY", "")

CLINICAL_DOMAINS = [
    "pubmed.ncbi.nlm.nih.gov",
    "nature.com",
    "jamanetwork.com",
    "alz.org",
    "nia.nih.gov",
    "alzheimersanddementia.com",
    "thelancet.com",
    "bmj.com",
]

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


def search_clinical_research(anomaly_type: str, max_results: int = 3) -> list[dict]:
    """
    Fetch clinical research supporting a detected anomaly.
    Called automatically when the pipeline detects an anomaly.
    """
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
            include_domains=CLINICAL_DOMAINS,
        )
        items = []
        for r in result.get("results", [])[:max_results]:
            items.append({
                "title": r.get("title", ""),
                "url": r.get("url", ""),
                "source": _extract_source(r.get("url", "")),
                "excerpt": (r.get("content", "") or "")[:300],
                "markers": [anomaly_type],
                "score": r.get("score", 0),
            })
        logger.info(f"Tavily: {len(items)} clinical studies for '{anomaly_type}'")
        return items
    except Exception as e:
        logger.error(f"Tavily clinical search failed: {e}")
        return []


def search_care_resources(query: str, signal_type: str = "", max_results: int = 5) -> list[dict]:
    """
    Search for care resources, support groups, and treatment information.
    Powers the Care page for families.
    """
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
        "mode": "advanced_search" if TAVILY_API_KEY else "not_configured",
    }
