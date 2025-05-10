FROM node:20.10.0-slim

WORKDIR /app

# 設置環境變數
ENV NODE_ENV=production

# 安裝全局依賴
RUN apt-get update && apt-get install -y \
    build-essential \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# 複製 package.json 並安裝依賴
COPY apps/backend/package.json apps/backend/package-lock.json* ./
RUN npm ci

# 複製 Prisma schema 並生成客戶端
COPY apps/backend/prisma ./prisma/
RUN npx prisma generate

# 複製應用程式碼
COPY apps/backend/ ./

# 從源碼編譯 TypeScript
RUN npm run build

# 清理開發相依性（僅保留生產環境所需依賴）
# RUN npm prune --production

# 啟動 Express 服務
EXPOSE 8000
CMD ["node", "dist/index.js"] 