# 使用官方 Node.js 映像
FROM node:20.10.0-alpine

# 設置工作目錄
WORKDIR /app

# 複製 monorepo 配置文件 (緩存層 1)
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/frontend/package.json ./apps/frontend/

# 安裝 pnpm 特定版本 (緩存層 2)
RUN npm install -g pnpm@8.6.12

# 安裝依賴 (緩存層 3 - 最耗時的步驟，充分利用緩存)
RUN pnpm install --frozen-lockfile

# 複製應用程式代碼 (緩存層 4 - 代碼變更時才重建)
COPY apps/frontend ./apps/frontend/

# 設置工作目錄到前端  
WORKDIR /app/apps/frontend

# 暴露端口
EXPOSE 3000

# 開發模式啟動（支持熱重載）
CMD ["pnpm", "dev"] 