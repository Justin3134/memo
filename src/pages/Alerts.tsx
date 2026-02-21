import { MemoLayout } from "@/components/memo/MemoLayout";
import { AlertTriangle, CheckCircle } from "lucide-react";
import { useState } from "react";

interface Alert {
  id: number;
  date: string;
  severity: "High" | "Medium" | "Low";
  description: string;
  detail: string;
  resolved: boolean;
}

const initialAlerts: Alert[] = [
  { id: 1, date: "Feb 20, 2026", severity: "High", description: "Elevated pause frequency", detail: "Pause frequency increased to 4.2/min from 3.1/min baseline over the past 3 calls. May indicate fatigue or early neurological change.", resolved: false },
  { id: 2, date: "Feb 18, 2026", severity: "Medium", description: "Reduced pitch variance", detail: "Pitch variance measured at 16 Hz vs 22 Hz baseline. Consistent with low energy or mood change.", resolved: false },
  { id: 3, date: "Feb 14, 2026", severity: "Low", description: "Below-average call duration", detail: "Call lasted 6 minutes vs 12-minute average. Margaret reported feeling tired.", resolved: true },
  { id: 4, date: "Feb 10, 2026", severity: "High", description: "Repetitive narrative pattern", detail: "Same anecdote repeated twice within 5 minutes. Flagged for short-term memory monitoring.", resolved: true },
  { id: 5, date: "Feb 7, 2026", severity: "Low", description: "Environmental audio interference", detail: "Television audio detected in background. Call quality affected but no speech anomalies identified.", resolved: true },
];

const severityStyles: Record<string, string> = {
  High: "bg-memo-red-light text-memo-red",
  Medium: "bg-memo-amber-light text-memo-amber",
  Low: "bg-secondary text-secondary-foreground",
};

const Alerts = () => {
  const [alerts, setAlerts] = useState(initialAlerts);

  const toggleResolved = (id: number) => {
    setAlerts(prev => prev.map(a => a.id === id ? { ...a, resolved: !a.resolved } : a));
  };

  return (
    <MemoLayout>
      <div className="max-w-4xl mx-auto animate-fade-in-up">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-display text-foreground">Health Signals</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {alerts.filter(a => !a.resolved).length} unresolved signals requiring review
            </p>
          </div>
        </div>

        <div className="space-y-3">
          {alerts.map((alert) => (
            <div
              key={alert.id}
              className={`bg-card rounded-lg border border-border p-5 transition-opacity ${alert.resolved ? "opacity-50" : ""}`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2.5 mb-1.5">
                    <span className={`text-[11px] px-2 py-0.5 rounded font-semibold ${severityStyles[alert.severity]}`}>
                      {alert.severity}
                    </span>
                    <span className="text-xs text-muted-foreground">{alert.date}</span>
                    {alert.resolved && (
                      <span className="flex items-center gap-1 text-xs text-primary font-medium">
                        <CheckCircle className="w-3 h-3" /> Reviewed
                      </span>
                    )}
                  </div>
                  <p className="text-sm font-medium text-foreground mb-0.5">{alert.description}</p>
                  <p className="text-sm text-muted-foreground leading-relaxed">{alert.detail}</p>
                </div>
                <button
                  onClick={() => toggleResolved(alert.id)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors flex-shrink-0 ${
                    alert.resolved
                      ? "bg-secondary text-muted-foreground hover:bg-secondary/80"
                      : "bg-foreground text-background hover:opacity-90"
                  }`}
                >
                  {alert.resolved ? "Reopen" : "Mark Reviewed"}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </MemoLayout>
  );
};

export default Alerts;
