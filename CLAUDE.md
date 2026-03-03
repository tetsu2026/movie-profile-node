# Claude Code プロジェクトルール設定

このドキュメントは、Claude Codeがこのプロジェクトで作業する際に従うべきルールと設定を定義します。

---

## プロジェクト概要

**プロジェクト名**: 動画付き自己紹介プラットフォーム
**技術スタック**: NestJS + TypeScript + Prisma + MySQL 8.0 + Vite + React + Tailwind CSS v4
**インフラ**: AWS (EC2, S3, RDS) + Docker (ローカル開発)
**設計書**: `docs/` 配下に要件定義・アーキテクチャ・DB設計などを配置

---

## 言語設定

**基本的に日本語で回答してください**

- コードのコメントは日本語で記述
- エラーメッセージや説明も日本語で提供
- ただし、変数名・関数名・クラス名は英語で命名（NestJS/React規約に準拠）
- ドキュメント生成時も日本語を優先

---

## コミットメッセージフォーマット

コミットメッセージは以下のフォーマットに従ってください。

### フォーマット

```
<type>: <subject>

<body (optional)>
```

### Type（種別）

| Type | 説明 | 例 |
|------|------|------|
| `feat` | 新機能の追加 | `feat: ユーザー登録機能を実装` |
| `fix` | バグ修正 | `fix: 動画アップロード時のタイムアウトエラーを修正` |
| `refactor` | リファクタリング（機能変更なし） | `refactor: VideoService のエンコード処理を整理` |
| `perf` | パフォーマンス改善 | `perf: 動画一覧取得クエリを最適化` |
| `style` | コードスタイル修正（機能影響なし） | `style: ESLint ルールに準拠するよう整形` |
| `test` | テストの追加・修正 | `test: ProfilesController の E2E テストを追加` |
| `docs` | ドキュメント更新 | `docs: README にセットアップ手順を追記` |
| `chore` | ビルド・設定ファイルの変更 | `chore: Docker 設定を更新` |
| `security` | セキュリティ対策 | `security: XSS 対策を強化` |

### 例

```
feat: 動画エンコード機能を実装

fluent-ffmpeg + BullMQ を使用した非同期エンコード処理を追加
- VideoEncoderService クラスを作成
- BullMQ キューで非同期実行
- 失敗時は最大3回リトライ
```

```
fix: プロフィール更新時の動画選択バリデーションエラーを修正

動画IDが存在しない場合のバリデーションルールを追加
```

---

## コーディングスタイルルール

### 1. TypeScript / NestJS（バックエンド）

#### 基本規約

- **ESLint + Prettier** でコードスタイルを統一
- インデント: **2スペース**
- 文字コード: **UTF-8**
- 改行コード: **LF**
- セミコロン: **あり**
- クォート: **シングルクォート**

#### 命名規則

| 対象 | ルール | 例 |
|------|--------|------|
| クラス名 | PascalCase | `VideoController`, `ProfileService` |
| メソッド名 | camelCase | `uploadVideo()`, `encodeVideo()` |
| 変数名 | camelCase | `userId`, `encodedPath` |
| 定数 | UPPER_SNAKE_CASE | `MAX_FILE_SIZE`, `ENCODING_TIMEOUT` |
| ファイル名 | kebab-case | `video.controller.ts`, `profile.service.ts` |
| DTOクラス | PascalCase + Dto | `UpdateProfileDto`, `RegisterDto` |
| データベーステーブル | snake_case（複数形） | `users`, `profiles`, `videos` |
| データベースカラム | snake_case | `user_id`, `created_at`, `encoded_path` |
| TypeScriptプロパティ | camelCase（Prisma @@map で変換） | `userId`, `createdAt`, `encodedPath` |

#### NestJS ベストプラクティス

- **モジュール構成**: 機能単位でモジュール分割（`auth/`, `profiles/`, `videos/` 等）
- **依存性注入**: コンストラクタインジェクションを使用
- **バリデーション**: `class-validator` + `class-transformer` で DTO バリデーション
- **ガード**: `JwtAuthGuard`（認証）、`AdminGuard`（管理者権限）で保護
- **サービスクラス**: ビジネスロジックはサービス層に集約
- **Prisma**: データベース操作は `PrismaService` 経由で実行

#### コメント

