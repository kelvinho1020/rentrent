# 搜尋功能除錯說明

## 剛才修正的問題

### 1. 搜尋條件變更不觸發重新搜尋

**問題**: 改變交通方式、價格範圍等條件時，搜尋結果沒有更新
**原因**: `SearchPanel.tsx` 中的 `useEffect` 只監聽 `workLocation` 和 `commuteTime`
**解決**: 擴充依賴陣列包含所有搜尋參數

```typescript
// 修正前
useEffect(() => {
  if (workLocation) {
    handleSearch();
  }
}, [workLocation, commuteTime]);

// 修正後
useEffect(() => {
  if (workLocation) {
    handleSearch();
  }
}, [workLocation, commuteTime, transitMode, maxDistance, minPrice, maxPrice, minSize, city, district]);
```

### 2. 假資料模式下交通方式無效

**問題**: 在假資料模式下，改變交通方式沒有影響搜尋結果
**原因**: 假資料的篩選邏輯沒有考慮交通方式
**解決**: 根據交通方式調整通勤時間計算

```typescript
// 新增交通方式速度係數
const getSpeedFactor = (mode: string): number => {
  switch (mode) {
    case "driving": return 2.0;   // 開車：每公里約2分鐘
    case "transit": return 3.0;   // 大眾運輸：每公里約3分鐘
    case "walking": return 12.0;  // 步行：每公里約12分鐘
    default: return 2.5;
  }
};
```

## 假資料 vs 真實資料模式

### 目前狀態
- **預設使用假資料模式** (`USE_MOCK_DATA = true`)
- 假資料包含30筆台北地區租屋物件
- 適合開發和測試階段使用

### 如何切換到真實資料

#### 方法1: 環境變數 (建議)
1. 在 `apps/frontend/` 目錄下創建 `.env.local` 文件
2. 添加以下內容：
```bash
NEXT_PUBLIC_USE_MOCK_DATA=false
NEXT_PUBLIC_API_URL=http://localhost:8000/api
```
3. 重啟開發伺服器

#### 方法2: 直接修改代碼
修改 `apps/frontend/utils/api.ts` 第9行：
```typescript
// 從
const USE_MOCK_DATA = process.env.NEXT_PUBLIC_USE_MOCK_DATA !== "false";
// 改為
const USE_MOCK_DATA = false;
```

### 搜尋功能差異

| 功能 | 假資料模式 | 真實資料模式 |
|------|------------|-------------|
| 資料來源 | 本地 JSON 文件 | 後端 API + 資料庫 |
| 搜尋範圍 | 固定30筆台北地區資料 | 實際資料庫內容 |
| 通勤時間計算 | 基於直線距離估算 | Google Maps API 實際路線 |
| 響應速度 | 500ms 模擬延遲 | 依賴網路和後端性能 |
| 地理範圍 | 台北市、新北市、桃園市 | 依實際資料 |

## 除錯技巧

### 1. 查看搜尋參數
開啟瀏覽器開發者工具的 Console，可以看到詳細的搜尋參數：

```
🎭 假資料搜尋參數: {
  通勤時間上限: 30,
  交通方式: "driving",
  最大距離: 5,
  價格範圍: "不限 - 50000",
  ...
}
```

### 2. 查看篩選結果
每個符合條件的物件都會在 Console 顯示：
```
✅ 台北市大安區優質套房 - 距離:2.3km, 通勤:5分鐘
```

### 3. 檢查網路請求
- 假資料模式：不會有實際的 HTTP 請求
- 真實資料模式：可在 Network 標籤看到 API 調用

## 常見問題

### Q: 搜尋按鈕沒有作用
A: 現在搜尋是自動觸發的，只要改變任何搜尋條件就會立即重新搜尋

### Q: 改變交通方式沒有效果
A: 確認已選擇工作地點，且查看 Console 確認參數有正確傳遞

### Q: 搜尋結果都一樣
A: 可能是假資料範圍有限，嘗試調整搜尋條件或切換到真實資料模式

### Q: 想要更多測試資料
A: 可以修改 `apps/frontend/data/mockListings.json` 增加更多假資料 