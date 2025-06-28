#!/usr/bin/env python3
import sys
import os
import json
import time
import random
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.chrome.options import Options

sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from crawler import setup_browser, safe_get_page, crawl_house_details

def quick_region_test():
    """快速測試地區抓取功能，抓取少量台北市和新北市資料"""
    browser = setup_browser()
    all_data = []
    
    try:
        # 定義測試URL
        test_urls = {
            "台北市": "https://rent.houseprice.tw",
            "新北市": "https://rent.houseprice.tw/list/21_usage/27-26-15-23-33-28-32-36-37-34-35-31-29-30-38-39-40-41-14-13-16-20-19-21-22-18-17-24-25_zip/?p=1"
        }
        
        for region_name, url in test_urls.items():
            print(f"\n🏙️ 測試 {region_name} 地區抓取...")
            print(f"🔗 URL: {url}")
            
            if safe_get_page(browser, url):
                # 只抓取前5個房屋進行測試
                house_links = browser.find_elements(By.CSS_SELECTOR, "a.group")[:5]
                print(f"找到 {len(house_links)} 個房屋連結進行測試")
                
                # 收集連結
                house_urls = []
                for i, link in enumerate(house_links):
                    try:
                        href = link.get_attribute("href")
                        if href:
                            house_urls.append(href)
                            print(f"  {i+1}. {href}")
                    except:
                        continue
                
                # 抓取詳情
                for i, house_url in enumerate(house_urls):
                    print(f"\n處理 {region_name} 第 {i+1}/{len(house_urls)} 個房屋...")
                    
                    house_data = crawl_house_details(browser, house_url)
                    if house_data:
                        all_data.append(house_data)
                        city = house_data.get('city', '未知')
                        district = house_data.get('district', '未知')
                        detected_city = house_data.get('detected_city', '未知')
                        
                        print(f"✅ 成功抓取:")
                        print(f"   標題: {house_data.get('title', '未知')[:50]}...")
                        print(f"   自動偵測城市: {detected_city}")
                        print(f"   導航抓取城市: {city}")
                        print(f"   導航抓取地區: {district}")
                    else:
                        print("❌ 抓取失敗")
                    
                    time.sleep(1)  # 短暫休息
                
                print(f"🔄 {region_name} 測試完成")
                time.sleep(2)
            else:
                print(f"❌ 無法訪問 {region_name} 頁面")
        
        # 統計結果
        print("\n" + "="*50)
        print("📊 測試結果統計:")
        print(f"總抓取資料: {len(all_data)} 筆")
        
        # 城市統計
        city_stats = {}
        district_stats = {}
        
        for item in all_data:
            detected_city = item.get('detected_city', '未知')
            nav_city = item.get('city', '未知')
            nav_district = item.get('district', '未知')
            
            city_stats[detected_city] = city_stats.get(detected_city, 0) + 1
            
            if nav_city != '未知' and nav_district != '未知':
                key = f"{nav_city} {nav_district}"
                district_stats[key] = district_stats.get(key, 0) + 1
        
        print("\n🏙️ 自動偵測城市分布:")
        for city, count in city_stats.items():
            print(f"  {city}: {count} 筆")
        
        print("\n🗺️ 導航抓取地區分布:")
        if district_stats:
            for district, count in district_stats.items():
                print(f"  {district}: {count} 筆")
        else:
            print("  ❌ 未成功抓取到導航地區信息")
        
        # 保存測試結果
        test_file = "data/quick_test_result.json"
        with open(test_file, 'w', encoding='utf-8') as f:
            json.dump(all_data, f, ensure_ascii=False, indent=2)
        print(f"\n💾 測試結果已保存到: {test_file}")
        
        # 顯示幾個成功範例
        print("\n🎯 成功範例:")
        success_count = 0
        for item in all_data:
            if item.get('district', '未知') != '未知':
                success_count += 1
                title = item.get('title', '未知')[:40]
                city = item.get('city', '未知')
                district = item.get('district', '未知')
                print(f"  {success_count}. {title}... → {city} {district}")
                if success_count >= 3:
                    break
        
        if success_count == 0:
            print("  ❌ 沒有成功抓取到詳細地區信息")
        else:
            print(f"  ✅ 共 {success_count} 筆成功抓取到詳細地區!")
            
    except Exception as e:
        print(f"❌ 測試過程中發生錯誤: {e}")
    finally:
        browser.quit()
        print("\n🏁 測試完成")

if __name__ == "__main__":
    print("🚀 開始快速地區抓取測試...")
    quick_region_test() 