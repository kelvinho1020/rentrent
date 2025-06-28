# 🔧 資料庫連接問題解決指南

## 問題描述
當 Backend 在本地 WSL 運行，但 PostgreSQL 和 Redis 在 Docker 中時，會出現連接失敗：
```
Can't reach database server at `db:5432`
```

## 根本原因
- Docker 服務名稱 `db:5432` 只能在 Docker 網路內解析
- 本地運行的 Backend 需要使用 `localhost:5432` 來連接映射的端口

## 📊 連接方式對比

| 執行環境 | Backend 位置 | PostgreSQL 位置 | 正確連接字串 |
|---------|-------------|----------------|-------------|
| 🐳 Docker Compose | Docker 容器內 | Docker 容器內 | `postgresql://...@db:5432/...` |
| 🖥️ 本地開發 | 本地 WSL | Docker 容器 | `postgresql://...@localhost:5432/...` |

## 🚀 解決方案

### 步驟 1：創建後端環境配置文件
在 `apps/backend/` 目錄下創建 `.env` 文件：

```bash
# 進入後端目錄
cd apps/backend

# 創建 .env 文件
cat > .env << 'EOF'
# 本地開發環境配置 (WSL Backend + Docker Services)

# 資料庫連接 (Docker PostgreSQL 映射到 localhost:5432)
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/rentrent?schema=public"

# Redis 連接 (Docker Redis 映射到 localhost:6379)  
REDIS_URL="redis://localhost:6379"
REDIS_HOST="localhost"
REDIS_PORT="6379"

# API 配置
PORT=8000
NODE_ENV=development
API_PREFIX=/api
LOG_LEVEL=debug

# Google Maps API Key
GOOGLE_MAPS_API_KEY=AIzaSyDh7J8-kb37h1_XcldmVtKEBz05eCbYsKo

# OpenRouteService API Key
OPENROUTESERVICE_API_KEY=5b3ce3597851110001cf62488a936f5bbc834b9cb6eadc98115a7617

# Mapbox API Key (如果有的話)
MAPBOX_API_KEY=
EOF
```

### 步驟 2：確保 Docker 服務運行
```bash
# 啟動 PostgreSQL 和 Redis
docker-compose up -d db redis

# 檢查服務狀態
docker-compose ps
```

### 步驟 3：測試連接
```bash
# 測試 PostgreSQL 連接
psql -h localhost -p 5432 -U postgres -d rentrent

# 測試 Redis 連接  
redis-cli -h localhost -p 6379 ping
```

### 步驟 4：重啟後端服務
```bash
# 在後端目錄下
npm run dev
```

## 🔍 驗證連接成功
在後端日誌中應該看到：
```
✅ 資料庫連接成功
✅ Redis 連接成功
```

而不是：
```
❌ Can't reach database server at `db:5432`
```

## 🎯 其他連接方式

### 使用 host.docker.internal (替代方案)
如果 localhost 不工作，可以嘗試：
```bash
DATABASE_URL="postgresql://postgres:postgres@host.docker.internal:5432/rentrent?schema=public"
```

### 使用 Docker 網路 (完全 Docker 方案)
如果希望在 Docker 中運行 Backend：
```bash
# 使用 docker-compose 啟動所有服務
docker-compose up backend
```

## ⚠️ 常見問題

### Q: 為什麼不能用 `db:5432`？
A: `db` 是 Docker Compose 的服務名稱，只有在 Docker 網路內才能解析。

### Q: 端口 5432 被佔用怎麼辦？
A: 修改 docker-compose.yml 中的端口映射，例如 `"5433:5432"`，然後相應更新 DATABASE_URL。

### Q: 還是連接不上怎麼辦？
A: 檢查防火牆設定，確保 WSL 可以訪問 localhost 的端口。

## 🎉 測試混合模式
連接修復後，您就可以測試混合模式了：
```bash
# 前端 .env.local
NEXT_PUBLIC_USE_MOCK_DATA=true
NEXT_PUBLIC_USE_REAL_COMMUTE_API=true
``` 