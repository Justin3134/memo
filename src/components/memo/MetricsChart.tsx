import { XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from "recharts";

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
  data[25].score = 52;
  data[26].score = 48;
  return data;
};

const data = generateData();

const CustomDot = (props: any) => {
  const { cx, cy, payload } = props;
  if (payload.score < 55) {
    return <circle cx={cx} cy={cy} r={4} fill="hsl(4, 60%, 50%)" stroke="white" strokeWidth={2} />;
  }
  return null;
};

export function MetricsChart() {
  return (
    <div className="bg-card rounded-lg border border-border p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide">Cognitive Stability Index</h3>
          <p className="text-xs text-muted-foreground mt-0.5">30-day rolling analysis</p>
        </div>
      </div>
      <ResponsiveContainer width="100%" height={240}>
        <AreaChart data={data} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
          <defs>
            <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="hsl(199, 55%, 36%)" stopOpacity={0.12} />
              <stop offset="95%" stopColor="hsl(199, 55%, 36%)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(210, 16%, 90%)" vertical={false} />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 11, fill: "hsl(215, 12%, 50%)" }}
            tickLine={false}
            axisLine={false}
            interval={4}
          />
          <YAxis
            domain={[30, 100]}
            tick={{ fontSize: 11, fill: "hsl(215, 12%, 50%)" }}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "hsl(0, 0%, 100%)",
              border: "1px solid hsl(210, 16%, 90%)",
              borderRadius: "6px",
              fontSize: "12px",
              boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
            }}
          />
          <Area type="monotone" dataKey="score" stroke="hsl(199, 55%, 36%)" strokeWidth={2} fill="url(#colorScore)" dot={<CustomDot />} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
