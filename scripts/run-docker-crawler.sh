#!/bin/bash

echo "🐳 開始 Docker 爬蟲..."

# 使用 Docker Compose 已創建的網絡
NETWORK_NAME="rentrent_rentrent-network"
if ! docker network ls | grep -q "$NETWORK_NAME"; then
    echo "⚠️  Docker Compose 網絡不存在，請確保服務正在運行"
    exit 1
fi

# 確保主要服務正在運行
if ! docker ps | grep -q "rentrent-backend"; then
    echo "⚠️  後端服務未運行，啟動服務..."
    docker-compose up -d
    echo "⏳ 等待服務啟動..."
    sleep 10
fi

# 構建爬蟲鏡像
echo "🔨 構建爬蟲鏡像..."
docker build -t crawler ./apps/crawler

# 確保數據目錄存在
mkdir -p apps/crawler/data

# 運行爬蟲（連接到 Docker 網絡）
echo "📊 執行爬蟲..."
if docker run --rm \
    --network $NETWORK_NAME \
    -v $(pwd)/apps/crawler/data:/app/data \
    crawler; then
    
    # 檢查爬蟲是否成功
    if [ -f "apps/crawler/data/stable_crawl_result.json" ]; then
        echo "✅ 爬蟲完成！"
        
        # 複製結果文件
        echo "📥 複製結果文件..."
        cp apps/crawler/data/stable_crawl_result.json apps/backend/data/crawl_result_current.json
        
        # 導入資料庫
        echo "📥 導入資料庫..."
        docker exec rentrent-backend npx ts-node scripts/import-listings.ts data/crawl_result_current.json
        
        echo "🎉 完成！"
    else
        echo "❌ 爬蟲失敗：未找到結果文件"
        exit 1
    fi
else
    echo "❌ 爬蟲運行失敗"
    exit 1
fi 