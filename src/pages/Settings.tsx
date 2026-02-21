import { MemoLayout } from "@/components/memo/MemoLayout";
import { useState } from "react";
import { User, Clock, Activity, Users, Bell, Mic, Shield, Trash2 } from "lucide-react";

const Settings = () => {
  const [callTime, setCallTime] = useState("10:00");
  const [callFreq, setCallFreq] = useState("daily");
  const [motorSensitivity, setMotorSensitivity] = useState(70);
  const [cognitiveSensitivity, setCognitiveSensitivity] = useState(60);
  const [emotionalSensitivity, setEmotionalSensitivity] = useState(80);

  return (
    <MemoLayout>
      <div className="max-w-3xl mx-auto animate-fade-in-up">
        <p className="text-xs text-muted-foreground mb-1">Configuration</p>
        <h1 className="text-xl font-display text-foreground mb-6">Settings</h1>

        <div className="space-y-5">
          {/* Profile */}
          <section className="bg-card rounded-lg border border-border p-5">
            <div className="flex items-center gap-2 mb-4">
              <User className="w-4 h-4 text-primary" />
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Patient Profile</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-medium text-muted-foreground mb-1 block">Full Name</label>
                <input type="text" defaultValue="Margaret Wilson" className="w-full px-3 py-2 rounded-md border border-input bg-background text-foreground text-[13px] focus:outline-none focus:ring-2 focus:ring-ring" />
              </div>
              <div>
                <label className="text-[11px] font-medium text-muted-foreground mb-1 block">Phone</label>
                <input type="tel" defaultValue="+1 (503) 555-0142" className="w-full px-3 py-2 rounded-md border border-input bg-background text-foreground text-[13px] focus:outline-none focus:ring-2 focus:ring-ring" />
              </div>
              <div>
                <label className="text-[11px] font-medium text-muted-foreground mb-1 block">Date of Birth</label>
                <input type="text" defaultValue="March 15, 1948" className="w-full px-3 py-2 rounded-md border border-input bg-background text-foreground text-[13px] focus:outline-none focus:ring-2 focus:ring-ring" />
              </div>
              <div>
                <label className="text-[11px] font-medium text-muted-foreground mb-1 block">Location</label>
                <input type="text" defaultValue="Portland, OR" className="w-full px-3 py-2 rounded-md border border-input bg-background text-foreground text-[13px] focus:outline-none focus:ring-2 focus:ring-ring" />
              </div>
            </div>
          </section>

          {/* Call Schedule */}
          <section className="bg-card rounded-lg border border-border p-5">
            <div className="flex items-center gap-2 mb-4">
              <Clock className="w-4 h-4 text-primary" />
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Call Schedule</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-medium text-muted-foreground mb-1 block">Call Time</label>
                <input type="time" value={callTime} onChange={e => setCallTime(e.target.value)} className="w-full px-3 py-2 rounded-md border border-input bg-background text-foreground text-[13px] focus:outline-none focus:ring-2 focus:ring-ring" />
              </div>
              <div>
                <label className="text-[11px] font-medium text-muted-foreground mb-1 block">Frequency</label>
                <select value={callFreq} onChange={e => setCallFreq(e.target.value)} className="w-full px-3 py-2 rounded-md border border-input bg-background text-foreground text-[13px] focus:outline-none focus:ring-2 focus:ring-ring">
                  <option value="daily">Daily</option>
                  <option value="weekdays">Weekdays Only</option>
                  <option value="every-other">Every Other Day</option>
                </select>
              </div>
            </div>
            <p className="text-[11px] text-muted-foreground mt-3">If Margaret doesn't answer, Memo will retry once after 30 minutes and notify family contacts.</p>
          </section>

          {/* Health Monitoring */}
          <section className="bg-card rounded-lg border border-border p-5">
            <div className="flex items-center gap-2 mb-4">
              <Activity className="w-4 h-4 text-primary" />
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Health Monitoring</p>
            </div>
            <p className="text-[11px] text-muted-foreground mb-3">Adjust sensitivity for each signal category. Higher values trigger alerts sooner.</p>
            <div className="space-y-4">
              {[
                { label: "Motor Health", value: motorSensitivity, setter: setMotorSensitivity },
                { label: "Cognitive Health", value: cognitiveSensitivity, setter: setCognitiveSensitivity },
                { label: "Emotional Wellness", value: emotionalSensitivity, setter: setEmotionalSensitivity },
              ].map((s) => (
                <div key={s.label}>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[12px] font-medium text-foreground">{s.label}</label>
                    <span className="text-[11px] text-muted-foreground">{s.value}%</span>
                  </div>
                  <input type="range" min={10} max={100} value={s.value} onChange={e => s.setter(Number(e.target.value))} className="w-full h-1.5 bg-secondary rounded-full appearance-none cursor-pointer accent-primary" />
                </div>
              ))}
            </div>
          </section>

          {/* Care Team */}
          <section className="bg-card rounded-lg border border-border p-5">
            <div className="flex items-center gap-2 mb-4">
              <Users className="w-4 h-4 text-primary" />
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Care Team</p>
            </div>
            <div className="space-y-2">
              {[
                { name: "Dr. Sarah Chen", specialty: "Neurologist", phone: "(503) 555-0180" },
                { name: "Dr. James Ortiz", specialty: "Primary Care", phone: "(503) 555-0192" },
              ].map((doc, i) => (
                <div key={i} className="flex items-center justify-between border border-border rounded-md p-3">
                  <div>
                    <p className="text-[13px] font-medium text-foreground">{doc.name}</p>
                    <p className="text-[11px] text-muted-foreground">{doc.specialty} · {doc.phone}</p>
                  </div>
                </div>
              ))}
            </div>
            <button className="text-[12px] text-primary font-medium hover:underline mt-2">+ Add provider</button>
          </section>

          {/* Family Notifications */}
          <section className="bg-card rounded-lg border border-border p-5">
            <div className="flex items-center gap-2 mb-4">
              <Bell className="w-4 h-4 text-primary" />
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Family Notifications</p>
            </div>
            <div className="space-y-2">
              {[
                { name: "John Wilson", relation: "Son", method: "SMS + Email" },
                { name: "Laura Wilson", relation: "Daughter", method: "Email" },
              ].map((f, i) => (
                <div key={i} className="flex items-center justify-between border border-border rounded-md p-3">
                  <div>
                    <p className="text-[13px] font-medium text-foreground">{f.name}</p>
                    <p className="text-[11px] text-muted-foreground">{f.relation} · {f.method}</p>
                  </div>
                </div>
              ))}
            </div>
            <button className="text-[12px] text-primary font-medium hover:underline mt-2">+ Add family member</button>
          </section>

          {/* Voice Persona */}
          <section className="bg-card rounded-lg border border-border p-5">
            <div className="flex items-center gap-2 mb-4">
              <Mic className="w-4 h-4 text-primary" />
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Voice Persona</p>
            </div>
            <p className="text-[11px] text-muted-foreground mb-3">Choose which voice Memo uses during calls with Margaret.</p>
            <div className="flex gap-2">
              <button className="px-3 py-1.5 text-[12px] font-medium rounded-md bg-primary text-primary-foreground">Default Voice</button>
              <button className="px-3 py-1.5 text-[12px] font-medium rounded-md bg-secondary text-muted-foreground hover:text-foreground">Family Clone</button>
            </div>
          </section>

          {/* Privacy */}
          <section className="bg-card rounded-lg border border-border p-5">
            <div className="flex items-center gap-2 mb-4">
              <Shield className="w-4 h-4 text-primary" />
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Privacy</p>
            </div>
            <div className="space-y-2 text-[12px] text-muted-foreground">
              <p>Call recordings are encrypted and stored for 90 days, then automatically deleted.</p>
              <p>Voice analysis data is anonymized and never shared with third parties.</p>
              <p>Health signals and reports are accessible only to authorized family members.</p>
            </div>
          </section>

          {/* Danger Zone */}
          <section className="bg-card rounded-lg border border-memo-red/20 p-5">
            <div className="flex items-center gap-2 mb-3">
              <Trash2 className="w-4 h-4 text-memo-red" />
              <p className="text-[11px] font-semibold text-memo-red uppercase tracking-wide">Danger Zone</p>
            </div>
            <p className="text-[12px] text-muted-foreground mb-3">Removing Margaret will permanently delete all call data, health signals, and reports. This action cannot be undone.</p>
            <button className="px-3.5 py-1.5 text-[12px] font-medium rounded-md bg-memo-red text-white hover:opacity-90 transition-opacity">
              Remove Margaret from Memo
            </button>
          </section>
        </div>
      </div>
    </MemoLayout>
  );
};

export default Settings;
