import { MemoLayout } from "@/components/memo/MemoLayout";
import { useMemo, useState } from "react";
import { ChevronDown, ChevronRight, Check, Quote, MessageSquare, MapPin } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
import { XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from "recharts";
import { useMemoDashboardData } from "@/hooks/useMemoDashboardData";

type Severity = "high" | "medium" | "low";

const severityStyle = (s: string) => {
  if (s === "high") return "bg-memo-red/10 text-memo-red";
  if (s === "medium") return "bg-memo-amber/10 text-memo-amber";
  return "bg-memo-green/10 text-memo-green";
};

const Sparkline = ({ data, color }: { data: number[]; color: string }) => {
  if (data.length < 2) return <span className="text-[9px] text-muted-foreground">No trend yet</span>;
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const w = 80; const h = 20;
  const points = data.map((v, i) => `${(i / (data.length - 1)) * w},${h - ((v - min) / range) * h}`).join(" ");
  return <svg width={w} height={h}><polyline fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" points={points} /></svg>;
};

const HealthSignals = () => {
  const navigate = useNavigate();
  const { loading, error, patient, calls, alerts, memories } = useMemoDashboardData();
  const [reviewedIds, setReviewedIds] = useState<string[]>([]);
  const [expandedSection, setExpandedSection] = useState<string | null>(null);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);

  const handleFindCare = (signal: string, description: string) => {
    const params = new URLSearchParams({
      signal,
      description: description.slice(0, 200),
    });
    navigate(`/find-care?${params.toString()}`);
  };

  const sortedCalls = useMemo(() => [...calls].sort((a, b) => a.startedAt - b.startedAt), [calls]);

  const timeline = useMemo(() => {
    const baseline = patient?.baseline?.cognitiveScore ?? 70;
    return sortedCalls.slice(-30).map((call, index) => {
      const score = Math.max(40, Math.min(100, Math.round(call.cognitiveScore ?? baseline)));
      return {
        index,
        call,
        date: new Date(call.startedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        score,
        status: score < 55 ? "alert" : score < 70 ? "watch" : "ok",
      };
    });
  }, [sortedCalls, patient?.baseline?.cognitiveScore]);

  const selectedCall = selectedDay !== null ? timeline[selectedDay]?.call : null;

  const signalSections = useMemo(() => {
    const r = sortedCalls.slice(-30);
    return [
      { title: "Speech Rate", data: r.map((c, i) => ({ day: i + 1, value: Math.round(c.speechRate ?? 130) })), interpretation: "Speech rate trend from recent calls. Lower values may indicate slowing." },
      { title: "Pause Frequency", data: r.map((c, i) => ({ day: i + 1, value: Math.round((c.pauseFrequency ?? 3.1) * 10) / 10 })), interpretation: "Pause frequency per minute. Increases can indicate word-finding difficulty." },
      { title: "Response Latency", data: r.map((c, i) => ({ day: i + 1, value: Math.round((c.responseLatency ?? 1.7) * 10) })), interpretation: "Response time in tenths of a second. Higher values may indicate fatigue." },
      { title: "Emotional Tone", data: r.map((c, i) => ({ day: i + 1, value: Math.round(c.emotionalScore ?? 80) })), interpretation: "Emotional tone scored from call sentiment and vocal stability." },
    ];
  }, [sortedCalls]);

  if (loading) return <MemoLayout><div className="max-w-4xl mx-auto animate-fade-in-up"><p className="text-sm text-muted-foreground">Loading health signals...</p></div></MemoLayout>;
  if (error) return <MemoLayout><div className="max-w-4xl mx-auto animate-fade-in-up"><p className="text-sm text-memo-red">Unable to load health signals: {error}</p></div></MemoLayout>;

  if (!patient) return (
    <MemoLayout>
      <div className="max-w-4xl mx-auto animate-fade-in-up space-y-4">
        <h1 className="text-lg font-display text-foreground tracking-tight">Health Signals</h1>
        <p className="text-[11px] text-muted-foreground">No patient found. Register one to populate live signals.</p>
        <Link to="/onboarding" className="inline-flex items-center gap-1 text-[12px] font-medium text-foreground hover:underline">Register a patient</Link>
      </div>
    </MemoLayout>
  );

  const latestCall = calls[0];

  return (
    <MemoLayout>
      <div className="max-w-4xl mx-auto animate-fade-in-up">
        <h1 className="text-lg font-display text-foreground tracking-tight mb-1">Health Signals</h1>
        <p className="text-[11px] text-muted-foreground mb-4">Live signals for {patient.name} · {calls.length} calls analysed · {memories.length} memories saved</p>

        {/* 30-day timeline */}
        <div className="border border-border rounded-lg p-3 mb-5 bg-card">
          <div className="flex gap-[2px]">
            {timeline.map((day) => (
              <button
                key={day.index}
                onClick={() => setSelectedDay(selectedDay === day.index ? null : day.index)}
                className={`flex-1 h-5 rounded-sm transition-colors ${
                  day.status === "alert" ? "bg-memo-red" : day.status === "watch" ? "bg-memo-amber" : "bg-foreground/10"
                } ${selectedDay === day.index ? "ring-1 ring-foreground" : ""}`}
                title={`${day.date}: ${day.score}`}
              />
            ))}
          </div>
          <div className="flex justify-between mt-1 text-[9px] text-muted-foreground">
            <span>{timeline[0]?.date ?? "—"}</span>
            <span>Today</span>
          </div>

          {/* Selected day detail */}
          {selectedDay !== null && timeline[selectedDay] && (
            <div className="mt-3 pt-3 border-t border-border">
              <p className="text-[11px] text-muted-foreground mb-2">
                <span className="font-medium text-foreground">{timeline[selectedDay].date}</span> — Score {timeline[selectedDay].score}/100
                {timeline[selectedDay].status === "alert" && <span className="ml-2 text-memo-red">Significant deviations detected</span>}
                {timeline[selectedDay].status === "watch" && <span className="ml-2 text-memo-amber">Minor deviations</span>}
                {timeline[selectedDay].status === "ok" && <span className="ml-2 text-memo-green">Within baseline</span>}
              </p>
              {/* Health mentions from that call */}
              {selectedCall?.healthMentions && selectedCall.healthMentions.length > 0 && (
                <div className="space-y-1">
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">What was mentioned</p>
                  {selectedCall.healthMentions.map((mention, i) => (
                    <div key={i} className="flex items-start gap-2 py-1">
                      <MessageSquare className="w-3 h-3 text-muted-foreground mt-0.5 flex-shrink-0" />
                      <p className="text-[11px] text-foreground">{mention}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Conversation Signals — quotes from latest call */}
        {latestCall?.conversationSignals && latestCall.conversationSignals.length > 0 && (
          <div className="mb-5">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-2">
              Conversation Signals — {new Date(latestCall.startedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
            </p>
            <div className="space-y-2">
              {latestCall.conversationSignals.map((sig, i) => (
                <div key={i} className="border border-border rounded-lg bg-card p-3.5">
                  <div className="flex items-center gap-2 mb-2">
                    <Quote className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                    <span className="text-[10px] font-semibold text-foreground uppercase tracking-wide">{sig.signal}</span>
                  </div>
                  <blockquote className="border-l-2 border-foreground/20 pl-3 mb-2">
                    <p className="text-[12px] text-foreground italic leading-relaxed">"{sig.quote}"</p>
                  </blockquote>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">{sig.explanation}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Active Flags */}
        <div className="space-y-3 mb-5">
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Active Flags</p>
          {alerts.length === 0 && (
            <p className="text-[12px] text-muted-foreground">No active flags. All signals within baseline.</p>
          )}
          {alerts.map((alert) => {
            const reviewed = reviewedIds.includes(alert._id);
            const sparkline = calls.slice(-7).map((c) => c.cognitiveScore ?? patient.baseline?.cognitiveScore ?? 70);

            return (
              <div key={alert._id} className="border border-border rounded-lg bg-card overflow-hidden">
                <div className="p-3.5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className={`text-[9px] px-1.5 py-0.5 rounded font-semibold ${severityStyle(alert.severity)}`}>
                          {alert.severity}
                        </span>
                        <span className="text-[13px] font-medium text-foreground">{alert.signalType}</span>
                      </div>

                      <p className="text-[11px] text-muted-foreground leading-relaxed mb-2">{alert.description}</p>

                      {/* Evidence quotes */}
                      {alert.evidenceQuotes && alert.evidenceQuotes.length > 0 && (
                        <div className="space-y-1.5 mb-2">
                          {alert.evidenceQuotes.map((quote, i) => (
                            <div key={i} className="flex items-start gap-2 bg-muted/40 rounded-md px-2.5 py-1.5">
                              <Quote className="w-2.5 h-2.5 text-muted-foreground mt-0.5 flex-shrink-0" />
                              <p className="text-[11px] text-foreground italic leading-relaxed">"{quote}"</p>
                            </div>
                          ))}
                        </div>
                      )}

                      <div className="flex items-center gap-3 mb-1.5">
                        <span className="text-[10px] text-muted-foreground">
                          Score: <span className="font-medium text-foreground">{alert.currentValue}</span>
                        </span>
                        <span className="text-[10px] text-muted-foreground">
                          Baseline: <span className="font-medium text-foreground">{alert.baselineValue}</span>
                        </span>
                        <Sparkline data={sparkline} color={alert.severity === "high" ? "hsl(0, 72%, 51%)" : "hsl(38, 92%, 50%)"} />
                      </div>
                      {alert.recommendedAction && (
                        <p className="text-[10px] text-muted-foreground">{alert.recommendedAction}</p>
                      )}
                    </div>

                    <div className="flex flex-col gap-1.5 flex-shrink-0">
                      <button
                        onClick={() => setReviewedIds((p) => p.includes(alert._id) ? p.filter((x) => x !== alert._id) : [...p, alert._id])}
                        className={`px-2.5 py-1.5 text-[11px] font-medium rounded transition-colors ${
                          reviewed ? "bg-muted text-muted-foreground" : "bg-foreground text-background hover:opacity-90"
                        }`}
                      >
                        {reviewed ? "Reviewed" : "Review"}
                      </button>
                      <button
                        onClick={() => handleFindCare(alert.signalType, alert.description)}
                        className="px-2.5 py-1.5 text-[11px] font-medium rounded border border-border bg-card text-foreground hover:bg-muted transition-colors flex items-center gap-1 justify-center"
                      >
                        <MapPin className="w-3 h-3" /> Find Care
                      </button>
                    </div>
                  </div>
                </div>

                <AnimatePresence>
                  {reviewed && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden">
                      <div className="border-t border-border px-3.5 py-3 bg-muted/30">
                        <p className="text-[11px] flex items-center gap-1 text-muted-foreground">
                          <Check className="w-3.5 h-3.5" /> Marked as reviewed — {alert.signalType}
                        </p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>

        {/* Signal Breakdown Charts */}
        <div className="space-y-1.5">
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1">Signal Breakdown</p>
          {signalSections.map((section) => {
            const isOpen = expandedSection === section.title;
            return (
              <div key={section.title} className="border border-border rounded-lg bg-card overflow-hidden">
                <button
                  onClick={() => setExpandedSection(isOpen ? null : section.title)}
                  className="w-full flex items-center justify-between p-3 text-left hover:bg-muted/30 transition-colors"
                >
                  <span className="text-[12px] font-medium text-foreground">{section.title}</span>
                  {isOpen ? <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" /> : <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />}
                </button>
                {isOpen && (
                  <div className="px-3 pb-3">
                    <ResponsiveContainer width="100%" height={140}>
                      <AreaChart data={section.data} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                        <defs>
                          <linearGradient id={`g-${section.title}`} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="hsl(0, 0%, 8%)" stopOpacity={0.06} />
                            <stop offset="100%" stopColor="hsl(0, 0%, 8%)" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(0, 0%, 92%)" vertical={false} />
                        <XAxis dataKey="day" tick={{ fontSize: 9, fill: "hsl(0, 0%, 50%)" }} tickLine={false} axisLine={false} interval={5} />
                        <YAxis tick={{ fontSize: 9, fill: "hsl(0, 0%, 50%)" }} tickLine={false} axisLine={false} />
                        <Tooltip contentStyle={{ fontSize: "11px", borderRadius: "4px", border: "1px solid hsl(0,0%,90%)" }} />
                        <Area type="monotone" dataKey="value" stroke="hsl(0, 0%, 8%)" strokeWidth={1.5} fill={`url(#g-${section.title})`} />
                      </AreaChart>
                    </ResponsiveContainer>
                    <p className="text-[11px] text-muted-foreground leading-relaxed mt-2">{section.interpretation}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </MemoLayout>
  );
};

export default HealthSignals;
