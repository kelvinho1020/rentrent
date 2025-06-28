import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger';
import { getIsochroneData } from '../services/mapService';
import { calculateDirectDistance, findListingsByCommuteTime } from '../services/commuteService';

// 增加重試次數和錯誤處理
const prisma = new PrismaClient({
  log: ['query', 'error', 'warn'],
  errorFormat: 'pretty',
});

export class CommuteController {
  /**
   * 根據通勤時間搜尋租屋物件
   */
  public searchByCommuteTime = async (req: Request, res: Response): Promise<void> => {
    try {
      // 記錄完整請求內容以便調試
      logger.debug('接收到通勤搜尋請求', { body: JSON.stringify(req.body) });
      
      const {
        work_location,
        destination,
        max_commute_time = 30,
        transit_mode = "driving",
        min_price,
        max_price,
        min_size,
        city,
        district,
        max_distance,
      } = req.body;

      // 支持 work_location 或 destination 參數
      const dest = destination || work_location;

      if (!dest) {
        res.status(StatusCodes.BAD_REQUEST).json({
          error: {
            message: '缺少必要參數 work_location(或destination)',
            status: StatusCodes.BAD_REQUEST,
          },
        });
        return;
      }

      // 記錄請求參數
      logger.info('通勤搜尋請求', { 
        destination: dest, 
        max_commute_time, 
        transit_mode,
        filters: { min_price, max_price, min_size, city, district, max_distance }
      });

      // 構建過濾條件
      const filter: any = {};
      if (min_price) filter.minPrice = Number(min_price);
      if (max_price) filter.maxPrice = Number(max_price);
      if (min_size) filter.minSize = Number(min_size);
      if (city) filter.city = city;
      if (district) filter.district = district;
      if (max_distance) filter.maxCommuteDistance = Number(max_distance);

      // 將座標格式轉換為字符串，例如 "lat,lng"
      let destString = '';
      
      try {
        if (typeof dest === 'string') {
          destString = dest;
        } else if (typeof dest === 'object') {
          if (dest.latitude !== undefined && dest.longitude !== undefined) {
            // 標準格式：{ latitude: number, longitude: number }
            destString = `${dest.latitude},${dest.longitude}`;
          } else if (Array.isArray(dest) && dest.length === 2) {
            // 數組格式：[longitude, latitude]
            destString = `${dest[1]},${dest[0]}`;
          } else if (dest.lat !== undefined && dest.lng !== undefined) {
            // Google Maps 格式：{ lat: number, lng: number }
            destString = `${dest.lat},${dest.lng}`;
          }
        }
        
        logger.debug('解析後的目的地座標', { destString });
      } catch (parseError) {
        logger.error('解析座標時發生錯誤', { error: parseError, dest });
        res.status(StatusCodes.BAD_REQUEST).json({
          error: {
            message: '解析座標時發生錯誤，請檢查格式',
            details: parseError instanceof Error ? parseError.message : '未知錯誤',
            status: StatusCodes.BAD_REQUEST,
          },
        });
        return;
      }

      if (!destString) {
        res.status(StatusCodes.BAD_REQUEST).json({
          error: {
            message: '目的地座標格式無效',
            status: StatusCodes.BAD_REQUEST,
          },
        });
        return;
      }

      // 直接使用直線距離搜尋作為主要方法
      if (max_distance) {
        logger.info('使用直線距離進行搜尋', { maxDistance: max_distance });
        
        try {
          // 從目的地座標獲取經緯度
          const [destLat, destLng] = destString.split(',').map(Number);
          
          if (isNaN(destLat) || isNaN(destLng)) {
            throw new Error(`無效的座標格式: ${destString}`);
          }
          
          // 構建基本查詢條件
          const where: any = { isActive: true };
          if (filter.minPrice) where.price = { gte: filter.minPrice };
          if (filter.maxPrice) {
            where.price = { ...(where.price || {}), lte: filter.maxPrice };
          }
          if (filter.minSize) where.sizePing = { gte: filter.minSize };
          if (filter.city) where.city = filter.city;
          if (filter.district) where.district = filter.district;
          
          logger.debug('執行Prisma查詢', { where });
          
          // 測試資料庫連接
          try {
            await prisma.$queryRaw`SELECT 1`;
            logger.debug('資料庫連接測試成功');
          } catch (dbError) {
            logger.error('資料庫連接測試失敗', { error: dbError });
            
            // 若無法連接資料庫，返回模擬數據
            res.status(StatusCodes.OK).json({
              total: 0,
              results: [],
              note: '資料庫連接失敗，無法獲取租屋資料，請稍後再試'
            });
            return;
          }
          
          // 查詢符合基本條件的租屋物件
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
            },
            orderBy: {
              price: 'asc',
            },
          });
          
          logger.debug(`找到 ${allListings.length} 筆符合基本條件的物件`);
          
          // 計算直線距離並篩選
          const listingsWithDistance = allListings
            .map(listing => {
              const distance = calculateDirectDistance(
                destLat, destLng, 
                listing.latitude, listing.longitude
              );
              
              return {
                id: listing.id,
                title: listing.title,
                price: listing.price,
                size_ping: listing.sizePing,
                address: listing.address,
                district: listing.district,
                city: listing.city,
                coordinates: [listing.longitude, listing.latitude] as [number, number],
                direct_distance: distance,
                commute_time: Math.round(distance * 2), // 估算通勤時間（每公里約需2分鐘）
              };
            })
            .filter(listing => listing.direct_distance <= (max_distance || 5))
            .sort((a, b) => a.direct_distance - b.direct_distance);
          
          logger.info(`找到 ${listingsWithDistance.length} 筆符合距離要求的物件`);
          
          res.status(StatusCodes.OK).json({
            total: listingsWithDistance.length,
            results: listingsWithDistance.slice(0, 50), // 最多返回50個結果
            note: '使用直線距離搜尋結果（通勤時間為估算值）'
          });
          return;
        } catch (error) {
          logger.error('直線距離搜尋失敗', { error });
          // 返回詳細錯誤訊息
          res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
            error: {
              message: '直線距離搜尋失敗',
              details: error instanceof Error ? error.message : '未知錯誤',
              status: StatusCodes.INTERNAL_SERVER_ERROR,
            },
          });
          return;
        }
      }
      
      // 如果沒有指定直線距離，使用通勤時間搜尋
      try {
        // 嘗試呼叫服務尋找符合通勤時間的租屋物件
        const listings = await findListingsByCommuteTime({
          destination: destString,
          maxCommuteTime: Number(max_commute_time || 30),
          transitMode: transit_mode?.toString() || 'driving',
          filter,
        });

        res.status(StatusCodes.OK).json({
          total: listings.length,
          results: listings
        });
      } catch (serviceError) {
        logger.error('通勤時間搜尋服務失敗', { error: serviceError });
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
          error: {
            message: '通勤時間搜尋服務出錯',
            details: serviceError instanceof Error ? serviceError.message : '未知錯誤',
            status: StatusCodes.INTERNAL_SERVER_ERROR,
          },
        });
      }
    } catch (error) {
      // 增強錯誤處理，輸出堆疊追蹤
      logger.error('通勤時間搜尋失敗', { 
        error: error instanceof Error ? {
          message: error.message,
          stack: error.stack,
          name: error.name,
        } : error, 
        body: req.body 
      });
      
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        error: {
          message: '通勤時間搜尋失敗',
          details: error instanceof Error ? error.message : '未知錯誤',
          status: StatusCodes.INTERNAL_SERVER_ERROR,
        },
      });
    }
  };

  // ... 保留等時線功能的原有代碼 ...
  public getIsochrone = async (req: Request, res: Response): Promise<void> => {
    // ... 原有代碼 ...
  };
} 