import OpenAI from "openai";
import { ConvexHttpClient } from "convex/browser";
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
  memories: Array<{
    category: string;
    content: string;
    entities: string[];
    sentiment: "positive" | "neutral" | "negative";
  }>;
  anomalyDetected: boolean;
  anomalyDescription: string | null;
  severity: "low" | "medium" | "high" | null;
  videoGuidanceTopic: string | null;
  recommendedAction: string | null;
};

const minimax = new OpenAI({
  apiKey: process.env.MINIMAX_API_KEY ?? "",
  baseURL: "https://api.minimax.io/v1",
});

const convex = new ConvexHttpClient(process.env.CONVEX_DEPLOYMENT ?? "");
const plivoClient = new (plivo as unknown as {
  Client: new (
    authId: string,
    authToken: string
  ) => { messages: { create: (message: Record<string, string>) => Promise<unknown> } };
})(process.env.PLIVO_AUTH_ID ?? "", process.env.PLIVO_AUTH_TOKEN ?? "");

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
  const patient = await convex.query("patients:getById", {
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
  "healthMentions": ["array of health-related things she mentioned"],
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

  const callDocId = await convex.mutation("calls:updateAfterAnalysis", {
    callId,
    patientId,
    duration,
    cognitiveScore: parseNumber(result.cognitiveScore),
    emotionalScore: parseNumber(result.emotionalScore),
    motorScore: parseNumber(result.motorScore),
    transcript,
    summary: result.callSummary,
    healthMentions: result.healthMentions ?? [],
    anomalyDetected: !!result.anomalyDetected,
    videoGuidanceTopic: result.videoGuidanceTopic ?? undefined,
    status: "completed",
  });

  for (const memory of result.memories ?? []) {
    await convex.mutation("memories:insert", {
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
    await convex.mutation("alerts:insert", {
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

  await convex.mutation("patients:recalculateBaseline", { patientId });
}

async function generateHealthVideo(
  patientId: string,
  callId: string,
  topic: string
) {
  const response = await fetch("https://api.minimax.io/v1/video_generation", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.MINIMAX_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "video-01",
      prompt: `Create a warm, clear, non-alarming 30-second health education video about: ${topic}.
        Audience: adult children of elderly parents.
        Tone: calm, reassuring, informative.
        Style: soft cinematic, warm colors, illustrated diagrams.
        End with: "Talk to a doctor if you notice these patterns persisting."`,
    }),
  });

  const { task_id } = await response.json();
  if (!task_id) {
    return;
  }

  let videoUrl: string | null = null;
  for (let i = 0; i < 30; i++) {
    await new Promise((r) => setTimeout(r, 10_000));
    const statusResponse = await fetch(
      `https://api.minimax.io/v1/query/video_generation?task_id=${task_id}`,
      {
        headers: { Authorization: `Bearer ${process.env.MINIMAX_API_KEY}` },
      }
    );
    const data = await statusResponse.json();

    if (data?.status === "Success" && data.file_id) {
      videoUrl = data.file_id;
      break;
    }
  }

  if (videoUrl) {
    await convex.mutation("healthVideos:insert", {
      patientId,
      topic,
      videoUrl,
      triggeredBy: callId,
      generatedAt: Date.now(),
    });
  }
}
