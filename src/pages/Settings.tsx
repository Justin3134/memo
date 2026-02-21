import { MemoLayout } from "@/components/memo/MemoLayout";
import { useState } from "react";
import { User, Clock, Bell, Mic, Trash2, Volume2, Upload } from "lucide-react";

const voiceModels = [
  { id: "aria", name: "Aria", desc: "Warm, conversational female voice" },
  { id: "roger", name: "Roger", desc: "Calm, reassuring male voice" },
  { id: "sarah", name: "Sarah", desc: "Gentle, friendly female voice" },
  { id: "charlie", name: "Charlie", desc: "Soft-spoken, patient male voice" },
];

const inputClasses = "w-full px-3.5 py-2.5 rounded-md border border-input bg-background text-foreground text-[13px] placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-foreground focus:border-foreground";

const Settings = () => {
  const [callTime, setCallTime] = useState("10:00");
  const [callFreq, setCallFreq] = useState("daily");
  const [selectedVoice, setSelectedVoice] = useState("aria");

  return (
    <MemoLayout>
      <div className="max-w-3xl mx-auto animate-fade-in-up">
        <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1">Configuration</p>
        <h1 className="text-xl font-display text-foreground mb-6">Settings</h1>

        <div className="space-y-5">
          {/* Profile */}
          <section className="bg-card rounded-lg border border-border p-5">
            <div className="flex items-center gap-2 mb-4">
              <User className="w-3.5 h-3.5 text-muted-foreground" />
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Patient Profile</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-medium text-muted-foreground mb-1.5 block">Full Name</label>
                <input type="text" defaultValue="Margaret Wilson" className={inputClasses} />
              </div>
              <div>
                <label className="text-[11px] font-medium text-muted-foreground mb-1.5 block">Phone</label>
                <input type="tel" defaultValue="+1 (503) 555-0142" className={inputClasses} />
              </div>
              <div>
                <label className="text-[11px] font-medium text-muted-foreground mb-1.5 block">Date of Birth</label>
                <input type="text" defaultValue="March 15, 1948" className={inputClasses} />
              </div>
              <div>
                <label className="text-[11px] font-medium text-muted-foreground mb-1.5 block">Location</label>
                <input type="text" defaultValue="Portland, OR" className={inputClasses} />
              </div>
            </div>
          </section>

          {/* Call Schedule */}
          <section className="bg-card rounded-lg border border-border p-5">
            <div className="flex items-center gap-2 mb-4">
              <Clock className="w-3.5 h-3.5 text-muted-foreground" />
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Call Schedule</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-medium text-muted-foreground mb-1.5 block">Call Time</label>
                <input type="time" value={callTime} onChange={e => setCallTime(e.target.value)} className={inputClasses} />
              </div>
              <div>
                <label className="text-[11px] font-medium text-muted-foreground mb-1.5 block">Frequency</label>
                <select value={callFreq} onChange={e => setCallFreq(e.target.value)} className={inputClasses}>
                  <option value="daily">Daily</option>
                  <option value="weekdays">Weekdays Only</option>
                  <option value="every-other">Every Other Day</option>
                </select>
              </div>
            </div>
            <p className="text-[11px] text-muted-foreground mt-3 leading-relaxed">If Margaret doesn't answer, Memo will retry once after 30 minutes and notify family contacts.</p>
          </section>

          {/* Family Notifications */}
          <section className="bg-card rounded-lg border border-border p-5">
            <div className="flex items-center gap-2 mb-4">
              <Bell className="w-3.5 h-3.5 text-muted-foreground" />
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Family Notifications</p>
            </div>
            <div className="space-y-2">
              {[
                { name: "John Wilson", relation: "Son", method: "SMS + Email" },
                { name: "Laura Wilson", relation: "Daughter", method: "Email" },
              ].map((f, i) => (
                <div key={i} className="flex items-center justify-between border border-border rounded-md p-3 hover:bg-muted/20 transition-colors">
                  <div>
                    <p className="text-[13px] font-medium text-foreground">{f.name}</p>
                    <p className="text-[11px] text-muted-foreground">{f.relation} · {f.method}</p>
                  </div>
                </div>
              ))}
            </div>
            <button className="text-[12px] text-muted-foreground font-medium hover:text-foreground mt-3 transition-colors">+ Add family member</button>
          </section>

          {/* Voice Model */}
          <section className="bg-card rounded-lg border border-border p-5">
            <div className="flex items-center gap-2 mb-4">
              <Mic className="w-3.5 h-3.5 text-muted-foreground" />
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Call Voice</p>
            </div>
            <p className="text-[11px] text-muted-foreground mb-3">Select a pre-built voice model, or upload a custom recording.</p>
            <div className="grid grid-cols-2 gap-2.5">
              {voiceModels.map((v) => (
                <button
                  key={v.id}
                  onClick={() => setSelectedVoice(v.id)}
                  className={`text-left border rounded-md p-3.5 transition-all duration-150 group ${
                    selectedVoice === v.id
                      ? "border-foreground bg-foreground/[0.03] shadow-sm"
                      : "border-border hover:border-foreground/30 hover:bg-muted/30"
                  }`}
                >
                  <div className="flex items-center gap-2 mb-0.5">
                    <Volume2 className={`w-3 h-3 ${selectedVoice === v.id ? "text-foreground" : "text-muted-foreground"}`} />
                    <p className="text-[12px] font-semibold text-foreground">{v.name}</p>
                  </div>
                  <p className="text-[10px] text-muted-foreground leading-snug">{v.desc}</p>
                </button>
              ))}
            </div>
            <div className="relative my-4 py-1">
              <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 border-t border-border" />
              <p className="relative text-[10px] text-muted-foreground bg-card px-3 mx-auto w-fit text-center uppercase tracking-wide">or upload a voice</p>
            </div>
            <div
              className="border border-dashed border-border rounded-lg p-6 text-center hover:border-foreground/30 hover:bg-muted/20 transition-all cursor-pointer group"
              onClick={() => document.getElementById("voice-upload-settings")?.click()}
            >
              <Upload className="w-4 h-4 text-muted-foreground mx-auto mb-1.5 group-hover:text-foreground transition-colors" />
              <p className="text-[12px] font-medium text-foreground">Drop .mp3 or .wav here</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">or click to browse</p>
              <input id="voice-upload-settings" type="file" accept=".mp3,.wav,.m4a" className="hidden" onChange={(e) => { if (e.target.files?.[0]) setSelectedVoice("custom"); }} />
            </div>
          </section>

          {/* Danger Zone */}
          <section className="bg-card rounded-lg border border-memo-red/20 p-5">
            <div className="flex items-center gap-2 mb-3">
              <Trash2 className="w-3.5 h-3.5 text-memo-red" />
              <p className="text-[10px] font-semibold text-memo-red uppercase tracking-wide">Danger Zone</p>
            </div>
            <p className="text-[12px] text-muted-foreground mb-3 leading-relaxed">Removing Margaret will permanently delete all call data, health signals, and reports. This action cannot be undone.</p>
            <button className="px-3.5 py-2 text-[12px] font-medium rounded-md bg-memo-red text-white hover:opacity-90 transition-opacity active:scale-[0.99]">
              Remove Margaret from Memo
            </button>
          </section>
        </div>
      </div>
    </MemoLayout>
  );
};

export default Settings;
