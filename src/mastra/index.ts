import { Mastra } from "@mastra/core/mastra";
import { resourceAgent } from "./agents/resourceAgent.js";
import { awardAgent } from "./agents/awardAgent.js";
import { personaAgent } from "./agents/personaAgent.js";
import { replyJudgeAgent } from "./agents/replyJudgeAgent.js";
import { dailyDigestWorkflow } from "./workflows/dailyDigestWorkflow.js";

// Mastra インスタンスの定義
export const mastra = new Mastra({
  agents: { resourceAgent, awardAgent, personaAgent, replyJudgeAgent },
  workflows: {
    dailyDigestWorkflow,
  },
});
