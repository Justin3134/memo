import { MemoLayout } from "@/components/memo/MemoLayout";
import { useState } from "react";
import { Phone, ArrowRight } from "lucide-react";
import { XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart, Line, ComposedChart, ReferenceLine } from "recharts";
import { Link } from "react-router-dom";

const generateData = () => {
  const data = [];
  const now = new Date();
  for (let i = 29; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    data.push({
      date: date.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      cognitive: Math.round(78 + Math.sin(i * 0.25) * 6 + (Math.random() - 0.5) * 8),
      motor: Math.round(72 + Math.sin(i * 0.3) * 8 + (Math.random() - 0.5) * 6),
      emotional: Math.round(80 + Math.sin(i * 0.2) * 5 + (Math.random() - 0.5) * 4),
    });
  }
  return data;
};

const chartData = generateData();
const latestData = chartData[chartData.length - 1];

const Dashboard = () => {
  const [activeMetric, setActiveMetric] = useState<"cognitive" | "motor" | "emotional">("cognitive");

  const overallScore = latestData.cognitive;
  const statusLabel = overallScore >= 75 ? "Stable" : overallScore >= 60 ? "Watch" : "Alert";
  const statusColor = overallScore >= 75 ? "bg-memo-green text-background" : overallScore >= 60 ? "bg-memo-amber text-background" : "bg-memo-red text-background";

  return (
    <MemoLayout>
      <div className="max-w-4xl mx-auto animate-fade-in-up space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-display text-foreground tracking-tight">Margaret Wilson</h1>
            <p className="text-[11px] text-muted-foreground">Last call today · 10:30 AM · 12 min 34 sec</p>
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
          {[
            { label: "Cognitive", score: latestData.cognitive, sub: "Word recall slightly slower this week" },
            { label: "Motor", score: latestData.motor, sub: "Slight tremor increase detected" },
            { label: "Emotional", score: latestData.emotional, sub: "Positive engagement, stable energy" },
          ].map((m) => (
            <div key={m.label} className="border border-border rounded-lg p-3 bg-card">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1">{m.label}</p>
              <p className="text-xl font-display text-foreground">{m.score}<span className="text-[11px] text-muted-foreground font-body">/100</span></p>
              <p className="text-[11px] text-muted-foreground mt-1 leading-snug">{m.sub}</p>
            </div>
          ))}
        </div>

        {/* Today's Call */}
        <div className="border border-border rounded-lg p-4 bg-card">
          <div className="flex items-center gap-2 mb-2">
            <Phone className="w-3.5 h-3.5 text-foreground" />
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Today's Call</p>
            <span className="ml-auto text-[11px] text-muted-foreground">10:30 AM · 12m 34s</span>
          </div>
          <p className="text-[13px] text-foreground leading-relaxed mb-3">
            Margaret discussed her morning walk and mentioned fatigue after gardening. She asked about her grandson's school play and appeared engaged throughout. Speech patterns consistent with baseline except elevated pause frequency.
          </p>
          <div className="flex gap-2 mb-3">
            {[
              { label: "Pause Freq", value: "4.2/min", baseline: "3.1", warn: true },
              { label: "Speech Rate", value: "142 wpm", baseline: "138", warn: false },
              { label: "Latency", value: "1.8s", baseline: "1.6s", warn: false },
            ].map((m) => (
              <span key={m.label} className={`px-2 py-1 rounded text-[10px] font-medium ${m.warn ? "bg-memo-amber/10 text-memo-amber" : "bg-muted text-muted-foreground"}`}>
                {m.label}: {m.value} vs {m.baseline}
              </span>
            ))}
          </div>
          <Link to="/health-signals" className="flex items-center gap-1 text-[12px] font-medium text-foreground hover:underline">
            View Health Signals <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
      </div>
    </MemoLayout>
  );
};

export default Dashboard;
