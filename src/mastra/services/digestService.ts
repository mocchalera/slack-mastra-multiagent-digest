import { mastra } from "../index";
import { fetchTodayLogs } from "../../slack/fetchLogs";
import { postDigestMessage } from "../../slack/postDigest";

export async function generateAndPostDigest(
    channelIds: string[],
    digestChannelId: string,
    persona: string = "元気な後輩（アイちゃん）"
) {
    console.log("[digestService] Fetching logs for channels:", channelIds.join(", "));
    const logs = await fetchTodayLogs(channelIds);

    const workflow = mastra.getWorkflow("dailyDigestWorkflow");
    const run = await workflow.createRunAsync();

    const result = await run.start({
        inputData: {
            logs,
            persona,
        },
    });

    if (result.status === "failed") {
        throw new Error(`Workflow failed: ${result.error.message}`);
    }
    if (result.status !== "success") {
        throw new Error(`Workflow ended with status: ${result.status}`);
    }

    const digest = result.result.digest;
    console.log("[digestService] Digest generated. Posting to Slack channel:", digestChannelId);

    await postDigestMessage(digestChannelId, digest);

    console.log("[digestService] Done.");
    return digest;
}
