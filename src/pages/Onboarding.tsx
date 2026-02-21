import { MemoLayout } from "@/components/memo/MemoLayout";
import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { User, Upload, Users, Check, ChevronRight, Phone, Clock, X } from "lucide-react";

const steps = ["Patient Details", "Voice Sample", "Family Contacts"];

const Onboarding = () => {
  const [currentStep, setCurrentStep] = useState(0);
  const [elderName, setElderName] = useState("");
  const [elderPhone, setElderPhone] = useState("");
  const [callTime, setCallTime] = useState("10:00");
  const [fileName, setFileName] = useState("");
  const [familyMembers, setFamilyMembers] = useState([{ name: "", phone: "", relationship: "" }]);

  const addFamilyMember = () => {
    setFamilyMembers(prev => [...prev, { name: "", phone: "", relationship: "" }]);
  };

  const removeFamilyMember = (index: number) => {
    setFamilyMembers(prev => prev.filter((_, i) => i !== index));
  };

  const updateFamilyMember = (index: number, field: string, value: string) => {
    setFamilyMembers(prev => prev.map((m, i) => i === index ? { ...m, [field]: value } : m));
  };

  return (
    <MemoLayout>
      <div className="max-w-2xl mx-auto animate-fade-in-up">
        <h1 className="text-2xl font-display text-foreground mb-1">New Patient Setup</h1>
        <p className="text-sm text-muted-foreground mb-8">Configure monitoring for a family member</p>

        {/* Step Indicator */}
        <div className="flex items-center gap-0 mb-10">
          {steps.map((step, i) => (
            <div key={i} className="flex items-center flex-1">
              <div className="flex items-center gap-2 flex-1">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                  i <= currentStep ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"
                }`}>
                  {i < currentStep ? <Check className="w-3.5 h-3.5" /> : i + 1}
                </div>
                <span className={`text-sm hidden sm:inline ${i <= currentStep ? "text-foreground font-medium" : "text-muted-foreground"}`}>
                  {step}
                </span>
              </div>
              {i < steps.length - 1 && (
                <div className={`h-px flex-1 mx-2 ${i < currentStep ? "bg-primary" : "bg-border"}`} />
              )}
            </div>
          ))}
        </div>

        {/* Step Content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -16 }}
            transition={{ duration: 0.2 }}
          >
            {currentStep === 0 && (
              <div className="bg-card rounded-lg border border-border p-6 space-y-5">
                <div className="flex items-center gap-2 mb-1">
                  <User className="w-4 h-4 text-primary" />
                  <h2 className="text-sm font-semibold text-foreground uppercase tracking-wide">Patient Information</h2>
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground mb-1.5 block">Full Name</label>
                  <input
                    type="text"
                    value={elderName}
                    onChange={e => setElderName(e.target.value)}
                    placeholder="Margaret Wilson"
                    className="w-full px-3.5 py-2.5 rounded-md border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground mb-1.5 block">Phone Number</label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input
                      type="tel"
                      value={elderPhone}
                      onChange={e => setElderPhone(e.target.value)}
                      placeholder="+1 (555) 000-0000"
                      className="w-full pl-10 pr-4 py-2.5 rounded-md border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground mb-1.5 block">Preferred Call Time</label>
                  <div className="relative">
                    <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input
                      type="time"
                      value={callTime}
                      onChange={e => setCallTime(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 rounded-md border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                  </div>
                </div>
              </div>
            )}

            {currentStep === 1 && (
              <div className="bg-card rounded-lg border border-border p-6 space-y-5">
                <div className="flex items-center gap-2 mb-1">
                  <Upload className="w-4 h-4 text-primary" />
                  <h2 className="text-sm font-semibold text-foreground uppercase tracking-wide">Voice Sample</h2>
                </div>
                <p className="text-sm text-muted-foreground">Upload a family member's voice sample for voice persona customization. This helps Memo sound familiar during calls.</p>
                <div
                  className="border border-dashed border-border rounded-lg p-8 text-center hover:border-primary/40 transition-colors cursor-pointer"
                  onDragOver={e => e.preventDefault()}
                  onDrop={e => { e.preventDefault(); setFileName(e.dataTransfer.files?.[0]?.name || ""); }}
                >
                  <Upload className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                  {fileName ? (
                    <p className="text-sm font-medium text-foreground">{fileName}</p>
                  ) : (
                    <>
                      <p className="text-sm font-medium text-foreground">Drop an .mp3 file here</p>
                      <p className="text-xs text-muted-foreground mt-1">or click to browse</p>
                    </>
                  )}
                </div>
              </div>
            )}

            {currentStep === 2 && (
              <div className="bg-card rounded-lg border border-border p-6 space-y-5">
                <div className="flex items-center gap-2 mb-1">
                  <Users className="w-4 h-4 text-primary" />
                  <h2 className="text-sm font-semibold text-foreground uppercase tracking-wide">Family Contacts</h2>
                </div>
                <div className="space-y-3">
                  {familyMembers.map((member, i) => (
                    <div key={i} className="border border-border rounded-md p-4 relative">
                      {familyMembers.length > 1 && (
                        <button onClick={() => removeFamilyMember(i)} className="absolute top-3 right-3 text-muted-foreground hover:text-foreground">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <div className="grid grid-cols-3 gap-3">
                        <div>
                          <label className="text-xs font-medium text-muted-foreground mb-1 block">Name</label>
                          <input type="text" value={member.name} onChange={e => updateFamilyMember(i, "name", e.target.value)} placeholder="John Wilson" className="w-full px-3 py-2 rounded-md border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
                        </div>
                        <div>
                          <label className="text-xs font-medium text-muted-foreground mb-1 block">Phone</label>
                          <input type="tel" value={member.phone} onChange={e => updateFamilyMember(i, "phone", e.target.value)} placeholder="+1 (555) 000-0000" className="w-full px-3 py-2 rounded-md border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
                        </div>
                        <div>
                          <label className="text-xs font-medium text-muted-foreground mb-1 block">Relationship</label>
                          <input type="text" value={member.relationship} onChange={e => updateFamilyMember(i, "relationship", e.target.value)} placeholder="Son" className="w-full px-3 py-2 rounded-md border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <button onClick={addFamilyMember} className="text-sm text-primary font-medium hover:underline">
                  + Add another contact
                </button>
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        {/* Navigation */}
        <div className="flex justify-between mt-8">
          <button
            onClick={() => setCurrentStep(prev => prev - 1)}
            disabled={currentStep === 0}
            className="px-5 py-2 text-sm font-medium text-muted-foreground hover:text-foreground disabled:opacity-0 transition-all"
          >
            Back
          </button>
          <button
            onClick={() => currentStep < 2 ? setCurrentStep(prev => prev + 1) : null}
            className="flex items-center gap-1.5 px-5 py-2 bg-primary text-primary-foreground text-sm font-medium rounded-md hover:opacity-90 transition-opacity"
          >
            {currentStep === 2 ? "Complete Setup" : "Continue"}
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </MemoLayout>
  );
};

export default Onboarding;
