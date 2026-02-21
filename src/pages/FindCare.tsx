import { MemoLayout } from "@/components/memo/MemoLayout";
import { useState } from "react";
import { Search, MapPin, Phone, Star, Clock, Pill, Building2 } from "lucide-react";

const filterChips = ["Neurologist", "Geriatrician", "Psychiatrist", "General Practice", "Hospital", "Pharmacy"];

const recommendations = [
  {
    type: "Neurologist",
    reason: "Recommended based on elevated pause frequency and speech rate changes consistent with early neurological signals.",
  },
  {
    type: "Geriatrician",
    reason: "Routine geriatric assessment recommended. Last recorded visit was over 6 months ago.",
  },
  {
    type: "Speech Pathologist",
    reason: "Word-finding difficulty score has declined 20% over the past month. Early intervention may be beneficial.",
  },
];

const specialists = [
  { name: "Dr. Sarah Chen", specialty: "Neurologist", address: "245 Medical Center Dr, Portland", distance: "2.4 mi", rating: 4.8, nextSlot: "Feb 24, 10:00 AM" },
  { name: "Dr. James Ortiz", specialty: "Geriatrician", address: "1020 Health Park Blvd, Portland", distance: "3.1 mi", rating: 4.6, nextSlot: "Feb 25, 2:30 PM" },
  { name: "Dr. Linda Park", specialty: "Neurologist", address: "890 Eastside Medical, Portland", distance: "4.7 mi", rating: 4.9, nextSlot: "Mar 1, 9:00 AM" },
  { name: "Dr. Robert Kim", specialty: "Speech Pathologist", address: "560 Wellness Way, Portland", distance: "1.8 mi", rating: 4.7, nextSlot: "Feb 23, 11:00 AM" },
];

const medications = [
  { name: "Donepezil (Aricept)", drugClass: "Cholinesterase Inhibitor", use: "Used to treat symptoms of mild to moderate Alzheimer's disease by improving neural communication." },
  { name: "Memantine (Namenda)", drugClass: "NMDA Receptor Antagonist", use: "Used to treat moderate to severe Alzheimer's disease symptoms, may slow symptom progression." },
  { name: "Rivastigmine (Exelon)", drugClass: "Cholinesterase Inhibitor", use: "Used for mild to moderate Alzheimer's and Parkinson's-related dementia." },
];

const hospitals = [
  { name: "Portland Medical Center", address: "1200 NW Hospital Dr", distance: "2.1 mi", phone: "(503) 555-0100" },
  { name: "Eastside Community Hospital", address: "3400 SE Health Ave", distance: "4.3 mi", phone: "(503) 555-0200" },
  { name: "St. Vincent's Medical Center", address: "750 SW Medical Pkwy", distance: "5.8 mi", phone: "(503) 555-0300" },
];

const FindCare = () => {
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState<string | null>(null);

  return (
    <MemoLayout>
      <div className="max-w-4xl mx-auto animate-fade-in-up">
        <p className="text-xs text-muted-foreground mb-1">Care Network</p>
        <h1 className="text-xl font-display text-foreground mb-5">Find Care</h1>

        {/* Search */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search medications, specialists, or conditions..."
            className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-input bg-background text-foreground text-[13px] focus:outline-none focus:ring-2 focus:ring-ring"
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

        {/* Recommendations */}
        <div className="mb-6">
          <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-3">Recommended for Margaret</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {recommendations.map((rec, i) => (
              <div key={i} className="bg-card rounded-lg border border-border p-4">
                <p className="text-[12px] font-semibold text-foreground mb-1.5">{rec.type}</p>
                <p className="text-[11px] text-muted-foreground leading-relaxed mb-3">{rec.reason}</p>
                <button className="text-[11px] font-medium text-primary hover:underline">Find Near Margaret</button>
              </div>
            ))}
          </div>
        </div>

        {/* Specialists */}
        <div className="mb-6">
          <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-3">Specialists</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {specialists.map((doc, i) => (
              <div key={i} className="bg-card rounded-lg border border-border p-4">
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
                      <button className="px-2.5 py-1 text-[11px] font-medium rounded-md bg-foreground text-background hover:opacity-90">Call to Book</button>
                      <button className="px-2.5 py-1 text-[11px] font-medium rounded-md bg-primary/10 text-primary hover:bg-primary/20">Let Memo Book</button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Medications */}
        <div className="mb-6">
          <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-3">Related Medications</p>
          <div className="space-y-2">
            {medications.map((med, i) => (
              <div key={i} className="bg-card rounded-lg border border-border p-4">
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
            ))}
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
