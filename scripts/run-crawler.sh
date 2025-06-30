#!/bin/sh

# 設置嚴格模式
set -e
set -u

echo "🐍 開始爬蟲+導入..."

# 獲取腳本所在的絕對路徑 (sh兼容)
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

echo "📁 項目根目錄: $PROJECT_ROOT"

# 切換到爬蟲目錄
CRAWLER_DIR="$PROJECT_ROOT/apps/crawler"
echo "📁 爬蟲目錄: $CRAWLER_DIR"

if [ ! -d "$CRAWLER_DIR" ]; then
    echo "❌ 爬蟲目錄不存在: $CRAWLER_DIR"
    exit 1
fi

cd "$CRAWLER_DIR"

# 運行爬蟲
echo "📊 執行爬蟲..."
/usr/bin/python3 stable_crawl.py

# 檢查是否成功
RESULT_FILE="$CRAWLER_DIR/data/stable_crawl_result.json"
if [ $? -eq 0 ] && [ -f "$RESULT_FILE" ]; then
    echo "✅ 爬蟲完成！"
    
    # 複製資料
    echo "📥 複製資料..."
    BACKEND_DIR="$PROJECT_ROOT/apps/backend"
    cp "$RESULT_FILE" "$BACKEND_DIR/stable_crawl_result_new.json"
    
    # 導入資料庫 
    echo "📥 導入資料庫..."
    cd "$PROJECT_ROOT"
    /usr/bin/docker-compose exec -T backend npx ts-node scripts/import-listings.ts stable_crawl_result_new.json
    
    echo "🎉 完成！"
else
    echo "❌ 爬蟲失敗"
    exit 1
fi 