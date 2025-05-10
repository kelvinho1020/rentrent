import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger';
import { getDistanceMatrix } from './mapService';

let prisma: PrismaClient;

// 在開發環境下可能無法連接到數據庫，處理初始化錯誤
try {
  prisma = new PrismaClient();
} catch (error) {
  logger.warn('Prisma 客戶端初始化失敗，將使用模擬數據', { error });
  // 不阻止程序運行，後續將使用模擬數據
}

interface CommuteFilter {
  minPrice?: number;
  maxPrice?: number;
  minSize?: number;
  city?: string;
}

interface CommuteSearchParams {
  destination: string;
  maxCommuteTime: number;
  transitMode: string;
  filter: CommuteFilter;
}

interface ListingWithCommuteTime {
  id: number;
  title: string;
  price: number;
  size_ping: number;
  address: string;
  district: string;
  city: string;
  coordinates: [number, number];
  commute_time: number;
  commute_distance?: number;
}

// 定義台灣城市和行政區的類型
type TaiwanCity = '台北市' | '新北市' | '桃園市';
type TaiwanDistrictMap = {
  [key in TaiwanCity]: string[];
};

/**
 * 生成假的租屋列表，用於模擬數據
 */
function generateMockListings(count: number = 20): ListingWithCommuteTime[] {
  const cities: TaiwanCity[] = ['台北市', '新北市', '桃園市'];
  const districts: TaiwanDistrictMap = {
    '台北市': ['大安區', '信義區', '中山區', '松山區', '文山區'],
    '新北市': ['板橋區', '中和區', '新莊區', '三重區', '永和區'],
    '桃園市': ['桃園區', '中壢區', '平鎮區', '八德區', '龜山區'],
  };
  
  const result: ListingWithCommuteTime[] = [];
  
  for (let i = 0; i < count; i++) {
    // 隨機選擇城市和行政區
    const city = cities[Math.floor(Math.random() * cities.length)];
    const district = districts[city][Math.floor(Math.random() * districts[city].length)];
    
    // 生成隨機座標 (台灣大致範圍)
    const longitude = 121.3 + Math.random() * 0.7; // 約 121.3 ~ 122.0
    const latitude = 24.9 + Math.random() * 0.5;   // 約 24.9 ~ 25.4
    
    // 隨機價格 (8000 ~ 35000)
    const price = 8000 + Math.floor(Math.random() * 27000);
    
    // 隨機坪數 (5 ~ 30)
    const size = 5 + Math.floor(Math.random() * 25);
    
    // 隨機通勤時間 (5 ~ 45 分鐘)
    const commuteTime = 5 + Math.floor(Math.random() * 40);
    
    // 隨機通勤距離 (1 ~ 15 公里)
    const commuteDistance = commuteTime * 250 + Math.floor(Math.random() * 1000);
    
    result.push({
      id: i + 1,
      title: `${city}${district}精緻${size}坪套房，近捷運站`,
      price: price,
      size_ping: size,
      address: `${city}${district}某路${Math.floor(Math.random() * 100) + 1}號`,
      district: district,
      city: city,
      coordinates: [longitude, latitude] as [number, number],
      commute_time: commuteTime,
      commute_distance: commuteDistance,
    });
  }
  
  return result;
}

/**
 * 根據通勤時間查找租屋物件
 */
