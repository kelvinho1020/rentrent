#!/bin/bash

echo "🐍 調試腳本開始..."

# 1. 檢查當前目錄
echo "📍 當前目錄: $(pwd)"

# 2. 切換到項目根目錄
cd "$(dirname "$0")/.."
echo "📍 切換後目錄: $(pwd)"

# 3. 檢查apps/crawler是否存在
if [ -d "apps/crawler" ]; then
    echo "✅ apps/crawler 目錄存在"
else
    echo "❌ apps/crawler 目錄不存在"
    exit 1
fi

# 4. 進入crawler目錄
cd apps/crawler
echo "📍 進入crawler目錄: $(pwd)"

# 5. 檢查Python腳本是否存在
if [ -f "stable_crawl.py" ]; then
    echo "✅ stable_crawl.py 存在"
else
    echo "❌ stable_crawl.py 不存在"
    exit 1
fi

# 6. 測試Python命令
echo "🐍 測試Python..."
python3 --version
if [ $? -eq 0 ]; then
    echo "✅ Python正常"
else
    echo "❌ Python有問題"
    exit 1
fi

# 7. 檢查Docker
echo "🐳 檢查Docker..."
docker --version
if [ $? -eq 0 ]; then
    echo "✅ Docker正常"
else
    echo "❌ Docker有問題"
    exit 1
fi

# 8. 檢查docker-compose
echo "🐳 檢查docker-compose..."
docker-compose --version
if [ $? -eq 0 ]; then
    echo "✅ docker-compose正常"
else
    echo "❌ docker-compose有問題"
    exit 1
fi

echo "🎉 所有檢查完成，環境正常！" 