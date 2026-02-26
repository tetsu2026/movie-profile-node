FROM node:20-slim

# FFmpegをインストール
RUN apt-get update && \
    apt-get install -y ffmpeg && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

# 依存関係をインストール
COPY package*.json ./
RUN npm ci

# Prismaクライアント生成
COPY prisma ./prisma/
RUN npx prisma generate

# ソースコードをコピー
COPY . .

EXPOSE 3000

CMD ["npm", "run", "start:dev"]
