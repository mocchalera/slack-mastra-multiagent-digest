# アーキテクチャ概要

このプロジェクトは、Slack の 1 日分のログを Mastra のマルチエージェントで分析し、
最終的に 1 本の「日誌」として Slack に投稿する構成になっています。

## コンポーネント

- **Slack ログ取得 (`src/slack/*`)**
  - `@slack/web-api` を使って、指定チャンネルの当日分メッセージを取得
  - チャンネル ID は環境変数 `SLACK_CHANNEL_IDS` から供給

- **Mastra エージェント (`src/mastra/agents/*`)**
  - `topicAgent`: トピック / ストーリーの抽出
  - `decisionTodoAgent`: 決定事項 / TODO 抽出
  - `moodRiskAgent`: ムード / リスク抽出
  - `personaAgent`: 上記の結果を元に、指定のキャラで日誌として整形

- **Mastra ワークフロー (`src/mastra/workflows/dailyDigestWorkflow.ts`)**
  - 入力: `logs`（テキスト化した 1 日分の Slack ログ）, `persona`
  - ステップ1: 3 つの分析エージェントを並列実行し、構造化データを生成
  - ステップ2: personaAgent で最終的な日誌テキストを生成

- **実行スクリプト (`src/scripts/runDailyDigest.ts`)**
  - Slack からログを取得
  - `dailyDigestWorkflow` を実行して日誌を生成
  - `SLACK_DIGEST_CHANNEL_ID` に日誌を投稿

## 技術スタック

- TypeScript
- Mastra (`@mastra/core`, `mastra` CLI)
- Vercel AI SDK (`@ai-sdk/openai`)
- Slack Web API (`@slack/web-api`)
