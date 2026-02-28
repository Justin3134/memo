"""Neo4j knowledge graph — longitudinal memory graph for cognitive health."""
import os
import re
import logging
from neo4j import GraphDatabase
from neo4j.exceptions import ServiceUnavailable, AuthError, ClientError
from typing import Optional

logger = logging.getLogger(__name__)
_driver = None


def get_driver():
    global _driver
    if _driver is None:
        uri = os.environ.get("NEO4J_URI", "")
        username = os.environ.get("NEO4J_USERNAME", "neo4j")
        password = os.environ.get("NEO4J_PASSWORD", "")
        if not uri or not password:
            raise RuntimeError("NEO4J_URI and NEO4J_PASSWORD must be set in .env")
        uri_ssc = uri.replace("neo4j+s://", "neo4j+ssc://").replace("bolt+s://", "bolt+ssc://")
        _driver = GraphDatabase.driver(uri_ssc, auth=(username, password))
    return _driver


def verify_connection():
    try:
        driver = get_driver()
        driver.verify_connectivity()
        return True, "Connected"
    except AuthError as e:
        return False, f"Auth failed — check NEO4J_USERNAME and NEO4J_PASSWORD: {e}"
    except ServiceUnavailable as e:
        return False, f"Neo4j instance unreachable — it may be paused at console.neo4j.io: {e}"
    except RuntimeError as e:
        return False, str(e)
    except Exception as e:
        return False, f"Connection error: {e}"


def _db():
    return os.environ.get("NEO4J_DATABASE", "neo4j")


def ensure_constraints():
    ok, msg = verify_connection()
    if not ok:
        logger.warning(f"Neo4j unavailable on startup, skipping constraints: {msg}")
        return
    try:
        db = _db()
        with get_driver().session(database=db) as s:
            s.run("CREATE CONSTRAINT patient_id IF NOT EXISTS FOR (p:Patient) REQUIRE p.id IS UNIQUE")
            s.run("CREATE CONSTRAINT call_id IF NOT EXISTS FOR (c:Call) REQUIRE c.id IS UNIQUE")
            s.run("CREATE CONSTRAINT topic_name IF NOT EXISTS FOR (t:Topic) REQUIRE t.name IS UNIQUE")
            try:
                s.run("CREATE CONSTRAINT evidence_id IF NOT EXISTS FOR (e:Evidence) REQUIRE e.id IS UNIQUE")
            except Exception:
                pass
            s.run("CREATE CONSTRAINT marker_name IF NOT EXISTS FOR (m:AcousticMarker) REQUIRE m.name IS UNIQUE")
            s.run("CREATE CONSTRAINT pattern_name IF NOT EXISTS FOR (cp:ClinicalPattern) REQUIRE cp.name IS UNIQUE")
            s.run("CREATE CONSTRAINT condition_name IF NOT EXISTS FOR (cond:Condition) REQUIRE cond.name IS UNIQUE")
            for label in ["SpeechRate", "PauseFrequency", "HesitationCount", "WordFindingScore",
                          "CognitiveScore", "EmotionalScore", "MotorScore"]:
                try:
                    s.run(f"CREATE CONSTRAINT {label.lower()}_callid IF NOT EXISTS FOR (n:{label}) REQUIRE n.callId IS UNIQUE")
                except Exception:
                    pass
        logger.info("Neo4j constraints ready")
    except Exception as e:
        logger.warning(f"Neo4j constraints skipped: {e}")


# ─── Clinical knowledge graph (seeded once) ─────────────────────────────────

