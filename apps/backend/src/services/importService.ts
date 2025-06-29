import fs from 'fs';
import path from 'path';
import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger';

const prisma = new PrismaClient();

/**
 * 爬蟲數據結構
 */
interface CrawlerData {
  id: string;
  url: string;
  title: string;
  price: string;
  size?: string;
  size_detail?: string;  // 完整坪數描述（如"使用8坪"）
  description?: string;
  imageUrl?: string;
  imageUrls?: string[];
  images?: string[];  // 新增：爬蟲新版本使用的欄位
  address?: string;
  latitude?: number;
  longitude?: number;
  houseType?: string;
  house_type?: string;  // 新版爬蟲使用的欄位名
  roomCount?: string;
  room_layout?: string;  // 格局（如"1房1衛"）
  floor?: string;
  totalFloor?: string;
  floor_info?: string;  // 樓層資訊（如"5/5樓"）
  parking?: string;     // 停車位資訊
  facilities?: string[];
  contactPerson?: string;
  contactPhone?: string;
  region?: string;
  // 新增：爬蟲直接抓取的地區信息
  district?: string;
  city?: string;
  detected_city?: string;  // 爬蟲自動偵測的城市
}

/**
 * 數據容器接口
 */
interface DataContainer {
  data?: CrawlerData[];
  listings?: CrawlerData[];
  items?: CrawlerData[];
}

/**
 * 導入結果結構
 */
interface ImportResult {
  imported: number;
  updated: number;
  skipped: number;
  errors: number;
  totalItems: number; // 總處理項目數
  errorItems?: CrawlerData[]; // 錯誤項目
  errorMessages?: string[]; // 錯誤信息
}

export interface BatchUpdateOptions {
  batchSize?: number;
  keepOldDataDays?: number;
  preserveCommuteData?: boolean;
}

/**
 * 批次更新：軟刪除策略
 * 1. 標記所有現有資料為 inactive
 * 2. 匯入新資料為 active
 * 3. 清理過期資料
 */
export async function batchUpdateListings(
  filePathOrData: string | object,
  options: BatchUpdateOptions = {}
): Promise<ImportResult & { strategy: string }> {
  const startTime = Date.now();
  const { 
    batchSize = 1000, 
    keepOldDataDays = 7,
    preserveCommuteData = true 
  } = options;

  logger.info('🔄 開始批次更新租屋資料', {
    strategy: 'soft-delete',
    keepOldDataDays,
    preserveCommuteData
  });

  try {
    // 階段 1: 標記所有現有資料為 inactive
    logger.info('📋 階段 1: 標記現有資料為 inactive');
    const markInactiveResult = await prisma.listing.updateMany({
      where: { isActive: true },
      data: { 
        isActive: false,
        updatedAt: new Date()
      }
    });
    logger.info(`✅ 已標記 ${markInactiveResult.count} 筆資料為 inactive`);

    // 階段 2: 匯入新資料（自動設為 active）
    logger.info('📥 階段 2: 匯入新資料');
    const importResult = await importListingsFromCrawlerData(filePathOrData);
    
    // 確保新資料都是 active 的
    await prisma.listing.updateMany({
      where: { 
        isActive: false,
        updatedAt: { gte: new Date(startTime) }
      },
      data: { isActive: true }
    });

    // 階段 3: 統計結果
    const activeCount = await prisma.listing.count({ where: { isActive: true } });
    const inactiveCount = await prisma.listing.count({ where: { isActive: false } });
    
    logger.info('📊 批次更新完成', {
      activeListings: activeCount,
      inactiveListings: inactiveCount,
      importStats: importResult
    });

    return {
      ...importResult,
      strategy: 'soft-delete-batch-update'
    };

  } catch (error) {
    logger.error('❌ 批次更新失敗，回滾變更', { error });
    
    // 回滾：重新激活之前的資料
    await prisma.listing.updateMany({
      where: { 
        isActive: false,
        updatedAt: { lt: new Date(startTime) }
      },
      data: { isActive: true }
    });
    
    throw error;
  }
}

/**
 * 清理過期的 inactive 資料
 */
