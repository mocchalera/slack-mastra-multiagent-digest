import { WebClient } from "@slack/web-api";

const token = process.env.SLACK_BOT_TOKEN;

// Token check removed to prevent crash on module load.
// Ensure SLACK_BOT_TOKEN is set in your environment.

export const slackClient = new WebClient(token);
