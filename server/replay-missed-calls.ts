/**
 * One-shot script: fetches recent Vapi calls that were never processed
 * (because the webhook URL wasn't configured) and runs the full analysis
 * pipeline on each one.
 *
 * Usage:  npx tsx server/replay-missed-calls.ts
 */
import dotenv from "dotenv";
import { ConvexHttpClient } from "convex/browser";
import { anyApi } from "convex/server";
import { runPostCallPipeline } from "./pipeline";

dotenv.config();

const convex = new ConvexHttpClient(process.env.CONVEX_URL ?? "");

async function fetchVapiCalls(limit = 10) {
  const res = await fetch(`https://api.vapi.ai/call?limit=${limit}`, {
    headers: { Authorization: `Bearer ${process.env.VAPI_API_KEY}` },
  });
  if (!res.ok) throw new Error(`Vapi error ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return Array.isArray(data) ? data : (data.results ?? []);
}

async function getKnownVapiCallIds(): Promise<Set<string>> {
  try {
    const calls: any[] = await convex.query(anyApi.calls.listForPatient, {
      patientId: await getActivePatientId(),
    });
    return new Set(calls.map((c) => c.vapiCallId).filter(Boolean));
  } catch {
    return new Set();
  }
}

async function getActivePatientId(): Promise<string> {
  const all: any[] = await convex.query(anyApi.patients.getAll);
  if (!all || all.length === 0) throw new Error("No patients in Convex");
  return all[0]._id;
}

function buildTranscript(call: any): string {
  const art = call.artifact ?? {};
  const src = art.transcript;
  if (typeof src === "string" && src.trim()) return src;
  const msgs: any[] = art.messages ?? [];
  if (msgs.length > 0) {
    return msgs
      .map((m: any) => {
        const role = m.role === "assistant" ? "AI" : "Patient";
        const text = m.message ?? m.text ?? m.content ?? "";
        return text ? `${role}: ${text}` : "";
      })
      .filter(Boolean)
      .join("\n");
  }
  return "No transcript available.";
}

async function main() {
  console.log("Fetching recent Vapi calls…");
  const vapiCalls = await fetchVapiCalls(10);
  const knownIds = await getKnownVapiCallIds();
  const patientId = await getActivePatientId();

  console.log(
    `Found ${vapiCalls.length} Vapi calls. Already processed: ${knownIds.size} known IDs`
  );

  const toProcess = vapiCalls.filter(
    (c: any) =>
      c.endedReason === "customer-ended-call" &&
      (c.artifact?.transcript || (c.artifact?.messages ?? []).length > 0)
  );

  console.log(`Calls with transcripts: ${toProcess.length}`);

  for (const call of toProcess) {
    const callId: string = call.id;
    if (knownIds.has(callId)) {
      console.log(`  [SKIP] ${callId} — already in database`);
      continue;
    }

    const transcript = buildTranscript(call);
    const duration = Number(call.duration ?? 0);

    console.log(
      `\n  [PROCESS] ${callId} — ${transcript.split("\n").length} transcript lines — ${duration}s`
    );

    try {
      await runPostCallPipeline(patientId, callId, transcript, duration);
      console.log(`  [DONE] ${callId}`);
    } catch (err) {
      console.error(`  [ERROR] ${callId}:`, err);
    }

    // Small delay between calls to avoid hammering the AI API
    await new Promise((r) => setTimeout(r, 2000));
  }

  console.log("\nReplay complete.");
}

main().catch((e) => {
  console.error("Fatal:", e);
  process.exit(1);
});
