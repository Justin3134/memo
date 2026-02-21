import { useMemo, useState } from "react";
import { Phone, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart,
  ComposedChart,
  ReferenceLine,
} from "recharts";
import { MemoLayout } from "@/components/memo/MemoLayout";
import { useMemoDashboardData } from "@/hooks/useMemoDashboardData";

const Dashboard = () => {
  const [activeMetric, setActiveMetric] = useState<"cognitive" | "motor" | "emotional">("cognitive");
  const { loading, error, patient, calls, memories } = useMemoDashboardData();

  const chartData = useMemo(() => {
    return [...calls]
      .sort((a, b) => a.startedAt - b.startedAt)
      .map((call) => ({
        date: new Date(call.startedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        cognitive: Math.round(
          call.cognitiveScore ??
            patient?.baseline?.cognitiveScore ??
            (call.status === "completed" ? 72 : 70),
        ),
        motor: Math.round(call.motorScore ?? patient?.baseline?.motorScore ?? 70),
        emotional: Math.round(call.emotionalScore ?? patient?.baseline?.emotionalScore ?? 70),
      }));
  }, [calls, patient?.baseline]);

  const latestCall = useMemo(() => calls[0] ?? null, [calls]);
  const latestScore = latestCall?.cognitiveScore ?? patient?.baseline?.cognitiveScore ?? 70;
  const statusLabel = latestScore >= 75 ? "Stable" : latestScore >= 60 ? "Watch" : "Alert";
  const statusColor =
    latestScore >= 75
      ? "bg-memo-green text-background"
      : latestScore >= 60
      ? "bg-memo-amber text-background"
      : "bg-memo-red text-background";

  const lastCallSummary = latestCall?.summary ?? "No call summary available yet.";
  const lastCallTimeLabel = latestCall
    ? `${new Date(latestCall.startedAt).toLocaleTimeString([], {
        hour: "numeric",
        minute: "2-digit",
      })} · ${(latestCall.duration ?? 0)}s`
    : "No call logged yet";

  const metricCards = [
    {
      label: "Cognitive",
      score: Math.round(latestCall?.cognitiveScore ?? patient?.baseline?.cognitiveScore ?? 0),
      sub: latestCall?.speechRate
        ? `Speech rate: ${Math.round(latestCall.speechRate)} wpm`
        : "Waiting for a completed call",
    },
    {
      label: "Motor",
      score: Math.round(latestCall?.motorScore ?? patient?.baseline?.motorScore ?? 0),
      sub: latestCall?.pauseFrequency
        ? `Pause frequency: ${latestCall.pauseFrequency.toFixed(1)}/min`
        : "Motor trend needs at least one analysis",
    },
    {
      label: "Emotional",
      score: Math.round(latestCall?.emotionalScore ?? patient?.baseline?.emotionalScore ?? 0),
      sub: memories[0]
        ? `Latest memory: ${memories[0].category} · ${memories[0].sentiment}`
        : "Collecting emotional baseline",
    },
  ];

  if (loading) {
    return (
      <MemoLayout>
        <div className="max-w-4xl mx-auto animate-fade-in-up space-y-4 text-sm text-muted-foreground">
          Loading live dashboard data...
        </div>
      </MemoLayout>
    );
  }

  if (error) {
    return (
      <MemoLayout>
        <div className="max-w-4xl mx-auto animate-fade-in-up">
          <p className="text-sm text-memo-red">Unable to load live data: {error}</p>
        </div>
      </MemoLayout>
    );
  }

  if (!patient) {
    return (
      <MemoLayout>
        <div className="max-w-4xl mx-auto animate-fade-in-up space-y-4">
          <p className="text-sm text-muted-foreground">No patient found for this family profile.</p>
          <Link to="/onboarding" className="inline-flex items-center gap-1 text-[12px] font-medium text-foreground hover:underline">
            Register a patient
          </Link>
        </div>
      </MemoLayout>
    );
  }

  return (
    <MemoLayout>
      <div className="max-w-4xl mx-auto animate-fade-in-up space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-display text-foreground tracking-tight">{patient.name}</h1>
            <p className="text-[11px] text-muted-foreground">{lastCallTimeLabel}</p>
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
          {metricCards.map((m) => (
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
            <span className="ml-auto text-[11px] text-muted-foreground">{lastCallTimeLabel}</span>
          </div>
          <p className="text-[13px] text-foreground leading-relaxed mb-3">
            {lastCallSummary}
          </p>
          <div className="flex gap-2 mb-3">
            {[
              { label: "Pause Freq", value: `${latestCall?.pauseFrequency?.toFixed(1) ?? "-"}/min`, baseline: `${patient?.baseline?.pauseFrequency?.toFixed(1) ?? "-"}`, warn: !!latestCall && latestCall.pauseFrequency ? latestCall.pauseFrequency > (patient?.baseline?.pauseFrequency ?? 0) + 1.0 : false },
              { label: "Speech Rate", value: `${Math.round(latestCall?.speechRate ?? 0)} wpm`, baseline: `${Math.round(patient?.baseline?.speechRate ?? 0)}`, warn: false },
              { label: "Latency", value: `${latestCall?.responseLatency?.toFixed(1) ?? "-" } s`, baseline: `${patient?.baseline?.responseLatency?.toFixed(1) ?? "-"}`, warn: false },
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
