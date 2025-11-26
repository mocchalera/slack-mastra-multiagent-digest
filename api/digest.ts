import { generateAndPostDigest } from "../src/mastra/services/digestService.js";

export default async function handler(req: any, res: any) {
    try {
        const channelIdsEnv = process.env.SLACK_CHANNEL_IDS;
        const digestChannelId = process.env.SLACK_DIGEST_CHANNEL_ID;
        const persona = process.env.DIGEST_PERSONA || "元気な後輩（アイちゃん）";

        if (!channelIdsEnv || !digestChannelId) {
            return res.status(500).json({ error: "Missing environment variables." });
        }

        const channelIds = channelIdsEnv
            .split(",")
            .map((id) => id.trim())
            .filter(Boolean);

        if (channelIds.length === 0) {
            return res.status(500).json({ error: "SLACK_CHANNEL_IDS is empty." });
        }

        // Vercel Cron からのリクエストかどうかを検証する場合はここにロジックを追加
        // (今回は簡易実装として省略)

        await generateAndPostDigest(channelIds, digestChannelId, persona);

        return res.status(200).json({ success: true, message: "Digest generated and posted." });
    } catch (error: any) {
        console.error("[API] Error:", error);
        return res.status(500).json({ error: error.message });
    }
}
