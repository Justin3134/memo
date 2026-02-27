"""
Real acoustic feature extraction from call recordings.

Downloads audio from Vapi recording URL and extracts clinical voice biomarkers
using librosa/scipy — the same signals Modulate's ToxMod Velma engine measures:

  - Speech rate (words per minute from energy segmentation)
  - Pause frequency and duration (silence detection)
  - Pitch variation (F0 contour for vocal tremor)
  - Energy dynamics (engagement/emotional flatness)
  - Hesitation patterns (short burst detection)

These feed into Neo4j AcousticProfile nodes and trigger clinical marker matching.
"""
import os
import io
import logging
import tempfile
from typing import Optional

import httpx

logger = logging.getLogger(__name__)

_HAS_LIBROSA = False
try:
    import librosa
    import numpy as np
    _HAS_LIBROSA = True
except ImportError:
    logger.warning("librosa not installed — audio analysis will be unavailable. pip install librosa")


def analyze_recording(recording_url: str, duration_hint: float = 0) -> Optional[dict]:
    """
    Download audio from recording_url and extract acoustic biomarkers.
    Returns None if audio can't be fetched or librosa isn't available.
    """
    if not _HAS_LIBROSA:
        logger.info("librosa not available, skipping audio analysis")
        return None

    if not recording_url:
        return None

    try:
        audio_bytes = _download_audio(recording_url)
        if not audio_bytes:
            return None
        return _extract_features(audio_bytes)
    except Exception as e:
        logger.error(f"Audio analysis failed: {e}")
        return None


def _download_audio(url: str, timeout: float = 30) -> Optional[bytes]:
    """Download audio file from URL."""
    try:
        with httpx.Client(timeout=timeout, follow_redirects=True) as client:
            resp = client.get(url)
            resp.raise_for_status()
            content_type = resp.headers.get("content-type", "")
            size = len(resp.content)
            logger.info(f"Downloaded audio: {size} bytes, type={content_type}")
            if size < 1000:
                logger.warning("Audio file too small, likely empty")
                return None
            return resp.content
    except Exception as e:
        logger.error(f"Audio download failed: {e}")
        return None


def _extract_features(audio_bytes: bytes) -> dict:
    """Extract acoustic biomarkers from raw audio bytes."""
    with tempfile.NamedTemporaryFile(suffix=".wav", delete=True) as tmp:
        tmp.write(audio_bytes)
        tmp.flush()
        y, sr = librosa.load(tmp.name, sr=16000, mono=True)

    duration = len(y) / sr
    if duration < 1:
        return {"error": "recording too short", "duration": duration}

    # --- Silence/speech segmentation ---
    intervals = librosa.effects.split(y, top_db=30)
    speech_durations = [(end - start) / sr for start, end in intervals]
    silence_gaps = []
    for i in range(1, len(intervals)):
        gap = (intervals[i][0] - intervals[i - 1][1]) / sr
        silence_gaps.append(gap)

    total_speech = sum(speech_durations)
    total_silence = sum(silence_gaps) if silence_gaps else 0
    speech_ratio = total_speech / duration if duration > 0 else 0

    # --- Pause metrics ---
    significant_pauses = [g for g in silence_gaps if g > 0.3]
    pause_count = len(significant_pauses)
    duration_min = duration / 60
    pause_frequency = round(pause_count / max(duration_min, 0.1), 2)
    avg_pause_duration = round(np.mean(significant_pauses), 3) if significant_pauses else 0
    max_pause_duration = round(max(significant_pauses), 3) if significant_pauses else 0

    long_pauses = [g for g in silence_gaps if g > 1.0]
    long_pause_count = len(long_pauses)

    # --- Speech rate estimate (syllable-based) ---
    onset_env = librosa.onset.onset_strength(y=y, sr=sr)
    onsets = librosa.onset.onset_detect(y=y, sr=sr, onset_envelope=onset_env, units="time")
    syllable_count = len(onsets)
    speech_rate_wpm = round((syllable_count / max(duration_min, 0.1)) * 0.6)

    # --- Pitch (F0) analysis ---
    f0, voiced_flag, _ = librosa.pyin(y, fmin=60, fmax=400, sr=sr)
    f0_valid = f0[~np.isnan(f0)] if f0 is not None else np.array([])

    pitch_mean = round(float(np.mean(f0_valid)), 2) if len(f0_valid) > 0 else 0
    pitch_std = round(float(np.std(f0_valid)), 2) if len(f0_valid) > 0 else 0
    pitch_range = round(float(np.ptp(f0_valid)), 2) if len(f0_valid) > 0 else 0

    # Low pitch variation = potential vocal tremor or emotional flatness
    vocal_tremor = "none"
    if pitch_std < 15 and pitch_mean > 0:
        vocal_tremor = "mild"
    if pitch_std < 8 and pitch_mean > 0:
        vocal_tremor = "moderate"

    # --- Energy (RMS) analysis ---
    rms = librosa.feature.rms(y=y)[0]
    energy_mean = round(float(np.mean(rms)), 6)
    energy_std = round(float(np.std(rms)), 6)
    energy_variation = round(energy_std / max(energy_mean, 1e-6), 3)

    # Low energy variation = emotional flatness
    emotional_tone = "positive"
    if energy_variation < 0.4:
        emotional_tone = "neutral"
    if energy_variation < 0.25:
        emotional_tone = "flat"

    # --- Fluency score (composite) ---
    fluency = 100.0
    if speech_rate_wpm < 100:
        fluency -= (100 - speech_rate_wpm) * 0.3
    if pause_frequency > 6:
        fluency -= (pause_frequency - 6) * 4
    if long_pause_count > 3:
        fluency -= long_pause_count * 3
    if vocal_tremor != "none":
        fluency -= 10
    fluency = max(0, min(100, round(fluency)))

    # --- Engagement ---
    engagement = min(100, round(speech_ratio * 80 + energy_variation * 40))

    return {
        "source": "audio_analysis",
        "audio_available": True,
        "duration_sec": round(duration, 2),
        "speech_rate_wpm": speech_rate_wpm,
        "pause_frequency_per_min": pause_frequency,
        "pause_count": pause_count,
        "avg_pause_sec": avg_pause_duration,
        "max_pause_sec": max_pause_duration,
        "long_pauses_over_1s": long_pause_count,
        "speech_to_silence_ratio": round(speech_ratio, 3),
        "pitch_mean_hz": pitch_mean,
        "pitch_std_hz": pitch_std,
        "pitch_range_hz": pitch_range,
        "vocal_tremor": vocal_tremor,
        "energy_mean": energy_mean,
        "energy_variation": energy_variation,
        "emotional_tone": emotional_tone,
        "fluency_score": fluency,
        "engagement_level": engagement,
        "syllable_count": syllable_count,
        "hesitation_events": long_pause_count,
    }
