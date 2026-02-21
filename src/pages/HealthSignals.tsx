import { MemoLayout } from "@/components/memo/MemoLayout";
import { useState } from "react";
import { Check, ChevronDown, ChevronRight, Pill, MapPin, ExternalLink } from "lucide-react";
import { XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart, ReferenceLine } from "recharts";
import { AnimatePresence, motion } from "framer-motion";

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
    recommendations: {
      specialists: [
        { name: "Dr. Sarah Chen", specialty: "Neurologist", reason: "Elevated pause frequency may indicate early Parkinson's motor markers" },
        { name: "Dr. Robert Kim", specialty: "Speech Pathologist", reason: "Speech pattern analysis and intervention" },
      ],
      medications: [
        { name: "Levodopa/Carbidopa", class: "Dopamine Precursor", note: "If Parkinson's is confirmed by neurologist" },
        { name: "Amantadine", class: "NMDA Antagonist", note: "May help with speech motor function" },
      ],
    },
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
    recommendations: {
      specialists: [
        { name: "Dr. James Ortiz", specialty: "Geriatrician", reason: "Routine cognitive screening recommended given declining word-finding score" },
      ],
      medications: [
        { name: "Donepezil (Aricept)", class: "Cholinesterase Inhibitor", note: "May improve cognitive function if mild Alzheimer's is suspected" },
        { name: "Memantine (Namenda)", class: "NMDA Receptor Antagonist", note: "For moderate cognitive decline symptoms" },
      ],
    },
  },
];

const signalSections = [
  {
    title: "Speech Rate",
    data: Array.from({ length: 30 }, (_, i) => ({ day: i + 1, value: Math.round(134 + Math.sin(i * 0.3) * 8 + (Math.random() - 0.5) * 6) })),
    interpretation: "Speech rate within normal range (125–145 wpm). A sustained drop below 120 wpm warrants evaluation.",
  },
  {
    title: "Pause Frequency",
    data: Array.from({ length: 30 }, (_, i) => ({ day: i + 1, value: +(3.0 + Math.sin(i * 0.2) * 0.8 + (i > 24 ? 1.0 : 0) + (Math.random() - 0.5) * 0.4).toFixed(1) })),
    interpretation: "Spike in past 5 days from 3.1/min to 4.2/min. May correlate with fatigue, medication, or neurological shift.",
  },
  {
    title: "Word-Finding",
    data: Array.from({ length: 30 }, (_, i) => ({ day: i + 1, value: Math.round(80 - i * 0.4 + (Math.random() - 0.5) * 6) })),
    interpretation: "Gradual decline over past month. Recommend formal cognitive screening within 2 weeks.",
  },
  {
    title: "Emotional Tone",
    data: Array.from({ length: 30 }, (_, i) => ({ day: i + 1, value: Math.round(82 + Math.sin(i * 0.15) * 5 + (Math.random() - 0.5) * 4) })),
    interpretation: "Stable and positive. No depression or withdrawal markers detected.",
  },
];

const Sparkline = ({ data, color }: { data: number[]; color: string }) => {
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const w = 80, h = 20;
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

  const toggleReview = (id: number) => {
    setReviewedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  return (
    <MemoLayout>
      <div className="max-w-4xl mx-auto animate-fade-in-up">
        <h1 className="text-lg font-display text-foreground mb-4">Health Signals</h1>

        {/* 30-Day Timeline */}
        <div className="border border-border rounded-lg p-3 mb-4 bg-card">
          <div className="flex gap-[2px]">
            {days.map((day, i) => (
              <button
                key={i}
                onClick={() => setSelectedDay(selectedDay === i ? null : i)}
                className={`flex-1 h-5 rounded-sm transition-colors ${
                  day.status === "alert" ? "bg-memo-red" : day.status === "watch" ? "bg-memo-amber" : "bg-foreground/10"
                } ${selectedDay === i ? "ring-1 ring-foreground" : ""}`}
                title={`${day.date}: ${day.score}`}
              />
            ))}
          </div>
          <div className="flex justify-between mt-1 text-[9px] text-muted-foreground">
            <span>{days[0].date}</span>
            <span>Today</span>
          </div>
          {selectedDay !== null && (
            <p className="mt-2 text-[11px] text-muted-foreground">
              <span className="font-medium text-foreground">{days[selectedDay].date}</span> — Score {days[selectedDay].score}/100.
              {days[selectedDay].status === "alert" && " Significant deviations."}
              {days[selectedDay].status === "watch" && " Minor deviations."}
              {days[selectedDay].status === "ok" && " All signals within baseline."}
            </p>
          )}
        </div>

        {/* Active Flags */}
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
                        <span className={`text-[9px] px-1.5 py-0.5 rounded font-semibold ${
                          flag.severity === "High" ? "bg-memo-red-light text-memo-red" : "bg-memo-amber-light text-memo-amber"
                        }`}>{flag.severity}</span>
                        <span className="text-[13px] font-medium text-foreground">{flag.signal}</span>
                      </div>
                      <p className="text-[11px] text-muted-foreground leading-relaxed mb-1.5">{flag.description}</p>
                      <div className="flex items-center gap-3 mb-1.5">
                        <span className="text-[10px] text-muted-foreground">Today: <span className="font-medium text-foreground">{flag.today}</span></span>
                        <span className="text-[10px] text-muted-foreground">Baseline: <span className="font-medium text-foreground">{flag.baseline}</span></span>
                        <Sparkline data={flag.sparkline} color={flag.severity === "High" ? "hsl(0, 72%, 51%)" : "hsl(38, 92%, 50%)"} />
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

                {/* Expanded recommendations */}
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
                        <div className="grid grid-cols-2 gap-4">
                          {/* Specialists */}
                          <div>
                            <p className="text-[9px] font-semibold text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-1">
                              <MapPin className="w-3 h-3" /> Related Specialists
                            </p>
                            <div className="space-y-1.5">
                              {flag.recommendations.specialists.map((s, i) => (
                                <div key={i} className="bg-card border border-border rounded p-2">
                                  <p className="text-[12px] font-medium text-foreground">{s.name}</p>
                                  <p className="text-[10px] text-muted-foreground">{s.specialty}</p>
                                  <p className="text-[10px] text-muted-foreground mt-0.5">{s.reason}</p>
                                </div>
                              ))}
                            </div>
                          </div>
                          {/* Medications */}
                          <div>
                            <p className="text-[9px] font-semibold text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-1">
                              <Pill className="w-3 h-3" /> Related Medications
                            </p>
                            <div className="space-y-1.5">
                              {flag.recommendations.medications.map((m, i) => (
                                <div key={i} className="bg-card border border-border rounded p-2">
                                  <p className="text-[12px] font-medium text-foreground">{m.name}</p>
                                  <p className="text-[10px] text-muted-foreground">{m.class}</p>
                                  <p className="text-[10px] text-memo-amber mt-0.5">{m.note}</p>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                        <p className="text-[9px] text-muted-foreground mt-2">Always consult with a physician before starting any medication.</p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>

        {/* Signal Breakdown */}
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
