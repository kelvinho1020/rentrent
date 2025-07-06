FROM node:20.10.0-alpine

WORKDIR /app

COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/backend/package.json ./apps/backend/

RUN npm install -g pnpm@8.6.12
RUN pnpm install --frozen-lockfile

COPY apps/backend ./apps/backend/

RUN pnpm --filter backend build

WORKDIR /app/apps/backend

RUN npx prisma generate

EXPOSE 8000

ENV NODE_OPTIONS="--max-old-space-size=256"

CMD ["sh", "-c", "npx prisma migrate deploy && pnpm start"]
