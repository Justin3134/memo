import express from "express";
import dotenv from "dotenv";
import { runPostCallPipeline } from "./pipeline";

dotenv.config();

const app = express();
app.use(express.json());

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