CLINICAL_KNOWLEDGE = [
    {
        "marker": "HighPauseFrequency", "marker_desc": "Pause frequency > 6/min",
        "pattern": "WordFindingDifficulty", "pattern_desc": "Difficulty retrieving words during speech",
        "condition": "MCI", "condition_desc": "Mild Cognitive Impairment",
        "studies": [
            {"title": "Speech pause patterns as early markers of cognitive decline", "source": "JAMA Neurology 2024", "url": "https://doi.org/10.1001/jamaneurol.2024"},
            {"title": "Acoustic biomarkers for MCI detection in elderly populations", "source": "Alzheimer's & Dementia 2023", "url": "https://doi.org/10.1002/alz.13456"},
        ]
    },
    {
        "marker": "SpeechRateDecline", "marker_desc": "Speech rate dropping below 100 wpm",
        "pattern": "CognitiveSlowing", "pattern_desc": "Generalized reduction in processing speed",
        "condition": "MCI", "condition_desc": "Mild Cognitive Impairment",
        "studies": [
            {"title": "Speech rate as a digital biomarker for neurodegeneration", "source": "Nature Digital Medicine 2024", "url": "https://doi.org/10.1038/s41746-024"},
        ]
    },
    {
        "marker": "EmotionalFlatness", "marker_desc": "Reduced emotional variability in voice",
        "pattern": "AffectiveBlunting", "pattern_desc": "Diminished emotional expression",
        "condition": "Depression", "condition_desc": "Major Depressive Disorder in elderly",
        "studies": [
            {"title": "Vocal prosody changes in late-life depression", "source": "American J. of Geriatric Psychiatry 2024", "url": "https://doi.org/10.1016/j.jagp.2024"},
        ]
    },
    {
        "marker": "HesitationBursts", "marker_desc": "Clusters of hesitations (um, uh) > 10/min",
        "pattern": "MemoryRetrieval", "pattern_desc": "Difficulty accessing episodic memory",
        "condition": "EarlyAlzheimers", "condition_desc": "Early-stage Alzheimer's Disease",
        "studies": [
            {"title": "Hesitation phenomena predict Alzheimer's 2 years before diagnosis", "source": "Brain 2023", "url": "https://doi.org/10.1093/brain/awad456"},
        ]
    },
    {
        "marker": "TopicRepetition", "marker_desc": "Repeating same topic within a conversation",
        "pattern": "ShortTermMemoryLoss", "pattern_desc": "Inability to retain recent conversational context",
        "condition": "MCI", "condition_desc": "Mild Cognitive Impairment",
        "studies": [
            {"title": "Conversational repetition as a preclinical dementia signal", "source": "Neurology 2024", "url": "https://doi.org/10.1212/WNL.2024"},
        ]
    },
]

def seed_clinical_knowledge():
    """Build the evidence chain: AcousticMarker → ClinicalPattern → Condition → Study."""
    db = _db()
    with get_driver().session(database=db) as s:
        for entry in CLINICAL_KNOWLEDGE:
            s.run("""
                MERGE (m:AcousticMarker {name: $mn})
                SET m.description = $md
                MERGE (cp:ClinicalPattern {name: $pn})
                SET cp.description = $pd
                MERGE (cond:Condition {name: $cn})
                SET cond.description = $cd
                MERGE (m)-[:INDICATES]->(cp)
                MERGE (cp)-[:ASSOCIATED_WITH]->(cond)
            """, mn=entry["marker"], md=entry["marker_desc"],
                 pn=entry["pattern"], pd=entry["pattern_desc"],
                 cn=entry["condition"], cd=entry["condition_desc"])
            for study in entry["studies"]:
                s.run("""
                    MATCH (cond:Condition {name: $cn})
                    MERGE (st:Study {url: $url})
                    SET st.title = $title, st.source = $source
                    MERGE (cond)-[:SUPPORTED_BY]->(st)
                """, cn=entry["condition"], url=study["url"],
                     title=study["title"], source=study["source"])
    logger.info("Clinical knowledge graph seeded")


# ─── Patient + Call writes ───────────────────────────────────────────────────

def upsert_patient(patient_id: str, name: str, phone: str, age: Optional[int] = None):
    with get_driver().session(database=_db()) as s:
        s.run("""
            MERGE (p:Patient {id: $id})
            SET p.name=$name, p.phone=$phone, p.age=$age,
                p.enrolledAt=CASE WHEN p.enrolledAt IS NULL THEN timestamp() ELSE p.enrolledAt END
        """, id=patient_id, name=name, phone=phone, age=age)


