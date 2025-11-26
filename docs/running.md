# 実行方法メモ

## ローカル開発

```bash
npm install
cp .env.example .env
# OPENAI / SLACK の値を設定
```

### 1 日分の日誌を生成して Slack に投稿

```bash
npx ts-node src/scripts/runDailyDigest.ts
```

- `SLACK_CHANNEL_IDS` に指定したチャンネルから当日分メッセージを取得
- Mastra の `dailyDigestWorkflow` を実行
- `SLACK_DIGEST_CHANNEL_ID` に日誌を投稿

## 本番運用のヒント

- Cloud Scheduler / cron から `node dist/...` のように叩く構成
- あるいは Mastra をサーバーとして立てて、
  外部のジョブランナーから HTTP でワークフローを叩く構成 など

このリポジトリはあくまで「最初の骨格」なので、
実際の運用要件に合わせてログのフィルタリングやエラー処理などを拡張してください。
