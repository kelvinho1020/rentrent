#!/bin/bash

# 確保腳本在錯誤時立即退出
set -e

echo "正在設置開發環境..."

# 檢查是否安裝了 docker
if ! command -v docker &> /dev/null
then
    echo "錯誤: 需要安裝 Docker。請訪問 https://docs.docker.com/get-docker/ 安裝"
    exit 1
fi

# 檢查是否安裝了 docker-compose
if ! command -v docker-compose &> /dev/null
then
    echo "錯誤: 需要安裝 docker-compose。請訪問 https://docs.docker.com/compose/install/ 安裝"
    exit 1
fi

# 檢查 PostgreSQL 容器是否運行中
if [ "$(docker ps -q -f name=rentrent-db)" ]; then
    echo "PostgreSQL 容器已運行"
else
    echo "啟動 PostgreSQL 容器..."
    docker-compose up -d db
    
    # 等待 PostgreSQL 容器啟動
    echo "等待 PostgreSQL 服務就緒..."
    sleep 5
fi

# 檢查 Redis 容器是否運行中
if [ "$(docker ps -q -f name=rentrent-redis)" ]; then
    echo "Redis 容器已運行"
else
    echo "啟動 Redis 容器..."
    docker-compose up -d redis
    
    # 等待 Redis 容器啟動
    echo "等待 Redis 服務就緒..."
    sleep 3
fi

echo "運行 Prisma 遷移..."
npx prisma migrate dev --name init

echo "填充示例數據..."
npx ts-node src/utils/seed.ts

echo "開發環境設置完成！"
echo "您可以使用以下命令啟動開發服務器："
echo "npm run dev"