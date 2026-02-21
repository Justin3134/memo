import { MemoLayout } from "@/components/memo/MemoLayout";
import { Link } from "react-router-dom";
import { Phone, TrendingUp, TrendingDown, Minus, Calendar, MapPin, ArrowRight } from "lucide-react";
import { XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from "recharts";
import { useState } from "react";

const generateData = () => {
  const data = [];
  const now = new Date();
  for (let i = 29; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    data.push({
      date: date.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      motor: Math.round(72 + Math.sin(i * 0.3) * 8 + (Math.random() - 0.5) * 6),
      cognitive: Math.round(78 + Math.sin(i * 0.25) * 6 + (Math.random() - 0.5) * 8),
      emotional: Math.round(80 + Math.sin(i * 0.2) * 5 + (Math.random() - 0.5) * 4),
      flagged: i === 4 || i === 3,
    });
  }
  return data;
};

const chartData = generateData();

const gauges = [
  { label: "Motor Health", score: 74, trend: "stable" as const, detail: "Slight tremor increase noted this week. Speech articulation within normal range." },
  { label: "Cognitive Health", score: 68, trend: "down" as const, detail: "Word recall slightly slower than usual. Pause frequency elevated over the past 3 calls." },
  { label: "Emotional Wellness", score: 85, trend: "up" as const, detail: "Positive engagement in conversations. Energy levels consistent with baseline." },
];

const callMetrics = [
  { label: "Pause Freq", value: "4.2/min", baseline: "3.1", direction: "up" as const, status: "warning" as const },
  { label: "Speech Rate", value: "142 wpm", baseline: "138", direction: "stable" as const, status: "ok" as const },
  { label: "Response Latency", value: "1.8s", baseline: "1.6s", direction: "stable" as const, status: "ok" as const },
];

const recentCalls = [
  { date: "Feb 20", summary: "Discussed morning walk and gardening. Mentioned grandson Tommy's school play. Engaged throughout.", tag: "Family" },
  { date: "Feb 19", summary: "Reported improved blood pressure at checkup. Positive mood, clear articulation.", tag: "Health" },
  { date: "Feb 18", summary: "Talked about baking a lemon cake. Detailed recipe recall, no pauses noted.", tag: "Daily Life" },
];

function ScoreGauge({ label, score, trend, detail }: { label: string; score: number; trend: "up" | "down" | "stable"; detail: string }) {
  const getColor = () => {
    if (score >= 75) return { ring: "text-primary", bg: "bg-primary/10", text: "text-primary" };
    if (score >= 55) return { ring: "text-memo-amber", bg: "bg-memo-amber/10", text: "text-memo-amber" };
    return { ring: "text-memo-red", bg: "bg-memo-red/10", text: "text-memo-red" };
  };
  const colors = getColor();
  const TrendIcon = trend === "up" ? TrendingUp : trend === "down" ? TrendingDown : Minus;

  return (
    <div className="bg-card rounded-lg border border-border p-4">
      <div className="flex items-center justify-between mb-2">
        <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">{label}</p>
        <TrendIcon className={`w-3.5 h-3.5 ${trend === "down" ? "text-memo-amber" : "text-muted-foreground"}`} />
      </div>
      <div className="flex items-baseline gap-1.5 mb-2">
        <span className={`text-2xl font-bold ${colors.text}`}>{score}</span>
        <span className="text-[11px] text-muted-foreground">/100</span>
      </div>
      <p className="text-[12px] text-muted-foreground leading-relaxed">{detail}</p>
    </div>
  );
}

const Dashboard = () => {
  const [chartMetric, setChartMetric] = useState<"motor" | "cognitive" | "emotional">("cognitive");
  const overallStatus = "watch";
  const statusConfig = {
    stable: { label: "Stable", className: "bg-primary/10 text-primary" },
    watch: { label: "Watch", className: "bg-memo-amber/10 text-memo-amber" },
    alert: { label: "Alert", className: "bg-memo-red/10 text-memo-red" },
  };
  const status = statusConfig[overallStatus];

  return (
    <MemoLayout>
      <div className="max-w-5xl mx-auto space-y-5 animate-fade-in-up">
        {/* Status Bar */}
        <div className="bg-card rounded-lg border border-border p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center text-sm font-bold text-muted-foreground">MW</div>
              <div>
                <h1 className="text-lg font-display text-foreground">Margaret Wilson</h1>
                <p className="text-[12px] text-muted-foreground">Last called today at 10:30 AM, 12 min 34 sec</p>
              </div>
            </div>
            <span className={`px-3 py-1 rounded-md text-[12px] font-semibold ${status.className}`}>{status.label}</span>
          </div>
          <p className="text-[13px] text-foreground">Elevated pause frequency detected today. 4.2 pauses/min vs 3.1 baseline. Cognitive score trending lower over the past week.</p>
        </div>

        {/* Three Gauges */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {gauges.map((g) => (
            <ScoreGauge key={g.label} {...g} />
          ))}
        </div>

        {/* Chart + Today's Call */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
          {/* Chart */}
          <div className="lg:col-span-3 bg-card rounded-lg border border-border p-5">
            <div className="flex items-center justify-between mb-4">
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">30-Day Trend</p>
              <div className="flex gap-1">
                {(["motor", "cognitive", "emotional"] as const).map((m) => (
                  <button
                    key={m}
                    onClick={() => setChartMetric(m)}
                    className={`px-2.5 py-1 text-[11px] font-medium rounded-md transition-colors ${
                      chartMetric === m ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-secondary"
                    }`}
                  >
                    {m.charAt(0).toUpperCase() + m.slice(1)}
                  </button>
                ))}
              </div>
            </div>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(199, 55%, 36%)" stopOpacity={0.1} />
                    <stop offset="95%" stopColor="hsl(199, 55%, 36%)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(210, 16%, 90%)" vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: "hsl(215, 12%, 50%)" }} tickLine={false} axisLine={false} interval={5} />
                <YAxis domain={[40, 100]} tick={{ fontSize: 10, fill: "hsl(215, 12%, 50%)" }} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ backgroundColor: "hsl(0,0%,100%)", border: "1px solid hsl(210,16%,90%)", borderRadius: "6px", fontSize: "11px" }} />
                <Area type="monotone" dataKey={chartMetric} stroke="hsl(199, 55%, 36%)" strokeWidth={1.5} fill="url(#chartGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Today's Call */}
          <div className="lg:col-span-2 bg-card rounded-lg border border-border p-5">
            <div className="flex items-center gap-2 mb-3">
              <Phone className="w-3.5 h-3.5 text-primary" />
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Today's Call</p>
              <span className="ml-auto text-[11px] text-muted-foreground">10:30 AM, 12m 34s</span>
            </div>
            <p className="text-[13px] text-foreground leading-relaxed mb-4">
              Margaret discussed her morning walk and mentioned fatigue after gardening yesterday. She asked about her grandson Tommy's school play and appeared engaged throughout. She recalled baking a lemon cake last week with detailed recipe steps.
            </p>
            <div className="flex flex-wrap gap-2 mb-4">
              {callMetrics.map((m) => (
                <div key={m.label} className={`px-2.5 py-1.5 rounded-md text-[11px] font-medium ${
                  m.status === "warning" ? "bg-memo-amber/10 text-memo-amber" : "bg-secondary text-muted-foreground"
                }`}>
                  {m.label}: {m.value} vs {m.baseline} {m.direction === "up" ? "↑" : "→"}
                </div>
              ))}
            </div>
            <Link to="/health-signals" className="flex items-center gap-1 text-[12px] font-medium text-primary hover:underline">
              View Health Signals <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
        </div>

        {/* Recent Calls */}
        <div className="bg-card rounded-lg border border-border p-5">
          <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-3">Recent Calls</p>
          <div className="space-y-2">
            {recentCalls.map((call, i) => (
              <div key={i} className="border border-border rounded-md p-3 hover:bg-secondary/30 transition-colors cursor-pointer">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[11px] text-muted-foreground font-medium">{call.date}</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-secondary text-muted-foreground font-medium">{call.tag}</span>
                </div>
                <p className="text-[13px] text-foreground leading-relaxed">{call.summary}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Link to="/find-care" className="flex items-center gap-2.5 bg-card border border-border rounded-lg p-4 hover:bg-secondary/30 transition-colors">
            <Calendar className="w-4 h-4 text-primary" />
            <span className="text-[13px] font-medium text-foreground">Book Appointment</span>
          </Link>
          <Link to="/find-care" className="flex items-center gap-2.5 bg-card border border-border rounded-lg p-4 hover:bg-secondary/30 transition-colors">
            <MapPin className="w-4 h-4 text-primary" />
            <span className="text-[13px] font-medium text-foreground">Find Local Specialists</span>
          </Link>
          <button className="flex items-center gap-2.5 bg-card border border-border rounded-lg p-4 hover:bg-secondary/30 transition-colors text-left">
            <Phone className="w-4 h-4 text-primary" />
            <span className="text-[13px] font-medium text-foreground">Call Margaret Now</span>
          </button>
        </div>
      </div>
    </MemoLayout>
  );
};

export default Dashboard;
