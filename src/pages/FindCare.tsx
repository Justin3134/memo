import { MemoLayout } from "@/components/memo/MemoLayout";
import { useState, useMemo } from "react";
import { Search, MapPin, Phone, Star, Clock, Pill, Building2, AlertTriangle, X } from "lucide-react";
import { useSearchParams } from "react-router-dom";

const filterChips = ["Neurologist", "Geriatrician", "Psychiatrist", "Speech Pathologist", "General Practice", "Hospital", "Pharmacy"];

const allSpecialists = [
  { name: "Dr. Sarah Chen", specialty: "Neurologist", tags: ["cognitive", "memory", "word-finding", "neurological", "composite"], address: "245 Medical Center Dr, Portland", distance: "2.4 mi", rating: 4.8, nextSlot: "Feb 24, 10:00 AM" },
  { name: "Dr. James Ortiz", specialty: "Geriatrician", tags: ["cognitive", "fatigue", "composite", "general", "aging"], address: "1020 Health Park Blvd, Portland", distance: "3.1 mi", rating: 4.6, nextSlot: "Feb 25, 2:30 PM" },
  { name: "Dr. Linda Park", specialty: "Neurologist", tags: ["cognitive", "memory", "neurological", "composite"], address: "890 Eastside Medical, Portland", distance: "4.7 mi", rating: 4.9, nextSlot: "Mar 1, 9:00 AM" },
  { name: "Dr. Robert Kim", specialty: "Speech Pathologist", tags: ["word-finding", "speech", "cognitive", "articulation"], address: "560 Wellness Way, Portland", distance: "1.8 mi", rating: 4.7, nextSlot: "Feb 23, 11:00 AM" },
  { name: "Dr. Amy Torres", specialty: "Psychiatrist", tags: ["emotional", "mood", "anxiety", "loneliness", "depression"], address: "312 Wellness Blvd, Portland", distance: "2.9 mi", rating: 4.5, nextSlot: "Feb 26, 1:00 PM" },
  { name: "Dr. Michael Lee", specialty: "General Practice", tags: ["fatigue", "pain", "general", "medication", "composite"], address: "780 Main St, Portland", distance: "1.2 mi", rating: 4.4, nextSlot: "Feb 23, 9:30 AM" },
];

const allMedications = [
  { name: "Donepezil (Aricept)", drugClass: "Cholinesterase Inhibitor", tags: ["cognitive", "memory", "composite"], use: "Improves neural communication for mild to moderate Alzheimer's symptoms." },
  { name: "Memantine (Namenda)", drugClass: "NMDA Receptor Antagonist", tags: ["cognitive", "memory", "composite"], use: "Slows cognitive symptom progression in moderate to severe cases." },
  { name: "Rivastigmine (Exelon)", drugClass: "Cholinesterase Inhibitor", tags: ["cognitive", "word-finding", "composite"], use: "For mild to moderate Alzheimer's and Parkinson's-related dementia." },
  { name: "Sertraline (Zoloft)", drugClass: "SSRI Antidepressant", tags: ["emotional", "mood", "loneliness", "anxiety", "depression"], use: "Commonly prescribed for depression and anxiety in elderly patients." },
  { name: "Mirtazapine (Remeron)", drugClass: "Tetracyclic Antidepressant", tags: ["emotional", "mood", "sleep", "fatigue"], use: "Helps with depression, appetite loss, and sleep disturbances in elderly patients." },
  { name: "Gabapentin (Neurontin)", drugClass: "Anticonvulsant / Pain Modifier", tags: ["pain", "fatigue", "motor"], use: "Used for nerve pain and restless leg syndrome in elderly patients." },
];

const hospitals = [
  { name: "Portland Medical Center", address: "1200 NW Hospital Dr", distance: "2.1 mi", phone: "(503) 555-0100" },
  { name: "Eastside Community Hospital", address: "3400 SE Health Ave", distance: "4.3 mi", phone: "(503) 555-0200" },
  { name: "St. Vincent's Medical Center", address: "750 SW Medical Pkwy", distance: "5.8 mi", phone: "(503) 555-0300" },
];

