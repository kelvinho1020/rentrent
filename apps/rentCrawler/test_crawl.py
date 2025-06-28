#!/usr/bin/env python3
import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from crawler import crawl_5168_all_regions

if __name__ == "__main__":
    print("🚀 開始爬取台北市和新北市租屋資料...")
    print("=" * 50)
    crawl_5168_all_regions()
    print("=" * 50)
    print("✅ 爬取完成！") 