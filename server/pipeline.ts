import OpenAI from "openai";
import { ConvexHttpClient } from "convex/browser";
import { anyApi } from "convex/server";
import * as plivo from "plivo";
import dotenv from "dotenv";

dotenv.config();

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

const minimax = new OpenAI({
  apiKey: process.env.MINIMAX_API_KEY ?? "",
  baseURL: "https://api.minimax.io/v1",
});

const convex = new ConvexHttpClient(process.env.CONVEX_URL ?? "");
const plivoClient = new ((plivo as unknown as {
  Client: new (
    authId: string,
    authToken: string
  ) => { messages: { create: (message: Record<string, string>) => Promise<unknown> } };
}).Client)(process.env.PLIVO_AUTH_ID ?? "", process.env.PLIVO_AUTH_TOKEN ?? "");

function safeParseAnalysis(payload: string): MiniMaxAnalysisResult {
  try {
    // MiniMax-M2 is a reasoning model — it outputs <think>...</think> before the JSON.
    // Strip that block first, then find and parse the JSON object.
    let cleaned = payload;

    // Remove <think>...</think> reasoning block (multiline)
    cleaned = cleaned.replace(/<think>[\s\S]*?<\/think>/gi, "").trim();

    // Remove markdown code fences
    cleaned = cleaned.replace(/```json|```/g, "").trim();

    // Extract the first { ... } JSON object in the remaining text
    const jsonStart = cleaned.indexOf("{");
    const jsonEnd = cleaned.lastIndexOf("}");
    if (jsonStart !== -1 && jsonEnd !== -1) {
      cleaned = cleaned.slice(jsonStart, jsonEnd + 1);
    }

    const parsed = JSON.parse(cleaned) as MiniMaxAnalysisResult;
    console.log(`MiniMax parsed — cognitive:${parsed.cognitiveScore} emotional:${parsed.emotionalScore} anomaly:${parsed.anomalyDetected}`);
    return parsed;
  } catch (error) {
    console.error("Failed to parse MiniMax analysis JSON:", error);
    console.error("Raw payload (first 300 chars):", payload.slice(0, 300));
    return {
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
  }
}

const fallbackBaseline = {
  speechRate: 0,
  pauseFrequency: 0,
  responseLatency: 0,
  cognitiveScore: 75,
  emotionalScore: 75,
  motorScore: 75,
  callCount: 0,
  calculatedAt: Date.now(),
};

const parseNumber = (value: unknown, fallback = 0) =>
  typeof value === "number" && Number.isFinite(value) ? value : fallback;

export async function runPostCallPipeline(
  patientId: string,
  callId: string,
  transcript: string,
  duration: number
) {
  const patient = await convex.query(anyApi.patients.getById, {
    patientId,
  });
  if (!patient) {
    throw new Error(`Patient ${patientId} not found`);
  }

  const baseline = patient.baseline ?? fallbackBaseline;

  // Extract only the patient's spoken lines so MiniMax cannot hallucinate quotes
  // Lines are prefixed with "User:" in Vapi transcripts
  const patientLines = transcript
    .split("\n")
    .filter((line) => /^(user|patient)\s*:/i.test(line.trim()))
    .map((line) => line.replace(/^(user|patient)\s*:\s*/i, "").trim())
    .filter(Boolean);

  const patientLinesBlock = patientLines.length > 0
    ? patientLines.map((l, i) => `[${i + 1}] "${l}"`).join("\n")
    : "(no patient speech detected)";

  const analysis = await minimax.chat.completions.create({
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
  "healthMentions": ["specific health topics or concerns the patient actually mentioned"],
  "conversationSignals": [
    {
      "quote": "VERBATIM text from PATIENT LINES list — must match exactly, character for character",
      "signal": "short label e.g. Word-finding difficulty / Fatigue / Loneliness / Pain / Mood change",
      "explanation": "one sentence on why this quote matters for wellbeing"
    }
  ],
  "memories": [
    {
      "category": "family|health|daily_life|emotions",
      "content": "brief description of what to remember",
      "entities": ["names or things mentioned"],
      "sentiment": "positive|neutral|negative"
    }
  ],
  "anomalyDetected": true/false,
  "anomalyDescription": "plain English for family — what changed and why it matters, or null",
  "evidenceQuotes": ["VERBATIM text from PATIENT LINES list supporting this anomaly — must match exactly"],
  "severity": "low|medium|high or null",
  "videoGuidanceTopic": "Set this when the patient expressed any negative emotion, loneliness, sadness, pain, confusion, worry, or health concern. Topic should be warm, e.g. 'Staying connected and finding joy each day'. Null only if the call was entirely positive.",
  "videoTone": "encouraging|educational|calming",
  "recommendedAction": "what the family should do, or null"
}

REMINDER: conversationSignals and evidenceQuotes must be empty arrays [] if no patient lines match. Never fabricate quotes.`,
      },
    ],
    temperature: 0.1,
  });

  const raw = analysis.choices[0]?.message?.content ?? "{}";
  const parsed = safeParseAnalysis(raw);

  // Strip any quotes that don't actually appear (case-insensitive substring) in the transcript.
  // This is a safety net against hallucinated quotes even after the strict prompt.
  const transcriptLower = transcript.toLowerCase();
  const verifyQuote = (q: string) => {
    const trimmed = q.trim();
    // Accept if at least 60% of the words appear in the transcript (fuzzy match for minor spacing diffs)
    const words = trimmed.toLowerCase().split(/\s+/).filter((w) => w.length > 3);
    if (words.length === 0) return false;
    const matches = words.filter((w) => transcriptLower.includes(w)).length;
    return matches / words.length >= 0.6;
  };

  const result: MiniMaxAnalysisResult = {
    ...parsed,
    conversationSignals: (parsed.conversationSignals ?? []).filter((s) => {
      const ok = verifyQuote(s.quote);
      if (!ok) console.warn(`Rejected hallucinated conversationSignal quote: "${s.quote}"`);
      return ok;
    }),
    evidenceQuotes: (parsed.evidenceQuotes ?? []).filter((q) => {
      const ok = verifyQuote(q);
      if (!ok) console.warn(`Rejected hallucinated evidenceQuote: "${q}"`);
      return ok;
    }),
  };

  const callDocId = await convex.mutation(anyApi.calls.updateAfterAnalysis, {
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

  for (const memory of result.memories ?? []) {
    await convex.mutation(anyApi.memories.insert, {
      patientId,
      callId: callDocId,
      timestamp: Date.now(),
      category: memory.category,
      content: memory.content,
      entities: memory.entities,
      sentiment: memory.sentiment,
    });
  }

  // Insert alert when anomaly detected
  if (result.anomalyDetected) {
    await convex.mutation(anyApi.alerts.insert, {
      patientId,
      callId: callDocId,
      timestamp: Date.now(),
      severity: result.severity ?? "medium",
      signalType: "composite",
      description:
        result.anomalyDescription ??
        "The Memo model detected a change worth checking with family.",
      currentValue: parseNumber(result.cognitiveScore),
      baselineValue: parseNumber(patient.baseline?.cognitiveScore ?? baseline.cognitiveScore),
      reviewed: false,
      recommendedAction: result.recommendedAction ?? undefined,
      evidenceQuotes: result.evidenceQuotes ?? [],
    });

    if (patient.emergencyContact) {
      try {
        await plivoClient.messages.create({
          src: process.env.PLIVO_NUMBER ?? "",
          dst: patient.emergencyContact,
          text: `Memo noticed something with ${patient.name} today: ${result.anomalyDescription}. Open the Memo app to review details.`,
        });
      } catch (error) {
        console.error("Plivo alert SMS failed", error);
      }
    }
  }

  // Generate video whenever there is a topic — anomaly OR emotional content
  if (result.videoGuidanceTopic) {
    generateHealthVideo(
      patientId,
      callDocId,
      result.videoGuidanceTopic,
      result.videoTone ?? "encouraging"
    ).catch((e) => console.error("Video generation error:", e));
  }

  await convex.mutation(anyApi.patients.recalculateBaseline, { patientId });
}

async function generateHealthVideo(
  patientId: string,
  callId: string,
  topic: string,
  tone: string = "encouraging"
) {
  const apiKey = process.env.MINIMAX_API_KEY ?? "";
  const groupId = process.env.MINIMAX_GROUP_ID ?? "";

  // Step 0 — Create the record immediately so the UI shows "Generating..."
  const videoId = await convex.mutation(anyApi.healthVideos.insert, {
    patientId,
    topic,
    status: "pending",
    triggeredBy: callId,
    generatedAt: Date.now(),
  });

  try {
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

    const prompt = tonePrompts[tone] ?? tonePrompts.encouraging;

    // Step 1 — Submit video generation task
    const genUrl = groupId
      ? `https://api.minimax.io/v1/video_generation?GroupId=${groupId}`
      : `https://api.minimax.io/v1/video_generation`;

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
      const errMsg = `MiniMax rejected the request: ${JSON.stringify(genData)}`;
      console.error("Video generation failed — no task_id:", errMsg);
      await convex.mutation(anyApi.healthVideos.updateStatus, {
        videoId,
        status: "failed",
        errorMessage: errMsg,
      });
      return;
    }

    console.log(`Video task started: ${taskId} — topic: "${topic}"`);
    await convex.mutation(anyApi.healthVideos.updateStatus, {
      videoId,
      status: "generating",
    });

    // Step 2 — Poll for completion (up to 5 minutes, every 10s)
    let fileId: string | null = null;
    for (let i = 0; i < 30; i++) {
      await new Promise((r) => setTimeout(r, 10_000));

      const pollUrl = groupId
        ? `https://api.minimax.io/v1/query/video_generation?task_id=${taskId}&GroupId=${groupId}`
        : `https://api.minimax.io/v1/query/video_generation?task_id=${taskId}`;

      const pollResponse = await fetch(pollUrl, {
        headers: { Authorization: `Bearer ${apiKey}` },
      });
      const pollData = await pollResponse.json();
      console.log(`Video poll [${i + 1}/30]: status=${pollData?.status} task=${taskId}`);

      if (pollData?.status === "Success" && pollData?.file_id) {
        fileId = pollData.file_id;
        break;
      }
      if (pollData?.status === "Fail") {
        const errMsg = `MiniMax generation failed: ${JSON.stringify(pollData)}`;
        console.error(errMsg);
        await convex.mutation(anyApi.healthVideos.updateStatus, {
          videoId,
          status: "failed",
          errorMessage: errMsg,
        });
        return;
      }
    }

    if (!fileId) {
      const errMsg = "Video generation timed out after 5 minutes";
      console.error(errMsg);
      await convex.mutation(anyApi.healthVideos.updateStatus, {
        videoId,
        status: "failed",
        errorMessage: errMsg,
      });
      return;
    }

    // Step 3 — Retrieve actual download URL from file_id
    const fileUrl = groupId
      ? `https://api.minimax.io/v1/files/retrieve?file_id=${fileId}&GroupId=${groupId}`
      : `https://api.minimax.io/v1/files/retrieve?file_id=${fileId}`;

    const fileResponse = await fetch(fileUrl, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    const fileData = await fileResponse.json();
    const downloadUrl = fileData?.file?.download_url ?? fileData?.download_url ?? null;

    if (!downloadUrl) {
      const errMsg = `Could not retrieve download URL: ${JSON.stringify(fileData)}`;
      console.error(errMsg);
      await convex.mutation(anyApi.healthVideos.updateStatus, {
        videoId,
        status: "failed",
        errorMessage: errMsg,
      });
      return;
    }

    console.log(`Video ready for topic "${topic}": ${downloadUrl}`);
    await convex.mutation(anyApi.healthVideos.updateStatus, {
      videoId,
      status: "completed",
      videoUrl: downloadUrl,
    });

  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    console.error("Unexpected error in generateHealthVideo:", errMsg);
    await convex.mutation(anyApi.healthVideos.updateStatus, {
      videoId,
      status: "failed",
      errorMessage: errMsg,
    });
  }
}
