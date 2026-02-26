import { MemoLayout } from "@/components/memo/MemoLayout";
import { useState } from "react";
import { Search, ExternalLink, Phone, MapPin, Star, ChevronRight } from "lucide-react";
import { useSearchParams } from "react-router-dom";

const BACKEND = import.meta.env.VITE_BACKEND_URL ?? "http://localhost:8000";

const specialists = [
  { name: "Dr. Sarah Chen", specialty: "Neurologist", tags: ["cognitive", "memory", "word-finding"], address: "245 Medical Center Dr", distance: "2.4 mi", rating: 4.8, nextSlot: "Feb 24, 10:00 AM" },
  { name: "Dr. James Ortiz", specialty: "Geriatrician", tags: ["cognitive", "fatigue", "aging"], address: "1020 Health Park Blvd", distance: "3.1 mi", rating: 4.6, nextSlot: "Feb 25, 2:30 PM" },
  { name: "Dr. Robert Kim", specialty: "Speech Pathologist", tags: ["word-finding", "speech"], address: "560 Wellness Way", distance: "1.8 mi", rating: 4.7, nextSlot: "Feb 23, 11:00 AM" },
  { name: "Dr. Amy Torres", specialty: "Psychiatrist", tags: ["emotional", "mood", "anxiety", "loneliness"], address: "312 Wellness Blvd", distance: "2.9 mi", rating: 4.5, nextSlot: "Feb 26, 1:00 PM" },
  { name: "Dr. Michael Lee", specialty: "General Practice", tags: ["general", "medication", "pain"], address: "780 Main St", distance: "1.2 mi", rating: 4.4, nextSlot: "Feb 23, 9:30 AM" },
];

const medications = [
  { name: "Donepezil (Aricept)", drugClass: "Cholinesterase Inhibitor", tags: ["cognitive", "memory"], use: "Improves neural communication for mild to moderate Alzheimer's." },
  { name: "Memantine (Namenda)", drugClass: "NMDA Receptor Antagonist", tags: ["cognitive", "memory"], use: "Slows cognitive symptom progression in moderate to severe cases." },
  { name: "Sertraline (Zoloft)", drugClass: "SSRI Antidepressant", tags: ["emotional", "mood", "loneliness", "anxiety"], use: "For depression and anxiety in elderly patients." },
  { name: "Mirtazapine (Remeron)", drugClass: "Tetracyclic Antidepressant", tags: ["mood", "sleep", "fatigue"], use: "Helps with depression, appetite, and sleep disturbances." },
];

interface SearchResult { title: string; url: string; content: string }

