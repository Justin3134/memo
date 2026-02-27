import { internalAction } from "./_generated/server";
import { internal, api } from "./_generated/api";
import { v } from "convex/values";

const num = (v: unknown, fb = 0) => (typeof v === "number" && isFinite(v) ? v : fb);

export const run = internalAction({
  args: {
    patientId: v.string(),
    callId: v.string(),
    transcript: v.string(),
    duration: v.number(),
    recordingUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { patientId, callId, transcript, duration, recordingUrl } = args;

    const patient = await ctx.runQuery(api.patients.getById, { patientId });
    if (!patient) { console.error(`Patient ${patientId} not found`); return; }

    const baseline = (patient as any).baseline?.cognitiveScore ?? 75;
    const backendUrl = process.env.MEMO_BACKEND_URL ?? "http://localhost:8000";

    // ── Try FastAPI backend (GLiNER2 + OpenAI + Neo4j + Tavily) ──────────────
    let result: any = null;
    try {
      const res = await fetch(`${backendUrl}/analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patient_id: patientId, call_id: callId, transcript, duration,
          patient_name: (patient as any).name ?? "Patient",
          baseline_cognitive: baseline,
          recording_url: recordingUrl ?? null,
        }),
      });
      if (res.ok) result = await res.json();
      else console.error(`FastAPI error ${res.status}: ${await res.text()}`);
    } catch (e) {
      console.warn("FastAPI unreachable, falling back to MiniMax:", e);
    }

    // ── MiniMax fallback ──────────────────────────────────────────────────────
    if (!result) result = await runMiniMax(transcript, duration, patient, baseline);

    // ── Write to Convex for real-time UI updates ──────────────────────────────
    const acousticSignals = result.acousticSignals ?? {};
    const callDocId = await ctx.runMutation(api.calls.updateAfterAnalysis, {
      callId, patientId,
      duration, transcript,
      cognitiveScore: num(result.cognitiveScore),
      emotionalScore: num(result.emotionalScore),
      motorScore: num(result.motorScore),
      speechRate: num(acousticSignals.speech_rate_wpm ?? result.speechRate),
      pauseFrequency: num(acousticSignals.pause_frequency_per_min ?? result.pauseFrequency),
      summary: result.callSummary ?? result.summary ?? "",
      healthMentions: result.healthMentions ?? [],
      conversationSignals: (result.conversationSignals ?? []).map((s: any) => ({
        quote: s.quote ?? "", signal: s.signal ?? "", explanation: s.explanation ?? "",
      })),
      anomalyDetected: !!result.anomalyDetected,
      videoGuidanceTopic: result.videoGuidanceTopic ?? undefined,
      recordingUrl: recordingUrl ?? undefined,
      status: "completed",
    });

    for (const m of result.memories ?? []) {
      await ctx.runMutation(api.memories.insert, {
        patientId, callId: callDocId, timestamp: Date.now(),
        category: m.category ?? "daily_life", content: m.content ?? "",
        entities: m.entities ?? [], sentiment: m.sentiment ?? "neutral",
      });
    }

    if (result.anomalyDetected) {
      await ctx.runMutation(api.alerts.insert, {
        patientId, callId: callDocId, timestamp: Date.now(),
        severity: result.anomalySeverity ?? result.severity ?? "medium",
        signalType: result.anomalyType ?? "composite",
        description: result.anomalyDescription ?? result.anomaly_description ?? "Memo detected a change worth reviewing.",
        currentValue: num(result.cognitiveScore),
        baselineValue: num(baseline),
        reviewed: false,
        recommendedAction: result.recommendedAction ?? undefined,
        evidenceQuotes: result.evidenceQuotes ?? [],
      });
    }

    await ctx.runMutation(api.patients.recalculateBaseline, { patientId });

    // ── Video generation (MiniMax) ────────────────────────────────────────────
    const videoTopic = result.videoGuidanceTopic;
    if (videoTopic) {
      const rawGroupId = process.env.MINIMAX_GROUP_ID ?? "";
      const groupId = rawGroupId && rawGroupId !== "your_group_id" ? rawGroupId : "";
      const apiKey = process.env.MINIMAX_API_KEY ?? "";
      const prompt = `A warm, uplifting 30-second video for an elderly person. Topic: ${videoTopic}. Soft golden light, cozy home scenes. Tone: caring and gentle.`;
      const videoId = await ctx.runMutation(api.healthVideos.insert, {
        patientId, topic: videoTopic, status: "pending",
        triggeredBy: callDocId, generatedAt: Date.now(),
      });
      const url = groupId ? `https://api.minimax.io/v1/video_generation?GroupId=${groupId}` : "https://api.minimax.io/v1/video_generation";
      const genRes = await fetch(url, {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({ model: "T2V-01", prompt }),
      });
      const genData = await genRes.json();
      const taskId = genData?.task_id;
      if (!taskId) {
        await ctx.runMutation(api.healthVideos.updateStatus, { videoId, status: "failed", errorMessage: JSON.stringify(genData) });
      } else {
        await ctx.runMutation(api.healthVideos.updateStatus, { videoId, status: "generating", taskId });
        await ctx.scheduler.runAfter(30_000, internal.pollVideo.poll, { videoId, taskId, groupId, attempt: 0 });
      }
    }
  },
});

async function runMiniMax(transcript: string, duration: number, patient: any, baseline: number): Promise<any> {
  const apiKey = process.env.MINIMAX_API_KEY ?? "";
  if (!apiKey) return defaultResult();
  const lines = transcript.split("\n")
    .filter(l => /^(user|patient)\s*:/i.test(l.trim()))
    .map(l => l.replace(/^(user|patient)\s*:\s*/i, "").trim())
    .filter(Boolean);
  const block = lines.length ? lines.map((l, i) => `[${i+1}] "${l}"`).join("\n") : "(no patient speech)";
  try {
    const res = await fetch("https://api.minimax.io/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "MiniMax-M2",
        messages: [
          { role: "system", content: "Clinical speech analysis AI. Return only valid JSON." },
          { role: "user", content: `Analyze patient speech. LINES: ${block}\n\nReturn JSON with cognitiveScore, emotionalScore, motorScore, callSummary, anomalyDetected, anomalyType, anomalySeverity, anomalyDescription, healthMentions, conversationSignals, memories, videoGuidanceTopic, videoTone. All fields required.` },
        ],
        temperature: 0.1,
      }),
    });
    const data = await res.json();
    let raw = data.choices?.[0]?.message?.content ?? "{}";
    raw = raw.replace(/<think>[\s\S]*?<\/think>/gi, "").replace(/```json|```/g, "").trim();
    const s = raw.indexOf("{"); const e = raw.lastIndexOf("}");
    return s >= 0 && e >= 0 ? JSON.parse(raw.slice(s, e+1)) : defaultResult();
  } catch { return defaultResult(); }
}

function defaultResult() {
  return { cognitiveScore:70, emotionalScore:70, motorScore:70, callSummary:"A daily companion call completed.",
           anomalyDetected:false, anomalyType:null, anomalySeverity:null, anomalyDescription:null,
           healthMentions:[], conversationSignals:[], memories:[], videoGuidanceTopic:null, videoTone:null };
}
