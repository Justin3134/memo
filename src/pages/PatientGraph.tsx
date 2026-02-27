import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { MemoLayout } from "@/components/memo/MemoLayout";
import { useMemoDashboardData } from "@/hooks/useMemoDashboardData";
import { useNavigate } from "react-router-dom";
import { RefreshCw, Eye, EyeOff } from "lucide-react";

const BACKEND = import.meta.env.VITE_BACKEND_URL ?? "http://localhost:8000";

interface GraphNode {
  id: string;
  label: string;
  props: Record<string, unknown>;
  x?: number;
  y?: number;
  vx?: number;
  vy?: number;
  fx?: number | null;
  fy?: number | null;
}

interface GraphLink {
  source: string | GraphNode;
  target: string | GraphNode;
  type: string;
}

interface GraphData { nodes: GraphNode[]; links: GraphLink[] }

const NODE_STYLES: Record<string, { fill: string; stroke: string; r: number }> = {
  Patient:          { fill: "#18181b", stroke: "#18181b", r: 24 },
  Call:             { fill: "#3b82f6", stroke: "#2563eb", r: 14 },
  Topic:            { fill: "#f97316", stroke: "#ea580c", r: 10 },
  SpeechRate:       { fill: "#7c3aed", stroke: "#6d28d9", r: 9 },
  PauseFrequency:   { fill: "#8b5cf6", stroke: "#7c3aed", r: 9 },
  HesitationCount:  { fill: "#a78bfa", stroke: "#8b5cf6", r: 9 },
  WordFindingScore: { fill: "#6d28d9", stroke: "#5b21b6", r: 9 },
  CognitiveScore:   { fill: "#10b981", stroke: "#059669", r: 9 },
  EmotionalScore:   { fill: "#14b8a6", stroke: "#0d9488", r: 9 },
  MotorScore:       { fill: "#06b6d4", stroke: "#0891b2", r: 9 },
  Anomaly:          { fill: "#ef4444", stroke: "#dc2626", r: 11 },
  AcousticProfile:  { fill: "#8b5cf6", stroke: "#7c3aed", r: 8 },
  AcousticMarker:   { fill: "#ec4899", stroke: "#db2777", r: 10 },
  ClinicalPattern:  { fill: "#f59e0b", stroke: "#d97706", r: 10 },
  Condition:        { fill: "#dc2626", stroke: "#b91c1c", r: 12 },
  Study:            { fill: "#0ea5e9", stroke: "#0284c7", r: 9 },
  Provider:         { fill: "#f97316", stroke: "#ea580c", r: 11 },
};

const LINK_COLORS: Record<string, string> = {
  HAD_CALL:        "#94a3b8",
  FOLLOWED_BY:     "#3b82f6",
  HAS_METRIC:      "#c4b5fd",
  HAS_ACOUSTIC:    "#c4b5fd",
  HAS_SCORE:       "#6ee7b7",
  TRIGGERED:       "#fca5a5",
  MENTIONED:       "#fdba74",
  MATCHES:         "#f9a8d4",
  INDICATES:       "#fbbf24",
  ASSOCIATED_WITH: "#f87171",
  SUPPORTED_BY:    "#7dd3fc",
  TREATED_AT:      "#fb923c",
};

const ns = (label: string) => NODE_STYLES[label] ?? { fill: "#94a3b8", stroke: "#64748b", r: 8 };

type LayerKey = "core" | "voice" | "scores" | "clinical" | "evidence" | "care";
const LAYERS: Record<LayerKey, { label: string; types: string[]; description: string }> = {
  core:     { label: "Conversations", types: ["Patient", "Call", "Topic", "Anomaly"], description: "Calls, topics & anomalies" },
  voice:    { label: "Voice Metrics", types: ["SpeechRate", "PauseFrequency", "HesitationCount", "WordFindingScore", "AcousticProfile"], description: "Modulate acoustic analysis" },
  scores:   { label: "Health Scores", types: ["CognitiveScore", "EmotionalScore", "MotorScore"], description: "Cognitive, emotional & motor" },
  clinical: { label: "Clinical", types: ["AcousticMarker", "ClinicalPattern", "Condition"], description: "Patterns & conditions" },
  evidence: { label: "Research", types: ["Study"], description: "Tavily clinical studies" },
  care:     { label: "Providers", types: ["Provider"], description: "Yutori-found clinics" },
};

const IDEAL_LEN: Record<string, number> = {
  HAD_CALL: 160, FOLLOWED_BY: 120, HAS_METRIC: 100, HAS_ACOUSTIC: 100, HAS_SCORE: 100,
  TRIGGERED: 110, MENTIONED: 140, MATCHES: 120, INDICATES: 100,
  ASSOCIATED_WITH: 100, SUPPORTED_BY: 100, TREATED_AT: 120,
};

