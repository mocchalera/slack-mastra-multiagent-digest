import { slackClient } from "./client.js";
import { ConversationsHistoryResponse } from "@slack/web-api";

// 指定されたチャンネル ID 群から「今日のメッセージ」を取得し、
// シンプルなテキストログとして結合して返す。
//
// ※ 本番で使う場合は:
//   - ワークスペースのタイムゾーンに合わせる
//   - メッセージ量に応じたフィルタリング
//   などの調整が必要です。
export async function fetchDailyLogs(channelIds: string[], targetDate?: Date): Promise<string> {
  // 基準日時（指定がなければ現在時刻＝実行時刻）
  // Cronで 21:00 JST に実行される場合、ここが 21:00 JST になる
  const endTime = targetDate || new Date();

  // 終了時刻 (Unix Timestamp)
  const endTimestamp = endTime.getTime() / 1000;

  // 開始時刻 (24時間前)
  const startTimestamp = endTimestamp - 24 * 60 * 60;

  const oldest = startTimestamp.toString();
  const latest = endTimestamp.toString();

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

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.warn(`[Warning] Failed to fetch logs for channel ${channel}: ${errorMessage}`);
      // Continue to next channel
    }
  }

  return lines.join("\n");
}
