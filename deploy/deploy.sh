#!/bin/bash
#
# アプリケーションデプロイスクリプト
# Movie Profile Platform (Node.js版) - EC2へのデプロイ
#
# リポジトリ構造:
#   /var/www/movie-prf-node/   ... gitリポジトリルート
#     backend/                 ... NestJS API
#     frontend/                ... Vite + React SPA
#     ecosystem.config.js      ... PM2設定
#

set -e

# 色付き出力
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 設定
APP_DIR="/var/www/movie-prf-node"
REPO_URL="git@github.com:tetsu2026/movie-prf-node.git"
BRANCH="master"

# ログ出力関数
log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

log_step() {
    echo -e "${BLUE}[STEP]${NC} $1"
}

# ヘルプ表示
show_help() {
    echo "使用方法: $0 [オプション]"
    echo ""
    echo "オプション:"
    echo "  -h, --help          このヘルプを表示"
    echo "  -r, --repo          GitリポジトリURL"
    echo "  -b, --branch        デプロイするブランチ (デフォルト: master)"
    echo "  -d, --dir           アプリケーションディレクトリ (デフォルト: /var/www/movie-prf-node)"
    echo "  --setup             初回セットアップを実行"
    echo "  --update            既存アプリの更新のみ"
    echo ""
    echo "例:"
    echo "  $0 --setup"
    echo "  $0 --update"
}

# ビルド処理
build_app() {
    log_step "フロントエンドビルド"
    cd "$APP_DIR/frontend"
    npm ci --production=false
    npm run build

    log_step "バックエンドビルド"
    cd "$APP_DIR/backend"
    npm ci --production=false
    npx prisma generate
    npm run build
}

# PM2 起動/再起動
restart_pm2() {
    cd "$APP_DIR"
    if pm2 describe movie-prf-node > /dev/null 2>&1; then
        pm2 restart ecosystem.config.js
        log_info "PM2 再起動完了"
    else
        pm2 start ecosystem.config.js
        pm2 save
        pm2 startup 2>/dev/null | tail -1 | bash 2>/dev/null || true
        log_info "PM2 初回起動完了"
    fi
}

# ヘルスチェック
health_check() {
    log_step "ヘルスチェック"
    sleep 3
    if curl -sf http://localhost:3000/api/health > /dev/null 2>&1; then
        log_info "ヘルスチェック OK"
    else
        log_warn "ヘルスチェック失敗。ログを確認してください:"
        echo "  pm2 logs movie-prf-node --lines 30"
    fi
}

# 初回セットアップ
initial_setup() {
    log_step "1/5: ディレクトリ準備"

    if [[ -d "$APP_DIR/.git" ]]; then
        log_warn "既存のアプリケーションが存在します。--updateオプションを使用してください。"
        exit 1
    fi

    sudo mkdir -p "$APP_DIR"
    sudo chown "$USER":"$USER" "$APP_DIR"

    log_step "2/5: Gitリポジトリのクローン"
    mkdir -p ~/.ssh
    ssh-keyscan github.com >> ~/.ssh/known_hosts 2>/dev/null
    git clone --branch "$BRANCH" "$REPO_URL" "$APP_DIR"
    cd "$APP_DIR"

    log_step "3/5: .envファイル設定"
    if [[ ! -f "$APP_DIR/backend/.env" ]]; then
        log_warn "backend/.env ファイルを作成してください:"
        echo ""
        echo "  DATABASE_URL=\"mysql://user:pass@host:3306/movie_prf\""
        echo "  JWT_SECRET=<ランダム文字列>"
        echo "  AWS_REGION=ap-northeast-1"
        echo "  AWS_S3_BUCKET=<S3バケット名>"
        echo ""
        read -p "backend/.env を作成しましたか？ (yes): " confirm
        if [[ "$confirm" != "yes" ]]; then
            log_error "セットアップを中断します。backend/.env を作成後、再度実行してください。"
            exit 1
        fi
    fi

    log_step "4/5: ビルド"
    build_app

    log_step "5/5: PM2 起動"
    restart_pm2
    health_check

    log_info "初回セットアップ完了！"
}

# アプリケーション更新
update_app() {
    log_step "1/4: ディレクトリ移動"
    cd "$APP_DIR"

    if [[ ! -d ".git" ]]; then
        log_warn ".gitが見つかりません。Gitリポジトリを復元します..."
        mkdir -p ~/.ssh
        ssh-keyscan github.com >> ~/.ssh/known_hosts 2>/dev/null
        git init
        git remote add origin "$REPO_URL"
        git fetch origin "$BRANCH"
        git reset --hard "origin/$BRANCH"
        log_info "Gitリポジトリの復元完了"
    fi

    log_step "2/4: 最新コードを取得"
    git remote set-url origin "$REPO_URL"
    git fetch origin
    git reset --hard "origin/$BRANCH"

    log_step "3/4: ビルド"
    build_app

    log_step "4/4: PM2 再起動"
    restart_pm2
    health_check

    log_info "アプリケーション更新完了！"
}

# メイン処理
main() {
    local setup_mode=false
    local update_mode=false

    # 引数解析
    while [[ $# -gt 0 ]]; do
        case $1 in
            -h|--help)
                show_help
                exit 0
                ;;
            -r|--repo)
                REPO_URL="$2"
                shift 2
                ;;
            -b|--branch)
                BRANCH="$2"
                shift 2
                ;;
            -d|--dir)
                APP_DIR="$2"
                shift 2
                ;;
            --setup)
                setup_mode=true
                shift
                ;;
            --update)
                update_mode=true
                shift
                ;;
            *)
                log_error "不明なオプション: $1"
                show_help
                exit 1
                ;;
        esac
    done

    echo "======================================"
    echo "Movie Profile Platform (Node.js) Deploy"
    echo "======================================"
    echo ""

    if $setup_mode; then
        initial_setup
    elif $update_mode; then
        update_app
    else
        log_error "--setupまたは--updateオプションを指定してください"
        show_help
        exit 1
    fi

    echo ""
    log_info "完了！"
    echo ""
    echo "確認コマンド:"
    echo "  pm2 status                    # プロセス状態"
    echo "  pm2 logs movie-prf-node       # ログ確認"
    echo "  curl localhost:3000/api/health # ヘルスチェック"
}

main "$@"
