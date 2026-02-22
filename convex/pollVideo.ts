import { internalAction } from "./_generated/server";
import { internal, api } from "./_generated/api";
import { v } from "convex/values";

const MAX_ATTEMPTS = 30; // 30 × 30s = 15 minutes max

export const poll = internalAction({
  args: {
    videoId: v.id("healthVideos"),
    taskId: v.string(),
    groupId: v.string(),
    attempt: v.number(),
  },
  handler: async (ctx, args) => {
    const { videoId, taskId, groupId, attempt } = args;
    const apiKey = process.env.MINIMAX_API_KEY ?? "";

    const pollUrl = groupId
      ? `https://api.minimax.io/v1/query/video_generation?task_id=${taskId}&GroupId=${groupId}`
      : `https://api.minimax.io/v1/query/video_generation?task_id=${taskId}`;

    try {
      const pollResponse = await fetch(pollUrl, {
        headers: { Authorization: `Bearer ${apiKey}` },
      });
      const pollData = await pollResponse.json();
      console.log(`Video poll [${attempt + 1}/${MAX_ATTEMPTS}]: status=${pollData?.status} task=${taskId}`);

      if (pollData?.status === "Success" && pollData?.file_id) {
        // Retrieve the actual download URL
        const fileUrl = groupId
          ? `https://api.minimax.io/v1/files/retrieve?file_id=${pollData.file_id}&GroupId=${groupId}`
          : `https://api.minimax.io/v1/files/retrieve?file_id=${pollData.file_id}`;

        const fileResponse = await fetch(fileUrl, {
          headers: { Authorization: `Bearer ${apiKey}` },
        });
        const fileData = await fileResponse.json();
        const downloadUrl = fileData?.file?.download_url ?? fileData?.download_url ?? null;

        if (downloadUrl) {
          await ctx.runMutation(api.healthVideos.updateStatus, {
            videoId,
            status: "completed",
            videoUrl: downloadUrl,
          });
          console.log(`Video completed for task ${taskId}`);
        } else {
          await ctx.runMutation(api.healthVideos.updateStatus, {
            videoId,
            status: "failed",
            errorMessage: `Could not retrieve download URL: ${JSON.stringify(fileData)}`,
          });
        }
        return;
      }

      if (pollData?.status === "Fail") {
        await ctx.runMutation(api.healthVideos.updateStatus, {
          videoId,
          status: "failed",
          errorMessage: `MiniMax generation failed: ${JSON.stringify(pollData)}`,
        });
        return;
      }

      if (attempt >= MAX_ATTEMPTS - 1) {
        await ctx.runMutation(api.healthVideos.updateStatus, {
          videoId,
          status: "failed",
          errorMessage: "Video generation timed out after 15 minutes",
        });
        return;
      }

      // Still processing — schedule another poll in 30 seconds
      await ctx.scheduler.runAfter(30_000, internal.pollVideo.poll, {
        videoId,
        taskId,
        groupId,
        attempt: attempt + 1,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error("pollVideo error:", msg);

      if (attempt < MAX_ATTEMPTS - 1) {
        // Retry on transient errors
        await ctx.scheduler.runAfter(30_000, internal.pollVideo.poll, {
          videoId,
          taskId,
          groupId,
          attempt: attempt + 1,
        });
      } else {
        await ctx.runMutation(api.healthVideos.updateStatus, {
          videoId,
          status: "failed",
          errorMessage: `Polling failed: ${msg}`,
        });
      }
    }
  },
});
