#!/bin/bash

# 檢查 .env 文件是否存在，若不存在則從範例文件複製
if [ ! -f .env ]; then
  echo "Creating .env file from .env.example..."
  cp .env.example .env
  echo "Please update .env file with your actual configuration before proceeding."
  exit 1
fi

# 啟動 Docker 容器
echo "Starting Docker containers..."
docker-compose up -d

# 等待資料庫準備就緒
echo "Waiting for database to be ready..."
sleep 10

# 初始化資料庫
echo "Initializing database..."
docker-compose exec db psql -U postgres -d rentrent -f /docker-entrypoint-initdb.d/init.sql

echo "Setup completed!"
echo "You can now access:"
echo "- Frontend: http://localhost:3000"
echo "- Backend API: http://localhost:8000"
echo "- API Documentation: http://localhost:8000/docs" 