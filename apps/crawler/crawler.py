import time
import json
import os
import re
from urllib.parse import parse_qs, urlparse
from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.common.exceptions import TimeoutException, NoSuchElementException, WebDriverException, InvalidSessionIdException
import random
import traceback
import tempfile
import shutil

LOG_FOLDER = "logs"
if not os.path.exists(LOG_FOLDER):
    os.makedirs(LOG_FOLDER)

# 確保data目錄存在
DATA_FOLDER = "data"
if not os.path.exists(DATA_FOLDER):
    os.makedirs(DATA_FOLDER)

def setup_browser():
    """設置Chrome瀏覽器，增強反爬蟲能力"""
    from selenium.webdriver.chrome.options import Options
    
    # 現代瀏覽器的使用者代理，定期更新
    user_agents = [
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36 Edg/119.0.0.0",
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:120.0) Gecko/20100101 Firefox/120.0"
    ]
    user_agent = random.choice(user_agents)
    
    # 1. 設置瀏覽器配置
    try:
        print("創建Chrome瀏覽器...")
        chrome_options = Options()
        chrome_options.add_argument("--headless=new")
        chrome_options.add_argument("--no-sandbox")
        chrome_options.add_argument("--disable-dev-shm-usage")
        chrome_options.add_argument("--incognito")
        chrome_options.add_argument(f"--user-agent={user_agent}")
        chrome_options.add_argument("--disable-blink-features=AutomationControlled")
        chrome_options.add_experimental_option("excludeSwitches", ["enable-automation"])
        chrome_options.add_experimental_option('useAutomationExtension', False)
        
        browser = webdriver.Chrome(options=chrome_options)
        
        # 設置更長的超時等待
        browser.set_page_load_timeout(120)  # 增加到120秒
        browser.implicitly_wait(10)
        
        # 隱藏webdriver特徵
        browser.execute_script("Object.defineProperty(navigator, 'webdriver', {get: () => undefined})")
        
        return browser
    except Exception as e:
        print(f"瀏覽器創建失敗: {e}")
        
        # 2. 備用配置
        try:
            print("嘗試使用備用配置...")
            chrome_options = Options()
            chrome_options.add_argument("--headless=new")
            chrome_options.add_argument("--no-sandbox")
            
            browser = webdriver.Chrome(options=chrome_options)
            browser.set_page_load_timeout(60)
            print("備用配置成功!")
            return browser
        except Exception as e:
            print(f"備用配置失敗: {e}")
            raise e  # 如果連備用配置都失敗，則向上傳遞異常

def safe_get_page(browser, url, max_retries=3):
    """安全地訪問頁面，帶重試機制"""
    for attempt in range(max_retries):
        try:
            print(f"嘗試訪問頁面 (第 {attempt + 1}/{max_retries} 次): {url}")
            browser.get(url)
            
            # 等待頁面載入
            time.sleep(random.uniform(3, 6))
            
            # 檢查頁面是否載入成功
            if "租屋" in browser.title or "house" in browser.current_url:
                print("✅ 頁面載入成功")
                return True
            else:
                print(f"⚠️  頁面載入異常，標題: {browser.title}")
                
        except Exception as e:
            print(f"❌ 訪問頁面失敗 (第 {attempt + 1} 次): {e}")
            if attempt < max_retries - 1:
                wait_time = random.uniform(5, 10)
                print(f"等待 {wait_time:.1f} 秒後重試...")
                time.sleep(wait_time)
            else:
                print("所有重試都失敗")
                return False
    
    return False

def detect_region_filters(browser):
    """檢測網站是否有地區篩選功能"""
    try:
        print("🔍 檢測地區篩選功能...")
        
        # 檢查常見的篩選元素
        filter_selectors = [
            "select[name*='city']",
            "select[name*='region']", 
            "select[name*='area']",
            ".filter-city",
            ".region-select",
            "[data-test*='city']",
            "[data-test*='region']",
            "button",  # 檢查所有按鈕，稍後篩選包含'新北'的
            "a",       # 檢查所有連結，稍後篩選包含'新北'的
            "select",  # 檢查所有下拉選單
            ".dropdown"
        ]
        
        found_filters = []
        for selector in filter_selectors:
            try:
                elements = browser.find_elements(By.CSS_SELECTOR, selector)
                if elements:
                    for element in elements:
                        # 檢查元素的文字內容
                        text_content = element.text
                        html_content = element.get_attribute('outerHTML')[:200]
                        
                        # 如果是按鈕或連結，檢查是否包含地區相關文字
                        if selector in ["button", "a"]:
                            if any(keyword in text_content for keyword in ['新北', '台北', '桃園', '地區', '城市']):
                                found_filters.append(f"地區相關 {selector}: {text_content[:50]} | HTML: {html_content[:100]}")
                        else:
                            found_filters.append(f"篩選元素 {selector}: {text_content[:50]} | HTML: {html_content[:100]}")
            except Exception as e:
                print(f"檢查選擇器 {selector} 時出錯: {e}")
                continue
        
        if found_filters:
            print("✅ 找到可能的篩選元素:")
            for filter_info in found_filters:
                print(f"   - {filter_info}")
        else:
            print("❌ 未找到明顯的地區篩選功能")
            
        # 檢查頁面URL和內容，看是否有地區相關的資訊
        current_url = browser.current_url
        page_source = browser.page_source
        
        print(f"當前URL: {current_url}")
        if "新北" in page_source:
            print("✅ 頁面內容包含'新北'字樣")
        else:
            print("❌ 頁面內容不包含'新北'字樣")
            
        return found_filters
        
    except Exception as e:
        print(f"檢測篩選功能時出錯: {e}")
        return []

