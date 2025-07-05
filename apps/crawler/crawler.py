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

LOG_FOLDER = "logs"
if not os.path.exists(LOG_FOLDER):
    os.makedirs(LOG_FOLDER)

DATA_FOLDER = "data"
if not os.path.exists(DATA_FOLDER):
    os.makedirs(DATA_FOLDER)

def setup_browser():
    """設置Chrome瀏覽器"""
    from selenium.webdriver.chrome.options import Options
    
    user_agents = [
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    ]
    user_agent = random.choice(user_agents)
    
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
    browser.set_page_load_timeout(120)
    browser.implicitly_wait(10)
    browser.execute_script("Object.defineProperty(navigator, 'webdriver', {get: () => undefined})")
    
    return browser

def safe_get_page(browser, url, max_retries=3):
    """安全地訪問頁面，帶重試機制"""
    for attempt in range(max_retries):
        try:
            browser.get(url)
            time.sleep(random.uniform(3, 6))
            
            if "租屋" in browser.title or "house" in browser.current_url:
                return True
                
        except Exception as e:
            if attempt < max_retries - 1:
                time.sleep(random.uniform(5, 10))
            else:
                return False
    return False

def extract_coordinates(url):
    """從Google Maps URL中提取經緯度"""
    try:
        parsed_url = urlparse(url)
        query_params = parse_qs(parsed_url.query)
        
        if 'query' in query_params:
            coords = query_params['query'][0].split(',')
            if len(coords) == 2:
                return {"latitude": float(coords[0]), "longitude": float(coords[1])}
        
        coords_match = re.search(r'query=(-?\d+\.\d+),(-?\d+\.\d+)', url)
        if coords_match:
            return {"latitude": float(coords_match.group(1)), "longitude": float(coords_match.group(2))}
            
        return {"latitude": None, "longitude": None}
    except Exception as e:
        return {"latitude": None, "longitude": None}

