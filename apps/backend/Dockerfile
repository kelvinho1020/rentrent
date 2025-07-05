FROM node:20.10.0-alpine

# 安裝 wget 用於健康檢查
RUN apk add --no-cache wget

WORKDIR /app

COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/backend/package.json ./apps/backend/

RUN npm install -g pnpm@8.6.12 && pnpm install --frozen-lockfile

COPY apps/backend ./apps/backend/

WORKDIR /app/apps/backend

# 生成 Prisma 客戶端
RUN npx prisma generate

# 編譯 TypeScript
RUN pnpm run build

EXPOSE 8000

CMD ["pnpm", "run", "start"]
