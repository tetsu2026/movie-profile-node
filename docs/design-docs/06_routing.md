# ルーティング設計書（NestJS REST API）

## 概要

- バックエンドはNestJS REST API（グローバルプレフィックス: `/api`）
- フロントエンドはReact SPA（React Router v7でクライアントサイドルーティング）
- 認証はJWT httpOnly Cookie方式（`access_token` + `refresh_token`）

---

## API エンドポイント一覧

### 認証（AuthController）

| メソッド | パス | Guard | 説明 |
|---------|------|-------|------|
| POST | `/api/auth/register` | - | ユーザー登録 |
| POST | `/api/auth/login` | LocalAuthGuard | ログイン |
| POST | `/api/auth/logout` | - | ログアウト（Cookie削除） |
| POST | `/api/auth/refresh` | - | トークンリフレッシュ |
| GET | `/api/auth/me` | JwtAuthGuard | 認証ユーザー情報取得 |
| PUT | `/api/auth/password` | JwtAuthGuard | パスワード更新 |
| DELETE | `/api/auth/me` | JwtAuthGuard | アカウント削除（ソフトデリート） |

---

#### POST /api/auth/register
**レート制限**: 60秒あたり5回
**リクエスト**:
```json
{
  "name": "田中太郎",
  "email": "tanaka@example.com",
  "password": "password123",
  "passwordConfirmation": "password123"
}
```
**成功レスポンス** (201):
- Cookie: `access_token`（15分）、`refresh_token`（7日）
```json
{
  "data": {
    "id": 1,
    "name": "田中太郎",
    "email": "tanaka@example.com",
    "role": "user"
  }
}
```
**失敗**: 409（メール重複）、400（バリデーションエラー、パスワード不一致）

---

#### POST /api/auth/login
**レート制限**: 60秒あたり5回
**リクエスト**:
```json
{
  "email": "tanaka@example.com",
  "password": "password123"
}
```
**成功レスポンス** (200):
- Cookie: `access_token`（15分）、`refresh_token`（7日）
```json
{
  "data": {
    "id": 1,
    "name": "田中太郎",
    "email": "tanaka@example.com",
    "role": "user"
  }
}
```
**失敗**: 401（認証失敗）

---

#### POST /api/auth/logout
**成功レスポンス** (200): Cookie削除
```json
{ "data": { "message": "ログアウトしました" } }
```

---

#### POST /api/auth/refresh
**レート制限**: 60秒あたり10回
**成功レスポンス** (200): 新しいトークンペアをCookieにセット
```json
{ "data": { "message": "トークンを更新しました" } }
```
**失敗**: 401（リフレッシュトークン無効）

---

#### GET /api/auth/me
**Guard**: JwtAuthGuard
**成功レスポンス** (200):
```json
{
  "data": {
    "id": 1,
    "name": "田中太郎",
    "email": "tanaka@example.com",
    "role": "user",
    "emailVerifiedAt": null,
    "createdAt": "2026-01-01T00:00:00.000Z"
  }
}
```

---

#### PUT /api/auth/password
**Guard**: JwtAuthGuard
**リクエスト**:
```json
{
  "currentPassword": "oldpassword",
  "newPassword": "newpassword123"
}
```
**成功レスポンス** (200):
```json
{ "data": { "message": "パスワードを更新しました" } }
```
**失敗**: 401（現在のパスワード不一致）

---

#### DELETE /api/auth/me
**Guard**: JwtAuthGuard
**成功レスポンス** (200): Cookie削除、S3ファイル削除、ソフトデリート
```json
{ "data": { "message": "アカウントを削除しました" } }
```

---

### プロフィール（ProfilesController）

| メソッド | パス | Guard | 説明 |
|---------|------|-------|------|
| GET | `/api/profiles/me` | JwtAuthGuard | 自分のプロフィール取得 |
| PUT | `/api/profiles/me` | JwtAuthGuard | プロフィール更新 |
| GET | `/api/users/:id/profile` | - | 公開プロフィール取得 |

---

#### GET /api/profiles/me
**Guard**: JwtAuthGuard
**成功レスポンス** (200): プロフィール情報（動画情報含む）

---

#### PUT /api/profiles/me
**Guard**: JwtAuthGuard
**リクエスト**:
```json
{
  "name": "田中太郎",
  "biography": "自己紹介文",
  "thumbnailVideoId": 1,
  "popupVideoId": 2,
  "themeColor": "#667eea"
}
```
**失敗**: 400（動画の所有権チェック、エンコード未完了）

---

#### GET /api/users/:id/profile
**認証不要**（公開プロフィール）
**成功レスポンス** (200): 公開プロフィール情報
**失敗**: 404（ユーザーが存在しない、非公開、ソフトデリート済み）

---

### 動画（VideosController）

| メソッド | パス | Guard | 説明 |
|---------|------|-------|------|
| POST | `/api/videos` | JwtAuthGuard | 動画アップロード |
| GET | `/api/videos` | JwtAuthGuard | 動画一覧取得 |
| GET | `/api/videos/:id/status` | JwtAuthGuard | 動画ステータス取得（ポーリング用） |
| DELETE | `/api/videos/:id` | JwtAuthGuard | 動画削除 |

