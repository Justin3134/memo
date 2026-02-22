import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  patients: defineTable({
    name: v.string(),
    phoneNumber: v.string(),
    familyUserId: v.string(),
    memoTime: v.string(),
    timezone: v.string(),
    photoUrl: v.optional(v.string()),
    consentGiven: v.boolean(),
    interests: v.optional(v.array(v.string())),
    knownPeople: v.optional(
      v.array(
        v.object({
          name: v.string(),
          relationship: v.string(),
        })
      )
    ),
    healthContext: v.optional(v.string()),
    voiceId: v.optional(v.string()),
    emergencyContact: v.optional(v.string()),
    emergencyContactName: v.optional(v.string()),
    lastCalledAt: v.optional(v.number()),
    baseline: v.optional(
      v.object({
        speechRate: v.number(),
        pauseFrequency: v.number(),
        responseLatency: v.number(),
        cognitiveScore: v.number(),
        emotionalScore: v.number(),
        motorScore: v.number(),
        callCount: v.number(),
        calculatedAt: v.number(),
      })
    ),
  })
    .index("by_phone", ["phoneNumber"])
    .index("by_family_user", ["familyUserId"]),

  calls: defineTable({
    patientId: v.id("patients"),
    vapiCallId: v.string(),
    startedAt: v.number(),
    endedAt: v.optional(v.number()),
    duration: v.optional(v.number()),
    status: v.string(),
    transcript: v.optional(v.string()),
    summary: v.optional(v.string()),
    speechRate: v.optional(v.number()),
    pauseFrequency: v.optional(v.number()),
    responseLatency: v.optional(v.number()),
    cognitiveScore: v.optional(v.number()),
    emotionalScore: v.optional(v.number()),
    motorScore: v.optional(v.number()),
    healthMentions: v.optional(v.array(v.string())),
    conversationSignals: v.optional(v.array(v.object({
      quote: v.string(),
      signal: v.string(),
      explanation: v.string(),
    }))),
    anomalyDetected: v.optional(v.boolean()),
    videoGuidanceTopic: v.optional(v.string()),
  }).index("by_patient", ["patientId"]).index("by_vapi_call", ["vapiCallId"]),

  memories: defineTable({
    patientId: v.id("patients"),
    callId: v.id("calls"),
    timestamp: v.number(),
    category: v.string(),
    content: v.string(),
    entities: v.array(v.string()),
    sentiment: v.string(),
  }).index("by_patient", ["patientId"]),

  alerts: defineTable({
    patientId: v.id("patients"),
    callId: v.id("calls"),
    timestamp: v.number(),
    severity: v.string(),
    signalType: v.string(),
    description: v.string(),
    currentValue: v.number(),
    baselineValue: v.number(),
    reviewed: v.boolean(),
    videoUrl: v.optional(v.string()),
    recommendedAction: v.optional(v.string()),
    evidenceQuotes: v.optional(v.array(v.string())),
  }).index("by_patient", ["patientId"]),

  healthVideos: defineTable({
    patientId: v.id("patients"),
    topic: v.string(),
    status: v.string(), // "pending" | "generating" | "completed" | "failed"
    videoUrl: v.optional(v.string()),
    errorMessage: v.optional(v.string()),
    triggeredBy: v.string(),
    generatedAt: v.number(),
    taskId: v.optional(v.string()), // MiniMax video generation task_id for scheduler polling
  }).index("by_patient", ["patientId"]),
});
