import { checkAndReplyInactive } from "../mastra/services/replyService.js";
import * as dotenv from "dotenv";

dotenv.config();

async function main() {
    const channelId = process.env.SLACK_CHANNEL_ID_TEST || "C0123456789"; // Default or env var
    console.log(`Starting inactive thread check for channel ${channelId}...`);

    // Note: This will actually try to post to Slack if it finds something and passes the judge.
    // Ideally we would mock the Slack client, but for this quick verification we rely on logs
    // and potentially a safe channel.

    await checkAndReplyInactive([channelId]);

    console.log("Done.");
}

main().catch(console.error);
