# 🔄 切換到真實資料庫模式

## ✅ 資料庫已準備就緒
- PostgreSQL 連接正常 ✅
- 資料表結構已建立 ✅ 
- Prisma Client 已生成 ✅

## 🔧 切換步驟

### 步驟 1：創建前端環境配置
在 `apps/frontend/` 目錄下創建 `.env.local` 文件：

```bash
cd apps/frontend

# 創建 .env.local 文件
cat > .env.local << 'EOF'
# 🏠 使用真實資料庫資料
NEXT_PUBLIC_USE_MOCK_DATA=false

# 🌐 API 配置
NEXT_PUBLIC_API_URL=http://localhost:8000/api

# 🗺️ 地圖 API Keys (可選)
NEXT_PUBLIC_MAPBOX_API_KEY=
EOF
```

### 步驟 2：重啟前端服務
```bash
# 在 apps/frontend 目錄下
npm run dev
```

### 步驟 3：重啟後端服務
```bash
# 在 apps/backend 目錄下  
npm run dev
```

## 📊 模式對比

| 項目 | 假資料模式 | 真實資料庫模式 |
|------|-----------|---------------|
| 房屋數量 | 30筆固定資料 | 資料庫中的所有資料 |
| 資料來源 | mockListings.json | PostgreSQL |
| 通勤計算 | 直線距離估算 | Google Maps API |
| 資料完整性 | 模擬資料 | 真實爬取資料 |

## 🎯 驗證切換成功

### 前端日誌應顯示：
```
🌐 使用真實 API 調用
```

### 後端日誌應顯示：
```
✅ 資料庫連接成功
debug: 執行Prisma查詢
```

## ⚠️ 注意事項

1. **資料量**：真實資料庫可能包含大量資料，搜尋可能較慢
2. **API 消耗**：每次搜尋都會調用 Google Maps API
3. **資料更新**：需要定期執行爬蟲更新資料

## 🔄 切換回假資料模式

如果需要切換回假資料模式：
```bash
# 修改 .env.local
NEXT_PUBLIC_USE_MOCK_DATA=true
``` 