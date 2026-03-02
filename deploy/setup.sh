#!/bin/bash
# =================================
# 初回セットアップスクリプト（EC2上で実行）
# =================================
# 使用方法:
#   ssh -A ec2-user@<EC2パブリックIP>
#   bash /tmp/setup.sh
#
# 前提条件:
#   - Amazon Linux 2023 の EC2 インスタンス
#   - Laravel版が既に稼働中（Nginx, PHP-FPM, FFmpeg インストール済み）

set -euo pipefail

echo "=== NestJS版 初回セットアップ開始 ==="

# ----------------------------------------
# 0. スワップ領域の追加（t3.micro対策）
# ----------------------------------------
if [ ! -f /swapfile ]; then
  echo "--- スワップ領域を追加中 ---"
  sudo fallocate -l 1G /swapfile
  sudo chmod 600 /swapfile
  sudo mkswap /swapfile
  sudo swapon /swapfile
  echo '/swapfile swap swap defaults 0 0' | sudo tee -a /etc/fstab
  echo "スワップ追加完了"
else
  echo "スワップ既に存在: スキップ"
fi

# ----------------------------------------
# 1. Node.js 20 のインストール
# ----------------------------------------
if ! command -v node &> /dev/null; then
  echo "--- Node.js 20 をインストール中 ---"
  curl -fsSL https://rpm.nodesource.com/setup_20.x | sudo bash -
  sudo yum install -y nodejs
  echo "Node.js $(node -v) インストール完了"
else
  echo "Node.js 既にインストール済み: $(node -v)"
fi

# ----------------------------------------
# 2. PM2 のインストール
# ----------------------------------------
if ! command -v pm2 &> /dev/null; then
  echo "--- PM2 をインストール中 ---"
  sudo npm install -g pm2
  echo "PM2 インストール完了"
else
  echo "PM2 既にインストール済み"
fi

# ----------------------------------------
# 3. Redis 7 のインストール
# ----------------------------------------
if ! systemctl is-active --quiet redis7 2>/dev/null && ! systemctl is-active --quiet redis 2>/dev/null; then
  echo "--- Redis をインストール中 ---"
  # Amazon Linux 2023 の場合
  if command -v dnf &> /dev/null; then
    sudo dnf install -y redis6 2>/dev/null || sudo yum install -y redis 2>/dev/null || true
  else
    sudo amazon-linux-extras install redis6 2>/dev/null || sudo yum install -y redis 2>/dev/null || true
  fi

  # Redis の maxmemory を設定（t3.micro対策）
  REDIS_CONF=$(find /etc -name "redis*.conf" 2>/dev/null | head -1)
  if [ -n "$REDIS_CONF" ]; then
    echo 'maxmemory 64mb' | sudo tee -a "$REDIS_CONF"
    echo 'maxmemory-policy allkeys-lru' | sudo tee -a "$REDIS_CONF"
  fi

  # Redis サービス名を検出して起動
  REDIS_SERVICE=$(systemctl list-unit-files | grep -oP 'redis\S*\.service' | head -1 | sed 's/.service//')
  if [ -n "$REDIS_SERVICE" ]; then
    sudo systemctl enable "$REDIS_SERVICE"
    sudo systemctl start "$REDIS_SERVICE"
    echo "Redis ($REDIS_SERVICE) インストール・起動完了"
  else
    echo "警告: Redis サービスが見つかりません。手動でインストールしてください。"
  fi
else
  echo "Redis 既に稼働中"
fi

# ----------------------------------------
# 4. アプリケーション配置
# ----------------------------------------
APP_DIR="/var/www/movie-prf-node"

if [ ! -d "$APP_DIR" ]; then
  echo "--- アプリケーションをクローン中 ---"
  sudo mkdir -p "$APP_DIR"
  sudo chown ec2-user:ec2-user "$APP_DIR"
  git clone git@github.com:tetsu2026/movie-profile-node.git "$APP_DIR"
  echo "クローン完了"
else
  echo "アプリディレクトリ既に存在: $APP_DIR"
fi

# ----------------------------------------
# 5. PM2 ログディレクトリ
# ----------------------------------------
sudo mkdir -p /var/log/pm2
sudo chown ec2-user:ec2-user /var/log/pm2

# ----------------------------------------
# 6. 環境変数の設定案内
# ----------------------------------------
if [ ! -f "$APP_DIR/backend/.env" ]; then
  echo ""
  echo "==================================="
  echo "重要: 環境変数の設定が必要です"
  echo "==================================="
  echo ""
  echo "以下のコマンドで .env を作成してください:"
  echo "  cp $APP_DIR/backend/.env.production.example $APP_DIR/backend/.env"
  echo "  vi $APP_DIR/backend/.env"
  echo ""
  echo "設定後、deploy.sh を実行してビルド・起動してください:"
  echo "  bash $APP_DIR/deploy/deploy.sh"
  echo ""
fi

echo "=== 初回セットアップ完了 ==="