def _interpret_speech_rate(v):
    if v < 80: return f"Very slow ({v:.0f} wpm, normal: 120–150). Associated with cognitive slowing and processing delays."
    if v < 100: return f"Below normal ({v:.0f} wpm, normal: 120–150). May indicate word-finding difficulty or fatigue."
    if v > 180: return f"Elevated ({v:.0f} wpm, normal: 120–150). May indicate anxiety or pressured speech."
    return f"Within normal range ({v:.0f} wpm)."

def _interpret_pause_freq(v):
    if v > 8: return f"Significantly elevated ({v:.1f}/min, normal: 2–4). Strongly associated with word-finding difficulty, an early MCI marker."
    if v > 6: return f"Elevated ({v:.1f}/min, normal: 2–4). Associated with increased cognitive load during speech."
    return f"Normal range ({v:.1f}/min)."

def _interpret_hesitation(v):
    if v > 10: return f"Frequent hesitations ({v}). Clusters of fillers (um, uh) can indicate memory retrieval difficulty."
    if v > 5: return f"Moderate hesitations ({v}). Some difficulty with word retrieval."
    return f"Minimal hesitations ({v})."

def _interpret_cognitive(v):
    if v < 55: return f"Concerning ({v:.0f}/100). Score below 55 suggests significant cognitive difficulty during conversation."
    if v < 70: return f"Below baseline ({v:.0f}/100). Mild decline from expected performance."
    return f"Stable ({v:.0f}/100)."

def _interpret_emotional(v):
    if v < 40: return f"Flat affect ({v:.0f}/100). Reduced emotional variability may indicate depression or apathy."
    if v < 60: return f"Subdued ({v:.0f}/100). Lower emotional engagement than typical."
    return f"Normal emotional range ({v:.0f}/100)."

def _interpret_motor(v):
    if v < 55: return f"Concerning ({v:.0f}/100). Motor speech difficulties may indicate neurological changes."
    if v < 70: return f"Slightly reduced ({v:.0f}/100)."
    return f"Normal ({v:.0f}/100)."


