import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const insert = mutation({
  args: {
    patientId: v.id("patients"),
    topic: v.string(),
    status: v.string(),
    videoUrl: v.optional(v.string()),
    triggeredBy: v.string(),
    generatedAt: v.number(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("healthVideos", {
      patientId: args.patientId,
      topic: args.topic,
      status: args.status,
      videoUrl: args.videoUrl,
      triggeredBy: args.triggeredBy,
      generatedAt: args.generatedAt,
    });
  },
});

export const updateStatus = mutation({
  args: {
    videoId: v.id("healthVideos"),
    status: v.string(),
    videoUrl: v.optional(v.string()),
    errorMessage: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const patch: Record<string, unknown> = { status: args.status };
    if (args.videoUrl !== undefined) patch.videoUrl = args.videoUrl;
    if (args.errorMessage !== undefined) patch.errorMessage = args.errorMessage;
    await ctx.db.patch(args.videoId, patch);
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
