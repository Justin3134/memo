import { MemoLayout } from "@/components/memo/MemoLayout";
import { useState } from "react";
import { CheckCircle, ChevronDown, ChevronRight } from "lucide-react";
import { XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from "recharts";

const days = Array.from({ length: 30 }, (_, i) => {
  const d = new Date();
  d.setDate(d.getDate() - (29 - i));
  const score = Math.round(75 + Math.sin(i * 0.3) * 10 + (Math.random() - 0.5) * 8);
  return {
    date: d.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    score: Math.max(40, Math.min(100, score)),
    status: score < 55 ? "alert" : score < 70 ? "watch" : "ok",
  };
});

const activeFlags = [
  {
    id: 1,
    signal: "Pause Frequency",
    description: "Pauses between words are longer and more frequent than baseline, which may indicate fatigue or early neurological change.",
    today: "4.2/min",
    baseline: "3.1/min",
    severity: "High" as const,
    action: "Consider discussing with physician if trend continues for 3 more days.",
    sparkline: [30, 32, 31, 33, 35, 40, 42],
  },
  {
    id: 2,
    signal: "Word-Finding Difficulty",
    description: "Increased use of filler words and mid-sentence pauses consistent with word retrieval difficulty.",
    today: "Score 62",
    baseline: "Score 78",
    severity: "Medium" as const,
    action: "Watch for 3 more days. Compare with next cognitive assessment.",
    sparkline: [78, 76, 74, 72, 68, 65, 62],
  },
];

const signalSections = [
  {
    title: "Speech Rate History",
    data: Array.from({ length: 30 }, (_, i) => ({
      day: i + 1,
      value: Math.round(134 + Math.sin(i * 0.3) * 8 + (Math.random() - 0.5) * 6),
    })),
    interpretation: "Speech rate has remained within normal range (125-145 wpm) for the past 30 days. A sustained drop below 120 wpm may warrant further evaluation.",
  },
  {
    title: "Pause Frequency History",
    data: Array.from({ length: 30 }, (_, i) => ({
      day: i + 1,
      value: +(3.0 + Math.sin(i * 0.2) * 0.8 + (i > 24 ? 1.0 : 0) + (Math.random() - 0.5) * 0.4).toFixed(1),
    })),
    interpretation: "Pause frequency spiked in the past 5 days from a baseline of 3.1/min to 4.2/min. This may correlate with fatigue, medication changes, or early neurological shifts.",
  },
  {
    title: "Word-Finding Difficulty",
    data: Array.from({ length: 30 }, (_, i) => ({
      day: i + 1,
      value: Math.round(80 - i * 0.4 + (Math.random() - 0.5) * 6),
    })),
    interpretation: "Word-finding score has been gradually declining over the past month. Current trajectory suggests monitoring with a formal cognitive screening in the next 2 weeks.",
  },
  {
    title: "Emotional Tone Index",
    data: Array.from({ length: 30 }, (_, i) => ({
      day: i + 1,
      value: Math.round(82 + Math.sin(i * 0.15) * 5 + (Math.random() - 0.5) * 4),
    })),
    interpretation: "Emotional tone has remained stable and positive. No signs of depression or withdrawal markers detected.",
  },
];

const severityStyles = {
  High: "bg-memo-red-light text-memo-red",
  Medium: "bg-memo-amber-light text-memo-amber",
  Low: "bg-secondary text-secondary-foreground",
};

const Sparkline = ({ data, color }: { data: number[]; color: string }) => {
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const w = 100, h = 24;
  const points = data.map((v, i) => `${(i / (data.length - 1)) * w},${h - ((v - min) / range) * h}`).join(" ");
  return (
    <svg width={w} height={h}>
      <polyline fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" points={points} />
    </svg>
  );
};

const HealthSignals = () => {
  const [reviewedIds, setReviewedIds] = useState<number[]>([]);
  const [expandedSection, setExpandedSection] = useState<string | null>(null);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);

  return (
    <MemoLayout>
      <div className="max-w-4xl mx-auto animate-fade-in-up">
        <p className="text-xs text-muted-foreground mb-1">Analysis</p>
        <h1 className="text-xl font-display text-foreground mb-6">Health Signals</h1>

        {/* 30-Day Timeline */}
        <div className="bg-card rounded-lg border border-border p-4 mb-5">
          <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-3">30-Day Overview</p>
          <div className="flex gap-[3px]">
            {days.map((day, i) => (
              <button
                key={i}
                onClick={() => setSelectedDay(selectedDay === i ? null : i)}
                className={`flex-1 h-6 rounded-sm transition-colors ${
                  day.status === "alert" ? "bg-memo-red" : day.status === "watch" ? "bg-memo-amber" : "bg-primary/30"
                } ${selectedDay === i ? "ring-2 ring-foreground" : ""}`}
                title={`${day.date}: Score ${day.score}`}
              />
            ))}
          </div>
          <div className="flex justify-between mt-1.5 text-[10px] text-muted-foreground">
            <span>{days[0].date}</span>
            <span>Today</span>
          </div>
          {selectedDay !== null && (
            <div className="mt-3 p-3 bg-secondary rounded-md text-[12px] text-foreground">
              <span className="font-medium">{days[selectedDay].date}</span>: Overall score {days[selectedDay].score}/100.
              {days[selectedDay].status === "alert" && " Significant deviations detected."}
              {days[selectedDay].status === "watch" && " Minor deviations from baseline."}
              {days[selectedDay].status === "ok" && " All signals within baseline."}
            </div>
          )}
        </div>

        {/* Active Flags */}
        <div className="space-y-3 mb-6">
          <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Active Flags</p>
          {activeFlags.map((flag) => {
            const reviewed = reviewedIds.includes(flag.id);
            return (
              <div key={flag.id} className={`bg-card rounded-lg border border-border p-4 transition-opacity ${reviewed ? "opacity-50" : ""}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className={`text-[10px] px-2 py-0.5 rounded font-semibold ${severityStyles[flag.severity]}`}>{flag.severity}</span>
                      <span className="text-[13px] font-medium text-foreground">{flag.signal}</span>
                      {reviewed && <CheckCircle className="w-3 h-3 text-primary" />}
                    </div>
                    <p className="text-[12px] text-muted-foreground leading-relaxed mb-2">{flag.description}</p>
                    <div className="flex items-center gap-4 mb-2">
                      <div className="text-[11px]"><span className="text-muted-foreground">Today: </span><span className="font-medium text-foreground">{flag.today}</span></div>
                      <div className="text-[11px]"><span className="text-muted-foreground">Baseline: </span><span className="font-medium text-foreground">{flag.baseline}</span></div>
                      <Sparkline data={flag.sparkline} color={flag.severity === "High" ? "hsl(4, 60%, 50%)" : "hsl(38, 75%, 52%)"} />
                    </div>
                    <p className="text-[11px] text-primary font-medium">{flag.action}</p>
                  </div>
                  <button
                    onClick={() => setReviewedIds(prev => prev.includes(flag.id) ? prev.filter(id => id !== flag.id) : [...prev, flag.id])}
                    className={`px-3 py-1.5 text-[11px] font-medium rounded-md flex-shrink-0 transition-colors ${
                      reviewed ? "bg-secondary text-muted-foreground" : "bg-foreground text-background hover:opacity-90"
                    }`}
                  >
                    {reviewed ? "Reopen" : "Mark Reviewed"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Signal Breakdown Accordions */}
        <div className="space-y-2">
          <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-1">Signal Breakdown</p>
          {signalSections.map((section) => {
            const isOpen = expandedSection === section.title;
            return (
              <div key={section.title} className="bg-card rounded-lg border border-border overflow-hidden">
                <button
                  onClick={() => setExpandedSection(isOpen ? null : section.title)}
                  className="w-full flex items-center justify-between p-4 text-left hover:bg-secondary/30 transition-colors"
                >
                  <span className="text-[13px] font-medium text-foreground">{section.title}</span>
                  {isOpen ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
                </button>
                {isOpen && (
                  <div className="px-4 pb-4">
                    <ResponsiveContainer width="100%" height={160}>
                      <AreaChart data={section.data} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                        <defs>
                          <linearGradient id={`grad-${section.title}`} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="hsl(199, 55%, 36%)" stopOpacity={0.1} />
                            <stop offset="95%" stopColor="hsl(199, 55%, 36%)" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(210, 16%, 90%)" vertical={false} />
                        <XAxis dataKey="day" tick={{ fontSize: 10, fill: "hsl(215, 12%, 50%)" }} tickLine={false} axisLine={false} interval={5} />
                        <YAxis tick={{ fontSize: 10, fill: "hsl(215, 12%, 50%)" }} tickLine={false} axisLine={false} />
                        <Tooltip contentStyle={{ fontSize: "11px", borderRadius: "6px", border: "1px solid hsl(210,16%,90%)" }} />
                        <Area type="monotone" dataKey="value" stroke="hsl(199, 55%, 36%)" strokeWidth={1.5} fill={`url(#grad-${section.title})`} />
                      </AreaChart>
                    </ResponsiveContainer>
                    <p className="text-[12px] text-muted-foreground leading-relaxed mt-3">{section.interpretation}</p>
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