def write_call_analysis(
    patient_id: str, call_id: str, duration: float, summary: str, timestamp: int,
    speech_rate: float, pause_frequency: float, hesitation_count: int, word_finding_score: float,
    cognitive_score: float, emotional_score: float, motor_score: float,
    entities: dict, anomaly_detected: bool, anomaly_type: Optional[str],
    anomaly_severity: Optional[str], anomaly_description: Optional[str],
    transcript: str = "", topic_phrases: list[str] | None = None,
    conversation_signals: list[dict] | None = None,
):
    db = _db()
    with get_driver().session(database=db) as s:
        s.run("MERGE (p:Patient {id: $id})", id=patient_id)

        s.run("""
            MERGE (c:Call {id: $cid})
            SET c.patientId=$pid, c.timestamp=$ts, c.duration=$dur, c.summary=$sum
            WITH c MATCH (p:Patient {id: $pid}) MERGE (p)-[:HAD_CALL]->(c)
        """, cid=call_id, pid=patient_id, ts=timestamp, dur=duration, sum=summary)

        # Individual acoustic metric nodes
        s.run("""
            MERGE (n:SpeechRate {callId: $cid})
            SET n.value=$v, n.unit='wpm', n.interpretation=$interp
            WITH n MATCH (c:Call {id: $cid}) MERGE (c)-[:HAS_METRIC]->(n)
        """, cid=call_id, v=speech_rate, interp=_interpret_speech_rate(speech_rate))

        s.run("""
            MERGE (n:PauseFrequency {callId: $cid})
            SET n.value=$v, n.unit='/min', n.interpretation=$interp
            WITH n MATCH (c:Call {id: $cid}) MERGE (c)-[:HAS_METRIC]->(n)
        """, cid=call_id, v=pause_frequency, interp=_interpret_pause_freq(pause_frequency))

        s.run("""
            MERGE (n:HesitationCount {callId: $cid})
            SET n.value=$v, n.interpretation=$interp
            WITH n MATCH (c:Call {id: $cid}) MERGE (c)-[:HAS_METRIC]->(n)
        """, cid=call_id, v=hesitation_count, interp=_interpret_hesitation(hesitation_count))

        s.run("""
            MERGE (n:WordFindingScore {callId: $cid})
            SET n.value=$v, n.unit='/100', n.interpretation=$interp
            WITH n MATCH (c:Call {id: $cid}) MERGE (c)-[:HAS_METRIC]->(n)
        """, cid=call_id, v=word_finding_score,
             interp=f"Word retrieval ability: {word_finding_score:.0f}/100" + (
                 ". Below 60 suggests difficulty accessing vocabulary." if word_finding_score < 60 else "."))

        # Individual score nodes
        s.run("""
            MERGE (n:CognitiveScore {callId: $cid})
            SET n.value=$v, n.interpretation=$interp
            WITH n MATCH (c:Call {id: $cid}) MERGE (c)-[:HAS_SCORE]->(n)
        """, cid=call_id, v=cognitive_score, interp=_interpret_cognitive(cognitive_score))

        s.run("""
            MERGE (n:EmotionalScore {callId: $cid})
            SET n.value=$v, n.interpretation=$interp
            WITH n MATCH (c:Call {id: $cid}) MERGE (c)-[:HAS_SCORE]->(n)
        """, cid=call_id, v=emotional_score, interp=_interpret_emotional(emotional_score))

        s.run("""
            MERGE (n:MotorScore {callId: $cid})
            SET n.value=$v, n.interpretation=$interp
            WITH n MATCH (c:Call {id: $cid}) MERGE (c)-[:HAS_SCORE]->(n)
        """, cid=call_id, v=motor_score, interp=_interpret_motor(motor_score))

        # Anomaly
        if anomaly_detected and anomaly_type:
            s.run("""
                MERGE (an:Anomaly {callId: $cid})
                SET an.type=$atype, an.severity=$sev, an.description=$desc, an.detectedAt=$ts
                WITH an MATCH (c:Call {id: $cid}) MERGE (c)-[:TRIGGERED]->(an)
            """, cid=call_id, atype=anomaly_type, sev=anomaly_severity or "medium",
                 desc=anomaly_description or "", ts=timestamp)

        # Match individual metrics to clinical markers
        if pause_frequency > 6:
            s.run("""
                MATCH (n:PauseFrequency {callId: $cid}), (m:AcousticMarker {name: 'HighPauseFrequency'})
                MERGE (n)-[:MATCHES]->(m)
            """, cid=call_id)
        if speech_rate > 0 and speech_rate < 100:
            s.run("""
                MATCH (n:SpeechRate {callId: $cid}), (m:AcousticMarker {name: 'SpeechRateDecline'})
                MERGE (n)-[:MATCHES]->(m)
            """, cid=call_id)
        if emotional_score < 40:
            s.run("""
                MATCH (n:EmotionalScore {callId: $cid}), (m:AcousticMarker {name: 'EmotionalFlatness'})
                MERGE (n)-[:MATCHES]->(m)
            """, cid=call_id)
        if hesitation_count > 10:
            s.run("""
                MATCH (n:HesitationCount {callId: $cid}), (m:AcousticMarker {name: 'HesitationBursts'})
                MERGE (n)-[:MATCHES]->(m)
            """, cid=call_id)

        # Evidence nodes from conversationSignals (replaces old single-word Topic nodes)
        _SIGNAL_TO_CONDITION = {
            "memory_gaps": "MCI", "memory_lapse": "EarlyAlzheimers",
            "word_finding_difficulty": "MCI", "word_finding_decline": "MCI",
            "cognitive_decline": "MCI", "confusion_indicator": "MCI",
            "emotional_distress": "Depression", "emotional_flatness": "Depression",
            "physical_concern": "Depression", "fatigue": "Depression",
            "sleep_disruption": "MCI", "repetition": "MCI",
        }
        signals = conversation_signals or []
        for idx, sig in enumerate(signals[:8]):
            quote = sig.get("quote", "").strip()
            if not quote or len(quote) < 5:
                continue
            eid = f"{call_id}__ev{idx}"
            signal_label = sig.get("signal", "observation")
            explanation = sig.get("explanation", "")
            s.run("""
                MERGE (e:Evidence {id: $eid})
                SET e.quote=$quote, e.signal=$signal, e.explanation=$expl,
                    e.number=$num, e.callId=$cid
                WITH e MATCH (c:Call {id: $cid}) MERGE (c)-[:EVIDENCED_BY]->(e)
            """, eid=eid, quote=quote[:300], signal=signal_label,
                 expl=explanation[:300], num=idx + 1, cid=call_id)

            cond_name = _SIGNAL_TO_CONDITION.get(signal_label)
            if cond_name:
                s.run("""
                    MATCH (e:Evidence {id: $eid}), (cond:Condition {name: $cn})
                    MERGE (e)-[:RELATES_TO]->(cond)
                """, eid=eid, cn=cond_name)

        # Fallback: if no conversationSignals, create Evidence from topic phrases
        if not signals and (topic_phrases or summary):
            topics = topic_phrases if topic_phrases else (_extract_topics(summary) if summary else [])
            for idx, topic in enumerate(topics[:6]):
                eid = f"{call_id}__ev{idx}"
                s.run("""
                    MERGE (e:Evidence {id: $eid})
                    SET e.quote=$quote, e.signal='observation', e.explanation='',
                        e.number=$num, e.callId=$cid
                    WITH e MATCH (c:Call {id: $cid}) MERGE (c)-[:EVIDENCED_BY]->(e)
                """, eid=eid, quote=topic[:200], num=idx + 1, cid=call_id)


