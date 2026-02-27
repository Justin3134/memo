import { MemoLayout } from "@/components/memo/MemoLayout";
import { useState, useEffect } from "react";
import { Check, Plus, X, Trash2, Volume2, User, Clock, Bell, ChevronRight } from "lucide-react";
import { useMemoDashboardData } from "@/hooks/useMemoDashboardData";
import { patchPatient, deletePatientApi } from "@/lib/memoBackend";
import { Link, useNavigate } from "react-router-dom";

const voiceModels = [
  { id: "aria",    name: "Aria",    desc: "Warm, conversational" },
  { id: "roger",   name: "Roger",   desc: "Calm, reassuring" },
  { id: "sarah",   name: "Sarah",   desc: "Gentle, friendly" },
  { id: "charlie", name: "Charlie", desc: "Soft-spoken, patient" },
];

const timezones = [
  "America/New_York", "America/Chicago", "America/Denver",
  "America/Los_Angeles", "America/Anchorage", "Pacific/Honolulu",
  "Europe/London", "Europe/Paris", "Asia/Tokyo", "Australia/Sydney",
];

const input = "w-full px-3 py-2 text-[13px] border border-border rounded-md bg-white focus:outline-none focus:ring-1 focus:ring-foreground/20 focus:border-foreground/20 transition-colors placeholder:text-muted-foreground/40";
const label = "text-[11px] text-muted-foreground mb-1 block";