function useForceGraph(
  data: GraphData | null, W: number, H: number, visibleTypes: Set<string>
) {
  const nodesRef = useRef<GraphNode[]>([]);
  const linksRef = useRef<{ source: GraphNode; target: GraphNode; type: string }[]>([]);
  const [positions, setPositions] = useState<GraphNode[]>([]);
  const animRef = useRef<number>(0);
  const dragRef = useRef<string | null>(null);
  const alphaRef = useRef(1);
  const initializedRef = useRef(false);

  useEffect(() => {
    if (!data || data.nodes.length === 0) {
      nodesRef.current = [];
      linksRef.current = [];
      setPositions([]);
      initializedRef.current = false;
      return;
    }
    const cx = W / 2, cy = H / 2;

    const nodes: GraphNode[] = data.nodes.map((n, i) => {
      const angle = (i / data.nodes.length) * Math.PI * 2;
      const layerR = n.label === "Patient" ? 0 :
        ["Call", "Topic", "Anomaly"].includes(n.label) ? 200 :
        ["SpeechRate", "PauseFrequency", "HesitationCount", "WordFindingScore", "AcousticProfile"].includes(n.label) ? 350 :
        ["CognitiveScore", "EmotionalScore", "MotorScore"].includes(n.label) ? 350 :
        ["AcousticMarker", "ClinicalPattern"].includes(n.label) ? 480 :
        n.label === "Provider" ? 600 : 580;
      return {
        ...n,
        x: cx + Math.cos(angle) * layerR + (Math.random() - 0.5) * 50,
        y: cy + Math.sin(angle) * layerR + (Math.random() - 0.5) * 50,
        vx: 0, vy: 0, fx: null, fy: null,
      };
    });

    const nodeMap = new Map(nodes.map(n => [n.id, n]));
    const links = data.links.map(l => ({
      source: nodeMap.get(typeof l.source === "string" ? l.source : l.source.id)!,
      target: nodeMap.get(typeof l.target === "string" ? l.target : l.target.id)!,
      type: l.type,
    })).filter(l => l.source && l.target);

    nodesRef.current = nodes;
    linksRef.current = links;
    alphaRef.current = 1;
    initializedRef.current = true;
  }, [data, W, H]);

  useEffect(() => {
    if (!initializedRef.current) return;
    const cx = W / 2, cy = H / 2;

    const tick = () => {
      const nodes = nodesRef.current;
      const links = linksRef.current;
      if (nodes.length === 0) { animRef.current = requestAnimationFrame(tick); return; }

      const alpha = alphaRef.current;
      const visNodes = nodes.filter(n => visibleTypes.has(n.label));
      const visLinks = links.filter(l => visibleTypes.has(l.source.label) && visibleTypes.has(l.target.label));

      for (let i = 0; i < visNodes.length; i++) {
        for (let j = i + 1; j < visNodes.length; j++) {
          const a = visNodes[i], b = visNodes[j];
          const dx = b.x! - a.x!;
          const dy = b.y! - a.y!;
          const d = Math.sqrt(dx * dx + dy * dy) || 0.01;
          const repulse = (6000 * alpha) / (d * d);
          const fx = (dx / d) * repulse;
          const fy = (dy / d) * repulse;
          a.vx! -= fx; a.vy! -= fy;
          b.vx! += fx; b.vy! += fy;
        }
      }

      for (const l of visLinks) {
        const dx = l.target.x! - l.source.x!;
        const dy = l.target.y! - l.source.y!;
        const d = Math.sqrt(dx * dx + dy * dy) || 0.01;
        const target = IDEAL_LEN[l.type] ?? 120;
        const f = (d - target) * 0.04 * alpha;
        const fx = (dx / d) * f;
        const fy = (dy / d) * f;
        l.source.vx! += fx; l.source.vy! += fy;
        l.target.vx! -= fx; l.target.vy! -= fy;
      }

      for (const n of visNodes) {
        n.vx! += (cx - n.x!) * 0.003 * alpha;
        n.vy! += (cy - n.y!) * 0.003 * alpha;
        n.vx! *= 0.6;
        n.vy! *= 0.6;
        if (n.fx != null) { n.x = n.fx; n.vx = 0; }
        else { n.x! += n.vx!; }
        if (n.fy != null) { n.y = n.fy; n.vy = 0; }
        else { n.y! += n.vy!; }
        n.x = Math.max(40, Math.min(W - 40, n.x!));
        n.y = Math.max(40, Math.min(H - 40, n.y!));
      }

      alphaRef.current = Math.max(0.01, alpha * 0.995);
      setPositions([...nodes]);
      animRef.current = requestAnimationFrame(tick);
    };

    animRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animRef.current);
  }, [W, H, visibleTypes, data]);

  const reheat = useCallback(() => { alphaRef.current = 0.5; }, []);

  const startDrag = useCallback((id: string) => {
    dragRef.current = id;
    alphaRef.current = Math.max(alphaRef.current, 0.3);
  }, []);

  const moveDrag = useCallback((x: number, y: number) => {
    if (!dragRef.current) return;
    const n = nodesRef.current.find(n => n.id === dragRef.current);
    if (n) { n.fx = x; n.fy = y; }
  }, []);

  const endDrag = useCallback(() => {
    if (!dragRef.current) return;
    const n = nodesRef.current.find(n => n.id === dragRef.current);
    if (n) { n.fx = null; n.fy = null; }
    dragRef.current = null;
  }, []);

  return { positions, reheat, startDrag, moveDrag, endDrag, isDragging: () => !!dragRef.current };
}

