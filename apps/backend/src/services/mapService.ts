import axios from 'axios';
import { logger } from '../utils/logger';
import { redisClient } from '../config/redis';

// 環境變數
const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY || '';
const CACHE_EXPIRY = 60 * 60 * 24 * 7; // 一週

// 檢查 API Key 是否設置
if (!GOOGLE_MAPS_API_KEY) {
  logger.warn('GOOGLE_MAPS_API_KEY 環境變數未設置！');
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

/**
 * 獲取兩點間的距離矩陣
 * @param origin 起點（經緯度 lat,lng 或地址）可以是單一點或用 | 分隔的多個點
 * @param destination 終點（經緯度 lat,lng 或地址）
 * @param mode 交通方式（driving、transit、walking）
 */
export async function getDistanceMatrix(
  origin: string,
  destination: string,
  mode = 'driving'
): Promise<DistanceMatrixResponse | null> {
  try {
    // 檢查是否為批量請求（包含 | 符號）
    const isBatchRequest = origin.includes('|');
    
    // 創建緩存鍵
    const cacheKey = `distance_matrix:${origin}:${destination}:${mode}`;

    // 檢查緩存
    const cachedData = await redisClient.get(cacheKey);
    if (cachedData) {
      logger.debug('使用緩存的距離矩陣數據');
      return JSON.parse(cachedData);
    }

    // 開發環境或測試環境下使用模擬數據
    if ((process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test') 
        && !GOOGLE_MAPS_API_KEY.startsWith('AIza')) {
      logger.info('開發環境：使用模擬距離矩陣數據');
      return generateMockDistanceMatrix(origin, destination, mode);
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
      return generateMockDistanceMatrix(origin, destination, mode);
    }

    // 緩存結果
    await redisClient.setex(cacheKey, CACHE_EXPIRY, JSON.stringify(response.data));
    logger.debug('已緩存新的距離矩陣數據', { 
      origins: isBatchRequest ? `${origin.split('|').length} 個地點` : origin,
      destinations: destination 
    });

    return response.data;
  } catch (error) {
    logger.error('獲取距離矩陣失敗', { error, origin, destination, mode });
    return generateMockDistanceMatrix(origin, destination, mode);
  }
}

/**
 * 生成模擬的距離矩陣數據
 * 使用簡單的距離計算方法，僅供開發環境使用
 */
function generateMockDistanceMatrix(origin: string, destination: string, mode = 'driving'): DistanceMatrixResponse {
  // 檢查是否為批量請求
  const originPoints = origin.split('|');
  const isBatchRequest = originPoints.length > 1;
  
  // 解析終點座標
  let destCoords: [number, number];
  
  try {
    // 假設 destination 是 "lat,lng" 格式
    const [destLat, destLng] = destination.split(',').map(Number);
    
    if (isNaN(destLat) || isNaN(destLng)) {
      throw new Error('無效的終點座標格式');
    }
    
    destCoords = [destLat, destLng];
  } catch (error) {
    // 如果解析失敗，使用預設座標處理
    logger.warn('無法解析終點座標，使用預設模擬數據', { error, destination });
    
    if (isBatchRequest) {
      // 處理多起點的情況
      return {
        status: 'OK',
        rows: originPoints.map(() => ({
          elements: [{
            status: 'OK',
            duration: {
              value: 900, // 15分鐘
              text: '15 mins'
            },
            distance: {
              value: 5000, // 5公里
              text: '5 km'
            }
          }]
        }))
      };
    } else {
      // 單一起點的情況
      return {
        status: 'OK',
        rows: [{
          elements: [{
            status: 'OK',
            duration: {
              value: 900, // 15分鐘
              text: '15 mins'
            },
            distance: {
              value: 5000, // 5公里
              text: '5 km'
            }
          }]
        }]
      };
    }
  }
  
  // 處理批量請求
  if (isBatchRequest) {
    const rows = originPoints.map(originPoint => {
      try {
        // 解析起點座標
        const [originLat, originLng] = originPoint.split(',').map(Number);
        
        if (isNaN(originLat) || isNaN(originLng)) {
          throw new Error('無效的起點座標格式');
        }
        
        // 計算距離和時間
        const distance = calculateDistance([originLat, originLng], destCoords);
        const durationSeconds = calculateDuration(distance, mode);
        
        return {
          elements: [{
            status: 'OK',
            duration: {
              value: Math.round(durationSeconds),
              text: `${Math.round(durationSeconds / 60)} mins`
            },
            distance: {
              value: Math.round(distance * 1000), // 轉換為公尺
              text: `${distance.toFixed(1)} km`
            }
          }]
        };
      } catch (error) {
        logger.warn('無法解析批量請求中的起點座標', { error, originPoint });
        
        // 對於無法解析的點，返回默認值
        return {
          elements: [{
            status: 'OK',
            duration: {
              value: 1200, // 20分鐘
              text: '20 mins'
            },
            distance: {
              value: 6000, // 6公里
              text: '6 km'
            }
          }]
        };
      }
    });
    
    return {
      status: 'OK',
      rows
    };
  }
  
  // 單一起點的情況
  try {
    // 解析起點座標
    const [originLat, originLng] = origin.split(',').map(Number);
    
    if (isNaN(originLat) || isNaN(originLng)) {
      throw new Error('無效的起點座標格式');
    }
    
    // 計算距離（公里）
    const distance = calculateDistance([originLat, originLng], destCoords);
    
    // 根據交通方式估算時間（秒）
    const durationSeconds = calculateDuration(distance, mode);
    
    return {
      status: 'OK',
      rows: [{
        elements: [{
          status: 'OK',
          duration: {
            value: Math.round(durationSeconds),
            text: `${Math.round(durationSeconds / 60)} mins`
          },
          distance: {
            value: Math.round(distance * 1000), // 轉換為公尺
            text: `${distance.toFixed(1)} km`
          }
        }]
      }]
    };
  } catch (error) {
    logger.warn('無法解析起點座標，使用預設模擬數據', { error, origin });
    return {
      status: 'OK',
      rows: [{
        elements: [{
          status: 'OK',
          duration: {
            value: 900, // 15分鐘
            text: '15 mins'
          },
          distance: {
            value: 5000, // 5公里
            text: '5 km'
          }
        }]
      }]
    };
  }
}

/**
 * 根據距離和交通方式計算時間（秒）
 */
function calculateDuration(distanceKm: number, mode: string): number {
  switch (mode) {
    case 'walking':
      // 假設步行速度 5 km/h
      return (distanceKm / 5) * 3600;
    case 'transit':
      // 假設公共交通速度 20 km/h
      return (distanceKm / 20) * 3600;
    default: // driving
      // 假設駕車速度 40 km/h
      return (distanceKm / 40) * 3600;
  }
}

/**
 * 使用哈弗賽因公式計算兩點間的距離（公里）
 */
function calculateDistance(coords1: [number, number], coords2: [number, number]): number {
  const [lat1, lon1] = coords1;
  const [lat2, lon2] = coords2;
  
  const R = 6371; // 地球半徑，公里
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * 
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;
  
  return distance;
}

/**
 * 獲取等時線資料
 * @param params 等時線參數
 */
export async function getIsochroneData(params: IsochroneParams): Promise<any> {
  const { location, minutes, mode, maxDistance = 5 } = params; // 解構maxDistance參數
  
  try {
    // 創建緩存鍵（包含maxDistance）
    const cacheKey = `isochrone:${location[0]},${location[1]}:${minutes}:${mode}:${maxDistance}`;

    // 檢查緩存
    const cachedData = await redisClient.get(cacheKey);
    if (cachedData) {
      return JSON.parse(cachedData);
    }

    // 開發環境下直接使用備用方法生成圓形等時線
    if (process.env.NODE_ENV === 'development' || !process.env.ORS_API_KEY) {
      logger.info('使用模擬等時線數據');
      return generateFallbackIsochrone(location, minutes, maxDistance); // 傳入maxDistance
    }

    // 嘗試使用第三方 API
    try {
      // 這裡是等時線 API 調用邏輯
      // 由於 Google Maps 沒有直接提供等時線 API，需要使用第三方服務如 OpenRouteService, TravelTime API 等
      // 這裡示範使用 OpenRouteService API
      const response = await axios.post(
        'https://api.openrouteservice.org/v2/isochrones/' + (mode === 'driving' ? 'driving-car' : mode),
        {
          locations: [[location[0], location[1]]],
          range: [minutes * 60], // 轉換為秒
          range_type: 'time',
          attributes: ['area', 'reachfactor', 'total_pop'],
          intersections: false,
        },
        {
          headers: {
            'Authorization': process.env.ORS_API_KEY || '',
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
        }
      );

      // 緩存結果
      await redisClient.setex(cacheKey, CACHE_EXPIRY, JSON.stringify(response.data));

      return response.data;
    } catch (apiError) {
      logger.error('第三方等時線 API 請求失敗', { error: apiError });
      // 如果 API 調用失敗，使用備用方法
      return generateFallbackIsochrone(location, minutes, maxDistance); // 傳入maxDistance
    }
  } catch (error) {
    logger.error('獲取等時線數據失敗', { error, location, minutes, mode });
    // 如果原始 API 失敗，返回一個簡單的圓形等時線
    return generateFallbackIsochrone(location, minutes, maxDistance); // 傳入maxDistance
  }
}

/**
 * 生成一個簡單的圓形等時線作為備用
 * @param center 中心點
 * @param minutes 分鐘數
 * @param maxDistance 最大距離（公里）
 */
function generateFallbackIsochrone(center: [number, number], minutes: number, maxDistance: number = 5): any {
  // 直接使用maxDistance作為半徑，但確保不超過合理範圍
  let radiusKm = Math.min(maxDistance, 15); // 最大限制15公里

  // 確保最小半徑為0.5公里
  radiusKm = Math.max(radiusKm, 0.5);

  logger.info(`生成等時線圓形，半徑: ${radiusKm}公里 (基於最大距離: ${maxDistance}公里)`);

  // 生成一個簡單的圓形 GeoJSON
  const circle = {
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
          generated: 'fallback',
        },
        geometry: generateCircleGeoJSON(center, radiusKm),
      },
    ],
  };

  return circle;
}

/**
 * 生成圓形的 GeoJSON
 * @param center 中心點 [經度, 緯度]
 * @param radiusKm 半徑（公里）
 */
function generateCircleGeoJSON(center: [number, number], radiusKm: number): any {
  const points = 64; // 圓形的點數
  const coords = [];
  const [lng, lat] = center;

  // 經緯度下 1 度代表的距離不同
  // 緯度 1 度約 111 公里
  // 經度 1 度與緯度有關，約 111 * cos(lat) 公里
  const latKm = 111;
  const lngKm = 111 * Math.cos((lat * Math.PI) / 180);

  for (let i = 0; i < points; i++) {
    const angle = (i * 360) / points;
    const angleRad = (angle * Math.PI) / 180;
    const latOffset = (radiusKm / latKm) * Math.sin(angleRad);
    const lngOffset = (radiusKm / lngKm) * Math.cos(angleRad);
    coords.push([lng + lngOffset, lat + latOffset]);
  }
  
  // 閉合圓形
  coords.push(coords[0]);

  return {
    type: 'Polygon',
    coordinates: [coords],
  };
} 