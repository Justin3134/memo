import { MemoLayout } from "@/components/memo/MemoLayout";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { User, Upload, Users, Check, ChevronRight, Phone, Clock, X } from "lucide-react";

const steps = ["Elder Details", "Voice Sample", "Family Members"];

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
        <h1 className="text-2xl font-display font-bold text-foreground mb-2">Setup Memo</h1>
        <p className="text-sm text-muted-foreground mb-8">Get started by telling us about your loved one</p>

        {/* Step Indicator */}
        <div className="flex items-center gap-0 mb-10">
          {steps.map((step, i) => (
            <div key={i} className="flex items-center flex-1">
              <div className="flex items-center gap-2 flex-1">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                  i < currentStep ? "bg-primary text-primary-foreground"
                    : i === currentStep ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground"
                }`}>
                  {i < currentStep ? <Check className="w-4 h-4" /> : i + 1}
                </div>
                <span className={`text-sm font-medium hidden sm:inline ${i <= currentStep ? "text-foreground" : "text-muted-foreground"}`}>
                  {step}
                </span>
              </div>
              {i < steps.length - 1 && (
                <div className={`h-0.5 flex-1 mx-2 rounded ${i < currentStep ? "bg-primary" : "bg-border"}`} />
              )}
            </div>
          ))}
        </div>

        {/* Step Content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.25 }}
          >
            {currentStep === 0 && (
              <div className="bg-card rounded-xl border border-border p-8 shadow-sm space-y-6">
                <div className="flex items-center gap-3 mb-2">
                  <User className="w-5 h-5 text-primary" />
                  <h2 className="text-lg font-display font-semibold text-foreground">Elder Details</h2>
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground mb-1.5 block">Full Name</label>
                  <input
                    type="text"
                    value={elderName}
                    onChange={e => setElderName(e.target.value)}
                    placeholder="e.g. Margaret Wilson"
                    className="w-full px-4 py-2.5 rounded-lg border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
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
                      className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
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
                      className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                  </div>
                </div>
              </div>
            )}

            {currentStep === 1 && (
              <div className="bg-card rounded-xl border border-border p-8 shadow-sm space-y-6">
                <div className="flex items-center gap-3 mb-2">
                  <Upload className="w-5 h-5 text-primary" />
                  <h2 className="text-lg font-display font-semibold text-foreground">Voice Sample</h2>
                </div>
                <p className="text-sm text-muted-foreground">Upload a family member's voice sample for voice cloning. This helps Memo sound familiar and comforting.</p>
                <div
                  className="border-2 border-dashed border-border rounded-xl p-10 text-center hover:border-primary/40 transition-colors cursor-pointer"
                  onDragOver={e => e.preventDefault()}
                  onDrop={e => { e.preventDefault(); setFileName(e.dataTransfer.files?.[0]?.name || ""); }}
                  onClick={() => {/* file input would go here */}}
                >
                  <Upload className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                  {fileName ? (
                    <p className="text-sm font-medium text-foreground">{fileName}</p>
                  ) : (
                    <>
                      <p className="text-sm font-medium text-foreground">Drag and drop an .mp3 file here</p>
                      <p className="text-xs text-muted-foreground mt-1">or click to browse</p>
                    </>
                  )}
                </div>
              </div>
            )}

            {currentStep === 2 && (
              <div className="bg-card rounded-xl border border-border p-8 shadow-sm space-y-6">
                <div className="flex items-center gap-3 mb-2">
                  <Users className="w-5 h-5 text-primary" />
                  <h2 className="text-lg font-display font-semibold text-foreground">Family Members to Notify</h2>
                </div>
                <div className="space-y-4">
                  {familyMembers.map((member, i) => (
                    <div key={i} className="border border-border rounded-lg p-4 relative">
                      {familyMembers.length > 1 && (
                        <button onClick={() => removeFamilyMember(i)} className="absolute top-3 right-3 text-muted-foreground hover:text-foreground">
                          <X className="w-4 h-4" />
                        </button>
                      )}
                      <div className="grid grid-cols-3 gap-3">
                        <div>
                          <label className="text-xs font-medium text-muted-foreground mb-1 block">Name</label>
                          <input
                            type="text"
                            value={member.name}
                            onChange={e => updateFamilyMember(i, "name", e.target.value)}
                            placeholder="John Wilson"
                            className="w-full px-3 py-2 rounded-lg border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                          />
                        </div>
                        <div>
                          <label className="text-xs font-medium text-muted-foreground mb-1 block">Phone</label>
                          <input
                            type="tel"
                            value={member.phone}
                            onChange={e => updateFamilyMember(i, "phone", e.target.value)}
                            placeholder="+1 (555) 000-0000"
                            className="w-full px-3 py-2 rounded-lg border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                          />
                        </div>
                        <div>
                          <label className="text-xs font-medium text-muted-foreground mb-1 block">Relationship</label>
                          <input
                            type="text"
                            value={member.relationship}
                            onChange={e => updateFamilyMember(i, "relationship", e.target.value)}
                            placeholder="Son"
                            className="w-full px-3 py-2 rounded-lg border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <button onClick={addFamilyMember} className="text-sm text-primary font-medium hover:underline">
                  + Add another family member
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
            className="px-5 py-2.5 text-sm font-medium text-muted-foreground hover:text-foreground disabled:opacity-0 transition-all"
          >
            Back
          </button>
          <button
            onClick={() => currentStep < 2 ? setCurrentStep(prev => prev + 1) : null}
            className="flex items-center gap-2 px-6 py-2.5 bg-primary text-primary-foreground text-sm font-medium rounded-lg hover:opacity-90 transition-opacity"
          >
            {currentStep === 2 ? "Complete Setup" : "Continue"}
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </MemoLayout>
  );
};

export default Onboarding;
