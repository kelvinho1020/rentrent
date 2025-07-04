# 爬蟲數據

- `crawl_result_current.json` - 最新爬蟲結果
- `crawl_result_previous.json` - 備份數據

## 使用流程

1. `pnpm run crawler:docker` - 執行爬蟲
2. 複製結果到 `crawl_result_current.json`
3. `pnpm run import data/crawl_result_current.json` - 導入資料庫 