def determine_city_from_coordinates(lat, lng):
    """根據經緯度判斷城市"""
    if lat is None or lng is None:
        return "未知"
    
    # 台北市邊界 (精確的核心市區，避免與新北市重疊)
    taipei_boundaries = {
        "north": 25.25,    # 縮小範圍
        "south": 24.97,    
        "east": 121.61,    # 縮小範圍
        "west": 121.47     # 縮小範圍
    }
    
    # 新北市邊界 (包含周邊區域)
    new_taipei_boundaries = {
        "north": 25.40,   # 包含淡水、石門
        "south": 24.60,   # 包含烏來、坪林
        "east": 122.00,   # 包含貢寮、瑞芳
        "west": 121.20    # 包含林口、五股、三重
    }
    
    # 桃園市邊界
    taoyuan_boundaries = {
        "north": 25.300,
        "south": 24.886,
        "east": 121.466,
        "west": 121.156
    }
    
    # 新北市特定區域的精確判斷（優先）
    new_taipei_specific_areas = [
        # 三重區
        {"north": 25.08, "south": 25.04, "east": 121.50, "west": 121.48},
        # 蘆洲區  
        {"north": 25.10, "south": 25.07, "east": 121.49, "west": 121.46},
        # 五股區
        {"north": 25.12, "south": 25.08, "east": 121.47, "west": 121.42},
    ]
    
    # 先檢查新北市特定區域
    for area in new_taipei_specific_areas:
        if (area["south"] <= lat <= area["north"] and 
            area["west"] <= lng <= area["east"]):
            return "新北市"
    
    # 再檢查台北市核心區域
    if (taipei_boundaries["south"] <= lat <= taipei_boundaries["north"] and 
        taipei_boundaries["west"] <= lng <= taipei_boundaries["east"]):
        return "台北市"
    
    # 最後檢查新北市大範圍
    elif (new_taipei_boundaries["south"] <= lat <= new_taipei_boundaries["north"] and 
          new_taipei_boundaries["west"] <= lng <= new_taipei_boundaries["east"]):
        return "新北市"
    elif (taoyuan_boundaries["south"] <= lat <= taoyuan_boundaries["north"] and 
          taoyuan_boundaries["west"] <= lng <= taoyuan_boundaries["east"]):
        return "桃園市"
    else:
        return "其他"

def extract_coordinates(url):
    """從Google Maps URL中提取經緯度"""
    try:
        # 解析URL
        parsed_url = urlparse(url)
        
        # 從query參數中獲取經緯度
        query_params = parse_qs(parsed_url.query)
        if 'query' in query_params:
            # query格式通常是 "latitude,longitude"
            coords = query_params['query'][0].split(',')
            if len(coords) == 2:
                latitude = float(coords[0])
                longitude = float(coords[1])
                return {"latitude": latitude, "longitude": longitude}
        
        # 如果上面的方法失敗，嘗試從URL中直接提取數字
        coords_match = re.search(r'query=(-?\d+\.\d+),(-?\d+\.\d+)', url)
        if coords_match:
            latitude = float(coords_match.group(1))
            longitude = float(coords_match.group(2))
            return {"latitude": latitude, "longitude": longitude}
            
        print(f"無法從URL中提取經緯度: {url}")
        return {"latitude": None, "longitude": None}
    except Exception as e:
        print(f"提取經緯度時出錯: {e}")
        return {"latitude": None, "longitude": None}