export default function PatientGraph() {
  const navigate = useNavigate();
  const { loading: patientsLoading, patient, calls } = useMemoDashboardData();
  const [graphData, setGraphData] = useState<GraphData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<string | null>(null);
  const [selected, setSelected] = useState<GraphNode | null>(null);
  const [hovered, setHovered] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [dims, setDims] = useState({ w: 900, h: 600 });
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const dragging = useRef<{ dx: number; dy: number } | null>(null);

  const [activeLayers, setActiveLayers] = useState<Set<LayerKey>>(new Set(["core"]));
  const visibleTypes = new Set(
    (Object.entries(LAYERS) as [LayerKey, typeof LAYERS[LayerKey]][])
      .filter(([k]) => activeLayers.has(k))
      .flatMap(([, v]) => v.types)
  );

  const { positions: nodes, reheat, startDrag, moveDrag, endDrag, isDragging } =
    useForceGraph(graphData, dims.w, dims.h, visibleTypes);

  const nodeMap = new Map(nodes.map(n => [n.id, n]));

  const toggleLayer = (key: LayerKey) => {
    setActiveLayers(prev => {
      const next = new Set(prev);
      if (key === "core") return next;
      if (next.has(key)) next.delete(key); else next.add(key);
      reheat();
      return next;
    });
  };

  useEffect(() => {
    if (!patientsLoading && !patient) navigate("/", { replace: true });
  }, [patientsLoading, patient, navigate]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => {
      setDims({ w: e.contentRect.width, h: e.contentRect.height });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const fetchGraph = async () => {
    if (!patient?._id) return;
    setLoading(true); setError(null);
    try {
      const r = await fetch(`${BACKEND}/patients/${patient._id}/graph`);
      if (!r.ok) {
        let detail = `${r.status}`;
        try { const j = await r.json(); detail = j.detail ?? detail; } catch {}
        throw new Error(detail);
      }
      setGraphData(await r.json());
    } catch (e: any) {
      setError(e.message ?? "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  const syncHistory = async () => {
    if (!patient || !calls?.length) return;
    setSyncing(true); setSyncStatus(null);
    try {
      const payload = {
        patient_id: patient._id,
        patient_name: patient.name,
        patient_phone: patient.phoneNumber ?? "",
        calls: calls
          .filter((c: any) => c.status === "completed" || c.cognitiveScore != null)
          .map((c: any) => ({
            call_id: c.vapiCallId ?? c._id,
            timestamp: c.startedAt ?? Date.now(),
            duration: c.duration ?? 0,
            summary: c.summary ?? "",
            transcript: c.transcript ?? "",
            speech_rate: c.speechRate ?? 0,
            pause_frequency: c.pauseFrequency ?? 0,
            hesitation_count: 0,
            word_finding_score: c.cognitiveScore ?? 75,
            cognitive_score: c.cognitiveScore ?? 75,
            emotional_score: c.emotionalScore ?? 75,
            motor_score: c.motorScore ?? 75,
            anomaly_detected: c.anomalyDetected ?? false,
            anomaly_type: null,
            anomaly_severity: null,
            anomaly_description: null,
          })),
      };
      const r = await fetch(`${BACKEND}/sync/history`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.detail ?? "Sync failed");
      setSyncStatus(`Synced ${d.synced} call${d.synced !== 1 ? "s" : ""}`);
      await fetchGraph();
    } catch (e: any) {
      setSyncStatus(`Error: ${e.message}`);
    } finally {
      setSyncing(false);
    }
  };

  useEffect(() => { fetchGraph(); }, [patient?._id]);

  useEffect(() => {
    if (graphData && graphData.nodes.length === 0 && calls && calls.length > 0 && !syncing) {
      syncHistory();
    }
  }, [graphData, calls?.length]);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    setZoom(z => Math.max(0.2, Math.min(4, z - e.deltaY * 0.001)));
  }, []);

  const svgToWorld = (clientX: number, clientY: number) => {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    return {
      x: (clientX - rect.left - pan.x) / zoom,
      y: (clientY - rect.top - pan.y) / zoom,
    };
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.target === svgRef.current || (e.target as SVGElement).tagName === "line" || (e.target as SVGElement).tagName === "svg")
      dragging.current = { dx: e.clientX - pan.x, dy: e.clientY - pan.y };
  };
  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging()) {
      const { x, y } = svgToWorld(e.clientX, e.clientY);
      moveDrag(x, y);
    } else if (dragging.current) {
      setPan({ x: e.clientX - dragging.current.dx, y: e.clientY - dragging.current.dy });
    }
  };
  const handleMouseUp = () => {
    dragging.current = null;
    endDrag();
  };

  const connectedTo = new Set<string>();
  if (hovered || selected) {
    const focusId = hovered ?? selected?.id;
    graphData?.links.forEach(l => {
      const s = typeof l.source === "string" ? l.source : l.source.id;
      const t = typeof l.target === "string" ? l.target : l.target.id;
      if (s === focusId || t === focusId) { connectedTo.add(s); connectedTo.add(t); }
    });
  }
  const hasFocus = connectedTo.size > 0;

  const visibleNodes = nodes.filter(n => visibleTypes.has(n.label));
  const resolvedLinks = (graphData?.links ?? []).map(l => {
    const sid = typeof l.source === "string" ? l.source : l.source.id;
    const tid = typeof l.target === "string" ? l.target : l.target.id;
    const sn = nodeMap.get(sid);
    const tn = nodeMap.get(tid);
    if (!sn || !tn || !visibleTypes.has(sn.label) || !visibleTypes.has(tn.label)) return null;
    return { sx: sn.x, sy: sn.y, tx: tn.x, ty: tn.y, type: l.type, sid, tid };
  }).filter(Boolean) as { sx: number; sy: number; tx: number; ty: number; type: string; sid: string; tid: string }[];

  const nodeCounts: Record<string, number> = {};
  (graphData?.nodes ?? []).forEach(n => { nodeCounts[n.label] = (nodeCounts[n.label] ?? 0) + 1; });

  const callTimestamps = useMemo(() => {
    if (!graphData) return new Map<string, number>();
    const calls = graphData.nodes
      .filter(n => n.label === "Call" && n.props.timestamp)
      .sort((a, b) => Number(a.props.timestamp) - Number(b.props.timestamp));
    const map = new Map<string, number>();
    calls.forEach((c, i) => map.set(c.id, i + 1));
    return map;
  }, [graphData]);

  const nodeLabel = (n: GraphNode) => {
    switch (n.label) {
      case "Patient": return String(n.props.name ?? "P").slice(0, 3);
      case "Call": {
        const ts = Number(n.props.timestamp ?? 0);
        return ts > 0 ? new Date(ts).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "Call";
      }
      case "Topic": return String(n.props.name ?? "").slice(0, 28);
      case "SpeechRate": return `${Number(n.props.value ?? 0).toFixed(0)} wpm`;
      case "PauseFrequency": return `${Number(n.props.value ?? 0).toFixed(1)}/min`;
      case "HesitationCount": return `${n.props.value ?? 0} hesitations`;
      case "WordFindingScore": return `WF: ${n.props.value ?? "?"}/100`;
      case "CognitiveScore": return `Cog: ${Number(n.props.value ?? n.props.overallScore ?? 0).toFixed(0)}`;
      case "EmotionalScore": return `Emo: ${Number(n.props.value ?? 0).toFixed(0)}`;
      case "MotorScore": return `Motor: ${Number(n.props.value ?? 0).toFixed(0)}`;
      case "AcousticMarker": return String(n.props.name ?? "").replace(/([A-Z])/g, " $1").trim().slice(0, 18);
      case "ClinicalPattern": return String(n.props.name ?? "").replace(/([A-Z])/g, " $1").trim().slice(0, 18);
      case "Condition": return String(n.props.name ?? "").slice(0, 10);
      case "Study": return `${String(n.props.source ?? "Study").slice(0, 16)}`;
      case "Anomaly": return String(n.props.type ?? "anomaly").replace(/_/g, " ").slice(0, 14);
      case "AcousticProfile": return `${n.props.speechRate ?? "?"}wpm`;
      case "Provider": return String(n.props.name ?? "Clinic").slice(0, 20);
      default: return n.label;
    }
  };

  return (
    <MemoLayout>
      <div className="flex flex-col h-full overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-3 border-b border-border bg-white shrink-0">
          <div>
            <h1 className="text-[15px] font-semibold text-foreground tracking-tight">Memory Graph</h1>
            <p className="text-[11px] text-muted-foreground">
              Powered by <span className="font-medium text-foreground">Neo4j</span> — {visibleNodes.length} nodes · {resolvedLinks.length} edges
            </p>
          </div>
          <div className="flex items-center gap-3">
            {syncStatus && (
              <span className={`text-[11px] ${syncStatus.startsWith("Error") ? "text-red-500" : "text-emerald-600"}`}>
                {syncStatus}
              </span>
            )}
            {calls && calls.length > 0 && (
              <button
                onClick={syncHistory}
                disabled={syncing}
                className="flex items-center gap-1.5 text-[11px] font-medium text-foreground/70 hover:text-foreground border border-border px-2.5 py-1 rounded-md transition-colors disabled:opacity-50"
              >
                <RefreshCw size={11} className={syncing ? "animate-spin" : ""} />
                {syncing ? "Building graph…" : "Sync calls"}
              </button>
            )}
          </div>
        </div>

        {/* Layer filter toggles */}
        <div className="flex items-center gap-1.5 px-6 py-2.5 border-b border-border bg-white shrink-0">
          <span className="text-[10px] text-muted-foreground mr-1.5 uppercase tracking-wide">Layers</span>
          {(Object.entries(LAYERS) as [LayerKey, typeof LAYERS[LayerKey]][]).map(([key, layer]) => {
            const active = activeLayers.has(key);
            const count = layer.types.reduce((sum, t) => sum + (nodeCounts[t] ?? 0), 0);
            if (count === 0 && key !== "core") return null;
            return (
              <button
                key={key}
                onClick={() => toggleLayer(key)}
                title={layer.description}
                className={`flex items-center gap-1.5 px-2.5 py-1 text-[11px] rounded-md transition-all border ${
                  active
                    ? "bg-foreground text-background border-foreground font-medium"
                    : "bg-white text-muted-foreground border-border hover:border-foreground/30 hover:text-foreground"
                } ${key === "core" ? "cursor-default" : "cursor-pointer"}`}
              >
                {active ? <Eye className="w-3 h-3" strokeWidth={2} /> : <EyeOff className="w-3 h-3" strokeWidth={2} />}
                {layer.label}
                {count > 0 && <span className={`text-[9px] ${active ? "text-background/60" : "text-muted-foreground/60"}`}>{count}</span>}
              </button>
            );
          })}
        </div>

        {/* Main area */}
        <div className="flex flex-1 min-h-0">
          {/* Graph canvas */}
          <div ref={containerRef} className="flex-1 relative bg-[#fafafa]">
            {!patient && (
              <div className="absolute inset-0 flex items-center justify-center">
                <p className="text-[13px] text-muted-foreground">Redirecting…</p>
              </div>
            )}

            {loading && (
              <div className="absolute inset-0 flex items-center justify-center bg-white/60 z-10">
                <div className="flex items-center gap-2">
                  <RefreshCw size={14} className="animate-spin text-muted-foreground" />
                  <p className="text-[13px] text-muted-foreground">Loading graph…</p>
                </div>
              </div>
            )}

            {error && !loading && (
              <div className="absolute inset-0 flex items-center justify-center p-8 z-10">
                <div className="text-center max-w-sm">
                  {error.includes("Failed to fetch") || error.includes("NetworkError") || error.includes("ECONNREFUSED") ? (
                    <>
                      <p className="text-[13px] font-medium text-foreground mb-2">Backend not running</p>
                      <code className="text-[11px] bg-muted px-2 py-1 rounded block mb-3">
                        cd backend && uvicorn main:app --reload
                      </code>
                    </>
                  ) : error.includes("paused") || error.includes("unreachable") || error.includes("routing") ? (
                    <>
                      <p className="text-[13px] font-medium text-foreground mb-2">Neo4j instance offline</p>
                      <p className="text-[12px] text-muted-foreground leading-relaxed mb-3">
                        Resume at{" "}
                        <a href="https://console.neo4j.io" target="_blank" rel="noopener noreferrer"
                          className="underline underline-offset-2">console.neo4j.io</a>
                      </p>
                    </>
                  ) : (
                    <>
                      <p className="text-[13px] font-medium text-foreground mb-2">Connection error</p>
                      <p className="text-[12px] text-muted-foreground mb-3 break-words">{error}</p>
                    </>
                  )}
                  <button onClick={fetchGraph}
                    className="text-[12px] font-medium text-foreground/70 hover:text-foreground border border-border px-3 py-1.5 rounded-md transition-colors">
                    Retry
                  </button>
                </div>
              </div>
            )}

            {patient && !loading && !error && (graphData?.nodes.length ?? 0) === 0 && !syncing && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <p className="text-[13px] text-muted-foreground mb-2">No graph data yet</p>
                  {calls && calls.length > 0 ? (
                    <button onClick={syncHistory}
                      className="text-[12px] font-medium text-foreground border border-border px-3 py-1.5 rounded-md hover:bg-foreground/5 transition-colors">
                      Build graph from {calls.length} calls
                    </button>
                  ) : (
                    <p className="text-[11px] text-muted-foreground">Run some calls first</p>
                  )}
                </div>
              </div>
            )}

            <svg
              ref={svgRef}
              width={dims.w} height={dims.h}
              onWheel={handleWheel}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              style={{ cursor: isDragging() ? "grabbing" : dragging.current ? "grabbing" : "grab", display: "block" }}
            >
              <defs>
                <marker id="arrow-FOLLOWED_BY" viewBox="0 0 10 10" refX="10" refY="5"
                  markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                  <path d="M 0 0 L 10 5 L 0 10 z" fill="#3b82f6" opacity={0.6} />
                </marker>
                <marker id="arrow-INDICATES" viewBox="0 0 10 10" refX="10" refY="5"
                  markerWidth="5" markerHeight="5" orient="auto-start-reverse">
                  <path d="M 0 0 L 10 5 L 0 10 z" fill="#fbbf24" opacity={0.6} />
                </marker>
                <marker id="arrow-ASSOCIATED_WITH" viewBox="0 0 10 10" refX="10" refY="5"
                  markerWidth="5" markerHeight="5" orient="auto-start-reverse">
                  <path d="M 0 0 L 10 5 L 0 10 z" fill="#f87171" opacity={0.6} />
                </marker>
                <marker id="arrow-TREATED_AT" viewBox="0 0 10 10" refX="10" refY="5"
                  markerWidth="5" markerHeight="5" orient="auto-start-reverse">
                  <path d="M 0 0 L 10 5 L 0 10 z" fill="#fb923c" opacity={0.6} />
                </marker>
              </defs>
              <g transform={`translate(${pan.x},${pan.y}) scale(${zoom})`}>
                {/* Links */}
                {resolvedLinks.map((l, i) => {
                  const isChain = l.type === "FOLLOWED_BY";
                  const isEvidence = ["INDICATES", "ASSOCIATED_WITH", "SUPPORTED_BY", "TREATED_AT"].includes(l.type);
                  const dim = hasFocus && !connectedTo.has(l.sid) && !connectedTo.has(l.tid);
                  const hasArrow = ["FOLLOWED_BY", "INDICATES", "ASSOCIATED_WITH", "TREATED_AT"].includes(l.type);
                  return (
                    <line key={i}
                      x1={l.sx} y1={l.sy} x2={l.tx} y2={l.ty}
                      stroke={LINK_COLORS[l.type] ?? "#e2e8f0"}
                      strokeWidth={isChain ? 2 : isEvidence ? 1.5 : 1}
                      strokeOpacity={dim ? 0.06 : isChain ? 0.7 : 0.4}
                      strokeDasharray={isEvidence ? "4 2" : undefined}
                      markerEnd={hasArrow ? `url(#arrow-${l.type})` : undefined}
                    />
                  );
                })}

                {/* Nodes */}
                {visibleNodes.map(n => {
                  const s = ns(n.label);
                  const isSelected = selected?.id === n.id;
                  const isHovered = hovered === n.id;
                  const dim = hasFocus && !connectedTo.has(n.id);
                  const r = s.r + (isSelected ? 3 : isHovered ? 2 : 0);
                  const label = nodeLabel(n);
                  const showLabel = true;

                  return (
                    <g key={n.id}
                      onMouseDown={(e) => {
                        e.stopPropagation();
                        startDrag(n.id);
                      }}
                      onClick={() => setSelected(isSelected ? null : n)}
                      onMouseEnter={() => setHovered(n.id)}
                      onMouseLeave={() => setHovered(null)}
                      style={{ cursor: "pointer" }}
                      opacity={dim ? 0.12 : 1}
                    >
                      <circle cx={n.x} cy={n.y} r={r}
                        fill={s.fill} stroke={isSelected ? "#fff" : s.stroke}
                        strokeWidth={isSelected ? 2.5 : isHovered ? 2 : 0.5}
                        fillOpacity={isSelected || isHovered ? 1 : 0.9}
                      />
                      {n.label === "Patient" && (
                        <text x={n.x} y={n.y! + 1} textAnchor="middle" dominantBaseline="middle"
                          fontSize={10} fill="#fff" fontWeight={700}>{String(n.props.name ?? "P").slice(0, 1)}</text>
                      )}
                      {n.label === "Call" && (
                        <text x={n.x} y={n.y! + 1} textAnchor="middle" dominantBaseline="middle"
                          fontSize={8} fill="#fff" fontWeight={700}>{callTimestamps.get(n.id) ?? ""}</text>
                      )}
                      {(n.label === "CognitiveScore" || n.label === "EmotionalScore" || n.label === "MotorScore") && (
                        <text x={n.x} y={n.y! + 1} textAnchor="middle" dominantBaseline="middle"
                          fontSize={6} fill="#fff" fontWeight={600}>{Number(n.props.value ?? n.props.overallScore ?? 0).toFixed(0)}</text>
                      )}
                      {showLabel && (
                        <text x={n.x} y={n.y! + r + 10} textAnchor="middle"
                          fontSize={8} fill="#64748b" fontWeight={n.label === "Patient" ? 600 : 400}>
                          {label}
                        </text>
                      )}
                    </g>
                  );
                })}
              </g>
            </svg>

            {/* Legend overlay */}
            <div className="absolute bottom-3 left-3 bg-white/90 backdrop-blur-sm border border-border/50 rounded-lg px-3 py-2">
              <div className="flex flex-wrap gap-x-3 gap-y-1">
                {Object.entries(NODE_STYLES)
                  .filter(([label]) => visibleTypes.has(label) && nodeCounts[label])
                  .map(([label, s]) => {
                    const displayName: Record<string, string> = {
                      SpeechRate: "Speech Rate", PauseFrequency: "Pause Freq",
                      HesitationCount: "Hesitations", WordFindingScore: "Word Finding",
                      CognitiveScore: "Cognitive", EmotionalScore: "Emotional", MotorScore: "Motor",
                      AcousticProfile: "Acoustic (legacy)", AcousticMarker: "Marker",
                      ClinicalPattern: "Pattern", Provider: "Provider",
                    };
                    return (
                      <div key={label} className="flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: s.fill }} />
                        <span className="text-[10px] text-muted-foreground">{displayName[label] ?? label} <span className="text-foreground/50">{nodeCounts[label]}</span></span>
                      </div>
                    );
                  })}
              </div>
            </div>

            <div className="absolute top-3 right-3 text-[10px] text-muted-foreground/60">
              scroll to zoom · drag to pan · drag nodes to reposition
            </div>
          </div>

          {/* Inspector panel */}
          <div className="w-72 shrink-0 border-l border-border bg-white overflow-y-auto">
            {selected ? (
              <div className="p-5">
                <div className="flex items-center gap-2 mb-4 pb-3 border-b border-border">
                  <span className="w-3 h-3 rounded-full" style={{ backgroundColor: ns(selected.label).fill }} />
                  <span className="text-[13px] font-semibold text-foreground">{selected.label}</span>
                </div>
                <div className="space-y-3">
                  {selected.label === "Study" && (
                    <div className="p-2 bg-sky-50/70 rounded-md border border-sky-200/50 mb-2">
                      <p className="text-[10px] font-medium text-sky-700">
                        Found via {selected.props.foundBy === "tavily_research" ? "Tavily Research API" : "Tavily"}
                      </p>
                    </div>
                  )}
                  {["SpeechRate", "PauseFrequency", "HesitationCount", "WordFindingScore"].includes(selected.label) && (
                    <div className="p-2 bg-violet-50/70 rounded-md border border-violet-200/50 mb-2">
                      <p className="text-[10px] font-medium text-violet-700">Measured by Modulate Velma-2</p>
                    </div>
                  )}
                  {["CognitiveScore", "EmotionalScore", "MotorScore"].includes(selected.label) && (
                    <div className="p-2 bg-emerald-50/70 rounded-md border border-emerald-200/50 mb-2">
                      <p className="text-[10px] font-medium text-emerald-700">Scored by OpenAI + Reka analysis</p>
                    </div>
                  )}
                  {selected.label === "Provider" && (
                    <div className="p-2 bg-orange-50/70 rounded-md border border-orange-200/50 mb-2">
                      <p className="text-[10px] font-medium text-orange-700">
                        Found by {selected.props.foundBy === "tavily" ? "Tavily" : "Yutori"} provider search
                      </p>
                    </div>
                  )}
                  {Object.entries(selected.props).map(([k, v]) => {
                    if (v === null || v === undefined || v === "") return null;
                    const hiddenKeys = ["id", "patientId", "callId"];
                    if (hiddenKeys.includes(k)) return null;
                    let display: string;
                    if (typeof v === "number" && (k.toLowerCase().includes("timestamp") || k.toLowerCase().includes("enrolled") || k.toLowerCase().includes("detected"))) {
                      display = new Date(v).toLocaleString();
                    } else if (typeof v === "number") {
                      display = Number.isInteger(v) ? String(v) : v.toFixed(2);
                    } else {
                      display = String(v);
                    }
                    return (
                      <div key={k}>
                        <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-0.5">
                          {k.replace(/([A-Z])/g, " $1").toLowerCase()}
                        </p>
                        <p className="text-[12px] text-foreground leading-relaxed break-words">{display}</p>
                      </div>
                    );
                  })}
                </div>

                <div className="mt-5 pt-4 border-t border-border">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">Connections</p>
                  <div className="space-y-1.5">
                    {(graphData?.links ?? [])
                      .filter(l => {
                        const s = typeof l.source === "string" ? l.source : l.source.id;
                        const t = typeof l.target === "string" ? l.target : l.target.id;
                        return s === selected.id || t === selected.id;
                      })
                      .slice(0, 12)
                      .map((l, i) => {
                        const s = typeof l.source === "string" ? l.source : l.source.id;
                        const t = typeof l.target === "string" ? l.target : l.target.id;
                        const other = s === selected.id ? t : s;
                        const otherNode = graphData?.nodes.find(n => n.id === other);
                        return (
                          <div key={i} className="flex items-center gap-1.5 text-[11px]">
                            <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: LINK_COLORS[l.type] ?? "#e2e8f0" }} />
                            <span className="text-muted-foreground">{l.type.replace(/_/g, " ").toLowerCase()}</span>
                            <span className="text-foreground/60">→</span>
                            <span className="text-foreground font-medium truncate">{otherNode?.label ?? "?"}</span>
                          </div>
                        );
                      })}
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-5">
                <p className="text-[12px] text-muted-foreground mb-4">Click a node to inspect</p>

                {/* Layer guide */}
                <div className="space-y-3 mb-5">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground">How to read the graph</p>
                  <div className="space-y-2">
                    {(Object.entries(LAYERS) as [LayerKey, typeof LAYERS[LayerKey]][]).map(([key, layer]) => {
                      const count = layer.types.reduce((sum, t) => sum + (nodeCounts[t] ?? 0), 0);
                      return (
                        <div key={key} className={`p-2 rounded-md border ${activeLayers.has(key) ? "bg-foreground/[0.02] border-border" : "bg-muted/30 border-transparent"}`}>
                          <p className="text-[11px] font-medium text-foreground">{layer.label} <span className="text-muted-foreground font-normal">({count})</span></p>
                          <p className="text-[10px] text-muted-foreground">{layer.description}</p>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {layer.types.filter(t => t !== "AcousticProfile").map(t => {
                              const dn: Record<string, string> = {
                                SpeechRate: "Speech Rate", PauseFrequency: "Pause Freq",
                                HesitationCount: "Hesitations", WordFindingScore: "Word Finding",
                                CognitiveScore: "Cognitive", EmotionalScore: "Emotional", MotorScore: "Motor",
                                AcousticMarker: "Marker", ClinicalPattern: "Pattern",
                              };
                              return (
                                <span key={t} className="flex items-center gap-1">
                                  <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: NODE_STYLES[t]?.fill ?? "#94a3b8" }} />
                                  <span className="text-[9px] text-muted-foreground">{dn[t] ?? t}</span>
                                </span>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {visibleNodes.length > 0 && (
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">Relationships</p>
                    <div className="space-y-1">
                      {Object.entries(
                        resolvedLinks.reduce<Record<string, number>>((acc, l) => {
                          acc[l.type] = (acc[l.type] ?? 0) + 1; return acc;
                        }, {})
                      ).map(([type, count]) => (
                        <div key={type} className="flex items-center justify-between text-[11px]">
                          <div className="flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: LINK_COLORS[type] ?? "#e2e8f0" }} />
                            <span className="text-muted-foreground">{type.replace(/_/g, " ")}</span>
                          </div>
                          <span className="text-foreground font-medium tabular-nums">{count}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </MemoLayout>
  );
}
