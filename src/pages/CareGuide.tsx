import { MemoLayout } from "@/components/memo/MemoLayout";
import { ArrowRight, AlertTriangle, BookOpen, Sparkles, RefreshCw } from "lucide-react";
import { Link } from "react-router-dom";
import { useMemoDashboardData } from "@/hooks/useMemoDashboardData";

const CareGuide = () => {
  const { loading, error, patient, calls, alerts } = useMemoDashboardData();

  const latestAlert = alerts[0];
  const latestGuidanceTopic = calls.find((call) => call.videoGuidanceTopic)?.videoGuidanceTopic;
  const activeAlerts = alerts
    .slice()
    .sort((a, b) => b.timestamp - a.timestamp);

  if (loading) {
    return (
      <MemoLayout>
        <div className="max-w-4xl mx-auto animate-fade-in-up">
          <p className="text-sm text-muted-foreground">Loading care guidance...</p>
        </div>
      </MemoLayout>
    );
  }

  if (error) {
    return (
      <MemoLayout>
        <div className="max-w-4xl mx-auto animate-fade-in-up">
          <p className="text-sm text-memo-red">Unable to load care guide: {error}</p>
          <Link to="/dashboard" className="inline-flex items-center gap-1 mt-3 text-[12px] font-medium text-foreground hover:underline">
            Return to dashboard <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
      </MemoLayout>
    );
  }

  if (!patient) {
    return (
      <MemoLayout>
        <div className="max-w-4xl mx-auto animate-fade-in-up">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1">Guidance</p>
          <h1 className="text-xl font-display text-foreground tracking-tight mb-1">Care Guide</h1>
          <p className="text-[13px] text-muted-foreground mb-6">Framework mode: no patient profile yet.</p>
          <div className="grid gap-3 sm:grid-cols-3 mb-4">
            <div className="bg-card rounded-lg border border-border p-4">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-2">Primary Signal</p>
              <p className="text-[12px] text-muted-foreground">No active guidance yet.</p>
            </div>
            <div className="bg-card rounded-lg border border-border p-4">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-2">Alerts</p>
              <p className="text-[12px] text-muted-foreground">No alerts available.</p>
            </div>
            <div className="bg-card rounded-lg border border-border p-4">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-2">Next Step</p>
              <p className="text-[12px] text-muted-foreground">Complete onboarding to enable personalized care guidance.</p>
            </div>
          </div>
          <Link to="/onboarding" className="inline-flex items-center gap-1 text-[12px] font-medium text-foreground hover:underline">
            Register a patient <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
      </MemoLayout>
    );
  }

  return (
    <MemoLayout>
      <div className="max-w-4xl mx-auto animate-fade-in-up">
        <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1">Guidance</p>
        <h1 className="text-xl font-display text-foreground tracking-tight mb-1">Care Guide</h1>
        <p className="text-[13px] text-muted-foreground mb-6">Personalized guidance for {patient.name}</p>

        {/* Featured Video */}
        <div className="bg-card rounded-lg border border-border overflow-hidden mb-6">
          <div className="px-5 py-4">
            <div className="flex items-center gap-2 mb-2">
              <BookOpen className="w-4 h-4 text-foreground" />
              <p className="text-[10px] font-semibold text-primary uppercase tracking-wide">Primary Guidance Signal</p>
            </div>
            {latestAlert ? (
              <>
                <h2 className="text-base font-display text-foreground mb-1.5">{latestAlert.signalType}</h2>
                <p className="text-[12px] text-muted-foreground leading-relaxed mb-2">{latestAlert.description}</p>
                <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                  <span>Severity: <span className="font-medium text-foreground">{latestAlert.severity}</span></span>
                  <span>Today: <span className="font-medium text-foreground">{latestAlert.currentValue}</span></span>
                  <span>Baseline: <span className="font-medium text-foreground">{latestAlert.baselineValue}</span></span>
                </div>
                <p className="text-[11px] text-muted-foreground mt-2">
                  Recommended action: {latestAlert.recommendedAction || "Continue daily observation and review if this persists."}
                </p>
              </>
            ) : latestGuidanceTopic ? (
              <>
                <h2 className="text-base font-display text-foreground mb-1.5">Guidance Topic</h2>
                <p className="text-[12px] text-muted-foreground leading-relaxed">{latestGuidanceTopic}</p>
              </>
            ) : (
              <p className="text-[12px] text-muted-foreground leading-relaxed">No active guidance signals yet. Keep receiving calls to build trend-based guidance.</p>
            )}
          </div>
        </div>

        {/* Active Flags */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="w-4 h-4 text-memo-red" />
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Active Alerts</p>
          </div>
          <div className="space-y-2.5">
            {activeAlerts.length > 0 ? (
              activeAlerts.map((alert) => (
                <div key={alert._id} className="bg-card rounded-lg border border-border p-4 flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <p className="text-[13px] font-medium text-foreground">{alert.signalType}</p>
                    <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed">{alert.description}</p>
                  </div>
                  <span
                    className={`text-[10px] px-2 py-1 rounded font-semibold ${
                      alert.severity === "High"
                        ? "bg-memo-red-light text-memo-red"
                        : alert.severity === "Medium"
                          ? "bg-memo-amber-light text-memo-amber"
                          : "bg-memo-green/20 text-memo-green"
                    }`}
                  >
                    {alert.severity}
                  </span>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">No active alerts. No immediate follow-up action required.</p>
            )}
          </div>
        </div>

        {/* Data Framework */}
        <div className="grid gap-3 sm:grid-cols-3 mb-6">
          <div className="bg-card rounded-lg border border-border p-4">
            <div className="flex items-center gap-2 mb-2">
              <RefreshCw className="w-3.5 h-3.5 text-muted-foreground" />
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Baseline Check</p>
            </div>
            <p className="text-[12px] text-foreground leading-relaxed">
              Baseline cognitive score: {patient.baseline?.cognitiveScore ? Math.round(patient.baseline.cognitiveScore) : "Not calculated"}
            </p>
          </div>
          <div className="bg-card rounded-lg border border-border p-4">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="w-3.5 h-3.5 text-muted-foreground" />
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Signal Health</p>
            </div>
            <p className="text-[12px] text-foreground leading-relaxed">Recent call count: {calls.length}</p>
            <p className="text-[12px] text-foreground leading-relaxed mt-1">Recent alerts: {activeAlerts.length}</p>
          </div>
          <div className="bg-card rounded-lg border border-border p-4">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-2">Framework</p>
            <p className="text-[12px] text-foreground leading-relaxed">Use alerts, call summaries, and trend movement to decide when to escalate with a clinician.</p>
          </div>
        </div>
      </div>
    </MemoLayout>
  );
};

export default CareGuide;
