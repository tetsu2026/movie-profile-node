# 動画付き自己紹介プラットフォーム

動画を使った自己紹介ページを作成・共有できるWebアプリケーション。

## 技術スタック

- **バックエンド**: NestJS + TypeScript + Prisma + MySQL 8.0
- **フロントエンド**: Vite + React + Tailwind CSS v4
- **インフラ**: AWS (EC2, S3, RDS) + Docker (ローカル開発)
- **動画処理**: fluent-ffmpeg + BullMQ (Redis)

## ディレクトリ構成

```
├── backend/                   # NestJS API
│   ├── src/
│   │   ├── auth/              # 認証（JWT, ガード）
│   │   ├── profiles/          # プロフィール管理
│   │   ├── videos/            # 動画アップロード・エンコード
│   │   ├── admin/             # 管理者機能
│   │   ├── prisma/            # PrismaService
│   │   └── common/            # 共通（フィルター、ミドルウェア等）
│   ├── prisma/
│   │   └── schema.prisma      # DBスキーマ定義
│   └── test/                  # E2Eテスト
├── frontend/                  # React SPA
│   └── src/
│       ├── pages/             # ページコンポーネント
│       │   ├── auth/          # ログイン、登録
│       │   ├── dashboard/     # ダッシュボード
│       │   └── admin/         # 管理者画面
│       ├── components/        # 再利用可能なコンポーネント
│       ├── hooks/             # カスタムフック
│       ├── api/               # APIクライアント（axios）
│       ├── contexts/          # AuthContext 等
│       └── guards/            # ルート保護
├── docs/                      # 設計書
│   ├── requirements/          # 要件定義
│   └── design-docs/           # アーキテクチャ、DB設計等
└── docker-compose.yml
```

## ローカル開発環境

### サービス構成

| サービス | コンテナ名 | ポート | 用途 |
|---------|-----------|--------|------|
| api | api | 3000 | NestJS API（Node.js 20 + FFmpeg） |
| web | web | 80 | Nginx（SPA配信 + `/api/*` プロキシ） |
| db | db | 3306 | MySQL 8.0 |
| minio | minio | 9000/9001 | MinIO（S3エミュレータ） |
| redis | redis | 6379 | Redis 7（BullMQ + キャッシュ） |

### セットアップ

```bash
# コンテナ起動
docker compose up -d

# DBスキーマ同期
docker compose exec api npx prisma db push

# Prisma Client 生成
docker compose exec api npx prisma generate
```

### DB接続情報

- ホスト: `localhost:3306`
- DB名: `movie_prf`
- ユーザー: `root`
- パスワード: `password`

### 開発コマンド

```bash
# バックエンドテスト
docker compose exec api npm test

# フロントエンド開発サーバー（HMR）
cd frontend && npm run dev

# フロントエンドビルド
cd frontend && npm run build

# フロントエンドテスト
cd frontend && npx vitest run
```

## コーディング規約

### 命名規則

| 対象 | ルール | 例 |
|------|--------|------|
| クラス名 | PascalCase | `VideoController`, `ProfileService` |
| メソッド名 | camelCase | `uploadVideo()`, `encodeVideo()` |
| 変数名 | camelCase | `userId`, `encodedPath` |
| 定数 | UPPER_SNAKE_CASE | `MAX_FILE_SIZE`, `ENCODING_TIMEOUT` |
| ファイル名（バックエンド） | kebab-case | `video.controller.ts` |
| ファイル名（フロントエンド） | PascalCase | `VideoThumbnail.tsx` |
| DTOクラス | PascalCase + Dto | `UpdateProfileDto` |
| DBテーブル | snake_case（複数形） | `users`, `profiles`, `videos` |
| DBカラム | snake_case | `user_id`, `created_at` |

### コードスタイル

- ESLint + Prettier で統一（2スペース、セミコロンあり、シングルクォート）
- NestJS: モジュール・コントローラー・サービスの標準構成
- React: 関数コンポーネント + hooks（クラスコンポーネント禁止）
- Tailwind CSS: ユーティリティクラスのみ使用（カスタムCSS禁止）

## 設計書

`docs/` 配下に配置。詳細は各ファイルを参照。

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
