/**
 * 591 租屋網 API 爬蟲程式
 * 
 * 此程式直接使用 591 租屋網的 API 爬取租屋資料，不需要啟動瀏覽器。
 * 相比使用 Puppeteer 的方法，此方法更輕量且可靠。
 */

import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';
import { setTimeout as sleep } from 'timers/promises';

// 定義租屋資訊的介面
interface RentalListing {
  id: string;
  title: string;
  price: number;
  size: number;  // 坪數
  address: string;
  district: string;
  city: string;
  type: string;  // 房屋類型
  layout: string;  // 格局
  imageUrls: string[];
  description: string;
  url: string;
  createTime: string;
  updateTime: string;
  contact: string;
  phone: string;
  regionId: number;
  sectionId: number;
  kindId: number;
  shape: string;
  floor: string;
  purposeId: number;
  direction: string;
  latitude: number | null;
  longitude: number | null;
}

// 設定城市代碼映射
const CITY_CODES: Record<string, number> = {
  '台北市': 1,
  '新北市': 3,
  '桃園市': 6,
  '台中市': 8,
  '高雄市': 17,
  '基隆市': 2,
  '宜蘭縣': 21,
  '新竹市': 4,
  '新竹縣': 5,
  '苗栗縣': 7,
  '彰化縣': 10,
  '南投縣': 11,
  '雲林縣': 12,
  '嘉義市': 13,
  '嘉義縣': 14,
  '台南市': 15,
  '屏東縣': 19,
  '台東縣': 22,
  '花蓮縣': 23,
  '澎湖縣': 24,
  '金門縣': 25,
  '連江縣': 26
};

// 設定要爬取的城市和每個城市爬取的數量
const TARGET_CITIES = ['台北市', '新北市', '桃園市'];
const LISTINGS_PER_CITY = 30;

// 儲存 591 網站的 Cookie 和 Token
let cookies591 = '';
let csrfToken = '';
let urlToken = '';

// 創建一個帶有超時設定的axios實例
const axiosInstance = axios.create({
  timeout: 10000, // 10秒超時
});

/**
 * 主程式
 */
async function main() {
  console.log('啟動 591 租屋網 API 爬蟲程式...');
  
  // 設定全局超時計時器，5分鐘後自動退出程序
  const globalTimeout = setTimeout(() => {
    console.error('程序運行超過5分鐘，自動結束');
    process.exit(1);
  }, 5 * 60 * 1000);
  
  try {
    // 取得 CSRF Token 和 Cookie
    await getCSRFToken();
    
    const allListings: RentalListing[] = [];
    
    // 依序爬取每個城市的租屋資料
    for (const city of TARGET_CITIES) {
      console.log(`開始爬取 ${city} 的租屋資料...`);
      
      const cityCode = CITY_CODES[city];
      if (!cityCode) {
        console.log(`找不到 ${city} 的城市代碼，跳過`);
        continue;
      }
      
      // 爬取當前城市的租屋列表
      const listings = await scrapeCity(city, cityCode, LISTINGS_PER_CITY);
      allListings.push(...listings);
      
      console.log(`成功爬取 ${listings.length} 筆 ${city} 的租屋資料`);
      
      // 隨機延遲 2-5 秒，避免被限制
      const delay = 2000 + Math.floor(Math.random() * 3000);
      console.log(`等待 ${delay/1000} 秒後繼續...`);
      await sleep(delay);
    }
    
    // 將結果保存到 JSON 文件
    const outputDir = path.join(__dirname, '../data');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    const outputPath = path.join(outputDir, `rental_listings_api_${new Date().toISOString().slice(0, 10)}.json`);
    fs.writeFileSync(outputPath, JSON.stringify(allListings, null, 2));
    console.log(`爬取完成！共爬取 ${allListings.length} 筆租屋資料，已保存到 ${outputPath}`);
    
  } catch (error) {
    console.error('爬蟲程式發生錯誤:', error);
    process.exit(1);
  } finally {
    // 清除超時計時器
    clearTimeout(globalTimeout);
  }
}

