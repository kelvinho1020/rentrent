# 假資料使用說明

## 概述

為了方便開發和測試，我們已經加入了豐富的假資料支援。現在有 **30 筆台北地區的租屋假資料**，包含台北市、新北市和桃園市的不同類型物件。

## 假資料內容

假資料包含以下資訊：
- **30 筆租屋物件**
- 涵蓋台北市 12 個行政區
- 涵蓋新北市 8 個行政區  
- 涵蓋桃園市 2 個行政區
- 價格範圍：9,000 - 88,000 元
- 坪數範圍：5.5 - 55.0 坪
- 真實的座標位置
- 模擬的通勤時間計算

## 如何使用假資料

### 1. 設定環境變數

在 `apps/frontend/.env.local` 檔案中加入：

```
# 使用假資料 (預設)
NEXT_PUBLIC_USE_MOCK_DATA=true

# 或者不設定此變數，預設會使用假資料
```

### 2. 重新啟動開發伺服器

```bash
cd apps/frontend
npm run dev
```

## 如何切換回真實資料

### 方法一：修改環境變數

在 `apps/frontend/.env.local` 檔案中設定：

```
# 使用真實 API 資料
NEXT_PUBLIC_USE_MOCK_DATA=false
```

### 方法二：移除假資料相關代碼 (完全還原)

如果你想完全移除假資料功能：

1. **刪除假資料文件**：
   ```bash
   rm apps/frontend/data/mockListings.json
   ```

2. **還原 `apps/frontend/utils/api.ts`**：
   ```typescript
   // 移除這些行
   import mockListingsRaw from "@/data/mockListings.json";
   const USE_MOCK_DATA = process.env.NEXT_PUBLIC_USE_MOCK_DATA !== "false";
   const mockListings: ListingBasic[] = mockListingsRaw.map(listing => ({
     ...listing,
     coordinates: listing.coordinates as [number, number]
   }));

   // 將 searchByCommuteTime 函數簡化為：
   export const searchByCommuteTime = async (params: CommuteSearchRequest): Promise<SearchResponse> => {
     const response = await api.post("/commute/search", params);
     return response.data;
   };
   ```

3. **刪除此說明文件**：
   ```bash
   rm apps/frontend/MOCK_DATA_README.md
   ```

## 假資料功能特色

1. **真實地理位置**: 所有座標都是真實的台北地區位置
2. **智能通勤時間計算**: 根據選擇的工作地點動態計算通勤時間
3. **完整篩選功能**: 支援價格、坪數、城市、行政區等篩選
4. **排序功能**: 按通勤時間排序顯示結果
5. **模擬 API 延遲**: 500ms 延遲模擬真實 API 體驗

## 注意事項

- 假資料模式下，console 會顯示 "🎭 使用假資料" 的日誌
- 真實資料模式下，console 會顯示 "🌐 使用真實 API 調用" 的日誌
- 搜尋結果會顯示 "使用假資料進行搜尋 (開發模式)" 的備註

## 假資料物件分布

### 台北市 (20 筆)
- 信義區: 2 筆 (45,000-88,000元)
- 大安區: 2 筆 (21,000-28,000元)  
- 中山區: 2 筆 (52,000-55,000元)
- 松山區: 2 筆 (13,000-15,000元)
- 內湖區: 2 筆 (18,000-22,000元)
- 士林區: 2 筆 (38,000-48,000元)
- 萬華區: 2 筆 (15,000-18,000元)
- 大同區: 2 筆 (25,000-32,000元)
- 中正區: 1 筆 (38,000元)
- 文山區: 1 筆 (16,000元)
- 南港區: 1 筆 (42,000元)
- 北投區: 1 筆 (26,000元)

### 新北市 (8 筆)
- 板橋區、中和區、永和區、新店區、三重區、蘆洲區、汐止區、淡水區

### 桃園市 (2 筆)  
- 桃園區、中壢區

這樣的假資料分布讓你可以測試各種搜尋場景和篩選條件！ 