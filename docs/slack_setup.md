# Slack アプリのセットアップ

このプロジェクトは Slack Web API を使ってログ取得・投稿を行います。
ざっくり必要な手順は以下の通りです。

1. https://api.slack.com/apps で新しいアプリを作成
2. **左側メニューの "App Home" をクリックし、"App Display Name" の "Edit" から Bot の名前を設定する**
   - ※ これを行わないと、インストール時に「ボットユーザーがありません」というエラーになります。
3. OAuth & Permissions で以下のスコープを追加（例）
   - `channels:read`
   - `channels:history`
   - `groups:read` / `groups:history`（必要なら）
   - `chat:write`
3. アプリをワークスペースにインストールして Bot Token を取得
4. Bot を日誌対象チャンネルと、日誌投稿先チャンネルに招待
5. `.env` に以下を設定
   - `SLACK_BOT_TOKEN`
   - `SLACK_CHANNEL_IDS`（カンマ区切りのチャンネル ID）
   - `SLACK_DIGEST_CHANNEL_ID`

実運用では、Slack イベント API や Scheduled Trigger などと組み合わせて
ワークスペース側から定期的に実行することも可能です。
