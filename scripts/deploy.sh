#!/bin/bash

# 部署腳本
set -e  # 遇到錯誤就停止執行

echo "🚀 開始部署..."

# 更新代碼
echo "📥 更新代碼..."
cd ~/rentrent
git pull origin master

# 重新構建容器
echo "🛠️ 重新構建容器..."
# 強制重新構建前端
docker compose -f docker-compose.prod.yml up -d --build --force-recreate frontend
# 重新構建後端（如果需要）
docker compose -f docker-compose.prod.yml up -d --build backend

# 等待後端啟動
echo "⏳ 等待後端服務啟動..."
sleep 10

# 執行資料庫遷移
echo "📦 執行 Prisma 遷移..."
docker exec rentrent-backend-prod pnpm prisma migrate deploy

# 導入租屋資料
echo "📥 導入租屋資料..."
docker exec rentrent-backend-prod pnpm ts-node /app/apps/backend/scripts/import-listings.ts /app/apps/backend/data/crawl_result_current.json

echo "✅ 部署完成！"