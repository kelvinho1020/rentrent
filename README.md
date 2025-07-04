# RentRent 租屋平台

以通勤時間為核心的租屋搜尋平台

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
