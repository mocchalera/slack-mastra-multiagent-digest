import { createWorkflow, createStep } from "@mastra/core/workflows";
import { z } from "zod";
import { ResourceSchema, AwardSchema } from "../schemas/digestSchemas";

// dailyDigestWorkflow:
//  - input: logs (1 日分 Slack ログのテキスト), persona
//  - step1: resource / award エージェントで並列分析
//  - step2: personaAgent で日誌テキストに整形

export const dailyDigestWorkflow = createWorkflow({
  id: "daily-digest",
  inputSchema: z.object({
    logs: z.string(),
    persona: z.string().default("元気な後輩（アイちゃん）"),
  }),
  outputSchema: z.object({
    digest: z.string(),
  }),
})
  .then(
    createStep({
      id: "analyze-logs",
      inputSchema: z.object({
        logs: z.string(),
        persona: z.string().default("元気な後輩（アイちゃん）"),
      }),
      outputSchema: z.object({
        resources: ResourceSchema,
        awards: AwardSchema,
        persona: z.string(),
      }),
      async execute({ inputData, mastra }) {
        const { logs, persona } = inputData;

        const resourceAgent = mastra.getAgent("resourceAgent");
        const awardAgent = mastra.getAgent("awardAgent");

        const [resourceRes, awardRes] = await Promise.all([
          resourceAgent.generate(
            [
              {
                role: "user",
                content:
                  "以下は Slack の 1 日分の投稿ログです。有益なリソースや知見を抽出し、ResourceSchema に従った JSON を返してください:\n\n" +
                  logs,
              },
            ],
            {
              structuredOutput: {
                schema: ResourceSchema,
              },
            },
          ),
          awardAgent.generate(
            [
              {
                role: "user",
                content:
                  "以下は Slack の 1 日分の投稿ログです。今日の MVP とベストポストを選出し、AwardSchema に従った JSON を返してください:\n\n" +
                  logs,
              },
            ],
            {
              structuredOutput: {
                schema: AwardSchema,
              },
            },
          ),
        ]);

        return {
          resources: resourceRes.object,
          awards: awardRes.object,
          persona,
        };
      },
    }),
  )
  .then(
    createStep({
      id: "compose-digest",
      inputSchema: z.object({
        resources: ResourceSchema,
        awards: AwardSchema,
        persona: z.string(),
      }),
      outputSchema: z.object({
        digest: z.string(),
      }),
      async execute({ inputData, mastra }) {
        const { resources, awards, persona } = inputData;

        const personaAgent = mastra.getAgent("personaAgent");

        const res = await personaAgent.generate([
          {
            role: "user",
            content: [
              {
                type: "text",
                text: `ペルソナ指定: ${persona}`,
              },
              {
                type: "text",
                text: `
以下の構造化データをもとに、GenAI コミュニティの 1 日の活動をまとめた日報を日本語で作成してください。

[共有されたリソース・知見]
${JSON.stringify(resources, null, 2)}

[アワード (MVP / Best Post)]
${JSON.stringify(awards, null, 2)}

出力フォーマットの例:

【今日の MVP 👑】
（MVP ユーザーの紹介と称賛）

【ベストポスト ✨】
（最も盛り上がった、あるいは有益だった投稿の紹介）

【GenAI トレンド & 共有情報 📚】
（Resource Agent が抽出した URL や知見のリスト）
- [タイトル](URL) by 〇〇センパイ
  ...要約...

【アイちゃんのひとこと】
（全体の感想や、埋もれていたけど気になった情報のピックアップなど）

句読点や文体は、ペルソナのキャラに合わせて自然に調整してください。
                    `.trim(),
              },
            ],
          },
        ]);

        return {
          digest: res.text ?? "",
        };
      },
    }),
  )
  .commit();
