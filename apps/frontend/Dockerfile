FROM node:20.10.0-alpine

WORKDIR /app

COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/frontend/package.json ./apps/frontend/

RUN npm install -g pnpm@8.6.12

# 創建非 root 用戶
RUN addgroup -g 1001 -S nodejs && adduser -S nextjs -u 1001

RUN pnpm install --frozen-lockfile

COPY ./apps/frontend/.env ./apps/frontend/.env
COPY apps/frontend ./apps/frontend/
COPY packages/shared ./packages/shared/

# 先構建 shared package
RUN pnpm --filter @rentrent/shared build

# 設置正確的權限
RUN chown -R nextjs:nodejs /app

# 切換到非 root 用戶
USER nextjs

# 再構建 frontend
RUN pnpm --filter frontend build

WORKDIR /app/apps/frontend

EXPOSE 3000

CMD ["pnpm", "start"]
