import "dotenv/config";
import { slackClient } from "../slack/client";

// Usage: npx ts-node src/scripts/deleteMessage.ts <CHANNEL_ID> <TIMESTAMP>
// Example: npx ts-node src/scripts/deleteMessage.ts C07PKT9QBML 1732694937.562629

async function main() {
    const args = process.argv.slice(2);
    if (args.length < 2) {
        console.error("Usage: npx ts-node src/scripts/deleteMessage.ts <CHANNEL_ID> <TIMESTAMP>");
        process.exit(1);
    }

    const channel = args[0];
    const ts = args[1];

    console.log(`Deleting message in channel ${channel} at ts ${ts}...`);

    try {
        await slackClient.chat.delete({
            channel,
            ts,
        });
        console.log("Successfully deleted message.");
    } catch (error: any) {
        console.error("Failed to delete message:", error.message);
        console.error(error);
    }
}

main();
