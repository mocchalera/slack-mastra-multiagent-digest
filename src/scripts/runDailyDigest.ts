import "dotenv/config";
import { generateAndPostDigest } from "../mastra/services/digestService";

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

  await generateAndPostDigest(channelIds, digestChannelId, persona);
}

main().catch((err) => {
  console.error("[dailyDigest] Error:", err);
  process.exit(1);
});