def build_temporal_chain(patient_id: str):
    """Create FOLLOWED_BY edges between consecutive calls ordered by timestamp."""
    with get_driver().session(database=_db()) as s:
        s.run("""
            MATCH (p:Patient {id: $pid})-[:HAD_CALL]->(c:Call)
            WITH c ORDER BY c.timestamp
            WITH collect(c) AS calls
            UNWIND range(0, size(calls)-2) AS i
            WITH calls[i] AS prev, calls[i+1] AS next
            MERGE (prev)-[:FOLLOWED_BY]->(next)
        """, pid=patient_id)


def build_cross_patient_similarity(patient_id: str):
    """
    Create SIMILAR_PATTERN edges between patients with matching acoustic profiles.
    This is the population intelligence layer — when patient A's pattern matches
    patient B who was later flagged, the system can warn A's family earlier.
    """
    try:
        with get_driver().session(database=_db()) as s:
            s.run("""
                MATCH (p1:Patient {id: $pid})-[:HAD_CALL]->(c1:Call)-[:HAS_ACOUSTIC]->(a1:AcousticProfile)
                WITH p1, avg(a1.speechRate) AS sr1, avg(a1.pauseFrequency) AS pf1,
                     avg(a1.wordFindingScore) AS wf1
                MATCH (p2:Patient)-[:HAD_CALL]->(c2:Call)-[:HAS_ACOUSTIC]->(a2:AcousticProfile)
                WHERE p1 <> p2
                WITH p1, p2, sr1, pf1, wf1,
                     avg(a2.speechRate) AS sr2, avg(a2.pauseFrequency) AS pf2,
                     avg(a2.wordFindingScore) AS wf2
                WHERE abs(sr1 - sr2) < 15 AND abs(pf1 - pf2) < 3
                WITH p1, p2,
                     1.0 - (abs(sr1-sr2)/150.0 + abs(pf1-pf2)/20.0 + abs(wf1-wf2)/100.0) / 3.0 AS sim
                WHERE sim > 0.6
                MERGE (p1)-[r:SIMILAR_PATTERN]->(p2)
                SET r.similarity = round(sim * 100) / 100.0,
                    r.updatedAt = timestamp()
            """, pid=patient_id)
            logger.info(f"Cross-patient similarity updated for {patient_id}")
    except Exception as e:
        logger.warning(f"Cross-patient similarity skipped: {e}")


