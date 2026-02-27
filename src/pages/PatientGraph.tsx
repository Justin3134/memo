import { useEffect, useRef, useState, useCallback } from "react";
import { MemoLayout } from "@/components/memo/MemoLayout";
import { useMemoDashboardData } from "@/hooks/useMemoDashboardData";
import { useNavigate } from "react-router-dom";
import { RefreshCw } from "lucide-react";

const BACKEND = import.meta.env.VITE_BACKEND_URL ?? "http://localhost:8000";

interface GraphNode {
  id: string;
  label: string;
  props: Record<string, unknown>;
  x?: number;
  y?: number;
  vx?: number;
  vy?: number;
}

interface GraphLink {
  source: string | GraphNode;
  target: string | GraphNode;
  type: string;
}

interface GraphData { nodes: GraphNode[]; links: GraphLink[] }

const NODE_STYLES: Record<string, { fill: string; stroke: string; r: number; icon?: string }> = {
  Patient:          { fill: "#18181b", stroke: "#18181b", r: 22, icon: "P" },
  Call:             { fill: "#3b82f6", stroke: "#2563eb", r: 11 },
  AcousticProfile:  { fill: "#8b5cf6", stroke: "#7c3aed", r: 8 },
  CognitiveScore:   { fill: "#10b981", stroke: "#059669", r: 8 },
  Anomaly:          { fill: "#ef4444", stroke: "#dc2626", r: 11 },
  Topic:            { fill: "#f97316", stroke: "#ea580c", r: 10, icon: "T" },
  AcousticMarker:   { fill: "#ec4899", stroke: "#db2777", r: 10 },
  ClinicalPattern:  { fill: "#f59e0b", stroke: "#d97706", r: 10 },
  Condition:        { fill: "#dc2626", stroke: "#b91c1c", r: 12, icon: "!" },
  Study:            { fill: "#0ea5e9", stroke: "#0284c7", r: 9 },
};

const LINK_COLORS: Record<string, string> = {
  HAD_CALL:        "#94a3b8",
  FOLLOWED_BY:     "#3b82f6",
  HAS_ACOUSTIC:    "#c4b5fd",
  HAS_SCORE:       "#6ee7b7",
  TRIGGERED:       "#fca5a5",
  MENTIONED:       "#fdba74",
  MATCHES:         "#f9a8d4",
  INDICATES:       "#fbbf24",
  ASSOCIATED_WITH: "#f87171",
  SUPPORTED_BY:    "#7dd3fc",
};

const ns = (label: string) => NODE_STYLES[label] ?? { fill: "#94a3b8", stroke: "#64748b", r: 8 };