def crawl_house_details(browser, house_url, target_region=None):
    """爬取單個房屋的詳細資訊"""
    try:
        # 訪問房屋詳情頁
        print(f"訪問房屋詳情頁: {house_url}")
        if not safe_get_page(browser, house_url):
            print(f"❌ 無法訪問房屋頁面: {house_url}")
            return None
        
        # 等待頁面完全載入
        time.sleep(2)
        
        house_data = {"url": house_url}
        
        # 爬取房屋名稱
        try:
            title_element = browser.find_element(By.CSS_SELECTOR, "h1.mb-3.text-2xl.font-bold")
            house_data["title"] = title_element.text.strip()
            print(f"房屋名稱: {house_data['title']}")
        except Exception as e:
            print(f"⚠️  抓取房屋名稱時出錯: {e}")
            # 嘗試其他選擇器
            try:
                title_element = browser.find_element(By.CSS_SELECTOR, "h1")
                house_data["title"] = title_element.text.strip()
                print(f"房屋名稱 (備用選擇器): {house_data['title']}")
            except:
                print(f"❌ 無法獲取房屋名稱，跳過此房屋")
                return None
        
        # 爬取價格 - 直接從頁面源碼搜尋，最可靠的方法
        price = "0"
        
        try:
            page_source = browser.page_source
            import re
            
            # 尋找所有價格模式，按優先級排序
            price_patterns = [
                r'(\d{1,3}(?:,\d{3})*)\s*元/月',  # 標準格式：12,000元/月
                r'(\d{1,3}(?:,\d{3})*)\s*元',     # 簡單格式：12,000元
                r'租金[：:]\s*(\d{1,3}(?:,\d{3})*)', # 租金：12000
                r'月租[：:]\s*(\d{1,3}(?:,\d{3})*)', # 月租：12000
            ]
            
            for pattern in price_patterns:
                matches = re.findall(pattern, page_source)
                if matches:
                    # 找到數字，取最大的（通常是正確的租金）
                    prices = [int(match.replace(',', '')) for match in matches]
                    max_price = max(prices)
                    if max_price >= 5000:  # 合理的租金範圍
                        price = str(max_price)
                        print(f"價格: {price} (從模式 '{pattern}' 找到)")
                        break
            
            # 如果還是沒找到，搜尋更寬泛的數字模式
            if price == "0":
                all_numbers = re.findall(r'(\d{1,3}(?:,\d{3})*)', page_source)
                candidate_prices = []
                for num_str in all_numbers:
                    num = int(num_str.replace(',', ''))
                    # 合理的租金範圍：5000-200000
                    if 5000 <= num <= 200000:
                        candidate_prices.append(num)
                
                if candidate_prices:
                    # 取出現頻率最高的價格，或者最大的價格
                    from collections import Counter
                    counter = Counter(candidate_prices)
                    if counter:
                        price = str(counter.most_common(1)[0][0])
                        print(f"價格: {price} (候選價格中最常見的)")
            
            if price == "0":
                print(f"⚠️  無法獲取有效價格，使用預設值 0")
                price = "0"
                
        except Exception as e:
            print(f"⚠️  價格抓取異常: {e}，使用預設值 0")
            price = "0"
        
        house_data["price"] = price
        
        # 爬取基本資料（坪數、地址、格局等）
        try:
            print("📋 開始抓取基本資料...")
            
            # 抓取地址 - 嘗試多種選擇器
            address = None
            try:
                # 方法1: 尋找地址相關的元素
                address_elements = browser.find_elements(By.XPATH, "//span[contains(text(), '地址')]/following-sibling::span")
                if address_elements:
                    address = address_elements[0].text.strip()
                    print(f"   地址 (方法1): {address}")
                
                # 方法2: 從頁面source中搜尋地址模式
                if not address:
                    page_source = browser.page_source
                    import re
                    # 匹配台灣地址模式
                    address_patterns = [
                        r'(台北市|新北市|基隆市|桃園市|新竹市|新竹縣|苗栗縣|台中市|彰化縣|南投縣|雲林縣|嘉義市|嘉義縣|台南市|高雄市|屏東縣|台東縣|花蓮縣|宜蘭縣|澎湖縣|金門縣|連江縣)[^<>"]{10,50}',
                    ]
                    
                    for pattern in address_patterns:
                        address_match = re.search(pattern, page_source)
                        if address_match:
                            address = address_match.group(0)
                            print(f"   地址 (正則表達式): {address}")
                            break
                
                if address:
                    house_data["address"] = address
                else:
                    house_data["address"] = house_data["title"]  # 備用
                    print("   ⚠️  無法獲取地址，使用標題作為地址")
                    
            except Exception as addr_e:
                print(f"   ⚠️  抓取地址失敗: {addr_e}")
                house_data["address"] = house_data["title"]
            
            # 抓取基本資料 - 根據新的HTML結構優化
            try:
                # 方法1: 精確抓取 base_info 區塊
                base_info_section = browser.find_element(By.CSS_SELECTOR, "div.base_info")
                
                # 抓取坪數
                ping_element = base_info_section.find_element(By.XPATH, ".//span[contains(text(), '坪數')]/following-sibling::span")
                ping_text = ping_element.text.strip()
                
                if ping_text and "坪" in ping_text:
                    print(f"   坪數: {ping_text}")
                    # 提取數字部分：支援"使用8坪"、"8坪"、"8.5坪"等格式  
                    import re
                    numbers = re.findall(r'([0-9]+\.?[0-9]*)', ping_text)
                    if numbers:
                        house_data["size"] = numbers[0]
                        house_data["size_detail"] = ping_text  # 保存完整描述
                        print(f"   解析坪數: {house_data['size']} 坪")
                    else:
                        house_data["size"] = "0"
                        house_data["size_detail"] = ping_text
                else:
                    raise Exception("在base_info中找不到坪數")
                    
            except Exception as base_info_e:
                print(f"   ⚠️  base_info抓取失敗，嘗試其他方法: {base_info_e}")
                try:
                    # 方法2: 備用選擇器
                    ping_elements = browser.find_elements(By.XPATH, "//span[contains(text(), '坪數')]/following-sibling::span | //div[contains(text(), '坪數')]/following-sibling::div")
                    
                    ping_text = None
                    for element in ping_elements:
                        text = element.text.strip()
                        if "坪" in text and any(char.isdigit() for char in text):
                            ping_text = text
                            break
                    
                    if ping_text:
                        print(f"   坪數 (備用方法): {ping_text}")
                        numbers = re.findall(r'([0-9]+\.?[0-9]*)', ping_text)
                        if numbers:
                            house_data["size"] = numbers[0]
                            house_data["size_detail"] = ping_text
                            print(f"   解析坪數: {house_data['size']} 坪")
                        else:
                            house_data["size"] = "0"
                            house_data["size_detail"] = ping_text
                    else:
                        # 方法3: 從頁面source搜尋坪數
                        page_source = browser.page_source
                        ping_match = re.search(r'使用([0-9]+\.?[0-9]*)\s*坪|權狀([0-9]+\.?[0-9]*)\s*坪|([0-9]+\.?[0-9]*)\s*坪', page_source)
                        if ping_match:
                            ping_num = ping_match.group(1) or ping_match.group(2) or ping_match.group(3)
                            house_data["size"] = ping_num
                            house_data["size_detail"] = ping_match.group(0)
                            print(f"   坪數 (正則): {house_data['size']} 坪")
                        else:
                            house_data["size"] = "0"
                            house_data["size_detail"] = "未提供"
                            print("   ⚠️  無法獲取坪數")
                            
                except Exception as size_e:
                    print(f"   ⚠️  抓取坪數失敗: {size_e}")
                    house_data["size"] = "0"
                    house_data["size_detail"] = "未提供"
            
            # 繼續在同一個 base_info 區塊中抓取其他資料
            try:
                # 在已找到的 base_info_section 中抓取所有資料
                
                # 抓取格局資訊
                try:
                    layout_element = base_info_section.find_element(By.XPATH, ".//span[contains(text(), '格局')]/following-sibling::span")
                    layout = layout_element.text.strip()
                    house_data["room_layout"] = layout
                    print(f"   格局: {layout}")
                except:
                    # 備用方法
                    layout_elements = browser.find_elements(By.XPATH, "//span[contains(text(), '格局')]/following-sibling::span")
                    layout = None
                    for element in layout_elements:
                        text = element.text.strip()
                        if "房" in text or "廳" in text or "衛" in text:
                            layout = text
                            break
                    
                    if not layout:
                        # 從頁面搜尋格局模式
                        page_source = browser.page_source
                        layout_match = re.search(r'([0-9]+房[0-9]*廳[0-9]*衛[^<>"]*)', page_source)
                        if layout_match:
                            layout = layout_match.group(1)
                    
                    house_data["room_layout"] = layout or "未提供"
                    print(f"   格局 (備用): {house_data['room_layout']}")
                
                # 抓取樓層資訊
                try:
                    floor_element = base_info_section.find_element(By.XPATH, ".//span[contains(text(), '樓層')]/following-sibling::span")
                    floor = floor_element.text.strip()
                    house_data["floor_info"] = floor
                    print(f"   樓層: {floor}")
                except:
                    # 備用方法
                    floor_elements = browser.find_elements(By.XPATH, "//span[contains(text(), '樓層')]/following-sibling::span")
                    floor = None
                    for element in floor_elements:
                        text = element.text.strip()
                        if "樓" in text and any(char.isdigit() for char in text):
                            floor = text
                            break
                    
                    house_data["floor_info"] = floor or "未提供"
                    print(f"   樓層 (備用): {house_data['floor_info']}")
                
                # 抓取房屋現況和型態
                try:
                    # 現況 (如：分租套房)
                    status_element = base_info_section.find_element(By.XPATH, ".//span[contains(text(), '現況')]/following-sibling::span")
                    house_status = status_element.text.strip()
                    
                    # 型態 (如：公寓)
                    type_element = base_info_section.find_element(By.XPATH, ".//span[contains(text(), '型態')]/following-sibling::span")
                    house_type = type_element.text.strip()
                    
                    # 合併現況和型態
                    house_data["house_type"] = f"{house_status} ({house_type})"
                    print(f"   房屋類型: {house_data['house_type']}")
                    
                except:
                    # 備用方法 - 分別嘗試
                    try:
                        type_elements = browser.find_elements(By.XPATH, "//span[contains(text(), '型態')]/following-sibling::span | //span[contains(text(), '現況')]/following-sibling::span")
                        house_type = None
                        for element in type_elements:
                            text = element.text.strip()
                            if text and text not in ["", "-"]:
                                house_type = text
                                break
                        
                        house_data["house_type"] = house_type or "未提供"
                        print(f"   房屋類型 (備用): {house_data['house_type']}")
                    except:
                        house_data["house_type"] = "未提供"
                        print("   ⚠️  無法獲取房屋類型")
                
                # 抓取車位資訊 (新增)
                try:
                    parking_element = base_info_section.find_element(By.XPATH, ".//span[contains(text(), '車位')]/following-sibling::span")
                    parking = parking_element.text.strip()
                    house_data["parking"] = parking
                    print(f"   車位: {parking}")
                except:
                    house_data["parking"] = "未提供"
                    print("   車位: 未提供")
                
            except Exception as base_info_extract_e:
                print(f"   ⚠️  抓取base_info其他資料失敗: {base_info_extract_e}")
                # 設定預設值
                house_data["room_layout"] = house_data.get("room_layout", "未提供")
                house_data["floor_info"] = house_data.get("floor_info", "未提供") 
                house_data["house_type"] = house_data.get("house_type", "未提供")
                house_data["parking"] = house_data.get("parking", "未提供")
                
        except Exception as e:
            print(f"⚠️  抓取基本資料時出錯: {e}")
            # 設定預設值
            house_data["address"] = house_data["title"]
            house_data["size"] = "0"
            house_data["size_detail"] = "未提供"
            house_data["room_layout"] = "未提供"
            house_data["floor_info"] = "未提供"
            house_data["house_type"] = "未提供"
            house_data["parking"] = "未提供"
        
        # 爬取房屋圖片（新增）
        try:
            print("🖼️  開始抓取房屋圖片...")
            images = []
            
            # 方法1: 尋找圖片光箱容器（overflow-auto）
            try:
                lightbox_container = browser.find_element(By.CSS_SELECTOR, "div.overflow-auto")
                image_elements = lightbox_container.find_elements(By.CSS_SELECTOR, "img")
                
                for img in image_elements[:2]:  # 只取前2張圖片
                    img_src = img.get_attribute("src")
                    img_data_src = img.get_attribute("data-src")
                    
                    # 優先使用data-src，沒有則使用src
                    image_url = img_data_src if img_data_src else img_src
                    
                    if image_url and image_url.startswith("http"):
                        images.append(image_url)
                        print(f"   ✅ 找到圖片: {image_url}")
                
                print(f"從光箱容器抓取到 {len(images)} 張圖片")
                
            except Exception as lightbox_e:
                print(f"⚠️  光箱方法失敗: {lightbox_e}")
            
            # 方法2: 如果光箱方法失敗，嘗試通用圖片選擇器
            if len(images) < 2:
                print("嘗試通用圖片選擇器...")
                try:
                    all_images = browser.find_elements(By.CSS_SELECTOR, "img[src*='houseprice.tw'], img[data-src*='houseprice.tw']")
                    
                    for img in all_images:
                        if len(images) >= 2:
                            break
                            
                        img_src = img.get_attribute("src")
                        img_data_src = img.get_attribute("data-src")
                        
                        image_url = img_data_src if img_data_src else img_src
                        
                        if (image_url and 
                            image_url.startswith("http") and 
                            "houseprice.tw" in image_url and
                            image_url not in images):
                            images.append(image_url)
                            print(f"   ✅ 找到圖片: {image_url}")
                    
                    print(f"通用方法額外抓取到 {len(images)} 張圖片")
                    
                except Exception as general_e:
                    print(f"⚠️  通用方法失敗: {general_e}")
            
            # 保存圖片到資料中
            house_data["images"] = images[:2]  # 最多保存2張圖片
            print(f"✅ 總共保存 {len(house_data['images'])} 張圖片")
            
        except Exception as e:
            print(f"⚠️  抓取圖片時出錯: {e}")
            house_data["images"] = []  # 空陣列，不影響其他資料
        
        # 爬取地理座標 - 改進版本
        try:
            page_source = browser.page_source
            import re
            
            # 多種座標模式搜尋
            coordinate_patterns = [
                r'"lat"[:\s]*([0-9.-]+)',  # "lat": 25.xxx
                r'"latitude"[:\s]*([0-9.-]+)',  # "latitude": 25.xxx
                r'lat[:\s]*([0-9.-]+)',   # lat: 25.xxx
                r'latitude[:\s]*([0-9.-]+)',  # latitude: 25.xxx
                r'lat=([0-9.-]+)',        # lat=25.xxx
            ]
            
            longitude_patterns = [
                r'"lng"[:\s]*([0-9.-]+)',  # "lng": 121.xxx
                r'"longitude"[:\s]*([0-9.-]+)',  # "longitude": 121.xxx
                r'lng[:\s]*([0-9.-]+)',   # lng: 121.xxx
                r'longitude[:\s]*([0-9.-]+)',  # longitude: 121.xxx
                r'lng=([0-9.-]+)',        # lng=121.xxx
            ]
            
            lat = None
            lng = None
            
            # 嘗試所有模式找座標
            for pattern in coordinate_patterns:
                lat_match = re.search(pattern, page_source, re.IGNORECASE)
                if lat_match:
                    potential_lat = float(lat_match.group(1))
                    if 20 <= potential_lat <= 30:  # 台灣的緯度範圍
                        lat = potential_lat
                        break
            
            for pattern in longitude_patterns:
                lng_match = re.search(pattern, page_source, re.IGNORECASE)
                if lng_match:
                    potential_lng = float(lng_match.group(1))
                    if 115 <= potential_lng <= 125:  # 台灣的經度範圍
                        lng = potential_lng
                        break
            
            # 如果JavaScript方法失敗，嘗試從Google Maps連結提取
            if lat is None or lng is None:
                print("嘗試從Google Maps連結提取座標...")
                try:
                    map_elements = browser.find_elements(By.CSS_SELECTOR, "a[href*='google.com/maps']")
                    if not map_elements:
                        map_elements = browser.find_elements(By.CSS_SELECTOR, "a[href*='maps.google']")
                    
                    for map_element in map_elements:
                        map_url = map_element.get_attribute("href")
                        if map_url:
                            coords = extract_coordinates(map_url)
                            if coords["latitude"] and coords["longitude"]:
                                lat = coords["latitude"]
                                lng = coords["longitude"]
                                print("✅ 從Google Maps連結成功提取座標")
                                break
                except Exception as map_e:
                    print(f"Google Maps連結提取失敗: {map_e}")
            
            if lat is not None and lng is not None:
                house_data["latitude"] = lat
                house_data["longitude"] = lng
                
                # 直接使用目標地區，不用經緯度判斷
                house_data["detected_city"] = target_region or "未知"
                print(f"地理座標: {lat}, {lng} ({target_region})")
            else:
                print("⚠️  無法獲取地理座標，使用預設值")
                house_data["detected_city"] = target_region or "未知"
                house_data["latitude"] = None
                house_data["longitude"] = None
                # 不要因為座標問題就跳過房屋，仍然返回其他資訊
                
        except Exception as e:
            print(f"⚠️  抓取地理座標時出錯: {e}")
            house_data["detected_city"] = target_region or "未知"
            house_data["latitude"] = None
            house_data["longitude"] = None

        # 抓取地區信息（從導航breadcrumb）
        try:
            print("🗺️  開始抓取地區信息...")
            district = None
            city = None
            
            # 方法1: 從導航breadcrumb抓取
            try:
                # 尋找導航容器
                nav_selectors = [
                    "nav.flex.space-x-2",  # 具體的導航樣式
                    "nav[class*='breadcrumb']",
                    "div[class*='breadcrumb']",
                    ".breadcrumb",
                    "nav",
                    "[class*='nav']"
                ]
                
                breadcrumb_found = False
                for selector in nav_selectors:
                    try:
                        nav_elements = browser.find_elements(By.CSS_SELECTOR, selector)
                        for nav_element in nav_elements:
                            nav_text = nav_element.text
                            nav_html = nav_element.get_attribute('innerHTML')
                            
                            # 檢查是否包含地區相關的文字
                            if any(keyword in nav_text for keyword in ['區', '市', '縣', '鄉', '鎮']):
                                print(f"   找到導航元素: {nav_text[:100]}")
                                
                                # 從導航中提取地區信息
                                # 尋找包含"區"的連結或文字
                                links = nav_element.find_elements(By.TAG_NAME, "a")
                                for link in links:
                                    link_text = link.text.strip()
                                    if link_text.endswith('區') or link_text.endswith('市') or link_text.endswith('縣'):
                                        if link_text.endswith('區'):
                                            district = link_text
                                            print(f"   ✅ 從導航抓取到地區: {district}")
                                            breadcrumb_found = True
                                            break
                                        elif link_text.endswith('市') or link_text.endswith('縣'):
                                            city = link_text
                                            print(f"   ✅ 從導航抓取到城市: {city}")
                                
                                if breadcrumb_found:
                                    break
                    except Exception as nav_e:
                        continue
                    
                    if breadcrumb_found:
                        break
                        
            except Exception as breadcrumb_e:
                print(f"   導航方法失敗: {breadcrumb_e}")
            
            # 方法2: 從頁面內容搜尋地區模式
            if not district:
                print("   嘗試從頁面內容搜尋地區...")
                try:
                    page_source = browser.page_source
                    
                    # 台灣常見的行政區列表
                    districts = [
                        # 台北市
                        '中正區', '大同區', '中山區', '松山區', '大安區', '萬華區', '信義區', '士林區', '北投區', '內湖區', '南港區', '文山區',
                        # 新北市
                        '板橋區', '三重區', '中和區', '永和區', '新莊區', '新店區', '樹林區', '鶯歌區', '三峽區', '淡水區', '汐止區', '瑞芳區',
                        '土城區', '蘆洲區', '五股區', '泰山區', '林口區', '深坑區', '石碇區', '坪林區', '烏來區', '金山區', '萬里區', '石門區',
                        '三芝區', '貢寮區', '平溪區', '雙溪區', '八里區',
                        # 桃園市
                        '桃園區', '中壢區', '大溪區', '楊梅區', '蘆竹區', '大園區', '龜山區', '八德區', '龍潭區', '平鎮區', '新屋區', '觀音區', '復興區'
                    ]
                    
                    # 搜尋頁面中是否包含這些地區名稱
                    for district_name in districts:
                        if district_name in page_source:
                            # 進一步驗證這是否真的是地區信息（不是無關的文字）
                            context_patterns = [
                                rf'{district_name}[^區市縣]*(?:出租|租屋|房屋)',
                                rf'(?:位於|在){district_name}',
                                rf'{district_name}(?:的|地區)',
                                rf'href="[^"]*{district_name}[^"]*"[^>]*>{district_name}</a>'
                            ]
                            
                            for pattern in context_patterns:
                                if re.search(pattern, page_source):
                                    district = district_name
                                    print(f"   ✅ 從頁面內容找到地區: {district}")
                                    break
                            
                            if district:
                                break
                                
                except Exception as content_e:
                    print(f"   頁面內容搜尋失敗: {content_e}")
            
            # 方法3: 從地址中提取地區
            if not district and house_data.get("address"):
                print("   嘗試從地址提取地區...")
                try:
                    address = house_data["address"]
                    # 使用正則表達式從地址中提取行政區
                    district_match = re.search(r'(台北市|新北市|桃園市|基隆市|新竹市|新竹縣)([^市縣]*區)', address)
                    if district_match:
                        city = district_match.group(1)
                        district = district_match.group(2)
                        print(f"   ✅ 從地址提取到: {city} {district}")
                        
                except Exception as addr_e:
                    print(f"   從地址提取失敗: {addr_e}")
            
            # 保存地區信息
            house_data["district"] = district or "未知"
            house_data["city"] = target_region or house_data.get("detected_city", "未知")
            
            if district:
                print(f"✅ 成功抓取地區信息: {house_data['city']} {house_data['district']}")
            else:
                print("⚠️  無法確定具體地區，使用預設值")
                
        except Exception as e:
            print(f"⚠️  抓取地區信息時出錯: {e}")
            house_data["district"] = "未知"
            house_data["city"] = house_data.get("detected_city", "未知")
        
        # 短暫休息避免請求過快
        time.sleep(random.uniform(0.5, 1.5))
        
        return house_data
        
    except Exception as e:
        print(f"❌ 爬取房屋詳情時發生嚴重錯誤: {e}")
        return None

