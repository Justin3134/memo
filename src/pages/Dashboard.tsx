import { useMemo, useState, useEffect } from "react";
import { ChevronDown, ChevronRight, User, Bot, Eye, EyeOff, Phone } from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Area, AreaChart, ReferenceLine,
} from "recharts";
import { MemoLayout } from "@/components/memo/MemoLayout";
import { useMemoDashboardData } from "@/hooks/useMemoDashboardData";

const parseLines = (t: string) => {
  if (!t?.trim()) return [];
  return t.split("\n").map(l => l.trim()).filter(Boolean).map(l => {
    const lower = l.toLowerCase();
    if (/^(ai|assistant|bot|memo)\s*:/i.test(lower))
      return { role: "ai" as const, text: l.replace(/^[^:]+:\s*/i, "").trim() };
    if (/^(user|patient|human)\s*:/i.test(lower))
      return { role: "user" as const, text: l.replace(/^[^:]+:\s*/i, "").trim() };
    if (/^\[speaker_0/i.test(lower) || /^\[assistant/i.test(lower))
      return { role: "ai" as const, text: l.replace(/^\[[^\]]+\]:\s*/i, "").trim() };
    if (/^\[speaker_1/i.test(lower) || /^\[user/i.test(lower))
      return { role: "user" as const, text: l.replace(/^\[[^\]]+\]:\s*/i, "").trim() };
    return { role: "user" as const, text: l };
  });
};

const scoreColor = (s: number) =>
  s >= 75 ? "text-memo-green" : s >= 60 ? "text-memo-amber" : "text-memo-red";
const scoreBg = (s: number) =>
  s >= 75 ? "bg-memo-green/8 text-memo-green border-memo-green/20"
  : s >= 60 ? "bg-memo-amber/8 text-memo-amber border-memo-amber/20"
  : "bg-memo-red/8 text-memo-red border-memo-red/20";
const scoreLabel = (s: number) => s >= 75 ? "Stable" : s >= 60 ? "Watch" : "Alert";

export default function Dashboard() {
  const navigate = useNavigate();
  const [activeMetric, setActiveMetric] = useState<"cognitive" | "motor" | "emotional">("cognitive");
  const [showTranscript, setShowTranscript] = useState(false);
  const [expandedCallId, setExpandedCallId] = useState<string | null>(null);
  const { loading, patient, calls, memories } = useMemoDashboardData();

  const chartData = useMemo(() =>
    [...calls].sort((a, b) => a.startedAt - b.startedAt).map(c => ({
      date: new Date(c.startedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      cognitive: Math.round(c.cognitiveScore ?? patient?.baseline?.cognitiveScore ?? 70),
      motor: Math.round(c.motorScore ?? patient?.baseline?.motorScore ?? 70),
      emotional: Math.round(c.emotionalScore ?? patient?.baseline?.emotionalScore ?? 70),
    })), [calls, patient?.baseline]);

  const latestCall = calls[0] ?? null;
  const latestScore = latestCall?.cognitiveScore ?? patient?.baseline?.cognitiveScore ?? 70;

  const metricColor: Record<string, string> = {
    cognitive: "hsl(240,10%,4%)",
    motor: "hsl(215,70%,50%)",
    emotional: "hsl(142,69%,38%)",
  };

  const metrics = [
    { key: "cognitive" as const, label: "Cognitive", value: Math.round(latestCall?.cognitiveScore ?? patient?.baseline?.cognitiveScore ?? 0), sub: latestCall?.speechRate ? `${Math.round(latestCall.speechRate)} wpm` : "awaiting call" },
    { key: "motor" as const, label: "Motor", value: Math.round(latestCall?.motorScore ?? patient?.baseline?.motorScore ?? 0), sub: latestCall?.pauseFrequency ? `${latestCall.pauseFrequency.toFixed(1)} pauses/min` : "awaiting call" },
    { key: "emotional" as const, label: "Emotional", value: Math.round(latestCall?.emotionalScore ?? patient?.baseline?.emotionalScore ?? 0), sub: memories[0]?.sentiment ?? "awaiting call" },
  ];

  useEffect(() => {
    if (!loading && !patient) navigate("/", { replace: true });
  }, [loading, patient, navigate]);

  if (loading) return (
    <MemoLayout>
      <div className="p-8 text-[13px] text-muted-foreground">Loading…</div>
    </MemoLayout>
  );

  if (!patient) return (
    <MemoLayout>
      <div className="p-8 text-[13px] text-muted-foreground">Redirecting…</div>
    </MemoLayout>
  );

  const transcriptLines = parseLines(latestCall?.transcript ?? "");

  return (
    <MemoLayout>
      <div className="flex h-full">

        {/* ── Left column: metrics + chart + call history ── */}
        <div className="flex-1 min-w-0 flex flex-col overflow-auto">

          {/* Header — no patient name (shown in sidebar) */}
          <div className="flex items-center justify-between px-8 pt-7 pb-5 border-b border-border">
            <div>
              <h1 className="text-[15px] font-semibold text-foreground">Overview</h1>
              <p className="text-[12px] text-muted-foreground mt-0.5">
                {latestCall
                  ? `Last call ${new Date(latestCall.startedAt).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}`
                  : "No calls yet"}
              </p>
            </div>
            <span className={`text-[12px] px-2.5 py-1 rounded-full border ${scoreBg(latestScore)}`}>
              {scoreLabel(latestScore)}
            </span>
          </div>

          {/* Metrics row */}
          <div className="flex items-end gap-10 px-8 py-5 border-b border-border">
            {metrics.map(m => (
              <button key={m.key} onClick={() => setActiveMetric(m.key)} className="text-left group">
                <p className="text-[11px] text-muted-foreground mb-0.5">{m.label}</p>
                <p className={`text-[26px] font-semibold tabular leading-none ${
                  activeMetric === m.key ? scoreColor(m.value) : "text-foreground/40 group-hover:text-foreground/60"
                } transition-colors`}>{m.value}</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">{m.sub}</p>
              </button>
            ))}
            <div className="ml-auto">
              <p className="text-[11px] text-muted-foreground mb-0.5">Overall</p>
              <p className={`text-[26px] font-semibold tabular leading-none ${scoreColor(latestScore)}`}>
                {Math.round(latestScore)}<span className="text-[13px] text-muted-foreground font-normal">/100</span>
              </p>
            </div>
          </div>

          {/* Chart */}
          <div className="px-8 pt-5 pb-4">
            <div className="mb-3">
              <p className="text-[12px] font-medium text-muted-foreground capitalize">{activeMetric} over time</p>
            </div>
            {chartData.length < 2 ? (
              <div className="h-[160px] flex items-center">
                <p className="text-[13px] text-muted-foreground">Chart populates after 2+ calls.</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={160}>
                <AreaChart data={chartData} margin={{ top: 4, right: 4, left: -28, bottom: 0 }}>
                  <defs>
                    <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={metricColor[activeMetric]} stopOpacity={0.1} />
                      <stop offset="100%" stopColor={metricColor[activeMetric]} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(240,6%,93%)" vertical={false} />
                  <XAxis dataKey="date" tick={{ fontSize: 10, fill: "hsl(240,4%,60%)" }} tickLine={false} axisLine={false}
                    interval={Math.max(0, Math.floor(chartData.length / 5) - 1)} />
                  <YAxis domain={[40, 100]} tick={{ fontSize: 10, fill: "hsl(240,4%,60%)" }} tickLine={false} axisLine={false} ticks={[40, 70, 100]} />
                  <ReferenceLine y={70} stroke="hsl(240,6%,88%)" strokeDasharray="4 2" />
                  <Tooltip contentStyle={{ fontSize: "12px", borderRadius: "6px", border: "1px solid hsl(240,6%,90%)", background: "#fff" }} />
                  <Area type="monotone" dataKey={activeMetric} stroke={metricColor[activeMetric]} strokeWidth={1.75} fill="url(#grad)" dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Call history — under chart */}
          <div className="border-t border-border flex-1">
            <div className="px-8 py-3 border-b border-border">
              <p className="text-[12px] font-medium text-muted-foreground">Call history</p>
            </div>
            {calls.length === 0 ? (
              <p className="px-8 py-4 text-[13px] text-muted-foreground">No calls yet.</p>
            ) : (
              <div className="divide-y divide-border">
                {calls.slice(0, 12).map(call => (
                  <div key={call._id}>
                    <button
                      onClick={() => setExpandedCallId(expandedCallId === call._id ? null : call._id)}
                      className="w-full px-8 py-2.5 flex items-center gap-3 hover:bg-[#F5F5F5] transition-colors text-left"
                    >
                      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                        (call.cognitiveScore ?? 70) >= 75 ? "bg-memo-green" :
                        (call.cognitiveScore ?? 70) >= 60 ? "bg-memo-amber" : "bg-memo-red"
                      }`} />
                      <span className="text-[13px] text-foreground/70 flex-1">
                        {new Date(call.startedAt).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
                      </span>
                      {call.duration && (
                        <span className="text-[11px] text-muted-foreground">{call.duration}s</span>
                      )}
                      <span className={`text-[13px] tabular font-medium w-8 text-right ${scoreColor(call.cognitiveScore ?? 70)}`}>
                        {Math.round(call.cognitiveScore ?? 70)}
                      </span>
                      {expandedCallId === call._id
                        ? <ChevronDown className="w-3 h-3 text-muted-foreground shrink-0" />
                        : <ChevronRight className="w-3 h-3 text-muted-foreground shrink-0" />
                      }
                    </button>
                    {expandedCallId === call._id && (
                      <div className="px-8 pb-3 pt-1">
                        {call.summary && (
                          <p className="text-[12px] text-muted-foreground leading-relaxed mb-2">{call.summary}</p>
                        )}
                        {call.transcript && (
                          <details>
                            <summary className="text-[11px] text-muted-foreground cursor-pointer hover:text-foreground select-none">
                              View transcript
                            </summary>
                            <div className="mt-2 max-h-40 overflow-y-auto memo-scrollbar space-y-1.5 pl-2 border-l border-border">
                              {parseLines(call.transcript).map((line, i) => (
                                <div key={i} className="flex gap-2 items-start">
                                  <span className="shrink-0 mt-0.5 text-muted-foreground/50">
                                    {line.role === "ai" ? <Bot className="w-3 h-3" /> : <User className="w-3 h-3" />}
                                  </span>
                                  <p className="text-[11px] text-foreground/60 leading-relaxed">{line.text}</p>
                                </div>
                              ))}
                            </div>
                          </details>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── Right column: latest call + memories ── */}
        <div className="w-[300px] shrink-0 border-l border-border flex flex-col overflow-auto">

          {/* Latest call */}
          <div className="p-6 border-b border-border">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-1.5">
                <Phone className="w-[12px] h-[12px] text-muted-foreground" strokeWidth={1.75} />
                <span className="text-[12px] font-medium text-muted-foreground">Latest call</span>
              </div>
              {latestCall && (
                <span className="text-[11px] text-muted-foreground">
                  {new Date(latestCall.startedAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
                  {latestCall.duration ? ` · ${latestCall.duration}s` : ""}
                </span>
              )}
            </div>

            {latestCall ? (
              <>
                <p className="text-[13px] text-foreground/80 leading-relaxed mb-3">
                  {latestCall.summary || "Analysis in progress…"}
                </p>
                <button
                  onClick={() => setShowTranscript(v => !v)}
                  className="flex items-center gap-1.5 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showTranscript ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                  {showTranscript ? "Hide transcript" : "View transcript"}
                  {!latestCall.transcript && <span className="opacity-50"> (unavailable)</span>}
                </button>

                {showTranscript && (
                  <div className="mt-3 max-h-56 overflow-y-auto memo-scrollbar pl-1">
                    {transcriptLines.length > 0 ? (
                      <div className="space-y-1.5">
                        {transcriptLines.map((line, i) => (
                          <div key={i} className="flex gap-2 items-start">
                            <span className="shrink-0 mt-0.5 text-muted-foreground/50">
                              {line.role === "ai" ? <Bot className="w-3 h-3" /> : <User className="w-3 h-3" />}
                            </span>
                            <p className="text-[12px] leading-relaxed text-foreground/70">{line.text}</p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-[12px] text-foreground/60 leading-relaxed whitespace-pre-wrap">
                        {latestCall.transcript || "Transcript unavailable for this call."}
                      </p>
                    )}
                  </div>
                )}
              </>
            ) : (
              <p className="text-[13px] text-muted-foreground">No calls recorded yet.</p>
            )}
          </div>

          {/* Memories */}
          {memories.length > 0 && (
            <div className="flex-1">
              <div className="px-6 py-3 border-b border-border">
                <p className="text-[12px] font-medium text-muted-foreground">Memories</p>
              </div>
              <div className="divide-y divide-border">
                {memories.slice(0, 8).map((m, i) => (
                  <div key={i} className="px-6 py-3 flex gap-2.5 items-start">
                    <span className={`mt-1.5 w-1.5 h-1.5 rounded-full shrink-0 ${
                      m.sentiment === "positive" ? "bg-memo-green" :
                      m.sentiment === "negative" ? "bg-memo-red" : "bg-foreground/20"
                    }`} />
                    <div className="min-w-0">
                      <p className="text-[12px] text-foreground/70 leading-relaxed">{m.content}</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5 capitalize">{m.category}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </MemoLayout>
  );
}