def crawl_house_details(browser, house_url, target_region=None):
    """爬取單個房屋的詳細資訊"""
    try:
        if not safe_get_page(browser, house_url):
            return None
        
        time.sleep(2)
        house_data = {"url": house_url}
        
        # 爬取房屋名稱
        try:
            title_element = browser.find_element(By.CSS_SELECTOR, "h1.mb-3.text-2xl.font-bold")
            house_data["title"] = title_element.text.strip()
        except:
            try:
                title_element = browser.find_element(By.CSS_SELECTOR, "h1")
                house_data["title"] = title_element.text.strip()
            except:
                return None
        
        # 爬取價格
        try:
            price_element = browser.find_element(By.CSS_SELECTOR, "span.text-3xl.font-bold.text-c-orange-700")
            price_text = price_element.text.strip().replace(',', '')
            if price_text.isdigit() and 1000 <= int(price_text) <= 500000:
                house_data["price"] = price_text
            else:
                house_data["price"] = "0"
        except:
            house_data["price"] = "0"
        
        # 爬取基本資料
        try:
            base_info_section = browser.find_element(By.CSS_SELECTOR, "div.base_info")
            
            # 坪數
            try:
                ping_element = base_info_section.find_element(By.XPATH, ".//span[contains(text(), '坪數')]/following-sibling::span")
                ping_text = ping_element.text.strip()
                numbers = re.findall(r'([0-9]+\.?[0-9]*)', ping_text)
                house_data["size"] = numbers[0] if numbers else "0"
                house_data["size_detail"] = ping_text
            except:
                house_data["size"] = "0"
                house_data["size_detail"] = "未提供"
            
            # 格局
            try:
                layout_element = base_info_section.find_element(By.XPATH, ".//span[contains(text(), '格局')]/following-sibling::span")
                house_data["room_layout"] = layout_element.text.strip()
            except:
                house_data["room_layout"] = "未提供"
            
            # 樓層
            try:
                floor_element = base_info_section.find_element(By.XPATH, ".//span[contains(text(), '樓層')]/following-sibling::span")
                house_data["floor_info"] = floor_element.text.strip()
            except:
                house_data["floor_info"] = "未提供"
            
            # 房屋類型
            try:
                status_element = base_info_section.find_element(By.XPATH, ".//span[contains(text(), '現況')]/following-sibling::span")
                type_element = base_info_section.find_element(By.XPATH, ".//span[contains(text(), '型態')]/following-sibling::span")
                house_data["house_type"] = f"{status_element.text.strip()} ({type_element.text.strip()})"
            except:
                house_data["house_type"] = "未提供"
            
            # 車位
            try:
                parking_element = base_info_section.find_element(By.XPATH, ".//span[contains(text(), '車位')]/following-sibling::span")
                house_data["parking"] = parking_element.text.strip()
            except:
                house_data["parking"] = "未提供"
                
        except:
            house_data["size"] = "0"
            house_data["size_detail"] = "未提供"
            house_data["room_layout"] = "未提供"
            house_data["floor_info"] = "未提供"
            house_data["house_type"] = "未提供"
            house_data["parking"] = "未提供"
        
        # 爬取地址
        try:
            address_elements = browser.find_elements(By.XPATH, "//span[contains(text(), '地址')]/following-sibling::span")
            if address_elements:
                house_data["address"] = address_elements[0].text.strip()
            else:
                house_data["address"] = house_data["title"]
        except:
            house_data["address"] = house_data["title"]
        
        # 爬取圖片
        try:
            images = []
            lightbox_container = browser.find_element(By.CSS_SELECTOR, "div.overflow-auto")
            image_elements = lightbox_container.find_elements(By.CSS_SELECTOR, "img")
            
            for img in image_elements[:2]:
                img_src = img.get_attribute("src")
                img_data_src = img.get_attribute("data-src")
                image_url = img_data_src if img_data_src else img_src
                
                if image_url and image_url.startswith("http"):
                    images.append(image_url)
            
            house_data["images"] = images
        except:
            house_data["images"] = []
        
        # 爬取地理座標
        try:
            page_source = browser.page_source
            
            coordinate_patterns = [
                r'"lat"[:\s]*([0-9.-]+)',
                r'"latitude"[:\s]*([0-9.-]+)',
                r'lat[:\s]*([0-9.-]+)',
            ]
            
            longitude_patterns = [
                r'"lng"[:\s]*([0-9.-]+)',
                r'"longitude"[:\s]*([0-9.-]+)',
                r'lng[:\s]*([0-9.-]+)',
            ]
            
            lat = None
            lng = None
            
            for pattern in coordinate_patterns:
                lat_match = re.search(pattern, page_source, re.IGNORECASE)
                if lat_match:
                    potential_lat = float(lat_match.group(1))
                    if 20 <= potential_lat <= 30:
                        lat = potential_lat
                        break
            
            for pattern in longitude_patterns:
                lng_match = re.search(pattern, page_source, re.IGNORECASE)
                if lng_match:
                    potential_lng = float(lng_match.group(1))
                    if 115 <= potential_lng <= 125:
                        lng = potential_lng
                        break
            
            if lat is None or lng is None:
                map_elements = browser.find_elements(By.CSS_SELECTOR, "a[href*='google.com/maps']")
                for map_element in map_elements:
                    map_url = map_element.get_attribute("href")
                    if map_url:
                        coords = extract_coordinates(map_url)
                        if coords["latitude"] and coords["longitude"]:
                            lat = coords["latitude"]
                            lng = coords["longitude"]
                            break
            
            house_data["latitude"] = lat
            house_data["longitude"] = lng
            house_data["detected_city"] = target_region or "未知"
            
        except:
            house_data["detected_city"] = target_region or "未知"
            house_data["latitude"] = None
            house_data["longitude"] = None

        # 抓取地區信息
        try:
            district = None
            city = None
            
            nav_selectors = [
                "nav.flex.space-x-2",
                "nav[class*='breadcrumb']",
                "div[class*='breadcrumb']",
                ".breadcrumb",
                "nav",
                "[class*='nav']"
            ]
            
            for selector in nav_selectors:
                try:
                    nav_elements = browser.find_elements(By.CSS_SELECTOR, selector)
                    for nav_element in nav_elements:
                        nav_text = nav_element.text
                        if any(keyword in nav_text for keyword in ['區', '市', '縣', '鄉', '鎮']):
                            links = nav_element.find_elements(By.TAG_NAME, "a")
                            for link in links:
                                link_text = link.text.strip()
                                if link_text.endswith('區'):
                                    district = link_text
                                    break
                                elif link_text.endswith('市') or link_text.endswith('縣'):
                                    city = link_text
                            break
                    if district:
                        break
                except:
                    continue
            
            if not district:
                page_source = browser.page_source
                districts = [
                    '中正區', '大同區', '中山區', '松山區', '大安區', '萬華區', '信義區', '士林區', '北投區', '內湖區', '南港區', '文山區',
                    '板橋區', '三重區', '中和區', '永和區', '新莊區', '新店區', '樹林區', '鶯歌區', '三峽區', '淡水區', '汐止區', '瑞芳區',
                    '土城區', '蘆洲區', '五股區', '泰山區', '林口區', '深坑區', '石碇區', '坪林區', '烏來區', '金山區', '萬里區', '石門區',
                    '三芝區', '貢寮區', '平溪區', '雙溪區', '八里區',
                    '桃園區', '中壢區', '大溪區', '楊梅區', '蘆竹區', '大園區', '龜山區', '八德區', '龍潭區', '平鎮區', '新屋區', '觀音區', '復興區'
                ]
                
                for district_name in districts:
                    if district_name in page_source:
                        context_patterns = [
                            rf'{district_name}[^區市縣]*(?:出租|租屋|房屋)',
                            rf'(?:位於|在){district_name}',
                            rf'{district_name}(?:的|地區)',
                            rf'href="[^"]*{district_name}[^"]*"[^>]*>{district_name}</a>'
                        ]
                        
                        for pattern in context_patterns:
                            if re.search(pattern, page_source):
                                district = district_name
                                break
                        
                        if district:
                            break
            
            house_data["district"] = district or "未知"
            house_data["city"] = target_region or "未知"
            
        except:
            house_data["district"] = "未知"
            house_data["city"] = target_region or "未知"
        
        time.sleep(random.uniform(0.5, 1.5))
        return house_data
        
    except Exception as e:
        return None