export async function cleanupOldListings(keepDays: number = 7): Promise<{
  deletedListings: number;
  preservedCommuteData: boolean;
}> {
  logger.info(`🧹 開始清理 ${keepDays} 天前的 inactive 資料`);
  
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - keepDays);

  try {
    // 查找要刪除的 listings
    const oldInactiveListings = await prisma.listing.findMany({
      where: {
        isActive: false,
        updatedAt: { lt: cutoffDate }
      },
      select: { id: true }
    });

    const listingIds = oldInactiveListings.map(l => l.id);
    
    if (listingIds.length === 0) {
      logger.info('✅ 沒有需要清理的過期資料');
      return { deletedListings: 0, preservedCommuteData: false };
    }

    // 先刪除相關的通勤時間資料
    const deletedCommuteData = await prisma.commuteTime.deleteMany({
      where: { originId: { in: listingIds } }
    });

    // 再刪除 listings
    const deletedListings = await prisma.listing.deleteMany({
      where: { id: { in: listingIds } }
    });

    logger.info('🗑️ 清理完成', {
      deletedListings: deletedListings.count,
      deletedCommuteData: deletedCommuteData.count,
      cutoffDate: cutoffDate.toISOString()
    });

    return {
      deletedListings: deletedListings.count,
      preservedCommuteData: false
    };

  } catch (error) {
    logger.error('❌ 清理過期資料失敗', { error });
    throw error;
  }
}

/**
 * 智慧清理：保留有通勤時間的資料
 */
export async function smartCleanupOldListings(keepDays: number = 7): Promise<{
  deletedListings: number;
  preservedListings: number;
  preservedCommuteData: boolean;
}> {
  logger.info(`🧠 開始智慧清理 ${keepDays} 天前的 inactive 資料`);
  
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - keepDays);

  try {
    // 查找沒有通勤時間資料的舊 listings
    const listingsToDelete = await prisma.listing.findMany({
      where: {
        isActive: false,
        updatedAt: { lt: cutoffDate },
        commuteTimes: { none: {} }  // 沒有通勤時間資料
      },
      select: { id: true }
    });

    // 查找有通勤時間資料的舊 listings（保留）
    const listingsToPreserve = await prisma.listing.count({
      where: {
        isActive: false,
        updatedAt: { lt: cutoffDate },
        commuteTimes: { some: {} }  // 有通勤時間資料
      }
    });

    const listingIdsToDelete = listingsToDelete.map(l => l.id);
    
    if (listingIdsToDelete.length === 0) {
      logger.info('✅ 沒有需要清理的無通勤時間資料');
      return { 
        deletedListings: 0, 
        preservedListings: listingsToPreserve,
        preservedCommuteData: true 
      };
    }

    // 刪除沒有通勤時間的 listings
    const deletedResult = await prisma.listing.deleteMany({
      where: { id: { in: listingIdsToDelete } }
    });

    logger.info('🎯 智慧清理完成', {
      deletedListings: deletedResult.count,
      preservedListings: listingsToPreserve,
      reason: '保留有通勤時間資料的物件'
    });

    return {
      deletedListings: deletedResult.count,
      preservedListings: listingsToPreserve,
      preservedCommuteData: true
    };

  } catch (error) {
    logger.error('❌ 智慧清理失敗', { error });
    throw error;
  }
}

/**
 * 從爬蟲數據文件導入租屋物件到數據庫
 * @param filePath 爬蟲數據 JSON 文件路徑
 * @returns 導入結果統計
 */
