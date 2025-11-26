```typescript
import { mastra } from "../index";
import { fetchDailyLogs } from "../../slack/fetchLogs";
import { postDigestMessage } from "../../slack/postDigest";

export async function generateAndPostDigest(
    channelIds: string[],
    digestChannelId: string,
    persona: string = "元気な後輩（アイちゃん）"
) {
  // 実行時刻（現在）を基準に、過去24時間分を取得する
  console.log(`[digestService] Fetching logs for past 24 hours from now...`);
  const logs = await fetchDailyLogs(channelIds);

    const workflow = mastra.getWorkflow("dailyDigestWorkflow");
    const run = await workflow.createRunAsync();

    const result = await run.start({
        inputData: {
            logs,
            persona,
        },
    });

    if (result.status === "failed") {
        throw new Error(`Workflow failed: ${ result.error.message } `);
    }
    if (result.status !== "success") {
        throw new Error(`Workflow ended with status: ${ result.status } `);
    }

    const digest = result.result.digest;
    console.log("[digestService] Digest generated. Posting to Slack channel:", digestChannelId);

    await postDigestMessage(digestChannelId, digest);

    console.log("[digestService] Done.");
    return digest;
}
