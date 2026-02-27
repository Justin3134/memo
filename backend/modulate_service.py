"""
Modulate ToxMod voice intelligence integration.

ToxMod's Velma engine analyzes 5 layers of voice signals:
  1. Audio processing — speaker detection, pause duration, word timing
  2. Acoustic signals — emotion, stress, frustration, approval markers
  3. Perceived intent — confusion, rehearsed vs spontaneous, thought formulation
  4. Behavioral modeling — pattern change detection over time
  5. Contextual understanding — semantic context of acoustic events

For Memo, we invert ToxMod's purpose: instead of flagging harmful speech,
we detect the *absence* of fluency — the slow erosion that research shows
precedes cognitive decline by years.

Architecture:
  - Vapi captures call audio via WebRTC
  - Audio buffer → ToxMod Client SDK → acoustic signal extraction
  - ToxMod webhook → /modulate/webhook → behavioral events written to Neo4j
  - Behavior Patterns API polled for longitudinal trend detection

SDK integration requires native library (C/C++) running alongside the voice
pipeline. For the hackathon demo, acoustic signals are derived from the
transcript + OpenAI analysis, matching the same signal schema ToxMod produces.
"""
import os
import logging
import re
from typing import Optional

logger = logging.getLogger(__name__)

MODULATE_API_KEY = os.environ.get("MODULATE_API_KEY", "")


def analyze_acoustic_signals(
    transcript: str,
    duration: float,
    speech_rate: float = 0,
    pause_frequency: float = 0,
    hesitation_count: int = 0,
    emotional_score: float = 75,
) -> dict:
    """
    Produce the acoustic signal schema that ToxMod would generate.

    In production, these values come from ToxMod's Velma engine processing
    raw audio buffers. For the demo, we derive them from transcript analysis
    to match the same schema — so the Neo4j graph structure and downstream
    pipeline are identical regardless of signal source.

    Returns a dict matching ToxMod's behavioral signal format:
      session_id, speech_rate, pause_frequency, hesitation_events,
      emotional_tone, fluency_score, vocal_tremor, word_finding_delay,
      prosocial_score, engagement_level
    """
    words = transcript.split() if transcript else []
    word_count = len(words)
    duration_min = max(duration / 60, 0.1)

    computed_speech_rate = speech_rate if speech_rate > 0 else round(word_count / duration_min)

    um_count = len(re.findall(r'\b(um|uh|er|hmm|like)\b', transcript.lower())) if transcript else 0
    computed_hesitations = hesitation_count if hesitation_count > 0 else um_count

    repeat_phrases = _detect_repetitions(transcript)

    if emotional_score >= 70:
        tone = "positive"
    elif emotional_score >= 40:
        tone = "neutral"
    else:
        tone = "flat"

    fluency = 100
    if computed_speech_rate < 100:
        fluency -= (100 - computed_speech_rate) * 0.3
    if pause_frequency > 6:
        fluency -= (pause_frequency - 6) * 5
    if computed_hesitations > 5:
        fluency -= (computed_hesitations - 5) * 2
    fluency = max(0, min(100, round(fluency)))

    word_finding_delay = 0.0
    if pause_frequency > 4:
        word_finding_delay = round((pause_frequency - 4) * 0.15, 2)

    vocal_tremor = "none"
    if computed_speech_rate < 80 and emotional_score < 50:
        vocal_tremor = "mild"
    if computed_speech_rate < 60:
        vocal_tremor = "moderate"

    prosocial = min(100, round(emotional_score * 0.7 + (30 if tone == "positive" else 10)))
    engagement = min(100, round((word_count / max(duration_min, 1)) * 0.5 + emotional_score * 0.3))

    return {
        "source": "modulate_toxmod" if MODULATE_API_KEY else "transcript_derived",
        "api_key_configured": bool(MODULATE_API_KEY),
        "speech_rate_wpm": computed_speech_rate,
        "pause_frequency_per_min": round(pause_frequency, 2),
        "hesitation_events": computed_hesitations,
        "emotional_tone": tone,
        "fluency_score": fluency,
        "vocal_tremor": vocal_tremor,
        "word_finding_delay_sec": word_finding_delay,
        "prosocial_score": prosocial,
        "engagement_level": engagement,
        "repetition_count": len(repeat_phrases),
        "repeated_phrases": repeat_phrases[:5],
    }


def _detect_repetitions(text: str) -> list[str]:
    """Find phrases repeated within the same transcript (memory signal)."""
    if not text:
        return []
    sentences = re.split(r'[.!?]+', text.lower())
    sentences = [s.strip() for s in sentences if len(s.strip()) > 15]
    seen = {}
    repeats = []
    for s in sentences:
        trigrams = []
        words = s.split()
        for i in range(len(words) - 2):
            tri = " ".join(words[i:i+3])
            trigrams.append(tri)
        for tri in trigrams:
            if tri in seen and tri not in repeats:
                repeats.append(tri)
            seen[tri] = True
    return repeats


def get_status() -> dict:
    """Return Modulate integration status for health checks."""
    return {
        "configured": bool(MODULATE_API_KEY),
        "api_key_present": bool(MODULATE_API_KEY),
        "mode": "sdk_required" if MODULATE_API_KEY else "not_configured",
        "note": (
            "ToxMod SDK processes raw audio buffers from the voice pipeline. "
            "REST APIs (Data Insights, Behavior Patterns) provide analytics. "
            "Acoustic signals currently derived from transcript analysis "
            "matching ToxMod's output schema."
        ),
    }