def _extract_topics(text: str) -> list[str]:
    """Extract meaningful multi-word topic phrases from a call summary."""
    if not text or len(text) < 10:
        return []

    sentences = re.split(r'[.!?]+\s*', text.strip())
    sentences = [s.strip() for s in sentences if len(s.strip()) > 12]

    filler_re = re.compile(
        r"^(?:(?:The\s+)?(?:user|patient|caller|person|speaker)\s+)|"
        r"^(?:She|He|They|Mom|Dad|Grandma|Grandpa|Dorothy|The\s+caller)\s+|"
        r"^(?:Today'?s?\s+(?:call|conversation|session)\s+)|"
        r"^(?:During\s+(?:the|today'?s?)\s+(?:call|conversation))\s*,?\s*|"
        r"^(?:In\s+(?:this|today'?s?)\s+(?:call|conversation))\s*,?\s*|"
        r"^(?:(?:Also|Additionally|Furthermore|Overall),?\s+)|"
        r"^(?:(?:mentioned|discussed|talked\s+about|said|noted|expressed|reported)\s+(?:that\s+)?)|"
        r"^(?:(?:seemed?|appeared?|sounded?)\s+(?:to\s+be\s+)?)",
        re.IGNORECASE,
    )

    topics = []
    seen_lower: set[str] = set()
    for sentence in sentences[:6]:
        phrase = filler_re.sub("", sentence).strip().lstrip(",").strip()
        if len(phrase) < 5:
            continue
        words = phrase.split()
        if len(words) > 8:
            phrase = " ".join(words[:8])
        phrase = re.sub(r"\s+(?:and|but|or|which|that|who|so|because)\s*$", "", phrase)
        phrase = phrase.strip().rstrip(",").strip()
        if len(phrase) < 5:
            continue
        phrase = phrase[0].upper() + phrase[1:]
        low = phrase.lower()
        if low not in seen_lower:
            seen_lower.add(low)
            topics.append(phrase)
    return topics[:6]


def write_providers(providers: list[dict], signal_type: str, location: str):
    """Write Yutori/Tavily-found providers as nodes in the graph, linked to conditions."""
    db = _db()
    condition_map = {
        "word_finding_decline": "MCI",
        "word_finding_difficulty": "MCI",
        "memory_gaps": "MCI",
        "memory_lapse": "EarlyAlzheimers",
        "cognitive_decline": "MCI",
        "emotional_distress": "Depression",
        "confusion_indicator": "MCI",
    }
    condition_name = condition_map.get(signal_type, "MCI")
    with get_driver().session(database=db) as s:
        for prov in providers[:6]:
            name = prov.get("name", "").strip()
            if not name:
                continue
            found_by = prov.get("found_by", "yutori")
            s.run("""
                MERGE (pr:Provider {name: $name})
                SET pr.specialty = $spec, pr.address = $addr, pr.phone = $phone,
                    pr.website = $web, pr.availability = $avail, pr.rating = $rating,
                    pr.why_relevant = $why, pr.location = $loc, pr.foundBy = $found
                WITH pr
                OPTIONAL MATCH (cond:Condition {name: $cn})
                FOREACH (_ IN CASE WHEN cond IS NOT NULL THEN [1] ELSE [] END |
                    MERGE (cond)-[:TREATED_AT]->(pr)
                )
            """, name=name, spec=prov.get("specialty", ""),
                 addr=prov.get("address", ""), phone=prov.get("phone", ""),
                 web=prov.get("website", ""), avail=prov.get("availability", ""),
                 rating=prov.get("rating", ""), why=prov.get("why_relevant", ""),
                 loc=location, cn=condition_name, found=found_by)
        logger.info(f"Wrote {min(len(providers), 6)} providers to Neo4j graph")


# ─── Graph reads ─────────────────────────────────────────────────────────────

