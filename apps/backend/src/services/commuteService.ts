import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger';
import { getDistanceMatrix } from './mapService';

const prisma = new PrismaClient();

/**
 * 通勤相關查詢的過濾條件
 */
interface CommuteFilter {
  minPrice?: number;
  maxPrice?: number;
  minSize?: number;
  city?: string;
  district?: string;
  maxCommuteDistance?: number; // 公里
}

/**
 * 通勤搜尋參數
 */
interface CommuteSearchParams {
  destination: string; // 目的地座標，格式為 "lat,lng" 或地址字串
  maxCommuteTime: number; // 最大通勤時間（分鐘）
  transitMode: string; // 交通方式: driving, transit, walking
  filter: CommuteFilter;
}

/**
 * 包含通勤時間的租屋物件
 */
interface ListingWithCommuteTime {
  id: number;
  title: string;
  price: number;
  size_ping: number;
  address: string;
  district: string;
  city: string;
  coordinates: [number, number]; // [lng, lat]
  commute_time: number; // 通勤時間（分鐘）
  commute_distance?: number; // 通勤距離（公里）
}

/**
 * 台灣主要城市
 */
type TaiwanCity = '台北市' | '新北市' | '桃園市';

/**
 * 台灣行政區對應表
 */
type TaiwanDistrictMap = {
  [key in TaiwanCity]: string[];
};

/**
 * 根據通勤時間搜尋租屋物件
 */
