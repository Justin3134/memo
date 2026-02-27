import { MemoLayout } from "@/components/memo/MemoLayout";
import { useState, useEffect, useRef } from "react";
import { Search, ExternalLink, RefreshCw, BookOpen, HeartPulse } from "lucide-react";
import { useSearchParams } from "react-router-dom";

const BACKEND = import.meta.env.VITE_BACKEND_URL ?? "http://localhost:8000";

interface SearchResult { title: string; url: string; content: string }

const getHostname = (url: string) => {
  try { return new URL(url).hostname.replace("www.", ""); }
  catch { return url; }
};

// Trusted care resource domains that indicate actionable help (not just papers)
const isCareResource = (r: SearchResult) => {
  const h = getHostname(r.url);
  const careKeywords = ["alz.org", "nia.nih.gov", "caregiver", "support", "helpline", "hotline", "eldercare", "cms.gov", "medicare", "medicaid", "aging", "dementia.org", "dementiauk", "mind.org", "helpguide"];
  return careKeywords.some(k => h.includes(k) || r.title.toLowerCase().includes(k) || r.content.toLowerCase().includes(k));
};

type SearchMode = "research" | "resources";

const modeConfig: Record<SearchMode, { label: string; icon: React.ElementType; suffix: string; placeholder: string }> = {
  research: {
    label: "Clinical Research",
    icon: BookOpen,
    suffix: "clinical study evidence",
    placeholder: "Search clinical research (e.g. word finding difficulty treatment)…",
  },
  resources: {
    label: "Care Resources",
    icon: HeartPulse,
    suffix: "care support services resources helpline 2024",
    placeholder: "Find actual care help (e.g. Alzheimer's support near me)…",
  },
};