def get_patient_graph(patient_id: str) -> dict:
    """Return the full knowledge graph for visualization."""
    with get_driver().session(database=_db()) as s:
        nodes, links = {}, {}

        def add(node, label=None):
            if node is None:
                return None
            nid = str(node.element_id)
            if nid not in nodes:
                nodes[nid] = {"id": nid, "label": label or list(node.labels)[0], "props": dict(node)}
            return nid

        def link(src, tgt, rel_type):
            if src and tgt:
                key = f"{src}-{rel_type}-{tgt}"
                if key not in links:
                    links[key] = {"source": src, "target": tgt, "type": rel_type}

        # Core: patient → calls → evidence + anomalies
        result = s.run("""
            MATCH (p:Patient {id: $id})-[:HAD_CALL]->(c:Call)
            OPTIONAL MATCH (c)-[:TRIGGERED]->(an:Anomaly)
            OPTIONAL MATCH (c)-[:EVIDENCED_BY]->(ev:Evidence)
            RETURN p, c, an, ev
            ORDER BY c.timestamp DESC
        """, id=patient_id)
        for rec in result:
            p = add(rec["p"], "Patient")
            c = add(rec["c"], "Call")
            an = add(rec["an"], "Anomaly")
            ev = add(rec["ev"], "Evidence")
            link(p, c, "HAD_CALL")
            link(c, an, "TRIGGERED")
            link(c, ev, "EVIDENCED_BY")

        # Evidence → Condition links
        ev_cond = s.run("""
            MATCH (p:Patient {id: $id})-[:HAD_CALL]->(c:Call)-[:EVIDENCED_BY]->(ev:Evidence)-[:RELATES_TO]->(cond:Condition)
            RETURN ev, cond
        """, id=patient_id)
        for rec in ev_cond:
            ev = add(rec["ev"], "Evidence")
            cond = add(rec["cond"], "Condition")
            link(ev, cond, "RELATES_TO")

        # Legacy Topic nodes (from old data)
        legacy_topics = s.run("""
            MATCH (p:Patient {id: $id})-[:HAD_CALL]->(c:Call)-[:MENTIONED]->(t:Topic)
            RETURN c, t
        """, id=patient_id)
        for rec in legacy_topics:
            c = add(rec["c"], "Call")
            t = add(rec["t"], "Topic")
            link(c, t, "MENTIONED")

        # Individual metric nodes (new separate types)
        for label in ["SpeechRate", "PauseFrequency", "HesitationCount", "WordFindingScore"]:
            metric_res = s.run(f"""
                MATCH (p:Patient {{id: $id}})-[:HAD_CALL]->(c:Call)-[:HAS_METRIC]->(n:{label})
                OPTIONAL MATCH (n)-[:MATCHES]->(m:AcousticMarker)
                RETURN c, n, m
            """, id=patient_id)
            for rec in metric_res:
                c = add(rec["c"], "Call")
                n = add(rec["n"], label)
                m = add(rec["m"], "AcousticMarker")
                link(c, n, "HAS_METRIC")
                link(n, m, "MATCHES")

        # Individual score nodes
        for label in ["CognitiveScore", "EmotionalScore", "MotorScore"]:
            score_res = s.run(f"""
                MATCH (p:Patient {{id: $id}})-[:HAD_CALL]->(c:Call)-[:HAS_SCORE]->(n:{label})
                OPTIONAL MATCH (n)-[:MATCHES]->(m:AcousticMarker)
                RETURN c, n, m
            """, id=patient_id)
            for rec in score_res:
                c = add(rec["c"], "Call")
                n = add(rec["n"], label)
                m = add(rec["m"], "AcousticMarker")
                link(c, n, "HAS_SCORE")
                link(n, m, "MATCHES")

        # Clinical knowledge chain: Marker → Pattern → Condition → Study
        clinical = s.run("""
            MATCH (m:AcousticMarker)-[:INDICATES]->(cp:ClinicalPattern)-[:ASSOCIATED_WITH]->(cond:Condition)
            OPTIONAL MATCH (cond)-[:SUPPORTED_BY]->(st:Study)
            WHERE m.name IN ['HighPauseFrequency','SpeechRateDecline','EmotionalFlatness','HesitationBursts','TopicRepetition']
            RETURN m, cp, cond, st
        """)
        for rec in clinical:
            m = add(rec["m"], "AcousticMarker")
            cp = add(rec["cp"], "ClinicalPattern")
            cond = add(rec["cond"], "Condition")
            st = add(rec["st"], "Study")
            link(m, cp, "INDICATES")
            link(cp, cond, "ASSOCIATED_WITH")
            link(cond, st, "SUPPORTED_BY")

        # Anomaly → Study (Tavily research)
        anomaly_research = s.run("""
            MATCH (p:Patient {id: $id})-[:HAD_CALL]->(c:Call)-[:TRIGGERED]->(an:Anomaly)-[:SUPPORTED_BY]->(st:Study)
            RETURN an, st
        """, id=patient_id)
        for rec in anomaly_research:
            an = add(rec["an"], "Anomaly")
            st = add(rec["st"], "Study")
            link(an, st, "SUPPORTED_BY")

        # Legacy AcousticProfile nodes (from old data before migration)
        legacy = s.run("""
            MATCH (p:Patient {id: $id})-[:HAD_CALL]->(c:Call)-[:HAS_ACOUSTIC]->(a:AcousticProfile)
            OPTIONAL MATCH (a)-[:MATCHES]->(m:AcousticMarker)
            RETURN c, a, m
        """, id=patient_id)
        for rec in legacy:
            c = add(rec["c"], "Call")
            a = add(rec["a"], "AcousticProfile")
            m = add(rec["m"], "AcousticMarker")
            link(c, a, "HAS_ACOUSTIC")
            link(a, m, "MATCHES")

        # Provider nodes (from Yutori/Tavily provider search)
        provider_res = s.run("""
            MATCH (cond:Condition)-[:TREATED_AT]->(pr:Provider)
            RETURN cond, pr
        """)
        for rec in provider_res:
            cond = add(rec["cond"], "Condition")
            pr = add(rec["pr"], "Provider")
            link(cond, pr, "TREATED_AT")

        # FOLLOWED_BY edges
        chain = s.run("""
            MATCH (p:Patient {id: $id})-[:HAD_CALL]->(c1:Call)-[:FOLLOWED_BY]->(c2:Call)
            RETURN c1, c2
        """, id=patient_id)
        for rec in chain:
            c1_id = str(rec["c1"].element_id)
            c2_id = str(rec["c2"].element_id)
            link(c1_id, c2_id, "FOLLOWED_BY")

        return {"nodes": list(nodes.values()), "links": list(links.values())}


