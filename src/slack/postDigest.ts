import { slackClient } from "./client.js";

export async function postDigestMessage(channelId: string, digest: string): Promise<void> {
  await slackClient.chat.postMessage({
    channel: channelId,
    text: digest,
  });
}
