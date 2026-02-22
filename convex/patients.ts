import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

const sanitizePhone = (phoneNumber: string) => phoneNumber.replace(/[^\d+]/g, "");

export const create = mutation({
  args: {
    name: v.string(),
    phoneNumber: v.string(),
    familyUserId: v.string(),
    memoTime: v.string(),
    timezone: v.string(),
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
    consentGiven: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const normalizedPhone = sanitizePhone(args.phoneNumber);

    const existing = await ctx.db
      .query("patients")
      .withIndex("by_phone", (q) => q.eq("phoneNumber", normalizedPhone))
      .first();
    if (existing) {
      await ctx.db.patch(existing._id, {
        name: args.name,
        memoTime: args.memoTime,
        timezone: args.timezone,
        consentGiven: args.consentGiven ?? existing.consentGiven,
        knownPeople: args.knownPeople ?? existing.knownPeople,
        interests: args.interests ?? existing.interests,
        emergencyContact: args.emergencyContact ?? existing.emergencyContact,
      });
      return existing._id;
    }

    return await ctx.db.insert("patients", {
      name: args.name,
      phoneNumber: normalizedPhone,
      familyUserId: args.familyUserId,
      memoTime: args.memoTime,
      timezone: args.timezone,
      consentGiven: args.consentGiven ?? true,
      interests: args.interests,
      knownPeople: args.knownPeople,
      healthContext: args.healthContext,
      voiceId: args.voiceId,
      emergencyContact: args.emergencyContact,
    });
  },
});

export const getById = query({
  args: { patientId: v.id("patients") },
  handler: async (ctx, args) => {
    const patient = await ctx.db.get(args.patientId);
    if (!patient) {
      throw new Error("Patient not found");
    }
    return patient;
  },
});

export const listForFamily = query({
  args: { familyUserId: v.string() },
  handler: async (ctx, args) => {
    const patients = await ctx.db
      .query("patients")
      .withIndex("by_family_user", (q) => q.eq("familyUserId", args.familyUserId))
      .collect();

    return patients.sort((a, b) => a.name.localeCompare(b.name));
  },
});

export const getAll = query({
  handler: async (ctx) => {
    return await ctx.db.query("patients").collect();
  },
});

export const getDueForCall = query({
  args: { currentTime: v.string() },
  handler: async (ctx, args) => {
    const now = new Date(args.currentTime);
    const patients = await ctx.db.query("patients").collect();

    const duePatients = [];

    for (const patient of patients) {
      if (!patient.consentGiven) continue;

      const memoTimeParts = patient.memoTime.split(":").map(Number);
      if (memoTimeParts.length !== 2) continue;
      const [memoHour, memoMinute] = memoTimeParts;

      const patientNow = new Intl.DateTimeFormat("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        hourCycle: "h23",
        timeZone: patient.timezone || "UTC",
      }).formatToParts(now);
      const timezoneHour = Number(
        patientNow.find((part) => part.type === "hour")?.value ?? "0"
      );
      const timezoneMinute = Number(
        patientNow.find((part) => part.type === "minute")?.value ?? "0"
      );

      const isDueByTime = timezoneHour === memoHour && timezoneMinute === memoMinute;
      if (!isDueByTime) continue;

      const latestCall = await ctx.db
        .query("calls")
        .withIndex("by_patient", (q) => q.eq("patientId", patient._id))
        .order("desc")
        .first();

      if (latestCall?.startedAt && now.getTime() - latestCall.startedAt < 23 * 60 * 60 * 1000) {
        continue;
      }

      duePatients.push(patient);
    }

    return duePatients;
  },
});

export const recalculateBaseline = mutation({
  args: { patientId: v.id("patients") },
  handler: async (ctx, args) => {
    const calls = await ctx.db
      .query("calls")
      .withIndex("by_patient", (q) => q.eq("patientId", args.patientId))
      .filter((q) => q.neq(q.field("cognitiveScore"), undefined))
      .order("desc")
      .take(5);

    if (calls.length < 1) {
      return;
    }

    const filtered = calls.filter(
      (call) =>
        call.cognitiveScore !== undefined &&
        call.emotionalScore !== undefined &&
        call.motorScore !== undefined
    );

    if (filtered.length === 0) return;

    const baseline = {
      speechRate:
        filtered.reduce((sum, call) => sum + (call.speechRate ?? 0), 0) /
        filtered.length,
      pauseFrequency:
        filtered.reduce((sum, call) => sum + (call.pauseFrequency ?? 0), 0) /
        filtered.length,
      responseLatency:
        filtered.reduce((sum, call) => sum + (call.responseLatency ?? 0), 0) /
        filtered.length,
      cognitiveScore:
        filtered.reduce((sum, call) => sum + call.cognitiveScore, 0) /
        filtered.length,
      emotionalScore:
        filtered.reduce((sum, call) => sum + call.emotionalScore, 0) /
        filtered.length,
      motorScore:
        filtered.reduce((sum, call) => sum + call.motorScore, 0) /
        filtered.length,
      callCount: filtered.length,
      calculatedAt: Date.now(),
    };

    await ctx.db.patch(args.patientId, { baseline });
  },
});

export const deletePatient = mutation({
  args: { patientId: v.id("patients") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.patientId);
  },
});

export const giveConsent = mutation({
  args: { phoneNumber: v.string() },
  handler: async (ctx, args) => {
    const normalized = sanitizePhone(args.phoneNumber);
    const patient = await ctx.db
      .query("patients")
      .withIndex("by_phone", (q) => q.eq("phoneNumber", normalized))
      .first();

    if (!patient) {
      return { success: false, message: "Patient not found." };
    }

    if (!patient.consentGiven) {
      await ctx.db.patch(patient._id, { consentGiven: true });
    }

    return { success: true, patientId: patient._id };
  },
});
