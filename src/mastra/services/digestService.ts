import { mastra } from "../index.js";
import { fetchDailyLogs } from "../../slack/fetchLogs.js";
import { postDigestMessage } from "../../slack/postDigest.js";

/**
 * Orchestrates the daily digest generation and posting flow.
 * 1. Fetches the past 24h Slack logs from the target channels.
 * 2. Runs the Mastra workflow to generate the digest text.
 * 3. Posts the digest into the configured digest channel.
 */
export async function generateAndPostDigest(
  channelIds: string[],
  digestChannelId: string,
  persona: string = "元気な後輩（アイちゃん）",
) {
  // Step 1: collect logs (past 24h from now)
  console.log(`[digestService] Fetching logs for past 24 hours from now...`);
  const logs = await fetchDailyLogs(channelIds);

  // Step 2: run workflow
  const workflow = mastra.getWorkflow("dailyDigestWorkflow");
  const run = await workflow.createRunAsync();

  const result = await run.start({
    inputData: {
      logs,
      persona,
    },
  });

  if (result.status === "failed") {
    throw new Error(`Workflow failed: ${result.error.message}`);
  }
  if (result.status !== "success") {
    throw new Error(`Workflow ended with status: ${result.status}`);
  }

  const digest = result.result.digest;
  console.log("[digestService] Digest generated. Posting to Slack channel:", digestChannelId);

  // Step 3: post to Slack
  await postDigestMessage(digestChannelId, digest);

  console.log("[digestService] Done.");
  return digest;
}
