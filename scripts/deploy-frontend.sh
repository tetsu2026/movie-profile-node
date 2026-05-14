#!/bin/bash
# =====================================================================
# Node.js 版 frontend (SPA) S3+CloudFront デプロイスクリプト（Phase 7）
# =====================================================================
# ローカル PC から実行（リポジトリルートから）:
#   ./scripts/deploy-frontend.sh
#
# 前提:
#   - AWS CLI v2 が設定済み
#   - Node.js 20.x が利用可能
#   - S3 バケット `movie-prf-spa-<AWS_ACCOUNT_ID>` が作成済み
#   - CloudFront ディストリビューションが node.hozu.click を代替ドメインとして登録済み
#
# 動作:
#   1. frontend/ で npm ci && npm run build (Vite ビルド)
#   2. dist/ を S3 バケットへ sync（--delete で旧ファイル削除）
#   3. CloudFront ディストリビューションのキャッシュを invalidate
# =====================================================================

set -euo pipefail

REGION=ap-northeast-1
CLOUDFRONT_DOMAIN=node.hozu.click

# AWS CLI 用 profile を固定（ローカルPCの ~/.aws/credentials の [movie-prf] を使用）
export AWS_PROFILE=movie-prf
echo "==> Using AWS profile: ${AWS_PROFILE}"

# ===== 事前チェック =====
if ! command -v aws &>/dev/null; then
    echo "Error: AWS CLI が見つかりません。aws configure で設定してください。" >&2
    exit 1
fi
if ! command -v npm &>/dev/null; then
    echo "Error: npm が必要です。Node.js 20.x をインストールしてください。" >&2
    exit 1
fi

ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
BUCKET=movie-prf-spa-${ACCOUNT_ID}

# CloudFront ディストリビューション ID を代替ドメイン名から自動検索
DIST_ID=$(aws cloudfront list-distributions \
    --query "DistributionList.Items[?Aliases.Items[?@=='${CLOUDFRONT_DOMAIN}']]|[0].Id" \
    --output text)

if [ -z "${DIST_ID}" ] || [ "${DIST_ID}" = "None" ]; then
    echo "Error: CloudFront ディストリビューションが見つかりません (alias: ${CLOUDFRONT_DOMAIN})" >&2
    echo "       AWS コンソールで作成してから再実行してください。" >&2
    exit 1
fi

echo "==> S3 バケット: s3://${BUCKET}/"
echo "==> CloudFront Distribution ID: ${DIST_ID}"

echo "==> frontend ビルド (vite build)"
cd frontend
npm ci
npm run build
cd ..

echo "==> S3 sync (--delete で旧ファイル削除)"
aws s3 sync \
    ./frontend/dist \
    s3://"${BUCKET}"/ \
    --delete \
    --region "${REGION}"

echo "==> CloudFront キャッシュ invalidation (/*)"
INVALIDATION_ID=$(aws cloudfront create-invalidation \
    --distribution-id "${DIST_ID}" \
    --paths '/*' \
    --query 'Invalidation.Id' \
    --output text)

echo "==> 完了: invalidation_id=${INVALIDATION_ID}"
echo "    (キャッシュ無効化は数分で完了します)"
