# 使用官方 Node.js 映像
FROM node:20.10.0-alpine

# 設置工作目錄
WORKDIR /app

# 安裝必要的系統依賴 (緩存層 1)
RUN apk add --no-cache python3 make g++ && ln -sf python3 /usr/bin/python

# 複製 package.json 和 lockfile (緩存層 2 - 只在依賴變更時重建)
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/backend/package.json ./apps/backend/

# 安裝依賴 (緩存層 3 - 最耗時，充分利用緩存)
RUN npm install -g pnpm@8.6.12 && pnpm install --frozen-lockfile

# 複製 Prisma schema (緩存層 4 - Schema 變更時重建)
COPY apps/backend/prisma ./apps/backend/prisma/

# 生成 Prisma client (緩存層 5)
WORKDIR /app/apps/backend
RUN npx prisma generate

# 複製應用程式代碼 (緩存層 6 - 代碼變更時才重建)
WORKDIR /app
COPY apps/backend ./apps/backend/

# 設置最終工作目錄
WORKDIR /app/apps/backend

# 暴露端口
EXPOSE 8000

# 開發模式啟動
CMD ["npm", "run", "dev"] 