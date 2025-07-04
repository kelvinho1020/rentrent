FROM node:20.10.0-alpine

WORKDIR /app

COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/backend/package.json ./apps/backend/

RUN npm install -g pnpm@8.6.12 && pnpm install --frozen-lockfile

COPY apps/backend ./apps/backend/
COPY apps/backend ./apps/backend/

WORKDIR /app/apps/backend
RUN npx prisma generate

EXPOSE 8000

CMD ["npm", "run", "dev"]
