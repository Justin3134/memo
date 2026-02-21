import { MemoLayout } from "@/components/memo/MemoLayout";
import { useMemo, useState } from "react";
import { ChevronDown, ChevronRight, Check } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { Link } from "react-router-dom";
import { XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from "recharts";
import { useMemoDashboardData } from "@/hooks/useMemoDashboardData";

type Severity = "High" | "Medium" | "Low";

type TimelineItem = {
  id: number;
  date: string;
  score: number;
  status: "alert" | "watch" | "ok";
};

type Flag = {
  id: string;
  signal: string;
  description: string;
  today: string;
  baseline: string;
  severity: Severity;
  action: string;
  sparkline: number[];
};

type SignalSection = {
  title: string;
  data: { day: number; value: number }[];
  interpretation: string;
};

const Sparkline = ({ data, color }: { data: number[]; color: string }) => {
  if (data.length === 0) {
    return <span className="text-[9px] text-muted-foreground">No trend yet</span>;
  }

  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const w = 80;
  const h = 20;
  const points = data
    .map((value, index) => `${(index / (data.length - 1)) * w},${h - ((value - min) / range) * h}`)
    .join(" ");

  return (
    <svg width={w} height={h}>
      <polyline fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" points={points} />
    </svg>
  );
};

const HealthSignals = () => {
  const { loading, error, patient, calls, alerts, memories } = useMemoDashboardData();

  const [reviewedIds, setReviewedIds] = useState<string[]>([]);
  const [expandedSection, setExpandedSection] = useState<string | null>(null);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);

  const timeline: TimelineItem[] = useMemo(() => {
    const baseline = patient?.baseline?.cognitiveScore ?? 70;

    return [...calls]
      .sort((a, b) => a.startedAt - b.startedAt)
      .slice(-30)
      .map((call, index) => {
        const score = Math.max(40, Math.min(100, Math.round(call.cognitiveScore ?? baseline)));

        return {
          id: index,
          date: new Date(call.startedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
          score,
          status: score < 55 ? "alert" : score < 70 ? "watch" : "ok",
        };
      });
  }, [calls, patient?.baseline?.cognitiveScore]);

  const activeFlags: Flag[] = useMemo(() => {
    const defaultBaseline = patient?.baseline?.cognitiveScore ?? 70;

    return alerts.map((alert) => {
      const baseline = alert.baselineValue ?? defaultBaseline;
      return {
        id: alert._id,
        signal: alert.signalType,
        description: alert.description,
        today: `${alert.currentValue}`,
        baseline: `${baseline}`,
        severity: (alert.severity as Severity) || "Medium",
        action: alert.recommendedAction || "Continue monitoring and share this with your doctor.",
        sparkline: calls
          .slice(-7)
          .map((call) => call.cognitiveScore ?? patient?.baseline?.cognitiveScore ?? 70),
      };
    });
  }, [alerts, calls, patient?.baseline]);

  const signalSections: SignalSection[] = useMemo(() => {
    const recentCalls = [...calls].slice(-30);

    const speechRateSection = recentCalls.length
      ? recentCalls.map((call, index) => ({ day: index + 1, value: Math.round(call.speechRate ?? 130) }))
      : [{ day: 1, value: 130 }];

    const pauseFreqSection = recentCalls.length
      ? recentCalls.map((call, index) => ({
          day: index + 1,
          value: Math.round((call.pauseFrequency ?? 3.1) * 10) / 10,
        }))
      : [{ day: 1, value: 3.1 }];

    const latencySection = recentCalls.length
      ? recentCalls.map((call, index) => ({
          day: index + 1,
          value: Math.round((call.responseLatency ?? 1.7) * 10),
        }))
      : [{ day: 1, value: 17 }];

    const emotionalSection = recentCalls.length
      ? recentCalls.map((call, index) => ({ day: index + 1, value: Math.round(call.emotionalScore ?? 80) }))
      : [{ day: 1, value: 80 }];

    return [
      { title: "Speech Rate", data: speechRateSection, interpretation: "Speech rate trend from recent call recordings." },
      { title: "Pause Frequency", data: pauseFreqSection, interpretation: "Pause frequency trend from recent transcripts." },
      {
        title: "Response Latency",
        data: latencySection,
        interpretation: "Higher latency can indicate fatigue or response planning difficulty.",
      },
      { title: "Emotional Tone", data: emotionalSection, interpretation: "Emotional tone is inferred from call sentiment and vocal stability." },
    ];
  }, [calls, patient?.baseline]);

  const toggleReview = (id: string) => {
    setReviewedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  if (loading) {
    return (
      <MemoLayout>
        <div className="max-w-4xl mx-auto animate-fade-in-up">
          <p className="text-sm text-muted-foreground">Loading health signals from real call data...</p>
        </div>
      </MemoLayout>
    );
  }

  if (error) {
    return (
      <MemoLayout>
        <div className="max-w-4xl mx-auto animate-fade-in-up">
          <p className="text-sm text-memo-red">Unable to load health signals: {error}</p>
        </div>
      </MemoLayout>
    );
  }

  if (!patient) {
    return (
      <MemoLayout>
        <div className="max-w-4xl mx-auto animate-fade-in-up space-y-4">
          <h1 className="text-lg font-display text-foreground tracking-tight">Health Signals</h1>
          <p className="text-[11px] text-muted-foreground">
            Framework mode: no patient profile yet. Add a patient and complete calls to populate live health signals.
          </p>
          <div className="border border-border rounded-lg p-3 bg-card">
            <div className="grid grid-cols-10 gap-[2px]">
              {Array.from({ length: 30 }).map((_, idx) => (
                <div key={idx} className="h-5 rounded-sm bg-muted" />
              ))}
            </div>
            <p className="mt-2 text-[11px] text-muted-foreground">No timeline data available.</p>
          </div>
          <Link
            to="/onboarding"
            className="inline-flex items-center gap-1 text-[12px] font-medium text-foreground hover:underline"
          >
            Register a patient
          </Link>
        </div>
      </MemoLayout>
    );
  }

  return (
    <MemoLayout>
      <div className="max-w-4xl mx-auto animate-fade-in-up">
        <h1 className="text-lg font-display text-foreground tracking-tight mb-4">Health Signals</h1>
        <p className="text-[11px] text-muted-foreground mb-4">
          Live signals for {patient.name} are now derived from your latest Convex call records.
        </p>

        <div className="border border-border rounded-lg p-3 mb-4 bg-card">
          <div className="flex gap-[2px]">
            {timeline.map((day, index) => (
              <button
                key={`${day.date}-${day.id}`}
                onClick={() => setSelectedDay(selectedDay === index ? null : index)}
                className={`flex-1 h-5 rounded-sm transition-colors ${
                  day.status === "alert" ? "bg-memo-red" : day.status === "watch" ? "bg-memo-amber" : "bg-foreground/10"
                } ${selectedDay === index ? "ring-1 ring-foreground" : ""}`}
                title={`${day.date}: ${day.score}`}
              />
            ))}
          </div>
          <div className="flex justify-between mt-1 text-[9px] text-muted-foreground">
            <span>{timeline[0]?.date}</span>
            <span>Today</span>
          </div>
          {selectedDay !== null && timeline[selectedDay] ? (
            <p className="mt-2 text-[11px] text-muted-foreground">
              <span className="font-medium text-foreground">{timeline[selectedDay].date}</span> — Score {timeline[selectedDay].score}/100.
              {timeline[selectedDay].status === "alert" && " Significant deviations."}
              {timeline[selectedDay].status === "watch" && " Minor deviations."}
              {timeline[selectedDay].status === "ok" && " All signals within baseline."}
            </p>
          ) : null}
          <p className="mt-2 text-[11px] text-muted-foreground">Memories saved: {memories.length}</p>
        </div>

        <div className="space-y-3 mb-5">
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Active Flags</p>
          {activeFlags.map((flag) => {
            const reviewed = reviewedIds.includes(flag.id);

            return (
              <div key={flag.id} className="border border-border rounded-lg bg-card overflow-hidden">
                <div className="p-3.5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span
                          className={`text-[9px] px-1.5 py-0.5 rounded font-semibold ${
                            flag.severity === "High"
                              ? "bg-memo-red-light text-memo-red"
                              : flag.severity === "Medium"
                                ? "bg-memo-amber-light text-memo-amber"
                                : "bg-memo-green/20 text-memo-green"
                          }`}
                        >
                          {flag.severity}
                        </span>
                        <span className="text-[13px] font-medium text-foreground">{flag.signal}</span>
                      </div>

                      <p className="text-[11px] text-muted-foreground leading-relaxed mb-1.5">{flag.description}</p>
                      <div className="flex items-center gap-3 mb-1.5">
                        <span className="text-[10px] text-muted-foreground">
                          Today: <span className="font-medium text-foreground">{flag.today}</span>
                        </span>
                        <span className="text-[10px] text-muted-foreground">
                          Baseline: <span className="font-medium text-foreground">{flag.baseline}</span>
                        </span>
                        <Sparkline
                          data={flag.sparkline}
                          color={flag.severity === "High" ? "hsl(0, 72%, 51%)" : "hsl(38, 92%, 50%)"}
                        />
                      </div>
                      <p className="text-[10px] text-muted-foreground">{flag.action}</p>
                    </div>

                    <button
                      onClick={() => toggleReview(flag.id)}
                      className={`px-2.5 py-1.5 text-[11px] font-medium rounded flex-shrink-0 transition-colors ${
                        reviewed ? "bg-muted text-muted-foreground" : "bg-foreground text-background hover:opacity-90"
                      }`}
                    >
                      {reviewed ? "Reviewed" : "Review"}
                    </button>
                  </div>
                </div>

                <AnimatePresence>
                  {reviewed && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <div className="border-t border-border px-3.5 py-3 bg-muted/30">
                        <p className="text-[11px] flex items-center gap-1 text-muted-foreground">
                          <Check className="w-3.5 h-3.5" /> {flag.signal}
                        </p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>

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
                  {isOpen ? (
                    <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
                  ) : (
                    <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
                  )}
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
                        <Tooltip
                          contentStyle={{ fontSize: "11px", borderRadius: "4px", border: "1px solid hsl(0,0%,90%)" }}
                        />
                        <Area
                          type="monotone"
                          dataKey="value"
                          stroke="hsl(0, 0%, 8%)"
                          strokeWidth={1.5}
                          fill={`url(#g-${section.title})`}
                        />
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
