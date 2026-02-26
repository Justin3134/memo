"""Neo4j graph database operations."""
import os
import logging
from neo4j import GraphDatabase
from typing import Optional

logger = logging.getLogger(__name__)
_driver = None


def get_driver():
    global _driver
    if _driver is None:
        _driver = GraphDatabase.driver(
            os.environ["NEO4J_URI"],
            auth=(os.environ["NEO4J_USERNAME"], os.environ["NEO4J_PASSWORD"]),
            connection_timeout=15,
        )
    return _driver


def ensure_constraints():
    try:
        db = os.environ.get("NEO4J_DATABASE", "neo4j")
        with get_driver().session(database=db) as s:
            s.run("CREATE CONSTRAINT patient_id IF NOT EXISTS FOR (p:Patient) REQUIRE p.id IS UNIQUE")
            s.run("CREATE CONSTRAINT call_id IF NOT EXISTS FOR (c:Call) REQUIRE c.id IS UNIQUE")
    except Exception as e:
        logger.warning(f"Neo4j constraints skipped (instance may be paused): {e}")


def _db():
    return os.environ.get("NEO4J_DATABASE", "neo4j")


def upsert_patient(patient_id: str, name: str, phone: str, age: Optional[int] = None):
    with get_driver().session(database=_db()) as s:
        s.run("""
            MERGE (p:Patient {id: $id})
            SET p.name=$name, p.phone=$phone, p.age=$age,
                p.enrolledAt=CASE WHEN p.enrolledAt IS NULL THEN timestamp() ELSE p.enrolledAt END
        """, id=patient_id, name=name, phone=phone, age=age)


def write_call_analysis(
    patient_id: str, call_id: str, duration: float, summary: str, timestamp: int,
    speech_rate: float, pause_frequency: float, hesitation_count: int, word_finding_score: float,
    cognitive_score: float, emotional_score: float, motor_score: float,
    entities: dict, anomaly_detected: bool, anomaly_type: Optional[str],
    anomaly_severity: Optional[str], anomaly_description: Optional[str],
):
    db = _db()
    with get_driver().session(database=db) as s:
        s.run("MERGE (p:Patient {id: $id})", id=patient_id)
        s.run("""
            MERGE (c:Call {id: $cid})
            SET c.patientId=$pid, c.timestamp=$ts, c.duration=$dur, c.summary=$sum
            WITH c MATCH (p:Patient {id: $pid}) MERGE (p)-[:HAD_CALL]->(c)
        """, cid=call_id, pid=patient_id, ts=timestamp, dur=duration, sum=summary)
        s.run("""
            MERGE (a:AcousticProfile {callId: $cid})
            SET a.speechRate=$sr, a.pauseFrequency=$pf,
                a.hesitationCount=$hc, a.wordFindingScore=$wf
            WITH a MATCH (c:Call {id: $cid}) MERGE (c)-[:HAS_ACOUSTIC_PROFILE]->(a)
        """, cid=call_id, sr=speech_rate, pf=pause_frequency, hc=hesitation_count, wf=word_finding_score)
        s.run("""
            MERGE (sc:CognitiveScore {callId: $cid})
            SET sc.overallScore=$cog, sc.emotionalScore=$emo, sc.motorScore=$mot,
                sc.anomalyFlags=$flags
            WITH sc MATCH (c:Call {id: $cid}) MERGE (c)-[:HAS_COGNITIVE_SCORE]->(sc)
        """, cid=call_id, cog=cognitive_score, emo=emotional_score, mot=motor_score,
             flags=list(entities.keys()))
        if anomaly_detected and anomaly_type:
            s.run("""
                MERGE (an:Anomaly {callId: $cid})
                SET an.type=$atype, an.severity=$sev, an.description=$desc, an.detectedAt=$ts
                WITH an MATCH (sc:CognitiveScore {callId: $cid}) MERGE (sc)-[:TRIGGERED]->(an)
            """, cid=call_id, atype=anomaly_type, sev=anomaly_severity or "medium",
                 desc=anomaly_description or "", ts=timestamp)


def attach_research(call_id: str, items: list[dict]):
    with get_driver().session(database=_db()) as s:
        for item in items:
            s.run("""
                MERGE (r:MedicalResearch {url: $url})
                SET r.title=$title, r.source=$src, r.markers=$markers
                WITH r MATCH (an:Anomaly {callId: $cid}) MERGE (an)-[:SUPPORTED_BY]->(r)
            """, url=item.get("url",""), title=item.get("title",""),
                 src=item.get("source",""), markers=item.get("markers",[]), cid=call_id)


def get_patient_graph(patient_id: str) -> dict:
    with get_driver().session(database=_db()) as s:
        result = s.run("""
            MATCH (p:Patient {id: $id})-[:HAD_CALL]->(c:Call)
            OPTIONAL MATCH (c)-[:HAS_ACOUSTIC_PROFILE]->(a:AcousticProfile)
            OPTIONAL MATCH (c)-[:HAS_COGNITIVE_SCORE]->(sc:CognitiveScore)
            OPTIONAL MATCH (sc)-[:TRIGGERED]->(an:Anomaly)
            OPTIONAL MATCH (an)-[:SUPPORTED_BY]->(r:MedicalResearch)
            RETURN p, c, a, sc, an, r ORDER BY c.timestamp DESC
        """, id=patient_id)
        nodes, links = {}, []
        def add(node, label=None):
            if node is None: return None
            nid = str(node.element_id)
            if nid not in nodes:
                nodes[nid] = {"id": nid, "label": label or list(node.labels)[0], "props": dict(node)}
            return nid
        for rec in result:
            p = add(rec["p"], "Patient"); c = add(rec["c"], "Call")
            a = add(rec["a"], "AcousticProfile"); sc = add(rec["sc"], "CognitiveScore")
            an = add(rec["an"], "Anomaly"); r = add(rec["r"], "MedicalResearch")
            if p and c: links.append({"source": p, "target": c, "type": "HAD_CALL"})
            if c and a: links.append({"source": c, "target": a, "type": "HAS_ACOUSTIC"})
            if c and sc: links.append({"source": c, "target": sc, "type": "HAS_SCORE"})
            if sc and an: links.append({"source": sc, "target": an, "type": "TRIGGERED"})
            if an and r: links.append({"source": an, "target": r, "type": "RESEARCH"})
        return {"nodes": list(nodes.values()), "links": links}


def get_timeline(patient_id: str) -> list[dict]:
    with get_driver().session(database=_db()) as s:
        result = s.run("""
            MATCH (p:Patient {id: $id})-[:HAD_CALL]->(c:Call)-[:HAS_COGNITIVE_SCORE]->(sc:CognitiveScore)
            RETURN c.timestamp AS ts, c.id AS callId, sc.overallScore AS cognitive,
                   sc.emotionalScore AS emotional, sc.motorScore AS motor
            ORDER BY c.timestamp ASC
        """, id=patient_id)
        return [dict(r) for r in result]


def list_patients() -> list[dict]:
    with get_driver().session(database=_db()) as s:
        result = s.run("""
            MATCH (p:Patient)
            OPTIONAL MATCH (p)-[:HAD_CALL]->(c:Call)-[:HAS_COGNITIVE_SCORE]->(sc:CognitiveScore)
            WITH p, sc ORDER BY c.timestamp DESC
            WITH p, collect(sc.overallScore)[0] AS latestScore, count(c) AS callCount
            RETURN p.id AS id, p.name AS name, p.phone AS phone, latestScore, callCount
            ORDER BY p.enrolledAt DESC
        """)
        return [dict(r) for r in result]
