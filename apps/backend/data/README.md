# 爬蟲數據資料夾

此資料夾包含爬蟲抓取的租屋資料。

## 文件說明

### `crawl_result_current.json`
- **用途**: 最新的爬蟲結果
- **來源**: 由 `pnpm run crawler:docker` 或 `pnpm run crawler` 生成
- **大小**: 通常 10-100KB，取決於抓取的房屋數量
- **用途**: 導入到資料庫的當前資料

### `crawl_result_previous.json`
- **用途**: 上一次的爬蟲結果（備份）
- **來源**: 手動備份或腳本自動備份
- **用途**: 比較差異或作為回滾參考

## 工作流程

1. **爬蟲執行**: `pnpm run crawler:docker`
2. **結果複製**: `apps/crawler/data/stable_crawl_result.json` → `apps/backend/data/crawl_result_current.json`
3. **資料庫導入**: `npx ts-node scripts/import-listings.ts data/crawl_result_current.json`

## 注意事項

- 這些文件已被加入 `.gitignore`，不會提交到 Git
- 文件大小可能很大，建議定期清理舊文件
- 導入前請確保資料庫連接正常 