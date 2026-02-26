import { MemoLayout } from "@/components/memo/MemoLayout";
import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { XAxis, YAxis, ResponsiveContainer, Area, AreaChart } from "recharts";
import { useMemoDashboardData } from "@/hooks/useMemoDashboardData";
import { ArrowUpRight, RotateCcw } from "lucide-react";

// Map internal signal types to plain English
const signalLabel = (s: string) => {
  const map: Record<string, string> = {
    composite: "multiple signals",
    word_finding_decline: "word finding",
    word_finding_difficulty: "word finding",
    memory_gaps: "memory gaps",
    memory_lapse: "memory lapse",
    emotional_distress: "emotional distress",
    cognitive_decline: "cognitive decline",
    physical_concern: "physical concern",
    loneliness_indicator: "loneliness",
    confusion_indicator: "confusion",
    sleep_problem: "sleep issues",
  };
  return map[s] ?? s.replace(/_/g, " ");
};

// Extract a short first-sentence summary from description
const shortSummary = (desc: string): string => {
  if (!desc) return "";
  const first = desc.split(/\.\s+/)[0];
  return first.length > 120 ? first.slice(0, 117) + "…" : first + ".";
};

const severityDot = (s: string) =>
  s === "high" ? "bg-memo-red" : s === "medium" ? "bg-memo-amber" : "bg-memo-green";
const severityTextColor = (s: string) =>
  s === "high" ? "text-memo-red" : s === "medium" ? "text-memo-amber" : "text-memo-green";

