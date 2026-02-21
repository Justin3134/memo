import { MemoLayout } from "@/components/memo/MemoLayout";
import { AlertTriangle, Play, CheckCircle } from "lucide-react";
import { motion } from "framer-motion";
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
  { id: 1, date: "Feb 20, 2026", severity: "High", description: "Unusual speech pattern detected", detail: "Increased pause frequency (4.2/min vs 3.1/min baseline) and lower speech rate during morning call.", resolved: false },
  { id: 2, date: "Feb 18, 2026", severity: "Medium", description: "Slight pitch variance reduction", detail: "Pitch variance dropped to 16 Hz compared to 22 Hz baseline. May indicate fatigue or low mood.", resolved: false },
  { id: 3, date: "Feb 14, 2026", severity: "Low", description: "Shorter call duration than usual", detail: "Call lasted 6 minutes compared to average of 12 minutes. Margaret mentioned feeling tired.", resolved: true },
  { id: 4, date: "Feb 10, 2026", severity: "High", description: "Repeated word patterns detected", detail: "Margaret repeated the same story about her neighbor twice within 5 minutes. Possible short-term memory concern.", resolved: true },
  { id: 5, date: "Feb 7, 2026", severity: "Low", description: "Background noise affecting call quality", detail: "Television audio detected in background. Call quality reduced but no speech anomalies found.", resolved: true },
];

const severityStyles: Record<string, string> = {
  High: "bg-memo-red-light text-memo-red",
  Medium: "bg-memo-amber-light text-accent-foreground",
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
        <div className="flex items-center gap-3 mb-6">
          <AlertTriangle className="w-6 h-6 text-memo-amber" />
          <h1 className="text-2xl font-display font-bold text-foreground">Alerts</h1>
          <span className="text-sm text-muted-foreground ml-2">
            {alerts.filter(a => !a.resolved).length} unresolved
          </span>
        </div>

        <div className="space-y-4">
          {alerts.map((alert, i) => (
            <motion.div
              key={alert.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06 }}
              className={`bg-card rounded-xl border border-border p-5 shadow-sm transition-opacity ${alert.resolved ? "opacity-60" : ""}`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <span className={`text-xs px-2.5 py-0.5 rounded-full font-semibold ${severityStyles[alert.severity]}`}>
                      {alert.severity}
                    </span>
                    <span className="text-xs text-muted-foreground">{alert.date}</span>
                    {alert.resolved && (
                      <span className="flex items-center gap-1 text-xs text-primary font-medium">
                        <CheckCircle className="w-3.5 h-3.5" /> Resolved
                      </span>
                    )}
                  </div>
                  <p className="text-sm font-semibold text-foreground mb-1">{alert.description}</p>
                  <p className="text-sm text-muted-foreground leading-relaxed">{alert.detail}</p>
                </div>
                <div className="flex flex-col gap-2 flex-shrink-0">
                  <button className="flex items-center gap-1.5 px-3 py-1.5 bg-secondary text-secondary-foreground text-xs font-medium rounded-lg hover:bg-secondary/80 transition-colors">
                    <Play className="w-3 h-3" />
                    Listen
                  </button>
                  <button
                    onClick={() => toggleResolved(alert.id)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                      alert.resolved
                        ? "bg-muted text-muted-foreground hover:bg-muted/80"
                        : "bg-primary text-primary-foreground hover:opacity-90"
                    }`}
                  >
                    {alert.resolved ? "Reopen" : "Mark Resolved"}
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </MemoLayout>
  );
};

export default Alerts;
