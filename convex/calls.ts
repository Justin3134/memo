import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const updateAfterAnalysis = mutation({
  args: {
    callId: v.string(),
    patientId: v.id("patients"),
    duration: v.optional(v.number()),
    cognitiveScore: v.optional(v.number()),
    emotionalScore: v.optional(v.number()),
    motorScore: v.optional(v.number()),
    transcript: v.optional(v.string()),
    summary: v.optional(v.string()),
    healthMentions: v.optional(v.array(v.string())),
    anomalyDetected: v.optional(v.boolean()),
    videoGuidanceTopic: v.optional(v.string()),
    speechRate: v.optional(v.number()),
    pauseFrequency: v.optional(v.number()),
    responseLatency: v.optional(v.number()),
    status: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("calls")
      .withIndex("by_vapi_call", (q) => q.eq("vapiCallId", args.callId))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        patientId: args.patientId,
        duration: args.duration,
        cognitiveScore: args.cognitiveScore,
        emotionalScore: args.emotionalScore,
        motorScore: args.motorScore,
        transcript: args.transcript,
        summary: args.summary,
        healthMentions: args.healthMentions,
        anomalyDetected: args.anomalyDetected,
        videoGuidanceTopic: args.videoGuidanceTopic,
        speechRate: args.speechRate,
        pauseFrequency: args.pauseFrequency,
        responseLatency: args.responseLatency,
        status: args.status ?? existing.status,
      });

      await ctx.db.patch(existing.patientId, { lastCalledAt: Date.now() });
      return existing._id;
    }

    const callId = await ctx.db.insert("calls", {
      patientId: args.patientId,
      vapiCallId: args.callId,
      startedAt: Date.now(),
      endedAt: Date.now(),
      status: args.status ?? "completed",
      duration: args.duration,
      transcript: args.transcript,
      summary: args.summary,
      speechRate: args.speechRate,
      pauseFrequency: args.pauseFrequency,
      responseLatency: args.responseLatency,
      cognitiveScore: args.cognitiveScore,
      emotionalScore: args.emotionalScore,
      motorScore: args.motorScore,
      healthMentions: args.healthMentions,
      anomalyDetected: args.anomalyDetected,
      videoGuidanceTopic: args.videoGuidanceTopic,
    });

    await ctx.db.patch(args.patientId, { lastCalledAt: Date.now() });
    return callId;
  },
});

export const createInitialCall = mutation({
  args: {
    patientId: v.id("patients"),
    vapiCallId: v.string(),
    startedAt: v.number(),
    status: v.string(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("calls")
      .withIndex("by_vapi_call", (q) => q.eq("vapiCallId", args.vapiCallId))
      .first();

    if (existing) return existing._id;

    const id = await ctx.db.insert("calls", {
      patientId: args.patientId,
      vapiCallId: args.vapiCallId,
      startedAt: args.startedAt,
      status: args.status,
      duration: undefined,
      endedAt: undefined,
      transcript: undefined,
      summary: undefined,
      speechRate: undefined,
      pauseFrequency: undefined,
      responseLatency: undefined,
      cognitiveScore: undefined,
      emotionalScore: undefined,
      motorScore: undefined,
      healthMentions: undefined,
      anomalyDetected: undefined,
      videoGuidanceTopic: undefined,
    });

    await ctx.db.patch(args.patientId, { lastCalledAt: args.startedAt });
    return id;
  },
});

export const listForPatient = query({
  args: {
    patientId: v.id("patients"),
    limit: v.number(),
  },
  handler: async (ctx, args) => {
    const limit = Math.max(1, Math.min(args.limit, 120));
    return await ctx.db
      .query("calls")
      .withIndex("by_patient", (q) => q.eq("patientId", args.patientId))
      .order("desc")
      .take(limit);
  },
});

export const getLatestForPatient = query({
  args: { patientId: v.id("patients") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("calls")
      .withIndex("by_patient", (q) => q.eq("patientId", args.patientId))
      .order("desc")
      .first();
  },
});
