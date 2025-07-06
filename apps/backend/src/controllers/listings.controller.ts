import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger';
import { ApiErrorResponse, ListingBasic, ListingDetail, SearchResponse } from '@rentrent/shared';

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
      const where: any = {
        isActive: true  // 只顯示 active 的租屋資料
      };

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

      // 查詢總數
      const total = await prisma.listing.count({ where });

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

      // 轉換為 shared ListingBasic 格式
      const formattedListings: ListingBasic[] = listings.map((listing) => ({
        id: listing.id,
        title: listing.title,
        price: listing.price,
        size_ping: listing.sizePing,
        address: listing.address,
        district: listing.district,
        city: listing.city,
        coordinates: [listing.longitude, listing.latitude],
      }));

      const response: SearchResponse = {
        total,
        results: formattedListings,
      };

      res.status(StatusCodes.OK).json(response);
    } catch (error) {
      logger.error('獲取租屋物件列表失敗', { error });
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        error: {
          message: '獲取租屋物件列表失敗',
          status: StatusCodes.INTERNAL_SERVER_ERROR,
        },
      } as ApiErrorResponse);
    }
  };

  /**
   * 獲取租屋物件詳情
   */
  public getListingById = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;

      const listing = await prisma.listing.findFirst({
        where: { 
          id: Number(id),
          isActive: true  // 只顯示 active 的租屋資料
        },
      });

      if (!listing) {
        res.status(StatusCodes.NOT_FOUND).json({
          error: {
            message: '找不到租屋物件',
            status: StatusCodes.NOT_FOUND,
          },
        } as ApiErrorResponse);
        return;
      }

      // 轉換為 shared ListingDetail 格式
      const formattedListing: ListingDetail = {
        id: listing.id,
        title: listing.title,
        source_id: listing.sourceId,
        url: listing.url || undefined,
        price: listing.price,
        size_ping: listing.sizePing,
        house_type: listing.houseType || undefined,
        room_type: listing.roomType || undefined,
        address: listing.address,
        district: listing.district,
        city: listing.city,
        description: listing.description || undefined,
        image_urls: listing.imageUrls,
        facilities: listing.facilities,
        contact_name: listing.contactName || undefined,
        contact_phone: listing.contactPhone || undefined,
        floor: listing.floor?.toString(),
        total_floor: listing.totalFloor?.toString(),
        last_updated: listing.lastUpdated?.toISOString(),
        created_at: listing.createdAt?.toISOString(),
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
      } as ApiErrorResponse);
    }
  };

  /**
   * 獲取城市列表
   */
  public getCities = async (_req: Request, res: Response): Promise<void> => {
    try {
      const cities = await prisma.listing.findMany({
        where: { isActive: true },
        select: { city: true },
        distinct: ['city'],
      });

      res.status(StatusCodes.OK).json(cities.map((city: { city: string }) => city.city));
    } catch (error) {
      logger.error('獲取城市列表失敗', { error });
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        error: {
          message: '獲取城市列表失敗',
          status: StatusCodes.INTERNAL_SERVER_ERROR,
        },
      } as ApiErrorResponse);
    }
  };

  /**
   * 獲取行政區列表
   */
  public getDistricts = async (req: Request, res: Response): Promise<void> => {
    try {
      const { city } = req.query;

      const where = city 
        ? { city: city.toString(), isActive: true } 
        : { isActive: true };

      const districts = await prisma.listing.findMany({
        where,
        select: { district: true },
        distinct: ['district'],
      });

      res.status(StatusCodes.OK).json(districts.map((district: { district: string }) => district.district));
    } catch (error) {
      logger.error('獲取行政區列表失敗', { error });
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        error: {
          message: '獲取行政區列表失敗',
          status: StatusCodes.INTERNAL_SERVER_ERROR,
        },
      } as ApiErrorResponse);
    }
  };
} 