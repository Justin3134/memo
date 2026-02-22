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
    return JSON.parse(payload.replace(/```json|```/g, "").trim()) as MiniMaxAnalysisResult;
  } catch (error) {
    console.error("Failed to parse MiniMax analysis JSON", error);
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

  const analysis = await minimax.chat.completions.create({
    model: "MiniMax-M2",
    messages: [
      {
        role: "system",
        content:
          "You are a clinical speech analysis AI. Return only valid JSON.",
      },
      {
        role: "user",
        content: `Analyze this conversation for cognitive and health signals.

TRANSCRIPT: ${transcript}
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
  "callSummary": "warm 3-4 sentence summary for family, never clinical",
  "healthMentions": ["array of health-related things mentioned"],
  "conversationSignals": [
    {
      "quote": "exact word-for-word quote from the User lines in transcript",
      "signal": "short label e.g. Word-finding difficulty / Fatigue mention / Mood change",
      "explanation": "one sentence why this quote is clinically relevant"
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
  "anomalyDescription": "plain English for family or null",
  "evidenceQuotes": ["exact quote from transcript that supports this anomaly", "another quote if relevant"],
  "severity": "low|medium|high or null",
  "videoGuidanceTopic": "topic for health education video or null",
  "recommendedAction": "what family should do or null"
}`,
      },
    ],
    temperature: 0.1,
  });

  const raw = analysis.choices[0]?.message?.content ?? "{}";
  const result = safeParseAnalysis(raw);

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

    if (result.videoGuidanceTopic) {
      await generateHealthVideo(patientId, callDocId, result.videoGuidanceTopic);
    }

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

  await convex.mutation(anyApi.patients.recalculateBaseline, { patientId });
}

async function generateHealthVideo(
  patientId: string,
  callId: string,
  topic: string
) {
  const apiKey = process.env.MINIMAX_API_KEY ?? "";
  const groupId = process.env.MINIMAX_GROUP_ID ?? "";

  const prompt = `Create a warm, clear, non-alarming 30-45 second health education video about: ${topic}.
Audience: adult children of elderly parents.
Tone: calm, reassuring, informative. Never alarming.
Style: soft cinematic, warm colors, illustrated medical diagrams.
End with a gentle reminder: "Talk to a doctor if you notice these patterns persisting."`;

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
    console.error("MiniMax video generation failed — no task_id:", JSON.stringify(genData));
    return;
  }

  console.log(`Video generation task started: ${taskId} for topic: "${topic}"`);

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

    console.log(`Video poll [${i + 1}/30]: status=${pollData?.status}`);

    if (pollData?.status === "Success" && pollData?.file_id) {
      fileId = pollData.file_id;
      break;
    }
    if (pollData?.status === "Fail") {
      console.error("MiniMax video generation failed:", JSON.stringify(pollData));
      return;
    }
  }

  if (!fileId) {
    console.error("Video generation timed out after 5 minutes");
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
    console.error("Could not retrieve video download URL:", JSON.stringify(fileData));
    return;
  }

  console.log(`Video ready for topic "${topic}": ${downloadUrl}`);

  await convex.mutation(anyApi.healthVideos.insert, {
    patientId,
    topic,
    videoUrl: downloadUrl,
    triggeredBy: callId,
    generatedAt: Date.now(),
  });
}
