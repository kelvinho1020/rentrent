# 🚀 混合模式配置指南

## 概述

混合模式讓您可以享受兩全其美的解決方案：
- ✅ 使用假房屋資料（30筆台北地區精選房屋）
- ✅ 使用真實 Google Maps API 計算精確通勤時間
- ✅ 批次處理API調用，最大化效率

## 🔧 模式對比

### 1. 純假資料模式（預設）
```
NEXT_PUBLIC_USE_MOCK_DATA=true
NEXT_PUBLIC_USE_REAL_COMMUTE_API=false（或不設定）
```
- 🏠 房屋資料：30筆假資料
- ⏰ 通勤時間：直線距離 × 速度係數
- 💰 API 消耗：0

### 2. 混合模式（推薦）
```
NEXT_PUBLIC_USE_MOCK_DATA=true
NEXT_PUBLIC_USE_REAL_COMMUTE_API=true
```
- 🏠 房屋資料：30筆假資料  
- ⏰ 通勤時間：Google Maps API（真實路況）
- 💰 API 消耗：極少（批次處理）

### 3. 完全真實模式
```
NEXT_PUBLIC_USE_MOCK_DATA=false
```
- 🏠 房屋資料：資料庫中的真實資料
- ⏰ 通勤時間：Google Maps API
- 💰 API 消耗：較多
- ⚠️ 需要資料庫連接

## 📊 API 效率優化

### Google Maps Distance Matrix API 批次處理
- **單次API調用**：最多25個房屋 → 1個工作地點
- **30筆假資料**：只需 2次API調用（25 + 5）
- **節省成本**：相比個別調用節省 92% API 配額

### API 配額計算
假設您的 Google Maps API 每日免費額度：
- **$100 USD** ≈ **40,000次** Distance Matrix 調用
- **混合模式**：每次搜尋僅使用 **2次** 調用
- **每日可搜尋**：**20,000次**

## 🚀 啟用混合模式

### 步驟 1：設定環境變數
在您的前端根目錄創建或編輯 `.env.local`：
```bash
# 混合模式配置
NEXT_PUBLIC_USE_MOCK_DATA=true
NEXT_PUBLIC_USE_REAL_COMMUTE_API=true

# Google Maps API Key
GOOGLE_MAPS_API_KEY=您的_GOOGLE_MAPS_API_KEY
```

### 步驟 2：重啟開發伺服器
```bash
cd apps/frontend
npm run dev
```

### 步驟 3：驗證配置
在瀏覽器控制台中，搜尋時應該看到：
```
🎭 假資料搜尋參數: {
  通勤時間上限: 30,
  交通方式: "driving",
  使用真實API: "是"
}
🌐 混合模式：假房屋資料 + 真實 Google Maps API
```

## 📈 效能表現

### 混合模式優勢
1. **速度快**：假資料載入 + 批次API
2. **準確性高**：真實路況計算
3. **成本低**：極少API調用
4. **穩定性強**：API失敗時自動回退

### 回退機制
如果 Google Maps API 失敗：
```
⚠️ 批次 1 API 調用失敗，使用直線距離估算
```
系統自動切換到直線距離計算，確保功能正常運作。

## 🔍 除錯和監控

### 前端控制台日誌
```javascript
🎭 假資料搜尋參數: {...}           // 搜尋參數
📊 基本條件篩選: 25 / 30 筆符合    // 基本篩選結果
🔄 處理第 1 批，包含 25 個房屋      // 批次處理
✅ 民生社區溫馨2房 - 通勤時間: 12分鐘  // 成功計算
🎯 混合模式搜尋結果: 找到 8 筆符合條件的物件
```

### 後端日誌
```
debug: 接收到批次距離計算請求 {originsCount: 25, ...}
info: 批次距離計算完成 {總地點數: 25, 成功計算: 24, ...}
```

## ⚙️ 進階設定

### 批次大小調整
在 `apps/frontend/utils/api.ts` 中：
```javascript
const batchSize = 25; // Google Maps API 限制，建議不要修改
```

### API 調用間隔
```javascript
await new Promise(resolve => setTimeout(resolve, 100)); // 100ms間隔
```

### 交通方式對應
- `driving`：開車模式
- `transit`：大眾運輸
- `walking`：步行模式

## 🔄 切換回其他模式

### 回到純假資料模式
```bash
# .env.local
NEXT_PUBLIC_USE_MOCK_DATA=true
NEXT_PUBLIC_USE_REAL_COMMUTE_API=false
```

### 啟用完全真實模式
```bash
# .env.local
NEXT_PUBLIC_USE_MOCK_DATA=false
# 需要確保資料庫連接正常
```

## 🎯 最佳實踐

1. **開發階段**：使用混合模式進行功能測試
2. **展示階段**：混合模式提供最佳體驗
3. **生產階段**：根據資料量選擇適合的模式
4. **API 管理**：定期監控 Google Maps API 使用量

## 🆘 常見問題

### Q: 為什麼需要混合模式？
A: 既能快速測試功能，又能獲得真實的通勤時間計算，無需維護大量房屋資料。

### Q: API 失敗怎麼辦？
A: 系統會自動回退到直線距離計算，確保功能不中斷。

### Q: 可以增加假資料數量嗎？
A: 可以，修改 `apps/frontend/data/mockListings.json`，但要注意API調用次數會相應增加。

### Q: 如何監控API使用量？
A: 在 Google Cloud Console 的 APIs & Services 中查看 Distance Matrix API 的使用統計。 