import { MemoLayout } from "@/components/memo/MemoLayout";
import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { User, Upload, Users, Check, ChevronRight, Phone, Clock, X, CheckCircle2 } from "lucide-react";
import { triggerCallNow, upsertPatientFromOnboarding } from "@/lib/memoBackend";

const steps = ["Patient", "Voice", "Family"];
const getCurrentLocalTime = () => {
  const now = new Date();
  const hours = String(now.getHours()).padStart(2, "0");
  const minutes = String(now.getMinutes()).padStart(2, "0");
  return `${hours}:${minutes}`;
};

const Onboarding = () => {
  const [currentStep, setCurrentStep] = useState(0);
  const [completed, setCompleted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCallingNow, setIsCallingNow] = useState(false);
  const [elderName, setElderName] = useState("");
  const [elderPhone, setElderPhone] = useState("");
  const [callPreference, setCallPreference] = useState<"scheduled" | "now">("scheduled");
  const [callTime, setCallTime] = useState(getCurrentLocalTime());
  const [fileName, setFileName] = useState("");
  const [familyMembers, setFamilyMembers] = useState([{ name: "", phone: "", relationship: "" }]);
  const [errors, setErrors] = useState({ name: "", phone: "", callTime: "" });
  const [callNowMessage, setCallNowMessage] = useState("");

  const validatePatientFields = () => {
    const nextErrors = { name: "", phone: "", callTime: "" };

    const trimmedName = elderName.trim();
    const trimmedPhone = elderPhone.trim();
    const hasCallTime = /^\d{2}:\d{2}$/.test(callTime);

    if (!trimmedName) {
      nextErrors.name = "Enter the patient name.";
    }

    if (!trimmedPhone || !/^\+?\d[\d\s().-]{6,}$/.test(trimmedPhone)) {
      nextErrors.phone = "Enter a valid phone number.";
    }

    if (!hasCallTime) {
      nextErrors.callTime = "Set a valid call time.";
    }

    setErrors(nextErrors);
    return Object.values(nextErrors).every((error) => !error);
  };

  const normalizePayload = () => {
    return {
      name: elderName.trim(),
      phone: elderPhone.trim(),
      callTime,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "America/Chicago",
      familyMembers: familyMembers.filter(
        (member) => member.name.trim() || member.phone.trim() || member.relationship.trim()
      ),
    };
  };

  const isPatientStepValid =
    elderName.trim().length > 0 &&
    /^\+?\d[\d\s().-]{6,}$/.test(elderPhone.trim()) &&
    /^\d{2}:\d{2}$/.test(callTime);

  const addFamilyMember = () => {
    setFamilyMembers(prev => [...prev, { name: "", phone: "", relationship: "" }]);
  };

  const removeFamilyMember = (index: number) => {
    setFamilyMembers(prev => prev.filter((_, i) => i !== index));
  };

  const updateFamilyMember = (index: number, field: string, value: string) => {
    setFamilyMembers(prev => prev.map((m, i) => i === index ? { ...m, [field]: value } : m));
  };

  const handleComplete = async () => {
    setIsSubmitting(true);
    try {
      if (!validatePatientFields()) return;

      const payload = normalizePayload();
      await upsertPatientFromOnboarding({
        name: payload.name,
        phone: payload.phone,
        callTime: payload.callTime,
        timezone: payload.timezone,
        familyMembers: payload.familyMembers,
      });
      setCompleted(true);
      setErrors({ name: "", phone: "", callTime: "" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCallNow = async () => {
    setCallNowMessage("");
    if (!validatePatientFields()) return;

    setIsCallingNow(true);
    try {
      await triggerCallNow({
        name: elderName,
        phone: elderPhone,
      });
      setCallNowMessage("Calling now. Check your phone.");
    } catch (error) {
      setCallNowMessage(
        error instanceof Error ? error.message : "Unable to trigger call right now."
      );
    } finally {
      setIsCallingNow(false);
    }
  };

  if (completed) {
    return (
      <MemoLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className="text-center max-w-sm"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.15, type: "spring", stiffness: 200, damping: 15 }}
              className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-5"
            >
              <CheckCircle2 className="w-7 h-7 text-primary" />
            </motion.div>
            <motion.h1
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="text-xl font-display text-foreground mb-2"
            >
              Patient registered
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="text-[13px] text-muted-foreground mb-6"
            >
              {elderName || "Your family member"} will receive their first call at {callTime}. You can adjust preferences from the dashboard.
            </motion.p>
            <motion.a
              href="/dashboard"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.55 }}
              className="inline-flex items-center gap-1.5 px-5 py-2 bg-primary text-primary-foreground text-[13px] font-medium rounded-md hover:opacity-90 transition-opacity"
            >
              Go to Dashboard <ChevronRight className="w-3.5 h-3.5" />
            </motion.a>
          </motion.div>
        </div>
      </MemoLayout>
    );
  }

  return (
    <MemoLayout>
      <div className="max-w-lg mx-auto animate-fade-in-up">
        <p className="text-xs text-muted-foreground mb-1">Registration</p>
        <h1 className="text-xl font-display text-foreground mb-6">Add a new patient</h1>

        {/* Steps */}
        <div className="flex items-center gap-0 mb-8">
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

        {/* Content */}
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
                    <input
                      type="text"
                      value={elderName}
                      onChange={e => setElderName(e.target.value)}
                      onBlur={() => validatePatientFields()}
                      placeholder="Margaret Wilson"
                      className="w-full px-3 py-2 rounded-md border border-input bg-background text-foreground text-[13px] focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                    {errors.name && <p className="text-[11px] text-destructive mt-1">{errors.name}</p>}
                  </div>
                  <div>
                    <label className="text-[12px] font-medium text-muted-foreground mb-1 block">Phone</label>
                    <div className="relative">
                      <Phone className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                      <input
                        type="tel"
                        value={elderPhone}
                        onChange={e => setElderPhone(e.target.value)}
                        onBlur={() => validatePatientFields()}
                        placeholder="+1 (555) 000-0000"
                        className="w-full pl-8 pr-3 py-2 rounded-md border border-input bg-background text-foreground text-[13px] focus:outline-none focus:ring-2 focus:ring-ring"
                      />
                    </div>
                    {errors.phone && <p className="text-[11px] text-destructive mt-1">{errors.phone}</p>}
                  </div>
                  <div>
                    <label className="text-[12px] font-medium text-muted-foreground mb-1 block">Preferred Call Time</label>
                    <div className="flex items-center gap-1 mb-2">
                      <button
                        type="button"
                        onClick={() => setCallPreference("scheduled")}
                        className={`px-2 py-1 rounded text-[11px] transition-colors ${
                          callPreference === "scheduled"
                            ? "bg-foreground text-background"
                            : "bg-muted text-muted-foreground"
                        }`}
                      >
                        Scheduled
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setCallPreference("now");
                          setCallTime(getCurrentLocalTime());
                        }}
                        className={`px-2 py-1 rounded text-[11px] transition-colors ${
                          callPreference === "now"
                            ? "bg-foreground text-background"
                            : "bg-muted text-muted-foreground"
                        }`}
                      >
                        Call now
                      </button>
                    </div>
                    <div className="relative">
                      <Clock className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                      <input
                        type="time"
                        value={callTime}
                        onChange={e => setCallTime(e.target.value)}
                        onBlur={() => validatePatientFields()}
                        disabled={callPreference === "now"}
                        className="w-full pl-8 pr-3 py-2 rounded-md border border-input bg-background text-foreground text-[13px] focus:outline-none focus:ring-2 focus:ring-ring"
                      />
                    </div>
                    {errors.callTime && <p className="text-[11px] text-destructive mt-1">{errors.callTime}</p>}
                    {callPreference === "now" && (
                      <p className="text-[11px] text-muted-foreground mt-1">
                        Time is set to now for testing.
                      </p>
                    )}
                    <button
                      type="button"
                      onClick={handleCallNow}
                      disabled={!isPatientStepValid || isCallingNow}
                      className="mt-2 w-full px-3 py-2 rounded-md border border-foreground text-[12px] font-medium text-foreground hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isCallingNow ? "Calling..." : "Call me now"}
                    </button>
                    {callNowMessage ? (
                      <p className="text-[11px] mt-1 text-muted-foreground">{callNowMessage}</p>
                    ) : null}
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
                <button onClick={addFamilyMember} className="text-[12px] text-primary font-medium hover:underline">
                  + Add contact
                </button>
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        {/* Nav */}
        <div className="flex justify-between mt-6">
          <button
            onClick={() => setCurrentStep(prev => prev - 1)}
            disabled={currentStep === 0}
            className="px-4 py-1.5 text-[13px] font-medium text-muted-foreground hover:text-foreground disabled:opacity-0 transition-all"
          >
            Back
          </button>
          <button
            onClick={() => {
              if (currentStep < 2) {
                if (currentStep === 0 && !validatePatientFields()) return;
                setCurrentStep((prev) => prev + 1);
              } else {
                handleComplete();
              }
            }}
            disabled={isSubmitting || (currentStep === 0 && !isPatientStepValid)}
            className="flex items-center gap-1 px-4 py-1.5 bg-primary text-primary-foreground text-[13px] font-medium rounded-md hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? "Saving..." : currentStep === 2 ? "Register Patient" : "Continue"}
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </MemoLayout>
  );
};

export default Onboarding;
