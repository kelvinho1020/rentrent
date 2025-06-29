FROM node:20.10.0-alpine

WORKDIR /app

COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/frontend/package.json ./apps/frontend/

RUN npm install -g pnpm@8.6.12

RUN pnpm install --frozen-lockfile

COPY apps/frontend ./apps/frontend/

WORKDIR /app/apps/frontend

EXPOSE 3000

CMD ["pnpm", "dev"] 