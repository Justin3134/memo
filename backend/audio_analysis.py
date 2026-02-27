"""
Audio download utility for Vapi call recordings.

Downloads audio from Vapi's recording URL so it can be sent to
Modulate's Velma-2 STT Batch API for real voice analysis.
"""
import logging
from typing import Optional

import httpx

logger = logging.getLogger(__name__)


def download_recording(recording_url: str, timeout: float = 30) -> Optional[bytes]:
    """Download audio file from Vapi recording URL. Returns raw bytes or None."""
    if not recording_url:
        return None
    try:
        with httpx.Client(timeout=timeout, follow_redirects=True) as client:
            resp = client.get(recording_url)
            resp.raise_for_status()
            size = len(resp.content)
            content_type = resp.headers.get("content-type", "")
            logger.info(f"Downloaded audio: {size} bytes, type={content_type}")
            if size < 1000:
                logger.warning("Audio file too small, likely empty")
                return None
            return resp.content
    except Exception as e:
        logger.error(f"Audio download failed: {e}")
        return None


def guess_extension(recording_url: str) -> str:
    """Guess file extension from URL for Modulate upload."""
    url_lower = recording_url.lower()
    for ext in (".wav", ".mp3", ".mp4", ".ogg", ".opus", ".flac", ".webm", ".aac"):
        if ext in url_lower:
            return ext
    return ".wav"
