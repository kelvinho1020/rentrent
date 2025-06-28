#!/usr/bin/env ts-node

/**
 * 租屋數據導入腳本
 * 用法：ts-node scripts/import-listings.ts <文件路徑>
 * 
 * 此腳本用於將JSON格式的爬蟲數據導入到數據庫中
 */

import { importCrawlerDataCLI } from '../src/services/importService';

async function run() {
  const args = process.argv.slice(2);
  
  if (args.length !== 1) {
    console.error('用法: ts-node scripts/import-listings.ts <JSON文件路徑>');
    process.exit(1);
  }
  
  const filePath = args[0];
  
  try {
    await importCrawlerDataCLI(filePath);
  } catch (error) {
    console.error('導入失敗:', error);
    process.exit(1);
  }
}

// 執行腳本
run().catch(error => {
  console.error('腳本執行錯誤:', error);
  process.exit(1);
}); 