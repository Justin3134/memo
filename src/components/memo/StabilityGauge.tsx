interface StabilityGaugeProps {
  score: number;
}

export function StabilityGauge({ score }: StabilityGaugeProps) {
  const radius = 45;
  const circumference = 2 * Math.PI * radius;
  const progress = (score / 100) * circumference;
  const offset = circumference - progress;

  const getColor = () => {
    if (score >= 75) return "text-primary";
    if (score >= 50) return "text-memo-amber";
    return "text-memo-red";
  };

  const getStrokeColor = () => {
    if (score >= 75) return "hsl(var(--primary))";
    if (score >= 50) return "hsl(var(--memo-amber))";
    return "hsl(var(--memo-red))";
  };

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width="120" height="120" viewBox="0 0 120 120" className="-rotate-90">
        <circle
          cx="60"
          cy="60"
          r={radius}
          fill="none"
          stroke="hsl(var(--border))"
          strokeWidth="8"
        />
        <circle
          cx="60"
          cy="60"
          r={radius}
          fill="none"
          stroke={getStrokeColor()}
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="animate-gauge-fill transition-all duration-1000"
          style={{ strokeDashoffset: offset }}
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className={`text-2xl font-bold ${getColor()}`}>{score}</span>
        <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">Stability</span>
      </div>
    </div>
  );
}
