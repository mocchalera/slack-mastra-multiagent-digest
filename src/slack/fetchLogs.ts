import { slackClient } from "./client";
import { ConversationsHistoryResponse } from "@slack/web-api";

// 指定されたチャンネル ID 群から「今日のメッセージ」を取得し、
// シンプルなテキストログとして結合して返す。
//
// ※ 本番で使う場合は:
//   - ワークスペースのタイムゾーンに合わせる
//   - メッセージ量に応じたフィルタリング
//   などの調整が必要です。
export async function fetchTodayLogs(channelIds: string[]): Promise<string> {
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const oldest = (startOfDay.getTime() / 1000).toString();
  const latest = ((startOfDay.getTime() + 24 * 60 * 60 * 1000) / 1000).toString();

  const lines: string[] = [];

  const authRes = await slackClient.auth.test();
  const botUserId = authRes.user_id;

  for (const channel of channelIds) {
    try {
      let cursor: string | undefined = undefined;

      do {
        const res: ConversationsHistoryResponse = await slackClient.conversations.history({
          channel,
          oldest,
          latest,
          limit: 200,
          cursor,
          inclusive: true,
        });

        const messages = res.messages ?? [];

        for (const message of messages as any[]) {
          if (message.type !== "message") continue;
          if (message.subtype) continue; // bot_message 等を除外
          if (!message.user) continue;
          if (message.user === botUserId) continue; // 自分自身の投稿を除外

          const text: string = message.text ?? "";
          const ts: string = message.ts ?? "";
          const userId = message.user;

          // Slack のメッセージリンクを簡易生成 (ワークスペース固有のドメインが必要な場合は要調整だが、archives/ID/pTS で概ね飛べる)
          // ts: 1234567890.123456 -> p1234567890123456
          const linkTs = ts.replace(".", "");
          const permalink = `https://slack.com/archives/${channel}/p${linkTs}`;

          lines.push(`
---
[Message]
User: <@${userId}>
Time: ${ts}
Link: ${permalink}
Content: ${text}
---
`);
        }

        cursor = res.response_metadata?.next_cursor;
      } while (cursor);
    } catch (error: any) {
      console.warn(`[Warning] Failed to fetch logs for channel ${channel}: ${error.message}`);
      // Continue to next channel
    }
  }

  return lines.join("\n");
}
