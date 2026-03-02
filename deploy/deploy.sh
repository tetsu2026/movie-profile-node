#!/bin/bash
# =================================
# デプロイスクリプト（EC2上で実行）
# =================================
# 使用方法:
#   ssh -A ec2-user@<EC2パブリックIP>
#   cd /var/www/movie-prf-node
#   bash deploy/deploy.sh
#
# 初回デプロイ・更新デプロイの両方に対応

set -euo pipefail

APP_DIR="/var/www/movie-prf-node"
cd "$APP_DIR"

echo "=== デプロイ開始 ==="

# ----------------------------------------
# 1. 最新コードの取得
# ----------------------------------------
echo "--- git pull ---"
git pull

# ----------------------------------------
# 2. フロントエンドビルド
# ----------------------------------------
echo "--- フロントエンドビルド ---"
cd "$APP_DIR/frontend"
npm ci --production=false
npm run build

# ----------------------------------------
# 3. バックエンドビルド
# ----------------------------------------
echo "--- バックエンドビルド ---"
cd "$APP_DIR/backend"
npm ci --production=false
npx prisma generate
npm run build

# ----------------------------------------
# 4. PM2 で起動/再起動
# ----------------------------------------
echo "--- PM2 起動/再起動 ---"
cd "$APP_DIR"

if pm2 describe movie-prf-node > /dev/null 2>&1; then
  pm2 restart ecosystem.config.js
  echo "PM2 再起動完了"
else
  pm2 start ecosystem.config.js
  pm2 save
  # PM2 の自動起動設定（初回のみ）
  pm2 startup 2>/dev/null | tail -1 | bash 2>/dev/null || true
  echo "PM2 初回起動完了"
fi

# ----------------------------------------
# 5. ヘルスチェック
# ----------------------------------------
echo "--- ヘルスチェック ---"
sleep 3
if curl -sf http://localhost:3000/api/health > /dev/null 2>&1; then
  echo "ヘルスチェック OK"
else
  echo "警告: ヘルスチェック失敗。ログを確認してください:"
  echo "  pm2 logs movie-prf-node --lines 30"
fi

echo ""
echo "=== デプロイ完了 ==="
echo ""
echo "確認コマンド:"
echo "  pm2 status                    # プロセス状態"
echo "  pm2 logs movie-prf-node       # ログ確認"
echo "  curl localhost:3000/api/health # ヘルスチェック"
