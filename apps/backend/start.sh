#!/bin/sh

# 等待資料庫準備就緒
echo "Waiting for database to be ready..."
while ! nc -z db 5432; do
  sleep 1
done

# 執行資料庫遷移
echo "Running database migrations..."
npx prisma migrate deploy

# 啟動應用程式
echo "Starting application..."
node dist/index.js 