export default function Care() {
  const [params] = useSearchParams();
  const [query, setQuery] = useState(params.get("desc") ?? "");
  const [signal] = useState(params.get("signal") ?? "");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [tab, setTab] = useState<"specialists" | "medications" | "research">("specialists");

  const filter = (tags: string[]) => {
    if (!signal && !query) return true;
    const text = `${signal} ${query}`.toLowerCase();
    return tags.some(t => text.includes(t));
  };

  const filteredSpecialists = specialists.filter(s => filter(s.tags));
  const filteredMeds = medications.filter(m => filter(m.tags));

  const runSearch = async () => {
    if (!query.trim()) return;
    setSearching(true); setSearchError(null); setTab("research");
    try {
      const res = await fetch(`${BACKEND}/search/care`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: query.trim(), signal_type: signal || undefined }),
      });
      if (!res.ok) throw new Error(`${res.status}`);
      const data = await res.json();
      setResults(data.results ?? []);
    } catch (e) {
      setSearchError("Backend unreachable. Start the FastAPI server to enable live research search.");
      setResults([]);
    } finally { setSearching(false); }
  };

  return (
    <MemoLayout>
      <div className="p-8 max-w-4xl animate-fade-in">

        {/* Header */}
        <div className="mb-7">
          <h1 className="text-xl font-semibold text-foreground tracking-tight">Care</h1>
          <p className="text-[13px] text-muted-foreground mt-0.5">Find specialists, review medications, search clinical research</p>
        </div>

        {/* Search bar */}
        <div className="flex gap-2 mb-6">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" strokeWidth={2} />
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={e => e.key === "Enter" && runSearch()}
              placeholder="Search clinical research via Tavily…"
              className="w-full pl-9 pr-4 py-2.5 text-[13px] border border-border rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-foreground/20 focus:border-foreground/30 transition-colors placeholder:text-muted-foreground/60"
            />
          </div>
          <button
            onClick={runSearch}
            disabled={searching || !query.trim()}
            className="px-4 py-2.5 text-[13px] font-medium bg-foreground text-background rounded-lg hover:bg-foreground/90 disabled:opacity-40 transition-colors"
          >
            {searching ? "Searching…" : "Search"}
          </button>
        </div>

        {/* Signal context banner */}
        {signal && (
          <div className="mb-5 px-4 py-3 bg-memo-amber/5 border border-memo-amber/20 rounded-lg">
            <p className="text-[12px] text-memo-amber">
              Showing results filtered for detected signal: <span className="font-medium capitalize">{signal.replace(/_/g, " ")}</span>
            </p>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-1 mb-5 border-b border-border">
          {(["specialists", "medications", "research"] as const).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-2.5 text-[13px] capitalize transition-colors border-b-2 -mb-px ${
                tab === t ? "border-foreground text-foreground font-medium" : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {t}
              {t === "research" && results.length > 0 && (
                <span className="ml-1.5 text-[11px] bg-foreground text-background rounded-full px-1.5 py-0.5 tabular">{results.length}</span>
              )}
            </button>
          ))}
        </div>

        {/* Specialists tab */}
        {tab === "specialists" && (
          <div className="space-y-2">
            {filteredSpecialists.length === 0 && (
              <p className="text-[13px] text-muted-foreground py-4">No specialists matched the signal. Showing all.</p>
            )}
            {(filteredSpecialists.length > 0 ? filteredSpecialists : specialists).map(doc => (
              <div key={doc.name} className="bg-white border border-border rounded-lg p-4 flex gap-4 items-start">
                <div className="w-9 h-9 rounded-full bg-foreground/6 flex items-center justify-center shrink-0">
                  <span className="text-[13px] font-semibold text-foreground">{doc.name.split(" ")[1][0]}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-[13px] font-medium text-foreground">{doc.name}</p>
                      <p className="text-[12px] text-muted-foreground">{doc.specialty}</p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Star className="w-3 h-3 text-memo-amber" fill="currentColor" />
                      <span className="text-[12px] text-foreground tabular">{doc.rating}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 mt-2">
                    <span className="flex items-center gap-1 text-[12px] text-muted-foreground">
                      <MapPin className="w-3 h-3" strokeWidth={1.75} />{doc.distance}
                    </span>
                    <span className="text-[12px] text-muted-foreground">{doc.address}</span>
                    <span className="ml-auto text-[12px] text-memo-green">{doc.nextSlot}</span>
                  </div>
                </div>
                <button className="shrink-0 flex items-center gap-1 text-[12px] text-muted-foreground hover:text-foreground transition-colors">
                  <Phone className="w-3.5 h-3.5" strokeWidth={1.75} />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Medications tab */}
        {tab === "medications" && (
          <div className="space-y-2">
            {(filteredMeds.length > 0 ? filteredMeds : medications).map(med => (
              <div key={med.name} className="bg-white border border-border rounded-lg p-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-[13px] font-medium text-foreground">{med.name}</p>
                    <p className="text-[12px] text-muted-foreground">{med.drugClass}</p>
                  </div>
                  <div className="flex gap-1 flex-wrap justify-end">
                    {med.tags.map(tag => (
                      <span key={tag} className="text-[11px] text-muted-foreground bg-muted px-2 py-0.5 rounded capitalize">{tag}</span>
                    ))}
                  </div>
                </div>
                <p className="text-[13px] text-foreground/70 mt-2 leading-relaxed">{med.use}</p>
              </div>
            ))}
            <p className="text-[12px] text-muted-foreground pt-2">
              Always consult a licensed physician before changing medication regimens.
            </p>
          </div>
        )}

        {/* Research tab */}
        {tab === "research" && (
          <div>
            {searching && (
              <div className="py-8 text-center text-[13px] text-muted-foreground">Searching via Tavily…</div>
            )}
            {searchError && (
              <div className="py-6 px-4 bg-white border border-border rounded-lg">
                <p className="text-[13px] text-muted-foreground">{searchError}</p>
              </div>
            )}
            {!searching && !searchError && results.length === 0 && (
              <div className="py-8 text-center">
                <p className="text-[13px] text-muted-foreground mb-1">No results yet.</p>
                <p className="text-[12px] text-muted-foreground/60">Use the search bar above to find clinical research.</p>
              </div>
            )}
            <div className="space-y-2">
              {results.map((r, i) => (
                <div key={i} className="bg-white border border-border rounded-lg p-4">
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-[13px] font-medium text-foreground leading-snug">{r.title}</p>
                    <a href={r.url} target="_blank" rel="noopener noreferrer"
                      className="shrink-0 flex items-center gap-1 text-[12px] text-muted-foreground hover:text-foreground transition-colors">
                      <ExternalLink className="w-3.5 h-3.5" strokeWidth={1.75} />
                    </a>
                  </div>
                  <p className="text-[12px] text-muted-foreground mt-1 mb-2">
                    {new URL(r.url).hostname.replace("www.", "")}
                  </p>
                  <p className="text-[13px] text-foreground/70 leading-relaxed">{r.content}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </MemoLayout>
  );
}
