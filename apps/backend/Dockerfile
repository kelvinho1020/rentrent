FROM node:20.10.0-alpine

WORKDIR /app

COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/backend/package.json ./apps/backend/

RUN npm install -g pnpm@8.6.12 && pnpm install --frozen-lockfile

COPY apps/backend/prisma ./apps/backend/prisma/

WORKDIR /app/apps/backend
RUN npx prisma generate

WORKDIR /app
COPY apps/backend ./apps/backend/

WORKDIR /app/apps/backend

EXPOSE 8000

CMD ["npm", "run", "dev"] 