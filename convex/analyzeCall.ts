import { internalAction } from "./_generated/server";
import { internal, api } from "./_generated/api";
import { v } from "convex/values";

type MiniMaxAnalysisResult = {
  cognitiveScore: number;
  emotionalScore: number;
  motorScore: number;
  wordFindingDifficulty: number;
  topicCoherence: number;
  fillerWordCount: number;
  selfCorrections: number;
  callSummary: string;
  healthMentions: string[];
  conversationSignals: Array<{
    quote: string;
    signal: string;
    explanation: string;
  }>;
  memories: Array<{
    category: string;
    content: string;
    entities: string[];
    sentiment: "positive" | "neutral" | "negative";
  }>;
  anomalyDetected: boolean;
  anomalyDescription: string | null;
  evidenceQuotes: string[];
  severity: "low" | "medium" | "high" | null;
  videoGuidanceTopic: string | null;
  videoTone: "encouraging" | "educational" | "calming" | null;
  recommendedAction: string | null;
};

const fallbackResult: MiniMaxAnalysisResult = {
  cognitiveScore: 50,
  emotionalScore: 50,
  motorScore: 50,
  wordFindingDifficulty: 50,
  topicCoherence: 50,
  fillerWordCount: 0,
  selfCorrections: 0,
  callSummary: "A daily companion call completed, with no additional concerns detected.",
  healthMentions: [],
  memories: [],
  anomalyDetected: false,
  anomalyDescription: null,
  evidenceQuotes: [],
  conversationSignals: [],
  severity: null,
  videoGuidanceTopic: null,
  videoTone: null,
  recommendedAction: null,
};

function safeParseAnalysis(payload: string): MiniMaxAnalysisResult {
  try {
    let cleaned = payload;
    cleaned = cleaned.replace(/<think>[\s\S]*?<\/think>/gi, "").trim();
    cleaned = cleaned.replace(/```json|```/g, "").trim();
    const jsonStart = cleaned.indexOf("{");
    const jsonEnd = cleaned.lastIndexOf("}");
    if (jsonStart !== -1 && jsonEnd !== -1) {
      cleaned = cleaned.slice(jsonStart, jsonEnd + 1);
    }
    return JSON.parse(cleaned) as MiniMaxAnalysisResult;
  } catch {
    return { ...fallbackResult };
  }
}

const parseNumber = (value: unknown, fallback = 0) =>
  typeof value === "number" && Number.isFinite(value) ? value : fallback;

function buildVideoPrompt(topic: string, tone: string): string {
  const tonePrompts: Record<string, string> = {
    encouraging: `A warm, uplifting 30-second video for an elderly person who may be feeling lonely or struggling.
Topic: ${topic}.
Visuals: Soft golden light, an elderly person smiling gently, cozy home scenes, flowers, family moments.
Tone: Like a kind friend speaking directly to them — "You are doing wonderfully. Each day you show up is something to be proud of."
End with: "You are loved. You are not alone. Keep going."
NO medical diagrams. NO clinical language. Pure warmth and encouragement.`,
    calming: `A gentle, soothing 30-second video to help an elderly person feel calm and at ease.
Topic: ${topic}.
Visuals: Slow nature scenes — a quiet garden, soft light through trees, a calm lake, candles.
Tone: Slow, peaceful narration. "You are safe. There is no rush. Breathe gently and let today be easy."
End with: "Rest when you need to. You are doing enough."`,
    educational: `A warm, clear 30-second health education video for elderly patients and their families.
Topic: ${topic}.
Audience: elderly patients and adult family members.
Tone: calm, reassuring, never alarming. Illustrated with soft diagrams and gentle music.
End with: "Talk to your doctor if this continues — they are there to help."`,
  };
  return tonePrompts[tone] ?? tonePrompts.encouraging;
}

