# Python Docker 開發環境

這是一個基於Docker的Python開發環境，提供了快速啟動Python專案的基礎設置。

## 環境內容

- Python 3.11
- 基本的系統依賴（git, curl等）
- 常用Python庫（requests, pandas, numpy等）
- FastAPI Web框架
- 網頁爬蟲工具（Selenium, BeautifulSoup）

## 如何使用

### 1. 構建並啟動容器

```bash
# 使用docker-compose啟動服務
docker-compose up -d

# 查看日誌
docker-compose logs -f
```

### 2. 訪問應用

- API服務: http://localhost:8000
- API文檔: http://localhost:8000/docs

### 3. 運行爬蟲示例

```bash
# 進入容器
docker-compose exec app bash

# 在容器內運行Selenium爬蟲示例
python crawler_example.py

# 在容器內運行BeautifulSoup爬蟲示例
python bs4_example.py
```

### 4. 自定義環境

- 在`requirements.txt`中添加或移除Python依賴
- 在`Dockerfile`中修改系統依賴
- 在`docker-compose.yml`中調整容器配置

### 5. 常用命令

```bash
# 重新構建容器
docker-compose up -d --build

# 停止服務
docker-compose down

# 進入容器shell
docker-compose exec app bash
```

## 爬蟲工具說明

本環境已安裝兩種主要的網頁爬蟲工具：

1. **Selenium** - 可以模擬瀏覽器行為，處理動態加載的網頁
   - 示例文件：`crawler_example.py`
   - 適合爬取需要JavaScript動態加載內容的網站

2. **BeautifulSoup** - 輕量級的HTML/XML解析庫
   - 示例文件：`bs4_example.py`
   - 適合爬取靜態網頁內容

## 目錄結構

```
.
├── Dockerfile          # Docker容器定義
├── docker-compose.yml  # Docker服務配置
├── requirements.txt    # Python依賴列表
├── app.py              # 示例應用入口
├── crawler_example.py  # Selenium爬蟲示例
├── bs4_example.py      # BeautifulSoup爬蟲示例
└── README.md           # 說明文檔
``` 