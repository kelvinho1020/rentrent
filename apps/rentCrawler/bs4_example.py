"""
使用BeautifulSoup的爬蟲示例 - 抓取台灣氣象局的天氣資訊
"""
import requests
from bs4 import BeautifulSoup

def crawl_weather():
    """爬取台灣氣象局的天氣資訊"""
    print("開始爬取中央氣象局天氣資訊")
    
    try:
        # 發送請求獲取網頁
        url = "https://www.cwb.gov.tw/V8/C/"
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
        }
        response = requests.get(url, headers=headers)
        response.encoding = "utf-8"  # 設定編碼
        
        # 確認請求成功
        if response.status_code != 200:
            print(f"請求失敗，狀態碼: {response.status_code}")
            return
        
        # 使用BeautifulSoup解析HTML
        soup = BeautifulSoup(response.text, "html.parser")
        
        # 提取天氣資訊
        weather_items = soup.select(".tab_content .w-20")
        
        print("\n=== 今日各地天氣資訊 ===")
        for item in weather_items[:6]:  # 只取前6個城市
            try:
                city = item.select_one(".heading_3").text.strip()
                temp = item.select_one(".tem-C").text.strip()
                weather = item.select_one(".weatherIcon img")["alt"] if item.select_one(".weatherIcon img") else "無數據"
                
                print(f"{city}: 溫度 {temp}°C, 天氣 {weather}")
            except Exception as e:
                print(f"解析數據時出錯: {e}")
        
    except Exception as e:
        print(f"爬蟲過程中發生錯誤: {e}")
    
    print("\n爬蟲結束！")

def crawl_pixiv():
    url = "https://www.pixiv.net/users/810034/artworks"
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
    }
    response = requests.get(url, headers=headers)
    response.encoding = "utf-8"  # 設定編碼
        
    # 確認請求成功
    if response.status_code != 200:
        print(f"請求失敗，狀態碼: {response.status_code}")
        return

    # 使用BeautifulSoup解析HTML
    soup = BeautifulSoup(response.text, "html.parser")
    
    # 提取天氣資訊
    artists_item = soup.select("#gtm-var-theme-kind")
    print("artists_item", artists_item, response)


if __name__ == "__main__":
    # crawl_weather() 
    crawl_pixiv()