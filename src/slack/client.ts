import { WebClient } from "@slack/web-api";

const token = process.env.SLACK_BOT_TOKEN;

if (!token) {
  throw new Error("SLACK_BOT_TOKEN is not set. Please configure it in your .env file.");
}

export const slackClient = new WebClient(token);
