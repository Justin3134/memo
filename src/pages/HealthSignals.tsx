import { MemoLayout } from "@/components/memo/MemoLayout";
import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { XAxis, YAxis, ResponsiveContainer, Area, AreaChart } from "recharts";
import { useMemoDashboardData } from "@/hooks/useMemoDashboardData";
import { ArrowUpRight } from "lucide-react";

const severityDot = (s: string) =>
  s === "high" ? "bg-memo-red" : s === "medium" ? "bg-memo-amber" : "bg-memo-green";
const severityText = (s: string) =>
  s === "high" ? "text-memo-red" : s === "medium" ? "text-memo-amber" : "text-memo-green";

export default function HealthSignals() {
  const navigate = useNavigate();
  const { loading, patient, calls, alerts, memories } = useMemoDashboardData();
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [selectedDay, setSelectedDay] = useState<number | null>(null);

  const sortedCalls = useMemo(() => [...calls].sort((a, b) => a.startedAt - b.startedAt), [calls]);

  const timeline = useMemo(() => {
    const baseline = patient?.baseline?.cognitiveScore ?? 70;
    return sortedCalls.slice(-30).map((call, index) => {
      const score = Math.max(40, Math.min(100, Math.round(call.cognitiveScore ?? baseline)));
      return { index, call, date: new Date(call.startedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
               score, status: score < 55 ? "alert" : score < 70 ? "watch" : "ok" };
    });
  }, [sortedCalls, patient?.baseline?.cognitiveScore]);

  const selectedCall = selectedDay !== null ? timeline[selectedDay]?.call : null;
  const latestCall = calls[0];

  const signalCharts = useMemo(() => {
    const r = sortedCalls.slice(-20);
    return [
      { title: "Speech Rate", unit: "wpm", key: "speechRate" as const, data: r.map((c, i) => ({ i: i + 1, v: Math.round(c.speechRate ?? 130) })) },
      { title: "Pause Frequency", unit: "per min", key: "pauseFrequency" as const, data: r.map((c, i) => ({ i: i + 1, v: +(c.pauseFrequency ?? 3.1).toFixed(1) })) },
      { title: "Emotional Tone", unit: "/ 100", key: "emotionalScore" as const, data: r.map((c, i) => ({ i: i + 1, v: Math.round(c.emotionalScore ?? 80) })) },
    ];
  }, [sortedCalls]);

  const activeAlerts = alerts.filter(a => !dismissed.has(a._id));

  const dismiss = (id: string) => {
    setDismissed(s => new Set(s).add(id));
    setTimeout(() => {
      setDismissed(s => { const n = new Set(s); n.delete(id); return n; });
    }, 4000);
  };

  if (loading) return (
    <MemoLayout><div className="p-8 text-[13px] text-muted-foreground">Loading…</div></MemoLayout>
  );

  if (!patient) return (
    <MemoLayout>
      <div className="p-8">
        <p className="text-[13px] text-muted-foreground mb-3">No patient found.</p>
        <Link to="/onboarding" className="text-[13px] font-medium text-foreground underline underline-offset-2">Add patient</Link>
      </div>
    </MemoLayout>
  );

  const alertCount = activeAlerts.length;

  return (
    <MemoLayout>
      <div className="flex gap-0 min-h-screen">

        {/* ── Left: heatmap + alerts + signals ── */}
        <div className="flex-1 min-w-0 p-8 border-r border-border">

          {/* Header */}
          <div className="mb-6">
            <h1 className="text-[17px] font-semibold text-foreground tracking-tight">Signals</h1>
            <p className="text-[12px] text-muted-foreground mt-0.5">
              {patient.name} · {calls.length} {calls.length === 1 ? "call" : "calls"}
              {alertCount > 0 && (
                <> · <span className="text-memo-amber">{alertCount} active {alertCount === 1 ? "alert" : "alerts"}</span></>
              )}
            </p>
          </div>

          {/* 30-day heatmap — FIRST */}
          <div className="mb-6">
            <p className="text-[12px] font-medium text-muted-foreground mb-2.5">30-day cognitive heatmap</p>
            {timeline.length === 0 ? (
              <div className="h-10 flex items-center">
                <p className="text-[12px] text-muted-foreground">No calls yet — heatmap will appear after the first call.</p>
              </div>
            ) : (
              <>
                <div className="flex gap-[3px]">
                  {timeline.map(day => {
                    const isOk = day.status === "ok";
                    const greenIntensity = isOk ? Math.round(88 - (day.score - 70) * 0.8) : 0;
                    return (
                      <button
                        key={day.index}
                        onClick={() => setSelectedDay(selectedDay === day.index ? null : day.index)}
                        title={`${day.date}: ${day.score}/100`}
                        style={isOk ? { backgroundColor: `hsl(142,55%,${greenIntensity}%)` } : undefined}
                        className={`flex-1 h-7 rounded-sm transition-all ${
                          day.status === "alert" ? "bg-memo-red/75" :
                          day.status === "watch" ? "bg-memo-amber/65" : ""
                        } ${selectedDay === day.index ? "ring-1 ring-offset-1 ring-foreground/40" : "hover:opacity-80"}`}
                      />
                    );
                  })}
                </div>
                <div className="flex justify-between mt-1.5 mb-1">
                  <span className="text-[10px] text-muted-foreground">{timeline[0]?.date}</span>
                  <span className="text-[10px] text-muted-foreground">Today</span>
                </div>
              </>
            )}

            {/* Selected day drill-down */}
            {selectedDay !== null && timeline[selectedDay] && (
              <div className="mt-3 p-3.5 bg-white border border-border rounded-lg">
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-[13px] font-medium text-foreground">{timeline[selectedDay].date}</span>
                  <span className="text-[13px] tabular text-muted-foreground">{timeline[selectedDay].score}/100</span>
                  {timeline[selectedDay].status !== "ok" && (
                    <span className={`text-[12px] ${timeline[selectedDay].status === "alert" ? "text-memo-red" : "text-memo-amber"}`}>
                      {timeline[selectedDay].status === "alert" ? "significant change" : "minor deviation"}
                    </span>
                  )}
                </div>
                {selectedCall?.healthMentions && selectedCall.healthMentions.length > 0 && (
                  <div className="flex gap-1.5 flex-wrap">
                    {selectedCall.healthMentions.map((m, i) => (
                      <span key={i} className="text-[11px] text-muted-foreground bg-muted px-2 py-0.5 rounded">{m}</span>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Alerts */}
          {alerts.length > 0 && (
            <div className="mb-6">
              <p className="text-[12px] font-medium text-muted-foreground mb-2.5">
                Alerts
                {alertCount === 0 && <span className="ml-2 text-memo-green">all reviewed</span>}
              </p>
              <div className="space-y-2">
                {alerts.slice(0, 5).map(alert => {
                  const isDismissed = dismissed.has(alert._id);
                  return (
                    <div
                      key={alert._id}
                      className={`p-4 bg-white border border-border rounded-lg flex gap-3 items-start transition-all duration-700 ${
                        isDismissed ? "opacity-20 blur-[2px] pointer-events-none" : ""
                      }`}
                    >
                      <span className={`mt-1 w-2 h-2 rounded-full shrink-0 ${severityDot(alert.severity)}`} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`text-[12px] font-medium capitalize ${severityText(alert.severity)}`}>
                            {alert.severity}
                          </span>
                          <span className="text-[11px] text-muted-foreground">·</span>
                          <span className="text-[12px] text-muted-foreground capitalize">
                            {(alert.signalType ?? "").replace(/_/g, " ")}
                          </span>
                          <span className="ml-auto text-[11px] text-muted-foreground shrink-0">
                            {new Date(alert.timestamp ?? 0).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                          </span>
                        </div>
                        <p className="text-[13px] text-foreground leading-relaxed">{alert.description}</p>
                        {alert.evidenceQuotes?.[0] && (
                          <p className="text-[12px] text-muted-foreground mt-1 italic">"{alert.evidenceQuotes[0]}"</p>
                        )}
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={() => navigate(`/care?signal=${alert.signalType}&desc=${encodeURIComponent(alert.description ?? "")}`)}
                          className="text-[12px] text-muted-foreground hover:text-foreground transition-colors"
                        >
                          <ArrowUpRight className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => dismiss(alert._id)}
                          className="text-[11px] text-muted-foreground/60 hover:text-muted-foreground transition-colors px-2 py-0.5 rounded border border-border/50"
                        >
                          ack
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Conversation signals */}
          {latestCall?.conversationSignals && latestCall.conversationSignals.length > 0 && (
            <div>
              <p className="text-[12px] font-medium text-muted-foreground mb-2.5">
                Conversation signals
                <span className="ml-2 font-normal">
                  {new Date(latestCall.startedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                </span>
              </p>
              <div className="space-y-2">
                {latestCall.conversationSignals.map((sig, i) => (
                  <div key={i} className="bg-white border border-border rounded-lg p-4">
                    <p className="text-[12px] font-medium text-foreground mb-1 capitalize">
                      {sig.signal.replace(/_/g, " ")}
                    </p>
                    <p className="text-[12px] text-muted-foreground italic mb-1.5">"{sig.quote}"</p>
                    <p className="text-[12px] text-foreground/70 leading-relaxed">{sig.explanation}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ── Right: signal charts + memories ── */}
        <div className="w-[280px] shrink-0 p-6 flex flex-col gap-6">

          {/* Signal mini-charts */}
          {signalCharts.map(chart => (
            <div key={chart.title}>
              <div className="flex items-baseline justify-between mb-1.5">
                <p className="text-[12px] font-medium text-foreground">{chart.title}</p>
                <span className="text-[11px] text-muted-foreground">{chart.unit}</span>
              </div>
              {chart.data.length >= 2 ? (
                <>
                  <p className="text-[20px] font-semibold tabular text-foreground mb-2">
                    {chart.data[chart.data.length - 1]?.v ?? "—"}
                  </p>
                  <ResponsiveContainer width="100%" height={52}>
                    <AreaChart data={chart.data} margin={{ top: 2, right: 2, left: -32, bottom: 0 }}>
                      <defs>
                        <linearGradient id={`g-${chart.title}`} x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="hsl(240,10%,4%)" stopOpacity={0.06} />
                          <stop offset="100%" stopColor="hsl(240,10%,4%)" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <Area type="monotone" dataKey="v" stroke="hsl(240,10%,4%)" strokeWidth={1.25}
                        fill={`url(#g-${chart.title})`} dot={false} />
                    </AreaChart>
                  </ResponsiveContainer>
                </>
              ) : (
                <p className="text-[12px] text-muted-foreground">Awaiting data</p>
              )}
            </div>
          ))}

          {/* Memories */}
          {memories.length > 0 && (
            <div className="border-t border-border pt-6">
              <p className="text-[12px] font-medium text-muted-foreground mb-3">Memories</p>
              <div className="space-y-3">
                {memories.slice(0, 5).map((m, i) => (
                  <div key={i} className="flex gap-2.5 items-start">
                    <span className={`mt-1.5 w-1.5 h-1.5 rounded-full shrink-0 ${
                      m.sentiment === "positive" ? "bg-memo-green" :
                      m.sentiment === "negative" ? "bg-memo-red" : "bg-foreground/20"
                    }`} />
                    <p className="text-[12px] text-foreground/70 leading-relaxed">{m.content}</p>
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
