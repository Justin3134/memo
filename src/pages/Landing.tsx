import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Phone, BarChart3, Users, ChevronRight, ArrowRight, Activity, Upload, Clock, Check, X, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";

const steps = ["Patient", "Voice", "Family"];

const Landing = () => {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(0);
  const [completed, setCompleted] = useState(false);
  const [elderName, setElderName] = useState("");
  const [elderPhone, setElderPhone] = useState("");
  const [callTime, setCallTime] = useState("10:00");
  const [fileName, setFileName] = useState("");
  const [familyMembers, setFamilyMembers] = useState([{ name: "", phone: "", relationship: "" }]);

  const addFamilyMember = () => setFamilyMembers(prev => [...prev, { name: "", phone: "", relationship: "" }]);
  const removeFamilyMember = (index: number) => setFamilyMembers(prev => prev.filter((_, i) => i !== index));
  const updateFamilyMember = (index: number, field: string, value: string) => {
    setFamilyMembers(prev => prev.map((m, i) => i === index ? { ...m, [field]: value } : m));
  };
  const handleComplete = () => setCompleted(true);

  return (
    <div className="min-h-screen bg-background font-body">
      {/* Nav */}
      <nav className="flex items-center justify-between px-6 md:px-12 py-5 max-w-6xl mx-auto">
        <span className="text-base font-display text-foreground tracking-tight">memo</span>
        <div className="hidden md:flex items-center gap-8 text-[13px] text-muted-foreground">
          <a href="#how-it-works" className="hover:text-foreground transition-colors">Platform</a>
          <a href="#signals" className="hover:text-foreground transition-colors">Detection</a>
          <a href="#register" className="hover:text-foreground transition-colors">Get Started</a>
        </div>
        <Link to="/dashboard">
          <Button size="sm" variant="ghost" className="text-[13px] text-muted-foreground hover:text-foreground">
            Dashboard
          </Button>
        </Link>
      </nav>

      {/* Hero */}
      <section className="px-6 md:px-12 pt-16 pb-12 md:pt-24 md:pb-16 max-w-3xl mx-auto">
        <p className="text-[11px] font-medium text-primary uppercase tracking-widest mb-3">Voice-Based Cognitive Monitoring</p>
        <h1 className="text-3xl md:text-5xl font-display text-foreground leading-snug">
          Detect cognitive decline early through daily voice analysis.
        </h1>
        <p className="mt-4 text-[15px] text-muted-foreground leading-relaxed max-w-xl">
          Memo places a brief daily phone call to your family member. Our platform analyzes speech patterns, flags changes in cognition and motor function, and delivers structured reports to family caregivers.
        </p>
        <div className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-[11px] text-muted-foreground">
          <span>No app required for the patient</span>
          <span className="text-border">·</span>
          <span>Consent-first protocol</span>
          <span className="text-border">·</span>
          <span>Not a diagnostic device</span>
        </div>
      </section>

      {/* Registration Form */}
      <section id="register" className="px-6 md:px-12 py-12 md:py-16 border-t border-border">
        <div className="max-w-lg mx-auto">
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
                className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-5"
              >
                <CheckCircle2 className="w-7 h-7 text-primary" />
              </motion.div>
              <motion.h2
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="text-xl font-display text-foreground mb-2"
              >
                Patient registered
              </motion.h2>
              <motion.p
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="text-[13px] text-muted-foreground mb-6"
              >
                {elderName || "Your family member"} will receive their first call at {callTime}. You can adjust preferences from the dashboard.
              </motion.p>
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.55 }}>
                <Button onClick={() => navigate("/dashboard")} className="gap-1.5 text-[13px]">
                  Go to Dashboard <ChevronRight className="w-3.5 h-3.5" />
                </Button>
              </motion.div>
            </motion.div>
          ) : (
            <>
              <p className="text-[11px] font-medium text-primary uppercase tracking-widest mb-1">Get Started</p>
              <h2 className="text-xl font-display text-foreground mb-5">Register your family member</h2>

              {/* Steps */}
              <div className="flex items-center gap-0 mb-6">
                {steps.map((step, i) => (
                  <div key={i} className="flex items-center flex-1">
                    <div className="flex items-center gap-1.5">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-semibold transition-colors ${
                        i <= currentStep ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"
                      }`}>
                        {i < currentStep ? <Check className="w-3 h-3" /> : i + 1}
                      </div>
                      <span className={`text-[12px] hidden sm:inline ${i <= currentStep ? "text-foreground font-medium" : "text-muted-foreground"}`}>
                        {step}
                      </span>
                    </div>
                    {i < steps.length - 1 && (
                      <div className={`h-px flex-1 mx-3 ${i < currentStep ? "bg-primary" : "bg-border"}`} />
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
                    <div className="bg-card rounded-lg border border-border p-5 space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="col-span-2">
                          <label className="text-[12px] font-medium text-muted-foreground mb-1 block">Full Name</label>
                          <input type="text" value={elderName} onChange={e => setElderName(e.target.value)} placeholder="Margaret Wilson" className="w-full px-3 py-2 rounded-md border border-input bg-background text-foreground text-[13px] focus:outline-none focus:ring-2 focus:ring-ring" />
                        </div>
                        <div>
                          <label className="text-[12px] font-medium text-muted-foreground mb-1 block">Phone</label>
                          <div className="relative">
                            <Phone className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                            <input type="tel" value={elderPhone} onChange={e => setElderPhone(e.target.value)} placeholder="+1 (555) 000-0000" className="w-full pl-8 pr-3 py-2 rounded-md border border-input bg-background text-foreground text-[13px] focus:outline-none focus:ring-2 focus:ring-ring" />
                          </div>
                        </div>
                        <div>
                          <label className="text-[12px] font-medium text-muted-foreground mb-1 block">Call Time</label>
                          <div className="relative">
                            <Clock className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                            <input type="time" value={callTime} onChange={e => setCallTime(e.target.value)} className="w-full pl-8 pr-3 py-2 rounded-md border border-input bg-background text-foreground text-[13px] focus:outline-none focus:ring-2 focus:ring-ring" />
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {currentStep === 1 && (
                    <div className="bg-card rounded-lg border border-border p-5 space-y-4">
                      <p className="text-[13px] text-muted-foreground">Upload a voice sample so Memo can personalize its tone during calls. This step is optional.</p>
                      <div
                        className="border border-dashed border-border rounded-lg p-6 text-center hover:border-primary/40 transition-colors cursor-pointer"
                        onDragOver={e => e.preventDefault()}
                        onDrop={e => { e.preventDefault(); setFileName(e.dataTransfer.files?.[0]?.name || ""); }}
                      >
                        <Upload className="w-6 h-6 text-muted-foreground mx-auto mb-1.5" />
                        {fileName ? (
                          <p className="text-[13px] font-medium text-foreground">{fileName}</p>
                        ) : (
                          <>
                            <p className="text-[13px] font-medium text-foreground">Drop an .mp3 file here</p>
                            <p className="text-[11px] text-muted-foreground mt-0.5">or click to browse</p>
                          </>
                        )}
                      </div>
                    </div>
                  )}

                  {currentStep === 2 && (
                    <div className="bg-card rounded-lg border border-border p-5 space-y-4">
                      <p className="text-[13px] text-muted-foreground">Add family members who should receive health updates and alerts.</p>
                      <div className="space-y-2.5">
                        {familyMembers.map((member, i) => (
                          <div key={i} className="border border-border rounded-md p-3 relative">
                            {familyMembers.length > 1 && (
                              <button onClick={() => removeFamilyMember(i)} className="absolute top-2.5 right-2.5 text-muted-foreground hover:text-foreground">
                                <X className="w-3 h-3" />
                              </button>
                            )}
                            <div className="grid grid-cols-3 gap-2.5">
                              <div>
                                <label className="text-[11px] font-medium text-muted-foreground mb-0.5 block">Name</label>
                                <input type="text" value={member.name} onChange={e => updateFamilyMember(i, "name", e.target.value)} placeholder="John Wilson" className="w-full px-2.5 py-1.5 rounded-md border border-input bg-background text-foreground text-[13px] focus:outline-none focus:ring-2 focus:ring-ring" />
                              </div>
                              <div>
                                <label className="text-[11px] font-medium text-muted-foreground mb-0.5 block">Phone</label>
                                <input type="tel" value={member.phone} onChange={e => updateFamilyMember(i, "phone", e.target.value)} placeholder="+1 (555) 000" className="w-full px-2.5 py-1.5 rounded-md border border-input bg-background text-foreground text-[13px] focus:outline-none focus:ring-2 focus:ring-ring" />
                              </div>
                              <div>
                                <label className="text-[11px] font-medium text-muted-foreground mb-0.5 block">Relation</label>
                                <input type="text" value={member.relationship} onChange={e => updateFamilyMember(i, "relationship", e.target.value)} placeholder="Son" className="w-full px-2.5 py-1.5 rounded-md border border-input bg-background text-foreground text-[13px] focus:outline-none focus:ring-2 focus:ring-ring" />
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                      <button onClick={addFamilyMember} className="text-[12px] text-primary font-medium hover:underline">+ Add contact</button>
                    </div>
                  )}
                </motion.div>
              </AnimatePresence>

              {/* Nav */}
              <div className="flex justify-between mt-5">
                <button
                  onClick={() => setCurrentStep(prev => prev - 1)}
                  disabled={currentStep === 0}
                  className="px-4 py-1.5 text-[13px] font-medium text-muted-foreground hover:text-foreground disabled:opacity-0 transition-all"
                >
                  Back
                </button>
                <button
                  onClick={() => currentStep < 2 ? setCurrentStep(prev => prev + 1) : handleComplete()}
                  className="flex items-center gap-1 px-4 py-1.5 bg-primary text-primary-foreground text-[13px] font-medium rounded-md hover:opacity-90 transition-opacity"
                >
                  {currentStep === 2 ? "Register Patient" : "Continue"}
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </>
          )}
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="px-6 md:px-12 py-14 md:py-18 border-t border-border">
        <div className="max-w-6xl mx-auto">
          <p className="text-[11px] font-medium text-primary uppercase tracking-widest mb-2">Platform</p>
          <h2 className="text-2xl md:text-3xl font-display text-foreground mb-8">How Memo works</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {[
              { icon: Phone, title: "Daily voice call", desc: "Memo places a short, conversational call at a scheduled time. No devices or apps needed on their end." },
              { icon: BarChart3, title: "Acoustic analysis", desc: "Speech rate, pause frequency, articulation clarity, and prosody are measured against a rolling baseline." },
              { icon: Users, title: "Caregiver reporting", desc: "Structured health signals and call summaries are delivered to your dashboard in real time." },
            ].map((card) => (
              <div key={card.title} className="bg-card rounded-lg border border-border p-5">
                <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center mb-3">
                  <card.icon className="w-4 h-4 text-primary" />
                </div>
                <h3 className="text-[14px] font-semibold text-foreground mb-1">{card.title}</h3>
                <p className="text-[13px] text-muted-foreground leading-relaxed">{card.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Detection */}
      <section id="signals" className="px-6 md:px-12 py-14 md:py-18 bg-secondary/50">
        <div className="max-w-6xl mx-auto">
          <p className="text-[11px] font-medium text-primary uppercase tracking-widest mb-2">Detection</p>
          <h2 className="text-2xl md:text-3xl font-display text-foreground mb-8">What Memo monitors</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="bg-card rounded-lg border border-border p-5">
              <div className="flex items-center gap-2 mb-3">
                <Activity className="w-3.5 h-3.5 text-primary" />
                <h3 className="text-[12px] font-semibold text-foreground uppercase tracking-wide">Neurological Signals</h3>
              </div>
              <ul className="space-y-2">
                {["Parkinson's early motor markers", "Post-stroke speech degradation", "Vocal tremor frequency analysis", "Articulation clarity scoring"].map((item) => (
                  <li key={item} className="flex items-start gap-2 text-[13px] text-muted-foreground">
                    <ChevronRight className="w-3 h-3 text-primary mt-0.5 shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <div className="bg-card rounded-lg border border-border p-5">
              <div className="flex items-center gap-2 mb-3">
                <BarChart3 className="w-3.5 h-3.5 text-primary" />
                <h3 className="text-[12px] font-semibold text-foreground uppercase tracking-wide">Cognitive & Emotional</h3>
              </div>
              <ul className="space-y-2">
                {["Alzheimer's pattern recognition", "Word-finding difficulty scoring", "Depression and withdrawal markers", "Anxiety and agitation indicators"].map((item) => (
                  <li key={item} className="flex items-start gap-2 text-[13px] text-muted-foreground">
                    <ChevronRight className="w-3 h-3 text-primary mt-0.5 shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <p className="text-[11px] text-muted-foreground mt-5">Memo is a screening and awareness tool. It is not a medical diagnostic device.</p>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border px-6 md:px-12 py-6">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="font-display text-foreground text-[13px]">memo</span>
            <span className="text-[11px] text-muted-foreground">Cognitive voice monitoring for families.</span>
          </div>
          <div className="flex items-center gap-5 text-[11px] text-muted-foreground">
            <a href="#" className="hover:text-foreground transition-colors">Privacy</a>
            <a href="#" className="hover:text-foreground transition-colors">Terms</a>
            <a href="#" className="hover:text-foreground transition-colors">Contact</a>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
