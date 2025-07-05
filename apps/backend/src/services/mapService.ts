import axios from 'axios';
import { logger } from '../utils/logger';
import { redisClient } from '../config/redis';

const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY || '';
const CACHE_EXPIRY = 60 * 60 * 24 * 7; // 一週

if (!GOOGLE_MAPS_API_KEY) {
  logger.warn('GOOGLE_MAPS_API_KEY 環境變數未設置！');
}

function normalizeCoordinate(coordinate: number, precision: number = 2): number {
  return Math.round(coordinate * Math.pow(10, precision)) / Math.pow(10, precision);
}

function normalizeCoordinateString(coordString: string): string {
  // 處理批量座標 (用 | 分隔)
  if (coordString.includes('|')) {
    return coordString.split('|')
      .map(coord => {
        const [lat, lng] = coord.split(',').map(Number);
        if (isNaN(lat) || isNaN(lng)) return coord;
        return `${normalizeCoordinate(lat)},${normalizeCoordinate(lng)}`;
      })
      .join('|');
  }
  
  // 處理單一座標
  const [lat, lng] = coordString.split(',').map(Number);
  if (isNaN(lat) || isNaN(lng)) return coordString; // 如果不是座標格式，保持原樣
  
  return `${normalizeCoordinate(lat)},${normalizeCoordinate(lng)}`;
}

interface DistanceMatrixResponse {
  status: string;
  rows: {
    elements: {
      status: string;
      duration: {
        value: number;
        text: string;
      };
      distance?: {
        value: number;
        text: string;
      };
    }[];
  }[];
}

interface IsochroneParams {
  location: [number, number];
  minutes: number;
  mode: string;
  maxDistance?: number; // 新增最大距離參數（公里）
}

export async function getDistanceMatrix(
  origin: string,
  destination: string,
  mode = 'driving'
): Promise<DistanceMatrixResponse | null> {
  try {
    // 檢查是否為批量請求（包含 | 符號）
    const isBatchRequest = origin.includes('|');
    
    const normalizedOrigin = normalizeCoordinateString(origin);
    const normalizedDestination = normalizeCoordinateString(destination);

    // 檢查 API Key 是否存在
    if (!GOOGLE_MAPS_API_KEY || GOOGLE_MAPS_API_KEY === 'your_google_maps_api_key_here') {
      throw new Error('Google Maps API Key 未設定');
    }

    // 使用 Google Maps API
    const response = await axios.get(
      'https://maps.googleapis.com/maps/api/distancematrix/json',
      {
        params: {
          origins: origin,
          destinations: destination,
          mode,
          key: GOOGLE_MAPS_API_KEY,
        },
      }
    );
    if (response.data.status !== 'OK') {
      logger.error('Google Maps API 請求失敗', { status: response.data.status });
      return null;
    }

    logger.debug('Google Maps API 請求成功', { 
      origins: isBatchRequest ? `${origin.split('|').length} 個地點` : origin,
      destinations: destination 
    });

    return response.data;
  } catch (error) {
    logger.error('獲取距離矩陣失敗', { error });
    return null;
  }
}

/**
 * 獲取等時線資料
 * @param params 等時線參數
 */
export async function getIsochroneData(params: IsochroneParams): Promise<any> {
  const { location, minutes, mode, maxDistance = 10 } = params;
  
  const normalizedLng = normalizeCoordinate(location[0]);
  const normalizedLat = normalizeCoordinate(location[1]);
  
  const cacheKey = `isochrone:${normalizedLng},${normalizedLat}:${minutes}:${mode}:${maxDistance}`;
  
  try {
    // 檢查緩存
    const cachedData = await redisClient.get(cacheKey);
    if (cachedData) {
      logger.debug('使用緩存的等時線資料');
      return JSON.parse(cachedData);
    }

    // 生成圓形等時線
    const isochroneData = generateCircleIsochrone([normalizedLng, normalizedLat], minutes, maxDistance);
    await redisClient.setex(cacheKey, CACHE_EXPIRY, JSON.stringify(isochroneData));
    return isochroneData;
  } catch (error) {
    logger.error('獲取等時線數據失敗', { error });
    return generateCircleIsochrone([normalizedLng, normalizedLat], minutes, maxDistance);
  }
}

function generateCircleIsochrone(center: [number, number], minutes: number, maxDistance: number = 10): any {
  const radiusKm = Math.min(Math.max(maxDistance, 0.5), 10);
  
  return {
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        properties: {
          center: center,
          radius: radiusKm,
          minutes: minutes,
          maxDistance: maxDistance,
          travelMode: 'driving',
        },
        geometry: generateCircleGeoJSON(center, radiusKm),
      },
    ],
  };
}

function generateCircleGeoJSON(center: [number, number], radiusKm: number): any {
  const points = 64;
  const coords = [];
  const [lng, lat] = center;

  const latKm = 111;
  const lngKm = 111 * Math.cos((lat * Math.PI) / 180);

  for (let i = 0; i < points; i++) {
    const angle = (i * 360) / points;
    const angleRad = (angle * Math.PI) / 180;
    const latOffset = (radiusKm / latKm) * Math.sin(angleRad);
    const lngOffset = (radiusKm / lngKm) * Math.cos(angleRad);
    coords.push([lng + lngOffset, lat + latOffset]);
  }
  
  coords.push(coords[0]);

  return {
    type: 'Polygon',
    coordinates: [coords],
  };
} 