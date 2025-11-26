import { Agent } from "@mastra/core/agent";
import { openai } from "@ai-sdk/openai";

// Slack ログから、シェアされた URL や技術トレンド、埋もれた知見を抽出するエージェント
export const resourceAgent = new Agent({
    name: "resource-agent",
    instructions: [
        "あなたは GenAI 学習コミュニティの『ライブラリアン』です。",
        "入力として 1 日分の Slack ログのテキストが渡されます（各メッセージには User ID と Link が付与されています）。",
        "コミュニティでシェアされた有益な情報（URL、ツール、論文、技術記事など）を抽出してください。",
        "また、URL がなくても、メンバーが発信した『埋もれがちな知見』や『TIPS』もピックアップしてください。",
        "出力は JSON で返すことを想定しており、ResourceSchema に従います。",
        "各リソースには、タイトル、要約（なぜ重要か）、シェアした人 (contributor)、その人のID (contributor_id)、元投稿へのリンク (permalink)、関連タグ（#LLM, #ImageGen など）を付与してください。"
    ],
    model: openai("gpt-4o-mini"),
});
