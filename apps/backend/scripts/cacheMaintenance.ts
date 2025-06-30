#!/usr/bin/env ts-node

/**
 * 快取維護定時腳本
 * 用於 cron job 執行每日快取維護作業
 * 
 * 使用方式:
 * npx ts-node scripts/cacheMaintenance.ts
 * 
 * 或設定 cron job:
 * 0 2 * * * cd /path/to/project && npm run cache:maintenance
 */

import { dailyCacheMaintenance } from '../src/services/cacheSyncService';
import { logger } from '../src/utils/logger';

async function main() {
  try {
    logger.info('🔄 定時腳本開始執行每日快取維護作業...');
    
    const startTime = Date.now();
    const results = await dailyCacheMaintenance();
    const endTime = Date.now();
    const duration = ((endTime - startTime) / 1000).toFixed(2);
    
    logger.info('✅ 定時腳本執行完成');
    logger.info(`⏱️ 執行時間: ${duration} 秒`);
    logger.info('📊 執行結果摘要:');
    logger.info(`   - 清理無效快取: ${results.invalidCacheCleanup.total} 筆`);
    logger.info(`   - 清理舊快取: ${results.oldCacheCleanup.total} 筆`);
    logger.info(`   - 處理新房屋: ${results.newListingsInit.processedListings} 間`);
    logger.info(`   - 總快取覆蓋率: ${results.statistics.cacheCoverage}`);
    
    process.exit(0);
    
  } catch (error) {
    logger.error('❌ 定時腳本執行失敗', { error });
    
    if (error instanceof Error) {
      logger.error(`錯誤訊息: ${error.message}`);
      logger.error(`錯誤堆疊: ${error.stack}`);
    }
    
    process.exit(1);
  }
}

// 如果是直接執行此腳本
if (require.main === module) {
  main();
} 