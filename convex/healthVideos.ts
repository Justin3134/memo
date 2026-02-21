import { mutation } from "./_generated/server";
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
