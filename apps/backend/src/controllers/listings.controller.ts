import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger';

const prisma = new PrismaClient();

export class ListingsController {
  /**
   * 獲取租屋物件列表
   */
  public getListings = async (req: Request, res: Response): Promise<void> => {
    try {
      const {
        city,
        district,
        min_price,
        max_price,
        min_size,
        limit = 20,
        offset = 0,
      } = req.query;

      // 構建查詢條件
      const where: any = {};

      if (city) where.city = city;
      if (district) where.district = district;
      if (min_price) where.price = { gte: Number(min_price) };
      if (max_price) {
        where.price = { 
          ...where.price,
          lte: Number(max_price) 
        };
      }
      if (min_size) where.sizePing = { gte: Number(min_size) };

      // 執行查詢
      const listings = await prisma.listing.findMany({
        where,
        orderBy: { price: 'asc' },
        skip: Number(offset),
        take: Number(limit),
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

      // 轉換為前端格式
      const formattedListings = listings.map((listing) => ({
        id: listing.id,
        title: listing.title,
        price: listing.price,
        size_ping: listing.sizePing,
        address: listing.address,
        district: listing.district,
        city: listing.city,
        coordinates: [listing.longitude, listing.latitude],
      }));

      res.status(StatusCodes.OK).json(formattedListings);
    } catch (error) {
      logger.error('獲取租屋物件列表失敗', { error });
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        error: {
          message: '獲取租屋物件列表失敗',
          status: StatusCodes.INTERNAL_SERVER_ERROR,
        },
      });
    }
  };

  /**
   * 獲取租屋物件詳情
   */
  public getListingById = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;

      const listing = await prisma.listing.findUnique({
        where: { id: Number(id) },
      });

      if (!listing) {
        res.status(StatusCodes.NOT_FOUND).json({
          error: {
            message: '找不到租屋物件',
            status: StatusCodes.NOT_FOUND,
          },
        });
        return;
      }

      // 轉換為前端格式
      const formattedListing = {
        id: listing.id,
        title: listing.title,
        source_id: listing.sourceId,
        price: listing.price,
        size_ping: listing.sizePing,
        house_type: listing.houseType,
        room_type: listing.roomType,
        address: listing.address,
        district: listing.district,
        city: listing.city,
        description: listing.description,
        image_urls: listing.imageUrls,
        facilities: listing.facilities,
        contact_name: listing.contactName,
        contact_phone: listing.contactPhone,
        floor: listing.floor,
        total_floor: listing.totalFloor,
        last_updated: listing.lastUpdated,
        created_at: listing.createdAt,
        coordinates: [listing.longitude, listing.latitude],
      };

      res.status(StatusCodes.OK).json(formattedListing);
    } catch (error) {
      logger.error('獲取租屋物件詳情失敗', { error, id: req.params.id });
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        error: {
          message: '獲取租屋物件詳情失敗',
          status: StatusCodes.INTERNAL_SERVER_ERROR,
        },
      });
    }
  };

  /**
   * 獲取城市列表
   */
  public getCities = async (_req: Request, res: Response): Promise<void> => {
    try {
      const cities = await prisma.listing.findMany({
        select: { city: true },
        distinct: ['city'],
      });

      res.status(StatusCodes.OK).json(cities.map((city) => city.city));
    } catch (error) {
      logger.error('獲取城市列表失敗', { error });
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        error: {
          message: '獲取城市列表失敗',
          status: StatusCodes.INTERNAL_SERVER_ERROR,
        },
      });
    }
  };

  /**
   * 獲取行政區列表
   */
  public getDistricts = async (req: Request, res: Response): Promise<void> => {
    try {
      const { city } = req.query;

      const where = city ? { city: city.toString() } : {};

      const districts = await prisma.listing.findMany({
        where,
        select: { district: true },
        distinct: ['district'],
      });

      res.status(StatusCodes.OK).json(districts.map((district) => district.district));
    } catch (error) {
      logger.error('獲取行政區列表失敗', { error });
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        error: {
          message: '獲取行政區列表失敗',
          status: StatusCodes.INTERNAL_SERVER_ERROR,
        },
      });
    }
  };
} 