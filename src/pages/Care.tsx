import { MemoLayout } from "@/components/memo/MemoLayout";
import { useState, useEffect, useRef } from "react";
import { Search, ExternalLink, RefreshCw } from "lucide-react";
import { useSearchParams } from "react-router-dom";

const BACKEND = import.meta.env.VITE_BACKEND_URL ?? "http://localhost:8000";

interface SearchResult { title: string; url: string; content: string }

function getHostname(url: string) {
  try { return new URL(url).hostname.replace("www.", ""); }
  catch { return url; }
}

function buildDefaultQuery(signal: string, desc: string): string {
  if (signal && signal !== "null") {
    return `${signal.replace(/_/g, " ")} in elderly patients clinical management`;
  }
  if (desc && desc.length > 10) return desc.slice(0, 120);
  return "early cognitive decline detection elderly voice biomarkers care";
}

export default function Care() {
  const [params] = useSearchParams();
  const signalParam = params.get("signal") ?? "";
  const descParam = params.get("desc") ?? "";

  const [query, setQuery] = useState(() => buildDefaultQuery(signalParam, descParam));
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);
  const hasAutoSearched = useRef(false);

  const runSearch = async (q = query) => {
    if (!q.trim()) return;
    setSearching(true); setSearchError(null);
    try {
      const res = await fetch(`${BACKEND}/search/care`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: q.trim(), signal_type: signalParam || undefined }),
      });
      if (!res.ok) {
        const err = await res.text();
        throw new Error(err || `${res.status}`);
      }
      const data = await res.json();
      setResults(data.results ?? []);
      setSearched(true);
    } catch (e: any) {
      const msg = e?.message ?? "";
      if (msg.includes("Failed to fetch") || msg.includes("NetworkError") || msg.includes("ECONNREFUSED")) {
        setSearchError("FastAPI backend is not running. Start it with: cd backend && uvicorn main:app --reload");
      } else {
        setSearchError(`Search failed: ${msg}`);
      }
    } finally { setSearching(false); }
  };

  // Auto-search on mount
  useEffect(() => {
    if (!hasAutoSearched.current) {
      hasAutoSearched.current = true;
      runSearch(buildDefaultQuery(signalParam, descParam));
    }
  }, []);

  const suggestedQueries = [
    "word finding difficulty elderly treatment",
    "mild cognitive impairment early signs voice",
    "caregiver support Alzheimer's resources",
    "speech therapy cognitive decline elderly",
  ];

  return (
    <MemoLayout>
      <div className="flex gap-0 min-h-screen">

        {/* ── Left: search + results ── */}
        <div className="flex-1 min-w-0 p-8 border-r border-border">

          {/* Header */}
          <div className="mb-6">
            <h1 className="text-[17px] font-semibold text-foreground tracking-tight">Care Research</h1>
            <p className="text-[12px] text-muted-foreground mt-0.5">
              Live clinical research via Tavily · AI-powered search
            </p>
          </div>

          {/* Signal context */}
          {signalParam && signalParam !== "null" && (
            <div className="mb-5 flex items-start gap-3 p-3.5 bg-memo-amber/5 border border-memo-amber/20 rounded-lg">
              <span className="w-1.5 h-1.5 rounded-full bg-memo-amber mt-1 shrink-0" />
              <div>
                <p className="text-[12px] font-medium text-memo-amber capitalize mb-0.5">
                  Signal detected: {signalParam.replace(/_/g, " ")}
                </p>
                {descParam && <p className="text-[12px] text-foreground/70">{descParam}</p>}
              </div>
            </div>
          )}

          {/* Search bar */}
          <div className="flex gap-2 mb-6">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" strokeWidth={1.75} />
              <input
                value={query}
                onChange={e => setQuery(e.target.value)}
                onKeyDown={e => e.key === "Enter" && runSearch()}
                placeholder="Search clinical research…"
                className="w-full pl-9 pr-4 py-2.5 text-[13px] border border-border rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-foreground/20 focus:border-foreground/30 transition-colors placeholder:text-muted-foreground/50"
              />
            </div>
            <button
              onClick={() => runSearch()}
              disabled={searching || !query.trim()}
              className="px-4 py-2.5 text-[13px] font-medium bg-foreground text-background rounded-lg hover:bg-foreground/90 disabled:opacity-40 transition-colors flex items-center gap-1.5"
            >
              {searching && <RefreshCw className="w-3 h-3 animate-spin" />}
              {searching ? "Searching…" : "Search"}
            </button>
          </div>

          {/* Error */}
          {searchError && (
            <div className="mb-5 p-4 bg-white border border-border rounded-lg">
              <p className="text-[13px] text-muted-foreground">{searchError}</p>
            </div>
          )}

          {/* Loading skeleton */}
          {searching && (
            <div className="space-y-3">
              {[0, 1, 2].map(i => (
                <div key={i} className="bg-white border border-border rounded-lg p-4 animate-pulse">
                  <div className="h-3.5 bg-foreground/8 rounded w-3/4 mb-2" />
                  <div className="h-2.5 bg-foreground/5 rounded w-1/4 mb-3" />
                  <div className="h-2.5 bg-foreground/5 rounded w-full mb-1.5" />
                  <div className="h-2.5 bg-foreground/5 rounded w-5/6" />
                </div>
              ))}
            </div>
          )}

          {/* Results */}
          {!searching && results.length > 0 && (
            <div className="space-y-3">
              {results.map((r, i) => (
                <div key={i} className="bg-white border border-border rounded-lg p-4 hover:border-foreground/15 transition-colors">
                  <div className="flex items-start gap-3">
                    <div className="flex-1 min-w-0">
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
              ))}
            </div>
          )}

          {/* Empty state after search */}
          {!searching && searched && results.length === 0 && !searchError && (
            <div className="py-10 text-center">
              <p className="text-[13px] text-muted-foreground">No results found. Try a different query.</p>
            </div>
          )}
        </div>

        {/* ── Right: suggested queries + info ── */}
        <div className="w-[260px] shrink-0 p-6">
          <p className="text-[12px] font-medium text-muted-foreground mb-3">Suggested searches</p>
          <div className="space-y-1.5">
            {suggestedQueries.map((q, i) => (
              <button
                key={i}
                onClick={() => { setQuery(q); runSearch(q); }}
                className="w-full text-left px-3 py-2 text-[12px] text-foreground/70 hover:text-foreground hover:bg-white rounded-md transition-colors border border-transparent hover:border-border"
              >
                {q}
              </button>
            ))}
          </div>

          <div className="mt-8 border-t border-border pt-6">
            <p className="text-[12px] font-medium text-muted-foreground mb-2">Powered by Tavily</p>
            <p className="text-[12px] text-muted-foreground/70 leading-relaxed">
              Results are sourced from clinical journals, medical databases, and trusted health resources in real time.
            </p>
          </div>

          <div className="mt-6">
            <p className="text-[12px] font-medium text-muted-foreground mb-2">Finding local care</p>
            <p className="text-[12px] text-muted-foreground/70 leading-relaxed">
              For local specialist referrals, search "geriatric neurologist [your city]" or contact your primary care physician.
            </p>
          </div>
        </div>

      </div>
    </MemoLayout>
  );
}
