"""
Modulate Velma-2 voice intelligence integration.

Calls the real Modulate Velma-2 STT Batch API to analyze call recordings:
  - Speaker diarization (separates AI assistant from patient)
  - Per-utterance emotion detection from voice (26 emotions)
  - Utterance-level timing (start_ms, duration_ms)
  - Accent detection

From the utterance data we compute clinical acoustic biomarkers:
  - Speech rate, pause frequency, hesitation patterns
  - Emotional trajectory across the conversation
  - Fluency score, engagement level, vocal tremor indicators

Endpoint: POST https://modulate-developer-apis.com/api/velma-2-stt-batch
Auth: X-API-Key header
"""
import os
import logging
import re
import tempfile
from typing import Optional

import httpx

logger = logging.getLogger(__name__)

MODULATE_API_KEY = os.environ.get("MODULATE_API_KEY", "")
MODULATE_BATCH_URL = "https://modulate-developer-apis.com/api/velma-2-stt-batch"


async def analyze_recording(audio_bytes: bytes, filename: str = "recording.wav") -> Optional[dict]:
    """
    Send audio to Modulate Velma-2 STT Batch API with emotion + speaker diarization.
    Returns raw API response with utterances, or None on failure.
    """
    if not MODULATE_API_KEY:
        logger.warning("MODULATE_API_KEY not set, skipping Modulate analysis")
        return None

    try:
        async with httpx.AsyncClient(timeout=120) as client:
            files = {"upload_file": (filename, audio_bytes, "application/octet-stream")}
            data = {
                "speaker_diarization": "true",
                "emotion_signal": "true",
                "accent_signal": "true",
                "pii_phi_tagging": "false",
            }
            resp = await client.post(
                MODULATE_BATCH_URL,
                headers={"X-API-Key": MODULATE_API_KEY},
                files=files,
                data=data,
            )

            if resp.status_code != 200:
                logger.error(f"Modulate API error {resp.status_code}: {resp.text[:300]}")
                return None

            result = resp.json()
            utterances = result.get("utterances", [])
            logger.info(f"Modulate: {len(utterances)} utterances, "
                        f"duration={result.get('duration_ms', 0)}ms")
            return result

    except Exception as e:
        logger.error(f"Modulate API call failed: {e}")
        return None