```typescript
/**
 * 動画をエンコードしてS3にアップロードする
 *
 * @param video エンコード対象の動画レコード
 * @returns エンコード成功時 true
 * @throws EncodingException エンコード失敗時
 */
async encodeVideo(video: Video): Promise<boolean> {
  // fluent-ffmpeg でエンコード処理を実行
  const result = await this.ffmpeg.encode(video.originalPath);

  return result;
}
```

- JSDoc は公開メソッドに必ず記述
- 複雑なロジックには日本語コメントを追加
- `TODO`, `FIXME`, `NOTE` などのマーカーを活用

### 2. React / TSX（フロントエンド）

#### 基本ルール

- インデント: **2スペース**
- 関数コンポーネント + hooks を使用（クラスコンポーネントは使わない）
- XSS対策: JSX の `{}` は自動エスケープされる。`dangerouslySetInnerHTML` は使用しない
- ファイル名: PascalCase（`VideoThumbnail.tsx`, `PublicProfile.tsx`）

#### ファイル構成

```
frontend/src/
├── pages/                   # ページコンポーネント
│   ├── auth/                # 認証関連（Login, Register 等）
│   ├── dashboard/           # ダッシュボード関連
│   ├── admin/               # 管理者画面
│   ├── Home.tsx
│   └── PublicProfile.tsx
├── components/              # 再利用可能なコンポーネント
│   ├── VideoThumbnail.tsx
│   ├── FullcardVideoPlayer.tsx
│   └── __tests__/           # コンポーネントテスト
├── hooks/                   # カスタムフック
├── api/                     # APIクライアント（axios）
├── contexts/                # AuthContext 等
├── guards/                  # ルート保護（AuthGuard, GuestGuard, AdminGuard）
└── styles/                  # グローバルスタイル
```

#### 例

```tsx
{/* プロフィール表示コンポーネント */}
<div className="profile-container">
  {profile.thumbnailVideoId ? (
    <VideoThumbnail
      src={profile.thumbnailVideo.encodedUrl}
      inline={false}
      themeColor={profile.themeColor}
    />
  ) : (
    <p className="text-gray-500">動画が設定されていません</p>
  )}

  <h1 className="text-2xl font-bold">{profile.name}</h1>
  <p className="whitespace-pre-wrap">{profile.biography}</p>
</div>
```

### 3. Tailwind CSS v4

#### 基本ルール

- クラス名はアルファベット順に並べる
- レスポンシブ対応は `sm:`, `md:`, `lg:` プレフィックスを使用
- カスタムCSSは最小限に抑え、Tailwind ユーティリティクラスを優先
- `@tailwindcss/vite` プラグインで Vite と統合

#### 例

```tsx
<button className="rounded bg-blue-500 px-4 py-2 font-bold text-white hover:bg-blue-700">
  アップロード
</button>
```

#### CSS再ビルドのルール

Tailwind CSS v4 は `@tailwindcss/vite` プラグインで動作しています。

**開発時**: `npm run dev` でホットリロードが有効。クラス追加時に自動反映される。

**本番ビルド**:
```bash
cd frontend && npm run build
```

### 4. データベース（Prisma）

#### スキーマ定義

- スキーマファイル: `backend/prisma/schema.prisma`
- `@@map()` でsnake_caseテーブル名にマッピング
- `@map()` でsnake_caseカラム名にマッピング
- TypeScript側は camelCase で操作

```prisma
model Video {
  id               Int         @id @default(autoincrement())
  userId           Int         @map("user_id")
  originalFilename String      @map("original_filename")
  status           VideoStatus @default(uploading)
  createdAt        DateTime    @default(now()) @map("created_at")
  updatedAt        DateTime    @updatedAt @map("updated_at")
  deletedAt        DateTime?   @map("deleted_at")

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@map("videos")
}
```

#### マイグレーション

- `npx prisma db push` で開発時のスキーマ同期
- `npx prisma migrate dev` でマイグレーション管理

#### ソフトデリート

- `deletedAt` カラムで論理削除を実装
- クエリ時に `deletedAt: null` フィルタを手動で適用
- 削除時は `update({ deletedAt: new Date() })` を使用

---

## 設計原則とベストプラクティス

### 1. デフォルトの標準設定を優先

このプロジェクトでは、**フレームワークやライブラリのデフォルト設定を最大限活用**してください。

#### 適用例

**推奨される実装**
- **Tailwind CSS**: ユーティリティクラスのみで実装し、カスタムCSSファイルは作成しない
- **NestJS**: モジュール・コントローラー・サービスの標準構成に従う
- **Prisma**: 標準の命名マッピング（`@@map`, `@map`）に従う
- **React**: 関数コンポーネント + hooks のパターンに統一

