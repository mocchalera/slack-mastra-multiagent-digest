import { slackClient } from "../../slack/client.js";
import { replyAgent } from "../agents/replyAgent.js";
import { replyJudgeAgent } from "../agents/replyJudgeAgent.js";
import { downloadSlackFile } from "../../slack/utils/fileUtils.js";

const userCache = new Map<string, string>();

async function resolveUserName(userId: string): Promise<string> {
    if (!userId) return "Unknown";
    if (userCache.has(userId)) return userCache.get(userId)!;

    try {
        const info = await slackClient.users.info({ user: userId });
        const name = info.user?.profile?.display_name || info.user?.real_name || "Unknown";
        userCache.set(userId, name);
        return name;
    } catch (error) {
        console.error(`[replyService] Failed to resolve user ${userId}:`, error);
        return "Unknown";
    }
}

async function getMessageContent(text: string, files: any[] | undefined): Promise<any> {
    const content: any[] = [{ type: "text", text }];
    if (files) {
        for (const file of files) {
            if (file.mimetype?.startsWith("image/") && file.url_private) {
                try {
                    console.log(`[replyService] Downloading image: ${file.name}`);
                    const imageBuffer = await downloadSlackFile(file.url_private);
                    content.push({ type: "image", image: imageBuffer });
                } catch (error) {
                    console.error(`[replyService] Failed to download image ${file.name}:`, error);
                }
            }
        }
    }
    return content;
}

async function fetchThreadHistory(channel: string, ts: string): Promise<string> {
    try {
        const result = await slackClient.conversations.replies({
            channel,
            ts,
            limit: 10, // Limit context to last 10 messages
        });

        if (!result.messages) return "";

        // Resolve all user names in parallel
        const messages = await Promise.all(result.messages.map(async (msg) => {
            const user = msg.user ? await resolveUserName(msg.user) : "Unknown";
            const text = msg.text || "";
            return `User ${user}: ${text}`;
        }));

        return messages.join("\n");
    } catch (error) {
        console.error(`[replyService] Failed to fetch thread history:`, error);
        return "";
    }
}

// Helper to handle reactions
async function handleReaction(text: string, channel: string, ts: string): Promise<string> {
    const reactionMatch = text.match(/^\[REACTION: :(.+?):\]/);
    if (reactionMatch) {
        const reactionName = reactionMatch[1];
        console.log(`[replyService] Adding reaction: ${reactionName} to ${ts}`);
        try {
            await slackClient.reactions.add({
                channel,
                name: reactionName,
                timestamp: ts,
            });
        } catch (error) {
            console.error(`[replyService] Failed to add reaction ${reactionName}:`, error);
        }
        // Remove the tag from the text
        return text.replace(/^\[REACTION: :.+?:\]\s*/, "");
    }
    return text;
}

export async function handleMention(event: any) {
    const { text, user, channel, ts, thread_ts, files } = event;

    // Determine the thread timestamp.
    // If thread_ts is present, we are in a thread.
    // If not, the message itself (ts) is the start of the thread (or a standalone message).
    const threadTimestamp = thread_ts || ts;

    // Fetch history
    const history = await fetchThreadHistory(channel, threadTimestamp);

    // Remove the mention from text (e.g. <@U12345>)
    const cleanText = text.replace(/<@[^>]+>/g, "").trim();

    const userName = await resolveUserName(user);

    const promptText = `
Current Thread History:
${history}

User ${userName} said: "${cleanText}"
Reply to them based on the context above.
`;

    const content = await getMessageContent(promptText, files);

    // Mastra Agent generate accepts string or message content
    const response = await replyAgent.generate([{ role: "user", content }]);
    let replyText = response.text;

    // Handle Reaction
    replyText = await handleReaction(replyText, channel, ts); // React to the original message (ts), not thread_ts

    await slackClient.chat.postMessage({
        channel,
        text: replyText,
        thread_ts: threadTimestamp,
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

            const userName = await resolveUserName(target.user || "");

            // 1. Judge
            const judgePromptText = `
Post by ${userName}:
"${target.text}"

Should Ai-chan reply to this? Output YES or NO.
`;
            // Pass images to judge as well
            const judgeContent = await getMessageContent(judgePromptText, target.files);

            const judgeResponse = await replyJudgeAgent.generate([{ role: "user", content: judgeContent }]);
            const decision = judgeResponse.text.trim(); // Don't uppercase yet to preserve emoji case if needed, though usually lowercase

            if (decision.startsWith("REACTION:")) {
                const reactionMatch = decision.match(/REACTION: :(.+?):/);
                if (reactionMatch) {
                    const reactionName = reactionMatch[1];
                    console.log(`[replyService] Judge decided to react only: ${reactionName} to ${target.ts}`);
                    try {
                        await slackClient.reactions.add({
                            channel: channelId,
                            name: reactionName,
                            timestamp: target.ts || "",
                        });
                    } catch (error) {
                        console.error(`[replyService] Failed to add reaction ${reactionName}:`, error);
                    }
                }
                continue; // Skip text reply
            }

            if (decision.toUpperCase() !== "YES") {
                console.log(`[replyService] Skipped replying to ${target.ts} (Judge decided: ${decision})`);
                continue;
            }

            // 2. Generate Reply
            const generatePromptText = `
Found an inactive post by ${userName}:
"${target.text}"

Generate a reply to encourage conversation.
`;
            const generateContent = await getMessageContent(generatePromptText, target.files);

            const response = await replyAgent.generate([{ role: "user", content: generateContent }]);
            let replyText = response.text;

            // Handle Reaction
            replyText = await handleReaction(replyText, channelId, target.ts || "");

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
