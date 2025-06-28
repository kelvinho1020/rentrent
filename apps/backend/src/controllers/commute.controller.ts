import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger';
import { getIsochroneData } from '../services/mapService';
import { calculateDirectDistance, findListingsByCommuteTime } from '../services/commuteService';
import { getDistanceMatrix } from '../services/mapService';

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

      // 🚀 優先使用 Google Maps API 通勤時間搜尋
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
          results: listings,
          note: '使用 Google Maps API 計算真實通勤時間'
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

  /**
   * 獲取等時線資料
   */
  public getIsochrone = async (req: Request, res: Response): Promise<void> => {
    try {
      const { minutes } = req.params;
      const { location, lat, lng, transit_mode = "driving", max_distance = 5 } = req.query;

      let coordinates: [number, number];

      // 處理不同的參數格式
      if (location) {
        try {
          // 解析坐標，預期格式為 "lng,lat" 或 "lat,lng"
          const parts = location.toString().split(",").map(Number);
          
          // 檢查是否為有效數字
          if (parts.length !== 2 || parts.some(isNaN)) {
            throw new Error('Invalid coordinates format');
          }
          
          // 嘗試判斷格式：如果第一個數字在台灣經度範圍內（約118-122），
          // 則假設為 "lng,lat"，否則假設為 "lat,lng"
          if (parts[0] >= 118 && parts[0] <= 122) {
            coordinates = [parts[0], parts[1]]; // "lng,lat"
          } else {
            coordinates = [parts[1], parts[0]]; // "lat,lng"
          }
        } catch (error) {
          res.status(StatusCodes.BAD_REQUEST).json({
            error: {
              message: '坐標格式無效，請使用 "經度,緯度" 或 "緯度,經度" 格式',
              status: StatusCodes.BAD_REQUEST,
            },
          });
          return;
        }
      } else if (lat && lng) {
        // 使用單獨提供的 lat 和 lng 參數
        const latitude = Number(lat);
        const longitude = Number(lng);
        
        if (isNaN(latitude) || isNaN(longitude)) {
          res.status(StatusCodes.BAD_REQUEST).json({
            error: {
              message: 'lat 和 lng 值必須是有效的數字',
              status: StatusCodes.BAD_REQUEST,
            },
          });
          return;
        }
        
        coordinates = [longitude, latitude];
      } else {
        res.status(StatusCodes.BAD_REQUEST).json({
          error: {
            message: '缺少必要參數 location 或 (lat 和 lng)',
            status: StatusCodes.BAD_REQUEST,
          },
        });
        return;
      }

      const isochroneData = await getIsochroneData({
        location: coordinates,
        minutes: Number(minutes),
        mode: transit_mode as string,
        maxDistance: Number(max_distance),
      });

      res.status(StatusCodes.OK).json(isochroneData);
    } catch (error) {
      logger.error('獲取等時線資料失敗', { 
        error: error instanceof Error ? {
          message: error.message,
          stack: error.stack,
          name: error.name,
        } : error, 
        minutes: req.params.minutes, 
        location: req.query.location,
        lat: req.query.lat,
        lng: req.query.lng,
        max_distance: req.query.max_distance
      });
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        error: {
          message: '獲取等時線資料失敗',
          details: error instanceof Error ? error.message : '未知錯誤',
          status: StatusCodes.INTERNAL_SERVER_ERROR,
        },
      });
    }
  };

  /**
   * 批次計算多個地點到單一目的地的通勤時間
   * 專為混合模式設計：假房屋資料 + 真實 Google Maps API
   */
  public async batchDistanceMatrix(req: Request, res: Response) {
    try {
      const { origins, destination, transit_mode = "driving", max_commute_time = 60 } = req.body;

      if (!origins || !destination) {
        return res.status(400).json({
          success: false,
          message: "缺少必要參數：origins, destination"
        });
      }

      logger.debug('接收到批次距離計算請求', {
        originsCount: origins.split('|').length,
        destination,
        transit_mode,
        max_commute_time
      });

      // 調用 Google Maps Distance Matrix API
      const distanceResponse = await getDistanceMatrix(
        origins,
        destination,
        transit_mode
      );

      if (!distanceResponse || !distanceResponse.rows) {
        return res.status(500).json({
          success: false,
          message: "無法獲取距離矩陣數據"
        });
      }

      // 處理響應，提取通勤時間
      const commuteResults = distanceResponse.rows.map((row, index) => {
        const element = row.elements[0];
        
        if (element.status === 'OK' && element.duration) {
          const commuteTimeMinutes = Math.ceil(element.duration.value / 60);
          const commuteDistanceKm = element.distance ? 
            Math.ceil(element.distance.value / 1000) : null;
          
          return {
            index,
            commute_time: commuteTimeMinutes,
            commute_distance: commuteDistanceKm,
            status: 'success'
          };
        } else {
          logger.warn(`第 ${index + 1} 個地點無法計算通勤時間`, { 
            status: element.status 
          });
          
          return {
            index,
            commute_time: null,
            commute_distance: null,
            status: 'failed'
          };
        }
      });

      // 統計結果
      const successCount = commuteResults.filter(r => r.status === 'success').length;
      const validResults = commuteResults.filter(r => 
        r.status === 'success' && r.commute_time && r.commute_time <= max_commute_time
      );

      logger.info('批次距離計算完成', {
        總地點數: commuteResults.length,
        成功計算: successCount,
        符合通勤時間: validResults.length,
        最大通勤時間: max_commute_time
      });

      res.json({
        success: true,
        commute_times: commuteResults,
        summary: {
          total_locations: commuteResults.length,
          successful_calculations: successCount,
          within_commute_limit: validResults.length
        }
      });

    } catch (error) {
      logger.error('批次距離計算失敗', { error });
      res.status(500).json({
        success: false,
        message: "批次距離計算失敗",
        error: error instanceof Error ? error.message : "未知錯誤"
      });
    }
  }
}