def extract_biomarkers(modulate_result: dict, transcript: str = "") -> dict:
    """
    Compute clinical acoustic biomarkers from Modulate's utterance-level data.
    
    Uses real timing, real emotion detection, and speaker diarization to produce
    measurements that would otherwise require librosa or ToxMod SDK.
    """
    utterances = modulate_result.get("utterances", [])
    total_duration_ms = modulate_result.get("duration_ms", 0)
    total_duration_sec = total_duration_ms / 1000
    total_duration_min = max(total_duration_sec / 60, 0.1)

    if not utterances:
        return _empty_biomarkers(total_duration_sec)

    # Separate patient utterances from AI (speaker 1 = usually first speaker)
    # In Vapi calls, the AI speaks first, so speaker 1 = AI, speaker 2 = patient
    speakers = set(u.get("speaker", 1) for u in utterances)
    patient_speaker = max(speakers) if len(speakers) > 1 else 1
    
    patient_utts = [u for u in utterances if u.get("speaker") == patient_speaker]
    ai_utts = [u for u in utterances if u.get("speaker") != patient_speaker]

    if not patient_utts:
        patient_utts = utterances

    # --- Speech rate (patient words per minute) ---
    patient_word_count = sum(len(u.get("text", "").split()) for u in patient_utts)
    patient_total_ms = sum(u.get("duration_ms", 0) for u in patient_utts)
    patient_duration_min = max(patient_total_ms / 60000, 0.1)
    speech_rate_wpm = round(patient_word_count / patient_duration_min)

    # --- Pause analysis (gaps between consecutive patient utterances) ---
    sorted_patient = sorted(patient_utts, key=lambda u: u.get("start_ms", 0))
    gaps = []
    for i in range(1, len(sorted_patient)):
        prev_end = sorted_patient[i - 1].get("start_ms", 0) + sorted_patient[i - 1].get("duration_ms", 0)
        curr_start = sorted_patient[i].get("start_ms", 0)
        gap_sec = (curr_start - prev_end) / 1000
        if gap_sec > 0.1:
            gaps.append(gap_sec)

    significant_pauses = [g for g in gaps if g > 0.3]
    long_pauses = [g for g in gaps if g > 1.5]
    pause_count = len(significant_pauses)
    pause_frequency = round(pause_count / patient_duration_min, 2)
    avg_pause = round(sum(significant_pauses) / len(significant_pauses), 3) if significant_pauses else 0
    max_pause = round(max(significant_pauses), 3) if significant_pauses else 0

    # --- Emotion analysis (from Modulate's real voice emotion detection) ---
    patient_emotions = [u.get("emotion") for u in patient_utts if u.get("emotion")]
    emotion_counts = {}
    for e in patient_emotions:
        emotion_counts[e] = emotion_counts.get(e, 0) + 1

    dominant_emotion = max(emotion_counts, key=emotion_counts.get) if emotion_counts else "Neutral"
    
    positive_emotions = {"Happy", "Amused", "Excited", "Proud", "Affectionate",
                         "Interested", "Hopeful", "Relieved", "Confident", "Calm"}
    negative_emotions = {"Frustrated", "Angry", "Contemptuous", "Afraid", "Sad",
                         "Ashamed", "Disgusted", "Disappointed", "Anxious", "Stressed"}
    concern_emotions = {"Confused", "Concerned", "Tired", "Bored"}

    positive_count = sum(1 for e in patient_emotions if e in positive_emotions)
    negative_count = sum(1 for e in patient_emotions if e in negative_emotions)
    concern_count = sum(1 for e in patient_emotions if e in concern_emotions)
    total_emotions = max(len(patient_emotions), 1)

    positive_ratio = positive_count / total_emotions
    negative_ratio = negative_count / total_emotions
    concern_ratio = concern_count / total_emotions

    # Emotional tone classification
    if positive_ratio > 0.5:
        emotional_tone = "positive"
    elif negative_ratio > 0.4:
        emotional_tone = "flat"
    elif concern_ratio > 0.3:
        emotional_tone = "concerned"
    else:
        emotional_tone = "neutral"

    # Emotional score (0-100)
    emotional_score = round(min(100, max(0,
        positive_ratio * 100 - negative_ratio * 60 - concern_ratio * 20 + 50
    )))

    # --- Hesitation / word-finding difficulty ---
    short_utts_with_gaps = 0
    for i in range(1, len(sorted_patient)):
        prev_end = sorted_patient[i - 1].get("start_ms", 0) + sorted_patient[i - 1].get("duration_ms", 0)
        curr_start = sorted_patient[i].get("start_ms", 0)
        gap_sec = (curr_start - prev_end) / 1000
        word_count = len(sorted_patient[i].get("text", "").split())
        if gap_sec > 1.0 and word_count < 5:
            short_utts_with_gaps += 1

    filler_count = 0
    if transcript:
        filler_count = len(re.findall(r'\b(um|uh|er|hmm)\b', transcript.lower()))

    hesitation_events = short_utts_with_gaps + filler_count

    # --- Vocal tremor proxy ---
    vocal_tremor = "none"
    if speech_rate_wpm < 80 and pause_frequency > 8:
        vocal_tremor = "moderate"
    elif speech_rate_wpm < 100 and pause_frequency > 6:
        vocal_tremor = "mild"

    # --- Fluency score (composite 0-100) ---
    fluency = 100.0
    if speech_rate_wpm < 100:
        fluency -= (100 - speech_rate_wpm) * 0.3
    if pause_frequency > 6:
        fluency -= (pause_frequency - 6) * 4
    if len(long_pauses) > 2:
        fluency -= len(long_pauses) * 3
    if hesitation_events > 5:
        fluency -= (hesitation_events - 5) * 2
    if vocal_tremor != "none":
        fluency -= 10
    fluency = max(0, min(100, round(fluency)))

    # --- Engagement level ---
    speech_ratio = patient_total_ms / max(total_duration_ms, 1)
    engagement = min(100, round(speech_ratio * 80 + positive_ratio * 40))

    # --- Repetition detection ---
    repeat_phrases = _detect_repetitions(
        " ".join(u.get("text", "") for u in patient_utts)
    )

    return {
        "source": "modulate_velma2",
        "api_key_configured": True,
        "audio_available": True,
        "duration_sec": round(total_duration_sec, 2),

        # Core acoustic biomarkers
        "speech_rate_wpm": speech_rate_wpm,
        "pause_frequency_per_min": pause_frequency,
        "pause_count": pause_count,
        "avg_pause_sec": avg_pause,
        "max_pause_sec": max_pause,
        "long_pauses_over_1s": len(long_pauses),
        "speech_to_silence_ratio": round(speech_ratio, 3),

        # Emotion (from Modulate's real voice detection)
        "emotional_tone": emotional_tone,
        "emotional_score": emotional_score,
        "dominant_emotion": dominant_emotion,
        "emotion_breakdown": emotion_counts,
        "positive_ratio": round(positive_ratio, 3),
        "negative_ratio": round(negative_ratio, 3),
        "concern_ratio": round(concern_ratio, 3),

        # Cognitive markers
        "hesitation_events": hesitation_events,
        "word_finding_delays": short_utts_with_gaps,
        "filler_count": filler_count,
        "vocal_tremor": vocal_tremor,
        "fluency_score": fluency,
        "engagement_level": engagement,

        # Repetition
        "repetition_count": len(repeat_phrases),
        "repeated_phrases": repeat_phrases[:5],

        # Speaker separation
        "patient_utterance_count": len(patient_utts),
        "ai_utterance_count": len(ai_utts),
        "patient_word_count": patient_word_count,

        # Raw utterance emotions for timeline
        "utterance_emotions": [
            {
                "text": u.get("text", "")[:80],
                "emotion": u.get("emotion"),
                "start_ms": u.get("start_ms", 0),
                "duration_ms": u.get("duration_ms", 0),
                "speaker": u.get("speaker", 1),
            }
            for u in patient_utts
        ],
    }