export default function Settings() {
  const navigate = useNavigate();
  const { loading, patient, allPatients, switchPatient } = useMemoDashboardData();
  const doPatch = async (updates: Record<string, any>) => {
    if (!patient) return;
    await patchPatient(patient._id, updates);
  };
  const doDelete = async () => {
    if (!patient) return;
    await deletePatientApi(patient._id);
  };

  // Profile state
  const [name, setName] = useState("");
  const [timezone, setTimezone] = useState("");
  const [emergencyContact, setEmergencyContact] = useState("");
  const [healthContext, setHealthContext] = useState("");

  // Schedule
  const [callTime, setCallTime] = useState("10:00");
  const [callFreq, setCallFreq] = useState("daily");

  // Voice
  const [selectedVoice, setSelectedVoice] = useState("aria");

  // Family contacts
  const [contacts, setContacts] = useState<{ name: string; relationship: string }[]>([]);
  const [addingContact, setAddingContact] = useState(false);
  const [newName, setNewName] = useState("");
  const [newRelationship, setNewRelationship] = useState("");

  // Save feedback
  const [saved, setSaved] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!patient) return;
    setName(patient.name ?? "");
    setTimezone(patient.timezone ?? "");
    setEmergencyContact(patient.emergencyContact ?? "");
    setHealthContext(patient.healthContext ?? "");
    setCallTime(patient.memoTime ?? "10:00");
    setSelectedVoice(patient.voiceId ?? "aria");
    setContacts(patient.knownPeople ?? []);
  }, [patient?._id]);

  const flashSaved = (key: string) => {
    setSaved(s => ({ ...s, [key]: true }));
    setTimeout(() => setSaved(s => ({ ...s, [key]: false })), 2000);
  };

  const saveProfile = async () => {
    if (!patient) return;
    await doPatch({ name, timezone, emergencyContact, healthContext });
    flashSaved("profile");
  };

  const saveSchedule = async () => {
    if (!patient) return;
    await doPatch({ memoTime: callTime });
    flashSaved("schedule");
  };

  const saveVoice = async (v: string) => {
    if (!patient) return;
    setSelectedVoice(v);
    await doPatch({ voiceId: v });
    flashSaved("voice");
  };

  const addContact = async () => {
    if (!newName.trim() || !newRelationship.trim() || !patient) return;
    const updated = [...contacts, { name: newName.trim(), relationship: newRelationship.trim() }];
    setContacts(updated);
    await doPatch({ knownPeople: updated });
    setNewName("");
    setNewRelationship("");
    setAddingContact(false);
    flashSaved("contacts");
  };

  const removeContact = async (idx: number) => {
    if (!patient) return;
    const updated = contacts.filter((_, i) => i !== idx);
    setContacts(updated);
    await doPatch({ knownPeople: updated });
  };

  const handleDelete = async () => {
    if (!patient) return;
    if (!confirm(`Remove ${patient.name} from Memo? This cannot be undone.`)) return;
    await doDelete();
    navigate("/onboarding");
  };

  if (loading) return (
    <MemoLayout><div className="p-8 text-[13px] text-muted-foreground">Loading…</div></MemoLayout>
  );

  if (!patient) return (
    <MemoLayout>
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <p className="text-[13px] text-muted-foreground mb-4">No patient enrolled yet.</p>
          <Link to="/onboarding"
            className="text-[13px] font-medium bg-foreground text-background px-4 py-2 rounded-md hover:bg-foreground/90 transition-colors">
            Add patient
          </Link>
        </div>
      </div>
    </MemoLayout>
  );

  return (
    <MemoLayout>
      <div className="flex h-full">

        {/* ── Left column ── */}
        <div className="flex-1 min-w-0 overflow-auto border-r border-border">

          <div className="flex items-center justify-between px-8 pt-7 pb-5 border-b border-border">
            <div>
              <h1 className="text-[15px] font-semibold text-foreground">Settings</h1>
              <p className="text-[12px] text-muted-foreground mt-0.5">{patient.name}</p>
            </div>
            {allPatients.length > 1 && (
              <div className="flex gap-1.5">
                {allPatients.map(p => (
                  <button
                    key={p._id}
                    onClick={() => switchPatient(p._id)}
                    title={p.name}
                    className={`w-7 h-7 rounded-full text-[10px] font-semibold transition-colors ${
                      p._id === patient._id
                        ? "bg-foreground text-background"
                        : "bg-muted text-muted-foreground hover:bg-foreground/10"
                    }`}
                  >
                    {p.name.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase()}
                  </button>
                ))}
                <Link to="/onboarding"
                  className="w-7 h-7 rounded-full bg-muted text-muted-foreground hover:bg-foreground/10 flex items-center justify-center transition-colors"
                  title="Add patient">
                  <Plus className="w-3 h-3" />
                </Link>
              </div>
            )}
          </div>

          <div className="px-8 py-6 space-y-7">

            {/* Profile */}
            <section>
              <div className="flex items-center justify-between mb-4">
                <p className="text-[12px] font-medium text-foreground">Profile</p>
                <button
                  onClick={saveProfile}
                  className="flex items-center gap-1 text-[12px] font-medium text-foreground/70 hover:text-foreground transition-colors"
                >
                  {saved.profile ? <><Check className="w-3 h-3 text-memo-green" /> Saved</> : "Save changes"}
                </button>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={label}>Full name</label>
                  <input value={name} onChange={e => setName(e.target.value)} className={input} placeholder="Patient name" />
                </div>
                <div>
                  <label className={label}>Phone</label>
                  <input value={patient.phoneNumber} readOnly className={`${input} bg-muted/40 cursor-default`} />
                </div>
                <div>
                  <label className={label}>Timezone</label>
                  <select value={timezone} onChange={e => setTimezone(e.target.value)} className={input}>
                    <option value="">Select timezone</option>
                    {timezones.map(tz => (
                      <option key={tz} value={tz}>{tz.replace("_", " ")}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={label}>Emergency contact</label>
                  <input value={emergencyContact} onChange={e => setEmergencyContact(e.target.value)} className={input} placeholder="+1 555 000 0000" />
                </div>
                <div className="col-span-2">
                  <label className={label}>Health context <span className="text-muted-foreground/60">(helps Memo ask better questions)</span></label>
                  <textarea value={healthContext} onChange={e => setHealthContext(e.target.value)} rows={2}
                    className={`${input} resize-none`} placeholder="e.g. mild memory concerns, takes blood pressure medication, loves gardening" />
                </div>
              </div>
            </section>

            <div className="border-t border-border" />

            {/* Call schedule */}
            <section>
              <div className="flex items-center justify-between mb-4">
                <p className="text-[12px] font-medium text-foreground">Call schedule</p>
                <button
                  onClick={saveSchedule}
                  className="flex items-center gap-1 text-[12px] font-medium text-foreground/70 hover:text-foreground transition-colors"
                >
                  {saved.schedule ? <><Check className="w-3 h-3 text-memo-green" /> Saved</> : "Save changes"}
                </button>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={label}>Call time</label>
                  <input type="time" value={callTime} onChange={e => setCallTime(e.target.value)} className={input} />
                </div>
                <div>
                  <label className={label}>Frequency</label>
                  <select value={callFreq} onChange={e => setCallFreq(e.target.value)} className={input}>
                    <option value="daily">Daily</option>
                    <option value="weekdays">Weekdays only</option>
                    <option value="every-other">Every other day</option>
                  </select>
                </div>
              </div>
              <p className="text-[11px] text-muted-foreground mt-3">
                If {patient.name} doesn't answer, Memo will retry after 30 minutes.
              </p>
            </section>

            <div className="border-t border-border" />

            {/* Family contacts */}
            <section>
              <div className="flex items-center justify-between mb-4">
                <p className="text-[12px] font-medium text-foreground">Family contacts</p>
                {saved.contacts && (
                  <span className="flex items-center gap-1 text-[12px] text-memo-green">
                    <Check className="w-3 h-3" /> Saved
                  </span>
                )}
              </div>

              {contacts.length > 0 && (
                <div className="space-y-1.5 mb-3">
                  {contacts.map((c, i) => (
                    <div key={i} className="flex items-center gap-3 px-3 py-2.5 bg-white border border-border rounded-md">
                      <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center shrink-0">
                        <span className="text-[10px] font-semibold text-muted-foreground">{c.name[0]}</span>
                      </div>
                      <span className="text-[13px] text-foreground flex-1">{c.name}</span>
                      <span className="text-[11px] text-muted-foreground capitalize">{c.relationship}</span>
                      <button onClick={() => removeContact(i)} className="text-muted-foreground/40 hover:text-memo-red transition-colors">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {addingContact ? (
                <div className="border border-border rounded-md p-3 bg-white space-y-2.5">
                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <label className={label}>Name</label>
                      <input
                        value={newName}
                        onChange={e => setNewName(e.target.value)}
                        onKeyDown={e => e.key === "Enter" && addContact()}
                        autoFocus
                        className={input}
                        placeholder="e.g. Sarah"
                      />
                    </div>
                    <div>
                      <label className={label}>Relationship</label>
                      <input
                        value={newRelationship}
                        onChange={e => setNewRelationship(e.target.value)}
                        onKeyDown={e => e.key === "Enter" && addContact()}
                        className={input}
                        placeholder="e.g. Daughter"
                      />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={addContact}
                      disabled={!newName.trim() || !newRelationship.trim()}
                      className="px-3 py-1.5 text-[12px] font-medium bg-foreground text-background rounded-md hover:bg-foreground/90 disabled:opacity-40 transition-colors"
                    >
                      Add contact
                    </button>
                    <button
                      onClick={() => { setAddingContact(false); setNewName(""); setNewRelationship(""); }}
                      className="px-3 py-1.5 text-[12px] text-muted-foreground hover:text-foreground transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setAddingContact(true)}
                  className="flex items-center gap-1.5 text-[12px] text-muted-foreground hover:text-foreground transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" /> Add family member
                </button>
              )}
              <p className="text-[11px] text-muted-foreground mt-3">
                Family contacts receive alerts when Memo detects a significant change.
              </p>
            </section>

            <div className="border-t border-border" />

            {/* Danger zone */}
            <section>
              <p className="text-[12px] font-medium text-memo-red mb-3">Danger zone</p>
              <p className="text-[12px] text-muted-foreground mb-3 leading-relaxed">
                Removing {patient.name} permanently deletes all call data, health signals, and reports.
              </p>
              <button
                onClick={handleDelete}
                className="flex items-center gap-1.5 px-3.5 py-2 text-[12px] font-medium rounded-md border border-memo-red/30 text-memo-red hover:bg-memo-red hover:text-white transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" /> Remove {patient.name}
              </button>
            </section>

          </div>
        </div>

        {/* ── Right column: voice + quick stats ── */}
        <div className="w-[260px] shrink-0 overflow-auto">

          {/* Voice */}
          <div className="p-6 border-b border-border">
            <div className="flex items-center justify-between mb-4">
              <p className="text-[12px] font-medium text-foreground">Call voice</p>
              {saved.voice && (
                <span className="flex items-center gap-1 text-[11px] text-memo-green">
                  <Check className="w-3 h-3" /> Saved
                </span>
              )}
            </div>
            <div className="space-y-1.5">
              {voiceModels.map(v => (
                <button
                  key={v.id}
                  onClick={() => saveVoice(v.id)}
                  className={`w-full text-left flex items-center gap-3 px-3 py-2.5 rounded-md border transition-colors ${
                    selectedVoice === v.id
                      ? "border-foreground/20 bg-foreground/[0.03]"
                      : "border-border hover:border-foreground/10 hover:bg-[#F5F5F5]"
                  }`}
                >
                  <Volume2 className={`w-3.5 h-3.5 shrink-0 ${selectedVoice === v.id ? "text-foreground" : "text-muted-foreground"}`} strokeWidth={1.75} />
                  <div>
                    <p className="text-[12px] font-medium text-foreground">{v.name}</p>
                    <p className="text-[11px] text-muted-foreground">{v.desc}</p>
                  </div>
                  {selectedVoice === v.id && <Check className="w-3 h-3 text-foreground ml-auto" />}
                </button>
              ))}
            </div>
          </div>

          {/* Quick stats */}
          <div className="p-6">
            <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide mb-4">Patient info</p>
            <div className="space-y-3">
              <div>
                <p className="text-[11px] text-muted-foreground">Phone</p>
                <p className="text-[13px] text-foreground tabular">{patient.phoneNumber}</p>
              </div>
              <div>
                <p className="text-[11px] text-muted-foreground">Enrolled</p>
                <p className="text-[13px] text-foreground">
                  {patient._creationTime ? new Date(patient._creationTime).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—"}
                </p>
              </div>
              <div>
                <p className="text-[11px] text-muted-foreground">Last call</p>
                <p className="text-[13px] text-foreground">
                  {patient.lastCalledAt ? new Date(patient.lastCalledAt).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "Never"}
                </p>
              </div>
              <div>
                <p className="text-[11px] text-muted-foreground">Cognitive baseline</p>
                <p className="text-[13px] text-foreground tabular">
                  {patient.baseline?.cognitiveScore ? Math.round(patient.baseline.cognitiveScore) : "—"}/100
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </MemoLayout>
  );
}
