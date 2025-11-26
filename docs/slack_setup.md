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

## アイちゃん返信機能（メンション＆活性化）のセットアップ

アイちゃんがメンションに即答したり、静かなチャンネルに話しかけたりする機能を有効にするには、以下の設定が必要です。

### 1. Event Subscriptions の設定（メンション返信用）

1. Slack App 管理画面の左側メニュー **"Event Subscriptions"** をクリック。
2. **"Enable Events"** を ON にする。
3. **"Request URL"** に、デプロイした API の URL を入力する。
    - 例: `https://your-project.vercel.app/api/slack/events`
    - 入力すると自動で検証が行われ、成功すると `Verified` と表示されます。
4. **"Subscribe to bot events"** に以下のイベントを追加する。
    - `app_mention`: アイちゃんへのメンションに反応するために必要。
5. 画面下部の **"Save Changes"** をクリック。
6. 左側メニュー **"Basic Information"** に戻り、**"App Credentials"** セクションにある **"Signing Secret"** をコピーする。
7. `.env` (または Vercel の環境変数) に `SLACK_SIGNING_SECRET` として設定する。

### 2. 定期実行の設定（活性化返信用）

返信がついていない投稿にアイちゃんが反応する機能は、Cron ジョブで定期的に実行します。

**Vercel Cron を使用する場合:**
`vercel.json` に以下の設定が含まれていることを確認してください（本プロジェクトには設定済み）。

```json
{
  "crons": [
    {
      "path": "/api/cron/reply_inactive",
      "schedule": "0 * * * *" 
    }
  ]
}
```
※ 上記は「毎時0分」に実行する設定です。頻度は適宜調整してください。

**手動でテストする場合:**
ブラウザや curl で以下の URL にアクセスしてください。
`https://your-project.vercel.app/api/cron/reply_inactive`

