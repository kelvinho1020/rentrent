# 等時線範圍修正說明

## 問題描述

之前的等時線（範圍圈）有以下問題：
1. 範圍太大，不符合實際需求
2. 沒有根據搜尋面板中設定的「最大距離」調整
3. 前後端的範圍計算不一致

## 修正內容

### 🎯 核心改進

現在等時線範圍會**直接使用搜尋面板中設定的「最大距離」**作為半徑，不再使用複雜的時間計算公式。

### 📋 詳細修改

#### 1. 前端修改

**`apps/frontend/utils/api.ts`**
- `getIsochrone` 函數增加 `maxDistance` 參數
- API 調用時傳遞 `max_distance` 參數

**`apps/frontend/store/useMapStore.ts`**
- 增加 `maxDistance` 狀態（預設 5 公里）
- 增加 `setMaxDistance` action

**`apps/frontend/components/SearchPanel.tsx`**
- 使用 store 中的 `maxDistance` 狀態
- 移除本地的 `maxDistance` state

**`apps/frontend/components/Map.tsx`**
- 調用等時線 API 時傳入 `maxDistance` 參數
- `maxDistance` 變化時觸發等時線更新

#### 2. 後端修改

**`apps/backend/src/controllers/commute.controller.ts`**
- `getIsochrone` 方法接收 `max_distance` 查詢參數
- 將 `maxDistance` 傳遞給 `getIsochroneData`

**`apps/backend/src/services/mapService.ts`**
- `IsochroneParams` interface 增加 `maxDistance` 屬性
- `getIsochroneData` 函數使用 `maxDistance` 參數
- `generateFallbackIsochrone` 函數簡化邏輯：
  - 直接使用 `maxDistance` 作為半徑
  - 最大限制 15 公里，最小限制 0.5 公里
  - 移除複雜的時間計算公式

### 🎮 使用方式

1. **調整範圍**：在搜尋面板中選擇不同的「最大距離」（3、5、10、15 公里）
2. **即時更新**：範圍圈會立即調整為對應的半徑
3. **一致性**：前端顯示的範圍與後端搜尋的範圍完全一致

### 📊 範圍對照

| 設定距離 | 實際半徑 | 說明 |
|---------|----------|------|
| 3 公里   | 3 公里   | 適合市中心精確搜尋 |
| 5 公里   | 5 公里   | 預設值，平衡範圍與精確度 |
| 10 公里  | 10 公里  | 適合郊區或跨區搜尋 |
| 15 公里  | 15 公里  | 最大範圍，適合廣域搜尋 |

### 🔍 技術細節

#### 快取機制
- 快取鍵包含 `maxDistance`，確保不同距離設定不會互相影響
- 格式：`isochrone:{lng},{lat}:{minutes}:{mode}:{maxDistance}`

#### 日誌輸出
- 後端會記錄：`生成等時線圓形，半徑: X公里 (基於最大距離: Y公里)`
- 前端會顯示：`Fetching isochrone for: {workLocation, commuteTime, maxDistance}`

#### 錯誤處理
- 保持原有的錯誤處理機制
- 如果第三方 API 失敗，仍會使用備用方法生成圓形

### ✅ 驗證方式

1. 開啟瀏覽器開發者工具
2. 在地圖上點選工作地點
3. 調整搜尋面板中的「最大距離」
4. 觀察範圍圈大小變化
5. 檢查 console 日誌確認參數傳遞

### 🚀 效果

- ✅ 範圍圈大小合理，不再過大
- ✅ 用戶設定什麼距離，就顯示什麼範圍
- ✅ 前後端搜尋範圍完全一致
- ✅ 即時響應用戶的距離調整
- ✅ 保持原有的所有功能 