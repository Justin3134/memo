import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronRight, Check, X, CheckCircle2, Upload, Volume2 } from "lucide-react";
import { Button } from "@/components/ui/button";

const steps = ["Patient", "Voice", "Family"];

const voiceModels = [
  { id: "aria", name: "Aria", desc: "Warm, conversational female" },
  { id: "roger", name: "Roger", desc: "Calm, reassuring male" },
  { id: "sarah", name: "Sarah", desc: "Gentle, friendly female" },
  { id: "charlie", name: "Charlie", desc: "Soft-spoken, patient male" },
];

const Landing = () => {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(0);
  const [completed, setCompleted] = useState(false);
  const [elderName, setElderName] = useState("");
  const [elderPhone, setElderPhone] = useState("");
  const [callTime, setCallTime] = useState("10:00");
  const [selectedVoice, setSelectedVoice] = useState("aria");
  const [familyMembers, setFamilyMembers] = useState([{ name: "", phone: "", relationship: "" }]);

  const addFamilyMember = () => setFamilyMembers(prev => [...prev, { name: "", phone: "", relationship: "" }]);
  const removeFamilyMember = (index: number) => setFamilyMembers(prev => prev.filter((_, i) => i !== index));
  const updateFamilyMember = (index: number, field: string, value: string) => {
    setFamilyMembers(prev => prev.map((m, i) => i === index ? { ...m, [field]: value } : m));
  };
  const handleComplete = () => setCompleted(true);

  return (
    <div className="min-h-screen bg-background font-body flex flex-col">
      {/* Minimal Nav */}
      <nav className="flex items-center justify-between px-6 md:px-10 py-5 max-w-4xl mx-auto w-full">
        <span className="text-sm font-display text-foreground tracking-tight">memo</span>
        <Link to="/dashboard">
          <Button size="sm" variant="ghost" className="text-xs text-muted-foreground hover:text-foreground">
            Dashboard →
          </Button>
        </Link>
      </nav>

      {/* Main Content */}
      <div className="flex-1 flex items-center justify-center px-6 pb-16">
        <div className="w-full max-w-md">
          {completed ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4, ease: "easeOut" }}
              className="text-center py-12"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.15, type: "spring", stiffness: 200, damping: 15 }}
                className="w-14 h-14 rounded-full bg-foreground flex items-center justify-center mx-auto mb-5"
              >
                <CheckCircle2 className="w-7 h-7 text-background" />
              </motion.div>
              <motion.h2
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="text-xl font-display text-foreground mb-2"
              >
                You're all set
              </motion.h2>
              <motion.p
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="text-[13px] text-muted-foreground mb-6"
              >
                {elderName || "Your family member"} will receive their first call at {callTime}.
              </motion.p>
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.55 }}>
                <Button onClick={() => navigate("/dashboard")} className="gap-1.5 text-[13px]">
                  Open Dashboard <ChevronRight className="w-3.5 h-3.5" />
                </Button>
              </motion.div>
            </motion.div>
          ) : (
            <>
              {/* Hero */}
              <div className="mb-8">
                <h1 className="text-2xl md:text-3xl font-display text-foreground leading-tight mb-2.5">
                  Voice-based cognitive monitoring
                </h1>
                <p className="text-[13px] text-muted-foreground leading-relaxed max-w-sm">
                  A daily phone call that detects early signs of cognitive and neurological decline through voice analysis. No app needed for them.
                </p>
              </div>

              {/* Steps */}
              <div className="flex items-center gap-0 mb-6">
                {steps.map((step, i) => (
                  <div key={i} className="flex items-center flex-1">
                    <div className="flex items-center gap-1.5">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-semibold transition-all duration-200 ${
                        i < currentStep ? "bg-foreground text-background" : i === currentStep ? "bg-foreground text-background shadow-sm" : "bg-muted text-muted-foreground"
                      }`}>
                        {i < currentStep ? <Check className="w-3 h-3" /> : i + 1}
                      </div>
                      <span className={`text-[12px] hidden sm:inline transition-colors ${i <= currentStep ? "text-foreground font-medium" : "text-muted-foreground"}`}>
                        {step}
                      </span>
                    </div>
                    {i < steps.length - 1 && (
                      <div className={`h-px flex-1 mx-3 transition-colors duration-300 ${i < currentStep ? "bg-foreground" : "bg-border"}`} />
                    )}
                  </div>
                ))}
              </div>

              {/* Form Steps */}
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentStep}
                  initial={{ opacity: 0, x: 12 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -12 }}
                  transition={{ duration: 0.15 }}
                >
                  {currentStep === 0 && (
                    <div className="space-y-3.5">
                      <div>
                        <label className="text-[11px] font-medium text-muted-foreground mb-1.5 block uppercase tracking-wide">Full Name</label>
                        <input type="text" value={elderName} onChange={e => setElderName(e.target.value)} placeholder="Margaret Wilson" className="w-full px-3.5 py-2.5 rounded-md border border-input bg-background text-foreground text-[13px] placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-foreground focus:border-foreground" />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-[11px] font-medium text-muted-foreground mb-1.5 block uppercase tracking-wide">Phone</label>
                          <input type="tel" value={elderPhone} onChange={e => setElderPhone(e.target.value)} placeholder="+1 (555) 000-0000" className="w-full px-3.5 py-2.5 rounded-md border border-input bg-background text-foreground text-[13px] placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-foreground focus:border-foreground" />
                        </div>
                        <div>
                          <label className="text-[11px] font-medium text-muted-foreground mb-1.5 block uppercase tracking-wide">Preferred Call Time</label>
                          <input type="time" value={callTime} onChange={e => setCallTime(e.target.value)} className="w-full px-3.5 py-2.5 rounded-md border border-input bg-background text-foreground text-[13px] focus:outline-none focus:ring-1 focus:ring-foreground focus:border-foreground" />
                        </div>
                      </div>
                    </div>
                  )}

                  {currentStep === 1 && (
                    <div className="space-y-4">
                      <p className="text-[12px] text-muted-foreground">Select a pre-built voice model, or upload a custom recording.</p>
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
                      <div className="relative py-1">
                        <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 border-t border-border" />
                        <p className="relative text-[10px] text-muted-foreground bg-background px-3 mx-auto w-fit text-center uppercase tracking-wide">or upload a voice</p>
                      </div>
                      <div
                        className="border border-dashed border-border rounded-lg p-6 text-center hover:border-foreground/30 hover:bg-muted/20 transition-all cursor-pointer group"
                        onClick={() => document.getElementById("voice-upload-landing")?.click()}
                      >
                        <Upload className="w-4 h-4 text-muted-foreground mx-auto mb-1.5 group-hover:text-foreground transition-colors" />
                        <p className="text-[12px] font-medium text-foreground">Drop .mp3 or .wav here</p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">or click to browse</p>
                        <input id="voice-upload-landing" type="file" accept=".mp3,.wav,.m4a" className="hidden" onChange={(e) => { if (e.target.files?.[0]) setSelectedVoice("custom"); }} />
                      </div>
                    </div>
                  )}

                  {currentStep === 2 && (
                    <div className="space-y-3.5">
                      <p className="text-[12px] text-muted-foreground">Who should receive health updates?</p>
                      <div className="space-y-2.5">
                        {familyMembers.map((member, i) => (
                          <div key={i} className="border border-border rounded-md p-3.5 relative group">
                            {familyMembers.length > 1 && (
                              <button onClick={() => removeFamilyMember(i)} className="absolute top-3 right-3 text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100 transition-opacity">
                                <X className="w-3.5 h-3.5" />
                              </button>
                            )}
                            <div className="grid grid-cols-3 gap-2">
                              <input type="text" value={member.name} onChange={e => updateFamilyMember(i, "name", e.target.value)} placeholder="Name" className="w-full px-2.5 py-2 rounded-md border border-input bg-background text-foreground text-[13px] placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-foreground focus:border-foreground" />
                              <input type="tel" value={member.phone} onChange={e => updateFamilyMember(i, "phone", e.target.value)} placeholder="Phone" className="w-full px-2.5 py-2 rounded-md border border-input bg-background text-foreground text-[13px] placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-foreground focus:border-foreground" />
                              <input type="text" value={member.relationship} onChange={e => updateFamilyMember(i, "relationship", e.target.value)} placeholder="Relation" className="w-full px-2.5 py-2 rounded-md border border-input bg-background text-foreground text-[13px] placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-foreground focus:border-foreground" />
                            </div>
                          </div>
                        ))}
                      </div>
                      <button onClick={addFamilyMember} className="text-[12px] text-muted-foreground font-medium hover:text-foreground transition-colors">+ Add another</button>
                    </div>
                  )}
                </motion.div>
              </AnimatePresence>

              {/* Navigation */}
              <div className="flex gap-2.5 mt-6">
                {currentStep > 0 && (
                  <button
                    onClick={() => setCurrentStep(prev => prev - 1)}
                    className="px-4 py-2.5 text-[13px] font-medium text-muted-foreground border border-border rounded-md hover:text-foreground hover:border-foreground/40 transition-all"
                  >
                    Back
                  </button>
                )}
                <button
                  onClick={() => currentStep < 2 ? setCurrentStep(prev => prev + 1) : handleComplete()}
                  className="flex-1 flex items-center justify-center gap-1 py-2.5 bg-foreground text-background text-[13px] font-medium rounded-md hover:opacity-90 transition-opacity active:scale-[0.99]"
                >
                  {currentStep === 2 ? "Complete Registration" : "Continue"}
                </button>
              </div>
            </>
          )}

          {/* Footer */}
          <p className="text-[10px] text-muted-foreground/60 text-center mt-10">
            Memo is a screening tool, not a diagnostic device. · Consent-first protocol.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Landing;
