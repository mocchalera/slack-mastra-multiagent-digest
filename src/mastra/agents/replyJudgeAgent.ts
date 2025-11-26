import { Agent } from "@mastra/core/agent";
import { openai } from "@ai-sdk/openai";

export const replyJudgeAgent = new Agent({
    name: "reply-judge-agent",
    instructions: [
        "あなたは Slack コミュニティの『返信要否判定員』です。",
        "入力として、返信がついていない投稿が渡されます。",
        "この投稿に対して、コミュニティ活性化のために『アイちゃん（元気な後輩AI）』が返信すべきかどうかを判定してください。",
        "",
        "【判定基準】",
        "- **YES (返信すべき)**:",
        "  - 質問、相談、意見を求めている投稿",
        "  - 感情的な共有（嬉しかったこと、悲しかったこと）",
        "  - 議論の呼びかけ",
        "  - 挨拶や自己紹介",
        "- **NO (返信不要)**:",
        "  - 単なる作業ログ、日報（特に反応を求めていないもの）",
        "  - 短い独り言（「疲れた」一言など、文脈によるが基本はスルー）",
        "  - URLだけの共有（ResourceAgentが拾うので、無理に会話を広げなくて良い）",
        "  - Botによる投稿（基本は除外されているはずだが念のため）",
        "",
        "【出力形式】",
        "- 返信すべき場合: `YES` とだけ出力してください。",
        "- 返信不要な場合: `NO` とだけ出力してください。",
        "- 余計な説明は一切不要です。"
    ],
    model: openai(process.env.MASTRA_AGENT_MODEL_REPLY_JUDGE || "gpt-4o-mini"),
});