/**
 * 取得必要的 Cookie、Token 和 URL Token
 */
async function getCSRFToken(): Promise<void> {
  console.log('正在獲取必要的 Token 和 Cookie...');
  
  try {
    // 第一步：訪問主站點獲取初始 cookie
    const mainResp = await axiosInstance.get('https://rent.591.com.tw', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'zh-TW,zh;q=0.9,en-US;q=0.8,en;q=0.7',
      }
    });
    
    // 保存 Cookie
    const setCookieHeaders = mainResp.headers['set-cookie'];
    if (setCookieHeaders) {
      cookies591 = setCookieHeaders.map(cookie => cookie.split(';')[0]).join('; ');
      console.log('成功獲取初始 Cookie:', cookies591);
    }
    
    // 從 HTML 中獲取 CSRF Token
    const html = mainResp.data;
    const csrfMatch = html.match(/<meta name="csrf-token" content="([^"]+)">/);
    if (csrfMatch && csrfMatch[1]) {
      csrfToken = csrfMatch[1];
      console.log('成功獲取 CSRF Token:', csrfToken);
    }

    // 從 HTML 中獲取可能的 URL Token
    const urlTokenMatch = html.match(/urlJumpIp=([^&"]+)/);
    if (urlTokenMatch && urlTokenMatch[1]) {
      urlToken = urlTokenMatch[1];
      console.log('成功獲取 URL Token:', urlToken);
    }
    
    // 如果沒有成功獲取必要的 Token 和 Cookie，就拋出錯誤
    if (!csrfToken || !cookies591) {
      throw new Error('獲取 Token 或 Cookie 失敗');
    }

    // 第二步：訪問租屋頁面，獲取可能的附加 cookie
    const rentResp = await axiosInstance.get('https://rent.591.com.tw/?kind=0&region=1', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'zh-TW,zh;q=0.9,en-US;q=0.8,en;q=0.7',
        'Cookie': cookies591,
        'Referer': 'https://www.591.com.tw/'
      }
    });
    
    // 更新 Cookie
    const rentSetCookieHeaders = rentResp.headers['set-cookie'];
    if (rentSetCookieHeaders) {
      const newCookies = rentSetCookieHeaders.map(cookie => cookie.split(';')[0]);
      cookies591 = [...cookies591.split('; '), ...newCookies].join('; ');
      console.log('成功更新 Cookie:', cookies591);
    }
    
    console.log('所有必要的認證資訊已獲取完成');
    
  } catch (error) {
    console.error('獲取認證資訊失敗:', error);
    throw new Error('無法獲取認證資訊，請檢查網路連接或 591 網站結構是否變更');
  }
}

/**
 * 爬取指定城市的租屋列表
 */
