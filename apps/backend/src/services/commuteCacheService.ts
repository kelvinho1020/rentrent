import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger';
import { getDistanceMatrix } from './mapService';
import { redisClient } from '../config/redis';
import { SmartCommuteFilters, DistanceMatrixResponse } from '../types';
import { ListingBasic } from '@rentrent/shared';

const prisma = new PrismaClient();

function quantizeCoordinate(coordinate: number, precision: number = 0.003): number {
  return Math.round(coordinate / precision) * precision;
}

function generateDestinationHash(lat: number, lng: number, mode: string): string {
  const quantizedLat = quantizeCoordinate(lat, 0.003); // 約300公尺精度
  const quantizedLng = quantizeCoordinate(lng, 0.003);
  return `${quantizedLat.toFixed(3)},${quantizedLng.toFixed(3)}:${mode}`;
}

async function findNearbyListings(centerLat: number, centerLng: number, radiusKm: number = 10, filters: SmartCommuteFilters = {}) {
  const latRange = radiusKm / 111; // 1度緯度 ≈ 111km
  const lngRange = radiusKm / (111 * Math.cos((centerLat * Math.PI) / 180)); // 經度隨緯度變化

  // 構建查詢條件
  const where: any = {
    isActive: true,
    latitude: {
      gte: centerLat - latRange,
      lte: centerLat + latRange,
    },
    longitude: {
      gte: centerLng - lngRange,
      lte: centerLng + lngRange,
    },
  };

  // 添加過濾條件
  if (filters.minPrice !== undefined) {
    where.price = { gte: filters.minPrice };
  }
  if (filters.maxPrice !== undefined) {
    where.price = { ...where.price, lte: filters.maxPrice };
  }
  if (filters.minSize !== undefined) {
    where.sizePing = { gte: filters.minSize };
  }
  if (filters.city) {
    where.city = filters.city;
  }
  if (filters.district) {
    where.district = filters.district;
  }

  const nearbyListings = await prisma.listing.findMany({
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

  logger.info(`地理篩選: 在 ${radiusKm}km 範圍內找到 ${nearbyListings.length} 間房屋`);
  return nearbyListings;
}

export async function smartCommuteSearch(params: {
  destination: { lat: number; lng: number };
  mode: string;
  maxCommuteTime: number; // 分鐘
  radiusKm?: number;
  filters?: SmartCommuteFilters;
}) {
  const { destination, mode, maxCommuteTime, radiusKm = 10, filters = {} } = params;
  
  logger.info(`🔍 智能通勤搜尋開始：目的地 (${destination.lat}, ${destination.lng}), 模式: ${mode}, 最大時間: ${maxCommuteTime}分鐘, 搜尋半徑: ${radiusKm}km`);

  // 先根據地理位置篩選，再根據基本條件篩選
  const nearbyListings = await findNearbyListings(destination.lat, destination.lng, radiusKm, filters);
  logger.info(`🌍 地理篩選結果: 在 ${radiusKm}km 範圍內找到 ${nearbyListings.length} 間房屋`);

  if (nearbyListings.length === 0) {
    return [];
  }

  const destinationHash = generateDestinationHash(destination.lat, destination.lng, mode);
  const nearbyListingIds = nearbyListings.map(listing => listing.id);

  // 從 Redis 查詢快取 - 使用目的地+交通方式作為 key
  const cacheKey = `commute:${destinationHash}`;
  const cachedData = await redisClient.get(cacheKey);
  
  const results = [];
  const needCalculation = [];
  let cachedCommuteData: Record<number, { durationMinutes: number; distanceKm?: number | null }> = {};

  // 處理快取結果
  if (cachedData) {
    try {
      cachedCommuteData = JSON.parse(cachedData);
    } catch (error) {
      logger.warn('Redis 快取資料解析失敗', { error });
    }
  }

  // 檢查哪些房屋有快取資料
  for (const listing of nearbyListings) {
    const commuteData = cachedCommuteData[listing.id];
    
    if (commuteData && commuteData.durationMinutes <= maxCommuteTime) {
      const result: ListingBasic = {
        id: listing.id,
        title: listing.title,
        price: listing.price,
        size_ping: listing.sizePing,
        address: listing.address,
        district: listing.district,
        city: listing.city,
        coordinates: [listing.longitude, listing.latitude],
        commute_time: commuteData.durationMinutes,
      };
      results.push(result);
    } else {
      needCalculation.push(listing);
    }
  }

  logger.info(`📋 Redis 快取命中: ${results.length} 筆記錄`);
  
  if (needCalculation.length > 0) {
    logger.info(`🔄 需要計算通勤時間: ${needCalculation.length} 間房屋`);
    
    try {
      // 限制批次大小，避免 Google API 超限
      const batchSize = 20; 
      const newCommuteData: Record<number, { durationMinutes: number; distanceKm?: number | null }> = {};
      
      for (let i = 0; i < needCalculation.length; i += batchSize) {
        const batchListings = needCalculation.slice(i, i + batchSize);
        logger.info(`📊 處理第 ${Math.floor(i/batchSize) + 1} 批，共 ${batchListings.length} 間房屋`);
        
        const origins = batchListings.map(listing => 
          `${listing.latitude},${listing.longitude}`
        );
        const destinationCoord = `${destination.lat},${destination.lng}`;
        
        const response = await getDistanceMatrix(
          origins.join('|'),
          destinationCoord,
          mode
        );

        if (response && response.rows) {
          for (let j = 0; j < batchListings.length; j++) {
            const listing = batchListings[j];
            const element = response.rows[j]?.elements[0];
            
            if (element && element.status === 'OK' && element.duration) {
              const durationMinutes = Math.ceil(element.duration.value / 60);
              const distanceKm = element.distance ? element.distance.value / 1000 : null;
              
              newCommuteData[listing.id] = {
                durationMinutes,
                distanceKm,
              };
              
              if (durationMinutes <= maxCommuteTime) {
                const result: ListingBasic = {
                  id: listing.id,
                  title: listing.title,
                  price: listing.price,
                  size_ping: listing.sizePing,
                  address: listing.address,
                  district: listing.district,
                  city: listing.city,
                  coordinates: [listing.longitude, listing.latitude],
                  commute_time: durationMinutes,
                };
                results.push(result);
              }
            } else {
              newCommuteData[listing.id] = {
                durationMinutes: 999,
                distanceKm: null,
              };
            }
          }
        }
        
        // 避免 API 限制，批次間暫停
        if (i + batchSize < needCalculation.length) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }
      
      // 合併新計算的資料到快取
      if (Object.keys(newCommuteData).length > 0) {
        try {
          const updatedCacheData = { ...cachedCommuteData, ...newCommuteData };
          const expiry = 60 * 60 * 24 * 7; // 7天過期
          await redisClient.setex(cacheKey, expiry, JSON.stringify(updatedCacheData));
          logger.info(`💾 成功快取 ${Object.keys(newCommuteData).length} 筆新記錄到 Redis`);
        } catch (error) {
          logger.warn('Redis 快取寫入失敗', { error });
        }
      }
    } catch (error) {
      logger.error('計算通勤時間失敗', { error });
    }
  }

  // 按通勤時間排序並返回
  results.sort((a, b) => (a.commute_time || 0) - (b.commute_time || 0));
  
  logger.info(`✅ 最終結果: ${results.length} 筆符合條件的房屋`);
  
  return {
    listings: results,
    from_cache: needCalculation.length === 0 // 如果沒有需要計算的，表示全部來自快取
  };
}