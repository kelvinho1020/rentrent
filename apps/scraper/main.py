import os
import time
import logging
import schedule
from datetime import datetime

from packages.db import init_db
from packages.common.config import settings
from scraper.scraper_591 import Scraper591

# 配置日誌
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
)
logger = logging.getLogger(__name__)


def run_scraper():
    """執行爬蟲主程序"""
    start_time = datetime.now()
    logger.info(f"開始爬取 591 租屋網資料: {start_time}")
    
    try:
        # 初始化資料庫連接
        init_db()
        
        # 初始化爬蟲
        scraper = Scraper591()
        
        # 開始爬取資料
        total_scraped = scraper.run()
        
        # 計算耗時
        elapsed_time = datetime.now() - start_time
        logger.info(f"爬取完成! 共處理 {total_scraped} 筆租屋資料，耗時 {elapsed_time}")
        
    except Exception as e:
        logger.error(f"爬取過程中發生錯誤: {e}", exc_info=True)


def main():
    """主程序"""
    logger.info("591 租屋網爬蟲服務啟動")
    
    # 設定排程間隔 (小時)
    interval_hours = settings.SCRAPER_INTERVAL_HOURS
    logger.info(f"設定排程間隔為 {interval_hours} 小時")
    
    # 先運行一次
    run_scraper()
    
    # 設定定時任務
    schedule.every(interval_hours).hours.do(run_scraper)
    
    # 持續運行排程
    while True:
        schedule.run_pending()
        time.sleep(60)  # 每分鐘檢查一次是否有排程需要執行


if __name__ == "__main__":
    main() 