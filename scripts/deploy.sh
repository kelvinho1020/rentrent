#!/bin/bash

# 生產環境部署腳本
set -e

echo "🚀 部署 RentRent 到生產環境..."

# 停止並重新構建
echo "🔨 構建並啟動服務..."
docker-compose -f docker-compose.prod.yml down
docker-compose -f docker-compose.prod.yml up -d --build

# 等待服務啟動
echo "⏳ 等待服務啟動..."
sleep 20

# 執行資料庫遷移
echo "🗄️ 執行資料庫遷移..."
docker-compose -f docker-compose.prod.yml exec backend npx prisma migrate deploy

echo "✅ 部署完成！"