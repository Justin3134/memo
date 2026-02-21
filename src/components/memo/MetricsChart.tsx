import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from "recharts";

const generateData = () => {
  const data = [];
  const now = new Date();
  for (let i = 29; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    const base = 78 + Math.sin(i * 0.3) * 8;
    const score = Math.round(base + (Math.random() - 0.5) * 10);
    data.push({
      date: date.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      score: Math.max(40, Math.min(100, score)),
    });
  }
  // Add a dip for anomaly
  data[25].score = 52;
  data[26].score = 48;
  return data;
};

const data = generateData();

const getStrokeColor = (score: number) => {
  if (score >= 70) return "hsl(152, 32%, 42%)";
  if (score >= 55) return "hsl(38, 80%, 55%)";
  return "hsl(0, 62%, 55%)";
};

const CustomDot = (props: any) => {
  const { cx, cy, payload } = props;
  const color = getStrokeColor(payload.score);
  if (payload.score < 55) {
    return <circle cx={cx} cy={cy} r={5} fill={color} stroke="white" strokeWidth={2} />;
  }
  return null;
};

export function MetricsChart() {
  return (
    <div className="bg-card rounded-xl border border-border p-6 shadow-sm">
      <h3 className="text-lg font-display font-semibold text-foreground mb-1">Speech Health Metrics</h3>
      <p className="text-sm text-muted-foreground mb-6">Cognitive Stability Index — Past 30 Days</p>
      <ResponsiveContainer width="100%" height={260}>
        <AreaChart data={data} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
          <defs>
            <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="hsl(152, 32%, 42%)" stopOpacity={0.15} />
              <stop offset="95%" stopColor="hsl(152, 32%, 42%)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(40, 18%, 88%)" vertical={false} />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 11, fill: "hsl(150, 8%, 48%)" }}
            tickLine={false}
            axisLine={false}
            interval={4}
          />
          <YAxis
            domain={[30, 100]}
            tick={{ fontSize: 11, fill: "hsl(150, 8%, 48%)" }}
            tickLine={false}
            axisLine={false}
            label={{
              value: "Cognitive Stability Index",
              angle: -90,
              position: "insideLeft",
              offset: 20,
              style: { fontSize: 11, fill: "hsl(150, 8%, 48%)" },
            }}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "hsl(0, 0%, 100%)",
              border: "1px solid hsl(40, 18%, 88%)",
              borderRadius: "8px",
              fontSize: "13px",
              boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
            }}
          />
          <Area type="monotone" dataKey="score" stroke="hsl(152, 32%, 42%)" strokeWidth={2.5} fill="url(#colorScore)" dot={<CustomDot />} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