export default function Care() {
  const [params] = useSearchParams();
  const signalParam = params.get("signal") ?? "";
  const descParam = params.get("desc") ?? "";

  const [mode, setMode] = useState<SearchMode>(signalParam ? "resources" : "research");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);
  const hasAutoSearched = useRef(false);

  const buildAutoQuery = (m: SearchMode) => {
    const base = signalParam && signalParam !== "null"
      ? signalParam.replace(/_/g, " ") + " in elderly"
      : "cognitive decline elderly";
    return m === "research"
      ? `${base} clinical research treatment`
      : `${base} care support services resources`;
  };

  const runSearch = async (q?: string, m?: SearchMode) => {
    const finalQ = q ?? query;
    const finalM = m ?? mode;
    if (!finalQ.trim()) return;
    setSearching(true); setSearchError(null); setQuery(finalQ);
    try {
      const searchQ = `${finalQ} ${modeConfig[finalM].suffix}`;
      const res = await fetch(`${BACKEND}/search/care`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: searchQ.trim(), signal_type: signalParam || undefined }),
      });
      if (!res.ok) throw new Error((await res.text()) || `${res.status}`);
      const data = await res.json();
      setResults(data.results ?? []);
      setSearched(true);
    } catch (e: any) {
      const msg = e?.message ?? "";
      setSearchError(
        msg.includes("Failed to fetch") || msg.includes("NetworkError") || msg.includes("ECONNREFUSED")
          ? "FastAPI backend not running. Start it: cd backend && uvicorn main:app --reload"
          : `Search failed: ${msg}`
      );
    } finally { setSearching(false); }
  };

  useEffect(() => {
    if (!hasAutoSearched.current) {
      hasAutoSearched.current = true;
      const auto = buildAutoQuery(mode);
      setQuery(auto);
      runSearch(auto, mode);
    }
  }, []);

  const handleModeSwitch = (m: SearchMode) => {
    setMode(m);
    const auto = buildAutoQuery(m);
    setQuery(auto);
    runSearch(auto, m);
  };

  const quickSearches: Record<SearchMode, string[]> = {
    research: [
      "word finding difficulty elderly treatment",
      "mild cognitive impairment voice biomarkers",
      "early Alzheimer's detection speech patterns",
      "cognitive decline prevention interventions",
    ],
    resources: [
      "Alzheimer's Association caregiver support",
      "memory care specialist consultation",
      "senior cognitive health services",
      "dementia helpline family support",
    ],
  };

  return (
    <MemoLayout>
      <div className="flex h-full">

        {/* ── Left: search + results ── */}
        <div className="flex-1 min-w-0 flex flex-col overflow-auto">

          {/* Header */}
          <div className="flex items-center justify-between px-8 pt-7 pb-5 border-b border-border">
            <div>
              <h1 className="text-[15px] font-semibold text-foreground">Care</h1>
              <p className="text-[12px] text-muted-foreground mt-0.5">Powered by Tavily + Yutori</p>
            </div>
            {/* Mode toggle */}
            <div className="flex gap-0.5 p-0.5 bg-muted rounded-lg">
              {(["research", "resources"] as SearchMode[]).map(m => {
                const Icon = modeConfig[m].icon;
                return (
                  <button
                    key={m}
                    onClick={() => handleModeSwitch(m)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 text-[12px] rounded-md transition-colors ${
                      mode === m ? "bg-white text-foreground shadow-sm font-medium" : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <Icon className="w-3 h-3" strokeWidth={1.75} />
                    {modeConfig[m].label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Signal context */}
          {signalParam && signalParam !== "null" && (
            <div className="mx-8 mt-5 flex items-start gap-3 p-3 bg-memo-amber/5 border border-memo-amber/15 rounded-lg">
              <span className="w-1.5 h-1.5 rounded-full bg-memo-amber mt-1 shrink-0" />
              <div>
                <p className="text-[12px] font-medium text-memo-amber capitalize mb-0.5">
                  Searching for: {signalParam.replace(/_/g, " ")}
                </p>
                {descParam && <p className="text-[11px] text-foreground/60 leading-relaxed">{descParam.slice(0, 150)}</p>}
              </div>
            </div>
          )}

          {/* Search bar */}
          <div className="flex gap-2 px-8 py-5">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" strokeWidth={1.75} />
              <input
                value={query}
                onChange={e => setQuery(e.target.value)}
                onKeyDown={e => e.key === "Enter" && runSearch()}
                placeholder={modeConfig[mode].placeholder}
                className="w-full pl-9 pr-4 py-2.5 text-[13px] border border-border rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-foreground/20 focus:border-foreground/20 transition-colors placeholder:text-muted-foreground/50"
              />
            </div>
            <button
              onClick={() => runSearch()}
              disabled={searching || !query.trim()}
              className="px-4 py-2.5 text-[13px] font-medium bg-foreground text-background rounded-lg hover:bg-foreground/90 disabled:opacity-40 transition-colors flex items-center gap-1.5 shrink-0"
            >
              {searching && <RefreshCw className="w-3 h-3 animate-spin" />}
              {searching ? "Searching…" : "Search"}
            </button>
          </div>

          {/* Error */}
          {searchError && (
            <div className="mx-8 mb-5 p-4 bg-white border border-border rounded-lg">
              <p className="text-[13px] text-muted-foreground">{searchError}</p>
            </div>
          )}

          {/* Loading skeleton */}
          {searching && (
            <div className="px-8 space-y-3">
              {[0, 1, 2, 3].map(i => (
                <div key={i} className="bg-white border border-border rounded-lg p-4 animate-pulse">
                  <div className="h-3 bg-foreground/8 rounded w-2/3 mb-2" />
                  <div className="h-2.5 bg-foreground/5 rounded w-1/4 mb-3" />
                  <div className="space-y-1.5">
                    <div className="h-2.5 bg-foreground/5 rounded w-full" />
                    <div className="h-2.5 bg-foreground/5 rounded w-5/6" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Results */}
          {!searching && results.length > 0 && (
            <div className="px-8 pb-8 space-y-2.5">
              {results.map((r, i) => {
                const isResource = isCareResource(r);
                return (
                  <div key={i} className="bg-white border border-border rounded-lg p-4 hover:border-foreground/15 transition-colors">
                    <div className="flex items-start gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          {isResource && mode === "research" && (
                            <span className="text-[10px] text-memo-green bg-memo-green/8 border border-memo-green/15 px-1.5 py-0.5 rounded shrink-0">
                              Care resource
                            </span>
                          )}
                        </div>
                        <a href={r.url} target="_blank" rel="noopener noreferrer"
                          className="text-[13px] font-medium text-foreground hover:text-foreground/70 transition-colors leading-snug block mb-1">
                          {r.title}
                        </a>
                        <p className="text-[11px] text-muted-foreground mb-2">{getHostname(r.url)}</p>
                        <p className="text-[12px] text-foreground/65 leading-relaxed">{r.content}</p>
                      </div>
                      <a href={r.url} target="_blank" rel="noopener noreferrer"
                        className="shrink-0 text-muted-foreground hover:text-foreground transition-colors mt-0.5">
                        <ExternalLink className="w-3.5 h-3.5" strokeWidth={1.75} />
                      </a>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {!searching && searched && results.length === 0 && !searchError && (
            <div className="px-8 py-10 text-center">
              <p className="text-[13px] text-muted-foreground">No results. Try a different query.</p>
            </div>
          )}
        </div>

        {/* ── Right: quick searches + about ── */}
        <div className="w-[240px] shrink-0 border-l border-border overflow-auto p-6">
          <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide mb-3">Quick searches</p>
          <div className="space-y-1">
            {quickSearches[mode].map((q, i) => (
              <button
                key={i}
                onClick={() => runSearch(q)}
                className="w-full text-left px-3 py-2 text-[12px] text-foreground/70 hover:text-foreground hover:bg-white rounded-md transition-colors border border-transparent hover:border-border"
              >
                {q}
              </button>
            ))}
          </div>

          <div className="mt-7 border-t border-border pt-6 space-y-5">
            <div>
              <p className="text-[11px] font-medium text-muted-foreground mb-1.5">Clinical Research</p>
              <p className="text-[12px] text-muted-foreground/70 leading-relaxed">
                Peer-reviewed studies, clinical trials, and evidence-based findings from medical databases.
              </p>
            </div>
            <div>
              <p className="text-[11px] font-medium text-muted-foreground mb-1.5">Care Resources</p>
              <p className="text-[12px] text-muted-foreground/70 leading-relaxed">
                Real support organizations, helplines, memory care services, and specialist directories.
              </p>
            </div>
            <div>
              <p className="text-[11px] font-medium text-muted-foreground mb-1.5">Emergency</p>
              <p className="text-[12px] text-muted-foreground/70 leading-relaxed">
                Alzheimer's helpline: <span className="font-medium text-foreground">1-800-272-3900</span>
              </p>
            </div>
          </div>
        </div>

      </div>
    </MemoLayout>
  );
}