function useForceGraph(data: GraphData | null, W: number, H: number) {
  const [positions, setPositions] = useState<GraphNode[]>([]);
  useEffect(() => {
    if (!data || data.nodes.length === 0) { setPositions([]); return; }
    const cx = W / 2, cy = H / 2;

    const nodes: GraphNode[] = data.nodes.map((n, i) => {
      const angle = (i / data.nodes.length) * Math.PI * 2;
      const layerR = n.label === "Patient" ? 0 :
        ["Call", "Topic"].includes(n.label) ? 220 :
        ["AcousticProfile", "CognitiveScore", "Anomaly"].includes(n.label) ? 380 :
        ["AcousticMarker", "ClinicalPattern"].includes(n.label) ? 520 : 640;
      return {
        ...n,
        x: cx + Math.cos(angle) * layerR + (Math.random() - 0.5) * 60,
        y: cy + Math.sin(angle) * layerR + (Math.random() - 0.5) * 60,
        vx: 0, vy: 0,
      };
    });

    const nodeMap = new Map(nodes.map(n => [n.id, n]));
    const links = data.links.map(l => ({
      source: nodeMap.get(typeof l.source === "string" ? l.source : l.source.id)!,
      target: nodeMap.get(typeof l.target === "string" ? l.target : l.target.id)!,
      type: l.type,
    })).filter(l => l.source && l.target);

    const idealLen: Record<string, number> = {
      HAD_CALL: 160, FOLLOWED_BY: 120, HAS_ACOUSTIC: 100, HAS_SCORE: 100,
      TRIGGERED: 110, MENTIONED: 140, MATCHES: 120, INDICATES: 100,
      ASSOCIATED_WITH: 100, SUPPORTED_BY: 100,
    };

    for (let tick = 0; tick < 250; tick++) {
      const alpha = 1 - tick / 250;
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const dx = nodes[j].x! - nodes[i].x!;
          const dy = nodes[j].y! - nodes[i].y!;
          const d = Math.sqrt(dx * dx + dy * dy) || 0.01;
          const repulse = 8000 / (d * d) * alpha;
          nodes[i].vx! -= (dx / d) * repulse;
          nodes[i].vy! -= (dy / d) * repulse;
          nodes[j].vx! += (dx / d) * repulse;
          nodes[j].vy! += (dy / d) * repulse;
        }
      }
      for (const l of links) {
        const dx = l.target.x! - l.source.x!;
        const dy = l.target.y! - l.source.y!;
        const d = Math.sqrt(dx * dx + dy * dy) || 0.01;
        const target = idealLen[l.type] ?? 120;
        const f = (d - target) * 0.05 * alpha;
        l.source.vx! += (dx / d) * f;
        l.source.vy! += (dy / d) * f;
        l.target.vx! -= (dx / d) * f;
        l.target.vy! -= (dy / d) * f;
      }
      for (const n of nodes) {
        n.vx! += (cx - n.x!) * 0.005;
        n.vy! += (cy - n.y!) * 0.005;
        n.vx! *= 0.75;
        n.vy! *= 0.75;
        n.x! += n.vx!;
        n.y! += n.vy!;
        n.x! = Math.max(50, Math.min(W - 50, n.x!));
        n.y! = Math.max(50, Math.min(H - 50, n.y!));
      }
    }
    setPositions([...nodes]);
  }, [data, W, H]);
  return positions;
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

  const nodes = useForceGraph(graphData, dims.w, dims.h);
  const nodeMap = new Map(nodes.map(n => [n.id, n]));

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
          .filter(c => c.status === "completed" || c.cognitiveScore != null)
          .map(c => ({
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

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.target === svgRef.current || (e.target as SVGElement).tagName === "line" || (e.target as SVGElement).tagName === "svg")
      dragging.current = { dx: e.clientX - pan.x, dy: e.clientY - pan.y };
  };
  const handleMouseMove = (e: React.MouseEvent) => {
    if (dragging.current) setPan({ x: e.clientX - dragging.current.dx, y: e.clientY - dragging.current.dy });
  };
  const handleMouseUp = () => { dragging.current = null; };

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

  const resolvedLinks = (graphData?.links ?? []).map(l => {
    const sid = typeof l.source === "string" ? l.source : l.source.id;
    const tid = typeof l.target === "string" ? l.target : l.target.id;
    return {
      sx: nodeMap.get(sid)?.x, sy: nodeMap.get(sid)?.y,
      tx: nodeMap.get(tid)?.x, ty: nodeMap.get(tid)?.y,
      type: l.type, sid, tid,
    };
  }).filter(l => l.sx != null && l.tx != null);

  const nodeCounts: Record<string, number> = {};
  nodes.forEach(n => { nodeCounts[n.label] = (nodeCounts[n.label] ?? 0) + 1; });

  const legendItems = Object.entries(NODE_STYLES).filter(([label]) => nodeCounts[label]);

  const nodeLabel = (n: GraphNode) => {
    switch (n.label) {
      case "Patient": return String(n.props.name ?? "P").slice(0, 3);
      case "Call": {
        const ts = Number(n.props.timestamp ?? 0);
        return ts > 0 ? new Date(ts).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "Call";
      }
      case "Topic": return String(n.props.name ?? "").slice(0, 12);
      case "AcousticMarker": return String(n.props.name ?? "").replace(/([A-Z])/g, " $1").trim().slice(0, 14);
      case "ClinicalPattern": return String(n.props.name ?? "").replace(/([A-Z])/g, " $1").trim().slice(0, 14);
      case "Condition": return String(n.props.name ?? "").slice(0, 10);
      case "Study": return String(n.props.source ?? n.props.title ?? "").slice(0, 16);
      case "Anomaly": return String(n.props.type ?? "anomaly").replace(/_/g, " ").slice(0, 14);
      case "CognitiveScore": return `${n.props.overallScore ?? "?"}`;
      case "AcousticProfile": return `${n.props.speechRate ?? "?"}wpm`;
      default: return n.label;
    }
  };

  return (
    <MemoLayout>
      <div className="flex flex-col h-full overflow-hidden">
        {/* Header bar */}
        <div className="flex items-center justify-between px-6 py-3 border-b border-border bg-white shrink-0">
          <div>
            <h1 className="text-[15px] font-semibold text-foreground tracking-tight">Memory Graph</h1>
            <p className="text-[11px] text-muted-foreground">
              Longitudinal knowledge graph — {nodes.length} nodes · {resolvedLinks.length} edges
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

            {patient && !loading && !error && nodes.length === 0 && !syncing && (
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
              style={{ cursor: dragging.current ? "grabbing" : "grab", display: "block" }}
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
              </defs>
              <g transform={`translate(${pan.x},${pan.y}) scale(${zoom})`}>
                {/* Links */}
                {resolvedLinks.map((l, i) => {
                  const isChain = l.type === "FOLLOWED_BY";
                  const isEvidence = ["INDICATES", "ASSOCIATED_WITH", "SUPPORTED_BY"].includes(l.type);
                  const dim = hasFocus && !connectedTo.has(l.sid) && !connectedTo.has(l.tid);
                  const hasArrow = ["FOLLOWED_BY", "INDICATES", "ASSOCIATED_WITH"].includes(l.type);
                  return (
                    <line key={i}
                      x1={l.sx} y1={l.sy} x2={l.tx} y2={l.ty}
                      stroke={LINK_COLORS[l.type] ?? "#e2e8f0"}
                      strokeWidth={isChain ? 2 : isEvidence ? 1.5 : 1}
                      strokeOpacity={dim ? 0.08 : isChain ? 0.7 : 0.4}
                      strokeDasharray={isEvidence ? "4 2" : undefined}
                      markerEnd={hasArrow ? `url(#arrow-${l.type})` : undefined}
                    />
                  );
                })}

                {/* Nodes */}
                {nodes.map(n => {
                  const s = ns(n.label);
                  const isSelected = selected?.id === n.id;
                  const isHovered = hovered === n.id;
                  const dim = hasFocus && !connectedTo.has(n.id);
                  const r = s.r + (isSelected ? 3 : isHovered ? 2 : 0);
                  const label = nodeLabel(n);
                  const showLabel = ["Patient", "Call", "Topic", "AcousticMarker", "ClinicalPattern", "Condition", "Study", "Anomaly"].includes(n.label);

                  return (
                    <g key={n.id}
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
                          fontSize={9} fill="#fff" fontWeight={700}>{String(n.props.name ?? "P").slice(0, 1)}</text>
                      )}
                      {n.label === "CognitiveScore" && (
                        <text x={n.x} y={n.y! + 1} textAnchor="middle" dominantBaseline="middle"
                          fontSize={7} fill="#fff" fontWeight={600}>{n.props.overallScore ?? "?"}</text>
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
                {legendItems.map(([label, s]) => (
                  <div key={label} className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: s.fill }} />
                    <span className="text-[10px] text-muted-foreground">{label} <span className="text-foreground/50">{nodeCounts[label]}</span></span>
                  </div>
                ))}
              </div>
            </div>

            <div className="absolute top-3 right-3 text-[10px] text-muted-foreground/60">
              scroll to zoom · drag to pan
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
                  {Object.entries(selected.props).map(([k, v]) => {
                    if (v === null || v === undefined || v === "") return null;
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

                {/* Connected edges */}
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
                {nodes.length > 0 && (
                  <div className="space-y-4">
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">Graph structure</p>
                      <div className="space-y-1">
                        {legendItems.map(([label]) => (
                          <div key={label} className="flex justify-between text-[11px]">
                            <span className="text-muted-foreground">{label}</span>
                            <span className="text-foreground font-medium tabular-nums">{nodeCounts[label]}</span>
                          </div>
                        ))}
                      </div>
                    </div>
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
