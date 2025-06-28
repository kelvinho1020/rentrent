# Docker 和 Python 環境操作指南

這份指南適合Python初學者了解如何在Docker環境中進行Python開發。

## Docker基本概念

Docker是一個容器化平台，它可以讓你的應用程式及其依賴在一個隔離的環境中運行，無需擔心環境差異問題。

## 關於 Docker 構建和運行

### 1. 關於 docker build

當你使用 `docker-compose` 時，**不需要**手動執行 `docker build` 命令。第一次運行 `docker-compose up` 時，它會自動執行 `docker build` 來構建你的容器。

```bash
# 第一次運行時會自動構建
docker-compose up -d
```

### 2. 修改代碼後的處理

- **Python 代碼修改**：由於我們在 `docker-compose.yml` 中設置了卷掛載 (`.:/app`)，你修改的 Python 代碼會**即時同步**到容器中。此外，我在 `app.py` 中設置了 `reload=True`，所以修改 Python 代碼後**不需要**重新構建或重啟容器，它會自動重新加載。

- **Dockerfile 或 docker-compose.yml 修改**：如果你修改這些文件，則需要重新構建並啟動容器：

  ```bash
  docker-compose up -d --build
  ```

### 3. 安裝新的 Python 依賴

有兩種方式可以安裝新的 Python 依賴：

#### 方法一：直接修改 requirements.txt（推薦）

1. 在 `requirements.txt` 文件中添加你需要的新包，例如：
   ```
   # 爬蟲工具
   beautifulsoup4==4.12.2
   selenium==4.15.2
   ```

2. 然後重新構建容器：
   ```bash
   docker-compose up -d --build
   ```

#### 方法二：進入容器安裝後導出

1. 進入正在運行的容器：
   ```bash
   docker-compose exec app bash
   ```

2. 在容器內使用 pip 安裝依賴：
   ```bash
   pip install 你想安裝的包名
   ```

3. 安裝後，將依賴導出到 requirements.txt：
   ```bash
   pip freeze > requirements.txt
   ```

4. 退出容器（輸入 `exit`）

5. 重新構建容器：
   ```bash
   docker-compose up -d --build
   ```

## 常用指令參考

```bash
# 啟動容器
docker-compose up -d

# 查看容器日誌
docker-compose logs -f

# 進入容器內部
docker-compose exec app bash

# 停止並移除容器
docker-compose down

# 重新構建並啟動容器
docker-compose up -d --build
```

## 如何確認應用正在運行

啟動容器後，打開瀏覽器訪問：
- http://localhost:8000 - 應該看到一個簡單的 JSON 響應
- http://localhost:8000/docs - 查看 API 文檔

## 常見問題解決

### 端口被占用

如果8000端口被占用，你可以在`docker-compose.yml`中修改端口映射：

```yaml
ports:
  - "8001:8000"  # 將宿主機的8001端口映射到容器的8000端口
```

### 容器無法啟動

檢查日誌找出錯誤原因：

```bash
docker-compose logs
```

### 依賴安裝失敗

確保你的`requirements.txt`中的依賴版本兼容，或嘗試移除版本號讓pip安裝最新版本。

## Python開發提示

在這個環境中，你可以：

1. 編輯本地的Python文件，修改會自動同步到容器中
2. 利用FastAPI的自動重載功能，修改代碼後立即生效
3. 使用`/docs`端點查看和測試你的API

這個環境的優點是，你在本地修改代碼時，容器內的應用會自動更新，讓你可以專注於編寫Python代碼，無需頻繁重啟容器。這對於初學者來說非常方便。 