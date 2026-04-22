# Issue #28: PostgreSQL への移行（MySQL 廃止）

## 背景 / 目的

Node.js 版は Laravel 版と設計書を共有しており、Laravel 版が PostgreSQL 単一 DB 構成へ移行した（チャットボット実装時に導入した pgvector 接続を本体に統合）ため、Node.js 版も整合性のため DB エンジンを PostgreSQL に統一する。

- Laravel 版はチャットボット RAG（pgvector）とアプリ本体を 1 DB に統合するという強い動機があったが、Node.js 版は **チャットボット未導入** のため、移行目的は主に「設計書・運用コスト・環境の統一」
- MVP 段階なので Prisma の初期マイグレーションをリセットし、PostgreSQL で再生成する

- **依存**: #3（DB スキーマ作成、Prisma init 完了）
- **ラベル**: backend, infrastructure, database

---

## スコープ / 作業項目

### 1. Prisma スキーマ変更

- `backend/prisma/schema.prisma`
  - `datasource db` の `provider = "mysql"` → `"postgresql"` に変更
  - 型の見直し（全て既存定義のままで PostgreSQL に対応可能）
    - `@db.VarChar(N)` → PostgreSQL `varchar(N)`
    - `@db.Text` → PostgreSQL `text`
    - `Json?`（`videoOrder`）→ PostgreSQL `jsonb`（Prisma 6 デフォルト）
    - `BigInt?`（`fileSize`）→ PostgreSQL `bigint`
    - `enum UserRole` / `VideoStatus` → PostgreSQL ネイティブ enum 型（`@@map` で命名維持）

### 2. 既存マイグレーションのリセット

- `backend/prisma/migrations/20260226053615_init/` を削除（MySQL 構文のため再利用不可）
- `backend/prisma/migrations/migration_lock.toml` の `provider` を `postgresql` に変更
- Note: `backend/prisma/migrations/` は `.gitignore` 対象のため、各環境で `prisma migrate dev --name init` を実行して再生成する

### 3. Docker Compose の DB 変更

- `docker-compose.yml`
  - MySQL サービス定義を削除
  - `postgres:16` イメージに差し替え
  - ヘルスチェックを `mysqladmin ping` → `pg_isready` に変更
  - ポートマッピング: `5433:5432`（ホスト側 5433 でバッティング回避）
  - ボリューム: 旧 MySQL ボリューム `db_data` は破棄、新規ボリュームに統一（`docker compose down -v` 必須）
  - api コンテナの `DATABASE_URL` 環境変数を `postgresql://...` 形式に変更

### 4. 環境変数の更新

- `backend/.env.example`: `DATABASE_URL=postgresql://movie_prf:password@db:5432/movie_prf`
- `backend/.env.production.example`: 同上形式に更新
- `backend/.env.test`: `postgresql://.../movie_prf_test`

### 5. デプロイスクリプト

- `deploy/deploy.sh`: エラーメッセージ内の URL 例を `mysql://` → `postgresql://` に変更

### 6. リセット手順（ローカル）

```bash
cd backend
rm -rf prisma/migrations/20260226053615_init
# schema.prisma の provider を変更
cd ..
docker compose down -v
docker compose up -d db
cd backend
npx prisma migrate dev --name init
npx prisma generate
cd ..
docker compose up -d
```

---

## ゴール / 完了条件（Acceptance Criteria）

- [x] `schema.prisma` の `provider` が `postgresql` である
- [x] `migration_lock.toml` の `provider` が `postgresql` である
- [x] `docker-compose.yml` の DB サービスが `postgres:16` で `pg_isready` ヘルスチェック付きで定義されている
- [x] `.env.example` / `.env.production.example` / `.env.test` の `DATABASE_URL` が `postgresql://` 形式
- [x] `deploy/deploy.sh` の URL 例が PostgreSQL 形式
- [ ] ローカルで `docker compose down -v && docker compose up -d db && npx prisma migrate dev --name init && docker compose up -d` が成功する
- [ ] `npx prisma migrate deploy` で PostgreSQL に対してマイグレーションが適用される
- [ ] `npm run test:e2e` が全件パスする
- [ ] 手動検証: 登録 → ログイン → プロフィール作成 → 動画アップロード → エンコード → 公開プロフィール閲覧が一貫動作する

---

## テスト観点

### ローカル環境クリーンビルド

```bash
docker compose down -v
docker compose up -d db
sleep 10
cd backend && npx prisma migrate dev --name init && npx prisma generate
cd .. && docker compose up -d
```

### スキーマ確認

```bash
docker compose exec api npx prisma db pull --print
docker compose exec db psql -U movie_prf -d movie_prf -c "\dt"
docker compose exec db psql -U movie_prf -d movie_prf -c "\d users"
docker compose exec db psql -U movie_prf -d movie_prf -c "\d videos"
docker compose exec db psql -U movie_prf -d movie_prf -c "\d profiles"
```

### E2E テスト

```bash
docker compose exec api npm run test:e2e
```

### ヘルスチェック・動作確認

```bash
curl http://localhost:3000/health
# http://localhost:8080 で UI 動作確認（登録→動画アップロード）
```

---

## 課題確認事項

- **`BigInt`**: Prisma 6 は PostgreSQL で `bigint` にマップされるが、`JSON.stringify` で変換が必要なため API 応答時の型に注意
- **`jsonb` 移行**: 従来 `Json` は MySQL で `longtext` 格納だったが、PostgreSQL では `jsonb` になる。検索性能は向上するが、`videoOrder` は単純な配列保存のため実害なし
- **enum 型**: Prisma は PostgreSQL のネイティブ enum を生成する。値追加時は `prisma migrate dev` で新規マイグレーションが必要
- **Redis / MinIO / BullMQ**: DB 変更の影響なし。動作確認のみ実施
- **チャットボット**: Node.js 版では今回導入しない。将来導入する場合は同一 PostgreSQL に pgvector 拡張を追加する想定

---

## 参考資料

- Laravel 版 Issue #29（統合移行の先行事例）
- 設計書: `docs/design-docs/02_architecture.md` / `03_database.md` / `05_data_flow.md` / `09_er.md`
- 要件定義: `docs/requirements/01_requirements.md` v5.1