**避けるべき実装**
- カスタムCSSファイル（`custom.css`, `style.css`）の作成
- Tailwind の設定を過度にカスタマイズ（色やサイズの独自定義）
- NestJS の規約を無視した独自のディレクトリ構造
- フレームワークの機能を再実装（車輪の再発明）

#### 理由

- **学習コストの削減**: 標準に従うことで、他の開発者が参加しやすい
- **メンテナンス性**: フレームワークのアップデートに追従しやすい
- **バグの削減**: 実績のあるデフォルト設定は安定している
- **開発速度**: ゼロから作るより既存機能を活用する方が早い

### 2. コードとコミットメッセージの統一性

プロジェクト全体で**一貫性のあるスタイル**を維持してください。

#### コードの統一性

**命名規則の一貫性**
- 変数名: `userId`, `videoPath` のように camelCase で統一
- メソッド名: 動詞で始める（`getUser()`, `createVideo()`, `updateProfile()`）
- クラス名: 単数形で統一（`Video`, `Profile`, `User`）

**コーディングパターンの統一**
```typescript
// 推奨: プロジェクト全体でこのパターンを統一
@Post()
async store(@Body() dto: CreateVideoDto, @Req() req: Request) {
  const video = await this.videosService.create(dto, req.user.id);

  return { message: '動画をアップロードしました', data: video };
}

// 避ける: 別の場所で異なるパターンを使わない
@Post()
async save(@Body() body: any) {
  const video = await this.prisma.video.create({ data: body });

  return video;
}
```

**エラーハンドリングの統一**
```typescript
// プロジェクト全体で同じエラーハンドリングパターンを使用
try {
  await this.videoEncoderService.encode(video);
} catch (error) {
  this.logger.error('動画エンコード失敗', {
    videoId: video.id,
    error: error.message,
  });

  throw new InternalServerErrorException('エンコード処理に失敗しました');
}
```

#### コミットメッセージの統一性

**Type の使い分けを統一**
- 新しいファイル追加 → `feat:`
- 既存機能の修正 → `fix:` または `refactor:`
- テストコード → `test:`
- ドキュメント → `docs:`

**Subject（件名）のスタイル統一**
```bash
# 推奨: 体言止めで統一
feat: ユーザー登録機能を実装
fix: 動画アップロードのバリデーションエラーを修正
refactor: VideoService のエンコード処理を整理

# 避ける: 「〜する」「〜した」などの混在
feat: ユーザー登録機能を実装する
fix: 動画アップロードのバリデーションエラーを修正した
```

#### 統一性チェックポイント

Claude がコードを提案する際は、以下の統一性を確認してください：

- [ ] 既存コードと同じ命名規則を使用しているか
- [ ] 既存コードと同じインデントスタイル（TypeScript/TSX: 2スペース）を使用しているか
- [ ] 既存コードと同じエラーハンドリングパターンを使用しているか
- [ ] 既存コードと同じレスポンス形式（JSON統一レスポンス）を使用しているか
- [ ] コミットメッセージが既存のコミット履歴と同じフォーマットになっているか
- [ ] 同じ機能を実装する際に、別の実装方法を提案していないか

---

## Claude に指摘してほしい観点

### 1. セキュリティ

以下のセキュリティ問題を必ずチェックしてください。

- **XSS (クロスサイトスクリプティング)**: `dangerouslySetInnerHTML` の使用を避ける。JSX の `{}` で自動エスケープ
- **JWT**: httpOnly Cookie に格納。`access_token`（15分）+ `refresh_token`（7日）
- **SQLインジェクション**: Prisma のパラメータ化クエリを使用し、`$queryRawUnsafe` は避ける
- **パスワード**: 必ず `bcrypt`（ラウンド12）でハッシュ化
- **ファイルアップロード**: multer で MIME タイプとファイルサイズを厳格にバリデーション
- **権限チェック**: `JwtAuthGuard`（認証）、`AdminGuard`（管理者権限）で保護
- **S3バケット**: パブリック読み取りは必要最小限に、書き込みは不可に設定
- **セキュリティヘッダー**: `SecurityHeadersMiddleware` で6種のヘッダーを設定

### 2. パフォーマンス

- **N+1問題**: Prisma `include` で Eager Loading を実施
- **不要なクエリ**: Prisma `select` で必要なカラムのみ取得
- **インデックス**: 検索・結合条件のカラムにインデックスを設定
- **キャッシュ**: 頻繁にアクセスするデータは `@CacheTTL()` + Redis を活用
- **動画エンコード**: BullMQ キューで非同期実行

