import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const insert = mutation({
  args: {
    patientId: v.id("patients"),
    callId: v.id("calls"),
    timestamp: v.number(),
    category: v.string(),
    content: v.string(),
    entities: v.array(v.string()),
    sentiment: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("memories", {
      patientId: args.patientId,
      callId: args.callId,
      timestamp: args.timestamp,
      category: args.category,
      content: args.content,
      entities: args.entities,
      sentiment: args.sentiment,
    });
  },
});

export const getRecent = query({
  args: {
    patientId: v.id("patients"),
    limit: v.number(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("memories")
      .withIndex("by_patient", (q) => q.eq("patientId", args.patientId))
      .order("desc")
      .take(args.limit);
  },
});

export const getAllForPatient = query({
  args: { patientId: v.id("patients") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("memories")
      .withIndex("by_patient", (q) => q.eq("patientId", args.patientId))
      .collect();
  },
});
