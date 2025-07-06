import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import { logger } from '../utils/logger';
import { findListingsByDistance } from '../services/commuteService';
import { getIsochroneData } from '../services/mapService';
import { ApiErrorResponse } from '@rentrent/shared';
import { DistanceSearchResponse } from '../types';

export class CommuteController {
  /**
   * 根據直線距離搜尋租屋物件
   */
  public searchByDistance = async (req: Request, res: Response): Promise<void> => {
    try {
      const {
        work_location,
        destination,
        max_distance = 10,
        min_price,
        max_price,
        min_size,
        city,
        district,
      } = req.body;

      // 支持 work_location 或 destination 參數
      const dest = destination || work_location;

      if (!dest) {
        res.status(StatusCodes.BAD_REQUEST).json({
          error: {
            message: '缺少必要參數 work_location(或destination)',
            status: StatusCodes.BAD_REQUEST,
          },
        } as ApiErrorResponse);
        return;
      }

      logger.info('直線距離搜尋請求', { 
        destination: dest, 
        max_distance,
        filters: { min_price, max_price, min_size, city, district }
      });

      // 構建過濾條件
      const filter: any = {};
      if (min_price) filter.minPrice = Number(min_price);
      if (max_price) filter.maxPrice = Number(max_price);
      if (min_size) filter.minSize = Number(min_size);
      if (city) filter.city = city;
      if (district) filter.district = district;

      // 解析目的地座標
      let destCoords: [number, number];
      
      try {
        if (typeof dest === 'string') {
          const [lat, lng] = dest.split(',').map(Number);
          if (isNaN(lat) || isNaN(lng)) {
            throw new Error('無效的座標格式');
          }
          destCoords = [lat, lng];
        } else if (typeof dest === 'object') {
          if (dest.latitude !== undefined && dest.longitude !== undefined) {
            destCoords = [dest.latitude, dest.longitude];
          } else if (Array.isArray(dest) && dest.length === 2) {
            destCoords = [dest[1], dest[0]]; // 轉換為 [lat, lng]
          } else if (dest.lat !== undefined && dest.lng !== undefined) {
            destCoords = [dest.lat, dest.lng];
          } else {
            throw new Error('無效的座標物件格式');
          }
        } else {
          throw new Error('無效的目的地格式');
        }
      } catch (parseError) {
        logger.error('解析座標時發生錯誤', { error: parseError, dest });
        res.status(StatusCodes.BAD_REQUEST).json({
          error: {
            message: '解析座標時發生錯誤，請檢查格式',
            status: StatusCodes.BAD_REQUEST,
          },
        } as ApiErrorResponse);
        return;
      }

      // 使用 service 層進行搜尋
      const results = await findListingsByDistance({
        destination: destCoords,
        maxDistanceKm: max_distance,
        filter,
      });

      res.status(StatusCodes.OK).json({
        total: results.length,
        results,
        meta: {
          searchParams: {
            destination: destCoords,
            maxDistanceKm: max_distance,
            filters: filter
          }
        },
        note: '使用直線距離計算'
      } as DistanceSearchResponse);

    } catch (error) {
      logger.error('直線距離搜尋失敗', { error });
      
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        error: {
          message: '直線距離搜尋失敗',
          status: StatusCodes.INTERNAL_SERVER_ERROR,
        },
      } as ApiErrorResponse);
    }
  };

  /**
   * 獲取等時線資料
   */
  public getIsochrone = async (req: Request, res: Response): Promise<void> => {
    try {
      const { lat, lng, transit_mode = "driving", max_distance = 10 } = req.query;

      if (!lat || !lng) {
        res.status(StatusCodes.BAD_REQUEST).json({
          error: {
            message: '缺少必要參數 lat 和 lng',
            status: StatusCodes.BAD_REQUEST,
          },
        } as ApiErrorResponse);
        return;
      }

      const latitude = Number(lat);
      const longitude = Number(lng);
      
      if (isNaN(latitude) || isNaN(longitude)) {
        res.status(StatusCodes.BAD_REQUEST).json({
          error: {
            message: 'lat 和 lng 值必須是有效的數字',
            status: StatusCodes.BAD_REQUEST,
          },
        } as ApiErrorResponse);
        return;
      }

      const coordinates: [number, number] = [longitude, latitude];

      const isochroneData = await getIsochroneData({
        location: coordinates,
        mode: transit_mode as string,
        maxDistance: Number(max_distance),
      });

      res.status(StatusCodes.OK).json(isochroneData);
    } catch (error) {
      logger.error('獲取等時線資料失敗', { error });
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        error: {
          message: '獲取等時線資料失敗',
          status: StatusCodes.INTERNAL_SERVER_ERROR,
        },
      } as ApiErrorResponse);
    }
  };
}