export const run = internalAction({
  args: {
    patientId: v.string(),
    callId: v.string(),
    transcript: v.string(),
    duration: v.number(),
  },
  handler: async (ctx, args) => {
    const { patientId, callId, transcript, duration } = args;

    const apiKey = process.env.MINIMAX_API_KEY ?? "";
    const rawGroupId = process.env.MINIMAX_GROUP_ID ?? "";
    const groupId = rawGroupId && rawGroupId !== "your_group_id" ? rawGroupId : "";

    // Fetch patient for baseline
    const patient = await ctx.runQuery(api.patients.getById, { patientId });
    if (!patient) {
      console.error(`Patient ${patientId} not found — aborting pipeline`);
      return;
    }

    const baseline = (patient as any).baseline ?? {
      speechRate: 0,
      pauseFrequency: 0,
      responseLatency: 0,
      cognitiveScore: 75,
      emotionalScore: 75,
      motorScore: 75,
      callCount: 0,
      calculatedAt: Date.now(),
    };

    // Build patient-only lines for strict quote verification
    const patientLines = transcript
      .split("\n")
      .filter((line) => /^(user|patient)\s*:/i.test(line.trim()))
      .map((line) => line.replace(/^(user|patient)\s*:\s*/i, "").trim())
      .filter(Boolean);

    const patientLinesBlock =
      patientLines.length > 0
        ? patientLines.map((l, i) => `[${i + 1}] "${l}"`).join("\n")
        : "(no patient speech detected)";

    // Call MiniMax-M2 for analysis
    const minimaxResponse = await fetch("https://api.minimax.io/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "MiniMax-M2",
        messages: [
          {
            role: "system",
            content: `You are a clinical speech analysis AI for an elderly care platform.
STRICT RULE: Every "quote" and every entry in "evidenceQuotes" MUST be copied verbatim from the PATIENT LINES list provided.
Do NOT paraphrase, do NOT invent examples, do NOT use placeholder text.
If the patient did not say anything relevant to a signal, omit that signal entirely — do not add it with a made-up quote.
Return only valid JSON with no extra text.`,
          },
          {
            role: "user",
            content: `Analyze this call between an AI companion and an elderly patient.

FULL TRANSCRIPT:
${transcript}

PATIENT LINES ONLY (you may ONLY quote from these lines verbatim):
${patientLinesBlock}

CALL DURATION: ${duration} seconds
PATIENT BASELINE: ${JSON.stringify(baseline)}

Return JSON:
{
  "cognitiveScore": 0-100,
  "emotionalScore": 0-100,
  "motorScore": 0-100,
  "wordFindingDifficulty": 0-100,
  "topicCoherence": 0-100,
  "fillerWordCount": number,
  "selfCorrections": number,
  "callSummary": "warm 3-4 sentence summary for the patient's family. Never clinical.",
  "healthMentions": ["specific health topics the patient actually mentioned"],
  "conversationSignals": [
    {
      "quote": "VERBATIM text from PATIENT LINES list",
      "signal": "short label e.g. Word-finding difficulty / Fatigue / Loneliness / Pain",
      "explanation": "one sentence on why this quote matters for wellbeing"
    }
  ],
  "memories": [
    {
      "category": "family|health|daily_life|emotions",
      "content": "brief description",
      "entities": ["names or things mentioned"],
      "sentiment": "positive|neutral|negative"
    }
  ],
  "anomalyDetected": true/false,
  "anomalyDescription": "plain English for family — what changed and why it matters, or null",
  "evidenceQuotes": ["VERBATIM text from PATIENT LINES supporting this anomaly"],
  "severity": "low|medium|high or null",
  "videoGuidanceTopic": "Set when patient expressed negative emotion, loneliness, sadness, pain, confusion, worry, or health concern. Warm topic e.g. 'Staying connected and finding joy each day'. Null only if entirely positive.",
  "videoTone": "encouraging|educational|calming",
  "recommendedAction": "what the family should do, or null"
}

REMINDER: conversationSignals and evidenceQuotes must be empty arrays [] if no patient lines match. Never fabricate quotes.`,
          },
        ],
        temperature: 0.1,
      }),
    });

    if (!minimaxResponse.ok) {
      console.error("MiniMax API error:", minimaxResponse.status, await minimaxResponse.text());
    }

    const minimaxData = await minimaxResponse.json();
    const raw = minimaxData.choices?.[0]?.message?.content ?? "{}";
    const parsed = safeParseAnalysis(raw);

    console.log(
      `MiniMax parsed — cognitive:${parsed.cognitiveScore} emotional:${parsed.emotionalScore} anomaly:${parsed.anomalyDetected}`
    );

    // Verify quotes are real (not hallucinated)
    const transcriptLower = transcript.toLowerCase();
    const verifyQuote = (q: string) => {
      const words = q.trim().toLowerCase().split(/\s+/).filter((w) => w.length > 3);
      if (words.length === 0) return false;
      const matches = words.filter((w) => transcriptLower.includes(w)).length;
      return matches / words.length >= 0.6;
    };

    const result: MiniMaxAnalysisResult = {
      ...parsed,
      conversationSignals: (parsed.conversationSignals ?? []).filter((s) => {
        const ok = verifyQuote(s.quote);
        if (!ok) console.warn(`Rejected hallucinated quote: "${s.quote}"`);
        return ok;
      }),
      evidenceQuotes: (parsed.evidenceQuotes ?? []).filter((q) => {
        const ok = verifyQuote(q);
        if (!ok) console.warn(`Rejected hallucinated evidenceQuote: "${q}"`);
        return ok;
      }),
    };

    // Write call analysis to Convex (triggers live UI update)
    const callDocId = await ctx.runMutation(api.calls.updateAfterAnalysis, {
      callId,
      patientId,
      duration,
      cognitiveScore: parseNumber(result.cognitiveScore),
      emotionalScore: parseNumber(result.emotionalScore),
      motorScore: parseNumber(result.motorScore),
      transcript,
      summary: result.callSummary,
      healthMentions: result.healthMentions ?? [],
      conversationSignals: result.conversationSignals ?? [],
      anomalyDetected: !!result.anomalyDetected,
      videoGuidanceTopic: result.videoGuidanceTopic ?? undefined,
      status: "completed",
    });

    // Store memories
    for (const memory of result.memories ?? []) {
      await ctx.runMutation(api.memories.insert, {
        patientId,
        callId: callDocId,
        timestamp: Date.now(),
        category: memory.category,
        content: memory.content,
        entities: memory.entities,
        sentiment: memory.sentiment,
      });
    }

    // Insert alert for anomaly
    if (result.anomalyDetected) {
      await ctx.runMutation(api.alerts.insert, {
        patientId,
        callId: callDocId,
        timestamp: Date.now(),
        severity: result.severity ?? "medium",
        signalType: "composite",
        description:
          result.anomalyDescription ??
          "The Memo model detected a change worth checking with family.",
        currentValue: parseNumber(result.cognitiveScore),
        baselineValue: parseNumber((patient as any).baseline?.cognitiveScore ?? 75),
        reviewed: false,
        recommendedAction: result.recommendedAction ?? undefined,
        evidenceQuotes: result.evidenceQuotes ?? [],
      });

      // Optional SMS alert via Plivo
      const plivoId = process.env.PLIVO_AUTH_ID;
      const plivoToken = process.env.PLIVO_AUTH_TOKEN;
      const plivoNum = process.env.PLIVO_NUMBER;
      const emergencyContact = (patient as any).emergencyContact;
      if (plivoId && plivoToken && plivoNum && emergencyContact) {
        try {
          await fetch("https://api.plivo.com/v1/Account/" + plivoId + "/Message/", {
            method: "POST",
            headers: {
              Authorization: "Basic " + btoa(`${plivoId}:${plivoToken}`),
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              src: plivoNum,
              dst: emergencyContact,
              text: `Memo noticed something with ${(patient as any).name} today: ${result.anomalyDescription}. Open the Memo app to review details.`,
            }),
          });
        } catch (e) {
          console.error("Plivo SMS failed:", e);
        }
      }
    }

    // Recalculate baseline
    await ctx.runMutation(api.patients.recalculateBaseline, { patientId });

    // Start video generation if a topic was identified
    if (result.videoGuidanceTopic) {
      const topic = result.videoGuidanceTopic;
      const tone = result.videoTone ?? "encouraging";
      const prompt = buildVideoPrompt(topic, tone);

      // Create the video record immediately (shows "Generating..." in UI)
      const videoId = await ctx.runMutation(api.healthVideos.insert, {
        patientId,
        topic,
        status: "pending",
        triggeredBy: callDocId,
        generatedAt: Date.now(),
      });

      // Submit video task to MiniMax
      const genUrl = groupId
        ? `https://api.minimax.io/v1/video_generation?GroupId=${groupId}`
        : "https://api.minimax.io/v1/video_generation";

      const genResponse = await fetch(genUrl, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ model: "T2V-01", prompt }),
      });

      const genData = await genResponse.json();
      const taskId = genData?.task_id;

      if (!taskId) {
        console.error("Video task submission failed:", JSON.stringify(genData));
        await ctx.runMutation(api.healthVideos.updateStatus, {
          videoId,
          status: "failed",
          errorMessage: `MiniMax rejected: ${JSON.stringify(genData)}`,
        });
      } else {
        console.log(`Video task submitted: ${taskId} — topic: "${topic}"`);
        // Store task_id and schedule polling
        await ctx.runMutation(api.healthVideos.updateStatus, {
          videoId,
          status: "generating",
          taskId,
        });
        // Schedule first poll in 30 seconds
        await ctx.scheduler.runAfter(30_000, internal.pollVideo.poll, {
          videoId,
          taskId,
          groupId,
          attempt: 0,
        });
      }
    }
  },
});
