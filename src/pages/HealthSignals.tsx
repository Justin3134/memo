import { MemoLayout } from "@/components/memo/MemoLayout";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ResponsiveContainer, Area, AreaChart } from "recharts";
import { useMemoDashboardData } from "@/hooks/useMemoDashboardData";
import { ArrowUpRight, RotateCcw, Search, ExternalLink, ShieldCheck, ShieldAlert, Brain } from "lucide-react";

const BACKEND = import.meta.env.VITE_BACKEND_URL ?? "http://localhost:8000";

function VoiceMetric({ label, value, unit, status }: { label: string; value: string; unit: string; status: "ok" | "watch" | "warn" | "none" }) {
  const dot = status === "warn" ? "bg-memo-red" : status === "watch" ? "bg-memo-amber" : status === "ok" ? "bg-memo-green" : "bg-muted-foreground/20";
  return (
    <div className="flex items-center gap-2.5">
      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${dot}`} />
      <span className="text-[12px] text-muted-foreground flex-1">{label}</span>
      <span className="text-[13px] font-semibold tabular text-foreground">{value}</span>
      <span className="text-[10px] text-muted-foreground w-6">{unit}</span>
    </div>
  );
}

function MiniStat({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="bg-muted/40 rounded px-2.5 py-1.5">
      <p className="text-[9px] text-muted-foreground uppercase tracking-wide">{label}</p>
      <p className={`text-[13px] font-semibold tabular ${color ?? "text-foreground"}`}>{value}</p>
    </div>
  );
}

// Map internal signal types to plain English
const signalLabel = (s: string) => {
  const map: Record<string, string> = {
    composite: "multiple signals",
    word_finding_decline: "word finding",
    word_finding_difficulty: "word finding",
    memory_gaps: "memory gaps",
    memory_lapse: "memory lapse",
    emotional_distress: "emotional distress",
    cognitive_decline: "cognitive decline",
    physical_concern: "physical concern",
    loneliness_indicator: "loneliness",
    confusion_indicator: "confusion",
    sleep_problem: "sleep issues",
  };
  return map[s] ?? s.replace(/_/g, " ");
};

// Extract a short first-sentence summary from description
const shortSummary = (desc: string): string => {
  if (!desc) return "";
  const first = desc.split(/\.\s+/)[0];
  return first.length > 120 ? first.slice(0, 117) + "…" : first + ".";
};

const severityDot = (s: string) =>
  s === "high" ? "bg-memo-red" : s === "medium" ? "bg-memo-amber" : "bg-memo-green";
const severityTextColor = (s: string) =>
  s === "high" ? "text-memo-red" : s === "medium" ? "text-memo-amber" : "text-memo-green";

function SensoSearch({ patientId }: { patientId?: string }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Array<{ title?: string; body?: string; content?: string; text?: string }>>([]);
  const [searching, setSearching] = useState(false);
  const [searched, setSearched] = useState(false);

  const runSearch = async () => {
    if (!query.trim() || !patientId) return;
    setSearching(true);
    try {
      const res = await fetch(`${BACKEND}/search/memory`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ patient_id: patientId, query: query.trim() }),
      });
      if (res.ok) {
        const data = await res.json();
        setResults(data.results ?? []);
      }
      setSearched(true);
    } catch { /* silent */ }
    finally { setSearching(false); }
  };

  return (
    <div className="p-6 border-b border-border">
      <div className="flex items-center gap-1.5 mb-3">
        <Brain className="w-3.5 h-3.5 text-indigo-500" strokeWidth={2} />
        <p className="text-[11px] font-medium text-indigo-600 uppercase tracking-wide">Senso Memory Search</p>
      </div>
      <p className="text-[10px] text-muted-foreground mb-2.5 leading-relaxed">
        Search across all past conversations
      </p>
      <div className="flex gap-1.5">
        <div className="flex-1 relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground/50" strokeWidth={2} />
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={e => e.key === "Enter" && runSearch()}
            placeholder="Has she mentioned falls?"
            className="w-full pl-7 pr-2 py-1.5 text-[11px] border border-border rounded-md bg-white focus:outline-none focus:ring-1 focus:ring-indigo-200 focus:border-indigo-300 transition-colors placeholder:text-muted-foreground/40"
          />
        </div>
        <button
          onClick={runSearch}
          disabled={searching || !query.trim()}
          className="px-2.5 py-1.5 text-[10px] font-medium bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-40 transition-colors shrink-0"
        >
          {searching ? "…" : "Ask"}
        </button>
      </div>
      {searched && results.length === 0 && (
        <p className="text-[10px] text-muted-foreground mt-2">No matches found.</p>
      )}
      {results.length > 0 && (
        <div className="mt-2.5 space-y-1.5">
          {results.slice(0, 3).map((r, i) => (
            <div key={i} className="p-2 bg-indigo-50/50 rounded-md border border-indigo-100/50">
              {r.title && <p className="text-[10px] font-medium text-indigo-700 mb-0.5">{r.title}</p>}
              <p className="text-[10px] text-foreground/65 leading-relaxed">
                {(r.body || r.content || r.text || "").slice(0, 150)}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function HealthSignals() {
  const navigate = useNavigate();
  const { loading, patient, calls, alerts, memories } = useMemoDashboardData();
  // dismissed = grayed out, not removed
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [selectedDay, setSelectedDay] = useState<number | null>(null);

  const sortedCalls = useMemo(() => [...calls].sort((a, b) => a.startedAt - b.startedAt), [calls]);

  const timeline = useMemo(() => {
    const baseline = patient?.baseline?.cognitiveScore ?? 70;
    return sortedCalls.slice(-30).map((call, index) => {
      const score = Math.max(40, Math.min(100, Math.round(call.cognitiveScore ?? baseline)));
      return { index, call,
               date: new Date(call.startedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
               score, status: score < 55 ? "alert" : score < 70 ? "watch" : "ok" };
    });
  }, [sortedCalls, patient?.baseline?.cognitiveScore]);

  const selectedCall = selectedDay !== null ? timeline[selectedDay]?.call : null;
  const latestCall = calls[0];

  const signalCharts = useMemo(() => {
    const r = sortedCalls.slice(-20);
    return [
      { title: "Speech Rate", unit: "wpm", data: r.map((c, i) => ({ i: i + 1, v: Math.round(c.speechRate ?? 130) })) },
      { title: "Pauses", unit: "/min", data: r.map((c, i) => ({ i: i + 1, v: +(c.pauseFrequency ?? 3.1).toFixed(1) })) },
      { title: "Emotional", unit: "/100", data: r.map((c, i) => ({ i: i + 1, v: Math.round(c.emotionalScore ?? 80) })) },
    ];
  }, [sortedCalls]);

  const toggleDismiss = (id: string) => {
    setDismissed(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  useEffect(() => {
    if (!loading && !patient) navigate("/", { replace: true });
  }, [loading, patient, navigate]);

  if (loading) return (
    <MemoLayout><div className="p-8 text-[13px] text-muted-foreground">Loading…</div></MemoLayout>
  );
  if (!patient) return (
    <MemoLayout><div className="p-8 text-[13px] text-muted-foreground">Redirecting…</div></MemoLayout>
  );

  const activeAlerts = alerts.filter(a => !dismissed.has(a._id));

  return (
    <MemoLayout>
      <div className="flex h-full">

        {/* ── Left: heatmap + alerts + conversation signals ── */}
        <div className="flex-1 min-w-0 flex flex-col overflow-auto">

          {/* Header */}
          <div className="flex items-center justify-between px-8 pt-7 pb-5 border-b border-border">
            <div>
              <h1 className="text-[15px] font-semibold text-foreground">Signals</h1>
              <p className="text-[12px] text-muted-foreground mt-0.5">
                {calls.length} {calls.length === 1 ? "call" : "calls"} analysed
                {activeAlerts.length > 0 && (
                  <> · <span className="text-memo-amber">{activeAlerts.length} active</span></>
                )}
                {activeAlerts.length === 0 && alerts.length > 0 && (
                  <> · <span className="text-memo-green">all reviewed</span></>
                )}
              </p>
            </div>
          </div>

          {/* 30-day heatmap — first */}
          <div className="px-8 py-5 border-b border-border">
            <p className="text-[11px] font-medium text-muted-foreground mb-3 uppercase tracking-wide">
              30-day heatmap
            </p>
            {timeline.length === 0 ? (
              <p className="text-[12px] text-muted-foreground">Appears after the first call.</p>
            ) : (
              <>
                <div className="flex gap-[3px]">
                  {timeline.map(day => {
                    const isOk = day.status === "ok";
                    const greenL = isOk ? Math.round(88 - Math.max(0, day.score - 70) * 0.7) : 0;
                    return (
                      <button
                        key={day.index}
                        onClick={() => setSelectedDay(selectedDay === day.index ? null : day.index)}
                        title={`${day.date}: ${day.score}/100`}
                        style={isOk ? { backgroundColor: `hsl(142,52%,${greenL}%)` } : undefined}
                        className={`flex-1 h-7 rounded-sm transition-all ${
                          day.status === "alert" ? "bg-memo-red/75" :
                          day.status === "watch" ? "bg-memo-amber/65" : ""
                        } ${selectedDay === day.index ? "ring-1 ring-offset-1 ring-foreground/40" : "hover:opacity-75"}`}
                      />
                    );
                  })}
                </div>
                <div className="flex justify-between mt-1.5">
                  <span className="text-[10px] text-muted-foreground">{timeline[0]?.date}</span>
                  <span className="text-[10px] text-muted-foreground">Today</span>
                </div>
              </>
            )}

            {selectedDay !== null && timeline[selectedDay] && (
              <div className="mt-3 flex items-center gap-3">
                <span className="text-[13px] font-medium text-foreground">{timeline[selectedDay].date}</span>
                <span className="text-[13px] tabular text-muted-foreground">{timeline[selectedDay].score}/100</span>
                {timeline[selectedDay].status !== "ok" && (
                  <span className={`text-[12px] ${timeline[selectedDay].status === "alert" ? "text-memo-red" : "text-memo-amber"}`}>
                    {timeline[selectedDay].status === "alert" ? "significant change" : "minor deviation"}
                  </span>
                )}
                {selectedCall?.healthMentions?.map((m, i) => (
                  <span key={i} className="text-[11px] text-muted-foreground bg-muted px-2 py-0.5 rounded">{m}</span>
                ))}
              </div>
            )}
          </div>

          {/* Active alerts */}
          {alerts.length > 0 && (
            <div className="px-8 py-5 border-b border-border">
              <p className="text-[11px] font-medium text-muted-foreground mb-3 uppercase tracking-wide">
                Alerts
                {alerts.filter(a => !dismissed.has(a._id)).length === 0 && alerts.length > 0 && (
                  <span className="ml-2 normal-case font-normal text-memo-green">all reviewed</span>
                )}
              </p>

              {/* Active (not reviewed) */}
              <div className="space-y-3">
                {alerts.slice(0, 6).filter(a => !dismissed.has(a._id)).map(alert => {
                  const label = signalLabel(alert.signalType ?? "");
                  const summary = shortSummary(alert.description ?? "");
                  const quotes = alert.evidenceQuotes ?? [];
                  const metrics = alert.evidenceMetrics;
                  const research = alert.researchItems;
                  const hasReka = alert.rekaAgrees != null;
                  return (
                    <div key={alert._id} className="rounded-lg border border-border bg-white">
                      <div className="flex items-center gap-2.5 px-4 pt-3 pb-2">
                        <span className={`w-2 h-2 rounded-full shrink-0 ${severityDot(alert.severity)}`} />
                        <span className="text-[13px] font-medium text-foreground capitalize flex-1">{label}</span>
                        <span className="text-[11px] text-muted-foreground">
                          {new Date(alert.timestamp ?? 0).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                        </span>
                        <span className={`text-[11px] font-medium capitalize ${severityTextColor(alert.severity)}`}>
                          {alert.severity}
                        </span>
                      </div>
                      <div className="px-4 pb-2">
                        <p className="text-[12px] text-foreground/80 leading-relaxed">{summary}</p>
                      </div>

                      {/* Modulate Velma-2 evidence metrics */}
                      {metrics && metrics.source === "modulate_velma2" && (
                        <div className="mx-4 mb-2.5 p-2.5 bg-[#F7F7FF] rounded-md border border-[#E8E8F5]">
                          <div className="flex items-center gap-1.5 mb-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#8b5cf6]" />
                            <span className="text-[10px] font-medium text-[#7c3aed] uppercase tracking-wide">Modulate Velma-2 Evidence</span>
                          </div>
                          <div className="grid grid-cols-3 gap-x-3 gap-y-1.5">
                            {metrics.speechRate != null && (
                              <div>
                                <p className="text-[9px] text-muted-foreground">Speech Rate</p>
                                <p className="text-[12px] font-semibold tabular-nums text-foreground">{Math.round(metrics.speechRate)} <span className="text-[9px] font-normal text-muted-foreground">wpm</span></p>
                              </div>
                            )}
                            {metrics.pauseFrequency != null && (
                              <div>
                                <p className="text-[9px] text-muted-foreground">Pauses</p>
                                <p className="text-[12px] font-semibold tabular-nums text-foreground">{metrics.pauseFrequency.toFixed(1)} <span className="text-[9px] font-normal text-muted-foreground">/min</span></p>
                              </div>
                            )}
                            {metrics.fluencyScore != null && (
                              <div>
                                <p className="text-[9px] text-muted-foreground">Fluency</p>
                                <p className="text-[12px] font-semibold tabular-nums text-foreground">{Math.round(metrics.fluencyScore)} <span className="text-[9px] font-normal text-muted-foreground">/100</span></p>
                              </div>
                            )}
                            {metrics.dominantEmotion && (
                              <div>
                                <p className="text-[9px] text-muted-foreground">Emotion</p>
                                <p className="text-[12px] font-medium text-foreground capitalize">{metrics.dominantEmotion}</p>
                              </div>
                            )}
                            {metrics.hesitationEvents != null && (
                              <div>
                                <p className="text-[9px] text-muted-foreground">Hesitations</p>
                                <p className="text-[12px] font-semibold tabular-nums text-foreground">{metrics.hesitationEvents}</p>
                              </div>
                            )}
                            {metrics.longPauses != null && (
                              <div>
                                <p className="text-[9px] text-muted-foreground">Long Pauses</p>
                                <p className="text-[12px] font-semibold tabular-nums text-foreground">{metrics.longPauses}</p>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Reka cross-validation consensus */}
                      {hasReka && (
                        <div className={`mx-4 mb-2.5 flex items-start gap-2 p-2.5 rounded-md border ${
                          alert.rekaAgrees ? "bg-emerald-50/60 border-emerald-200/60" : "bg-amber-50/60 border-amber-200/60"
                        }`}>
                          {alert.rekaAgrees
                            ? <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" strokeWidth={2} />
                            : <ShieldAlert className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" strokeWidth={2} />
                          }
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className={`text-[10px] font-medium uppercase tracking-wide ${alert.rekaAgrees ? "text-emerald-700" : "text-amber-700"}`}>
                                Reka {alert.rekaAgrees ? "Confirms" : "Flags concern"}
                              </span>
                              {alert.rekaConfidence && (
                                <span className="text-[9px] text-muted-foreground">· {alert.rekaConfidence} confidence</span>
                              )}
                            </div>
                            {alert.rekaReasoning && (
                              <p className="text-[11px] text-foreground/65 leading-relaxed mt-0.5">{alert.rekaReasoning}</p>
                            )}
                          </div>
                        </div>
                      )}

                      {quotes.length > 0 && (
                        <div className="mx-4 mb-2.5 pl-2.5 border-l-2 border-border">
                          {quotes.slice(0, 2).map((q, i) => (
                            <p key={i} className="text-[11px] text-muted-foreground italic leading-relaxed">{q}</p>
                          ))}
                        </div>
                      )}

                      {/* Tavily clinical research */}
                      {research && research.length > 0 && (
                        <div className="mx-4 mb-2.5 p-2.5 bg-sky-50/60 rounded-md border border-sky-200/50">
                          <div className="flex items-center gap-1.5 mb-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-sky-500" />
                            <span className="text-[10px] font-medium text-sky-700 uppercase tracking-wide">Clinical Evidence via Tavily</span>
                          </div>
                          <div className="space-y-1">
                            {research.slice(0, 2).map((r, i) => (
                              <a key={i} href={r.url} target="_blank" rel="noopener noreferrer"
                                className="flex items-start gap-1.5 group">
                                <ExternalLink className="w-2.5 h-2.5 text-sky-400 mt-0.5 shrink-0 group-hover:text-sky-600 transition-colors" />
                                <div className="min-w-0">
                                  <p className="text-[11px] text-foreground/80 leading-snug group-hover:text-foreground transition-colors truncate">{r.title}</p>
                                  <p className="text-[9px] text-muted-foreground">{r.source}</p>
                                </div>
                              </a>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="flex items-center gap-2 px-4 pb-3 border-t border-border/50 pt-2.5">
                        <button
                          onClick={() => navigate(`/care?signal=${alert.signalType}&desc=${encodeURIComponent(alert.description ?? "")}`)}
                          className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
                        >
                          <ArrowUpRight className="w-3 h-3" /> Find care
                        </button>
                        <div className="flex-1" />
                        <button
                          onClick={() => toggleDismiss(alert._id)}
                          className="text-[11px] text-muted-foreground/60 hover:text-muted-foreground transition-colors"
                        >
                          mark reviewed
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Reviewed — at the bottom, subtle */}
              {alerts.slice(0, 6).some(a => dismissed.has(a._id)) && (
                <div className="mt-4 pt-4 border-t border-border/50">
                  <p className="text-[10px] text-muted-foreground/60 uppercase tracking-wide mb-2">Reviewed</p>
                  <div className="space-y-1.5">
                    {alerts.slice(0, 6).filter(a => dismissed.has(a._id)).map(alert => (
                      <div key={alert._id} className="flex items-center gap-2.5 px-3 py-2 rounded-md bg-muted/40">
                        <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/30 shrink-0" />
                        <span className="text-[12px] text-muted-foreground/60 capitalize flex-1">
                          {signalLabel(alert.signalType ?? "")}
                        </span>
                        <span className="text-[10px] text-muted-foreground/50">
                          {new Date(alert.timestamp ?? 0).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                        </span>
                        <button
                          onClick={() => toggleDismiss(alert._id)}
                          className="flex items-center gap-1 text-[10px] text-muted-foreground/50 hover:text-muted-foreground transition-colors"
                        >
                          <RotateCcw className="w-2.5 h-2.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Conversation signals from latest call */}
          {latestCall?.conversationSignals && latestCall.conversationSignals.length > 0 && (
            <div className="px-8 py-5">
              <p className="text-[11px] font-medium text-muted-foreground mb-3 uppercase tracking-wide">
                Conversation signals ·{" "}
                <span className="font-normal normal-case">
                  {new Date(latestCall.startedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                </span>
              </p>
              <div className="space-y-2">
                {latestCall.conversationSignals.map((sig, i) => (
                  <div key={i} className="bg-white border border-border rounded-lg">
                    <div className="flex items-center gap-2.5 px-4 pt-3 pb-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-foreground/20 shrink-0" />
                      <p className="text-[12px] font-medium text-foreground capitalize">
                        {sig.signal.replace(/_/g, " ")}
                      </p>
                    </div>
                    <div className="px-4 pb-1.5 pl-8">
                      <p className="text-[11px] text-muted-foreground italic mb-1">"{sig.quote}"</p>
                    </div>
                    <div className="px-4 pb-3 pl-8">
                      <p className="text-[12px] text-foreground/65 leading-relaxed">{sig.explanation}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ── Right: Modulate voice analysis + signal charts + memories ── */}
        <div className="w-[280px] shrink-0 border-l border-border overflow-auto">

          {/* Voice metrics — source-aware */}
          <div className="p-6 border-b border-border">
            <div className="flex items-center gap-2 mb-4">
              <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">Voice Analysis</p>
              {latestCall?.acousticSource === "modulate_velma2" ? (
                <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700">Modulate Velma-2</span>
              ) : latestCall?.acousticSource === "transcript_derived" ? (
                <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-700">Transcript Only</span>
              ) : latestCall ? (
                <span className="text-[9px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">Pending</span>
              ) : null}
            </div>
            {latestCall ? (
              <div className="space-y-3">
                {latestCall.acousticSource === "transcript_derived" && (
                  <p className="text-[10px] text-amber-600 bg-amber-50 rounded px-2 py-1.5 leading-relaxed">
                    No audio recording available — scores estimated from transcript text only. Enable recording in Vapi for real voice analysis via Modulate.
                  </p>
                )}
                <VoiceMetric label="Speech Rate" value={latestCall.speechRate ? `${Math.round(latestCall.speechRate)}` : "—"} unit="wpm"
                  status={latestCall.speechRate ? (latestCall.speechRate < 100 ? "warn" : latestCall.speechRate > 160 ? "watch" : "ok") : "none"} />
                <VoiceMetric label="Pause Frequency" value={latestCall.pauseFrequency ? latestCall.pauseFrequency.toFixed(1) : "—"} unit="/min"
                  status={latestCall.pauseFrequency ? (latestCall.pauseFrequency > 8 ? "warn" : latestCall.pauseFrequency > 5 ? "watch" : "ok") : "none"} />
                <VoiceMetric label="Emotional Score" value={latestCall.emotionalScore ? `${Math.round(latestCall.emotionalScore)}` : "—"} unit="/100"
                  status={latestCall.emotionalScore ? (latestCall.emotionalScore < 40 ? "warn" : latestCall.emotionalScore < 60 ? "watch" : "ok") : "none"} />
                <VoiceMetric label="Cognitive Score" value={latestCall.cognitiveScore ? `${Math.round(latestCall.cognitiveScore)}` : "—"} unit="/100"
                  status={latestCall.cognitiveScore ? (latestCall.cognitiveScore < 55 ? "warn" : latestCall.cognitiveScore < 70 ? "watch" : "ok") : "none"} />
                <VoiceMetric label="Motor Score" value={latestCall.motorScore ? `${Math.round(latestCall.motorScore)}` : "—"} unit="/100"
                  status={latestCall.motorScore ? (latestCall.motorScore < 55 ? "warn" : latestCall.motorScore < 70 ? "watch" : "ok") : "none"} />

                <div className="pt-2 border-t border-border/50">
                  <p className="text-[10px] text-muted-foreground mb-2 uppercase tracking-wide">Detection</p>
                  <div className="grid grid-cols-2 gap-2">
                    <MiniStat label="Duration" value={latestCall.duration ? `${Math.round(latestCall.duration)}s` : "—"} />
                    <MiniStat label="Anomaly" value={latestCall.anomalyDetected ? "Yes" : "No"}
                      color={latestCall.anomalyDetected ? "text-memo-red" : "text-memo-green"} />
                  </div>
                </div>

                {/* Reka cross-validation */}
                {latestCall.rekaAgrees != null && (
                  <div className="pt-2 border-t border-border/50 mt-2">
                    <p className="text-[10px] text-muted-foreground mb-2 uppercase tracking-wide">Reka Cross-Validation</p>
                    <div className={`flex items-center gap-2 p-2 rounded-md ${
                      latestCall.rekaAgrees ? "bg-emerald-50/70" : "bg-amber-50/70"
                    }`}>
                      {latestCall.rekaAgrees
                        ? <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" strokeWidth={2} />
                        : <ShieldAlert className="w-3.5 h-3.5 text-amber-600 shrink-0" strokeWidth={2} />
                      }
                      <div>
                        <p className={`text-[11px] font-medium ${latestCall.rekaAgrees ? "text-emerald-700" : "text-amber-700"}`}>
                          {latestCall.rekaAgrees ? "Models agree" : "Split opinion"}
                        </p>
                        {latestCall.rekaConfidence && (
                          <p className="text-[9px] text-muted-foreground">{latestCall.rekaConfidence} confidence</p>
                        )}
                      </div>
                    </div>
                    {latestCall.rekaCognitiveScore != null && (
                      <div className="flex justify-between mt-1.5 text-[10px]">
                        <span className="text-muted-foreground">OpenAI: <span className="font-medium text-foreground">{Math.round(latestCall.cognitiveScore ?? 0)}</span></span>
                        <span className="text-muted-foreground">Reka: <span className="font-medium text-foreground">{Math.round(latestCall.rekaCognitiveScore)}</span></span>
                      </div>
                    )}
                    {latestCall.rekaReasoning && (
                      <p className="text-[10px] text-foreground/55 leading-relaxed mt-1.5 italic">{latestCall.rekaReasoning}</p>
                    )}
                  </div>
                )}

                {/* Senso memory context */}
                {latestCall.sensoContextUsed && (
                  <div className="pt-2 border-t border-border/50 mt-2">
                    <div className="flex items-center gap-1.5 mb-1">
                      <Brain className="w-3 h-3 text-indigo-500" strokeWidth={2} />
                      <p className="text-[10px] font-medium text-indigo-600 uppercase tracking-wide">Senso Memory Active</p>
                    </div>
                    <p className="text-[10px] text-muted-foreground leading-relaxed">
                      Past conversations were used to detect changes in speech patterns and topic recall.
                    </p>
                  </div>
                )}

                <div className="pt-2 border-t border-border/50 mt-2">
                  <p className="text-[10px] text-muted-foreground mb-1.5 uppercase tracking-wide">Analysis Pipeline</p>
                  <div className="flex flex-wrap gap-1.5">
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">OpenAI GPT-4o</span>
                    <span className={`text-[9px] px-1.5 py-0.5 rounded ${latestCall.rekaAgrees != null ? "bg-emerald-100 text-emerald-700" : "bg-muted text-muted-foreground"}`}>Reka</span>
                    <span className={`text-[9px] px-1.5 py-0.5 rounded ${latestCall.acousticSource === "modulate_velma2" ? "bg-violet-100 text-violet-700" : "bg-muted text-muted-foreground"}`}>Modulate</span>
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-sky-100 text-sky-700">Tavily</span>
                    <span className={`text-[9px] px-1.5 py-0.5 rounded ${latestCall.sensoContextUsed ? "bg-indigo-100 text-indigo-700" : "bg-muted text-muted-foreground"}`}>Senso</span>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-[12px] text-muted-foreground">No calls analysed yet.</p>
            )}
          </div>

          {/* Signal trend charts */}
          <div className="p-6 border-b border-border">
            <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide mb-4">Signal Trends</p>
            <div className="space-y-5">
              {signalCharts.map(chart => (
                <div key={chart.title}>
                  <div className="flex items-baseline justify-between mb-1">
                    <p className="text-[12px] font-medium text-foreground">{chart.title}</p>
                    <span className="text-[10px] text-muted-foreground">{chart.unit}</span>
                  </div>
                  {chart.data.length >= 2 ? (
                    <>
                      <p className="text-[20px] font-semibold tabular text-foreground leading-none mb-1.5">
                        {chart.data[chart.data.length - 1]?.v ?? "—"}
                      </p>
                      <ResponsiveContainer width="100%" height={40}>
                        <AreaChart data={chart.data} margin={{ top: 2, right: 0, left: -32, bottom: 0 }}>
                          <defs>
                            <linearGradient id={`g-${chart.title}`} x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="hsl(240,10%,4%)" stopOpacity={0.06} />
                              <stop offset="100%" stopColor="hsl(240,10%,4%)" stopOpacity={0} />
                            </linearGradient>
                          </defs>
                          <Area type="monotone" dataKey="v" stroke="hsl(240,10%,15%)" strokeWidth={1.25}
                            fill={`url(#g-${chart.title})`} dot={false} />
                        </AreaChart>
                      </ResponsiveContainer>
                    </>
                  ) : (
                    <p className="text-[11px] text-muted-foreground">Awaiting data</p>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Senso semantic search */}
          <SensoSearch patientId={patient?._id} />

          {memories.length > 0 && (
            <div className="p-6">
              <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide mb-4">Memories</p>
              <div className="space-y-3">
                {memories.slice(0, 6).map((m, i) => (
                  <div key={i} className="flex gap-2.5 items-start">
                    <span className={`mt-1 w-1.5 h-1.5 rounded-full shrink-0 ${
                      m.sentiment === "positive" ? "bg-memo-green" :
                      m.sentiment === "negative" ? "bg-memo-red" : "bg-foreground/15"
                    }`} />
                    <p className="text-[12px] text-foreground/65 leading-relaxed">{m.content}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </MemoLayout>
  );
}
