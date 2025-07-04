import fs from 'fs';
import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger';

const prisma = new PrismaClient();

interface CrawlerData {
  id?: string;
  url?: string;
  title: string;
  price: string | number;
  size?: string | number;
  address?: string;
  latitude?: number;
  longitude?: number;
  houseType?: string;
  roomLayout?: string;
  floor_info?: string;
  parking?: string;
  images?: string[];
  facilities?: string[];
  city?: string;
  district?: string;
}

interface ImportResult {
  imported: number;
  updated: number;
  skipped: number;
  errors: number;
  totalItems: number;
}

export async function importListingsFromCrawlerData(filePath: string): Promise<ImportResult> {
  const result: ImportResult = {
    imported: 0,
    updated: 0,
    skipped: 0,
    errors: 0,
    totalItems: 0
  };

  try {
    logger.info(`📥 開始導入文件: ${filePath}`);
    
    const fileContent = fs.readFileSync(filePath, 'utf8');
    const crawlerData: CrawlerData[] = JSON.parse(fileContent);
    
    result.totalItems = crawlerData.length;
    logger.info(`📊 共 ${crawlerData.length} 條記錄待處理`);
    
    for (const item of crawlerData) {
      try {
        let itemId = item.id;
        if (!itemId && item.url) {
          const urlMatch = item.url.match(/\/house\/(.+)$/);
          if (urlMatch) {
            itemId = urlMatch[1];
          }
        }
        
        if (!itemId || !item.title) {
          logger.warn('跳過缺少必要字段的物件', { id: itemId, title: item.title });
          result.skipped++;
          continue;
        }
        
        let price = 0;
        if (typeof item.price === 'number') {
          price = item.price;
        } else if (typeof item.price === 'string') {
          const cleanPrice = item.price.replace(/[^\d]/g, '');
          price = cleanPrice ? parseInt(cleanPrice, 10) : 0;
        }
        
        let sizePing = 0;
        if (typeof item.size === 'number') {
          sizePing = item.size;
        } else if (typeof item.size === 'string') {
          const cleanSize = item.size.replace(/[^\d.]/g, '');
          sizePing = cleanSize ? parseFloat(cleanSize) : 0;
        }
        
        const existingListing = await prisma.listing.findFirst({
          where: {
            sourceId: itemId,
            source: 'houseprice',
          },
        });
        
        if (existingListing) {
          await prisma.listing.update({
            where: { id: existingListing.id },
            data: {
              title: item.title,
              price,
              sizePing,
              address: item.address || item.title,
              city: item.city || '台北市',
              district: item.district || '中正區',
              houseType: item.houseType || null,
              roomLayout: item.roomLayout || null,
              floorInfo: item.floor_info || null,
              parking: item.parking || null,
              imageUrls: item.images || [],
              facilities: item.facilities || [],
              longitude: item.longitude || 0,
              latitude: item.latitude || 0,
              lastUpdated: new Date(),
            },
          });
          result.updated++;
          logger.debug(`✅ 更新: ${item.title}`);
        } else {
          await prisma.listing.create({
            data: {
              sourceId: itemId,
              url: item.url || null,
              title: item.title,
              price,
              sizePing,
              address: item.address || item.title,
              city: item.city || '台北市',
              district: item.district || '中正區',
              houseType: item.houseType || null,
              roomLayout: item.roomLayout || null,
              floorInfo: item.floor_info || null,
              parking: item.parking || null,
              imageUrls: item.images || [],
              facilities: item.facilities || [],
              longitude: item.longitude || 0,
              latitude: item.latitude || 0,
              lastUpdated: new Date(),
              source: 'houseprice',
            },
          });
          result.imported++;
          logger.debug(`🆕 新增: ${item.title}`);
        }
      } catch (error) {
        result.errors++;
	console.log(error);
        logger.error(`❌ 處理失敗: ${item.title}`, { error });
      }
    }
    
    logger.info('📋 導入完成', { result });
    return result;
    
  } catch (error) {
    logger.error('❌ 導入過程失敗', { error });
    throw new Error(`導入失敗: ${error instanceof Error ? error.message : String(error)}`);
  }
}

export async function importCrawlerDataCLI(filePath: string): Promise<void> {
  try {
    const result = await importListingsFromCrawlerData(filePath);
    
    console.log('\n=== 導入結果 ===');
    console.log(`📄 總處理: ${result.totalItems} 筆`);
    console.log(`✅ 新增: ${result.imported} 筆`);
    console.log(`🔄 更新: ${result.updated} 筆`);
    console.log(`⏭️ 跳過: ${result.skipped} 筆`);
    console.log(`❌ 錯誤: ${result.errors} 筆`);
    
  } catch (error) {
    console.error('❌ 導入失敗:', error instanceof Error ? error.message : String(error));
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

export default {
  importListingsFromCrawlerData,
  importCrawlerDataCLI
}; 
