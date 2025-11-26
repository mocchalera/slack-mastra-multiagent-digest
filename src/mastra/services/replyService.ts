import { slackClient } from "../../slack/client";
import { replyAgent } from "../agents/replyAgent";

export async function handleMention(event: any) {
    const { text, user, channel, ts, thread_ts } = event;

    // Remove the mention from text (e.g. <@U12345>)
    const cleanText = text.replace(/<@[^>]+>/g, "").trim();

    const prompt = `
User <@${user}> said: "${cleanText}"
Reply to them.
`;

    const response = await replyAgent.generate(prompt);
    const replyText = response.text;

    await slackClient.chat.postMessage({
        channel,
        text: replyText,
        thread_ts: thread_ts || ts, // Reply in thread if it was a thread, or start a thread
    });
}

export async function checkAndReplyInactive(channelIds: string[]) {
    console.log("[replyService] Checking for inactive posts...");
    for (const channelId of channelIds) {
        try {
            const history = await slackClient.conversations.history({
                channel: channelId,
                limit: 20,
            });

            if (!history.messages) continue;

            const candidates = history.messages.filter((msg) => {
                // Ignore bots
                if (msg.bot_id || msg.subtype === "bot_message") return false;
                // Ignore messages with replies
                if (msg.reply_count && msg.reply_count > 0) return false;
                // Ignore very old messages (older than 24h)
                const ts = parseFloat(msg.ts || "0");
                const now = Date.now() / 1000;
                if (now - ts > 24 * 60 * 60) return false;

                return true;
            });

            if (candidates.length === 0) {
                console.log(`[replyService] No inactive posts found in channel ${channelId}`);
                continue;
            }

            // Pick the most recent one
            const target = candidates[0];

            console.log(`[replyService] Found inactive post by ${target.user}: ${target.text}`);

            const prompt = `
Found an inactive post by <@${target.user}>:
"${target.text}"

Generate a reply to encourage conversation.
`;

            const response = await replyAgent.generate(prompt);
            const replyText = response.text;

            await slackClient.chat.postMessage({
                channel: channelId,
                text: replyText,
                thread_ts: target.ts,
            });

            console.log(`[replyService] Replied to ${target.ts}`);

            // Limit to 1 reply per run per channel to avoid spam
            // We can remove this break if we want to reply to all, but safer to start slow
        } catch (error) {
            console.error(`[replyService] Error processing channel ${channelId}:`, error);
        }
    }
}
