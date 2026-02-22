import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const insert = mutation({
  args: {
    patientId: v.id("patients"),
    topic: v.string(),
    videoUrl: v.string(),
    triggeredBy: v.string(),
    generatedAt: v.number(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("healthVideos", {
      patientId: args.patientId,
      topic: args.topic,
      videoUrl: args.videoUrl,
      triggeredBy: args.triggeredBy,
      generatedAt: args.generatedAt,
    });
  },
});

export const listForPatient = query({
  args: {
    patientId: v.id("patients"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("healthVideos")
      .withIndex("by_patient", (q) => q.eq("patientId", args.patientId))
      .order("desc")
      .take(args.limit ?? 20);
  },
});
