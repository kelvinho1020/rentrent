#!/usr/bin/env python3
import sys
import os
import json
import time
import random
import traceback
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.chrome.service import Service

sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from crawler import setup_browser, safe_get_page, crawl_house_details

def stable_dual_city_crawl():
    """穩定的台北市+新北市爬蟲"""
    browser = setup_browser()
    all_data = []
    
    try:
        regions = [
            {
                "name": "新北市", 
                "url": "https://rent.houseprice.tw/list/21_usage/27-26-15-23-33-28-32-36-37-34-35-31-29-30-38-39-40-41-14-13-16-20-19-21-22-18-17-24-25_zip/?p=1",
                "target_count": 40,
                "max_pages": 3
            },
            {
                "name": "台北市",
                "url": "https://rent.houseprice.tw",
                "target_count": 40,
                "max_pages": 3
            }
        ]
        
        total_start_time = time.time()
        
        for region_idx, region in enumerate(regions):
            region_name = region["name"]
            region_url = region["url"] 
            target_count = region["target_count"]
            max_pages = region["max_pages"]
            
            print(f"第 {region_idx + 1}/2 個地區：開始處理 {region_name}")
            print(f"目標：{target_count} 筆資料，最多 {max_pages} 頁")
            
            region_start_time = time.time()
            region_data = []
            
            try:
                if not safe_get_page(browser, region_url):
                    print(f"無法訪問 {region_name} 頁面，跳過此地區")
                    continue
                
                print(f"成功訪問 {region_name} 頁面")
                
                for page_num in range(1, max_pages + 1):
                    if len(region_data) >= target_count:
                        print(f"{region_name} 已達目標數量 ({len(region_data)}/{target_count})，停止爬取")
                        break
                    
                    print(f"處理 {region_name} 第 {page_num}/{max_pages} 頁...")
                    
                    if page_num > 1:
                        if "?p=" in region_url:
                            next_url = region_url.replace("?p=1", f"?p={page_num}")
                        else:
                            separator = "&" if "?" in region_url else "?"
                            next_url = f"{region_url}{separator}p={page_num}"
                        
                        if not safe_get_page(browser, next_url):
                            print(f"無法訪問第 {page_num} 頁，停止翻頁")
                            break
                    
                    house_links = browser.find_elements("css selector", "a.group")
                    print(f"第 {page_num} 頁找到 {len(house_links)} 個房屋連結")
                    
                    if not house_links:
                        print("本頁無房屋連結，跳過")
                        continue
                    
                    house_urls = []
                    for i, link in enumerate(house_links):
                        try:
                            href = link.get_attribute("href")
                            if href:
                                house_urls.append(href)
                        except Exception as e:
                            pass
                    
                    print(f"成功收集 {len(house_urls)} 個有效連結")
                    
                    page_processed = 0
                    for i, house_url in enumerate(house_urls):
                        if len(region_data) >= target_count:
                            print(f"{region_name} 已達目標，停止處理本頁剩餘房屋")
                            break
                        
                        print(f"處理第 {i+1}/{len(house_urls)} 個房屋...")
                        
                        try:
                            house_data = crawl_house_details(browser, house_url, region_name)
                            if house_data:
                                region_data.append(house_data)
                                page_processed += 1
                                
                                city = house_data.get('city', '未取得')
                                district = house_data.get('district', '未取得') 
                                detected_city = house_data.get('detected_city', '未取得')
                                title = house_data.get('title', '未取得')[:30]
                                
                                print(f"成功: {title}...")
                                print(f"座標判斷: {detected_city}")
                                print(f"導航抓取: {city} {district}")
                                print(f"{region_name} 進度: {len(region_data)}/{target_count}")
                            else:
                                print("房屋資料抓取失敗")
                        
                        except Exception as e:
                            print(f"處理房屋時發生錯誤: {e}")
                        
                        time.sleep(random.uniform(1, 2))
                    
                    print(f"第 {page_num} 頁處理完成，成功 {page_processed} 筆")
                    print(f"{region_name} 累計: {len(region_data)} 筆")
                    
                    if page_num < max_pages:
                        time.sleep(random.uniform(2, 4))
                
                region_elapsed = time.time() - region_start_time
                print(f"{region_name} 處理完成！")
                print(f"收集資料: {len(region_data)} 筆")
                print(f"耗時: {region_elapsed:.1f} 秒")
                
                if region_data:
                    detected_cities = {}
                    nav_districts = {}
                    
                    for item in region_data:
                        detected = item.get('detected_city', '未知')
                        detected_cities[detected] = detected_cities.get(detected, 0) + 1
                        
                        city = item.get('city', '未知')
                        district = item.get('district', '未知')
                        if city != '未知' and district != '未知':
                            key = f"{city} {district}"
                            nav_districts[key] = nav_districts.get(key, 0) + 1
                    
                    print(f"{region_name} 座標判斷結果:")
                    for city, count in detected_cities.items():
                        print(f"   {city}: {count} 筆")
                    
                    print(f"{region_name} 導航抓取結果:")
                    if nav_districts:
                        for district, count in nav_districts.items():
                            print(f"   {district}: {count} 筆")
                    else:
                        print("   未成功抓取導航地區信息")
                
                all_data.extend(region_data)
                print(f"累計總資料: {len(all_data)} 筆")
                
            except Exception as e:
                print(f"處理 {region_name} 時發生嚴重錯誤: {e}")
                traceback.print_exc()
                print("繼續處理下一個地區...")
            
            if region_idx < len(regions) - 1:
                print(f"{region_name} 完成，休息 5 秒後處理下一個地區...")
                time.sleep(5)
        
        total_elapsed = time.time() - total_start_time
        print(f"所有地區處理完成！")
        print(f"總收集資料: {len(all_data)} 筆")
        print(f"總耗時: {total_elapsed:.1f} 秒")
        
        if all_data:
            final_city_stats = {}
            final_district_stats = {}
            
            for item in all_data:
                detected = item.get('detected_city', '未知')
                final_city_stats[detected] = final_city_stats.get(detected, 0) + 1
                
                city = item.get('city', '未知')
                district = item.get('district', '未知')
                if city != '未知' and district != '未知':
                    key = f"{city} {district}"
                    final_district_stats[key] = final_district_stats.get(key, 0) + 1
            
            print(f"最終城市分布:")
            for city, count in sorted(final_city_stats.items(), key=lambda x: x[1], reverse=True):
                print(f"   {city}: {count} 筆")
            
            print(f"最終地區分布:")
            if final_district_stats:
                for district, count in sorted(final_district_stats.items(), key=lambda x: x[1], reverse=True):
                    print(f"   {district}: {count} 筆")
            else:
                print("   未取得詳細地區資訊")
            
            data_file = os.path.join("data", "stable_crawl_result.json")
            with open(data_file, 'w', encoding='utf-8') as f:
                json.dump(all_data, f, ensure_ascii=False, indent=2)
            print(f"資料已保存至: {data_file}")
        
        return all_data
        
    except Exception as e:
        print(f"爬蟲執行過程發生嚴重錯誤: {e}")
        traceback.print_exc()
        return []
    
    finally:
        try:
            browser.quit()
            print("瀏覽器已關閉")
        except:
            pass

if __name__ == "__main__":
    print("開始穩定雙城市爬蟲...")
    print("將依序處理: 新北市 → 台北市")
    print("確保不會中途停止")
    print("包含詳細地區資訊抓取")
    print("\n開始執行...")
    
    result = stable_dual_city_crawl()
    
    if result:
        print(f"爬蟲成功完成！總共收集 {len(result)} 筆資料")
    else:
        print(f"爬蟲未收集到資料或發生錯誤") 