def save_data_incrementally(house_data):
    """增量保存數據，每抓到一筆就保存"""
    json_file_path = os.path.join(DATA_FOLDER, "data.json")
    
    # 檢查文件是否存在
    existing_data = []
    if os.path.exists(json_file_path):
        try:
            with open(json_file_path, 'r', encoding='utf-8') as f:
                existing_data = json.load(f)
        except:
            existing_data = []
    
    # 添加新數據
    existing_data.append(house_data)
    
    # 保存回文件
    try:
        with open(json_file_path, 'w', encoding='utf-8') as f:
            json.dump(existing_data, f, ensure_ascii=False, indent=2)
        print(f"   💾 數據已保存，目前總計: {len(existing_data)} 筆")
        return True
    except Exception as e:
        print(f"   ❌ 保存數據失敗: {e}")
        return False

def crawl_5168_all_regions():
    """爬取租屋網站，收集所有地區的資料"""
    # 初始化數據文件
    json_file_path = os.path.join(DATA_FOLDER, "data.json")
    try:
        with open(json_file_path, 'w', encoding='utf-8') as f:
            json.dump([], f, ensure_ascii=False, indent=2)
        print(f"📋 初始化數據文件: {json_file_path}")
    except Exception as e:
        print(f"⚠️  初始化數據文件失敗: {e}")
    
    browser = setup_browser()
    try:
        # 訪問初始頁面
        if not safe_get_page(browser, "https://rent.houseprice.tw"):
            print("❌ 無法訪問主頁面，結束爬蟲")
            return
        
        # 檢測地區篩選功能
        detect_region_filters(browser)
        
        # 定義不同地區的URL - 每個地區抓20個房屋
        region_urls = {
            "新北市": "https://rent.houseprice.tw/list/21_usage/27-26-15-23-33-28-32-36-37-34-35-31-29-30-38-39-40-41-14-13-16-20-19-21-22-18-17-24-25_zip/?p=1",  # 新北市專用URL - 先爬新北
            "台北市": "https://rent.houseprice.tw"  # 主頁主要是台北市 - 後爬台北
        }
        
        all_house_data = []  # 存儲所有房屋的詳細數據
        
        # 對每個地區分別爬取
        for region_name, region_url in region_urls.items():
            print(f"\n🏙️  開始爬取 {region_name} 的租屋資料...")
            print(f"🔗 訪問URL: {region_url}")
            
            try:
                if safe_get_page(browser, region_url):
                    # 檢查此頁面是否有對應地區的內容
                    page_source = browser.page_source
                    region_count = page_source.count(region_name.replace("市", ""))
                    print(f"此頁面包含 {region_count} 個'{region_name.replace('市', '')}'字樣")
                    
                    # 爬取該地區的資料
                    region_data = crawl_current_page(browser, region_url, region_name)
                    if region_data:
                        all_house_data.extend(region_data)
                        print(f"✅ 從 {region_name} 收集到 {len(region_data)} 筆資料")
                        print(f"📊 目前總資料量: {len(all_house_data)} 筆")
                    else:
                        print(f"❌ 從 {region_name} 未收集到資料")
                    
                    print(f"🔄 {region_name} 處理完成，準備處理下一個地區...")
                    time.sleep(5)  # 地區間休息時間增加
                else:
                    print(f"❌ 無法訪問 {region_name} 頁面")
            except Exception as e:
                print(f"❌ 爬取 {region_name} 時發生錯誤: {e}")
                print("🔄 繼續處理下一個地區...")
                continue
        
        # 按地區分類和統計
        if all_house_data:
            print(f"\n=== 資料已分類完成 ===")
            
            # 統計結果
            city_stats = {}
            for item in all_house_data:
                city = item.get("detected_city", "未知")
                city_stats[city] = city_stats.get(city, 0) + 1
            
            print("📊 地區統計:")
            for city, count in sorted(city_stats.items(), key=lambda x: x[1], reverse=True):
                print(f"   {city}: {count} 筆")
            
            # 保存所有收集的數據到JSON文件
            json_file_path = os.path.join(DATA_FOLDER, "data.json")
            with open(json_file_path, 'w', encoding='utf-8') as f:
                json.dump(all_house_data, f, ensure_ascii=False, indent=2)
            print(f"\n=== 總計收集到 {len(all_house_data)} 個房屋資訊，已保存到 {json_file_path} ===")
            
            # 檢查各地區資料
            taipei_data = [item for item in all_house_data if item.get("detected_city") == "台北市"]
            new_taipei_data = [item for item in all_house_data if item.get("detected_city") == "新北市"]
            
            print(f"\n🎯 收集結果:")
            print(f"   台北市: {len(taipei_data)} 筆")
            print(f"   新北市: {len(new_taipei_data)} 筆")
            
            if new_taipei_data:
                print(f"\n🎉 成功找到新北市資料! 樣例:")
                for i, item in enumerate(new_taipei_data[:3]):
                    title = item.get('title', '未知')[:40]
                    price = item.get('price', '未知')
                    print(f"   {i+1}. {title} ({price})")
            else:
                print("❌ 未找到新北市資料，可能需要調整地理邊界")
        else:
            print("未收集到任何房屋資訊")
        
    except Exception as e:
        print(f"爬取過程中發生錯誤: {e}")
        traceback.print_exc()
    finally:
        browser.quit()
        print("爬蟲結束")

