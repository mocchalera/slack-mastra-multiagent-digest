import "dotenv/config";
import { mastra } from "../mastra/index";
import { fetchTodayLogs } from "../slack/fetchLogs";
import { postDigestMessage } from "../slack/postDigest";

async function main() {
  const channelIdsEnv = process.env.SLACK_CHANNEL_IDS;
  const digestChannelId = process.env.SLACK_DIGEST_CHANNEL_ID;
  const persona = process.env.DIGEST_PERSONA || "元気な後輩（アイちゃん）";

  if (!channelIdsEnv) {
    throw new Error("SLACK_CHANNEL_IDS is not set.");
  }
  if (!digestChannelId) {
    throw new Error("SLACK_DIGEST_CHANNEL_ID is not set.");
  }

  const channelIds = channelIdsEnv
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);

  if (channelIds.length === 0) {
    throw new Error("SLACK_CHANNEL_IDS is empty.");
  }

  console.log("[dailyDigest] Fetching logs for channels:", channelIds.join(", "));
  const logs = await fetchTodayLogs(channelIds);

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
  console.log("[dailyDigest] Digest generated. Posting to Slack channel:", digestChannelId);

  await postDigestMessage(digestChannelId, digest);

  console.log("[dailyDigest] Done.");
}

main().catch((err) => {
  console.error("[dailyDigest] Error:", err);
  process.exit(1);
});
