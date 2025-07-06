#!/bin/sh

cd /app/apps/backend

# 等待資料庫準備就緒
echo "Waiting for database to be ready..."
while ! nc -z db 5432; do
  sleep 1
done

# 重置資料庫
#echo "Resetting database..."
#npx prisma migrate reset --force

# 執行資料庫遷移
echo "Running database migrations..."
npx prisma migrate deploy

# 執行資料匯入（如果需要）
echo "Importing listings..."
NODE_ENV=production node dist/scripts/import-listings.js

# 啟動應用程式
echo "Starting application..."
pnpm start 