def crawl_current_page(browser, base_url, target_region=None):
    """爬取當前頁面及其分頁的所有資料"""
    page_data = []
    current_page = 1
    has_next_page = True
    max_pages = 3  # 每個地區爬取3頁，確保能抓到20個
    min_houses_per_region = 40  # 每個地區抓40筆資料
    successful_houses = 0  # 成功爬取的房屋數量
    failed_houses = 0     # 失敗的房屋數量
    
    while has_next_page and current_page <= max_pages and len(page_data) < min_houses_per_region:
        print(f"\n正在爬取 {target_region or '目標地區'} 第 {current_page} 頁...")
        
        # 提取當前頁面的房屋連結
        house_links = browser.find_elements(By.CSS_SELECTOR, "a.group")
        
        if len(house_links) > 0:
            print(f"第 {current_page} 頁找到 {len(house_links)} 個房屋連結")
            
            # 立即收集所有連結URLs，避免DOM失效問題
            house_urls = []
            for i, link in enumerate(house_links):
                try:
                    href = link.get_attribute("href")
                    if href:
                        house_urls.append(href)
                        print(f"   收集連結 {i+1}: {href}")
                except Exception as e:
                    print(f"⚠️  獲取第 {i+1} 個連結時出錯: {e}")
            
            print(f"成功收集到 {len(house_urls)} 個連結")
            
            # 根據需求處理房屋數量
            houses_needed = min_houses_per_region - len(page_data)
            if houses_needed > 0:
                # 每個地區只處理1個房屋，快速測試
                houses_to_process = min(len(house_urls), houses_needed)
                limited_urls = house_urls[:houses_to_process]
                print(f"處理 {len(limited_urls)} 個房屋（共 {len(house_urls)} 個，目標: {min_houses_per_region}，已有: {len(page_data)}）")
            else:
                print(f"✅ 已達到最小資料量要求（{min_houses_per_region} 筆），跳過剩餘房屋")
                break
            
            # 逐一訪問每個房屋詳情頁
            for i, url in enumerate(limited_urls):
                print(f"\n處理 {target_region or '目標地區'} 第 {current_page} 頁的第 {i+1}/{len(limited_urls)} 個房屋")
                
                try:
                    house_data = crawl_house_details(browser, url, target_region)
                    if house_data:
                        # 立即保存數據
                        if save_data_incrementally(house_data):
                            page_data.append(house_data)
                            successful_houses += 1
                            detected_city = house_data.get('detected_city', '未知')
                            print(f"   ✅ 已收集並保存資料 ({detected_city}) - 本頁總計: {len(page_data)} 筆")
                        else:
                            print(f"   ⚠️  數據抓取成功但保存失敗，繼續處理下一個")
                    else:
                        failed_houses += 1
                        print(f"   ❌ 跳過此房屋 - 失敗計數: {failed_houses}")
                
                except Exception as e:
                    failed_houses += 1
                    print(f"   ❌ 房屋處理異常: {e} - 失敗計數: {failed_houses}")
                    continue  # 繼續處理下一個房屋
                
                # 每爬取 5 個詳情頁休息一下，避免被封
                if (i + 1) % 5 == 0:
                    print("短暫休息中...")
                    time.sleep(random.uniform(2, 4))
        else:
            print(f"第 {current_page} 頁未找到任何房屋連結")
            break
        
        # 嘗試導航到下一頁
        if current_page < max_pages:
            # 構建下一頁URL
            if "?p=" in base_url:
                next_url = base_url.replace(f"?p={current_page}", f"?p={current_page + 1}")
            else:
                separator = "&" if "?" in base_url else "?"
                next_url = f"{base_url}{separator}p={current_page + 1}"
            
            print(f"嘗試訪問下一頁: {next_url}")
            if safe_get_page(browser, next_url):
                current_page += 1
                time.sleep(3)  # 頁面間休息時間增加
            else:
                print("無法訪問下一頁")
                has_next_page = False
        else:
            has_next_page = False
    
    print(f"\n📊 {target_region or '目標地區'} 爬取完成:")
    print(f"   成功: {successful_houses} 筆")
    print(f"   失敗: {failed_houses} 筆")
    print(f"   總計: {len(page_data)} 筆有效資料")
    
    if len(page_data) >= min_houses_per_region:
        print(f"   ✅ 達到目標數量 ({min_houses_per_region} 筆)")
    else:
        print(f"   ⚠️  未達目標數量 ({len(page_data)}/{min_houses_per_region} 筆)")
    
    return page_data

if __name__ == "__main__":
    # 使用新的不限制地區的爬蟲方法
    crawl_5168_all_regions()
  