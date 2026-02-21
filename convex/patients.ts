import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

const sanitizePhone = (phoneNumber: string) => phoneNumber.replace(/[^\d+]/g, "");

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
