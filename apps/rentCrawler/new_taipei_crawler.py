#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
新北市專用爬蟲 - 快速獲取新北市租屋資料
"""
import time
import json
import os
import random
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
import traceback

def setup_browser():
    """設置瀏覽器"""
    chrome_options = Options()
    chrome_options.add_argument("--headless=new")
    chrome_options.add_argument("--no-sandbox")
    chrome_options.add_argument("--disable-dev-shm-usage")
    
    browser = webdriver.Chrome(options=chrome_options)
    browser.set_page_load_timeout(60)
    browser.implicitly_wait(5)
    return browser

def determine_city_from_coordinates(lat, lng):
    """根據經緯度判斷城市"""
    if lat is None or lng is None:
        return "未知"
    
    # 台北市邊界
    if 24.95 <= lat <= 25.30 and 121.45 <= lng <= 121.65:
        return "台北市"
    
    # 新北市邊界（更寬鬆）
    if 24.60 <= lat <= 25.40 and 121.20 <= lng <= 122.00:
        return "新北市"
    
    return "其他"

def extract_coordinates_from_url(url):
    """從URL中提取座標"""
    try:
        import re
        
        # 常見的座標模式
        patterns = [
            r'@(-?\d+\.?\d*),(-?\d+\.?\d*)',  # Google Maps格式
            r'lat=(-?\d+\.?\d*).*lng=(-?\d+\.?\d*)',
            r'latitude=(-?\d+\.?\d*).*longitude=(-?\d+\.?\d*)'
        ]
        
        for pattern in patterns:
            match = re.search(pattern, url)
            if match:
                lat, lng = float(match.group(1)), float(match.group(2))
                return lat, lng
    except:
        pass
    return None, None

def crawl_house_details(browser, house_url):
    """爬取單個房屋詳情"""
    try:
        print(f"訪問: {house_url}")
        browser.get(house_url)
        time.sleep(random.uniform(2, 4))
        
        house_data = {"url": house_url}
        
        # 標題
        try:
            title_element = browser.find_element(By.CSS_SELECTOR, "h1")
            house_data["title"] = title_element.text.strip()
        except:
            house_data["title"] = "未知標題"
        
        # 價格
        try:
            price_elements = browser.find_elements(By.CSS_SELECTOR, "span")
            for element in price_elements:
                text = element.text.strip()
                if "元/月" in text and text.replace(",", "").replace("元/月", "").isdigit():
                    house_data["price"] = text.replace("元/月", "").replace(",", "")
                    break
            else:
                house_data["price"] = "0"
        except:
            house_data["price"] = "0"
        
        # 尋找Google Maps連結獲取座標
        try:
            map_links = browser.find_elements(By.CSS_SELECTOR, "a[href*='maps.google']")
            if not map_links:
                map_links = browser.find_elements(By.CSS_SELECTOR, "a[href*='google.com/maps']")
            
            if map_links:
                map_url = map_links[0].get_attribute("href")
                lat, lng = extract_coordinates_from_url(map_url)
                if lat and lng:
                    house_data["latitude"] = lat
                    house_data["longitude"] = lng
                    house_data["detected_city"] = determine_city_from_coordinates(lat, lng)
                    print(f"  ✅ 座標: {lat}, {lng} ({house_data['detected_city']})")
                else:
                    house_data["latitude"] = None
                    house_data["longitude"] = None
                    house_data["detected_city"] = "未知"
            else:
                house_data["latitude"] = None
                house_data["longitude"] = None
                house_data["detected_city"] = "未知"
        except Exception as e:
            print(f"  ⚠️ 座標提取失敗: {e}")
            house_data["latitude"] = None
            house_data["longitude"] = None
            house_data["detected_city"] = "未知"
        
        # 其他欄位設為預設值
        house_data.update({
            "address": house_data["title"],
            "size_ping": None,
            "house_type": None,
            "room_type": None,
            "image_urls": [],
            "contact_name": None,
            "contact_phone": None,
            "floor": None,
            "total_floor": None,
            "last_updated": None
        })
        
        return house_data
        
    except Exception as e:
        print(f"  ❌ 錯誤: {e}")
        return None

def crawl_new_taipei():
    """爬取新北市資料"""
    print("🏙️ 開始爬取新北市租屋資料...")
    
    browser = setup_browser()
    new_taipei_data = []
    
    try:
        # 新北市URL
        url = "https://rent.houseprice.tw/list/21_usage/27-26-15-23-33-28-32-36-37-34-35-31-29-30-38-39-40-41-14-13-16-20-19-21-22-18-17-24-25_zip/?p=1"
        print(f"訪問新北市頁面: {url}")
        
        browser.get(url)
        time.sleep(5)
        
        # 檢查頁面內容
        if "新北" in browser.page_source:
            print("✅ 頁面包含新北市內容")
        else:
            print("⚠️ 頁面可能不包含新北市內容")
        
        # 尋找房屋連結
        house_links = browser.find_elements(By.CSS_SELECTOR, "a.group")
        if not house_links:
            house_links = browser.find_elements(By.CSS_SELECTOR, "a[href*='/house/']")
        
        print(f"找到 {len(house_links)} 個房屋連結")
        
        if house_links:
            # 只處理前5個，快速測試
            limited_links = house_links[:5]
            house_urls = []
            
            for link in limited_links:
                try:
                    href = link.get_attribute("href")
                    if href and "/house/" in href:
                        house_urls.append(href)
                except:
                    continue
            
            print(f"有效連結: {len(house_urls)} 個")
            
            # 爬取房屋詳情
            for i, house_url in enumerate(house_urls):
                print(f"\n處理第 {i+1}/{len(house_urls)} 個房屋...")
                house_data = crawl_house_details(browser, house_url)
                
                if house_data:
                    new_taipei_data.append(house_data)
                    print(f"  ✅ 成功收集：{house_data.get('title', '未知')[:30]} ({house_data.get('detected_city', '未知')})")
                
                time.sleep(random.uniform(1, 3))
        else:
            print("❌ 未找到房屋連結")
    
    except Exception as e:
        print(f"❌ 爬取過程出錯: {e}")
        traceback.print_exc()
    
    finally:
        browser.quit()
    
    return new_taipei_data

def merge_with_existing_data(new_data):
    """將新資料合併到現有資料檔案"""
    data_file = "data/data.json"
    
    try:
        # 讀取現有資料
        if os.path.exists(data_file):
            with open(data_file, 'r', encoding='utf-8') as f:
                existing_data = json.load(f)
        else:
            existing_data = []
        
        print(f"現有資料: {len(existing_data)} 筆")
        print(f"新增資料: {len(new_data)} 筆")
        
        # 合併資料（避免重複）
        existing_urls = {item.get('url') for item in existing_data if item.get('url')}
        added_count = 0
        
        for item in new_data:
            if item.get('url') not in existing_urls:
                existing_data.append(item)
                added_count += 1
        
        # 保存合併後的資料
        with open(data_file, 'w', encoding='utf-8') as f:
            json.dump(existing_data, f, ensure_ascii=False, indent=2)
        
        print(f"✅ 成功添加 {added_count} 筆新資料")
        print(f"總計資料: {len(existing_data)} 筆")
        
        # 統計地區分布
        cities = {}
        for item in existing_data:
            city = item.get('detected_city', '未知')
            cities[city] = cities.get(city, 0) + 1
        
        print("\n📊 最終地區分布:")
        for city, count in sorted(cities.items(), key=lambda x: x[1], reverse=True):
            print(f"  {city}: {count} 筆")
        
        return True
        
    except Exception as e:
        print(f"❌ 合併資料時出錯: {e}")
        return False

if __name__ == "__main__":
    print("🚀 新北市專用爬蟲啟動...")
    
    # 爬取新北市資料
    new_taipei_data = crawl_new_taipei()
    
    if new_taipei_data:
        print(f"\n✅ 成功爬取 {len(new_taipei_data)} 筆新北市資料")
        
        # 合併到現有資料
        if merge_with_existing_data(new_taipei_data):
            print("🎉 新北市資料已成功添加到資料庫！")
        else:
            print("❌ 合併資料失敗")
    else:
        print("❌ 未獲取到新北市資料") 