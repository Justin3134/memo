import { useMemo, useState } from "react";
import { Phone, ArrowRight, Eye, EyeOff, User, Bot, ChevronDown, ChevronRight, Clock } from "lucide-react";
import { Link } from "react-router-dom";
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart,
  ComposedChart,
  ReferenceLine,
} from "recharts";
import { MemoLayout } from "@/components/memo/MemoLayout";
import { useMemoDashboardData } from "@/hooks/useMemoDashboardData";

const parseTranscriptLines = (transcript: string) => {
  return transcript
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      if (line.startsWith("AI:")) return { role: "ai" as const, text: line.slice(3).trim() };
      if (line.startsWith("User:")) return { role: "user" as const, text: line.slice(5).trim() };
      return { role: "user" as const, text: line };
    });
};

const Dashboard = () => {
  const [activeMetric, setActiveMetric] = useState<"cognitive" | "motor" | "emotional">("cognitive");
  const [showTranscript, setShowTranscript] = useState(false);
  const [expandedCallId, setExpandedCallId] = useState<string | null>(null);
  const { loading, error, patient, calls, memories } = useMemoDashboardData();

  const chartData = useMemo(() => {
    return [...calls]
      .sort((a, b) => a.startedAt - b.startedAt)
      .map((call) => ({
        date: new Date(call.startedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        cognitive: Math.round(
          call.cognitiveScore ??
            patient?.baseline?.cognitiveScore ??
            (call.status === "completed" ? 72 : 70),
        ),
        motor: Math.round(call.motorScore ?? patient?.baseline?.motorScore ?? 70),
        emotional: Math.round(call.emotionalScore ?? patient?.baseline?.emotionalScore ?? 70),
      }));
  }, [calls, patient?.baseline]);

  const latestCall = useMemo(() => calls[0] ?? null, [calls]);
  const latestScore = latestCall?.cognitiveScore ?? patient?.baseline?.cognitiveScore ?? 70;
  const statusLabel = latestScore >= 75 ? "Stable" : latestScore >= 60 ? "Watch" : "Alert";
  const statusColor =
    latestScore >= 75
      ? "bg-memo-green text-background"
      : latestScore >= 60
      ? "bg-memo-amber text-background"
      : "bg-memo-red text-background";

  const lastCallSummary = latestCall?.summary ?? "No call summary available yet.";
  const lastCallTimeLabel = latestCall
    ? `${new Date(latestCall.startedAt).toLocaleTimeString([], {
        hour: "numeric",
        minute: "2-digit",
      })} · ${(latestCall.duration ?? 0)}s`
    : "No call logged yet";

  const metricCards = [
    {
      label: "Cognitive",
      score: Math.round(latestCall?.cognitiveScore ?? patient?.baseline?.cognitiveScore ?? 0),
      sub: latestCall?.speechRate
        ? `Speech rate: ${Math.round(latestCall.speechRate)} wpm`
        : "Waiting for a completed call",
    },
    {
      label: "Motor",
      score: Math.round(latestCall?.motorScore ?? patient?.baseline?.motorScore ?? 0),
      sub: latestCall?.pauseFrequency
        ? `Pause frequency: ${latestCall.pauseFrequency.toFixed(1)}/min`
        : "Motor trend needs at least one analysis",
    },
    {
      label: "Emotional",
      score: Math.round(latestCall?.emotionalScore ?? patient?.baseline?.emotionalScore ?? 0),
      sub: memories[0]
        ? `Latest memory: ${memories[0].category} · ${memories[0].sentiment}`
        : "Collecting emotional baseline",
    },
  ];

  if (loading) {
    return (
      <MemoLayout>
        <div className="max-w-4xl mx-auto animate-fade-in-up space-y-4 text-sm text-muted-foreground">
          Loading live dashboard data...
        </div>
      </MemoLayout>
    );
  }

  if (error) {
    return (
      <MemoLayout>
        <div className="max-w-4xl mx-auto animate-fade-in-up">
          <p className="text-sm text-memo-red">Unable to load live data: {error}</p>
        </div>
      </MemoLayout>
    );
  }

  if (!patient) {
    return (
      <MemoLayout>
        <div className="max-w-4xl mx-auto animate-fade-in-up space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-lg font-display text-foreground tracking-tight">Dashboard</h1>
              <p className="text-[11px] text-muted-foreground">Framework mode: no patient profile yet.</p>
            </div>
            <span className="px-2.5 py-1 rounded text-[10px] font-semibold uppercase tracking-wide bg-muted text-muted-foreground">Setup Needed</span>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {["Cognitive", "Motor", "Emotional"].map((label) => (
              <div key={label} className="border border-border rounded-lg p-3 bg-card">
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1">{label}</p>
                <p className="text-xl font-display text-foreground">--<span className="text-[11px] text-muted-foreground font-body">/100</span></p>
                <p className="text-[11px] text-muted-foreground mt-1 leading-snug">No live data yet.</p>
              </div>
            ))}
          </div>
          <Link to="/onboarding" className="inline-flex items-center gap-1 text-[12px] font-medium text-foreground hover:underline">
            Register a patient
          </Link>
        </div>
      </MemoLayout>
    );
  }

  return (
    <MemoLayout>
      <div className="max-w-4xl mx-auto animate-fade-in-up space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-display text-foreground tracking-tight">{patient.name}</h1>
            <p className="text-[11px] text-muted-foreground">{lastCallTimeLabel}</p>
          </div>
          <span className={`px-2.5 py-1 rounded text-[10px] font-semibold uppercase tracking-wide ${statusColor}`}>{statusLabel}</span>
        </div>

        {/* Main Chart */}
        <div className="border border-border rounded-lg p-4 bg-card">
          <div className="flex items-center justify-between mb-3">
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Cognitive Stability Index — 30 Days</p>
            <div className="flex gap-0.5">
              {(["cognitive", "motor", "emotional"] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => setActiveMetric(m)}
                  className={`px-2 py-0.5 text-[10px] font-medium rounded transition-colors ${
                    activeMetric === m ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {m.charAt(0).toUpperCase() + m.slice(1)}
                </button>
              ))}
            </div>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <ComposedChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(0, 0%, 8%)" stopOpacity={0.08} />
                  <stop offset="100%" stopColor="hsl(0, 0%, 8%)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(0, 0%, 92%)" vertical={false} />
              <XAxis dataKey="date" tick={{ fontSize: 9, fill: "hsl(0, 0%, 50%)" }} tickLine={false} axisLine={false} interval={5} />
              <YAxis domain={[40, 100]} tick={{ fontSize: 9, fill: "hsl(0, 0%, 50%)" }} tickLine={false} axisLine={false} />
              <ReferenceLine y={70} stroke="hsl(0, 0%, 80%)" strokeDasharray="4 4" label={{ value: "Baseline", position: "right", fontSize: 9, fill: "hsl(0, 0%, 60%)" }} />
              <Tooltip contentStyle={{ fontSize: "11px", borderRadius: "4px", border: "1px solid hsl(0,0%,90%)", background: "hsl(0,0%,100%)" }} />
              <Area type="monotone" dataKey={activeMetric} stroke="hsl(0, 0%, 8%)" strokeWidth={1.5} fill="url(#areaGrad)" />
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        {/* Three Metric Cards */}
        <div className="grid grid-cols-3 gap-3">
          {metricCards.map((m) => (
            <div key={m.label} className="border border-border rounded-lg p-3 bg-card">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1">{m.label}</p>
              <p className="text-xl font-display text-foreground">{m.score}<span className="text-[11px] text-muted-foreground font-body">/100</span></p>
              <p className="text-[11px] text-muted-foreground mt-1 leading-snug">{m.sub}</p>
            </div>
          ))}
        </div>

        {/* Latest Call */}
        <div className="border border-border rounded-lg p-4 bg-card">
          <div className="flex items-center gap-2 mb-2">
            <Phone className="w-3.5 h-3.5 text-foreground" />
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Latest Call</p>
            <span className="ml-auto text-[11px] text-muted-foreground">{lastCallTimeLabel}</span>
          </div>
          <p className="text-[13px] text-foreground leading-relaxed mb-3">
            {lastCallSummary}
          </p>
          <div className="flex flex-wrap gap-2 mb-3">
            {[
              { label: "Pause Freq", value: `${latestCall?.pauseFrequency?.toFixed(1) ?? "-"}/min`, baseline: `${patient?.baseline?.pauseFrequency?.toFixed(1) ?? "-"}`, warn: !!latestCall && latestCall.pauseFrequency ? latestCall.pauseFrequency > (patient?.baseline?.pauseFrequency ?? 0) + 1.0 : false },
              { label: "Speech Rate", value: `${Math.round(latestCall?.speechRate ?? 0)} wpm`, baseline: `${Math.round(patient?.baseline?.speechRate ?? 0)}`, warn: false },
              { label: "Latency", value: `${latestCall?.responseLatency?.toFixed(1) ?? "-"} s`, baseline: `${patient?.baseline?.responseLatency?.toFixed(1) ?? "-"}`, warn: false },
            ].map((m) => (
              <span key={m.label} className={`px-2 py-1 rounded text-[10px] font-medium ${m.warn ? "bg-memo-amber/10 text-memo-amber" : "bg-muted text-muted-foreground"}`}>
                {m.label}: {m.value} vs {m.baseline}
              </span>
            ))}
          </div>

          {/* Transcript toggle */}
          {latestCall?.transcript && (
            <div className="mb-3">
              <button
                onClick={() => setShowTranscript((v) => !v)}
                className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                {showTranscript ? <><EyeOff className="w-3.5 h-3.5" /> Hide conversation</> : <><Eye className="w-3.5 h-3.5" /> View conversation</>}
              </button>
              {showTranscript && (
                <div className="mt-3 border border-border rounded-lg overflow-hidden">
                  <div className="bg-muted/40 px-3 py-2 flex items-center justify-between border-b border-border">
                    <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Conversation transcript</p>
                    <p className="text-[10px] text-muted-foreground">{latestCall.duration ?? 0}s</p>
                  </div>
                  <div className="p-3 space-y-2.5 max-h-72 overflow-y-auto">
                    {parseTranscriptLines(latestCall.transcript).map((line, i) => (
                      <div key={i} className={`flex gap-2 ${line.role === "ai" ? "" : "flex-row-reverse"}`}>
                        <div className={`w-5 h-5 rounded-full flex-shrink-0 flex items-center justify-center mt-0.5 ${line.role === "ai" ? "bg-foreground/10" : "bg-primary/10"}`}>
                          {line.role === "ai" ? <Bot className="w-2.5 h-2.5 text-foreground/60" /> : <User className="w-2.5 h-2.5 text-primary/60" />}
                        </div>
                        <div className={`max-w-[80%] px-3 py-1.5 rounded-lg text-[12px] leading-relaxed ${line.role === "ai" ? "bg-muted text-foreground rounded-tl-none" : "bg-primary/10 text-foreground rounded-tr-none"}`}>
                          {line.text}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          <Link to="/health-signals" className="flex items-center gap-1 text-[12px] font-medium text-foreground hover:underline">
            View Health Signals <ArrowRight className="w-3 h-3" />
          </Link>
        </div>

        {/* All Conversations */}
        {calls.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">All Conversations</p>
              <span className="text-[10px] text-muted-foreground">{calls.length} call{calls.length !== 1 ? "s" : ""}</span>
            </div>
            <div className="space-y-2">
              {calls.map((call) => {
                const isOpen = expandedCallId === call._id;
                const cogScore = call.cognitiveScore ?? null;
                const scoreColor = cogScore === null ? "text-muted-foreground" : cogScore >= 75 ? "text-memo-green" : cogScore >= 60 ? "text-memo-amber" : "text-memo-red";
                const callDate = new Date(call.startedAt).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
                const callTime = new Date(call.startedAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });

                return (
                  <div key={call._id} className="border border-border rounded-lg bg-card overflow-hidden">
                    <button
                      onClick={() => setExpandedCallId(isOpen ? null : call._id)}
                      className="w-full flex items-center gap-3 p-3.5 text-left hover:bg-muted/30 transition-colors"
                    >
                      <div className="w-8 h-8 rounded-full bg-secondary flex-shrink-0 flex items-center justify-center">
                        <Phone className="w-3.5 h-3.5 text-muted-foreground" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <p className="text-[12px] font-medium text-foreground">{callDate}</p>
                          <span className="text-[10px] text-muted-foreground">{callTime}</span>
                          {call.anomalyDetected && (
                            <span className="text-[9px] px-1.5 py-0.5 rounded bg-memo-amber/10 text-memo-amber font-semibold">Signal detected</span>
                          )}
                        </div>
                        <p className="text-[11px] text-muted-foreground truncate pr-4">
                          {call.summary ?? "Call completed — analysis pending."}
                        </p>
                      </div>
                      <div className="flex items-center gap-3 flex-shrink-0">
                        {cogScore !== null && (
                          <span className={`text-[12px] font-semibold ${scoreColor}`}>{Math.round(cogScore)}</span>
                        )}
                        <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                          <Clock className="w-3 h-3" />
                          {call.duration ?? 0}s
                        </div>
                        {isOpen ? <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" /> : <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />}
                      </div>
                    </button>

                    {isOpen && (
                      <div className="border-t border-border px-4 py-4 space-y-4">
                        {/* Summary */}
                        {call.summary && (
                          <p className="text-[13px] text-foreground leading-relaxed">{call.summary}</p>
                        )}

                        {/* Metrics row */}
                        <div className="flex flex-wrap gap-2">
                          {cogScore !== null && (
                            <span className="px-2 py-1 rounded text-[10px] font-medium bg-muted text-muted-foreground">
                              Cognitive: {Math.round(cogScore)}
                            </span>
                          )}
                          {call.emotionalScore != null && (
                            <span className="px-2 py-1 rounded text-[10px] font-medium bg-muted text-muted-foreground">
                              Emotional: {Math.round(call.emotionalScore)}
                            </span>
                          )}
                          {call.motorScore != null && (
                            <span className="px-2 py-1 rounded text-[10px] font-medium bg-muted text-muted-foreground">
                              Motor: {Math.round(call.motorScore)}
                            </span>
                          )}
                          {call.speechRate != null && (
                            <span className="px-2 py-1 rounded text-[10px] font-medium bg-muted text-muted-foreground">
                              Speech: {Math.round(call.speechRate)} wpm
                            </span>
                          )}
                        </div>

                        {/* Health mentions */}
                        {call.healthMentions && call.healthMentions.length > 0 && (
                          <div>
                            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Health mentions</p>
                            <div className="flex flex-wrap gap-1.5">
                              {call.healthMentions.map((m, i) => (
                                <span key={i} className="px-2 py-0.5 rounded-full bg-secondary text-[11px] text-muted-foreground">{m}</span>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Transcript */}
                        {call.transcript && (
                          <div className="border border-border rounded-lg overflow-hidden">
                            <div className="bg-muted/40 px-3 py-2 flex items-center justify-between border-b border-border">
                              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Transcript</p>
                              <p className="text-[10px] text-muted-foreground">{call.duration ?? 0}s</p>
                            </div>
                            <div className="p-3 space-y-2.5 max-h-64 overflow-y-auto">
                              {parseTranscriptLines(call.transcript).map((line, i) => (
                                <div key={i} className={`flex gap-2 ${line.role === "ai" ? "" : "flex-row-reverse"}`}>
                                  <div className={`w-5 h-5 rounded-full flex-shrink-0 flex items-center justify-center mt-0.5 ${line.role === "ai" ? "bg-foreground/10" : "bg-primary/10"}`}>
                                    {line.role === "ai" ? <Bot className="w-2.5 h-2.5 text-foreground/60" /> : <User className="w-2.5 h-2.5 text-primary/60" />}
                                  </div>
                                  <div className={`max-w-[80%] px-3 py-1.5 rounded-lg text-[12px] leading-relaxed ${line.role === "ai" ? "bg-muted text-foreground rounded-tl-none" : "bg-primary/10 text-foreground rounded-tr-none"}`}>
                                    {line.text}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </MemoLayout>
  );
};

export default Dashboard;
