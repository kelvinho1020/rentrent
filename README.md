# 租屋搜尋平台 (RentRent)

以台灣地區為主，整合地圖互動與通勤時間篩選的租屋搜尋平台。

## 功能特點

- 地圖上選擇工作地點
- 設定通勤時間上限 (15/30/45分鐘)
- 顯示符合條件的租屋物件
- 每日自動從591.com.tw爬取最新租屋資料

## 技術架構

### 前端
- **Next.js** - React 框架
- **React** - 用戶界面庫
- **TypeScript** - 靜態類型檢查
- **Tailwind CSS** - 樣式框架
- **Mapbox GL JS** - 地圖顯示和交互

### 後端
- **Node.js** - JavaScript 運行環境
- **Express** - Web 框架
- **TypeScript** - 靜態類型檢查
- **PostgreSQL** - 關聯型資料庫
- **Prisma** - ORM
- **Redis** - 快取服務
- **Docker** - 容器化部署

### 爬蟲服務
- **Python** - 程序語言
- **BeautifulSoup / Scrapy** - 網頁解析

## 技術棧

- **前端**: Next.js + Tailwind CSS
- **後端 API**: Python (FastAPI)
- **爬蟲**: Python (requests/BeautifulSoup 或 Selenium)
- **資料庫**: PostgreSQL + PostGIS
- **容器化**: Docker + Docker Compose
- **通勤時間服務**: Mapbox Isochrone API / TravelTime API
- **Monorepo 管理**: pnpm workspace
- **Node.js 版本**: 20.10.0

## 前置條件

- Docker 與 Docker Compose
- Node.js 20.10.0
- Python 3.9+
- pnpm (最新版本)

## 詳細使用指南

### 1. 設置環境

首先，克隆本倉庫並安裝 Node.js 與 pnpm：

```bash
# 安裝 nvm (如果尚未安裝)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.3/install.sh | bash
# 或使用 wget
wget -qO- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.3/install.sh | bash

# 重新載入 shell 設定
source ~/.bashrc  # 或 source ~/.zshrc

# 克隆倉庫
git clone https://github.com/your-username/rentrent.git
cd rentrent

# 使用自動設置腳本 (推薦)
chmod +x scripts/setup.sh
./scripts/setup.sh
```

這個自動設置腳本會：
1. 使用 nvm 切換到正確的 Node.js 版本
2. 確保 PATH 設置正確
3. 安裝所有 pnpm 依賴
4. 提供後續步驟的說明

如果您想手動安裝，可以按照以下步驟：

```bash
# 安裝並使用指定的 Node.js 版本
nvm install 20.10.0
nvm use 20.10.0

# 安裝 pnpm (如果尚未安裝)
npm install -g pnpm

# 安裝依賴
pnpm install
```

### 2. 環境變數配置

```bash
# 複製環境變數範例文件
cp .env.example .env

# 編輯 .env 文件，設置 Mapbox API Key 和其他配置
# 請從 Mapbox 官網 (https://www.mapbox.com/) 註冊並獲取 API Key
```

### 3. 啟動服務

方法一：使用初始化腳本（建議）

```bash
# 添加執行權限
chmod +x scripts/init.sh

# 執行初始化腳本
./scripts/init.sh
```

方法二：手動啟動

```bash
# 啟動所有 Docker 服務
docker-compose up -d

# 等待資料庫初始化
docker-compose exec db psql -U postgres -d rentrent -f /docker-entrypoint-initdb.d/init.sql
```

### 4. 使用 pnpm Workspace 開發

本專案使用 pnpm workspace 作為 monorepo 管理工具，方便各個子專案之間共享依賴和代碼。

```bash
# 啟動前端開發伺服器
pnpm dev:frontend
```

您也可以直接在特定子專案目錄中工作：

```bash
# 切換到前端目錄
cd apps/frontend

# 啟動開發伺服器
pnpm dev
```

對於後端開發：

```bash
# 切換到後端目錄
cd apps/backend

# 安裝 Python 依賴
pip install -r requirements.txt

# 啟動開發伺服器
uvicorn main:app --reload
```

### 5. 訪問應用

啟動所有服務後，您可以通過以下地址訪問：

- **前端網站**: [http://localhost:3000](http://localhost:3000)
- **後端 API**: [http://localhost:8000](http://localhost:8000)
- **API 文檔**: [http://localhost:8000/docs](http://localhost:8000/docs)

## 專案結構

```
rentrent/
├── apps/
│   ├── frontend/      # Next.js 前端應用
│   ├── backend/       # FastAPI 後端 API
│   └── scraper/       # Python 爬蟲
├── packages/          # 共享的程式庫和工具
│   ├── db/            # 資料庫模型和連線工具
│   └── common/        # 共享的類型和工具
├── docker/            # Docker 相關配置
├── scripts/           # 專案腳本
└── docker-compose.yml # 容器編排配置
```

## 開發工作流程

1. **前端開發**：修改 `apps/frontend` 目錄中的文件
2. **後端開發**：修改 `apps/backend` 目錄中的文件
3. **爬蟲開發**：修改 `apps/scraper` 目錄中的文件
4. **共享模組**：修改 `packages` 目錄中的文件

每個子專案都可以獨立開發和測試，同時又能共享通用代碼和類型定義。

## 常見問題解決

- **前端無法連接後端**：確認環境變數 `NEXT_PUBLIC_API_URL` 是否正確設置
- **地圖無法載入**：確認 `MAPBOX_API_KEY` 是否正確設置並已授權
- **爬蟲無法運行**：檢查網路連接和 591 網站是否有變更
- **Node.js 版本不兼容**：確保使用 Node.js 20.10.0，可使用 nvm 進行版本管理
- **pnpm 安裝失敗**：確保使用正確的 Node.js 版本 (20.10.0)，可嘗試執行 `./scripts/setup.sh` 腳本自動修復環境問題
- **找不到 pnpm 命令**：如果您使用 nvm，請確保 PATH 中包含正確的 Node.js bin 目錄，執行 `export PATH="$HOME/.nvm/versions/node/$(node -v)/bin:$PATH"`

## 授權

MIT 

## 開發環境設置

### 前提條件
- Node.js 20.10.0
- PNPM 8.6.12 或更高版本
- Python 3.9 或更高版本（僅用於爬蟲服務）
- Docker 和 Docker Compose

### 安裝步驟

1. **克隆代碼庫**
   ```bash
   git clone https://github.com/yourusername/rentrent.git
   cd rentrent
   ```

2. **設置環境**
   ```bash
   # 使用設置腳本
   ./scripts/setup.sh
   
   # 或手動安裝依賴
   pnpm install
   ```

3. **啟動資料庫和 Redis**
   ```bash
   pnpm docker:up
   ```

4. **初始化資料庫**
   ```bash
   pnpm backend:migrate
   pnpm backend:seed
   ```

5. **運行開發服務器**
   ```bash
   # 同時運行前端和後端
   pnpm dev
   
   # 僅運行前端
   pnpm frontend
   
   # 僅運行後端
   pnpm backend
   ```

## 資料庫結構

主要資料模型：

- **Listing** - 租屋物件信息
- **CommuteTime** - 通勤時間數據
- **User** - 用戶信息
- **SavedSearch** - 已保存的搜索
- **FavoriteListing** - 收藏的租屋物件

查看 `apps/backend/prisma/schema.prisma` 獲取詳細的數據庫結構。 