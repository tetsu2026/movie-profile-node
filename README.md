# 動画プロフィール（NestJS・React版）

動画を使った自己紹介ページを作成・公開できる Web サービス。
**Laravel版**（[movie-profile](https://github.com/tetsu2026/movie-profile)）の**同一サービスを
NestJS + React で再構築**したもので、本番では**同一の RDS PostgreSQL を共有**しています。

🔗 **デモ**: https://node.hozu.click/

> NestJS + TypeScript + Prisma 6 / React（Vite）/ AWS（CloudFront・ECS on EC2・S3）

## デモ

### 動作確認用アカウント

動作確認用アカウントは、応募書類（職務経歴書「個人開発」の項）に記載しています。

> Laravel版・NestJS版は **同一アカウントでログイン可能**です（DB共有のため）。

## 主な機能

- ユーザー登録・ログイン（JWT / httpOnly Cookie）
- プロフィール作成と**公開ページ**の表示
- **動画アップロード → 自動エンコード**（H.264 / 最大1080p / mp4）
- 動画つきプロフィールの公開
- 管理者によるユーザー・動画の管理

## 技術スタック

- **バックエンド**: NestJS + TypeScript + Prisma 6
- **フロントエンド**: Vite + React + Tailwind CSS v4（SPA）
- **データベース**: PostgreSQL（Laravel版と共有）
- **認証**: Passport.js + JWT（httpOnly Cookie）。Laravel互換 bcrypt（`$2y$`↔`$2b$`）
- **動画処理**: fluent-ffmpeg + BullMQ（Redis）
- **ストレージ**: AWS S3（`@aws-sdk/client-s3` / ローカルは MinIO）
- **インフラ**: AWS（CloudFront・ECS on EC2・ECR・RDS・S3）/ ローカルは Docker Compose

## アーキテクチャ（本番 / AWS）

```
ユーザー
  │  HTTPS（node.hozu.click）
  ▼
CloudFront（ACM us-east-1）
  ├─ /*     → S3（SPA静的ファイル / movie-prf-spa）※キャッシュ
  └─ /api/* → EC2 host nginx（SSL終端）
                 └─ :8081 → ECS タスク nodejs-api
                              ▼
   ┌──────────── 共有 / EC2 ────────────┐
   │ RDS PostgreSQL             │ ← Laravel版と共有
   │ S3（動画オリジナル/エンコード済）│
   │ ECR（コンテナイメージ）        │
   │ Redis（EC2ホストに直接インストール / BullMQ専用）│
   └─────────────────────────────────────┘
```

- **フロント**: SPA は S3 に配置し CloudFront 経由で配信。`/api/*` のみ EC2 の host nginx → `nodejs-api`（:8081）に転送。
- **ECS on EC2**: クラスタ `movie-prf`（Laravel版と同一）上で `nodejs-api` タスクが稼働。
- **Redis**: 本番は**コンテナではなく EC2 ホストに直接インストール**（systemd 管理 / maxmemory 64mb）。BullMQ 専用。

## 工夫した点・技術的こだわり

- **Laravel版の同一サービスを NestJS + React で再構築**し、本番で **RDS PostgreSQL を共有**。設計から本番運用・CI/CDまで一人で構築。
- **Laravel互換 bcrypt（`$2y$`↔`$2b$`）**を実装し、**両版で同一アカウントをログイン可能**に。スキーマは Laravel migration を主導とし、Prisma は `prisma db pull` で追従。
- **CloudFront で配信を最適化**：`/*` は S3 の SPA をキャッシュ配信、`/api/*` のみ EC2 へ分岐させて**静的配信とAPIを分離**。
- **GitHub Actions（OIDC・鍵レス）で自動デプロイ**：永続アクセスキーを持たず、短命の一時クレデンシャルで ECR/ECS・S3/CloudFront を更新。
- **BullMQ（Redis）で動画エンコードを非同期化**。Redis はコスト最適化のため EC2 ホストに軽量構成で同居。

### デプロイ（GitHub Actions / OIDC）

| ワークフロー | 対象 | 概要 |
|------------|------|------|
| `deploy-backend.yml` | API | テスト → ECR（`movie-prf-node`）push → ECS（`nodejs-api-service`）更新・安定化待機 |
| `deploy-frontend.yml` | SPA | Vite ビルド → S3（`movie-prf-spa`）sync → CloudFront invalidation |
| `stop-rds.yml` | RDS | コスト対策の RDS 停止 |

## ローカル開発

```bash
git clone https://github.com/tetsu2026/movie-profile-node.git
cd movie-profile-node
docker compose up -d

docker compose exec api npx prisma db push     # ローカルはスキーマ同期に db push
docker compose exec api npx prisma generate
```

- アプリ: http://localhost:8080 ／ MinIO 管理画面: http://localhost:9003（minioadmin / minioadmin）

| サービス | ポート | 用途 |
|---------|--------|------|
| api | 3000 | NestJS API（Node.js 20 + FFmpeg） |
| web | 8080 | Nginx（SPA配信 + `/api/*` プロキシ） |
| db | 5433 | PostgreSQL 16 |
| minio | 9002 / 9003 | S3 エミュレータ |
| redis | 6379 | Redis 7（BullMQ） |

## ディレクトリ構成

```
├── backend/              # NestJS API（auth / profiles / videos / admin / prisma）
│   └── prisma/schema.prisma   # prisma db pull で Laravel に追従
├── frontend/             # React SPA（pages / components / hooks / api / contexts）
├── deploy/               # 本番セットアップ（setup.sh / nginx 等）
├── docs/                 # 設計書（Laravel版から引き継ぎ）
├── .github/workflows/    # OIDC デプロイ（backend / frontend）
└── docker-compose.yml    # ローカル開発用
```

## 設計書

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

## 作者

- GitHub: [@tetsu2026](https://github.com/tetsu2026)
