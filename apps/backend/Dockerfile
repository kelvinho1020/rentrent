FROM node:20.10.0-alpine

WORKDIR /app

# 複製 workspace 配置
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./

# 複製 shared package
COPY packages/shared/package.json ./packages/shared/
COPY packages/shared/src ./packages/shared/src/
COPY packages/shared/tsconfig*.json ./packages/shared/

# 複製後端 package.json
COPY apps/backend/package.json ./apps/backend/

# 安裝依賴
RUN npm install -g pnpm@8.6.12
RUN pnpm install --frozen-lockfile

# 建置 shared package
RUN pnpm --filter @rentrent/shared build

# 複製後端代碼
COPY apps/backend ./apps/backend/

# 建置後端
RUN cd apps/backend && pnpm build

# 生成 Prisma 客戶端
RUN cd apps/backend && npx prisma generate

EXPOSE 8000

CMD ["sh", "-c", "cd /app/apps/backend && pnpm start"]
