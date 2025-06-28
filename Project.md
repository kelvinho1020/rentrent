# 租屋搜尋平台開發規劃

## 1. 專案概述
- **目標**：打造一個以台灣地區為主，整合地圖互動與通勤時間篩選的租屋搜尋平台。
- **核心功能**：
  1. 地圖上選擇工作地點
  2. 設定通勤時間上限
  3. 顯示符合條件的租屋物件
- **資料來源**：591.com.tw，每日爬取並存入自建 PostgreSQL（含 PostGIS）

## 2. 技術棧
- **前端**：Next.js + Tailwind CSS
- **後端 API**：Python (FastAPI)
- **爬蟲**：Python (requests/BeautifulSoup 或 Selenium)
- **資料庫**：PostgreSQL + PostGIS
- **容器化**：Docker + Docker Compose
- **排程**：Cron Job（或 Celery + Redis）
- **通勤時間服務**：Mapbox Isochrone API / TravelTime API / Google Distance Matrix API

## 3. 系統架構
```mermaid
flowchart TD
  subgraph Data
    A[591 爬蟲] -->|每日排程| B[(PostgreSQL + PostGIS)]
  end
  subgraph Backend
    B --> C[FastAPI API]
    D[通勤時間 API] --> C
  end
  subgraph Frontend
    C --> E[Next.js + Tailwind 地圖介面]
  end

一、系統架構概覽
前端 (Frontend)：使用 JavaScript 框架（如 React 或 Vue.js），整合 Leaflet 地圖元件，並呼叫後端 API 獲取租屋資料與通勤時間估算。

後端 (Backend)：採用 Node.js/Express 或 Python/Flask，負責提供 RESTful API，並串接 PostgreSQL 資料庫與第三方通勤時間服務。

資料庫 (Database)：PostgreSQL 搭配 PostGIS 外掛，儲存租屋物件與地理座標，並透過空間索引加速範圍查詢。

二、資料擷取：591.com.tw 爬蟲設計
技術選型：

使用 Python 的 requests + BeautifulSoup 或 Selenium 瀏覽器自動化擷取動態渲染內容 
Python 網路爬蟲大師班 -
ericlinyuting.com
。

詳細流程：

定位目標 URL，解析列表頁中的租屋物件 ID 與詳細頁連結 
Medium
。

針對每個物件詳細頁，擷取租金、坪數、地址、經緯度等欄位。

處理 AJAX 請求或 lazy-load 的地圖座標（若遇反爬機制，可考慮 Selenium 模擬使用者行為） 
ericlinyuting.com
。

排程執行：

於 Linux 主機上設定 Cron Job，每日定時執行爬蟲腳本，並將結果寫入 PostgreSQL 
SitePoint
Hostinger
。

三、資料庫設計與空間查詢
資料模型：

建立 listings 資料表，包含 id、rent、area、address、geom (使用 ST_Point(lon, lat)) 等欄位。

PostGIS 加速：

對 geom 欄位建立 GiST 空間索引 (CREATE INDEX idx_listings_geom ON listings USING GIST (geom);) 
Stack Overflow
GIS 交流平台
。

查詢時可利用 ST_DWithin 快速篩選出某範圍內物件，再進一步計算路徑或通勤時間。

四、通勤時間計算
選擇 API：

TravelTime API：支援多國時段運算與等時線 (isochrones) 產生，免費額度適中 
docs.traveltime.com
。

Mapbox Directions API：可取得實時路徑與時間估算，並支援多種交通方式 
Mapbox
。

Google Maps Distance Matrix API：經典穩定，但在台灣請注意授權與費用。

計算流程：

使用使用者在地圖上點選的工作地點經緯度，呼叫第三方 API 以該點為起點，將所有符合範圍的租屋座標批量查詢通勤時間。

若資料量過大，可先以空間距離 (如 5km 範圍) 初步過濾，再進行精確通勤時間計算，降低 API 次數與成本。

等時線篩選：

若希望更直觀，可使用 TravelTime 或 Mapbox 的等時線功能，直接回傳某 X 分鐘內可抵達的區域 Polygon，再以 ST_Within 進行資料庫篩選 
CommuteTimeMap
。

五、前端地圖介面實作
Leaflet 地圖：

使用 Leaflet 開源套件，透過 L.Map、L.TileLayer 與 L.Marker 快速建立互動地圖 
Leaflet
GeeksforGeeks
。

可引入 leaflet-routing-machine 或第三方 Isochrone 插件，顯示通勤等時線或路線路徑。

使用者互動：

在地圖上點擊或搜尋地址後，自動反轉地理編碼 (Reverse Geocoding) 獲取經緯度。

提供滑桿或下拉選單讓使用者設定通勤時間範圍 (如 15/30/45 分鐘)。

資料呈現：

從後端取得符合條件的租屋清單，並在地圖上以群組標記 (MarkerCluster) 顯示，點選彈出物件摘要。

六、後端 API 設計
RESTful Endpoint：

GET /api/listings?lat={lat}&lng={lng}&time={minutes}：回傳符合通勤時間的租屋清單（含基本資訊與座標）。

實作建議：

使用 Node.js + Express，利用 pg 或 knex.js 串接 PostgreSQL。

在查詢流程中先以 ST_DWithin 初篩，再批次呼叫通勤時間 API，最後回傳前端所需欄位。

七、排程與監控
Cron Job 設定：

確認 Linux 主機時區（Asia/Taipei），於 crontab -e 中加入每日凌晨爬蟲任務，例如 0 3 * * * /usr/bin/python3 /path/to/crawler.py 
FreeCodeCamp
Hostinger
。

錯誤處理與監控：

將爬蟲與後端服務的日誌記錄到 ELK 或 Prometheus + Grafana，並設定告警，快速發現失敗或異常。

可考慮在爬蟲中加入重試機制與 IP 代理池，降低被封鎖風險。