export async function findListingsByCommuteTime(
  params: CommuteSearchParams
): Promise<ListingWithCommuteTime[]> {
  logger.info('開始搜尋符合通勤時間的租屋物件', params);

  try {
    // 解析目的地座標
    const [destLat, destLng] = params.destination.split(',').map(Number);
    
    if (isNaN(destLat) || isNaN(destLng)) {
      throw new Error('目的地座標格式無效');
    }

    // 構建資料庫查詢條件
    const where: any = { isActive: true };

    // 加入基本過濾條件
    if (params.filter.minPrice) where.price = { gte: params.filter.minPrice };
    if (params.filter.maxPrice) {
      where.price = { ...(where.price || {}), lte: params.filter.maxPrice };
    }
    if (params.filter.minSize) where.sizePing = { gte: params.filter.minSize };
    if (params.filter.city) where.city = params.filter.city;
    if (params.filter.district) where.district = params.filter.district;

    // 獲取所有符合基本條件的租屋物件
    const allListings = await prisma.listing.findMany({
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
        commuteTimes: {
          where: {
            destination: params.destination,
            transitMode: params.transitMode,
          },
          select: {
            commuteTime: true,
            commuteDistance: true,
          },
        },
      },
      orderBy: {
        price: 'asc',
      },
    });

    logger.debug(`找到 ${allListings.length} 筆符合基本條件的物件`);

    // 🎯 加入圓形距離篩選
    const maxDistanceKm = params.filter.maxCommuteDistance || 10; // 默認 10 公里
    const listings = allListings.filter(listing => {
      const distance = calculateDirectDistance(
        destLat, destLng,
        listing.latitude, listing.longitude
      );
      return distance <= maxDistanceKm;
    });

    logger.info(`圓形距離篩選: ${listings.length}/${allListings.length} 筆物件在 ${maxDistanceKm}km 範圍內`);

    // 處理結果列表
    const result: ListingWithCommuteTime[] = [];
    const listingsToCalculate = [];
    const calculatedListings = [];

    // 第一輪：處理已有通勤時間的物件
    for (const listing of listings) {
      if (listing.commuteTimes.length > 0) {
        const commuteInfo = listing.commuteTimes[0];
        // 檢查通勤時間是否符合要求
        if (commuteInfo.commuteTime <= params.maxCommuteTime) {
          calculatedListings.push({
            id: listing.id,
            title: listing.title,
            price: listing.price,
            size_ping: listing.sizePing,
            address: listing.address,
            district: listing.district,
            city: listing.city,
            coordinates: [listing.longitude, listing.latitude] as [number, number],
            commute_time: commuteInfo.commuteTime,
            commute_distance: commuteInfo.commuteDistance || undefined,
          });
        }
      } else {
        // 需要計算通勤時間的物件
        listingsToCalculate.push(listing);
      }
    }

    // 第二輪：計算通勤時間
    if (listingsToCalculate.length > 0) {
      // 構建通勤時間計算請求 (批次處理，每次最多20個)
      const batchSize = 20;
      for (let i = 0; i < listingsToCalculate.length; i += batchSize) {
        const batch = listingsToCalculate.slice(i, i + batchSize);
        
        // 構建請求原始座標列表
        const origins = batch.map(listing => `${listing.latitude},${listing.longitude}`);
        const destination = params.destination;
      
        try {
          // 批次請求通勤時間
          const response = await getDistanceMatrix(
            origins.join('|'),
            destination,
            params.transitMode
          );
        
          if (response && response.rows) {
            // 處理響應結果
            for (let j = 0; j < batch.length; j++) {
              const listing = batch[j];
              const element = response.rows[j]?.elements[0];
            
              if (element && element.status === 'OK' && element.duration) {
                const commuteTimeMinutes = Math.ceil(element.duration.value / 60);
                const commuteDistanceKm = element.distance ? Math.ceil(element.distance.value / 1000) : undefined;
              
                // 檢查是否符合最大通勤時間
                if (commuteTimeMinutes <= params.maxCommuteTime) {
                  calculatedListings.push({
                    id: listing.id,
                    title: listing.title,
                    price: listing.price,
                    size_ping: listing.sizePing,
                    address: listing.address,
                    district: listing.district,
                    city: listing.city,
                    coordinates: [listing.longitude, listing.latitude] as [number, number],
                    commute_time: commuteTimeMinutes,
                    commute_distance: commuteDistanceKm,
                  });
                }
              
                // 儲存通勤時間到資料庫，以便下次使用
                try {
                  await prisma.commuteTime.create({
                    data: {
                      originId: listing.id,
                      destination: params.destination,
                      transitMode: params.transitMode,
                      commuteTime: commuteTimeMinutes,
                      commuteDistance: commuteDistanceKm,
                      calculatedAt: new Date(),
                    },
                  });
                } catch (error) {
                  logger.warn(`無法儲存通勤時間: ${listing.id} -> ${params.destination}`, { error });
                  // 繼續處理，不中斷流程
                }
              }
            }
          }
        } catch (error) {
          logger.warn('Google Maps API 調用失敗，回退到直線距離計算', { error });
          
          // 回退到直線距離計算
          const [destLat, destLng] = params.destination.split(',').map(Number);
          
          if (!isNaN(destLat) && !isNaN(destLng)) {
            for (const listing of batch) {
              const distance = calculateDirectDistance(
                destLat, destLng,
                listing.latitude, listing.longitude
              );
              
              // 估算通勤時間（依交通方式調整）
              const speedFactor = getSpeedFactor(params.transitMode);
              const estimatedCommuteTime = Math.round(distance * speedFactor);
              
              if (estimatedCommuteTime <= params.maxCommuteTime) {
                calculatedListings.push({
                  id: listing.id,
                  title: listing.title,
                  price: listing.price,
                  size_ping: listing.sizePing,
                  address: listing.address,
                  district: listing.district,
                  city: listing.city,
                  coordinates: [listing.longitude, listing.latitude] as [number, number],
                  commute_time: estimatedCommuteTime,
                  commute_distance: Math.round(distance),
                });
              }
            }
          }
        }
        
        // 短暫延遲，避免 API 限制
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    // 合併結果並依據通勤時間排序
    result.push(...calculatedListings);
    result.sort((a, b) => a.commute_time - b.commute_time);

    logger.info(`找到 ${result.length} 筆符合通勤時間要求的租屋物件`);
    
    return result;
  } catch (error) {
    logger.error('搜尋通勤時間租屋物件時發生錯誤', { error });
    throw new Error('搜尋通勤時間租屋物件失敗');
  }
}

/**
 * 計算兩點之間的直線距離（公里）
 */
export function calculateDirectDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371; // 地球半徑，單位為公里
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;
  return distance;
}

/**
 * 將角度轉換為弧度
 */
function toRad(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

/**
 * 根據交通方式獲取速度係數（分鐘/公里）
 */
function getSpeedFactor(transitMode: string): number {
  switch (transitMode) {
    case 'driving':
      return 2; // 開車：每公里約2分鐘
    case 'transit':
      return 3; // 大眾運輸：每公里約3分鐘
    case 'walking':
      return 12; // 步行：每公里約12分鐘
    default:
      return 2.5; // 預設：每公里約2.5分鐘
  }
} 