### 3. 冗長なコードの削減

- **DRY原則**: 同じ処理を複数箇所に書かない（サービスクラスやユーティリティに集約）
- **マジックナンバー**: 定数として定義（`MAX_FILE_SIZE = 100 * 1024 * 1024`）
- **条件分岐の簡潔化**: Early Return を活用
- **不要な変数**: 1回しか使わない変数は省略

### 4. エラーハンドリング

- **try-catch**: 外部API呼び出しやファイル操作は必ず try-catch で囲む
- **ログ記録**: NestJS `Logger` でエラー内容を記録
- **統一エラーレスポンス**: `HttpExceptionFilter` で統一フォーマットを返却
- **リトライロジック**: 動画エンコード失敗時は最大3回リトライ（BullMQジョブ設定）

### 5. テスタビリティ

- **依存性注入**: NestJS のコンストラクタインジェクションを活用
- **モック化**: 外部サービス（S3, FFmpeg, BullMQ）はモック可能な設計に
- **バックエンドテスト**: Jest + supertest で E2E テスト（`backend/test/`）
- **フロントエンドテスト**: Vitest + React Testing Library（`frontend/src/**/__tests__/`）

---

## プロジェクト固有のルール

### 1. 動画処理

#### エンコード仕様

- **出力形式**: mp4 (H.264/AAC)
- **最大解像度**: 1080p
- **タイムアウト**: 5分（1回あたり）
- **リトライ**: 最大3回（BullMQ ジョブ設定）
- **ステータス**: `uploading` → `encoding` → `completed` / `failed`
- **処理方式**: BullMQ + Redis で非同期キュー処理

#### ストレージ

- **S3バケット構成**: `users/{userId}/encoded/{videoId}.mp4`
- **削除ポリシー**: エンコード完了後は元動画を削除
- **アクセス権限**: エンコード済み動画のみパブリック読み取り可能
- **S3クライアント**: `@aws-sdk/client-s3`、MinIO互換（`forcePathStyle: true`）

### 2. 認証

- **方式**: JWT httpOnly Cookie（`access_token` + `refresh_token`）
- **ペイロード**: `{ sub: userId, role: 'user' | 'admin' }`
- **アクセストークン有効期限**: 15分
- **リフレッシュトークン有効期限**: 7日
- **bcryptラウンド**: 12（Laravel版と統一）

### 3. ユーザー権限

- **一般ユーザー**: 自分のプロフィール・動画のみ編集可能
- **管理者**: 全ユーザーのデータを閲覧・編集・削除可能
- **ガード**: `JwtAuthGuard`（認証）、`AdminGuard`（管理者権限 `role: 'admin'`）

### 4. バリデーションルール

| 項目 | ルール |
|------|--------|
| 名前 | 必須、50文字以内 |
| 経歴 | 任意、1000文字以内 |
| 動画ファイルサイズ | 100MB以内 |
| 動画の長さ | 1分以内（ffprobe で検証） |
| 対応フォーマット | mp4, mov, avi, wmv |

### 5. データベース命名規則

設計書（`docs/design-docs/03_database.md`）に従ってください。

- テーブル: `users`, `profiles`, `videos`
- 外部キー: `{関連テーブル名}_id`（例: `user_id`, `thumbnail_video_id`）
- ソフトデリート: `deleted_at` カラムを使用
- Prisma `@@map` / `@map` で snake_case DB ↔ camelCase TypeScript を変換

---

## 参考ドキュメント

プロジェクトの詳細は以下のドキュメントを参照してください。

| ドキュメント | パス | 内容 |
|------------|------|------|
| 要件定義書 | `docs/requirements/01_requirements.md` | プロジェクト概要、機能要件、非機能要件 |
| アーキテクチャ設計 | `docs/design-docs/02_architecture.md` | 技術スタック、システム構成、コスト試算 |
| データベース設計 | `docs/design-docs/03_database.md` | テーブル定義、ER図、インデックス設計 |
| サイトマップ | `docs/design-docs/04_sitemap.md` | ページ構成、ユーザーフロー |
| データフロー | `docs/design-docs/05_data_flow.md` | データの流れ、処理フロー |
| ルーティング | `docs/design-docs/06_routing.md` | URL設計、エンドポイント一覧 |
| 画面設計 | `docs/design-docs/07_screen_design.md` | UI/UXデザイン仕様 |
| ステートマシン | `docs/design-docs/08_state_machine_video.md` | 動画エンコード状態遷移 |
| ER図 | `docs/design-docs/09_er.md` | データベースER図 |

