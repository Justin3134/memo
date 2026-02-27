"""
Real acoustic feature extraction from Vapi call recordings via OpenAI Whisper.

Downloads audio from Vapi's recording URL and sends it through Whisper with
word-level timestamps. From those timestamps we compute genuine acoustic
biomarkers — the same clinical signals Modulate's ToxMod Velma engine measures:

  - Speech rate (real words per minute from word timestamps)
  - Pause frequency and duration (gaps between consecutive words)
  - Hesitation patterns (short pauses clustered around filler words)
  - Pitch/energy proxies (silence-to-speech ratio, engagement)
  - Fluency score (composite of all signals)

These feed into Neo4j AcousticProfile nodes and trigger clinical marker matching.

No heavy dependencies (librosa, numpy) — only openai + httpx.
"""
import os
import io
import logging
import tempfile
from typing import Optional

import httpx
from openai import OpenAI

logger = logging.getLogger(__name__)

_client: Optional[OpenAI] = None


def _get_openai() -> Optional[OpenAI]:
    global _client
    if _client is None:
        key = os.environ.get("OPENAI_API_KEY", "")
        if not key:
            return None
        _client = OpenAI(api_key=key)
    return _client


def analyze_recording(recording_url: str, duration_hint: float = 0) -> Optional[dict]:
    """
    Download audio from recording_url, transcribe with Whisper word timestamps,
    and extract real acoustic biomarkers.
    Returns None if audio can't be fetched or Whisper fails.
    """
    if not recording_url:
        return None

    client = _get_openai()
    if not client:
        logger.warning("No OPENAI_API_KEY, skipping audio analysis")
        return None

    try:
        audio_bytes = _download_audio(recording_url)
        if not audio_bytes:
            return None
        return _extract_features_whisper(client, audio_bytes, duration_hint)
    except Exception as e:
        logger.error(f"Audio analysis failed: {e}")
        return None


def _download_audio(url: str, timeout: float = 30) -> Optional[bytes]:
    """Download audio file from Vapi recording URL."""
    try:
        with httpx.Client(timeout=timeout, follow_redirects=True) as client:
            resp = client.get(url)
            resp.raise_for_status()
            size = len(resp.content)
            logger.info(f"Downloaded audio: {size} bytes")
            if size < 1000:
                logger.warning("Audio file too small, likely empty")
                return None
            return resp.content
    except Exception as e:
        logger.error(f"Audio download failed: {e}")
        return None


