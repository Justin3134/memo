import { mutation } from "./_generated/server";
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
