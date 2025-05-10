import time
import json
import logging
import random
from typing import Dict, List, Any, Optional, Tuple
import re
import requests
from bs4 import BeautifulSoup
from sqlalchemy import func
from geoalchemy2.functions import ST_SetSRID, ST_Point
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.common.exceptions import TimeoutException
from datetime import datetime

from packages.db import db_session, Listing

logger = logging.getLogger(__name__)


class Scraper591:
    """591 租屋網爬蟲類別"""
    
    def __init__(self):
        # 基本設定
        self.base_url = "https://rent.591.com.tw"
        self.api_url = "https://rent.591.com.tw/home/search/rsList"
        self.headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
            "X-Requested-With": "XMLHttpRequest",
        }
        # 每頁數量
        self.page_size = 30
        # 城市區域對照表
        self.regions = self._get_regions()
    
    def _get_regions(self) -> Dict[str, int]:
        """取得城市代碼對照表"""
        regions = {
            "台北市": 1,
            "新北市": 3,
            "桃園市": 6,
            "新竹市": 4,
            "新竹縣": 5,
            "宜蘭縣": 21,
            "基隆市": 2,
            "台中市": 8,
            "彰化縣": 10,
            "南投縣": 11,
            "雲林縣": 12,
            "苗栗縣": 7,
            "高雄市": 17,
            "台南市": 15,
            "嘉義市": 13,
            "嘉義縣": 14,
            "屏東縣": 19,
            "台東縣": 22,
            "花蓮縣": 23,
            "澎湖縣": 24,
            "金門縣": 25,
            "連江縣": 26,
        }
        return regions
    
    def _get_csrf_token(self) -> str:
        """獲取 CSRF Token"""
        try:
            response = requests.get(self.base_url, headers=self.headers)
            response.raise_for_status()
            
            soup = BeautifulSoup(response.text, 'html.parser')
            csrf_token = soup.select_one('meta[name="csrf-token"]')
            
            if csrf_token:
                return csrf_token['content']
            else:
                logger.error("無法找到 CSRF Token")
                return ""
        except Exception as e:
            logger.error(f"獲取 CSRF Token 失敗: {e}")
            return ""
    
    def _get_total_count(self, region_id: int) -> int:
        """獲取指定城市的總租屋數量"""
        try:
            headers = self.headers.copy()
            csrf_token = self._get_csrf_token()
            if csrf_token:
                headers["X-CSRF-TOKEN"] = csrf_token
            
            params = {
                "is_new_list": 1,
                "type": 1,  # 1: 整層住家, 2: 獨立套房, 3: 分租套房, 4: 雅房
                "region": region_id,
                "firstRow": 0,
                "totalRows": 0,
            }
            
            response = requests.get(self.api_url, headers=headers, params=params)
            response.raise_for_status()
            
            data = response.json()
            total_count = data.get('records', 0)
            return int(total_count)
        except Exception as e:
            logger.error(f"獲取總數量失敗: {e}")
            return 0
    
    def _get_listing_detail(self, detail_url: str, source_id: str) -> Optional[Dict[str, Any]]:
        """使用 Selenium 獲取租屋詳細資訊"""
        try:
            # 設置 Chrome 選項
            chrome_options = Options()
            chrome_options.add_argument("--headless")
            chrome_options.add_argument("--no-sandbox")
            chrome_options.add_argument("--disable-dev-shm-usage")
            chrome_options.add_argument(f"user-agent={self.headers['User-Agent']}")
            
            driver = webdriver.Chrome(options=chrome_options)
            driver.set_page_load_timeout(30)
            
            try:
                driver.get(f"{self.base_url}{detail_url}")
                
                # 等待頁面加載完成
                WebDriverWait(driver, 10).until(
                    EC.presence_of_element_located((By.CLASS_NAME, "contact-info"))
                )
                
                # 解析基本資訊
                title = driver.find_element(By.CLASS_NAME, "house-title").text.strip()
                price_element = driver.find_element(By.CLASS_NAME, "price")
                price_text = price_element.text.strip().replace(",", "")
                price = int(re.search(r'\d+', price_text).group())
                
                # 地址資訊
                address_element = driver.find_element(By.CLASS_NAME, "address")
                address = address_element.find_element(By.TAG_NAME, "span").text.strip()
                
                # 解析詳細資訊
                info_elements = driver.find_elements(By.CSS_SELECTOR, ".house-info-item")
                info_data = {}
                for elem in info_elements:
                    key = elem.find_element(By.CLASS_NAME, "title").text.strip().rstrip("：")
                    value = elem.find_element(By.CLASS_NAME, "list").text.strip()
                    info_data[key] = value
                
                # 解析坪數
                size_text = info_data.get("坪數", "0坪")
                size_ping = float(re.search(r'([\d.]+)', size_text).group(1))
                
                # 解析格局
                room_type = info_data.get("格局", "")
                
                # 房屋類型
                house_type = info_data.get("型態", "")
                
                # 樓層
                floor_info = info_data.get("樓層", "")
                floor_match = re.search(r'(\d+)樓/(\d+)樓', floor_info)
                if floor_match:
                    floor = floor_match.group(1)
                    total_floor = floor_match.group(2)
                else:
                    floor = ""
                    total_floor = ""
                
                # 描述
                description = ""
                try:
                    description_elem = driver.find_element(By.CLASS_NAME, "detail-info-content")
                    description = description_elem.text.strip()
                except:
                    pass
                
                # 設施
                facilities = []
                try:
                    facility_elems = driver.find_elements(By.CSS_SELECTOR, ".service-list-item .text")
                    facilities = [elem.text.strip() for elem in facility_elems]
                except:
                    pass
                
                # 圖片 URL
                image_urls = []
                try:
                    img_elems = driver.find_elements(By.CSS_SELECTOR, ".gallery-images img")
                    image_urls = [elem.get_attribute("src") for elem in img_elems]
                except:
                    pass
                
                # 聯絡資訊
                contact_name = ""
                contact_phone = ""
                try:
                    contact_elem = driver.find_element(By.CLASS_NAME, "contact-info")
                    contact_name = contact_elem.find_element(By.CLASS_NAME, "name").text.strip()
                    phone_elem = contact_elem.find_element(By.CLASS_NAME, "number")
                    contact_phone = phone_elem.text.strip()
                except:
                    pass
                
                # 取得座標
                coordinates = None
                try:
                    # 等待地圖載入
                    WebDriverWait(driver, 5).until(
                        EC.presence_of_element_located((By.CLASS_NAME, "map-info"))
                    )
                    # 從地圖 iframe 中獲取座標
                    map_iframe = driver.find_element(By.CSS_SELECTOR, ".map-info iframe")
                    iframe_src = map_iframe.get_attribute("src")
                    
                    # 解析座標
                    coord_match = re.search(r'center=([0-9.]+),([0-9.]+)', iframe_src)
                    if coord_match:
                        lat = float(coord_match.group(1))
                        lng = float(coord_match.group(2))
                        coordinates = [lng, lat]
                except:
                    pass
                
                # 解析城市和行政區
                city_district = address.split(" ")[0] if " " in address else address
                city = ""
                district = ""
                
                for c in self.regions.keys():
                    if city_district.startswith(c):
                        city = c
                        district = city_district.replace(city, "")
                        break
                
                if not city or not district:
                    # 如果無法解析，使用備用方法
                    address_parts = address.split("區")
                    if len(address_parts) > 1:
                        district = address_parts[0] + "區"
                        for c in self.regions.keys():
                            if district.startswith(c):
                                city = c
                                district = district.replace(city, "")
                                break
                
                result = {
                    "source_id": source_id,
                    "title": title,
                    "price": price,
                    "size_ping": size_ping,
                    "house_type": house_type,
                    "room_type": room_type,
                    "address": address,
                    "city": city,
                    "district": district,
                    "description": description,
                    "image_urls": image_urls,
                    "facilities": facilities,
                    "contact_name": contact_name,
                    "contact_phone": contact_phone,
                    "floor": floor,
                    "total_floor": total_floor,
                    "coordinates": coordinates,
                }
                
                return result
            except Exception as e:
                logger.error(f"獲取詳細資訊失敗 (ID: {source_id}): {e}")
                return None
            finally:
                driver.quit()
        except Exception as e:
            logger.error(f"初始化 Selenium 失敗: {e}")
            return None
    
    def _scrape_city(self, city: str, region_id: int) -> int:
        """爬取指定城市的所有租屋資料"""
        total_count = self._get_total_count(region_id)
        logger.info(f"開始爬取 {city} (區域代碼: {region_id}) 的租屋資料，共 {total_count} 筆")
        
        if total_count == 0:
            return 0
        
        with db_session() as session:
            # 檢查資料庫中已有的 source_id
            existing_ids = set(id[0] for id in session.query(Listing.source_id).all())
            
            # 計算需要爬取的頁數
            total_pages = (total_count + self.page_size - 1) // self.page_size
            processed_count = 0
            
            # 開始爬取每一頁
            for page in range(1, total_pages + 1):
                logger.info(f"爬取 {city} 第 {page}/{total_pages} 頁")
                
                try:
                    # 獲取列表頁資料
                    headers = self.headers.copy()
                    csrf_token = self._get_csrf_token()
                    if csrf_token:
                        headers["X-CSRF-TOKEN"] = csrf_token
                    
                    params = {
                        "is_new_list": 1,
                        "type": 1,
                        "region": region_id,
                        "firstRow": (page - 1) * self.page_size,
                        "totalRows": total_count,
                    }
                    
                    response = requests.get(self.api_url, headers=headers, params=params)
                    response.raise_for_status()
                    
                    data = response.json()
                    listings = data.get('data', {}).get('data', [])
                    
                    for listing in listings:
                        source_id = str(listing.get('post_id'))
                        
                        # 如果已經存在，跳過
                        if source_id in existing_ids:
                            continue
                        
                        # 詳細頁 URL
                        detail_url = listing.get('detail_url')
                        if not detail_url:
                            continue
                        
                        # 獲取詳細資訊
                        detail_data = self._get_listing_detail(detail_url, source_id)
                        if not detail_data:
                            continue
                        
                        # 檢查必要欄位
                        if not all(k in detail_data for k in ['title', 'price', 'size_ping', 'address']):
                            continue
                        
                        # 檢查並設置坐標
                        coordinates = detail_data.get('coordinates')
                        if not coordinates or len(coordinates) != 2:
                            # 沒有坐標，跳過
                            continue
                        
                        # 創建 Geometry 物件
                        lng, lat = coordinates
                        geom = ST_SetSRID(ST_Point(lng, lat), 4326)
                        
                        # 創建新的租屋物件
                        new_listing = Listing(
                            source_id=source_id,
                            title=detail_data['title'],
                            price=detail_data['price'],
                            size_ping=detail_data['size_ping'],
                            house_type=detail_data.get('house_type'),
                            room_type=detail_data.get('room_type'),
                            address=detail_data['address'],
                            district=detail_data.get('district', ''),
                            city=detail_data.get('city', ''),
                            description=detail_data.get('description'),
                            image_urls=detail_data.get('image_urls'),
                            facilities=detail_data.get('facilities'),
                            contact_name=detail_data.get('contact_name'),
                            contact_phone=detail_data.get('contact_phone'),
                            floor=detail_data.get('floor'),
                            total_floor=detail_data.get('total_floor'),
                            geom=geom,
                            last_updated=datetime.now(),
                            created_at=datetime.now(),
                        )
                        
                        # 添加到資料庫
                        session.add(new_listing)
                        processed_count += 1
                        
                        # 每處理 10 筆，提交一次事務
                        if processed_count % 10 == 0:
                            session.commit()
                        
                        # 隨機延遲 1-3 秒，避免被封鎖
                        time.sleep(random.uniform(1, 3))
                    
                    # 每頁之間隨機延遲 3-5 秒
                    time.sleep(random.uniform(3, 5))
                    
                except Exception as e:
                    logger.error(f"處理頁面時發生錯誤 ({city} 第 {page} 頁): {e}")
                    continue
            
            # 最後提交事務
            session.commit()
            
            logger.info(f"{city} 爬取完成，成功處理 {processed_count} 筆租屋資料")
            return processed_count
    
    def run(self) -> int:
        """執行爬蟲主程序"""
        total_processed = 0
        
        # 爬取每個城市的租屋資料
        for city, region_id in self.regions.items():
            try:
                processed = self._scrape_city(city, region_id)
                total_processed += processed
            except Exception as e:
                logger.error(f"爬取 {city} 時發生錯誤: {e}")
                continue
        
        return total_processed 