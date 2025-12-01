import { slackClient } from "../../slack/client.js";
import { replyAgent } from "../agents/replyAgent.js";
import { replyJudgeAgent } from "../agents/replyJudgeAgent.js";
import { downloadSlackFile } from "../../slack/utils/fileUtils.js";
import { replyHistoryService } from "./replyHistoryService.js";

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

                    // Convert Buffer to Base64 Data URL
                    const base64Image = imageBuffer.toString('base64');
                    const dataUrl = `data:${file.mimetype};base64,${base64Image}`;

                    content.push({ type: "image", image: dataUrl });
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

async function shouldReplyToThread(channel: string, ts: string, botUserId: string): Promise<boolean> {
    try {
        const result = await slackClient.conversations.replies({
            channel,
            ts,
            limit: 10, // Check last few messages
        });

        const messages = result.messages;
        if (!messages || messages.length === 0) return false;

        // If only 1 message (the parent itself), it's a candidate (no replies yet)
        if (messages.length === 1) {
            return true;
        }

        // If there are replies:
        const lastMsg = messages[messages.length - 1];

        // 1. Check if last message is from Bot (Prevent consecutive AI replies)
        if (lastMsg.user === botUserId) {
            // console.log(`[replyService] Skipping ${ts}: Last reply was by me.`);
            return false;
        }

        // 2. Check if last message is old enough (> 6 hours)
        const lastTs = parseFloat(lastMsg.ts || "0");
        const now = Date.now() / 1000;
        if (now - lastTs < 6 * 60 * 60) {
            // console.log(`[replyService] Skipping ${ts}: Last reply was too recent (${((now - lastTs)/3600).toFixed(1)}h ago).`);
            return false;
        }

        return true;
    } catch (error) {
        console.error(`[replyService] Failed to verify thread inactivity for ${ts}:`, error);
        return false;
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
Reply to them based on the context above. Ensure you do not repeat points already made in the history. Maintain the flow and rhythm of the conversation.
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
    // Night time check (00:00 - 06:00 JST)
    const jstHour = parseInt(new Date().toLocaleString("en-US", { timeZone: "Asia/Tokyo", hour: "numeric", hourCycle: "h23" }));
    if (jstHour >= 0 && jstHour < 6) {
        console.log(`[replyService] Sleeping time (Current JST hour: ${jstHour}). Skipping.`);
        return;
    }

    console.log("[replyService] Checking for inactive posts...");
    await replyHistoryService.init();

    // Get Bot User ID to prevent consecutive replies
    let botUserId = "";
    try {
        const auth = await slackClient.auth.test();
        botUserId = auth.user_id || "";
    } catch (e) {
        console.error("[replyService] Failed to get bot user id:", e);
        return;
    }

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

                // Ignore very old messages (older than 24h)
                const ts = parseFloat(msg.ts || "0");
                const now = Date.now() / 1000;
                if (now - ts > 24 * 60 * 60) return false;

                // Check replies
                if (msg.reply_count && msg.reply_count > 0) {
                    // If it has replies, check if the LAST reply was > 6 hours ago
                    // Note: latest_reply is the timestamp of the last reply
                    const lastReplyTs = parseFloat(msg.latest_reply || "0");
                    if (now - lastReplyTs < 6 * 60 * 60) {
                        return false; // Too active
                    }
                    // If > 6 hours, it's a candidate (we will check WHO replied last in shouldReplyToThread)
                }

                // Note: We REMOVED the check for replyHistoryService.hasRepliedToThread(msg.ts!)
                // to allow re-replying if the conversation stalled again.

                return true;
            });

            if (candidates.length === 0) {
                console.log(`[replyService] No inactive posts found in channel ${channelId}`);
                continue;
            }

            // Shuffle candidates
            const shuffled = candidates.sort(() => 0.5 - Math.random());

            let target: any = null;

            // Find a truly inactive one
            for (const candidate of shuffled) {
                // Note: We REMOVED the user rate limit check (shouldReplyToUser)

                const shouldReply = await shouldReplyToThread(channelId, candidate.ts!, botUserId);
                if (shouldReply) {
                    target = candidate;
                    break;
                }
            }

            if (!target) {
                console.log(`[replyService] No truly inactive posts found in channel ${channelId} (after verification)`);
                continue;
            }

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
            const decision = judgeResponse.text.trim();

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
            const nowJST = new Date().toLocaleString("ja-JP", { timeZone: "Asia/Tokyo" });

            // Fetch thread history for context if it exists
            const threadHistory = await fetchThreadHistory(channelId, target.ts!);

            const generatePromptText = `
Current Time: ${nowJST}

Thread History:
${threadHistory}

Found an inactive post by ${userName}:
"${target.text}"

Generate a reply to encourage conversation.
- Consider the current time of day for your greeting (e.g., "Good morning", "Good evening").
- Avoid repeating the same phrases.
- Be specific to the content of the post.
`;
            const generateContent = await getMessageContent(generatePromptText, target.files);

            const response = await replyAgent.generate([{ role: "user", content: generateContent }]);
            let replyText = response.text;

            // Handle Reaction
            replyText = await handleReaction(replyText, channelId, target.ts || "");

            // FINAL CHECK: Verify inactivity again before posting
            await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000));

            const isStillInactive = await shouldReplyToThread(channelId, target.ts!, botUserId);
            if (!isStillInactive) {
                console.log(`[replyService] Aborting reply to ${target.ts} - thread became active during generation.`);
                continue;
            }

            await slackClient.chat.postMessage({
                channel: channelId,
                text: replyText,
                thread_ts: target.ts,
            });

            // Mark as replied in persistent history (still useful for tracking, even if we don't block)
            await replyHistoryService.markReplied(target.ts!, target.user!);

            console.log(`[replyService] Replied to ${target.ts}`);

            // Limit to 1 reply per run per channel
        } catch (error) {
            console.error(`[replyService] Error processing channel ${channelId}:`, error);
        }
    }
}