const signalToTags = (signal: string, description: string): string[] => {
  const text = `${signal} ${description}`.toLowerCase();
  const tags: string[] = [];
  if (text.includes("cognitive") || text.includes("memory") || text.includes("forget")) tags.push("cognitive", "memory");
  if (text.includes("word") || text.includes("speech") || text.includes("articul")) tags.push("word-finding", "speech");
  if (text.includes("emotion") || text.includes("mood") || text.includes("sad") || text.includes("lone")) tags.push("emotional", "mood", "loneliness");
  if (text.includes("fatigue") || text.includes("tired") || text.includes("sleep")) tags.push("fatigue", "sleep");
  if (text.includes("pain") || text.includes("ache") || text.includes("hurt")) tags.push("pain", "motor");
  if (text.includes("anxiety") || text.includes("worry") || text.includes("stress")) tags.push("anxiety", "emotional");
  if (text.includes("composite") || tags.length === 0) tags.push("composite", "cognitive");
  return [...new Set(tags)];
};

const FindCare = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const signalParam = searchParams.get("signal") ?? "";
  const descriptionParam = searchParams.get("description") ?? "";

  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState<string | null>(null);

  const contextTags = useMemo(() => signalParam ? signalToTags(signalParam, descriptionParam) : [], [signalParam, descriptionParam]);

  const prioritisedSpecialists = useMemo(() => {
    let list = allSpecialists;
    if (activeFilter) list = list.filter(d => d.specialty === activeFilter || d.tags.includes(activeFilter.toLowerCase()));
    if (search) list = list.filter(d => d.name.toLowerCase().includes(search.toLowerCase()) || d.specialty.toLowerCase().includes(search.toLowerCase()));
    if (contextTags.length > 0 && !activeFilter && !search) {
      return [...list].sort((a, b) => {
        const aMatch = a.tags.filter(t => contextTags.includes(t)).length;
        const bMatch = b.tags.filter(t => contextTags.includes(t)).length;
        return bMatch - aMatch;
      });
    }
    return list;
  }, [search, activeFilter, contextTags]);

  const prioritisedMeds = useMemo(() => {
    let list = allMedications;
    if (search) list = list.filter(m => m.name.toLowerCase().includes(search.toLowerCase()) || m.drugClass.toLowerCase().includes(search.toLowerCase()));
    if (contextTags.length > 0 && !search) {
      return [...list].sort((a, b) => {
        const aMatch = a.tags.filter(t => contextTags.includes(t)).length;
        const bMatch = b.tags.filter(t => contextTags.includes(t)).length;
        return bMatch - aMatch;
      });
    }
    return list;
  }, [search, contextTags]);

  const clearSignal = () => setSearchParams({});

  return (
    <MemoLayout>
      <div className="max-w-4xl mx-auto animate-fade-in-up">
        <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1">Care Network</p>
        <h1 className="text-xl font-display text-foreground tracking-tight mb-4">Find Care</h1>

        {/* Signal context banner */}
        {signalParam && (
          <div className="bg-memo-amber/8 border border-memo-amber/20 rounded-lg p-3.5 mb-5 flex items-start gap-3">
            <AlertTriangle className="w-4 h-4 text-memo-amber flex-shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-[11px] font-semibold text-foreground mb-0.5">Showing care for: {signalParam}</p>
              {descriptionParam && (
                <p className="text-[11px] text-muted-foreground leading-relaxed line-clamp-2">{descriptionParam}</p>
              )}
              <p className="text-[10px] text-muted-foreground mt-1">Specialists and medications are sorted by relevance to this signal.</p>
            </div>
            <button onClick={clearSignal} className="text-muted-foreground hover:text-foreground flex-shrink-0">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Search */}
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search specialists, medications, or conditions..."
            className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-input bg-background text-foreground text-[13px] placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-foreground"
          />
        </div>
        <div className="flex flex-wrap gap-1.5 mb-6">
          {filterChips.map((chip) => (
            <button
              key={chip}
              onClick={() => setActiveFilter(activeFilter === chip ? null : chip)}
              className={`px-3 py-1 rounded-md text-[11px] font-medium transition-colors ${
                activeFilter === chip ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground hover:text-foreground"
              }`}
            >
              {chip}
            </button>
          ))}
        </div>

        {/* Specialists */}
        <div className="mb-6">
          <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-3">
            {contextTags.length > 0 && !activeFilter ? "Recommended Specialists" : "Specialists"}
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {prioritisedSpecialists.map((doc, i) => {
              const isTop = contextTags.length > 0 && doc.tags.some(t => contextTags.includes(t));
              return (
                <div key={i} className={`bg-card rounded-lg border p-4 transition-colors ${isTop && !activeFilter && !search ? "border-foreground/30" : "border-border"}`}>
                  {isTop && !activeFilter && !search && (
                    <p className="text-[9px] font-semibold text-primary uppercase tracking-wide mb-2">Recommended for this signal</p>
                  )}
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center flex-shrink-0 text-[11px] font-bold text-muted-foreground">
                      {doc.name.split(" ").map(n => n[0]).join("").slice(0, 2)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-medium text-foreground">{doc.name}</p>
                      <p className="text-[11px] text-muted-foreground">{doc.specialty}</p>
                      <div className="flex items-center gap-2 mt-1 text-[11px] text-muted-foreground">
                        <span className="flex items-center gap-0.5"><MapPin className="w-3 h-3" /> {doc.distance}</span>
                        <span className="flex items-center gap-0.5"><Star className="w-3 h-3" /> {doc.rating}</span>
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-1 flex items-center gap-1"><Clock className="w-3 h-3" /> Next: {doc.nextSlot}</p>
                      <div className="flex gap-2 mt-2.5">
                        <button className="px-2.5 py-1 text-[11px] font-medium rounded-md bg-foreground text-background hover:opacity-90 transition-opacity">Call to Book</button>
                        <button className="px-2.5 py-1 text-[11px] font-medium rounded-md bg-primary/10 text-primary hover:bg-primary/20 transition-colors">Let Memo Book</button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Medications */}
        <div className="mb-6">
          <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-3">
            {contextTags.length > 0 ? "Related Medications" : "Medications"}
          </p>
          <div className="space-y-2">
            {prioritisedMeds.map((med, i) => {
              const isTop = contextTags.length > 0 && med.tags.some(t => contextTags.includes(t));
              return (
                <div key={i} className={`bg-card rounded-lg border p-4 transition-colors ${isTop && !search ? "border-foreground/20" : "border-border"}`}>
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-md bg-memo-amber/10 flex items-center justify-center flex-shrink-0">
                      <Pill className="w-3.5 h-3.5 text-memo-amber" />
                    </div>
                    <div>
                      <p className="text-[13px] font-medium text-foreground">{med.name}</p>
                      <p className="text-[11px] text-primary font-medium">{med.drugClass}</p>
                      <p className="text-[12px] text-muted-foreground leading-relaxed mt-1">{med.use}</p>
                      <p className="text-[10px] text-memo-amber font-medium mt-1.5">Discuss with doctor before use</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Hospitals */}
        <div>
          <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-3">Nearby Hospitals</p>
          <div className="space-y-2">
            {hospitals.map((h, i) => (
              <div key={i} className="bg-card rounded-lg border border-border p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-md bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Building2 className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-[13px] font-medium text-foreground">{h.name}</p>
                    <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                      <span>{h.address}</span>
                      <span className="text-border">|</span>
                      <span>{h.distance}</span>
                    </div>
                  </div>
                </div>
                <a href={`tel:${h.phone}`} className="flex items-center gap-1 text-[11px] font-medium text-primary hover:underline flex-shrink-0">
                  <Phone className="w-3 h-3" /> {h.phone}
                </a>
              </div>
            ))}
          </div>
        </div>
      </div>
    </MemoLayout>
  );
};

export default FindCare;
