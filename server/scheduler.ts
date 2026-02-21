import cron from "node-cron";
import dotenv from "dotenv";
import { ConvexHttpClient } from "convex/browser";

import { buildSystemPrompt } from "./systemPrompt";

dotenv.config();

const convex = new ConvexHttpClient(process.env.CONVEX_DEPLOYMENT ?? "");

cron.schedule("*/1 * * * *", async () => {
  try {
    const patients = await convex.query("patients:getDueForCall", {
      currentTime: new Date().toISOString(),
    });

    for (const patient of patients) {
      const memories = await convex.query("memories:getRecent", {
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
  const response = await fetch("https://api.vapi.ai/call", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.VAPI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      phoneNumberId: process.env.VAPI_PHONE_NUMBER_ID,
      customer: { number: patient.phoneNumber },
      assistant: {
        model: {
          provider: "openai",
          model: "gpt-4o",
          systemPrompt,
        },
        voice: {
          provider: "elevenlabs",
          voiceId: patient.voiceId ?? process.env.DEFAULT_VOICE_ID,
        },
        transcriber: {
          provider: "deepgram",
          language: "en",
        },
      },
      metadata: { patientId: patient._id },
    }),
  });

  if (!response.ok) {
    throw new Error(`Failed to trigger Vapi call for patient ${patient._id}`);
  }

  const payload = await response.json();
  const vapiCallId = payload?.id ?? payload?.call?.id;
  if (!vapiCallId) return;

  await convex.mutation("calls:createInitialCall", {
    patientId: patient._id,
    vapiCallId,
    startedAt: Date.now(),
    status: "initiated",
  });
}

export {};
