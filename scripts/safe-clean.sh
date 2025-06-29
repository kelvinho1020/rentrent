#!/bin/bash

# 顏色定義
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🧹 Docker 安全清理工具${NC}"
echo "=================================================="

# 檢查懸空資源
echo -e "${YELLOW}📊 檢查可清理的資源...${NC}"

DANGLING_IMAGES=$(docker images --filter "dangling=true" -q | wc -l)
DANGLING_VOLUMES=$(docker volume ls --filter "dangling=true" -q | wc -l)
BUILD_CACHE_SIZE=$(docker system df --format "table {{.Type}}\t{{.Size}}" | grep "Build Cache" | awk '{print $3}')

echo "懸空鏡像: $DANGLING_IMAGES 個"
echo "懸空卷: $DANGLING_VOLUMES 個"
echo "構建緩存: $BUILD_CACHE_SIZE"
echo ""

# 顯示正在使用的資源（受保護）
echo -e "${GREEN}🛡️  受保護的資源（不會被刪除）:${NC}"
docker ps --format "table {{.Names}}\t{{.Mounts}}" | head -5
echo ""

# 安全選項菜單
echo -e "${YELLOW}選擇清理選項:${NC}"
echo "1) 清理懸空鏡像 (安全)"
echo "2) 清理懸空卷 (安全)" 
echo "3) 清理構建緩存 (安全)"
echo "4) 全部清理 (安全)"
echo "5) 檢查資源使用情況"
echo "6) 退出"

read -p "請選擇 (1-6): " choice

case $choice in
    1)
        echo -e "${YELLOW}清理懸空鏡像...${NC}"
        docker image prune -f
        ;;
    2)
        echo -e "${YELLOW}清理懸空卷...${NC}"
        docker volume prune -f
        ;;
    3)
        echo -e "${YELLOW}清理構建緩存...${NC}"
        docker builder prune -f
        ;;
    4)
        echo -e "${YELLOW}執行全部安全清理...${NC}"
        docker image prune -f
        docker volume prune -f
        docker builder prune -f
        echo -e "${GREEN}✅ 清理完成！${NC}"
        ;;
    5)
        echo -e "${BLUE}📊 詳細資源使用情況:${NC}"
        docker system df -v
        ;;
    6)
        echo -e "${GREEN}再見！${NC}"
        exit 0
        ;;
    *)
        echo -e "${RED}無效選擇${NC}"
        exit 1
        ;;
esac

echo ""
echo -e "${GREEN}✅ 操作完成！${NC}"
docker system df 