export async function importListingsFromCrawlerData(
  filePathOrData: string | object
): Promise<ImportResult> {
  // 初始化結果計數
  const result: ImportResult = {
    imported: 0,
    updated: 0,
    skipped: 0,
    errors: 0,
    totalItems: 0,
    errorMessages: []
  };

  try {
    // 解析 JSON 數據
    let crawlerData: CrawlerData[] = [];
    
    if (typeof filePathOrData === 'string') {
      // 處理文件路徑
      logger.info(`開始讀取文件: ${filePathOrData}`);
      const fileContent = fs.readFileSync(filePathOrData, 'utf8');
      
      try {
        const parsedData = JSON.parse(fileContent);
        crawlerData = extractCrawlerData(parsedData);
      } catch (error) {
        logger.error('解析 JSON 文件失敗', { error });
        throw new Error(`無法解析 JSON 文件: ${error instanceof Error ? error.message : String(error)}`);
      }
    } else {
      // 直接處理 JSON 數據
      try {
        crawlerData = extractCrawlerData(filePathOrData);
      } catch (error) {
        logger.error('處理 JSON 數據失敗', { error });
        throw new Error(`無法處理 JSON 數據: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
    
    result.totalItems = crawlerData.length;
    logger.info(`成功解析 JSON 數據，共 ${crawlerData.length} 條記錄`);
    
    // 批次處理導入
    for (const item of crawlerData) {
      // 如果沒有 id，從 URL 中提取
      let itemId = item.id;
      if (!itemId && item.url) {
        // 從 URL 中提取 ID，例如 "https://rent.houseprice.tw/house/1254487_1884553"
        const urlMatch = item.url.match(/\/house\/(.+)$/);
        if (urlMatch) {
          itemId = urlMatch[1];
        }
      }
      
      try {
        
        // 如果沒有 address，使用 title 作為地址
        const effectiveAddress = item.address || item.title || '地址未提供';
        
        // 提取地址信息 - 優先使用爬蟲直接抓取的地區信息
        let addressInfo = {
          city: item.city || item.detected_city || '台北市',
          district: item.district || '中正區',
          address: effectiveAddress
        };
        
        // 如果爬蟲沒有提供地區信息，則使用提取函數推測
        if (!item.city && !item.detected_city && !item.district) {
          addressInfo = extractAddressInfo(item.title || '', effectiveAddress);
        }
        
        // 處理圖片URL - 新增支援 images 欄位
        let imageUrls: string[] = [];
        if (item.images && Array.isArray(item.images)) {
          imageUrls = item.images; // 優先使用新版本的 images 欄位
        } else if (item.imageUrls && Array.isArray(item.imageUrls)) {
          imageUrls = item.imageUrls;
        } else if (item.imageUrl) {
          imageUrls = [item.imageUrl];
        }
        
        // 處理設施列表
        let facilities: string[] = [];
        if (item.facilities && Array.isArray(item.facilities)) {
          facilities = item.facilities;
        }
        
        // 處理價格
        let price = 0;
        if (typeof item.price === 'number') {
          price = item.price;
        } else if (typeof item.price === 'string') {
          // 清理價格字符串，移除非數字字符
          const cleanPrice = item.price.replace(/[^\d]/g, '');
          price = cleanPrice ? parseInt(cleanPrice, 10) : 0;
        }
        
        // 處理坪數
        let sizePing = 0;
        if (item.size) {
          if (typeof item.size === 'number') {
            sizePing = item.size;
          } else if (typeof item.size === 'string') {
            // 清理坪數字符串，移除非數字字符
            const cleanSize = item.size.replace(/[^\d.]/g, '');
            sizePing = cleanSize ? parseFloat(cleanSize) : 0;
          }
        }
        
        // 處理房屋類型 - 優先使用新版本欄位
        const houseType = item.house_type || item.houseType;
        
        // 確定資料來源 - 現在只支援 houseprice
        const dataSource = 'houseprice';
        
        // 嘗試查找現有物件
        const existingListing = await prisma.listing.findFirst({
          where: {
            sourceId: itemId,
            source: dataSource,
          },
        });
        
        if (existingListing) {
          // 更新現有物件
          await prisma.listing.update({
            where: { id: existingListing.id },
            data: {
              title: item.title,
              price,
              sizePing,
              sizeDetail: item.size_detail || existingListing.sizeDetail,
              houseType: houseType || existingListing.houseType,
              roomType: item.roomCount || existingListing.roomType,
              roomLayout: item.room_layout || existingListing.roomLayout,
              parking: item.parking || existingListing.parking,
              address: effectiveAddress || existingListing.address,
              district: addressInfo.district || existingListing.district,
              city: addressInfo.city || existingListing.city,
              description: item.description || existingListing.description,
              imageUrls: imageUrls.length > 0 ? imageUrls : existingListing.imageUrls,
              facilities: facilities.length > 0 ? facilities : existingListing.facilities,
              contactName: item.contactPerson || existingListing.contactName,
              contactPhone: item.contactPhone || existingListing.contactPhone,
              floor: item.floor ? parseInt(item.floor, 10) : existingListing.floor,
              totalFloor: item.totalFloor ? parseInt(item.totalFloor, 10) : existingListing.totalFloor,
              floorInfo: item.floor_info || existingListing.floorInfo,
              lastUpdated: new Date(),
              longitude: item.longitude || existingListing.longitude,
              latitude: item.latitude || existingListing.latitude,
            },
          });
          result.updated++;
          logger.debug(`更新物件: ID=${itemId}, 標題=${item.title}`);
        } else {
          // 確保必要字段存在 - 放寬 price 要求，允許價格為0
          if (!itemId || !item.title) {
            logger.warn('跳過缺少必要字段的物件', { 
              id: itemId, 
              title: item.title, 
              price: item.price,
              url: item.url 
            });
            result.skipped++;
            continue;
          }
          
          // 創建新物件
          await prisma.listing.create({
            data: {
              sourceId: itemId,
              url: item.url || null,
              title: item.title,
              price,
              sizePing: sizePing || 0,
              sizeDetail: item.size_detail || null,
              houseType: houseType || null,
              roomType: item.roomCount || null,
              roomLayout: item.room_layout || null,
              parking: item.parking || null,
              address: effectiveAddress,
              district: addressInfo.district,
              city: addressInfo.city,
              description: item.description || null,
              imageUrls,
              facilities,
              contactName: item.contactPerson || null,
              contactPhone: item.contactPhone || null,
              floor: item.floor ? parseInt(item.floor, 10) : null,
              totalFloor: item.totalFloor ? parseInt(item.totalFloor, 10) : null,
              floorInfo: item.floor_info || null,
              lastUpdated: new Date(),
              longitude: item.longitude || 0,
              latitude: item.latitude || 0,
              source: dataSource, // 使用動態判斷的資料來源
            },
          });
          result.imported++;
          logger.debug(`導入新物件: ID=${itemId}, 標題=${item.title}`);
        }
      } catch (error) {
        result.errors++;
        const errorMessage = `處理 ID=${itemId} 的物件時錯誤: ${error instanceof Error ? error.message : String(error)}`;
        result.errorMessages?.push(errorMessage);
        logger.error(errorMessage, { 
          error, 
          item: { id: itemId, title: item.title } 
        });
      }
    }
    
    logger.info('導入數據完成', { result });
    return result;
  } catch (error) {
    logger.error('導入過程中發生錯誤', { error });
    throw new Error(`導入失敗: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * 從JSON數據中提取爬蟲數據數組
 */
function extractCrawlerData(data: any): CrawlerData[] {
  if (Array.isArray(data)) {
    return data;
  }
  
  // 嘗試從常見的數據容器結構中提取
  const container = data as DataContainer;
  
  if (container.data && Array.isArray(container.data)) {
    return container.data;
  }
  
  if (container.listings && Array.isArray(container.listings)) {
    return container.listings;
  }
  
  if (container.items && Array.isArray(container.items)) {
    return container.items;
  }
  
  throw new Error('無法從 JSON 數據中找到有效的爬蟲數據數組');
}

/**
 * 從標題或地址提取地區信息
 * @param title 標題
 * @param address 地址
 * @returns 地區信息
 */
function extractAddressInfo(title: string, address: string): {
  city: string;
  district: string;
  address: string;
} {
  const combinedText = `${title} ${address}`;
  
  // 定義城市和區域的正則表達式
  const cityRegex = /(台北市|新北市|基隆市|桃園市|新竹市|新竹縣|苗栗縣|台中市|彰化縣|南投縣|雲林縣|嘉義市|嘉義縣|台南市|高雄市|屏東縣|台東縣|花蓮縣|宜蘭縣|澎湖縣|金門縣|連江縣)/;
  const districtRegex = /([^市縣]{1,3}[區鄉鎮市])/;
  
  // 提取城市
  const cityMatch = combinedText.match(cityRegex);
  let city = cityMatch ? cityMatch[1] : '台北市'; // 預設台北市
  
  // 提取區域
  const districtMatch = combinedText.match(districtRegex);
  let district = districtMatch ? districtMatch[1] : '中正區'; // 預設中正區
  
  // 確保區域名稱以"區"、"鄉"、"鎮"或"市"結尾
  if (!district.match(/[區鄉鎮市]$/)) {
    district += '區';
  }
  
  return {
    city,
    district,
    address: address || title || `${city}${district}`
  };
}

/**
 * CLI版本的導入函數
 * @param filePath 文件路徑
 */
export async function importCrawlerDataCLI(filePath: string): Promise<void> {
  try {
    const result = await importListingsFromCrawlerData(filePath);
    
    console.log('\n=== 導入結果統計 ===');
    console.log(`📄 總處理項目: ${result.totalItems}`);
    console.log(`✅ 新增物件: ${result.imported}`);
    console.log(`🔄 更新物件: ${result.updated}`);
    console.log(`⏭️  跳過物件: ${result.skipped}`);
    console.log(`❌ 錯誤物件: ${result.errors}`);
    
    if (result.errorMessages && result.errorMessages.length > 0) {
      console.log('\n=== 錯誤詳情 ===');
      result.errorMessages.forEach((msg, index) => {
        console.log(`${index + 1}. ${msg}`);
      });
    }
  } catch (error) {
    console.error('導入失敗:', error instanceof Error ? error.message : String(error));
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

export default {
  importListingsFromCrawlerData,
  importCrawlerDataCLI
}; 