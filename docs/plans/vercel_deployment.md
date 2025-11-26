# Vercel デプロイ & 定期実行 (Cron) 実装計画

## 概要
現在ローカルスクリプト (`src/scripts/runDailyDigest.ts`) として動作している日報生成機能を、Vercel の Serverless Function としてデプロイし、Cron Job 機能を使って毎日夜 9 時 (JST) に自動実行できるようにします。

## 変更内容

### 1. ロジックの共通化 (Refactor)
現在の `runDailyDigest.ts` にあるロジック（ログ取得〜生成〜投稿）を、再利用可能な関数として切り出します。

#### [NEW] `src/mastra/services/digestService.ts`
- `generateAndPostDigest(channelIds: string[], digestChannelId: string, persona?: string)` 関数をエクスポート
- `runDailyDigest.ts` の中身をここに移動

#### [MODIFY] `src/scripts/runDailyDigest.ts`
- 新しい `digestService` を呼び出す形に修正（ローカル実行用）

### 2. Vercel API Route の作成
Vercel が認識する `api` ディレクトリを作成し、Cron Job から叩かれるエンドポイントを作ります。

#### [NEW] `api/digest.ts`
- Vercel の Serverless Function
- `GET` リクエストを受け取り、`digestService.generateAndPostDigest()` を実行
- 認証（Vercel Cron の署名検証など）は今回は簡易的に省略するか、必要なら追加（まずは単純な実行を目指す）

### 3. Vercel 設定
Cron Job のスケジュールを設定します。

#### [NEW] `vercel.json`
```json
{
  "crons": [
    {
      "path": "/api/digest",
      "schedule": "0 12 * * *" 
    }
  ]
}
```
※ JST 21:00 = UTC 12:00

## 検証計画

### 自動テスト
- なし（E2Eテストは環境依存が強いため）

### 手動検証
1.  **ローカル実行**: `npm run start:digest` が引き続き動作することを確認（リファクタリングの影響確認）。
2.  **Vercel デプロイ**: ユーザーに GitHub 連携 & Vercel デプロイを依頼。
3.  **Cron テスト**: Vercel のダッシュボードから Cron を手動発火、またはブラウザから `/api/digest` にアクセスして動作確認。
