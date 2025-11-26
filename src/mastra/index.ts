import { Mastra } from "@mastra/core/mastra";
import { resourceAgent } from "./agents/resourceAgent";
import { awardAgent } from "./agents/awardAgent";
import { personaAgent } from "./agents/personaAgent";
import { replyJudgeAgent } from "./agents/replyJudgeAgent";
import { dailyDigestWorkflow } from "./workflows/dailyDigestWorkflow";

// Mastra インスタンスの定義
export const mastra = new Mastra({
  agents: { resourceAgent, awardAgent, personaAgent, replyJudgeAgent },
  workflows: {
    dailyDigestWorkflow,
  },
});