export async function findListingsByCommuteTime(params: CommuteSearchParams): Promise<ListingWithCommuteTime[]> {
  const { destination, maxCommuteTime, transitMode, filter } = params;

  try {
    // 如果 Prisma 未初始化或在開發環境中，使用模擬數據
    if (!prisma || process.env.NODE_ENV === 'development') {
      logger.info('使用模擬租屋數據 (Prisma 未初始化或處於開發環境)');
      
      // 生成模擬數據
      const mockListings = generateMockListings(30);
      
      // 應用篩選條件
      return mockListings
        .filter(listing => {
          // 價格篩選
          if (filter.minPrice && listing.price < filter.minPrice) return false;
          if (filter.maxPrice && listing.price > filter.maxPrice) return false;
          
          // 坪數篩選
          if (filter.minSize && listing.size_ping < filter.minSize) return false;
          
          // 城市篩選
          if (filter.city && listing.city !== filter.city) return false;
          
          // 通勤時間篩選
          if (listing.commute_time > maxCommuteTime) return false;
          
          return true;
        })
        .sort((a, b) => a.commute_time - b.commute_time)
        .slice(0, 10); // 最多返回 10 個結果
    }

    // 構建查詢條件
    const where: any = {};
    
    if (filter.minPrice) where.price = { gte: filter.minPrice };
    if (filter.maxPrice) {
      where.price = {
        ...where.price,
        lte: filter.maxPrice,
      };
    }
    if (filter.minSize) where.sizePing = { gte: filter.minSize };
    if (filter.city) where.city = filter.city;

    // 查詢符合篩選條件的租屋物件
    const listings = await prisma.listing.findMany({
      where,
      select: {
        id: true,
        title: true,
        price: true,
        sizePing: true,
        address: true,
        district: true,
        city: true,
        longitude: true,
        latitude: true,
      },
    });

    if (listings.length === 0) {
      return [];
    }

    // 批量計算通勤時間
    const listingsWithCommuteTimePromises = listings.map(async (listing) => {
      try {
        // 查詢資料庫中是否已有該路線的通勤時間資料
        const existingCommuteTime = await prisma.commuteTime.findFirst({
          where: {
            originId: listing.id,
            destination,
            transitMode,
          },
        });

        // 若已有資料且計算時間在一週內，則直接使用
        if (
          existingCommuteTime &&
          new Date().getTime() - new Date(existingCommuteTime.calculatedAt).getTime() < 7 * 24 * 60 * 60 * 1000
        ) {
          return {
            id: listing.id,
            title: listing.title,
            price: listing.price,
            size_ping: listing.sizePing,
            address: listing.address,
            district: listing.district,
            city: listing.city,
            coordinates: [listing.longitude, listing.latitude] as [number, number],
            commute_time: existingCommuteTime.commuteTime,
            commute_distance: existingCommuteTime.commuteDistance || undefined,
          } as ListingWithCommuteTime;
        }

        // 否則需要重新計算通勤時間
        const origin = `${listing.latitude},${listing.longitude}`;
        const distanceMatrix = await getDistanceMatrix(origin, destination, transitMode);

        if (!distanceMatrix || !distanceMatrix.rows?.[0]?.elements?.[0]?.duration?.value) {
          throw new Error('無法取得通勤時間');
        }

        const commuteTimeSeconds = distanceMatrix.rows[0].elements[0].duration.value;
        const commuteTimeMinutes = Math.ceil(commuteTimeSeconds / 60);
        
        // 取得距離（若有）
        const commuteDistanceMeters = distanceMatrix.rows[0].elements[0].distance?.value;

        // 儲存到資料庫
        await prisma.commuteTime.upsert({
          where: {
            unique_commute_route: {
              originId: listing.id,
              destination,
              transitMode,
            },
          },
          update: {
            commuteTime: commuteTimeMinutes,
            commuteDistance: commuteDistanceMeters,
            calculatedAt: new Date(),
          },
          create: {
            originId: listing.id,
            destination,
            commuteTime: commuteTimeMinutes,
            commuteDistance: commuteDistanceMeters,
            transitMode,
          },
        });

        return {
          id: listing.id,
          title: listing.title,
          price: listing.price,
          size_ping: listing.sizePing,
          address: listing.address,
          district: listing.district,
          city: listing.city,
          coordinates: [listing.longitude, listing.latitude] as [number, number],
          commute_time: commuteTimeMinutes,
          commute_distance: commuteDistanceMeters,
        } as ListingWithCommuteTime;
      } catch (error) {
        logger.error('計算通勤時間失敗', { error, listingId: listing.id });
        // 計算失敗的物件返回 null
        return null;
      }
    });

    // 等待所有計算完成
    const listingsWithCommuteTime = await Promise.all(listingsWithCommuteTimePromises);

    // 篩選出有效結果並按通勤時間排序
    return listingsWithCommuteTime
      .filter((item): item is ListingWithCommuteTime => 
        item !== null && item.commute_time <= maxCommuteTime
      )
      .sort((a, b) => a.commute_time - b.commute_time);
  } catch (error) {
    logger.error('尋找符合通勤時間的租屋物件失敗', { error });
    
    // 發生錯誤時，返回模擬數據
    logger.info('使用模擬租屋數據 (發生錯誤)');
    const mockListings = generateMockListings(15)
      .filter(listing => listing.commute_time <= maxCommuteTime)
      .sort((a, b) => a.commute_time - b.commute_time);
    
    return mockListings;
  }
} 