export default function HealthSignals() {
  const navigate = useNavigate();
  const { loading, patient, calls, alerts, memories } = useMemoDashboardData();
  // dismissed = grayed out, not removed
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [selectedDay, setSelectedDay] = useState<number | null>(null);

  const sortedCalls = useMemo(() => [...calls].sort((a, b) => a.startedAt - b.startedAt), [calls]);

  const timeline = useMemo(() => {
    const baseline = patient?.baseline?.cognitiveScore ?? 70;
    return sortedCalls.slice(-30).map((call, index) => {
      const score = Math.max(40, Math.min(100, Math.round(call.cognitiveScore ?? baseline)));
      return { index, call,
               date: new Date(call.startedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
               score, status: score < 55 ? "alert" : score < 70 ? "watch" : "ok" };
    });
  }, [sortedCalls, patient?.baseline?.cognitiveScore]);

  const selectedCall = selectedDay !== null ? timeline[selectedDay]?.call : null;
  const latestCall = calls[0];

  const signalCharts = useMemo(() => {
    const r = sortedCalls.slice(-20);
    return [
      { title: "Speech Rate", unit: "wpm", data: r.map((c, i) => ({ i: i + 1, v: Math.round(c.speechRate ?? 130) })) },
      { title: "Pauses", unit: "/min", data: r.map((c, i) => ({ i: i + 1, v: +(c.pauseFrequency ?? 3.1).toFixed(1) })) },
      { title: "Emotional", unit: "/100", data: r.map((c, i) => ({ i: i + 1, v: Math.round(c.emotionalScore ?? 80) })) },
    ];
  }, [sortedCalls]);

  const toggleDismiss = (id: string) => {
    setDismissed(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  if (loading) return (
    <MemoLayout><div className="p-8 text-[13px] text-muted-foreground">Loading…</div></MemoLayout>
  );
  if (!patient) return (
    <MemoLayout>
      <div className="p-8">
        <p className="text-[13px] text-muted-foreground mb-3">No patient found.</p>
        <Link to="/onboarding" className="text-[13px] font-medium underline underline-offset-2">Add patient</Link>
      </div>
    </MemoLayout>
  );

  const activeAlerts = alerts.filter(a => !dismissed.has(a._id));

  return (
    <MemoLayout>
      <div className="flex h-full">

        {/* ── Left: heatmap + alerts + conversation signals ── */}
        <div className="flex-1 min-w-0 flex flex-col overflow-auto">

          {/* Header */}
          <div className="flex items-center justify-between px-8 pt-7 pb-5 border-b border-border">
            <div>
              <h1 className="text-[15px] font-semibold text-foreground">Signals</h1>
              <p className="text-[12px] text-muted-foreground mt-0.5">
                {calls.length} {calls.length === 1 ? "call" : "calls"} analysed
                {activeAlerts.length > 0 && (
                  <> · <span className="text-memo-amber">{activeAlerts.length} active</span></>
                )}
                {activeAlerts.length === 0 && alerts.length > 0 && (
                  <> · <span className="text-memo-green">all reviewed</span></>
                )}
              </p>
            </div>
          </div>

          {/* 30-day heatmap — first */}
          <div className="px-8 py-5 border-b border-border">
            <p className="text-[11px] font-medium text-muted-foreground mb-3 uppercase tracking-wide">
              30-day heatmap
            </p>
            {timeline.length === 0 ? (
              <p className="text-[12px] text-muted-foreground">Appears after the first call.</p>
            ) : (
              <>
                <div className="flex gap-[3px]">
                  {timeline.map(day => {
                    const isOk = day.status === "ok";
                    const greenL = isOk ? Math.round(88 - Math.max(0, day.score - 70) * 0.7) : 0;
                    return (
                      <button
                        key={day.index}
                        onClick={() => setSelectedDay(selectedDay === day.index ? null : day.index)}
                        title={`${day.date}: ${day.score}/100`}
                        style={isOk ? { backgroundColor: `hsl(142,52%,${greenL}%)` } : undefined}
                        className={`flex-1 h-7 rounded-sm transition-all ${
                          day.status === "alert" ? "bg-memo-red/75" :
                          day.status === "watch" ? "bg-memo-amber/65" : ""
                        } ${selectedDay === day.index ? "ring-1 ring-offset-1 ring-foreground/40" : "hover:opacity-75"}`}
                      />
                    );
                  })}
                </div>
                <div className="flex justify-between mt-1.5">
                  <span className="text-[10px] text-muted-foreground">{timeline[0]?.date}</span>
                  <span className="text-[10px] text-muted-foreground">Today</span>
                </div>
              </>
            )}

            {selectedDay !== null && timeline[selectedDay] && (
              <div className="mt-3 flex items-center gap-3">
                <span className="text-[13px] font-medium text-foreground">{timeline[selectedDay].date}</span>
                <span className="text-[13px] tabular text-muted-foreground">{timeline[selectedDay].score}/100</span>
                {timeline[selectedDay].status !== "ok" && (
                  <span className={`text-[12px] ${timeline[selectedDay].status === "alert" ? "text-memo-red" : "text-memo-amber"}`}>
                    {timeline[selectedDay].status === "alert" ? "significant change" : "minor deviation"}
                  </span>
                )}
                {selectedCall?.healthMentions?.map((m, i) => (
                  <span key={i} className="text-[11px] text-muted-foreground bg-muted px-2 py-0.5 rounded">{m}</span>
                ))}
              </div>
            )}
          </div>

          {/* Active alerts */}
          {alerts.length > 0 && (
            <div className="px-8 py-5 border-b border-border">
              <p className="text-[11px] font-medium text-muted-foreground mb-3 uppercase tracking-wide">
                Alerts
                {alerts.filter(a => !dismissed.has(a._id)).length === 0 && alerts.length > 0 && (
                  <span className="ml-2 normal-case font-normal text-memo-green">all reviewed</span>
                )}
              </p>

              {/* Active (not reviewed) */}
              <div className="space-y-2.5">
                {alerts.slice(0, 6).filter(a => !dismissed.has(a._id)).map(alert => {
                  const label = signalLabel(alert.signalType ?? "");
                  const summary = shortSummary(alert.description ?? "");
                  const quotes = alert.evidenceQuotes ?? [];
                  return (
                    <div key={alert._id} className="rounded-lg border border-border bg-white">
                      <div className="flex items-center gap-2.5 px-4 pt-3 pb-2">
                        <span className={`w-2 h-2 rounded-full shrink-0 ${severityDot(alert.severity)}`} />
                        <span className="text-[13px] font-medium text-foreground capitalize flex-1">{label}</span>
                        <span className="text-[11px] text-muted-foreground">
                          {new Date(alert.timestamp ?? 0).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                        </span>
                        <span className={`text-[11px] font-medium capitalize ${severityTextColor(alert.severity)}`}>
                          {alert.severity}
                        </span>
                      </div>
                      <div className="px-4 pb-2">
                        <p className="text-[12px] text-foreground/80 leading-relaxed">{summary}</p>
                      </div>
                      {quotes.length > 0 && (
                        <div className="mx-4 mb-3 pl-2.5 border-l-2 border-border">
                          {quotes.slice(0, 2).map((q, i) => (
                            <p key={i} className="text-[11px] text-muted-foreground italic leading-relaxed">{q}</p>
                          ))}
                        </div>
                      )}
                      <div className="flex items-center gap-2 px-4 pb-3 border-t border-border/50 pt-2.5">
                        <button
                          onClick={() => navigate(`/care?signal=${alert.signalType}&desc=${encodeURIComponent(alert.description ?? "")}`)}
                          className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
                        >
                          <ArrowUpRight className="w-3 h-3" /> Find care
                        </button>
                        <div className="flex-1" />
                        <button
                          onClick={() => toggleDismiss(alert._id)}
                          className="text-[11px] text-muted-foreground/60 hover:text-muted-foreground transition-colors"
                        >
                          mark reviewed
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Reviewed — at the bottom, subtle */}
              {alerts.slice(0, 6).some(a => dismissed.has(a._id)) && (
                <div className="mt-4 pt-4 border-t border-border/50">
                  <p className="text-[10px] text-muted-foreground/60 uppercase tracking-wide mb-2">Reviewed</p>
                  <div className="space-y-1.5">
                    {alerts.slice(0, 6).filter(a => dismissed.has(a._id)).map(alert => (
                      <div key={alert._id} className="flex items-center gap-2.5 px-3 py-2 rounded-md bg-muted/40">
                        <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/30 shrink-0" />
                        <span className="text-[12px] text-muted-foreground/60 capitalize flex-1">
                          {signalLabel(alert.signalType ?? "")}
                        </span>
                        <span className="text-[10px] text-muted-foreground/50">
                          {new Date(alert.timestamp ?? 0).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                        </span>
                        <button
                          onClick={() => toggleDismiss(alert._id)}
                          className="flex items-center gap-1 text-[10px] text-muted-foreground/50 hover:text-muted-foreground transition-colors"
                        >
                          <RotateCcw className="w-2.5 h-2.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Conversation signals from latest call */}
          {latestCall?.conversationSignals && latestCall.conversationSignals.length > 0 && (
            <div className="px-8 py-5">
              <p className="text-[11px] font-medium text-muted-foreground mb-3 uppercase tracking-wide">
                Conversation signals ·{" "}
                <span className="font-normal normal-case">
                  {new Date(latestCall.startedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                </span>
              </p>
              <div className="space-y-2">
                {latestCall.conversationSignals.map((sig, i) => (
                  <div key={i} className="bg-white border border-border rounded-lg">
                    <div className="flex items-center gap-2.5 px-4 pt-3 pb-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-foreground/20 shrink-0" />
                      <p className="text-[12px] font-medium text-foreground capitalize">
                        {sig.signal.replace(/_/g, " ")}
                      </p>
                    </div>
                    <div className="px-4 pb-1.5 pl-8">
                      <p className="text-[11px] text-muted-foreground italic mb-1">"{sig.quote}"</p>
                    </div>
                    <div className="px-4 pb-3 pl-8">
                      <p className="text-[12px] text-foreground/65 leading-relaxed">{sig.explanation}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ── Right: signal charts + memories ── */}
        <div className="w-[240px] shrink-0 border-l border-border overflow-auto">
          <div className="p-6 border-b border-border">
            <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide mb-5">Signal trends</p>
            <div className="space-y-6">
              {signalCharts.map(chart => (
                <div key={chart.title}>
                  <div className="flex items-baseline justify-between mb-1">
                    <p className="text-[12px] font-medium text-foreground">{chart.title}</p>
                    <span className="text-[10px] text-muted-foreground">{chart.unit}</span>
                  </div>
                  {chart.data.length >= 2 ? (
                    <>
                      <p className="text-[22px] font-semibold tabular text-foreground leading-none mb-1.5">
                        {chart.data[chart.data.length - 1]?.v ?? "—"}
                      </p>
                      <ResponsiveContainer width="100%" height={44}>
                        <AreaChart data={chart.data} margin={{ top: 2, right: 0, left: -32, bottom: 0 }}>
                          <defs>
                            <linearGradient id={`g-${chart.title}`} x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="hsl(240,10%,4%)" stopOpacity={0.06} />
                              <stop offset="100%" stopColor="hsl(240,10%,4%)" stopOpacity={0} />
                            </linearGradient>
                          </defs>
                          <Area type="monotone" dataKey="v" stroke="hsl(240,10%,15%)" strokeWidth={1.25}
                            fill={`url(#g-${chart.title})`} dot={false} />
                        </AreaChart>
                      </ResponsiveContainer>
                    </>
                  ) : (
                    <p className="text-[11px] text-muted-foreground">Awaiting data</p>
                  )}
                </div>
              ))}
            </div>
          </div>

          {memories.length > 0 && (
            <div className="p-6">
              <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide mb-4">Memories</p>
              <div className="space-y-3">
                {memories.slice(0, 6).map((m, i) => (
                  <div key={i} className="flex gap-2.5 items-start">
                    <span className={`mt-1 w-1.5 h-1.5 rounded-full shrink-0 ${
                      m.sentiment === "positive" ? "bg-memo-green" :
                      m.sentiment === "negative" ? "bg-memo-red" : "bg-foreground/15"
                    }`} />
                    <p className="text-[12px] text-foreground/65 leading-relaxed">{m.content}</p>
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
