/**
 * Retries all failed health video generation tasks.
 * Usage:  npx tsx server/retry-videos.ts
 */
import dotenv from "dotenv";
import { ConvexHttpClient } from "convex/browser";
import { anyApi } from "convex/server";

dotenv.config();

const convex = new ConvexHttpClient(process.env.CONVEX_URL ?? "");

const API_KEY = process.env.MINIMAX_API_KEY ?? "";
const RAW_GROUP = process.env.MINIMAX_GROUP_ID ?? "";
const GROUP_ID = RAW_GROUP && RAW_GROUP !== "your_group_id" ? RAW_GROUP : "";

function videoUrl(path: string) {
  return GROUP_ID
    ? `https://api.minimax.io/v1/${path}?GroupId=${GROUP_ID}`
    : `https://api.minimax.io/v1/${path}`;
}

async function generateVideo(topic: string, tone = "encouraging") {
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

  const res = await fetch(videoUrl("video_generation"), {
    method: "POST",
    headers: {
      Authorization: `Bearer ${API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ model: "T2V-01", prompt }),
  });
  return res.json();
}

async function pollVideo(taskId: string, maxAttempts = 30): Promise<string | null> {
  for (let i = 0; i < maxAttempts; i++) {
    await new Promise((r) => setTimeout(r, 10_000));
    const res = await fetch(videoUrl(`query/video_generation?task_id=${taskId}`), {
      headers: { Authorization: `Bearer ${API_KEY}` },
    });
    const data = await res.json();
    console.log(`  Poll [${i + 1}/${maxAttempts}]: status=${data?.status}`);

    if (data?.status === "Success" && data?.file_id) return data.file_id;
    if (data?.status === "Fail") {
      console.error("  Generation failed:", JSON.stringify(data));
      return null;
    }
  }
  return null;
}

async function fetchFileUrl(fileId: string): Promise<string | null> {
  const res = await fetch(
    GROUP_ID
      ? `https://api.minimax.io/v1/files/retrieve?file_id=${fileId}&GroupId=${GROUP_ID}`
      : `https://api.minimax.io/v1/files/retrieve?file_id=${fileId}`,
    { headers: { Authorization: `Bearer ${API_KEY}` } }
  );
  const data = await res.json();
  return data?.file?.download_url ?? data?.download_url ?? null;
}

async function main() {
  const patients: any[] = await convex.query(anyApi.patients.getAll);
  if (!patients?.length) throw new Error("No patients found");
  const patientId = patients[0]._id;

  const videos: any[] = await convex.query(anyApi.healthVideos.listForPatient, { patientId });
  const failed = (videos ?? []).filter((v) => v.status === "failed" || v.status === "pending");

  console.log(`Found ${failed.length} failed/pending videos to retry`);

  // Deduplicate by topic so we don't generate the same video twice
  const seen = new Set<string>();
  const unique = failed.filter((v) => {
    if (seen.has(v.topic)) return false;
    seen.add(v.topic);
    return true;
  });

  console.log(`Unique topics: ${unique.length}`);

  for (const video of unique) {
    console.log(`\n→ "${video.topic}" (${video._id})`);

    // Mark all records with this topic as generating
    const sameTopicVideos = failed.filter((v) => v.topic === video.topic);
    for (const v of sameTopicVideos) {
      await convex.mutation(anyApi.healthVideos.updateStatus, {
        videoId: v._id,
        status: "generating",
      });
    }

    const genData = await generateVideo(video.topic, video.tone ?? "encouraging");
    const taskId = genData?.task_id;
    if (!taskId) {
      console.error("  No task_id:", JSON.stringify(genData));
      for (const v of sameTopicVideos) {
        await convex.mutation(anyApi.healthVideos.updateStatus, {
          videoId: v._id,
          status: "failed",
          errorMessage: `No task_id: ${JSON.stringify(genData)}`,
        });
      }
      continue;
    }

    console.log(`  Task started: ${taskId}`);
    const fileId = await pollVideo(taskId);

    if (!fileId) {
      for (const v of sameTopicVideos) {
        await convex.mutation(anyApi.healthVideos.updateStatus, {
          videoId: v._id,
          status: "failed",
          errorMessage: "Generation timed out or failed",
        });
      }
      continue;
    }

    console.log(`  File ID: ${fileId} — fetching download URL…`);
    const downloadUrl = await fetchFileUrl(fileId);

    if (!downloadUrl) {
      console.error("  Could not fetch download URL");
      for (const v of sameTopicVideos) {
        await convex.mutation(anyApi.healthVideos.updateStatus, {
          videoId: v._id,
          status: "failed",
          errorMessage: "Could not fetch download URL",
        });
      }
      continue;
    }

    console.log(`  Video ready: ${downloadUrl.slice(0, 60)}…`);
    for (const v of sameTopicVideos) {
      await convex.mutation(anyApi.healthVideos.updateStatus, {
        videoId: v._id,
        status: "completed",
        videoUrl: downloadUrl,
      });
    }

    // Pause between videos to be nice to the API
    await new Promise((r) => setTimeout(r, 3000));
  }

  console.log("\nAll done.");
}

main().catch((e) => {
  console.error("Fatal:", e);
  process.exit(1);
});
