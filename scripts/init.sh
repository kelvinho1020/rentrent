#!/bin/bash

echo "🚀 RentRent 初始化腳本"
echo "====================="

# 檢查 Docker 是否運行
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker 未運行，請先啟動 Docker"
    exit 1
fi

# 構建並啟動服務
echo "🔨 構建並啟動服務..."
docker-compose up -d --build

# 等待資料庫就緒
echo "⏳ 等待資料庫啟動..."
sleep 15

# 執行資料庫初始化
echo "📦 初始化資料庫..."
docker-compose exec -T backend npx prisma migrate deploy

echo ""
echo "🎉 初始化完成！"
echo "📱 前端: http://localhost:3000"
echo "🔧 後端: http://localhost:8000"