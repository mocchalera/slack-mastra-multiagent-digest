# Slack Daily Digest (Mastra Multi-Agent)

Slack ワークスペースの 1 日分の投稿を横断的に集約し、
Mastra ベースのマルチエージェントで分析して日誌として投稿するためのリポジトリです。

- エージェントは TypeScript + Mastra で実装
- Slack から当日分メッセージを取得
- トピック / 決定事項・TODO / ムード・リスク を別エージェントで分析
- 最後にペルソナ付きの「編集長」エージェントが日誌として整形

## セットアップ（ざっくり）

```bash
npm install

# .env を作成
cp .env.example .env
# OPENAI_API_KEY / SLACK_BOT_TOKEN / SLACK_CHANNEL_IDS / SLACK_DIGEST_CHANNEL_ID を設定
```

### 日次ダイジェストをローカルから 1 回実行

```bash
npx ts-node src/scripts/runDailyDigest.ts
```

（本番環境では cron / Cloud Scheduler などからこのスクリプトを叩く想定です）

詳細は `docs/` 以下を参照してください:

- `docs/architecture.md` : 全体アーキテクチャ
- `docs/agents.md` : 各エージェントの役割
- `docs/workflow.md` : dailyDigest ワークフローの流れ
- `docs/slack_setup.md` : Slack アプリのセットアップ手順
- `docs/running.md` : ローカル実行と本番運用のメモ