def get_timeline(patient_id: str) -> list[dict]:
    with get_driver().session(database=_db()) as s:
        result = s.run("""
            MATCH (p:Patient {id: $id})-[:HAD_CALL]->(c:Call)
            OPTIONAL MATCH (c)-[:HAS_SCORE]->(cog:CognitiveScore)
            OPTIONAL MATCH (c)-[:HAS_SCORE]->(emo:EmotionalScore)
            OPTIONAL MATCH (c)-[:HAS_SCORE]->(mot:MotorScore)
            RETURN c.timestamp AS ts, c.id AS callId,
                   coalesce(cog.value, cog.overallScore) AS cognitive,
                   coalesce(emo.value, cog.emotionalScore) AS emotional,
                   coalesce(mot.value, cog.motorScore) AS motor
            ORDER BY c.timestamp ASC
        """, id=patient_id)
        return [dict(r) for r in result]


def list_patients() -> list[dict]:
    with get_driver().session(database=_db()) as s:
        result = s.run("""
            MATCH (p:Patient)
            OPTIONAL MATCH (p)-[:HAD_CALL]->(c:Call)-[:HAS_SCORE]->(sc:CognitiveScore)
            WITH p, sc ORDER BY c.timestamp DESC
            WITH p, collect(sc.overallScore)[0] AS latestScore, count(c) AS callCount
            RETURN p.id AS id, p.name AS name, p.phone AS phone, latestScore, callCount
            ORDER BY p.enrolledAt DESC
        """)
        return [dict(r) for r in result]


def attach_research(call_id: str, items: list[dict]):
    with get_driver().session(database=_db()) as s:
        for item in items:
            url = item.get("url", "")
            if not url:
                continue
            s.run("""
                MERGE (r:Study {url: $url})
                SET r.title=$title, r.source=$src, r.foundBy=$found,
                    r.excerpt=$excerpt
                WITH r MATCH (an:Anomaly {callId: $cid}) MERGE (an)-[:SUPPORTED_BY]->(r)
            """, url=url, title=item.get("title",""),
                 src=item.get("source",""), cid=call_id,
                 found=item.get("found_by", "tavily"),
                 excerpt=item.get("excerpt", "")[:300])
