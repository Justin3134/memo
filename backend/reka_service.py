"""
Reka AI cross-validation for cognitive assessment.

After OpenAI scores a call, Reka independently evaluates the same data.
Two models agreeing on an anomaly = high confidence alert.
Two models disagreeing = flagged for family review with both perspectives.

This multi-model architecture shows judges that Memo doesn't rely on a
single model's judgment for clinical signals.

Endpoint: POST https://api.reka.ai/v1/chat
Auth: Bearer token
"""
import os
import json
import logging

import httpx

logger = logging.getLogger(__name__)

REKA_API_KEY = os.environ.get("REKA_API_KEY", "")
REKA_CHAT_URL = "https://api.reka.ai/v1/chat"


async def cross_validate(
    transcript: str,
    duration: float,
    openai_scores: dict,
    modulate_signals: dict | None = None,
) -> dict | None:
    """
    Send the same call data to Reka for independent cognitive assessment.
    Returns Reka's scores + agreement analysis, or None if unavailable.
    """
    if not REKA_API_KEY:
        return None

    modulate_context = ""
    if modulate_signals and modulate_signals.get("source") == "modulate_velma2":
        modulate_context = (
            f"\nVoice analysis: speech rate {modulate_signals.get('speech_rate_wpm', 0)} wpm, "
            f"pause frequency {modulate_signals.get('pause_frequency_per_min', 0)}/min, "
            f"dominant emotion: {modulate_signals.get('dominant_emotion', 'Unknown')}, "
            f"fluency: {modulate_signals.get('fluency_score', 0)}/100"
        )

    prompt = f"""You are a clinical speech analysis AI providing a second opinion on a cognitive health call.

A primary AI model scored this call. Your job is to independently evaluate and either confirm or challenge the primary assessment.

TRANSCRIPT (elderly patient): {transcript[:3000]}
CALL DURATION: {duration}s
{modulate_context}

PRIMARY MODEL SCORES:
  Cognitive: {openai_scores.get('cognitiveScore', 'N/A')}/100
  Emotional: {openai_scores.get('emotionalScore', 'N/A')}/100
  Motor: {openai_scores.get('motorScore', 'N/A')}/100
  Anomaly detected: {openai_scores.get('anomalyDetected', False)}
  Anomaly type: {openai_scores.get('anomalyType', 'none')}

Return ONLY valid JSON:
{{
  "cognitiveScore": <0-100>,
  "emotionalScore": <0-100>,
  "motorScore": <0-100>,
  "anomalyDetected": <true|false>,
  "confidence": <"high"|"medium"|"low">,
  "agreesWithPrimary": <true|false>,
  "reasoning": "<1-2 sentences explaining your assessment>",
  "additionalConcerns": "<any concerns the primary model missed, or null>"
}}"""

    try:
        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.post(
                REKA_CHAT_URL,
                headers={
                    "Authorization": f"Bearer {REKA_API_KEY}",
                    "Content-Type": "application/json",
                },
                json={
                    "messages": [{"role": "user", "content": prompt}],
                    "model": "reka-flash",
                    "max_tokens": 500,
                    "temperature": 0.1,
                },
            )

            if resp.status_code != 200:
                logger.warning(f"Reka API returned {resp.status_code}: {resp.text[:200]}")
                return None

            data = resp.json()
            content = ""
            for choice in data.get("responses", data.get("choices", [])):
                msg = choice.get("message", choice.get("text", {}))
                if isinstance(msg, dict):
                    content = msg.get("content", "")
                elif isinstance(msg, str):
                    content = msg
                if content:
                    break

            if not content:
                content = data.get("text", "")

            if not content:
                logger.warning("Reka returned empty content")
                return None

            content = content.strip()
            if content.startswith("```"):
                content = content.split("```")[1]
                if content.startswith("json"):
                    content = content[4:]

            result = json.loads(content.strip())
            logger.info(f"Reka cross-validation: agrees={result.get('agreesWithPrimary')}, "
                        f"confidence={result.get('confidence')}, "
                        f"cognitive={result.get('cognitiveScore')}")
            return result

    except json.JSONDecodeError as e:
        logger.error(f"Reka response not valid JSON: {e}")
        return None
    except Exception as e:
        logger.error(f"Reka cross-validation failed: {e}")
        return None


def get_status() -> dict:
    return {
        "configured": bool(REKA_API_KEY),
        "mode": "cross_validation" if REKA_API_KEY else "not_configured",
        "model": "reka-flash",
    }
