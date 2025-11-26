# エージェント設計

このプロジェクトでは、Slack ログを別々の観点で分析するために 4 つのエージェントを用意しています。

## TopicAgent (`topicAgent`)

- 役割: その日話された主なトピックを抽出し、簡潔な要約をつける
- 出力イメージ:
  - `title`: トピック名
  - `summary`: 2〜3 文程度の説明
  - `channels`: 関連チャンネルの候補
  - `importance`: 0〜1 の重要度スコア（任意）

## DecisionTodoAgent (`decisionTodoAgent`)

- 役割: 決定事項と TODO を構造化して抽出
- 出力イメージ:
  - `decisions[]`: 何が決まったか、どのチーム・誰に関係するか
  - `todos[]`: 誰が、何を、いつまでにやるのか（分かる範囲で）

## MoodRiskAgent (`moodRiskAgent`)

- 役割: チーム全体のムードと、潜在的なリスクや詰まりポイントを抽出
- 出力イメージ:
  - `mood.overall`: 全体の雰囲気（例: slightly_positive）
  - `mood.notes[]`: 気づき・観察メモ
  - `risks[]`: リスクの概要・関連チャンネル・深刻度など

## PersonaAgent (`personaAgent`)

- 役割: 他の 3 エージェントの構造化出力と `persona` を入力に取り、
  1 本の「読みやすい日誌」として文章化する編集長。
- ペルソナ例:
  - 新聞記者
  - フランクな先輩
  - マネージャー寄りの視点 など

実際のプロンプト文は `src/mastra/agents/*.ts` に記載されています。
キャラ付けや切り口を変えたくなった場合は、ここをいじるのが基本です。
