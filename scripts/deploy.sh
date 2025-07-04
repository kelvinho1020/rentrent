#!/bin/bash

# 生產環境部署腳本
set -e

echo "🚀 部署 RentRent 到生產環境..."

# 檢查環境變數文件
if [ ! -f .env.production ]; then
    echo "❌ 錯誤: 找不到 .env.production 文件"
    echo "請先創建 .env.production 文件並設置必要的環境變數"
    exit 1
fi

# 停止並重新構建
echo "🔨 構建並啟動生產服務..."
docker-compose -f docker-compose.prod.yml down
docker-compose -f docker-compose.prod.yml up -d --build

# 等待服務啟動
echo "⏳ 等待服務啟動..."
sleep 20

# 執行資料庫遷移
echo "🗄️ 執行資料庫遷移..."
docker-compose -f docker-compose.prod.yml exec backend npx prisma migrate deploy

echo "✅ 生產環境部署完成！"
echo "🌐 前端: http://134.209.108.11:3000"
echo "🔧 後端 API: http://134.209.108.11:8000/api" 