def _empty_biomarkers(duration_sec: float) -> dict:
    return {
        "source": "modulate_velma2",
        "api_key_configured": True,
        "audio_available": True,
        "duration_sec": duration_sec,
        "speech_rate_wpm": 0,
        "pause_frequency_per_min": 0,
        "pause_count": 0,
        "avg_pause_sec": 0,
        "max_pause_sec": 0,
        "long_pauses_over_1s": 0,
        "speech_to_silence_ratio": 0,
        "emotional_tone": "neutral",
        "emotional_score": 50,
        "dominant_emotion": "Neutral",
        "emotion_breakdown": {},
        "positive_ratio": 0,
        "negative_ratio": 0,
        "concern_ratio": 0,
        "hesitation_events": 0,
        "word_finding_delays": 0,
        "filler_count": 0,
        "vocal_tremor": "none",
        "fluency_score": 70,
        "engagement_level": 50,
        "repetition_count": 0,
        "repeated_phrases": [],
        "patient_utterance_count": 0,
        "ai_utterance_count": 0,
        "patient_word_count": 0,
        "utterance_emotions": [],
    }


def transcript_fallback(
    transcript: str,
    duration: float,
    speech_rate: float = 0,
    pause_frequency: float = 0,
    hesitation_count: int = 0,
    emotional_score: float = 75,
) -> dict:
    """Fallback when no recording URL or Modulate unavailable."""
    words = transcript.split() if transcript else []
    word_count = len(words)
    duration_min = max(duration / 60, 0.1)

    computed_sr = speech_rate if speech_rate > 0 else round(word_count / duration_min)
    um_count = len(re.findall(r'\b(um|uh|er|hmm|like)\b', transcript.lower())) if transcript else 0
    computed_hes = hesitation_count if hesitation_count > 0 else um_count

    if emotional_score >= 70:
        tone = "positive"
    elif emotional_score >= 40:
        tone = "neutral"
    else:
        tone = "flat"

    fluency = 100
    if computed_sr < 100:
        fluency -= (100 - computed_sr) * 0.3
    if pause_frequency > 6:
        fluency -= (pause_frequency - 6) * 5
    if computed_hes > 5:
        fluency -= (computed_hes - 5) * 2
    fluency = max(0, min(100, round(fluency)))

    vocal_tremor = "none"
    if computed_sr < 80 and emotional_score < 50:
        vocal_tremor = "mild"
    if computed_sr < 60:
        vocal_tremor = "moderate"

    engagement = min(100, round((word_count / max(duration_min, 1)) * 0.5 + emotional_score * 0.3))

    return {
        "source": "transcript_derived",
        "api_key_configured": bool(MODULATE_API_KEY),
        "audio_available": False,
        "speech_rate_wpm": computed_sr,
        "pause_frequency_per_min": round(pause_frequency, 2),
        "pause_count": 0,
        "avg_pause_sec": 0,
        "max_pause_sec": 0,
        "long_pauses_over_1s": 0,
        "speech_to_silence_ratio": 0,
        "emotional_tone": tone,
        "emotional_score": round(emotional_score),
        "dominant_emotion": tone.title(),
        "emotion_breakdown": {},
        "positive_ratio": 0,
        "negative_ratio": 0,
        "concern_ratio": 0,
        "hesitation_events": computed_hes,
        "word_finding_delays": 0,
        "filler_count": um_count,
        "vocal_tremor": vocal_tremor,
        "fluency_score": fluency,
        "engagement_level": engagement,
        "repetition_count": 0,
        "repeated_phrases": [],
        "patient_utterance_count": 0,
        "ai_utterance_count": 0,
        "patient_word_count": word_count,
        "utterance_emotions": [],
    }


def _detect_repetitions(text: str) -> list[str]:
    if not text:
        return []
    sentences = re.split(r'[.!?]+', text.lower())
    sentences = [s.strip() for s in sentences if len(s.strip()) > 15]
    seen = {}
    repeats = []
    for s in sentences:
        words = s.split()
        for i in range(len(words) - 2):
            tri = " ".join(words[i:i + 3])
            if tri in seen and tri not in repeats:
                repeats.append(tri)
            seen[tri] = True
    return repeats


def get_status() -> dict:
    return {
        "configured": bool(MODULATE_API_KEY),
        "api_key_present": bool(MODULATE_API_KEY),
        "mode": "velma2_batch" if MODULATE_API_KEY else "not_configured",
        "endpoint": MODULATE_BATCH_URL,
        "features": ["speaker_diarization", "emotion_detection", "accent_detection"],
    }
