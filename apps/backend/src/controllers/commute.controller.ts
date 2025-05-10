import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger';
import { getIsochroneData } from '../services/mapService';
import { findListingsByCommuteTime } from '../services/commuteService';

const prisma = new PrismaClient();

export class CommuteController {
  /**
   * 根據通勤時間搜尋租屋物件
   */
  public searchByCommuteTime = async (req: Request, res: Response): Promise<void> => {
    try {
      const {
        work_location,
        destination,
        max_commute_time,
        transit_mode = "driving",
        min_price,
        max_price,
        min_size,
        city,
      } = req.body;

      // 支持 work_location 或 destination 參數
      const dest = destination || work_location;

      if (!dest || !max_commute_time) {
        res.status(StatusCodes.BAD_REQUEST).json({
          error: {
            message: '缺少必要參數 work_location(或destination) 或 max_commute_time',
            status: StatusCodes.BAD_REQUEST,
          },
        });
        return;
      }

      // 構建過濾條件
      const filter: any = {};
      if (min_price) filter.minPrice = Number(min_price);
      if (max_price) filter.maxPrice = Number(max_price);
      if (min_size) filter.minSize = Number(min_size);
      if (city) filter.city = city;

      // 將座標格式轉換為字符串，例如 "lat,lng"
      let destString = dest;
      if (typeof dest === 'object' && dest.latitude !== undefined && dest.longitude !== undefined) {
        destString = `${dest.latitude},${dest.longitude}`;
      }

      // 呼叫服務尋找符合通勤時間的租屋物件
      const listings = await findListingsByCommuteTime({
        destination: destString,
        maxCommuteTime: Number(max_commute_time),
        transitMode: transit_mode.toString(),
        filter,
      });

      res.status(StatusCodes.OK).json({
        total: listings.length,
        results: listings
      });
    } catch (error) {
      logger.error('通勤時間搜尋失敗', { error, body: req.body });
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        error: {
          message: '通勤時間搜尋失敗',
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
      const { location, lat, lng, transit_mode = "driving" } = req.query;

      let coordinates: [number, number];

      // 處理不同的參數格式
      if (location) {
        try {
          // 解析坐標，預期格式為 "lng,lat"
          const [locLng, locLat] = location.toString().split(",").map(Number);
          coordinates = [locLng, locLat];

          if (isNaN(locLng) || isNaN(locLat)) {
            throw new Error('Invalid coordinates format');
          }
        } catch (error) {
          res.status(StatusCodes.BAD_REQUEST).json({
            error: {
              message: '坐標格式無效，請使用 "經度,緯度" 格式',
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
      });

      res.status(StatusCodes.OK).json(isochroneData);
    } catch (error) {
      logger.error('獲取等時線資料失敗', { 
        error, 
        minutes: req.params.minutes, 
        location: req.query.location,
        lat: req.query.lat,
        lng: req.query.lng
      });
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        error: {
          message: '獲取等時線資料失敗',
          status: StatusCodes.INTERNAL_SERVER_ERROR,
        },
      });
    }
  };
}