**重要**: 新機能実装やDB変更時は、必ず設計書を確認してください。

---

## 開発環境

### ローカル開発

- **Docker Compose** を使用
- MinIO でS3をエミュレート
- MySQL 8.0 コンテナ
- Redis 7 コンテナ（BullMQ + キャッシュ）
- Nginx コンテナ（SPA配信 + API proxy）

### サービス構成

| サービス | コンテナ名 | ポート | 用途 |
|---------|-----------|--------|------|
| api | api | 3000 | NestJS API（Node.js 20 + FFmpeg） |
| web | web | 80 | Nginx（SPA配信 + `/api/*` プロキシ） |
| db | db | 3306 | MySQL 8.0 |
| minio | minio | 9000/9001 | MinIO（S3エミュレータ） |
| redis | redis | 6379 | Redis 7（BullMQ + キャッシュ） |

### コマンド例

```bash
# コンテナ起動
docker compose up -d

# DBスキーマ同期
docker compose exec api npx prisma db push

# Prisma Client 生成
docker compose exec api npx prisma generate

# バックエンドテスト実行
docker compose exec api npm test

# フロントエンドビルド
cd frontend && npm run build

# フロントエンド開発サーバー（HMR）
cd frontend && npm run dev

# フロントエンドテスト実行
cd frontend && npx vitest run
```

### DB接続情報（ローカル）

- ホスト: `localhost:3306`
- DB名: `movie_prf`
- ユーザー: `root`
- パスワード: `password`

---

## コードレビュー時のチェックリスト

Claude がコードを提案する際は、以下を確認してください。

### 基本品質
- [ ] ESLint / Prettier ルールに準拠しているか
- [ ] XSS, SQLインジェクション対策が適切か
- [ ] JWT 認証・認可が適切に設定されているか
- [ ] N+1問題が発生していないか（Prisma `include` を使用）
- [ ] バリデーションルールが設計書通りか（class-validator DTO）
- [ ] エラーハンドリングとログ記録が適切か
- [ ] コメントが日本語で記述されているか
- [ ] マジックナンバーが定数化されているか
- [ ] 不要な変数や冗長な処理がないか
- [ ] テストが必要な箇所にテストコードがあるか
- [ ] 設計書（`docs/`）との整合性が取れているか

### 統一性・標準設定
- [ ] **デフォルト設定を優先**: カスタムCSSやフレームワークの再実装を避けているか
- [ ] **命名規則の統一**: 既存コードと同じ命名パターン（camelCase, PascalCase）を使用しているか
- [ ] **コーディングパターンの統一**: 既存コードと同じ実装パターンを使用しているか
- [ ] **エラーハンドリングの統一**: プロジェクト全体で同じエラー処理パターンを使用しているか
- [ ] **コミットメッセージの統一**: 既存のコミット履歴と同じフォーマット（type: subject）を使用しているか

---

## その他の注意事項

- **絵文字**: ドキュメント内では使用可能ですが、コードやコミットメッセージには基本的に使用しない
- **後方互換性**: 本プロジェクトはMVP開発中のため、破壊的変更も許容されます
- **コスト意識**: AWS リソースは最小限に（月額 $30 以下を目標）
- **スケーラビリティ**: 初期は100ユーザー想定だが、将来の拡張を考慮した設計を心がける
- **データ互換性**: Laravel版と同一MySQLスキーマ、同一bcryptハッシュ、同一S3パス構造を維持

---

## このドキュメントの更新

プロジェクトの進行に伴い、ルールが変更される場合があります。
変更時は必ずこのドキュメントを更新してください。

**最終更新**: 2026-02-27
**更新内容**: Laravel版からNestJS + React版に全面更新


## Playwright MCP使用ルール

### 絶対的な禁止事項

1. **いかなる形式のコード実行も禁止**

   - Python、JavaScript、Bash等でのブラウザ操作
   - MCPツールを調査するためのコード実行
   - subprocessやコマンド実行によるアプローチ

2. **利用可能なのはMCPツールの直接呼び出しのみ**

   - playwright:browser_navigate
   - playwright:browser_screenshot
   - 他のPlaywright MCPツール

3. **エラー時は即座に報告**
   - 回避策を探さない
   - 代替手段を実行しない
   - エラーメッセージをそのまま伝える
