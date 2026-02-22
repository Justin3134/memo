import { ConvexHttpClient } from "convex/browser";

export const convexDeploymentUrl =
  import.meta.env.VITE_CONVEX_URL ??
  "https://friendly-ostrich-184.convex.cloud";

export const convexClient = new ConvexHttpClient(convexDeploymentUrl);

export type ConvexDocumentId = string;

export type ConvexPatient = {
  _id: ConvexDocumentId;
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

export type ConvexCall = {
  _id: ConvexDocumentId;
  patientId: ConvexDocumentId;
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
  conversationSignals?: Array<{
    quote: string;
    signal: string;
    explanation: string;
  }>;
  anomalyDetected?: boolean;
  videoGuidanceTopic?: string;
};

export type ConvexMemory = {
  _id: ConvexDocumentId;
  patientId: ConvexDocumentId;
  callId: ConvexDocumentId;
  timestamp: number;
  category: string;
  content: string;
  entities: string[];
  sentiment: string;
};

export type ConvexAlert = {
  _id: ConvexDocumentId;
  patientId: ConvexDocumentId;
  callId: ConvexDocumentId;
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
};
