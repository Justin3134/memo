import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const insert = mutation({
  args: {
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
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("alerts", {
      patientId: args.patientId,
      callId: args.callId,
      timestamp: args.timestamp,
      severity: args.severity,
      signalType: args.signalType,
      description: args.description,
      currentValue: args.currentValue,
      baselineValue: args.baselineValue,
      reviewed: args.reviewed,
      videoUrl: args.videoUrl,
      recommendedAction: args.recommendedAction,
    });
  },
});

export const getRecentForPatient = query({
  args: {
    patientId: v.id("patients"),
    limit: v.number(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("alerts")
      .withIndex("by_patient", (q) => q.eq("patientId", args.patientId))
      .order("desc")
      .take(Math.max(1, Math.min(args.limit, 100)));
  },
});
