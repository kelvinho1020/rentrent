#!/usr/bin/env python3
"""
每日租屋資料更新腳本 - 軟刪除策略
適用於 cron job 自動執行

使用方法:
  python daily_update.py [--test] [--cleanup-days=7] [--batch-size=1000]
"""

import os
import sys
import json
import argparse
import logging
import requests
from datetime import datetime, timedelta
from typing import Dict, Any, Optional
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

# 導入爬蟲模組
from crawler import crawl_5168_all_regions

# 配置日誌
LOG_DIR = "logs"
os.makedirs(LOG_DIR, exist_ok=True)

# 設置日誌格式
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler(f'{LOG_DIR}/daily_update_{datetime.now().strftime("%Y%m%d")}.log'),
        logging.StreamHandler(sys.stdout)
    ]
)
logger = logging.getLogger(__name__)

class DailyUpdateManager:
    def __init__(self, backend_url: str = "http://localhost:8000", test_mode: bool = False):
        self.backend_url = backend_url.rstrip('/')
        self.test_mode = test_mode
        self.start_time = datetime.now()
        self.stats = {
            'crawl_success': False,
            'crawl_count': 0,
            'import_success': False,
            'import_stats': {},
            'cleanup_success': False,
            'cleanup_stats': {},
            'errors': []
        }

    def run_daily_update(self, cleanup_days: int = 7, batch_size: int = 1000) -> Dict[str, Any]:
        """執行每日更新流程"""
        logger.info("🚀 開始每日租屋資料更新")
        logger.info(f"模式: {'測試' if self.test_mode else '正式'}")
        
        try:
            # 步驟 1: 爬取最新資料
            self._step_crawl_data()
            
            # 步驟 2: 批次更新資料庫
            self._step_batch_update(batch_size)
            
            # 步驟 3: 清理過期資料
            if not self.test_mode:
                self._step_cleanup_old_data(cleanup_days)
            
            # 步驟 4: 生成報告
            return self._generate_report()
            
        except Exception as e:
            logger.error(f"❌ 每日更新失敗: {e}")
            self.stats['errors'].append(str(e))
            return self._generate_report()

    def _step_crawl_data(self):
        """步驟 1: 爬取資料"""
        logger.info("📡 步驟 1: 開始爬取最新租屋資料")
        
        try:
            if self.test_mode:
                logger.info("🧪 測試模式：跳過實際爬取")
                self.stats['crawl_success'] = True
                self.stats['crawl_count'] = 0
                return
            
            # 執行爬蟲
            result = crawl_5168_all_regions()
            
            # 檢查爬取結果
            if os.path.exists('data/houseprice_all_data.json'):
                with open('data/houseprice_all_data.json', 'r', encoding='utf-8') as f:
                    data = json.load(f)
                    self.stats['crawl_count'] = len(data)
                    
                logger.info(f"✅ 爬取完成，共 {self.stats['crawl_count']} 筆資料")
                self.stats['crawl_success'] = True
            else:
                raise Exception("爬取完成但找不到資料檔案")
                
        except Exception as e:
            logger.error(f"❌ 爬取失敗: {e}")
            self.stats['errors'].append(f"爬取失敗: {e}")
            raise

    def _step_batch_update(self, batch_size: int):
        """步驟 2: 批次更新資料庫"""
        logger.info("🔄 步驟 2: 批次更新資料庫")
        
        try:
            if self.test_mode:
                logger.info("🧪 測試模式：模擬資料庫更新")
                self.stats['import_success'] = True
                self.stats['import_stats'] = {
                    'imported': 100,
                    'updated': 50,
                    'skipped': 5,
                    'strategy': 'test-mode'
                }
                return
            
            # 呼叫後端 API 進行批次更新
            data_file = 'data/houseprice_all_data.json'
            
            with open(data_file, 'rb') as f:
                files = {'file': f}
                response = requests.post(
                    f'{self.backend_url}/api/import/batch-update',
                    files=files,
                    timeout=300  # 5分鐘超時
                )
            
            if response.status_code == 200:
                self.stats['import_stats'] = response.json()
                self.stats['import_success'] = True
                logger.info(f"✅ 批次更新完成: {self.stats['import_stats']}")
            else:
                raise Exception(f"批次更新失敗: {response.status_code} - {response.text}")
                
        except Exception as e:
            logger.error(f"❌ 批次更新失敗: {e}")
            self.stats['errors'].append(f"批次更新失敗: {e}")
            raise

    def _step_cleanup_old_data(self, cleanup_days: int):
        """步驟 3: 清理過期資料"""
        logger.info(f"🧹 步驟 3: 清理 {cleanup_days} 天前的過期資料")
        
        try:
            response = requests.post(
                f'{self.backend_url}/api/import/cleanup',
                json={'keepDays': cleanup_days, 'smart': True},
                timeout=60
            )
            
            if response.status_code == 200:
                self.stats['cleanup_stats'] = response.json()
                self.stats['cleanup_success'] = True
                logger.info(f"✅ 清理完成: {self.stats['cleanup_stats']}")
            else:
                raise Exception(f"清理失敗: {response.status_code} - {response.text}")
                
        except Exception as e:
            logger.error(f"❌ 清理失敗: {e}")
            self.stats['errors'].append(f"清理失敗: {e}")
            # 清理失敗不阻擋整個流程

    def _generate_report(self) -> Dict[str, Any]:
        """生成更新報告"""
        end_time = datetime.now()
        duration = (end_time - self.start_time).total_seconds()
        
        success = (
            self.stats['crawl_success'] and 
            self.stats['import_success']
        )
        
        report = {
            'timestamp': end_time.isoformat(),
            'duration_seconds': duration,
            'success': success,
            'test_mode': self.test_mode,
            'stats': self.stats,
            'summary': self._create_summary()
        }
        
        # 記錄報告
        logger.info("📊 更新報告:")
        logger.info(f"   成功: {'✅' if success else '❌'}")
        logger.info(f"   耗時: {duration:.1f} 秒")
        logger.info(f"   爬取: {self.stats['crawl_count']} 筆")
        if self.stats.get('import_stats'):
            import_stats = self.stats['import_stats']
            logger.info(f"   導入: {import_stats.get('imported', 0)} 筆")
            logger.info(f"   更新: {import_stats.get('updated', 0)} 筆")
        
        if self.stats['errors']:
            logger.warning(f"   錯誤: {len(self.stats['errors'])} 個")
            for error in self.stats['errors']:
                logger.warning(f"     - {error}")
        
        return report

    def _create_summary(self) -> str:
        """創建文字摘要"""
        if self.stats['crawl_success'] and self.stats['import_success']:
            return f"✅ 每日更新成功完成，處理了 {self.stats['crawl_count']} 筆資料"
        else:
            return f"❌ 每日更新失敗，請檢查錯誤日誌"

def main():
    parser = argparse.ArgumentParser(description='每日租屋資料更新腳本')
    parser.add_argument('--test', action='store_true', help='測試模式（不執行實際操作）')
    parser.add_argument('--cleanup-days', type=int, default=7, help='保留幾天的舊資料（預設7天）')
    parser.add_argument('--batch-size', type=int, default=1000, help='批次處理大小（預設1000）')
    parser.add_argument('--backend-url', default='http://localhost:8000', help='後端API網址')
    
    args = parser.parse_args()
    
    # 創建更新管理器
    manager = DailyUpdateManager(
        backend_url=args.backend_url,
        test_mode=args.test
    )
    
    # 執行更新
    report = manager.run_daily_update(
        cleanup_days=args.cleanup_days,
        batch_size=args.batch_size
    )
    
    # 輸出結果
    exit_code = 0 if report['success'] else 1
    
    if args.test:
        print("🧪 測試模式完成")
    elif report['success']:
        print("✅ 每日更新成功完成")
    else:
        print("❌ 每日更新失敗")
        
    sys.exit(exit_code)

if __name__ == '__main__':
    main() 