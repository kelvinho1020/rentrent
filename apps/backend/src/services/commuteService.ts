import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger';

const prisma = new PrismaClient();

interface CommuteFilter {
  minPrice?: number;
  maxPrice?: number;
  minSize?: number;
  city?: string;
  district?: string;
}

interface ListingWithDistance {
  id: number;
  title: string;
  price: number;
  size_ping: number;
  address: string;
  district: string;
  city: string;
  coordinates: [number, number];
  distance: number;
}

/**
 * 根據直線距離搜尋租屋物件
 */
export async function findListingsByDistance(params: {
  destination: [number, number];
  maxDistanceKm: number;
  filter: CommuteFilter;
}): Promise<ListingWithDistance[]> {
  const { destination, maxDistanceKm, filter } = params;
  const [destLat, destLng] = destination;

  logger.info('開始直線距離搜尋', { destination, maxDistanceKm, filter });

  // 構建查詢條件
  const where: any = { isActive: true };
  if (filter.minPrice) where.price = { gte: filter.minPrice };
  if (filter.maxPrice) where.price = { ...(where.price || {}), lte: filter.maxPrice };
  if (filter.minSize) where.sizePing = { gte: filter.minSize };
  if (filter.city) where.city = filter.city;
  if (filter.district) where.district = filter.district;

  // 查詢所有房屋
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
  });

  // 計算直線距離並篩選
  const results: ListingWithDistance[] = [];
  for (const listing of allListings) {
    if (listing.latitude && listing.longitude) {
      const distance = calculateDirectDistance(
        destLat, destLng,
        listing.latitude, listing.longitude
      );

      if (distance <= maxDistanceKm) {
        results.push({
          id: listing.id,
          title: listing.title,
          price: listing.price,
          size_ping: listing.sizePing,
          address: listing.address,
          district: listing.district,
          city: listing.city,
          coordinates: [listing.longitude, listing.latitude],
          distance: Math.round(distance * 10) / 10,
        });
      }
    }
  }

  // 按距離排序
  results.sort((a, b) => a.distance - b.distance);

  logger.info(`直線距離搜尋完成: ${results.length} 筆結果`);
  return results;
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
  return R * c;
}

/**
 * 將角度轉換為弧度
 */
function toRad(degrees: number): number {
  return (degrees * Math.PI) / 180;
} 