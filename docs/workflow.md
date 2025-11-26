# ワークフロー設計 (`dailyDigestWorkflow`)

`dailyDigestWorkflow` は、Mastra のワークフローで次の 2 ステップ構成になっています。

## 入力 / 出力

- 入力 (`inputSchema`):
  - `logs: string` — テキスト化された 1 日分の Slack ログ
  - `persona: string` — 日誌の文体・キャラ（例: "新聞記者"）

- 出力 (`outputSchema`):
  - `digest: string` — Slack に投稿する最終日誌テキスト

## Step 1: 分析エージェントを並列実行

- `topicAgent`, `decisionTodoAgent`, `moodRiskAgent` を `Promise.all` で並列実行
- それぞれ Zod スキーマで定義された構造化 JSON を返す
- 出力:
  - `topics` (TopicSchema)
  - `decisions` (DecisionTodoSchema)
  - `moodAndRisks` (MoodRiskSchema)
  - `persona` (そのまま引き継ぎ)

## Step 2: PersonaAgent で日誌に整形

- 入力:
  - Step 1 の構造化 JSON 3 つ
  - `persona`
- `personaAgent` に対して、JSON を文字列化して渡し、
  セクション構成と文体のルールを指定して日誌テキストを生成

## 期待する日誌フォーマット例

```text
【本日のハイライト】
- ...

【プロジェクト・トピック別】
- ...

【決定事項】
- ...

【TODO / フォローアップ】
- ...

【ムード・リスク】
- ...
```

このフォーマットは `personaAgent` のプロンプトを編集することで自由に変えられます。
