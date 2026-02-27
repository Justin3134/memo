const API = (import.meta as any).env?.VITE_BACKEND_URL ?? "http://localhost:8000";

export type MemoPatient = {
  _id: string;
  name: string;
  phoneNumber: string;
  familyUserId: string;
  memoTime: string;
  timezone: string;
  consentGiven: boolean;
  interests?: string[];
  knownPeople?: { name: string; relationship: string }[];
  healthContext?: string;
  voiceId?: string;
  emergencyContact?: string;
  emergencyContactName?: string;
  lastCalledAt?: number;
  baseline?: {
    speechRate: number;
    pauseFrequency: number;
    responseLatency: number;
    cognitiveScore: number;
    emotionalScore: number;
    motorScore: number;
    callCount: number;
    calculatedAt: number;
  };
};

export type MemoCall = {
  _id: string;
  patientId: string;
  vapiCallId: string;
  startedAt: number;
  endedAt?: number;
  duration?: number;
  status: string;
  transcript?: string;
  summary?: string;
  speechRate?: number;
  pauseFrequency?: number;
  responseLatency?: number;
  cognitiveScore?: number;
  emotionalScore?: number;
  motorScore?: number;
  healthMentions?: string[];
  conversationSignals?: Array<{ quote: string; signal: string; explanation: string }>;
  anomalyDetected?: boolean;
  videoGuidanceTopic?: string;
  recordingUrl?: string;
  acousticSource?: string;
  rekaAgrees?: boolean;
  rekaConfidence?: string;
  rekaCognitiveScore?: number;
  rekaReasoning?: string;
  sensoContextUsed?: boolean;
};

export type MemoMemory = {
  _id: string;
  patientId: string;
  callId: string;
  timestamp: number;
  category: string;
  content: string;
  entities: string[];
  sentiment: string;
};

export type EvidenceMetrics = {
  speechRate?: number;
  pauseFrequency?: number;
  longPauses?: number;
  dominantEmotion?: string;
  emotionalScore?: number;
  fluencyScore?: number;
  hesitationEvents?: number;
  wordFindingDelays?: number;
  vocalTremor?: string;
  engagementLevel?: number;
  fillerCount?: number;
  emotionBreakdown?: Record<string, number>;
  source?: string;
};

export type ResearchItem = {
  title: string;
  url: string;
  source: string;
  excerpt: string;
  markers?: string[];
};

export type MemoAlert = {
  _id: string;
  patientId: string;
  callId: string;
  timestamp: number;
  severity: string;
  signalType: string;
  description: string;
  currentValue: number;
  baselineValue: number;
  reviewed: boolean;
  videoUrl?: string;
  recommendedAction?: string;
  evidenceQuotes?: string[];
  evidenceMetrics?: EvidenceMetrics;
  researchItems?: ResearchItem[];
  rekaAgrees?: boolean;
  rekaConfidence?: string;
  rekaReasoning?: string;
};

const ACTIVE_PATIENT_KEY = "memoActivePatientId";
const FAMILY_KEY = "memoFamilyUserId";

export const getActivePatientId = (): string | null => {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(ACTIVE_PATIENT_KEY);
};

export const setActivePatientId = (id: string) => {
  if (typeof window !== "undefined") localStorage.setItem(ACTIVE_PATIENT_KEY, id);
};

export const clearActivePatientId = () => {
  if (typeof window !== "undefined") localStorage.removeItem(ACTIVE_PATIENT_KEY);
};

export const getDefaultFamilyId = () => {
  if (typeof window === "undefined") return "family-default";
  let existing = localStorage.getItem(FAMILY_KEY);
  if (!existing) {
    existing = `family-${Math.random().toString(36).slice(2, 10)}`;
    localStorage.setItem(FAMILY_KEY, existing);
  }
  return existing;
};

export async function getActiveFamilyId() {
  return getDefaultFamilyId();
}

export async function upsertPatientFromOnboarding(args: {
  name: string;
  phone: string;
  callTime: string;
  timezone: string;
  familyMembers: { name: string; phone: string; relationship: string }[];
}) {
  const familyUserId = getDefaultFamilyId();
  const knownPeople = args.familyMembers
    .filter((m) => m.name.trim() && m.relationship.trim())
    .map((m) => ({ name: m.name.trim(), relationship: m.relationship.trim() }));
  const firstFamilyPhone = args.familyMembers.find((m) => m.phone.trim())?.phone.trim();

  const res = await fetch(`${API}/api/patients`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: args.name.trim() || "New Patient",
      phoneNumber: args.phone.trim(),
      familyUserId,
      memoTime: args.callTime,
      timezone: args.timezone || "America/Chicago",
      consentGiven: true,
      knownPeople,
      emergencyContact: firstFamilyPhone,
    }),
  });

  if (!res.ok) throw new Error("Failed to create patient");
  const data = await res.json();
  return data._id as string;
}

export async function triggerCallNow(args: { phone: string; name?: string; patientId?: string }) {
  let response: Response;
  try {
    response = await fetch(`${API}/call-now`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        phoneNumber: args.phone.trim(),
        name: args.name?.trim() || "Patient",
        patientId: args.patientId,
      }),
    });
  } catch {
    throw new Error(`Cannot reach backend at ${API}/call-now. Make sure the server is running.`);
  }

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || "Failed to trigger immediate call.");
  }
  return await response.json();
}

export async function fetchVapiCall(callId: string, patientId?: string): Promise<any> {
  const params = patientId ? `?patient_id=${patientId}` : "";
  const res = await fetch(`${API}/vapi/fetch-call/${callId}${params}`, { method: "POST" });
  if (!res.ok) {
    const msg = await res.text();
    throw new Error(msg || "Failed to fetch VAPI call");
  }
  return await res.json();
}

export async function listVapiCalls(limit = 10): Promise<any[]> {
  const res = await fetch(`${API}/vapi/calls?limit=${limit}`);
  if (!res.ok) return [];
  return await res.json();
}

export async function patchPatient(patientId: string, updates: Record<string, any>) {
  const res = await fetch(`${API}/api/patients/${patientId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(updates),
  });
  if (!res.ok) throw new Error("Failed to update patient");
  return await res.json();
}

export async function deletePatientApi(patientId: string) {
  const res = await fetch(`${API}/api/patients/${patientId}`, { method: "DELETE" });
  if (!res.ok) throw new Error("Failed to delete patient");
  return await res.json();
}

export async function patchAlert(alertId: string, updates: Record<string, any>) {
  const res = await fetch(`${API}/api/alerts/${alertId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(updates),
  });
  if (!res.ok) throw new Error("Failed to update alert");
  return await res.json();
}
