#!/bin/bash

# 顏色定義
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}🐍 啟動 Docker 爬蟲...${NC}"

# 檢查 DB 是否運行
if ! docker ps | grep -q "rentrent-db"; then
    echo -e "${RED}❌ 資料庫未運行，請先啟動主服務：${NC}"
    echo "   pnpm dev"
    exit 1
fi

# 構建並運行爬蟲
echo -e "${YELLOW}📦 構建爬蟲 Docker 映像...${NC}"
docker build -t rentrent-crawler ./apps/crawler

echo -e "${YELLOW}🚀 啟動爬蟲任務...${NC}"
docker run --rm \
    --name rentrent-crawler-run \
    --network rentrent_rentrent-network \
    -e DATABASE_URL="postgresql://postgres:postgres@rentrent-db:5432/rentrent?schema=public" \
    rentrent-crawler

echo -e "${GREEN}✅ 爬蟲任務完成！${NC}" 