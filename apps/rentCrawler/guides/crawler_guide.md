# 網頁爬蟲入門指南

這份指南將幫助您了解網頁爬蟲的基本概念和技術，特別是使用Python的BeautifulSoup和Selenium這兩種常用工具。

## 什麼是網頁爬蟲

網頁爬蟲（Web Crawler）是一種自動抓取網站內容的程式。它可以幫助我們收集和分析網路上的數據，常用於：
- 資料收集與分析
- 價格監控
- 內容聚合
- 市場研究
- 自動化測試

## 爬蟲的基本流程

1. **發送請求**：向目標網站發送HTTP請求
2. **獲取內容**：接收網站返回的HTML內容
3. **解析數據**：從HTML中提取需要的信息
4. **存儲數據**：將數據保存到文件或數據庫中

## 爬蟲工具介紹

### 1. BeautifulSoup

BeautifulSoup是一個Python庫，用於從HTML和XML文件中提取數據。它提供了簡單的方法來導航、搜索和修改解析樹。

**適用場景**：
- 靜態網頁內容抓取
- 簡單的HTML解析需求
- 對性能要求不高的場景

**基本使用**：

```python
import requests
from bs4 import BeautifulSoup

# 發送請求獲取網頁
response = requests.get("https://example.com")

# 解析HTML
soup = BeautifulSoup(response.text, "html.parser")

# 提取數據：查找所有標題
titles = soup.find_all("h1")
for title in titles:
    print(title.text)
```

**常用選擇器**：
- `find()`：查找第一個匹配的元素
- `find_all()`：查找所有匹配的元素
- `select()`：使用CSS選擇器查找元素
- `select_one()`：使用CSS選擇器查找第一個匹配元素

### 2. Selenium

Selenium是一個自動化瀏覽器工具，能夠模擬真實用戶在瀏覽器中的行為。它可以加載JavaScript，處理動態內容。

**適用場景**：
- 需要處理JavaScript動態加載的內容
- 需要模擬用戶交互（點擊、滾動等）
- 需要處理登錄、表單填寫等場景

**基本使用**：

```python
from selenium import webdriver
from selenium.webdriver.common.by import By

# 設置瀏覽器選項
chrome_options = webdriver.ChromeOptions()
chrome_options.add_argument("--headless")  # 無頭模式
chrome_options.add_argument("--no-sandbox")
chrome_options.add_argument("--disable-dev-shm-usage")

# 創建瀏覽器實例
browser = webdriver.Chrome(options=chrome_options)

# 打開網頁
browser.get("https://example.com")

# 查找元素並處理
elements = browser.find_elements(By.CSS_SELECTOR, ".my-class")
for element in elements:
    print(element.text)

# 模擬點擊
button = browser.find_element(By.ID, "my-button")
button.click()

# 關閉瀏覽器
browser.quit()
```

**常用定位方式**：
- `By.ID`：通過ID定位元素
- `By.CLASS_NAME`：通過類名定位元素
- `By.CSS_SELECTOR`：通過CSS選擇器定位元素
- `By.XPATH`：通過XPath定位元素
- `By.TAG_NAME`：通過標籤名定位元素

## 實例講解

### 1. 使用BeautifulSoup抓取天氣信息（bs4_example.py）

這個實例中，我們使用BeautifulSoup抓取中央氣象局的天氣信息：

```python
import requests
from bs4 import BeautifulSoup

def crawl_weather():
    # 發送請求
    url = "https://www.cwb.gov.tw/V8/C/"
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/91.0.4472.124"
    }
    response = requests.get(url, headers=headers)
    
    # 解析HTML
    soup = BeautifulSoup(response.text, "html.parser")
    
    # 提取天氣信息
    weather_items = soup.select(".tab_content .w-20")
    
    # 輸出數據
    for item in weather_items[:6]:
        city = item.select_one(".heading_3").text.strip()
        temp = item.select_one(".tem-C").text.strip()
        print(f"{city}: 溫度 {temp}°C")
```

**重點說明**：
1. 添加`User-Agent`頭信息模擬瀏覽器請求
2. 使用CSS選擇器`.tab_content .w-20`定位天氣信息區塊
3. 通過`.select_one()`獲取具體信息

### 2. 使用Selenium抓取PTT看板（crawler_example.py）

這個實例中，我們使用Selenium抓取PTT首頁的看板列表：

```python
from selenium import webdriver
from selenium.webdriver.common.by import By

def crawl_ptt_titles():
    # 設置Chrome瀏覽器
    chrome_options = webdriver.ChromeOptions()
    chrome_options.add_argument("--headless")  # 無頭模式
    chrome_options.add_argument("--no-sandbox")
    chrome_options.add_argument("--disable-dev-shm-usage")
    browser = webdriver.Chrome(options=chrome_options)
    
    # 打開PTT首頁
    browser.get("https://www.ptt.cc/bbs/index.html")
    
    # 獲取看板名稱
    board_elements = browser.find_elements(By.CSS_SELECTOR, ".board-name")
    
    # 輸出數據
    for i, board in enumerate(board_elements[:10], 1):
        print(f"{i}. {board.text}")
    
    # 關閉瀏覽器
    browser.quit()
```

**重點說明**：
1. 使用`--headless`模式運行Chrome，不顯示瀏覽器界面
2. 使用`By.CSS_SELECTOR`配合選擇器`.board-name`定位元素
3. 使用`.text`屬性獲取元素文本內容

## 爬蟲注意事項

### 法律與道德

1. **尊重robots.txt**：這是網站定義的爬蟲規則文件，指示哪些頁面可以被爬取
2. **添加適當延遲**：避免頻繁請求導致服務器過載
3. **識別自己**：在請求頭中添加適當的User-Agent和聯繫信息
4. **遵循網站使用條款**：某些網站可能明確禁止爬蟲

### 技術問題

1. **網站結構變化**：網站更新可能導致爬蟲失效
2. **反爬蟲機制**：許多網站實施了防止爬蟲的措施
3. **IP限制**：頻繁請求可能導致IP被封
4. **驗證碼**：某些網站使用驗證碼防止自動訪問

## 進階話題

1. **代理IP**：使用代理IP輪換，避免被封
2. **多線程爬蟲**：提高爬取效率
3. **分布式爬蟲**：處理大規模爬取需求
4. **數據清洗與存儲**：處理和保存爬取的數據
5. **定時任務**：設置定期執行爬蟲

## 學習資源

1. BeautifulSoup官方文檔：https://www.crummy.com/software/BeautifulSoup/bs4/doc/
2. Selenium官方文檔：https://www.selenium.dev/documentation/
3. MDN Web文檔（學習HTML結構）：https://developer.mozilla.org/zh-TW/
4. DevTools使用指南（幫助分析網頁結構）：https://developer.chrome.com/docs/devtools/

## 開始實踐

最好的學習方法是實踐。從簡單的網頁開始，逐步挑戰更複雜的網站。記得分析網頁結構，尋找適當的選擇器，並且遵循網站的使用規則。 