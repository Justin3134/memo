import { MemoLayout } from "@/components/memo/MemoLayout";
import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from "recharts";
import { useMemoDashboardData } from "@/hooks/useMemoDashboardData";
import { ArrowRight } from "lucide-react";

const severityDot = (s: string) =>
  s === "high" ? "bg-memo-red" : s === "medium" ? "bg-memo-amber" : "bg-memo-green";

const severityText = (s: string) =>
  s === "high" ? "text-memo-red" : s === "medium" ? "text-memo-amber" : "text-memo-green";

export default function HealthSignals() {
  const navigate = useNavigate();
  const { loading, patient, calls, alerts, memories } = useMemoDashboardData();
  const [reviewedIds, setReviewedIds] = useState<string[]>([]);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);

  const sortedCalls = useMemo(() => [...calls].sort((a, b) => a.startedAt - b.startedAt), [calls]);

  const timeline = useMemo(() => {
    const baseline = patient?.baseline?.cognitiveScore ?? 70;
    return sortedCalls.slice(-30).map((call, index) => {
      const score = Math.max(40, Math.min(100, Math.round(call.cognitiveScore ?? baseline)));
      return { index, call, date: new Date(call.startedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" }), score,
               status: score < 55 ? "alert" : score < 70 ? "watch" : "ok" };
    });
  }, [sortedCalls, patient?.baseline?.cognitiveScore]);

  const selectedCall = selectedDay !== null ? timeline[selectedDay]?.call : null;
  const latestCall = calls[0];

  const signalCharts = useMemo(() => {
    const r = sortedCalls.slice(-20);
    return [
      { title: "Speech Rate", unit: "wpm", data: r.map((c, i) => ({ i: i + 1, v: Math.round(c.speechRate ?? 130) })) },
      { title: "Pause Frequency", unit: "/min", data: r.map((c, i) => ({ i: i + 1, v: +(c.pauseFrequency ?? 3.1).toFixed(1) })) },
      { title: "Emotional Tone", unit: "/100", data: r.map((c, i) => ({ i: i + 1, v: Math.round(c.emotionalScore ?? 80) })) },
    ];
  }, [sortedCalls]);

  const unreviewedAlerts = alerts.filter(a => !reviewedIds.includes(a._id));

  if (loading) return (
    <MemoLayout><div className="p-8 text-[13px] text-muted-foreground">Loading signals…</div></MemoLayout>
  );

  if (!patient) return (
    <MemoLayout>
      <div className="p-8">
        <h1 className="text-xl font-semibold mb-2">Signals</h1>
        <p className="text-[13px] text-muted-foreground mb-4">No patient found.</p>
        <Link to="/onboarding" className="text-[13px] font-medium text-foreground underline underline-offset-2">Register a patient</Link>
      </div>
    </MemoLayout>
  );

  return (
    <MemoLayout>
      <div className="p-8 max-w-4xl animate-fade-in">

        {/* Header */}
        <div className="mb-7">
          <h1 className="text-xl font-semibold text-foreground tracking-tight">Signals</h1>
          <p className="text-[13px] text-muted-foreground mt-0.5">
            {patient.name} · {calls.length} calls · {unreviewedAlerts.length > 0 && <span className="text-memo-amber">{unreviewedAlerts.length} unreviewed {unreviewedAlerts.length === 1 ? "alert" : "alerts"}</span>}
            {unreviewedAlerts.length === 0 && "No active alerts"}
          </p>
        </div>

        {/* Active alerts */}
        {unreviewedAlerts.length > 0 && (
          <div className="mb-6 space-y-2">
            {unreviewedAlerts.map(alert => (
              <div key={alert._id} className="bg-white border border-border rounded-lg p-4 flex gap-4 items-start">
                <span className={`mt-1 w-2 h-2 rounded-full shrink-0 ${severityDot(alert.severity)}`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-[12px] font-medium capitalize ${severityText(alert.severity)}`}>
                      {alert.severity}
                    </span>
                    <span className="text-[12px] text-muted-foreground">·</span>
                    <span className="text-[12px] text-muted-foreground capitalize">
                      {(alert.signalType ?? "").replace(/_/g, " ")}
                    </span>
                    <span className="ml-auto text-[11px] text-muted-foreground">
                      {new Date(alert.timestamp ?? 0).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                    </span>
                  </div>
                  <p className="text-[13px] text-foreground leading-relaxed">{alert.description}</p>
                  {alert.evidenceQuotes?.[0] && (
                    <p className="text-[12px] text-muted-foreground mt-1.5 italic">"{alert.evidenceQuotes[0]}"</p>
                  )}
                </div>
                <div className="flex gap-2 shrink-0">
                  <button
                    onClick={() => navigate(`/care?signal=${alert.signalType}&desc=${encodeURIComponent(alert.description ?? "")}`)}
                    className="flex items-center gap-1 text-[12px] text-foreground/70 hover:text-foreground transition-colors"
                  >
                    Find care <ArrowRight className="w-3 h-3" />
                  </button>
                  <button
                    onClick={() => setReviewedIds(ids => [...ids, alert._id])}
                    className="text-[12px] text-muted-foreground hover:text-foreground transition-colors px-2.5 py-1 rounded border border-border"
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* 30-day heatmap */}
        {timeline.length > 0 && (
          <div className="bg-white border border-border rounded-lg p-5 mb-6">
            <p className="text-[13px] font-medium text-foreground mb-3">30-day cognitive heatmap</p>
            <div className="flex gap-[3px]">
              {timeline.map(day => (
                <button
                  key={day.index}
                  onClick={() => setSelectedDay(selectedDay === day.index ? null : day.index)}
                  title={`${day.date}: ${day.score}/100`}
                  className={`flex-1 h-6 rounded-sm transition-colors ${
                    day.status === "alert" ? "bg-memo-red/80" :
                    day.status === "watch" ? "bg-memo-amber/70" : "bg-foreground/8"
                  } ${selectedDay === day.index ? "ring-1 ring-offset-1 ring-foreground" : "hover:opacity-80"}`}
                  style={{ backgroundColor: day.status === "ok" ? `hsl(142, 60%, ${88 - (day.score - 70) * 0.8}%)` : undefined }}
                />
              ))}
            </div>
            <div className="flex justify-between mt-1.5">
              <span className="text-[11px] text-muted-foreground">{timeline[0]?.date}</span>
              <span className="text-[11px] text-muted-foreground">Today</span>
            </div>
            {selectedDay !== null && timeline[selectedDay] && (
              <div className="mt-4 pt-4 border-t border-border">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-[13px] font-medium text-foreground">{timeline[selectedDay].date}</span>
                  <span className="text-[13px] text-muted-foreground">Score {timeline[selectedDay].score}/100</span>
                  {timeline[selectedDay].status !== "ok" && (
                    <span className={`text-[12px] ${timeline[selectedDay].status === "alert" ? "text-memo-red" : "text-memo-amber"}`}>
                      {timeline[selectedDay].status === "alert" ? "Significant changes" : "Minor deviations"}
                    </span>
                  )}
                </div>
                {selectedCall?.healthMentions && selectedCall.healthMentions.length > 0 && (
                  <div className="flex gap-2 flex-wrap">
                    {selectedCall.healthMentions.map((m, i) => (
                      <span key={i} className="text-[12px] text-muted-foreground bg-muted px-2 py-0.5 rounded-md">{m}</span>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Conversation signals */}
        {latestCall?.conversationSignals && latestCall.conversationSignals.length > 0 && (
          <div className="bg-white border border-border rounded-lg mb-6">
            <div className="px-5 py-3.5 border-b border-border">
              <p className="text-[13px] font-medium text-foreground">Conversation signals</p>
              <p className="text-[12px] text-muted-foreground mt-0.5">
                From {new Date(latestCall.startedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
              </p>
            </div>
            <div className="divide-y divide-border">
              {latestCall.conversationSignals.map((sig, i) => (
                <div key={i} className="px-5 py-4">
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="text-[12px] font-medium text-foreground capitalize">{sig.signal.replace(/_/g, " ")}</span>
                  </div>
                  <p className="text-[12px] text-muted-foreground italic mb-1">"{sig.quote}"</p>
                  <p className="text-[13px] text-foreground/70">{sig.explanation}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Signal charts */}
        {signalCharts.some(c => c.data.length >= 2) && (
          <div className="grid grid-cols-3 gap-4 mb-6">
            {signalCharts.map(chart => (
              <div key={chart.title} className="bg-white border border-border rounded-lg p-4">
                <p className="text-[12px] font-medium text-foreground mb-1">{chart.title}</p>
                <p className="text-[11px] text-muted-foreground mb-3">{chart.unit}</p>
                {chart.data.length >= 2 ? (
                  <ResponsiveContainer width="100%" height={60}>
                    <AreaChart data={chart.data} margin={{ top: 2, right: 2, left: -30, bottom: 0 }}>
                      <defs>
                        <linearGradient id={`g-${chart.title}`} x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="hsl(240,10%,4%)" stopOpacity={0.08} />
                          <stop offset="100%" stopColor="hsl(240,10%,4%)" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <Area type="monotone" dataKey="v" stroke="hsl(240,10%,4%)" strokeWidth={1.5} fill={`url(#g-${chart.title})`} dot={false} />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-[11px] text-muted-foreground">Not enough data</p>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Memories */}
        {memories.length > 0 && (
          <div className="bg-white border border-border rounded-lg">
            <div className="px-5 py-3.5 border-b border-border">
              <p className="text-[13px] font-medium text-foreground">Memories captured</p>
            </div>
            <div className="divide-y divide-border">
              {memories.slice(0, 6).map((m, i) => (
                <div key={i} className="px-5 py-3 flex gap-3 items-start">
                  <span className={`mt-1 w-1.5 h-1.5 rounded-full shrink-0 ${
                    m.sentiment === "positive" ? "bg-memo-green" :
                    m.sentiment === "negative" ? "bg-memo-red" : "bg-muted-foreground/40"
                  }`} />
                  <p className="text-[13px] text-foreground/80 leading-relaxed flex-1">{m.content}</p>
                  <span className="text-[11px] text-muted-foreground capitalize shrink-0">{m.category}</span>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </MemoLayout>
  );
}
