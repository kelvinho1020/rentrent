# Rent.Houseprice 爬蟲

這是一個專門爬取 rent.houseprice.tw 租屋資訊的 Python 爬蟲程式。

## 功能特色

- 爬取台北市和新北市的租屋物件
- 使用 Selenium 處理動態網頁內容
- 自動提取房屋詳細資訊（價格、坪數、地址、設施等）
- 支援批次爬取和資料儲存
- 地理座標自動標記

## 環境要求

- Python 3.9+
- Chrome 瀏覽器
- 相關 Python 套件（見 requirements.txt）

## 快速開始

### 1. 安裝依賴

```bash
pip install -r requirements.txt
```

### 2. 運行爬蟲

```bash
# 爬取所有地區
python crawler.py

# 只爬取新北市
python new_taipei_crawler.py

# 穩定版爬蟲
python stable_crawl.py

# 快速測試特定地區
python quick_region_test.py

# 簡單測試
python test_crawl.py
```

### 3. 使用 Docker（推薦）

```bash
# 構建容器
docker build -t rent-crawler .

# 運行爬蟲
docker run -v $(pwd)/data:/app/data rent-crawler python crawler.py
```

## 輸出格式

爬蟲會將資料儲存為 JSON 格式，包含以下欄位：

- `title`: 房屋標題
- `price`: 租金
- `size`: 坪數
- `address`: 地址
- `district`: 行政區
- `city`: 城市
- `house_type`: 房屋類型
- `room_layout`: 格局
- `facilities`: 設施清單
- `coordinates`: 地理座標
- `images`: 圖片 URL

## 檔案說明

- `crawler.py` - 主要爬蟲程式
- `new_taipei_crawler.py` - 新北市專用爬蟲
- `stable_crawl.py` - 穩定版爬蟲
- `quick_region_test.py` - 地區測試程式
- `test_crawl.py` - 簡單測試程式
- `data/` - 爬取的資料儲存目錄

## 注意事項

- 爬蟲會自動處理反爬蟲機制
- 建議適當設置延遲避免過於頻繁的請求
- 爬取的資料僅供學習和研究使用 