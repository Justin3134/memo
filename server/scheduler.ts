import cron from "node-cron";
import dotenv from "dotenv";
import { ConvexHttpClient } from "convex/browser";
import { anyApi } from "convex/server";

import { buildSystemPrompt } from "./systemPrompt";

dotenv.config();

const convex = new ConvexHttpClient(process.env.CONVEX_URL ?? "");
const normalizeToE164 = (rawPhone: string) => {
  const digits = String(rawPhone ?? "").replace(/\D/g, "");
  if (String(rawPhone ?? "").trim().startsWith("+")) {
    return `+${digits}`;
  }
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  return null;
};

cron.schedule("*/1 * * * *", async () => {
  try {
    const patients = await convex.query(anyApi.patients.getDueForCall, {
      currentTime: new Date().toISOString(),
    });

    for (const patient of patients) {
      const memories = await convex.query(anyApi.memories.getRecent, {
        patientId: patient._id,
        limit: 10,
      });

      const recentTopics = memories
        .map((memory: any) => memory.content)
        .join(". ");

      const knownPeople = patient.knownPeople
        ?.map((person: any) => `${person.name} is her ${person.relationship}`)
        .join(", ");

      await triggerVapiCall(
        patient,
        buildSystemPrompt(patient, recentTopics, knownPeople)
      );
    }
  } catch (error) {
    console.error("Scheduler error:", error);
  }
});

async function triggerVapiCall(patient: any, systemPrompt: string) {
  const e164Number = normalizeToE164(patient.phoneNumber);
  if (!e164Number) {
    throw new Error(`Invalid patient phone format for ${patient._id}`);
  }

  const response = await fetch("https://api.vapi.ai/call", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.VAPI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      phoneNumberId: process.env.VAPI_PHONE_NUMBER_ID,
      customer: { number: e164Number },
      assistant: {
        model: {
          provider: "openai",
          model: "gpt-4o",
          messages: [{ role: "system", content: systemPrompt }],
        },
        voice: {
          provider: "11labs",
          voiceId: patient.voiceId ?? process.env.DEFAULT_VOICE_ID ?? "cgSgspJ2msm6clMCkdW9",
        },
        transcriber: {
          provider: "deepgram",
          language: "en",
        },
        endCallMessage: "Take care, talk soon.",
        silenceTimeoutSeconds: 30,
        maxDurationSeconds: 600,
      },
      metadata: { patientId: patient._id },
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Failed to trigger Vapi call for patient ${patient._id}: ${response.status} ${errorBody}`);
  }

  const payload = await response.json();
  const vapiCallId = payload?.id ?? payload?.call?.id;
  if (!vapiCallId) return;

  await convex.mutation(anyApi.calls.createInitialCall, {
    patientId: patient._id,
    vapiCallId,
    startedAt: Date.now(),
    status: "initiated",
  });
}

export {};