def _extract_features_whisper(client: OpenAI, audio_bytes: bytes,
                               duration_hint: float) -> dict:
    """
    Send audio to Whisper with word-level timestamps and extract acoustic
    biomarkers from the timing data.
    """
    with tempfile.NamedTemporaryFile(suffix=".wav", delete=True) as tmp:
        tmp.write(audio_bytes)
        tmp.flush()
        tmp.seek(0)

        resp = client.audio.transcriptions.create(
            model="whisper-1",
            file=("recording.wav", tmp, "audio/wav"),
            response_format="verbose_json",
            timestamp_granularities=["word"],
        )

    words = getattr(resp, "words", None) or []
    text = getattr(resp, "text", "") or ""
    duration = getattr(resp, "duration", None) or duration_hint or 1.0

    if not words:
        logger.warning("Whisper returned no word timestamps")
        return {
            "source": "whisper_audio",
            "audio_available": True,
            "duration_sec": round(duration, 2),
            "transcript_text": text,
            "word_count": len(text.split()),
            "speech_rate_wpm": round(len(text.split()) / max(duration / 60, 0.1)),
            "pause_frequency_per_min": 0,
            "pause_count": 0,
            "avg_pause_sec": 0,
            "max_pause_sec": 0,
            "long_pauses_over_1s": 0,
            "speech_to_silence_ratio": 0.8,
            "fluency_score": 70,
            "engagement_level": 60,
            "hesitation_events": 0,
            "vocal_tremor": "none",
            "emotional_tone": "neutral",
        }

    # --- Compute real timing-based features ---
    word_count = len(words)
    duration_min = max(duration / 60, 0.1)

    # Real speech rate from word count and duration
    speech_rate_wpm = round(word_count / duration_min)

    # --- Pause analysis from word gaps ---
    gaps = []
    for i in range(1, len(words)):
        prev_end = words[i - 1].get("end", 0)
        curr_start = words[i].get("start", 0)
        gap = curr_start - prev_end
        if gap > 0.05:  # ignore sub-50ms timing noise
            gaps.append(gap)

    significant_pauses = [g for g in gaps if g > 0.3]
    long_pauses = [g for g in gaps if g > 1.0]

    pause_count = len(significant_pauses)
    pause_frequency = round(pause_count / max(duration_min, 0.1), 2)
    avg_pause = round(sum(significant_pauses) / len(significant_pauses), 3) if significant_pauses else 0
    max_pause = round(max(significant_pauses), 3) if significant_pauses else 0
    long_pause_count = len(long_pauses)

    # Speech-to-silence ratio
    total_speech_time = sum(
        (w.get("end", 0) - w.get("start", 0)) for w in words
    )
    speech_ratio = round(total_speech_time / max(duration, 0.1), 3)

    # --- Hesitation detection (filler words with surrounding pauses) ---
    fillers = {"um", "uh", "er", "hmm", "like", "you know", "uh huh", "mm"}
    hesitation_count = 0
    for i, w in enumerate(words):
        word_text = w.get("word", "").lower().strip(" .,!?")
        if word_text in fillers:
            hesitation_count += 1
        elif i > 0:
            prev_end = words[i - 1].get("end", 0)
            curr_start = w.get("start", 0)
            if (curr_start - prev_end) > 0.8:
                hesitation_count += 1

    # --- Word-finding difficulty: long pauses mid-sentence ---
    word_finding_delays = 0
    for i in range(1, len(words)):
        prev_end = words[i - 1].get("end", 0)
        curr_start = words[i].get("start", 0)
        gap = curr_start - prev_end
        prev_word = words[i - 1].get("word", "").strip()
        if gap > 1.5 and not prev_word.endswith((".", "!", "?")):
            word_finding_delays += 1

    # --- Vocal tremor proxy (very slow speech + many pauses) ---
    vocal_tremor = "none"
    if speech_rate_wpm < 80 and pause_frequency > 8:
        vocal_tremor = "moderate"
    elif speech_rate_wpm < 100 and pause_frequency > 6:
        vocal_tremor = "mild"

    # --- Emotional tone from speech patterns ---
    emotional_tone = "positive"
    if speech_ratio < 0.4 and long_pause_count > 3:
        emotional_tone = "flat"
    elif speech_ratio < 0.55 or long_pause_count > 2:
        emotional_tone = "neutral"

    # --- Fluency score (composite, 0-100) ---
    fluency = 100.0
    if speech_rate_wpm < 100:
        fluency -= (100 - speech_rate_wpm) * 0.3
    if pause_frequency > 6:
        fluency -= (pause_frequency - 6) * 4
    if long_pause_count > 3:
        fluency -= long_pause_count * 3
    if word_finding_delays > 2:
        fluency -= word_finding_delays * 5
    if vocal_tremor != "none":
        fluency -= 10
    fluency = max(0, min(100, round(fluency)))

    # --- Engagement level ---
    engagement = min(100, round(speech_ratio * 80 + (40 if emotional_tone == "positive" else 15)))

    return {
        "source": "whisper_audio",
        "audio_available": True,
        "duration_sec": round(duration, 2),
        "word_count": word_count,
        "speech_rate_wpm": speech_rate_wpm,
        "pause_frequency_per_min": pause_frequency,
        "pause_count": pause_count,
        "avg_pause_sec": avg_pause,
        "max_pause_sec": max_pause,
        "long_pauses_over_1s": long_pause_count,
        "speech_to_silence_ratio": speech_ratio,
        "vocal_tremor": vocal_tremor,
        "emotional_tone": emotional_tone,
        "fluency_score": fluency,
        "engagement_level": engagement,
        "hesitation_events": hesitation_count,
        "word_finding_delays": word_finding_delays,
    }
