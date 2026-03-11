# Claude Code プロジェクトルール設定

## プロジェクト概要

**プロジェクト名**: 動画付き自己紹介プラットフォーム
**技術スタック**: NestJS + TypeScript + Prisma + MySQL 8.0 + Vite + React + Tailwind CSS v4
**インフラ**: AWS (EC2, S3, RDS) + Docker (ローカル開発)
**Prismaスキーマ**: `backend/prisma/schema.prisma`
**設計書**: `docs/` 配下（新機能実装・DB変更時は必ず確認）

---

## 言語設定

- **日本語で回答**。コメント・エラーメッセージ・ドキュメントも日本語
- 公開メソッドにはJSDoc（日本語）を記述

---

## コミットメッセージ

フォーマット: `<type>: <subject>`（日本語・体言止め）

| Type | 説明 |
|------|------|
| `feat` | 新機能の追加 |
| `fix` | バグ修正 |
| `refactor` | リファクタリング（機能変更なし） |
| `perf` | パフォーマンス改善 |
| `style` | コードスタイル修正（機能影響なし） |
| `test` | テストの追加・修正 |
| `docs` | ドキュメント更新 |
| `chore` | ビルド・設定ファイルの変更 |
| `security` | セキュリティ対策 |

例: `feat: 動画エンコード機能を実装`

---

## コーディングルール

- ESLint + Prettier に従う
- カスタムCSSファイル作成禁止。Tailwind ユーティリティクラスのみ使用
- APIレスポンスは `{ message: '...', data: ... }` 形式で統一
- コントローラーでは DTO でバリデーション（`body: any` 禁止）
- `dangerouslySetInnerHTML` 使用禁止
- Prisma `$queryRawUnsafe` 使用禁止

---

## データベースルール

- テーブル名: snake_case 複数形（`users`, `profiles`, `videos`）
- カラム名: snake_case（`user_id`, `created_at`）
- TypeScript側: camelCase（Prisma `@@map` / `@map` で変換）
- 外部キー: `{関連テーブル単数}_id`（例: `user_id`, `thumbnail_video_id`）
- **ソフトデリート**: `deletedAt` で論理削除。クエリ時は `deletedAt: null` フィルタを必ず適用
- 設計書: `docs/design-docs/03_database.md`

---

## プロジェクト固有のルール

### 動画処理

- 出力: mp4 (H.264/AAC)、最大1080p
- タイムアウト: 5分/回、リトライ: 最大3回（BullMQ）
- ステータス: `uploading` → `encoding` → `completed` / `failed`
- S3パス: `users/{userId}/encoded/{videoId}.mp4`
- エンコード完了後は元動画を削除
- S3クライアント: `@aws-sdk/client-s3`、MinIO互換（`forcePathStyle: true`）

### 認証・権限

- JWT httpOnly Cookie（`access_token` 15分 + `refresh_token` 7日）
- ペイロード: `{ sub: userId, role: 'user' | 'admin' }`
- bcrypt ラウンド12（Laravel版と統一）
- ガード: `JwtAuthGuard`（認証）、`AdminGuard`（管理者権限）
- 一般ユーザー: 自分のプロフィール・動画のみ編集可能
- 管理者: 全ユーザーのデータを閲覧・編集・削除可能

### バリデーション

| 項目 | ルール |
|------|--------|
| 名前 | 必須、50文字以内 |
| 経歴 | 任意、1000文字以内 |
| 動画ファイルサイズ | 100MB以内 |
| 動画の長さ | 1分以内（ffprobe で検証） |
| 対応フォーマット | mp4, mov, avi, wmv |

### データ互換性

Laravel版と統一: MySQLスキーマ、bcryptハッシュ、S3パス構造

---

## テスト

- バックエンド: Jest + supertest（`backend/test/`）
- フロントエンド: Vitest + React Testing Library（`frontend/src/**/__tests__/`）

---

## 参考ドキュメント

| ドキュメント | パス |
|------------|------|
| 要件定義書 | `docs/requirements/01_requirements.md` |
| アーキテクチャ設計 | `docs/design-docs/02_architecture.md` |
| データベース設計 | `docs/design-docs/03_database.md` |
| サイトマップ | `docs/design-docs/04_sitemap.md` |
| データフロー | `docs/design-docs/05_data_flow.md` |
| ルーティング | `docs/design-docs/06_routing.md` |
| 画面設計 | `docs/design-docs/07_screen_design.md` |
| ステートマシン | `docs/design-docs/08_state_machine_video.md` |
| ER図 | `docs/design-docs/09_er.md` |

---

## 開発環境

### コマンド

```bash
docker compose up -d                          # コンテナ起動
docker compose exec api npx prisma db push    # DBスキーマ同期
docker compose exec api npx prisma generate   # Prisma Client 生成
docker compose exec api npm test              # バックエンドテスト
cd frontend && npm run build                  # フロントエンドビルド
cd frontend && npm run dev                    # フロントエンド開発（HMR）
cd frontend && npx vitest run                 # フロントエンドテスト
```

### DB接続（ローカル）

`localhost:3306` / DB: `movie_prf` / User: `root` / Pass: `password`

---

## その他

- MVP開発中のため破壊的変更は許容
- AWS月額 $30 以下を目標

---

## Playwright MCP使用ルール

- ブラウザ操作は **MCPツール直接呼び出しのみ**（コード実行でのブラウザ操作は禁止）
- エラー時は回避策を探さず即座に報告
