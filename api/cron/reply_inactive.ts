import { checkAndReplyInactive } from '../../src/mastra/services/replyService.js';

export default async function handler(req: any, res: any) {
    try {
        const channelIdsEnv = process.env.SLACK_CHANNEL_IDS;
        if (!channelIdsEnv) {
            return res.status(500).json({ error: "Missing SLACK_CHANNEL_IDS" });
        }
        const channelIds = channelIdsEnv.split(",").map((id) => id.trim()).filter(Boolean);

        await checkAndReplyInactive(channelIds);

        return res.status(200).json({ success: true });
    } catch (error: any) {
        console.error(error);
        return res.status(500).json({ error: error.message });
    }
}
