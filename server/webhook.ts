import express from "express";
import dotenv from "dotenv";
import { ConvexHttpClient } from "convex/browser";
import { anyApi } from "convex/server";
import { runPostCallPipeline } from "./pipeline";
import { buildSystemPrompt } from "./systemPrompt";

dotenv.config();

const convex = new ConvexHttpClient(process.env.CONVEX_URL ?? "");
const app = express();
app.use(express.json());

const normalizeToE164 = (rawPhone: string) => {
  const digits = String(rawPhone ?? "").replace(/\D/g, "");
  if (String(rawPhone ?? "").trim().startsWith("+")) return `+${digits}`;
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  return null;
};

// Immediately trigger a Vapi call for a given patient or ad-hoc phone number
app.post("/call-now", async (req, res) => {
  try {
    const { phoneNumber, name, patientId } = req.body as {
      phoneNumber?: string;
      name?: string;
      patientId?: string;
    };

    const rawPhone = phoneNumber?.trim();
    if (!rawPhone) return res.status(400).json({ error: "phoneNumber is required" });

    const e164 = normalizeToE164(rawPhone);
    if (!e164) return res.status(400).json({ error: `Cannot normalize "${rawPhone}" to E.164 format` });

    // Try to look up the patient for personalised system prompt
    let patient: any = null;
    if (patientId) {
      try {
        patient = await convex.query(anyApi.patients.getById, { patientId });
      } catch { /* fallback to anonymous */ }
    }
    if (!patient && rawPhone) {
      try {
        const all = await convex.query(anyApi.patients.getAll);
        patient = all?.find((p: any) => normalizeToE164(p.phoneNumber) === e164) ?? all?.[0] ?? null;
      } catch { /* ignore */ }
    }

    const patientName = patient?.name ?? name ?? "there";
    const systemPrompt = patient
      ? buildSystemPrompt(patient, "", "")
      : `You are Memo, a warm and caring AI companion calling ${patientName}. Have a friendly 5-10 minute conversation, ask how they are feeling today, and listen attentively.`;

    const response = await fetch("https://api.vapi.ai/call", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.VAPI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        phoneNumberId: process.env.VAPI_PHONE_NUMBER_ID,
        customer: { number: e164 },
        assistant: {
          model: {
            provider: "openai",
            model: "gpt-4o",
            messages: [{ role: "system", content: systemPrompt }],
          },
          voice: {
            provider: "11labs",
            voiceId: patient?.voiceId ?? process.env.DEFAULT_VOICE_ID ?? "cgSgspJ2msm6clMCkdW9",
          },
          transcriber: { provider: "deepgram", language: "en" },
          endCallMessage: "Take care, speak soon!",
          silenceTimeoutSeconds: 30,
          maxDurationSeconds: 600,
        },
        metadata: { patientId: patient?._id ?? patientId ?? null },
      }),
    });

    if (!response.ok) {
      const body = await response.text();
      console.error("Vapi call-now error:", response.status, body);
      return res.status(502).json({ error: `Vapi error ${response.status}: ${body}` });
    }

    const payload = await response.json();
    const vapiCallId = payload?.id ?? payload?.call?.id;
    console.log(`Immediate call triggered → ${e164} (vapiCallId: ${vapiCallId})`);

    // Pre-create the call record
    if (vapiCallId && patient?._id) {
      try {
        await convex.mutation(anyApi.calls.createInitialCall, {
          patientId: patient._id,
          vapiCallId,
          startedAt: Date.now(),
          status: "initiated",
        });
      } catch (e) {
        console.warn("Could not pre-create call record:", e);
      }
    }

    return res.json({ success: true, vapiCallId });
  } catch (error) {
    console.error("call-now error:", error);
    return res.status(500).json({ error: error instanceof Error ? error.message : "Unknown error" });
  }
});

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

    // Resolve patientId — use metadata first, then match by phone, then fall back to first patient
    let patientId: string | null = call.metadata?.patientId ?? null;

    if (!patientId) {
      try {
        const all = await convex.query(anyApi.patients.getAll);
        if (all && all.length > 0) {
          // Normalize both sides to digits-only for comparison
          const customerRaw = call.customer?.number ?? "";
          const customerDigits = customerRaw.replace(/\D/g, "");
          const matched = customerDigits
            ? all.find((p: any) => {
                const pDigits = p.phoneNumber.replace(/\D/g, "");
                // Match full number or last 10 digits
                return pDigits === customerDigits || pDigits.slice(-10) === customerDigits.slice(-10);
              })
            : null;
          patientId = matched?._id ?? all[0]._id;
          console.log(`Resolved patient: ${(matched ?? all[0]).name} (${patientId}) — phone match: ${!!matched}`);
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
