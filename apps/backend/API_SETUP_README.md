# API 設置說明文件

## 📍 目前系統狀態

### 通勤時間計算
- **假資料模式**：使用直線距離 × 速度係數估算
- **真實資料模式**：使用 Google Maps Distance Matrix API

### 等時線計算  
- **理想模式**：OpenRouteService API 生成真實等時線
- **備用模式**：簡單圓形（目前使用）

## 🔑 所需 API Keys

### 1. Google Maps API Key
**用途**：計算真實通勤時間和距離

**申請步驟**：
1. 前往 [Google Cloud Console](https://console.cloud.google.com/)
2. 創建新專案或選擇現有專案
3. 啟用以下 API：
   - Distance Matrix API
   - Directions API
4. 創建 API Key
5. 設置 API Key 限制（建議限制 IP 或 HTTP referrer）

**每月免費額度**：
- Distance Matrix API：100 美元免費額度
- 大約可計算 40,000 次距離

### 2. OpenRouteService API Key
**用途**：生成真實的等時線多邊形

**申請步驟**：
1. 前往 [OpenRouteService](https://openrouteservice.org/dev/#/signup)
2. 註冊免費帳號
3. 創建 API Key

**每日免費額度**：
- 2,000 次 API 請求
- 對個人開發已經足夠

### 3. Mapbox API Key
**用途**：前端地圖顯示

**申請步驟**：
1. 前往 [Mapbox](https://account.mapbox.com/)
2. 註冊免費帳號
3. 創建 API Key

**每月免費額度**：
- 50,000 地圖載入
- 50,000 地理編碼請求

## 🛠️ 配置步驟

### 1. 後端配置
1. 複製 `.env.example` 為 `.env`：
   ```bash
   cp .env.example .env
   ```

2. 編輯 `.env` 文件，填入 API Keys：
   ```bash
   # Google Maps API Key
   GOOGLE_MAPS_API_KEY=AIzaSyxxxxxxxxxxxxxxxxxxxxxxxx
   
   # OpenRouteService API Key  
   ORS_API_KEY=5b3ce3597851110001cf6248xxxxxxxxxxxxxxxxxxxxxxxx
   
   # Mapbox API Key
   MAPBOX_API_KEY=pk.eyJ1IjoidXNlcm5hbWUixxxxxxxxxxxxxxxxx
   ```

### 2. 前端配置
在 `apps/frontend/.env.local` 中設置：
```bash
# Mapbox API Key（前端地圖）
NEXT_PUBLIC_MAPBOX_API_KEY=pk.eyJ1IjoidXNlcm5hbWUixxxxxxxxxxxxxxxxx

# 切換到真實 API 模式
NEXT_PUBLIC_USE_MOCK_DATA=false
```

## 🚀 啟用真實 API 的效果

### 通勤時間計算
- ✅ 考慮實際道路路線
- ✅ 即時交通狀況
- ✅ 不同交通方式的精確時間

### 等時線範圍
- ✅ 不再是簡單圓形
- ✅ 考慮道路網絡
- ✅ 實際可達範圍

## 🆓 免費使用建議

### 開發階段
- 繼續使用假資料模式
- 只在需要測試真實功能時才啟用 API

### 生產環境
- 監控 API 使用量
- 設置合理的快取時間
- 考慮使用 API 配額限制

## 🔍 目前為什麼等時線會失敗

1. **缺少 ORS_API_KEY**：OpenRouteService API 調用失敗
2. **沒有 .env 文件**：環境變數未設置
3. **自動 fallback**：系統會使用簡單圓形代替

## 📊 成本估算（每月）

假設一個中等使用量的應用：

| API 服務 | 免費額度 | 超出後費用 | 建議 |
|---------|---------|------------|------|
| Google Maps | $100 | $5/1000次 | 充足 |
| OpenRouteService | 2000次/日 | €0.6/1000次 | 充足 |
| Mapbox | 50,000次 | $5/1000次 | 充足 |

對於個人或小型專案，免費額度通常足夠。

## 🛡️ 安全建議

1. **限制 API Key 權限**：只啟用需要的 API
2. **設置 IP 限制**：限制 API Key 的使用來源
3. **監控使用量**：設置用量警報
4. **定期輪換**：定期更新 API Keys 