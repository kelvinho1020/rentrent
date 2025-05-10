FROM python:3.9-slim

WORKDIR /app

# 安裝系統依賴
RUN apt-get update && apt-get install -y \
    build-essential \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# 針對 Selenium 安裝額外依賴
RUN apt-get update && apt-get install -y \
    wget \
    gnupg \
    unzip \
    && rm -rf /var/lib/apt/lists/*

# 安裝 Chrome (無頭瀏覽器爬蟲使用)
RUN wget -q -O - https://dl-ssl.google.com/linux/linux_signing_key.pub | apt-key add - \
    && echo "deb [arch=amd64] http://dl.google.com/linux/chrome/deb/ stable main" >> /etc/apt/sources.list.d/google-chrome.list \
    && apt-get update \
    && apt-get install -y google-chrome-stable \
    && rm -rf /var/lib/apt/lists/*

# 下載最新的 ChromeDriver
RUN CHROME_VERSION=$(google-chrome --version | awk '{print $3}' | awk -F. '{print $1}') \
    && CHROMEDRIVER_VERSION=$(wget -q -O - "https://chromedriver.storage.googleapis.com/LATEST_RELEASE_$CHROME_VERSION") \
    && wget -q "https://chromedriver.storage.googleapis.com/$CHROMEDRIVER_VERSION/chromedriver_linux64.zip" \
    && unzip chromedriver_linux64.zip \
    && mv chromedriver /usr/bin/chromedriver \
    && chmod +x /usr/bin/chromedriver \
    && rm chromedriver_linux64.zip

# 創建並激活虛擬環境
RUN python -m venv /venv
ENV PATH="/venv/bin:$PATH"

# 安裝 Python 依賴
COPY apps/scraper/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# 添加共享包路徑
ENV PYTHONPATH "${PYTHONPATH}:/packages"

# 複製應用程式碼
COPY apps/scraper/ .
COPY packages/ /packages/

# 設定入口點
ENTRYPOINT ["python", "main.py"] 