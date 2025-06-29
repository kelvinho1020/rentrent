#!/bin/bash

echo "🚀 RentRent Setup & Start"
echo "========================"

# 檢查 Docker 是否運行
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker 未運行，請先啟動 Docker"
    exit 1
fi

# 啟動服務
echo "🐳 啟動 Docker 服務..."
docker-compose up -d

echo ""
echo "🎉 啟動完成！"