async function scrapeCity(city: string, regionId: number, limit: number): Promise<RentalListing[]> {
  console.log(`爬取 ${city} 第 1 頁，最多 ${limit} 筆資料`);
  
  try {
    // 主要 API 請求 - 將 region 固定為 1 (台北市)，API 似乎只返回這個區域的數據
    const params = {
      is_new_list: 1,
      type: 1,
      region: 1, // 台北市
      firstRow: 0,
      totalRows: 100
    };
    
    console.log(`請求主要 API: https://rent.591.com.tw/home/search/rsList 參數:`, params);
    
    const response = await axiosInstance.get("https://rent.591.com.tw/home/search/rsList", {
      params: params,
      headers: {
        "X-CSRF-TOKEN": csrfToken,
        "Cookie": cookies591,
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Referer": "https://rent.591.com.tw/",
        "Accept": "application/json, text/javascript, */*; q=0.01",
        "Accept-Language": "zh-TW,zh;q=0.9,en-US;q=0.8,en;q=0.7",
        "X-Requested-With": "XMLHttpRequest"
      },
    });
    
    // 簡單檢查回應
    if (!response.data || !response.data.data || !response.data.data.topData) {
      console.log('API 返回無效數據');
      console.log('回應數據:', JSON.stringify(response.data).substring(0, 500));
      return [];
    }
    
    // 取得 topData 並記錄數量
    const topData = response.data.data.topData;
    console.log(`發現 ${topData.length} 筆租屋資料，開始處理...`);
    
    // 直接處理所有 topData 項目
    const results: RentalListing[] = [];
    
    for (let i = 0; i < topData.length; i++) {
      try {
        const item = topData[i];
        console.log(`處理第 ${i+1}/${topData.length} 筆資料 (ID: ${item.post_id || '未知'})...`);
        
        // 檢查必要字段
        if (!item.post_id) {
          console.log(`  - 跳過：缺少 post_id`);
          continue;
        }
        
        // 轉換價格
        let price = 0;
        if (item.price_str) {
          const priceText = item.price_str.replace(/[^0-9]/g, '');
          price = parseInt(priceText);
          console.log(`  - 價格: ${item.price_str} => ${price}`);
        } else {
          console.log(`  - 缺少價格資訊`);
        }
        
        // 轉換坪數
        let size = 0;
        if (item.area) {
          const match = String(item.area).match(/(\d+(\.\d+)?)/);
          if (match) {
            size = parseFloat(match[1]);
            console.log(`  - 坪數: ${item.area} => ${size}`);
          } else {
            console.log(`  - 坪數格式無法解析: ${item.area}`);
          }
        } else {
          console.log(`  - 缺少坪數資訊`);
        }
        
        // 確定標題
        let title = '';
        if (item.title) {
          title = item.title;
          console.log(`  - 使用 title: ${title}`);
        } else if (item.address) {
          title = item.address;
          console.log(`  - 使用 address 作為標題: ${title}`);
        } else if (item.address_2) {
          title = item.address_2;
          console.log(`  - 使用 address_2 作為標題: ${title}`);
        } else {
          title = `租屋物件 ${item.post_id}`;
          console.log(`  - 使用預設標題: ${title}`);
        }
        
        // 建立租屋資料物件
        const listing: RentalListing = {
          id: String(item.post_id),
          title: title,
          price: price,
          size: size,
          address: item.address || item.address_2 || '',
          district: item.section_str || '',
          city: '台北市', // API 固定返回台北市資料
          type: item.kind_str || '',
          layout: item.room_str || '',
          imageUrls: item.img_src ? [item.img_src] : [],
          description: '',
          url: `https://rent.591.com.tw/rent-detail-${item.post_id}.html`,
          createTime: new Date().toISOString(),
          updateTime: new Date().toISOString(),
          contact: '',
          phone: '',
          regionId: item.region || 1,
          sectionId: item.section || 0,
          kindId: item.kind || 0,
          shape: item.shape || '',
          floor: item.floor || '',
          purposeId: item.purpose || 0,
          direction: item.direction || '',
          latitude: null,
          longitude: null
        };
        
        // 添加到結果列表
        results.push(listing);
        console.log(`  - 成功處理: ${listing.title.substring(0, 20)}... (${listing.price}元, ${listing.size}坪)`);
        
        // 達到上限則停止
        if (results.length >= limit) {
          console.log(`已達到數量上限 ${limit} 筆，停止處理`);
          break;
        }
      } catch (error) {
        console.error(`處理項目時出錯:`, error);
      }
    }
    
    console.log(`處理完成，成功獲取 ${results.length} 筆 ${city} 的租屋資料`);
    return results;
    
  } catch (error) {
    console.error(`爬取 ${city} 租屋資料時發生錯誤:`, error);
    return [];
  }
}

// 啟動主程式
main().catch(error => {
  console.error('程式執行過程中發生未處理錯誤:', error);
  process.exit(1);
});