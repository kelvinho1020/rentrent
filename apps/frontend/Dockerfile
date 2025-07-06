FROM node:20.10.0-alpine

WORKDIR /app

COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/frontend/package.json ./apps/frontend/
COPY packages/shared/package.json ./packages/shared/

RUN npm install -g pnpm@8.6.12

RUN pnpm install --frozen-lockfile

COPY ./apps/frontend/.env ./apps/frontend/.env
COPY packages/shared ./packages/shared/
COPY apps/frontend ./apps/frontend/

# 先構建 shared package
RUN pnpm --filter @rentrent/shared build

WORKDIR /app/apps/frontend

RUN pnpm build

EXPOSE 3000

CMD ["pnpm", "start"]
