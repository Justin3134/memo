import express from "express";
import dotenv from "dotenv";
import { runPostCallPipeline } from "./pipeline";

dotenv.config();

const app = express();
app.use(express.json());
app.use((_, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  next();
});
app.use((req, res, next) => {
  if (req.method === "OPTIONS") {
    return res.sendStatus(204);
  }
  next();
});

const normalizeToE164 = (rawPhone: string) => {
  const digits = rawPhone.replace(/\D/g, "");
  if (rawPhone.trim().startsWith("+")) {
    return `+${digits}`;
  }
  if (digits.length === 10) {
    return `+1${digits}`;
  }
  if (digits.length === 11 && digits.startsWith("1")) {
    return `+${digits}`;
  }
  return null;
};

app.post("/call-now", async (req, res) => {
  try {
    const phoneNumber = String(req.body?.phoneNumber ?? "").trim();
    const name = String(req.body?.name ?? "Patient").trim();

    if (!phoneNumber) {
      return res.status(400).send("Phone number is required.");
    }

    const e164Phone = normalizeToE164(phoneNumber);
    if (!e164Phone) {
      return res.status(400).send("Phone number must include country code or be a valid 10-digit US number.");
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    const vapiResponse = await fetch("https://api.vapi.ai/call", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.VAPI_API_KEY}`,
        "Content-Type": "application/json",
      },
      signal: controller.signal,
      body: JSON.stringify({
        phoneNumberId: process.env.VAPI_PHONE_NUMBER_ID,
        customer: { number: e164Phone },
        assistant: {
          model: {
            provider: "openai",
            model: "gpt-4o",
            systemPrompt: `You are Memo, a warm daily companion calling ${name}. Keep the tone calm, friendly, and supportive.`,
          },
          voice: {
            provider: "11labs",
            voiceId: process.env.DEFAULT_VOICE_ID,
          },
          transcriber: {
            provider: "deepgram",
            language: "en",
          },
        },
      }),
    });
    clearTimeout(timeout);

    if (!vapiResponse.ok) {
      const details = await vapiResponse.text();
      return res.status(502).send(`Vapi call failed: ${details}`);
    }

    const payload = await vapiResponse.json();
    const callId = payload?.id ?? payload?.call?.id ?? null;
    return res.status(200).json({ success: true, callId });
  } catch (error) {
    console.error("Call-now endpoint error:", error);
    return res.status(500).send("Failed to trigger immediate call.");
  }
});

app.post("/vapi-webhook", async (req, res) => {
  try {
    const event = req.body;
    if (event.message?.type === "end-of-call-report") {
      const { call, duration = 0 } = event.message;
      const transcriptSource = event.message.transcript;
      const rawTranscript =
        typeof transcriptSource === "string"
          ? transcriptSource
          : Array.isArray(transcriptSource)
            ? transcriptSource
                .map((line: any) => line?.text || line?.transcript || "")
                .filter(Boolean)
                .join(" ")
            : typeof event.call?.transcript === "string"
              ? event.call.transcript
              : "";

      const patientId = call.metadata?.patientId;
      const callId = call.id;

      if (!patientId || !callId) {
        console.warn("Missing patientId or callId in webhook payload", {
          callId,
        });
        return res.sendStatus(400);
      }

      // Run pipeline asynchronously so Vapi receives an immediate 200 response.
      runPostCallPipeline(
        patientId,
        callId,
        rawTranscript || JSON.stringify(event.message?.analysis ?? event.message ?? {}),
        Number(duration ?? 0)
      ).catch((error) => {
        console.error("Pipeline error:", error);
      });
    }

    res.sendStatus(200);
  } catch (error) {
    console.error("Webhook error:", error);
    res.sendStatus(500);
  }
});

const port = Number(process.env.WEBHOOK_PORT ?? 3001);
app.listen(port, () => {
  console.log(`Webhook server running on port ${port}`);
});

export { app };
