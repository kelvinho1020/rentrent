# RentRent 租屋平台

以通勤時間為核心的租屋搜尋平台，協助使用者找到最適合的租屋地點。

## 系統架構

![系統架構圖](docs/images/architecture.png)

### 主要元件

#### 前端 Frontend
- **Next.js + TypeScript**: 使用 Next.js 14 框架，搭配 TypeScript 提供型別安全
- **Tailwind CSS**: 用於快速開發響應式 UI
- **Mapbox 地圖**: 提供互動式地圖介面
- **Zustand**: 輕量級狀態管理解決方案

#### 後端 Backend
- **Express + TypeScript**: 使用 Express 框架搭配 TypeScript
- **Prisma ORM**: 強大的 ORM 工具，用於資料庫操作
- **REST API**: RESTful API 設計

#### 資料層 Database
- **PostgreSQL**: 主要資料庫，儲存租屋資訊
- **Redis**: 快取層，用於提升性能

#### 爬蟲系統 Crawler
- **Python**: 使用 Python 開發爬蟲
- **目標網站**: rent.houseprice.tw

#### 外部服務 External APIs
- **Google Maps API**: 用於地址轉換和路線規劃
- **Mapbox API**: 提供地圖視覺化

#### 部署架構 Deployment
- **Docker Compose**: 容器化部署
- **環境配置**: 使用環境變數進行配置管理

### 特色功能
1. 通勤時間搜尋
2. 互動式地圖
3. 即時房源更新
4. 多重篩選條件
5. 租屋資訊爬蟲

## 開發指南

### 環境需求
- Node.js 20.10.0
- Python 3.8+
- Docker & Docker Compose
- pnpm 8.6.12

### 專案結構
```
rentrent/
├── apps/
│   ├── frontend/     # Next.js 前端應用
│   └── backend/      # Express 後端服務
├── packages/
│   └── shared/       # 共用型別和工具
└── crawler/          # Python 爬蟲系統
```

### 本地開發
1. 安裝依賴：
```bash
pnpm install
```

2. 啟動開發環境：
```bash
# 前端開發
cd apps/frontend
pnpm dev

# 後端開發
cd apps/backend
pnpm dev
```

### 生產環境部署
使用 Docker Compose 進行部署：
```bash
docker compose -f docker-compose.prod.yml up -d
```

## 授權
本專案採用 MIT 授權條款。

## 🚀 快速開始

### 安裝依賴
```bash
pnpm install
```

### 啟動服務
```bash
# 啟動所有服務（資料庫、後端、前端）
pnpm dev

# 停止服務  
pnpm stop
```

## 🐍 爬蟲

### 一鍵爬蟲+導入
```bash
# 爬取租屋資料並自動導入資料庫
pnpm crawler
pnpm crawler:docker
```

## 🛠️ 其他

### 清理
```bash
# 清理 Docker 資源
pnpm clean

# 安全清理
pnpm safe-clean
```

## 📝 Tech Stack

- **前端**: React, TypeScript, Tailwind CSS, Zustand
- **後端**: Node.js, Express, TypeScript, PostgreSQL, Redis  
- **爬蟲**: Python, Selenium
- **部署**: Docker, Docker Compose