---

#### POST /api/videos
**Guard**: JwtAuthGuard
**Content-Type**: multipart/form-data
**フィールド**: `video`（ファイル）
**制約**: 100MB以下、mp4/mov/avi/wmv
**成功レスポンス** (202): BullMQエンコードキューに追加
```json
{
  "data": {
    "id": 1,
    "originalFilename": "sample.mp4",
    "status": "encoding"
  }
}
```
**失敗**: 400（ファイル未選択、MIMEタイプ不正、サイズ超過）

---

#### GET /api/videos
**Guard**: JwtAuthGuard
**成功レスポンス** (200): 動画一覧 + プロフィールでの使用状況

---

#### GET /api/videos/:id/status
**Guard**: JwtAuthGuard
**成功レスポンス** (200):
```json
{
  "data": {
    "id": 1,
    "status": "completed",
    "errorMessage": null,
    "encodedUrl": "/api/storage/users/1/encoded/1.mp4"
  }
}
```
**失敗**: 404（動画が存在しない、他ユーザーの動画）

---

#### DELETE /api/videos/:id
**Guard**: JwtAuthGuard
**クエリパラメータ**: `forceDelete=true`（プロフィール使用中の動画を強制削除）
**成功レスポンス** (200): S3ファイル削除 + ソフトデリート
**失敗**: 404（存在しない）、403（他ユーザーの動画）、400（使用中で`forceDelete`なし）

---

### ダッシュボード（DashboardController）

| メソッド | パス | Guard | 説明 |
|---------|------|-------|------|
| GET | `/api/dashboard` | JwtAuthGuard | ダッシュボード情報取得 |

---

### 管理者（AdminController）

| メソッド | パス | Guard | 説明 |
|---------|------|-------|------|
| GET | `/api/admin/users` | JwtAuthGuard + AdminGuard | ユーザー一覧（ページネーション付き） |
| GET | `/api/admin/users/:id` | JwtAuthGuard + AdminGuard | ユーザー詳細 |
| PUT | `/api/admin/users/:id` | JwtAuthGuard + AdminGuard | ユーザー情報更新 |
| DELETE | `/api/admin/users/:id` | JwtAuthGuard + AdminGuard | ユーザー削除（S3クリーンアップ + ソフトデリート） |

---

#### GET /api/admin/users
**クエリパラメータ**: `page`（デフォルト: 1）、`limit`（デフォルト: 10）
**成功レスポンス** (200):
```json
{
  "data": {
    "users": [...],
    "pagination": {
      "total": 50,
      "page": 1,
      "limit": 10,
      "totalPages": 5
    }
  }
}
```

---

### ストレージ（StorageController）

| メソッド | パス | Guard | 説明 |
|---------|------|-------|------|
| GET | `/api/storage/*` | - | エンコード済み動画のストリーミング配信 |

**パス制約**: `users/{userId}/encoded/{videoId}.mp4` パターンのみ許可（パストラバーサル防止）

---

### ヘルスチェック（HealthController）

| メソッド | パス | Guard | 説明 |
|---------|------|-------|------|
| GET | `/api/health` | - | サーバーヘルスチェック |

---

## Guard（認証・認可）

### JwtAuthGuard
- httpOnly Cookie (`access_token`) からJWTを取得・検証
- 未認証の場合は401レスポンス
- ペイロード: `{ sub: userId, role: 'user' | 'admin' }`

### AdminGuard
- `JwtAuthGuard` の後に適用
- `role === 'admin'` のチェック
- 権限がない場合は403レスポンス

### LocalAuthGuard
- ログインエンドポイント専用
- email/passwordでPassport Local認証を実行

---

## レスポンス形式

全エンドポイントは `TransformInterceptor` により以下の統一形式で返却:

```json
{
  "data": { ... },
  "statusCode": 200
}
```

エラー時:
```json
{
  "message": "エラーメッセージ",
  "statusCode": 400
}
```

---

## フロントエンド ルーティング（React Router v7）

| パス | コンポーネント | Guard | 説明 |
|------|-------------|-------|------|
| `/` | Home | - | トップページ |
| `/login` | Login | GuestGuard | ログイン |
| `/register` | Register | GuestGuard | ユーザー登録 |
| `/forgot-password` | ForgotPassword | GuestGuard | パスワードリセット（未実装） |
| `/dashboard` | Dashboard | AuthGuard | ダッシュボード |
| `/dashboard/profile` | ProfileEdit | AuthGuard | プロフィール編集 |
| `/dashboard/profile/settings` | ProfileSettings | AuthGuard | アカウント設定 |
| `/dashboard/videos` | VideoList | AuthGuard | 動画一覧 |
| `/dashboard/videos/upload` | VideoUpload | AuthGuard | 動画アップロード |
| `/admin/users` | UserList | AuthGuard (admin) | ユーザー一覧 |
| `/admin/users/:id/edit` | UserEdit | AuthGuard (admin) | ユーザー編集 |
| `/users/:id` | PublicProfile | - | 公開プロフィール |
