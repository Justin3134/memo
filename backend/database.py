"""Postgres database setup with SQLAlchemy."""
import os
import json
import uuid
import time
import logging
from datetime import datetime
from typing import Optional

from sqlalchemy import create_engine, Column, String, Float, Integer, Boolean, Text, ForeignKey, Index
from sqlalchemy.orm import declarative_base, sessionmaker, relationship, Session

logger = logging.getLogger(__name__)

DATABASE_URL = os.environ.get("DATABASE_URL", "")
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

if not DATABASE_URL:
    DB_PATH = os.path.join(os.path.dirname(__file__), "memo.db")
    DATABASE_URL = f"sqlite:///{DB_PATH}"
    logger.info(f"No DATABASE_URL set, using SQLite: {DB_PATH}")

engine = create_engine(DATABASE_URL, pool_pre_ping=True)
SessionLocal = sessionmaker(bind=engine)
Base = declarative_base()


def new_id() -> str:
    return uuid.uuid4().hex[:24]


def now_ms() -> int:
    return int(time.time() * 1000)


class Patient(Base):
    __tablename__ = "patients"
    id = Column(String, primary_key=True, default=new_id)
    name = Column(String, nullable=False)
    phone_number = Column(String, nullable=False)
    family_user_id = Column(String, default="")
    memo_time = Column(String, default="10:00")
    timezone = Column(String, default="America/Chicago")
    photo_url = Column(String, nullable=True)
    consent_given = Column(Boolean, default=True)
    interests_json = Column(Text, default="[]")
    known_people_json = Column(Text, default="[]")
    health_context = Column(Text, nullable=True)
    voice_id = Column(String, nullable=True)
    emergency_contact = Column(String, nullable=True)
    emergency_contact_name = Column(String, nullable=True)
    last_called_at = Column(Float, nullable=True)
    baseline_json = Column(Text, nullable=True)
    created_at = Column(Float, default=now_ms)

    calls = relationship("Call", back_populates="patient", cascade="all, delete-orphan")
    memories = relationship("Memory", back_populates="patient", cascade="all, delete-orphan")
    alerts = relationship("Alert", back_populates="patient", cascade="all, delete-orphan")

    def to_dict(self):
        d = {
            "_id": self.id,
            "name": self.name,
            "phoneNumber": self.phone_number,
            "familyUserId": self.family_user_id,
            "memoTime": self.memo_time,
            "timezone": self.timezone,
            "consentGiven": self.consent_given,
            "interests": json.loads(self.interests_json or "[]"),
            "knownPeople": json.loads(self.known_people_json or "[]"),
            "healthContext": self.health_context,
            "voiceId": self.voice_id,
            "emergencyContact": self.emergency_contact,
            "emergencyContactName": self.emergency_contact_name,
            "lastCalledAt": self.last_called_at,
        }
        if self.baseline_json:
            d["baseline"] = json.loads(self.baseline_json)
        return d


class Call(Base):
    __tablename__ = "calls"
    id = Column(String, primary_key=True, default=new_id)
    patient_id = Column(String, ForeignKey("patients.id"), nullable=False)
    vapi_call_id = Column(String, default="")
    started_at = Column(Float, nullable=False)
    ended_at = Column(Float, nullable=True)
    duration = Column(Float, nullable=True)
    status = Column(String, default="pending")
    transcript = Column(Text, nullable=True)
    summary = Column(Text, nullable=True)
    speech_rate = Column(Float, nullable=True)
    pause_frequency = Column(Float, nullable=True)
    response_latency = Column(Float, nullable=True)
    cognitive_score = Column(Float, nullable=True)
    emotional_score = Column(Float, nullable=True)
    motor_score = Column(Float, nullable=True)
    health_mentions_json = Column(Text, default="[]")
    conversation_signals_json = Column(Text, default="[]")
    anomaly_detected = Column(Boolean, default=False)
    video_guidance_topic = Column(String, nullable=True)
    recording_url = Column(String, nullable=True)

    patient = relationship("Patient", back_populates="calls")

    __table_args__ = (
        Index("ix_calls_patient", "patient_id"),
        Index("ix_calls_vapi", "vapi_call_id"),
    )

    def to_dict(self):
        return {
            "_id": self.id,
            "patientId": self.patient_id,
            "vapiCallId": self.vapi_call_id,
            "startedAt": self.started_at,
            "endedAt": self.ended_at,
            "duration": self.duration,
            "status": self.status,
            "transcript": self.transcript,
            "summary": self.summary,
            "speechRate": self.speech_rate,
            "pauseFrequency": self.pause_frequency,
            "responseLatency": self.response_latency,
            "cognitiveScore": self.cognitive_score,
            "emotionalScore": self.emotional_score,
            "motorScore": self.motor_score,
            "healthMentions": json.loads(self.health_mentions_json or "[]"),
            "conversationSignals": json.loads(self.conversation_signals_json or "[]"),
            "anomalyDetected": self.anomaly_detected,
            "videoGuidanceTopic": self.video_guidance_topic,
            "recordingUrl": self.recording_url,
        }


class Memory(Base):
    __tablename__ = "memories"
    id = Column(String, primary_key=True, default=new_id)
    patient_id = Column(String, ForeignKey("patients.id"), nullable=False)
    call_id = Column(String, ForeignKey("calls.id"), nullable=False)
    timestamp = Column(Float, nullable=False)
    category = Column(String, default="daily_life")
    content = Column(Text, nullable=False)
    entities_json = Column(Text, default="[]")
    sentiment = Column(String, default="neutral")

    patient = relationship("Patient", back_populates="memories")

    __table_args__ = (Index("ix_memories_patient", "patient_id"),)

    def to_dict(self):
        return {
            "_id": self.id,
            "patientId": self.patient_id,
            "callId": self.call_id,
            "timestamp": self.timestamp,
            "category": self.category,
            "content": self.content,
            "entities": json.loads(self.entities_json or "[]"),
            "sentiment": self.sentiment,
        }


class Alert(Base):
    __tablename__ = "alerts"
    id = Column(String, primary_key=True, default=new_id)
    patient_id = Column(String, ForeignKey("patients.id"), nullable=False)
    call_id = Column(String, ForeignKey("calls.id"), nullable=False)
    timestamp = Column(Float, nullable=False)
    severity = Column(String, default="medium")
    signal_type = Column(String, default="composite")
    description = Column(Text, nullable=False)
    current_value = Column(Float, default=0)
    baseline_value = Column(Float, default=75)
    reviewed = Column(Boolean, default=False)
    video_url = Column(String, nullable=True)
    recommended_action = Column(Text, nullable=True)
    evidence_quotes_json = Column(Text, default="[]")

    patient = relationship("Patient", back_populates="alerts")

    __table_args__ = (Index("ix_alerts_patient", "patient_id"),)

    def to_dict(self):
        return {
            "_id": self.id,
            "patientId": self.patient_id,
            "callId": self.call_id,
            "timestamp": self.timestamp,
            "severity": self.severity,
            "signalType": self.signal_type,
            "description": self.description,
            "currentValue": self.current_value,
            "baselineValue": self.baseline_value,
            "reviewed": self.reviewed,
            "videoUrl": self.video_url,
            "recommendedAction": self.recommended_action,
            "evidenceQuotes": json.loads(self.evidence_quotes_json or "[]"),
        }


def get_db() -> Session:
    return SessionLocal()


def init_db():
    Base.metadata.create_all(bind=engine)
    logger.info(f"Database tables created ({DATABASE_URL.split('://')[0]})")
