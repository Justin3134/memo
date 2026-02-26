import { useMemo, useState } from "react";
import { Phone, ChevronDown, ChevronRight, User, Bot, Eye, EyeOff, Link as LinkIcon } from "lucide-react";
import { Link } from "react-router-dom";
import {
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Area, AreaChart, ReferenceLine,
} from "recharts";
import { MemoLayout } from "@/components/memo/MemoLayout";
import { useMemoDashboardData } from "@/hooks/useMemoDashboardData";

const parseLines = (t: string) =>
  t.split("\n").map(l => l.trim()).filter(Boolean).map(l => {
    if (l.startsWith("AI:")) return { role: "ai" as const, text: l.slice(3).trim() };
    if (l.startsWith("User:")) return { role: "user" as const, text: l.slice(5).trim() };
    return { role: "user" as const, text: l };
  });

const scoreColor = (s: number) =>
  s >= 75 ? "text-memo-green" : s >= 60 ? "text-memo-amber" : "text-memo-red";

const scoreLabel = (s: number) =>
  s >= 75 ? "Stable" : s >= 60 ? "Watch" : "Alert";

export default function Dashboard() {
  const [activeMetric, setActiveMetric] = useState<"cognitive" | "motor" | "emotional">("cognitive");
  const [showTranscript, setShowTranscript] = useState(false);
  const [expandedCallId, setExpandedCallId] = useState<string | null>(null);
  const { loading, error, patient, calls, memories } = useMemoDashboardData();

  const chartData = useMemo(() =>
    [...calls].sort((a, b) => a.startedAt - b.startedAt).map(c => ({
      date: new Date(c.startedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      cognitive: Math.round(c.cognitiveScore ?? patient?.baseline?.cognitiveScore ?? 70),
      motor: Math.round(c.motorScore ?? patient?.baseline?.motorScore ?? 70),
      emotional: Math.round(c.emotionalScore ?? patient?.baseline?.emotionalScore ?? 70),
    })), [calls, patient?.baseline]);

  const latestCall = calls[0] ?? null;
  const latestScore = latestCall?.cognitiveScore ?? patient?.baseline?.cognitiveScore ?? 70;

  if (loading) return (
    <MemoLayout>
      <div className="p-8 text-[13px] text-muted-foreground">Loading dashboard…</div>
    </MemoLayout>
  );

  if (!patient) return (
    <MemoLayout>
      <div className="p-8 max-w-2xl">
        <h1 className="text-xl font-semibold text-foreground mb-1">Dashboard</h1>
        <p className="text-[13px] text-muted-foreground mb-6">No patient profile found. Set one up to get started.</p>
        <Link to="/onboarding"
          className="inline-flex items-center gap-1.5 text-[13px] font-medium bg-foreground text-background px-4 py-2 rounded-md hover:bg-foreground/90 transition-colors">
          Register a patient
        </Link>
      </div>
    </MemoLayout>
  );

  const metrics = [
    { key: "cognitive" as const, label: "Cognitive", value: Math.round(latestCall?.cognitiveScore ?? patient?.baseline?.cognitiveScore ?? 0), detail: latestCall?.speechRate ? `${Math.round(latestCall.speechRate)} wpm` : "—" },
    { key: "motor" as const, label: "Motor", value: Math.round(latestCall?.motorScore ?? patient?.baseline?.motorScore ?? 0), detail: latestCall?.pauseFrequency ? `${latestCall.pauseFrequency.toFixed(1)} pauses/min` : "—" },
    { key: "emotional" as const, label: "Emotional", value: Math.round(latestCall?.emotionalScore ?? patient?.baseline?.emotionalScore ?? 0), detail: memories[0] ? memories[0].sentiment : "—" },
  ];

  const metricColors: Record<string, string> = {
    cognitive: "hsl(240,10%,4%)",
    motor: "hsl(215,70%,50%)",
    emotional: "hsl(142,69%,38%)",
  };

  return (
    <MemoLayout>
      <div className="p-8 max-w-4xl animate-fade-in">

        {/* Header */}
        <div className="flex items-start justify-between mb-8">
          <div>
            <h1 className="text-xl font-semibold text-foreground tracking-tight">{patient.name}</h1>
            <p className="text-[13px] text-muted-foreground mt-0.5">
              {latestCall
                ? `Last call ${new Date(latestCall.startedAt).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}`
                : "No calls yet"}
            </p>
          </div>
          <div className="flex items-center gap-2.5">
            <span className={`text-[13px] font-medium tabular ${scoreColor(latestScore)}`}>
              {Math.round(latestScore)}/100
            </span>
            <span className={`text-[12px] px-2 py-0.5 rounded-full border ${
              latestScore >= 75
                ? "border-memo-green/30 text-memo-green bg-memo-green/5"
                : latestScore >= 60
                ? "border-memo-amber/30 text-memo-amber bg-memo-amber/5"
                : "border-memo-red/30 text-memo-red bg-memo-red/5"
            }`}>
              {scoreLabel(latestScore)}
            </span>
          </div>
        </div>

        {/* Score row */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          {metrics.map(m => (
            <button
              key={m.key}
              onClick={() => setActiveMetric(m.key)}
              className={`text-left p-4 bg-white border rounded-lg transition-all ${
                activeMetric === m.key ? "border-foreground/20 shadow-sm" : "border-border hover:border-foreground/10"
              }`}
            >
              <p className="text-[12px] text-muted-foreground mb-2">{m.label}</p>
              <p className={`text-3xl font-semibold tabular ${scoreColor(m.value)}`}>{m.value}</p>
              <p className="text-[12px] text-muted-foreground mt-1">{m.detail}</p>
            </button>
          ))}
        </div>

        {/* Chart */}
        <div className="bg-white border border-border rounded-lg p-5 mb-6">
          <div className="flex items-center justify-between mb-4">
            <p className="text-[13px] font-medium text-foreground">
              {activeMetric.charAt(0).toUpperCase() + activeMetric.slice(1)} trend
            </p>
            <div className="flex gap-1">
              {(["cognitive", "motor", "emotional"] as const).map(m => (
                <button
                  key={m}
                  onClick={() => setActiveMetric(m)}
                  className={`px-2.5 py-1 text-[12px] rounded-md transition-colors ${
                    activeMetric === m ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {m.charAt(0).toUpperCase() + m.slice(1)}
                </button>
              ))}
            </div>
          </div>
          {chartData.length < 2 ? (
            <div className="h-[180px] flex items-center justify-center text-[13px] text-muted-foreground">
              Not enough data yet — more calls will populate this chart.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={180}>
              <AreaChart data={chartData} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
                <defs>
                  <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={metricColors[activeMetric]} stopOpacity={0.1} />
                    <stop offset="100%" stopColor={metricColors[activeMetric]} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(240,6%,93%)" vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: "hsl(240,4%,56%)" }} tickLine={false} axisLine={false} interval={Math.max(1, Math.floor(chartData.length / 6))} />
                <YAxis domain={[40, 100]} tick={{ fontSize: 11, fill: "hsl(240,4%,56%)" }} tickLine={false} axisLine={false} ticks={[40,55,70,85,100]} />
                <ReferenceLine y={70} stroke="hsl(240,6%,85%)" strokeDasharray="4 2" />
                <Tooltip
                  contentStyle={{ fontSize: "12px", borderRadius: "6px", border: "1px solid hsl(240,6%,90%)", background: "#fff", boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}
                  labelStyle={{ color: "hsl(240,4%,46%)", marginBottom: 2 }}
                />
                <Area type="monotone" dataKey={activeMetric} stroke={metricColors[activeMetric]} strokeWidth={1.75} fill="url(#grad)" dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Latest call summary */}
        {latestCall && (
          <div className="bg-white border border-border rounded-lg p-5 mb-6">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Phone className="w-[14px] h-[14px] text-muted-foreground" strokeWidth={1.75} />
                <span className="text-[13px] font-medium text-foreground">Latest call</span>
                <span className="text-[12px] text-muted-foreground">
                  {new Date(latestCall.startedAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
                  {latestCall.duration ? ` · ${latestCall.duration}s` : ""}
                </span>
              </div>
              {latestCall.transcript && (
                <button
                  onClick={() => setShowTranscript(v => !v)}
                  className="flex items-center gap-1 text-[12px] text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showTranscript ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                  {showTranscript ? "Hide" : "Transcript"}
                </button>
              )}
            </div>
            <p className="text-[13px] text-foreground leading-relaxed">
              {latestCall.summary || "Analysis in progress…"}
            </p>

            {showTranscript && latestCall.transcript && (
              <div className="mt-4 border-t border-border pt-4 max-h-52 overflow-y-auto memo-scrollbar space-y-1.5">
                {parseLines(latestCall.transcript).map((line, i) => (
                  <div key={i} className="flex gap-2 items-start">
                    <span className="shrink-0 mt-0.5">
                      {line.role === "ai"
                        ? <Bot className="w-3 h-3 text-muted-foreground" />
                        : <User className="w-3 h-3 text-foreground/60" />
                      }
                    </span>
                    <p className="text-[12px] leading-relaxed text-foreground/80">{line.text}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Call history */}
        {calls.length > 1 && (
          <div className="bg-white border border-border rounded-lg">
            <div className="px-5 py-3.5 border-b border-border">
              <p className="text-[13px] font-medium text-foreground">Call history</p>
            </div>
            <div className="divide-y divide-border">
              {calls.slice(0, 8).map(call => (
                <div key={call._id} className="px-5 py-3">
                  <button
                    onClick={() => setExpandedCallId(expandedCallId === call._id ? null : call._id)}
                    className="w-full flex items-center gap-3 text-left"
                  >
                    <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                      (call.cognitiveScore ?? 70) >= 75 ? "bg-memo-green" :
                      (call.cognitiveScore ?? 70) >= 60 ? "bg-memo-amber" : "bg-memo-red"
                    }`} />
                    <span className="text-[13px] text-foreground flex-1">
                      {new Date(call.startedAt).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
                    </span>
                    <span className={`text-[13px] tabular font-medium ${scoreColor(call.cognitiveScore ?? 70)}`}>
                      {Math.round(call.cognitiveScore ?? 70)}
                    </span>
                    <span className="text-[12px] text-muted-foreground w-16 text-right">
                      {call.duration ? `${call.duration}s` : "—"}
                    </span>
                    {expandedCallId === call._id
                      ? <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
                      : <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
                    }
                  </button>
                  {expandedCallId === call._id && call.summary && (
                    <p className="mt-2 ml-5 text-[12px] text-muted-foreground leading-relaxed">
                      {call.summary}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Memories strip */}
        {memories.length > 0 && (
          <div className="mt-6 bg-white border border-border rounded-lg p-5">
            <p className="text-[13px] font-medium text-foreground mb-3">Recent memories</p>
            <div className="space-y-2">
              {memories.slice(0, 3).map((m, i) => (
                <div key={i} className="flex gap-3 items-start">
                  <span className={`mt-1 w-1.5 h-1.5 rounded-full shrink-0 ${
                    m.sentiment === "positive" ? "bg-memo-green" : m.sentiment === "negative" ? "bg-memo-red" : "bg-muted-foreground/40"
                  }`} />
                  <p className="text-[13px] text-foreground/80 leading-relaxed">{m.content}</p>
                  <span className="ml-auto shrink-0 text-[11px] text-muted-foreground capitalize">{m.category}</span>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </MemoLayout>
  );
}
