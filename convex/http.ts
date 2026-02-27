import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { internal, api } from "./_generated/api";

const http = httpRouter();

// Permanent webhook endpoint for Vapi end-of-call reports.
// URL: https://friendly-ostrich-184.convex.site/vapi-webhook
http.route({
  path: "/vapi-webhook",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    try {
      const event = await request.json();
      const messageType = event.message?.type;

      // Only process end-of-call reports
      if (messageType !== "end-of-call-report") {
        return new Response("ok", { status: 200 });
      }

      const call = event.message.call ?? {};
      const duration = Number(event.message.duration ?? call.duration ?? 0);

      // Build transcript from whatever Vapi sends
      const transcriptSource = event.message.transcript;
      let rawTranscript = "";
      if (typeof transcriptSource === "string") {
        rawTranscript = transcriptSource;
      } else if (Array.isArray(transcriptSource)) {
        rawTranscript = transcriptSource
          .map((line: { text?: string; transcript?: string; content?: string }) =>
            line?.text || line?.transcript || line?.content || ""
          )
          .filter(Boolean)
          .join("\n");
      } else {
        const msgs: Array<{ role?: string; message?: string; text?: string; content?: string }> =
          call.artifact?.messages ?? [];
        rawTranscript = msgs
          .map((m) => {
            const role = m.role === "assistant" ? "AI" : "User";
            const text = m.message ?? m.text ?? m.content ?? "";
            return text ? `${role}: ${text}` : "";
          })
          .filter(Boolean)
          .join("\n");
      }

      const callId = call.id ?? `call-${Date.now()}`;
      const transcript = rawTranscript || "No transcript available for this call.";

      // Extract recording URL from Vapi (artifact.recording or legacy fields)
      const recordingUrl: string =
        call.artifact?.recording ??
        call.artifact?.recordingUrl ??
        call.recordingUrl ??
        call.stereoRecordingUrl ??
        "";

      // Resolve patient — use metadata first, then match by phone
      let patientId: string | null = call.metadata?.patientId ?? null;

      if (!patientId) {
        const all = await ctx.runQuery(api.patients.getAll);
        if (all && all.length > 0) {
          const customerRaw = call.customer?.number ?? "";
          const customerDigits = customerRaw.replace(/\D/g, "");
          const matched = customerDigits
            ? all.find((p: { phoneNumber: string }) => {
                const pDigits = p.phoneNumber.replace(/\D/g, "");
                return (
                  pDigits === customerDigits ||
                  pDigits.slice(-10) === customerDigits.slice(-10)
                );
              })
            : null;
          const resolved = matched ?? all[0];
          patientId = (resolved as { _id: string })._id;
          console.log(
            `Resolved patient: ${(resolved as { name: string }).name} (${patientId}) — phone match: ${!!matched}`
          );
        }
      }

      if (!patientId) {
        console.warn("No patient found — register one first");
        return new Response("no patient", { status: 200 });
      }

      // Schedule the analysis pipeline — returns immediately so Vapi gets instant 200
      await ctx.scheduler.runAfter(0, internal.analyzeCall.run, {
        patientId,
        callId,
        transcript,
        duration,
        recordingUrl: recordingUrl || undefined,
      });

      console.log(`Scheduled pipeline for call ${callId} — patient ${patientId}${recordingUrl ? " (with recording)" : ""}`);
      return new Response("ok", { status: 200 });
    } catch (err) {
      console.error("Webhook error:", err);
      return new Response("error", { status: 500 });
    }
  }),
});

// Health check
http.route({
  path: "/health",
  method: "GET",
  handler: httpAction(async () => {
    return new Response(JSON.stringify({ status: "ok", service: "memo-convex-webhook" }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }),
});

export default http;
