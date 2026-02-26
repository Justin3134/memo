import { useEffect, useRef, useState, useCallback } from "react";
import { MemoLayout } from "@/components/memo/MemoLayout";
import { useMemoDashboardData } from "@/hooks/useMemoDashboardData";
import { Link } from "react-router-dom";

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

const nodeStyle: Record<string, { fill: string; stroke: string; r: number }> = {
  Patient:         { fill: "#18181b", stroke: "#18181b", r: 18 },
  Call:            { fill: "#3b82f6", stroke: "#2563eb", r: 12 },
  AcousticProfile: { fill: "#8b5cf6", stroke: "#7c3aed", r: 10 },
  CognitiveScore:  { fill: "#10b981", stroke: "#059669", r: 10 },
  Anomaly:         { fill: "#ef4444", stroke: "#dc2626", r: 12 },
  MedicalResearch: { fill: "#f59e0b", stroke: "#d97706", r: 9 },
};

const linkStyle: Record<string, string> = {
  HAD_CALL:     "#cbd5e1",
  HAS_ACOUSTIC: "#c4b5fd",
  HAS_SCORE:    "#6ee7b7",
  TRIGGERED:    "#fca5a5",
  RESEARCH:     "#fde68a",
};

const nodeStyle_ = (label: string) => nodeStyle[label] ?? { fill: "#94a3b8", stroke: "#64748b", r: 9 };

// Minimal force simulation
function useForceGraph(data: GraphData | null) {
  const [positions, setPositions] = useState<GraphNode[]>([]);
  useEffect(() => {
    if (!data || data.nodes.length === 0) { setPositions([]); return; }
    const W = 700, H = 500;
    const nodes: GraphNode[] = data.nodes.map((n, i) => ({
      ...n, x: W / 2 + Math.cos(i / data.nodes.length * Math.PI * 2) * 160,
      y: H / 2 + Math.sin(i / data.nodes.length * Math.PI * 2) * 160, vx: 0, vy: 0,
    }));
    const nodeMap = new Map(nodes.map(n => [n.id, n]));
    const links = data.links.map(l => ({
      source: nodeMap.get(typeof l.source === "string" ? l.source : (l.source as GraphNode).id)!,
      target: nodeMap.get(typeof l.target === "string" ? l.target : (l.target as GraphNode).id)!,
      type: l.type,
    })).filter(l => l.source && l.target);

    for (let tick = 0; tick < 120; tick++) {
      // repulsion
      for (let i = 0; i < nodes.length; i++) for (let j = i + 1; j < nodes.length; j++) {
        const dx = nodes[j].x! - nodes[i].x!, dy = nodes[j].y! - nodes[i].y!;
        const d = Math.sqrt(dx * dx + dy * dy) || 0.001;
        const f = 2400 / (d * d);
        nodes[i].vx! -= (dx / d) * f; nodes[i].vy! -= (dy / d) * f;
        nodes[j].vx! += (dx / d) * f; nodes[j].vy! += (dy / d) * f;
      }
      // attraction
      for (const l of links) {
        const dx = l.target.x! - l.source.x!, dy = l.target.y! - l.source.y!;
        const d = Math.sqrt(dx * dx + dy * dy) || 0.001;
        const f = (d - 80) * 0.05;
        l.source.vx! += (dx / d) * f; l.source.vy! += (dy / d) * f;
        l.target.vx! -= (dx / d) * f; l.target.vy! -= (dy / d) * f;
      }
      // center gravity
      for (const n of nodes) {
        n.vx! += (W / 2 - n.x!) * 0.01; n.vy! += (H / 2 - n.y!) * 0.01;
      }
      // integrate
      for (const n of nodes) {
        n.vx! *= 0.8; n.vy! *= 0.8;
        n.x! += n.vx!; n.y! += n.vy!;
        n.x! = Math.max(20, Math.min(W - 20, n.x!));
        n.y! = Math.max(20, Math.min(H - 20, n.y!));
      }
    }
    setPositions(nodes);
  }, [data]);
  return positions;
}

