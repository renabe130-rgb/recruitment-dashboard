# 採用ダッシュボード（recruitment-dashboard）

株式会社Limeの採用KPI集計・進捗管理ツール。HERP Hire / Google Sheets / Supabase を統合し、月別の採用状況をリアルタイムで可視化する。

- **本番URL**: https://recruitment-dashboard-delta.vercel.app
- **対象**: 採用チーム / 事業部の上長
- **デフォルトPIN**: `1234`

---

## 採用チーム向け 操作ガイド

### ログイン

1. ブラウザで https://recruitment-dashboard-delta.vercel.app を開く
2. PIN「1234」を入力 → ログイン
3. Cookieが7日間有効なので、毎回の再ログインは不要

### 4つのタブの使い方

#### ① KPI進捗

- 月セレクタで「応募 / 一次面接 / 最終面接 / 内定 / 承諾」の数値を表示
- 各KPIカードは職種グループ別の内訳をクリックで展開
- **「⟳ HERP最新を取得」ボタン**
  - HERPから候補者データを取得して数値を最新化
  - 通常はキャッシュ表示のため瞬時表示。最新値が必要な時のみ押す
  - 押下後は24時間キャッシュされる
- 「月別目標」セクションで各職種の月別採用目標を編集可能
- 「目標未設定の職種を非表示」チェックでフィルタ可能（デフォルトはON）

#### ② 採用計画

- Google Sheetsの「採用計画表」と同期
- 内定承諾月でソート、過去は折りたたみ表示
- HERP上で非表示にした行は除外される

#### ③ NA管理

- NA（Not Applicable）案件を手動入力するフォーム
- 担当者 / アクション / 件数 / 期日 を入力
- 完了チェック → 画面から消えて「完了済み」モーダルで確認可能
- 期限超過の項目は赤色で表示される

#### ④ 採用カレンダー

- 最終選考以降の候補者の3種イベントを月カレンダーに表示
  - 青：最終選考予定
  - 黄：承諾期限
  - 緑：入社予定日
- 日程未設定の候補者は別枠で表示

### よくある操作

| 困りごと | 対処 |
|---|---|
| HERPに登録した候補者が表示されない | KPI進捗タブの「⟳ HERP最新を取得」を押す |
| PINを変更したい | Vercel管理画面の環境変数 `DASHBOARD_PASSWORD` を更新 → Redeploy |
| 採用計画表のシート名を変更した | コード側の定数変更が必要なので開発担当に依頼 |
| 数値が違う気がする | 「⟳ HERP最新を取得」で最新化、それでもズレるなら開発担当に連絡 |

---

## 開発者向け 技術ドキュメント

### 技術スタック

- **フレームワーク**: Next.js 16.2.4（Turbopack）+ React 19.2.4 + TypeScript
- **UI**: Tailwind CSS 4 / recharts / lucide-react
- **データ統合**: googleapis / @supabase/supabase-js
- **ホスティング**: Vercel（mainブランチ push で自動デプロイ）

### ⚠ Next.js 16 の重要な注意点

このプロジェクトは Next.js 16系を使用しており、Next.js 14/15系の知識と仕様が異なる。

- ミドルウェアファイルは **`src/proxy.ts`**（`middleware.ts` ではない）
- 詳細は `AGENTS.md` 参照
- 修正前に `node_modules/next/dist/docs/` を必ず確認

### セットアップ

```bash
git clone https://github.com/renabe130-rgb/recruitment-dashboard.git
cd recruitment-dashboard
npm install
# .env.local を作成し、下記の環境変数を設定
npm run dev
# http://localhost:3000 で起動
```

### 環境変数（`.env.local`）

| 変数名 | 用途 |
|---|---|
| `HERP_API_KEY` | HERP Hire APIキー（`gAAAAA...` 形式の120文字） |
| `GOOGLE_SERVICE_ACCOUNT_KEY` | Google Sheets用サービスアカウントJSON（1行string） |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase プロジェクトURL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase Publishable key |
| `DASHBOARD_PASSWORD` | ログインPIN（未設定時は `1234`） |

### ディレクトリ構造

```
src/
├── proxy.ts                  # ミドルウェア（PIN認証ガード）
├── app/
│   ├── page.tsx              # ログイン画面
│   ├── dashboard/            # ダッシュボード本体（4タブ）
│   └── api/                  # API Routes
│       ├── auth/             # PIN認証
│       ├── herp/             # HERP集計 & KPIキャッシュ
│       ├── sheets/           # Google Sheets採用計画
│       ├── na/               # NA管理 CRUD
│       ├── final-stage/      # 最終選考以降の候補者管理
│       └── monthly-targets/  # 月別採用目標
└── lib/
    ├── herp.ts               # HERP APIクライアント
    ├── sheets.ts             # Google Sheetsクライアント
    └── store.ts              # Supabaseアクセサ
```

### データソース構成

| ソース | 役割 |
|---|---|
| HERP Hire API | KPI集計 / 最終選考以降の候補者同期 |
| Google Sheets | 採用計画表 |
| Supabase | NA管理 / 月別目標 / KPIキャッシュ / 最終選考以降の候補者 |

### Supabase テーブル

- `na_items`: NA管理（assignee / action / quantity / deadline / is_valid / raw / completed_at）
- `monthly_targets`: 月別採用目標（month=PRIMARY、data=jsonb）
- `kpi_cache`: HERP集計結果のキャッシュ（month=PRIMARY、TTL 24時間、`force=true` でバイパス）
- `final_stage_candidates`: 最終選考以降の候補者（HERP自動upsert + 手動追加、step後退禁止、hidden_atで非表示制御）

### HERP API の特殊性

- 公式ドキュメント: https://public-api.herp.cloud/hire/public/doc
- ベースURL: `https://public-api.herp.cloud/hire/v1`
- 認証: `Authorization: Bearer <HERP_API_KEY>`
- レート制限: テナント毎 1分100リクエスト。429時は `x-reset-at` まで待機する実装あり
- `/v1/requisitions` のレスポンスには `requisitionGroupId` が含まれない → `/v1/requisition-groups/{id}` の詳細から逆引き必須
- 集計戦略: 当月応募 + 当月stepUpdated の和集合の候補者だけコンタクト取得 → 月別step判定

### 認証

- 4桁 PIN + HttpOnly Cookie（7日間有効）
- `src/proxy.ts` で `/dashboard/*` と `/api/*` をガード
- `/api/auth` のみ素通り（ログイン処理のため）

### デプロイフロー

1. mainブランチに push
2. Vercel が自動的にビルド & デプロイ
3. 環境変数を変更した場合は手動 Redeploy が必要（Vercel管理画面 → Deployments → 最新の「⋯」→ Redeploy）

### デバッグ用エンドポイント

- `GET /api/herp?type=groups`: HERPに登録されている職種グループ一覧
- `GET /api/herp?type=debug`: 求人と職種グループの紐付け状況
