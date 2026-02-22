import express from "express";
import dotenv from "dotenv";
import { ConvexHttpClient } from "convex/browser";
import { anyApi } from "convex/server";
import { runPostCallPipeline } from "./pipeline";

dotenv.config();

const convex = new ConvexHttpClient(process.env.CONVEX_URL ?? "");
const app = express();
app.use(express.json());

app.post("/vapi-webhook", async (req, res) => {
  try {
    const event = req.body;
    const messageType = event.message?.type;

    if (messageType !== "end-of-call-report") {
      return res.sendStatus(200);
    }

    const call = event.message.call ?? {};
    const duration = Number(event.message.duration ?? call.duration ?? 0);

    // Build transcript from whatever Vapi sends
    const transcriptSource = event.message.transcript;
    const rawTranscript =
      typeof transcriptSource === "string"
        ? transcriptSource
        : Array.isArray(transcriptSource)
          ? transcriptSource
              .map((line: any) => line?.text || line?.transcript || line?.content || "")
              .filter(Boolean)
              .join(" ")
          : typeof event.message?.analysis?.transcript === "string"
            ? event.message.analysis.transcript
            : JSON.stringify(event.message?.analysis ?? {});

    const callId = call.id ?? `call-${Date.now()}`;

    // Resolve patientId — use metadata if present, otherwise fall back to first patient
    let patientId: string | null = call.metadata?.patientId ?? null;

    if (!patientId) {
      try {
        const all = await convex.query(anyApi.patients.getAll);
        if (all && all.length > 0) {
          patientId = all[0]._id;
        }
      } catch (e) {
        console.error("Could not resolve patient from Convex:", e);
      }
    }

    if (!patientId) {
      console.warn("No patient found in database — register one at /onboarding first");
      return res.sendStatus(200);
    }

    const transcript = rawTranscript || "No transcript available for this call.";

    console.log(`Call ended [${callId}] — patient ${patientId} — ${duration}s — running pipeline`);

    // Fire pipeline async so Vapi gets instant 200
    runPostCallPipeline(patientId, callId, transcript, duration).catch((err) => {
      console.error("Pipeline error:", err);
    });

    return res.sendStatus(200);
  } catch (error) {
    console.error("Webhook error:", error);
    return res.sendStatus(500);
  }
});

// Health check
app.get("/", (_req, res) => res.json({ status: "ok", service: "memo-webhook" }));

const port = Number(process.env.WEBHOOK_PORT ?? 3001);
app.listen(port, () => {
  console.log(`Webhook server running on port ${port}`);
});

export { app };