export default function PatientGraph() {
  const { patient } = useMemoDashboardData();
  const [graphData, setGraphData] = useState<GraphData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<GraphNode | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const dragging = useRef<{ dx: number; dy: number } | null>(null);

  const nodes = useForceGraph(graphData);
  const nodeMap = new Map(nodes.map(n => [n.id, n]));

  const fetchGraph = async () => {
    if (!patient?._id) return;
    setLoading(true); setError(null);
    try {
      const r = await fetch(`${BACKEND}/patients/${patient._id}/graph`);
      if (!r.ok) {
        // Try to extract real error detail from FastAPI response
        let detail = `${r.status}`;
        try { const j = await r.json(); detail = j.detail ?? detail; } catch {}
        throw new Error(detail);
      }
      const d = await r.json();
      setGraphData(d);
    } catch (e: any) {
      setError(e.message ?? "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchGraph(); }, [patient?._id]);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    setZoom(z => Math.max(0.3, Math.min(3, z - e.deltaY * 0.001)));
  }, []);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.target === svgRef.current || (e.target as SVGElement).tagName === "line")
      dragging.current = { dx: e.clientX - pan.x, dy: e.clientY - pan.y };
  };
  const handleMouseMove = (e: React.MouseEvent) => {
    if (dragging.current) setPan({ x: e.clientX - dragging.current.dx, y: e.clientY - dragging.current.dy });
  };
  const handleMouseUp = () => { dragging.current = null; };

  const links = graphData?.links.map(l => ({
    sx: nodeMap.get(typeof l.source === "string" ? l.source : (l.source as GraphNode).id)?.x,
    sy: nodeMap.get(typeof l.source === "string" ? l.source : (l.source as GraphNode).id)?.y,
    tx: nodeMap.get(typeof l.target === "string" ? l.target : (l.target as GraphNode).id)?.x,
    ty: nodeMap.get(typeof l.target === "string" ? l.target : (l.target as GraphNode).id)?.y,
    type: l.type,
  })).filter(l => l.sx !== undefined && l.tx !== undefined) ?? [];

  const legend = Object.entries(nodeStyle);

  return (
    <MemoLayout>
      <div className="p-8 max-w-6xl animate-fade-in">

        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-xl font-semibold text-foreground tracking-tight">Memory Graph</h1>
            <p className="text-[13px] text-muted-foreground mt-0.5">
              Neo4j knowledge graph · patient longitudinal data
            </p>
          </div>
          {graphData && (
            <div className="flex gap-4 text-[12px] text-muted-foreground">
              <span><span className="tabular font-medium text-foreground">{nodes.length}</span> nodes</span>
              <span><span className="tabular font-medium text-foreground">{graphData.links.length}</span> edges</span>
            </div>
          )}
        </div>

        {!patient && (
          <div className="bg-white border border-border rounded-lg p-6">
            <p className="text-[13px] text-muted-foreground">No patient enrolled.{" "}
              <Link to="/onboarding" className="text-foreground underline underline-offset-2">Add one</Link>
            </p>
          </div>
        )}

        {patient && (
          <div className="flex gap-4">
            {/* Graph canvas */}
            <div className="flex-1 bg-white border border-border rounded-lg overflow-hidden relative">
              {loading && (
                <div className="absolute inset-0 flex items-center justify-center bg-white/80 z-10">
                  <p className="text-[13px] text-muted-foreground">Fetching graph from Neo4j…</p>
                </div>
              )}
              {error && !loading && (
                <div className="absolute inset-0 flex items-center justify-center p-8">
                  <div className="text-center max-w-sm">
                    {error.includes("Failed to fetch") || error.includes("NetworkError") || error.includes("ECONNREFUSED") ? (
                      <>
                        <p className="text-[13px] font-medium text-foreground mb-2">Backend not running</p>
                        <p className="text-[12px] text-muted-foreground leading-relaxed mb-3">
                          Start the FastAPI server:
                        </p>
                        <code className="text-[11px] bg-muted px-2 py-1 rounded block mb-3">
                          cd backend && uvicorn main:app --reload
                        </code>
                      </>
                    ) : error.includes("paused") || error.includes("console.neo4j") || error.includes("ServiceUnavailable") || error.includes("unreachable") ? (
                      <>
                        <p className="text-[13px] font-medium text-foreground mb-2">Neo4j instance paused</p>
                        <p className="text-[12px] text-muted-foreground leading-relaxed mb-3">
                          Resume it at{" "}
                          <a href="https://console.neo4j.io" target="_blank" rel="noopener noreferrer"
                            className="underline underline-offset-2">console.neo4j.io</a>
                          {" "}(~30 seconds), then retry.
                        </p>
                      </>
                    ) : (
                      <>
                        <p className="text-[13px] font-medium text-foreground mb-2">Connection error</p>
                        <p className="text-[12px] text-muted-foreground leading-relaxed mb-3 break-words">{error}</p>
                      </>
                    )}
                    <button
                      onClick={fetchGraph}
                      className="text-[12px] font-medium text-foreground/70 hover:text-foreground border border-border px-3 py-1.5 rounded-md transition-colors"
                    >
                      Retry
                    </button>
                  </div>
                </div>
              )}
              {!loading && !error && nodes.length === 0 && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <p className="text-[13px] text-muted-foreground">No graph data yet — run some calls first.</p>
                </div>
              )}
              <svg
                ref={svgRef} width="100%" height="520"
                onWheel={handleWheel} onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove} onMouseUp={handleMouseUp}
                style={{ cursor: dragging.current ? "grabbing" : "grab" }}
              >
                <g transform={`translate(${pan.x},${pan.y}) scale(${zoom})`}>
                  {links.map((l, i) => (
                    <line key={i} x1={l.sx} y1={l.sy} x2={l.tx} y2={l.ty}
                      stroke={linkStyle[l.type] ?? "#e2e8f0"} strokeWidth={1} strokeOpacity={0.7} />
                  ))}
                  {nodes.map(n => {
                    const s = nodeStyle_(n.label);
                    const isSelected = selected?.id === n.id;
                    return (
                      <g key={n.id} onClick={() => setSelected(isSelected ? null : n)} style={{ cursor: "pointer" }}>
                        <circle cx={n.x} cy={n.y} r={s.r + (isSelected ? 3 : 0)}
                          fill={s.fill} stroke={isSelected ? "#fff" : s.stroke}
                          strokeWidth={isSelected ? 2.5 : 1}
                          fillOpacity={isSelected ? 1 : 0.85}
                        />
                        {n.label === "Patient" && (
                          <text x={n.x} y={n.y! + 1} textAnchor="middle" dominantBaseline="middle"
                            fontSize={8} fill="#fff" fontWeight={600}>
                            {String(n.props.name ?? "P").slice(0,1)}
                          </text>
                        )}
                        {(n.label === "Call" || n.label === "Anomaly") && (
                          <text x={n.x} y={n.y! + s.r + 11} textAnchor="middle"
                            fontSize={9} fill="#64748b">
                            {n.label === "Call"
                              ? new Date(Number(n.props.timestamp ?? 0)).toLocaleDateString("en-US", { month: "short", day: "numeric" })
                              : String(n.props.type ?? "anomaly").split("_")[0]}
                          </text>
                        )}
                      </g>
                    );
                  })}
                </g>
              </svg>

              {/* Legend */}
              <div className="absolute bottom-4 left-4 flex flex-wrap gap-3">
                {legend.map(([label, s]) => (
                  <div key={label} className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: s.fill, opacity: 0.85 }} />
                    <span className="text-[11px] text-muted-foreground">{label}</span>
                  </div>
                ))}
              </div>
              <div className="absolute top-3 right-3 text-[11px] text-muted-foreground">
                Scroll to zoom · drag to pan
              </div>
            </div>

            {/* Selected node panel */}
            <div className="w-64 shrink-0">
              <div className="bg-white border border-border rounded-lg h-full p-5">
                {selected ? (
                  <>
                    <div className="flex items-center gap-2 mb-4">
                      <span className="w-3 h-3 rounded-full" style={{ backgroundColor: nodeStyle_(selected.label).fill }} />
                      <span className="text-[13px] font-medium text-foreground">{selected.label}</span>
                    </div>
                    <div className="space-y-2.5">
                      {Object.entries(selected.props).map(([k, v]) => {
                        if (v === null || v === undefined || v === "") return null;
                        const display = typeof v === "number" && k.toLowerCase().includes("timestamp")
                          ? new Date(v).toLocaleString()
                          : String(v);
                        return (
                          <div key={k}>
                            <p className="text-[11px] text-muted-foreground capitalize mb-0.5">
                              {k.replace(/([A-Z])/g, " $1").toLowerCase()}
                            </p>
                            <p className="text-[12px] text-foreground leading-relaxed break-words">{display}</p>
                          </div>
                        );
                      })}
                    </div>
                  </>
                ) : (
                  <div className="h-full flex flex-col justify-center">
                    <p className="text-[13px] text-muted-foreground text-center">
                      Click a node to inspect its properties
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </MemoLayout>
  );
}
