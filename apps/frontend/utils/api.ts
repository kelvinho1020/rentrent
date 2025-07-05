import axios from "axios";
import { CommuteSearchRequest, ListingBasic, ListingDetail, SearchResponse } from "@/types";
import mockListingsRaw from "@/data/mockListings.json";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";
console.log("====>", API_URL);

const USE_MOCK_DATA = false;
// 新增：混合模式 - 假房屋資料 + 真實 Google Maps API
const USE_REAL_COMMUTE_API = process.env.NEXT_PUBLIC_USE_REAL_COMMUTE_API === "true";

const mockListings: ListingBasic[] = mockListingsRaw.map(listing => ({
  ...listing,
  coordinates: listing.coordinates as [number, number]
}));

const api = axios.create({
  baseURL: API_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

export const searchByCommuteTime = async (params: CommuteSearchRequest): Promise<SearchResponse> => {
  if (USE_MOCK_DATA) {
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const {
      work_location,
      max_commute_time,
      min_price,
      max_price,
      min_size,
      city,
      district,
      max_distance = 10, // 預設10公里
      transit_mode = "driving"
    } = params;

    console.log(`🎭 假資料搜尋參數:`, {
      通勤時間上限: max_commute_time,
      交通方式: transit_mode,
      最大距離: max_distance,
      價格範圍: `${min_price || '不限'} - ${max_price || '不限'}`,
      坪數下限: min_size || '不限',
      城市: city || '不限',
      行政區: district || '不限',
      使用真實API: USE_REAL_COMMUTE_API ? '是' : '否'
    });

    // 混合模式：假資料 + 真實 Google Maps API
    if (USE_REAL_COMMUTE_API) {
      return await searchWithRealCommuteAPI(params, mockListings);
    }

    // 純假資料模式：使用直線距離計算
    return await searchWithMockCommute(params, mockListings);
  }

  // 🚀 使用新的智能快取API (替換舊的 /commute/search)
  console.log("🌐 使用智能快取 API 調用");
  console.log("📍 搜尋參數:", {
    目的地: `${params.work_location.latitude}, ${params.work_location.longitude}`,
    最大通勤時間: params.max_commute_time,
    交通方式: params.transit_mode || 'transit',
    最大距離: params.max_distance || 15,
    價格範圍: `${params.min_price || '不限'} - ${params.max_price || '不限'}`,
    坪數下限: params.min_size || '不限',
    城市: params.city || '不限',
    行政區: params.district || '不限'
  });

  try {
    // 調用新的智能快取API
    const response = await api.post("/smart-commute/search", {
      lat: params.work_location.latitude,
      lng: params.work_location.longitude,
      mode: params.transit_mode || 'transit',
      maxTime: params.max_commute_time,
      radius: params.max_distance || 15,
    });

    // 處理新API的回應格式
    if (response.data && response.data.success && response.data.data) {
      const { listings, cache_stats, meta } = response.data.data;
      
      // 在前端 console 顯示快取狀態
      console.log("🔍 智能快取搜尋結果:", {
        總數: listings.length,
        快取命中: cache_stats.cached_count,
        重新計算: cache_stats.calculated_count,
        快取命中率: cache_stats.cache_hit_rate,
        處理時間: meta.processingTime,
      });

      // 過濾基本條件 (價格、坪數、地區等)
      let filteredListings = listings.filter((listing: any) => {
        const conditions = {
          最低價格: !params.min_price || listing.price >= params.min_price,
          最高價格: !params.max_price || listing.price <= params.max_price,
          最小坪數: !params.min_size || listing.size_ping >= params.min_size,
          城市匹配: !params.city || listing.city === params.city,
          行政區匹配: !params.district || listing.district === params.district,
        };
        return Object.values(conditions).every(Boolean);
      });

      console.log(`📊 基本條件篩選: ${filteredListings.length}/${listings.length} 筆符合`);

      return {
        total: filteredListings.length,
        results: filteredListings,
        cache_stats: cache_stats, // 傳遞快取統計給前端
        note: `智能快取系統 (${params.transit_mode || 'transit'}模式) - 處理時間: ${meta.processingTime}`
      };
    }

    // API回應格式異常
    throw new Error('API回應格式異常');

  } catch (error) {
    console.error("❌ 智能快取API調用失敗:", error);
    
    // 💡 回退到舊API系統
    console.log("🔄 回退到舊API系統...");
    try {
      const fallbackResponse = await api.post("/commute/search", params);
      console.log("✅ 舊API系統調用成功");
      return {
        ...fallbackResponse.data,
        note: `回退到舊系統 (${params.transit_mode || 'driving'}模式) - 智能快取系統暫時不可用`
      };
    } catch (fallbackError) {
      console.error("❌ 舊API系統也失敗:", fallbackError);
      throw new Error('所有通勤搜尋系統都不可用，請稍後再試');
    }
  }
};

/**
 * 混合模式：假房屋資料 + 真實 Google Maps API
 */
async function searchWithRealCommuteAPI(params: CommuteSearchRequest, listings: ListingBasic[]): Promise<SearchResponse> {
  const {
    work_location,
    max_commute_time,
    min_price,
    max_price,
    min_size,
    city,
    district,
    max_distance = 10,
    transit_mode = "driving"
  } = params;

  console.log(`🌐 混合模式：假房屋資料 + 真實 Google Maps API`);

  // 先根據基本條件篩選房屋
  let filteredByBasics = listings.filter((listing: ListingBasic) => {
    const conditions = {
      最低價格: !min_price || listing.price >= min_price,
      最高價格: !max_price || listing.price <= max_price,
      最小坪數: !min_size || listing.size_ping >= min_size,
      城市匹配: !city || listing.city === city,
      行政區匹配: !district || listing.district === district
    };

    return Object.values(conditions).every(Boolean);
  });

  console.log(`📊 基本條件篩選：${filteredByBasics.length} / ${listings.length} 筆符合`);

  if (filteredByBasics.length === 0) {
    return {
      total: 0,
      results: [],
      note: "無符合基本條件的房屋"
    };
  }

  // 批次處理：每次最多 25 個房屋（Google Maps API 限制）
  const batchSize = 25;
  const finalResults: ListingBasic[] = [];

  for (let i = 0; i < filteredByBasics.length; i += batchSize) {
    const batch = filteredByBasics.slice(i, i + batchSize);
    console.log(`🔄 處理第 ${Math.floor(i/batchSize) + 1} 批，包含 ${batch.length} 個房屋`);

    try {
      // 構建批次請求：多個起點到一個終點
      const origins = batch.map(listing => 
        `${listing.coordinates[1]},${listing.coordinates[0]}` // 緯度,經度
      ).join('|');
      
      const destination = `${work_location.latitude},${work_location.longitude}`;

      // 調用後端 API
      const response = await api.post('/commute/batch-distance', {
        origins,
        destination,
        transit_mode,
        max_commute_time
      });

      if (response.data && response.data.commute_times) {
        // 處理批次響應結果
        response.data.commute_times.forEach((commuteInfo: any, index: number) => {
          if (commuteInfo && commuteInfo.commute_time <= max_commute_time) {
            const listing = { ...batch[index] };
            listing.commute_time = commuteInfo.commute_time;
            finalResults.push(listing);
            
            console.log(`✅ ${listing.title} - 通勤時間: ${commuteInfo.commute_time}分鐘`);
          }
        });
      }
    } catch (error) {
      console.warn(`⚠️ 批次 ${Math.floor(i/batchSize) + 1} API 調用失敗，使用直線距離估算`, error);
      
      // API 失敗時，回退到直線距離計算
      const backupResults = batch.filter(listing => {
        const distance = calculateDistance(
          work_location.latitude,
          work_location.longitude,
          listing.coordinates[1],
          listing.coordinates[0]
        );
        
        const speedFactor = getSpeedFactor(transit_mode);
        const estimatedCommuteTime = Math.round(distance * speedFactor);
        
        if (estimatedCommuteTime <= max_commute_time && distance <= max_distance) {
          listing.commute_time = estimatedCommuteTime;
          return true;
        }
        return false;
      });
      
      finalResults.push(...backupResults);
    }

    // 避免過於頻繁的 API 調用
    if (i + batchSize < filteredByBasics.length) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  // 按通勤時間排序
  finalResults.sort((a, b) => (a.commute_time || 0) - (b.commute_time || 0));

  console.log(`🎯 混合模式搜尋結果: 找到 ${finalResults.length} 筆符合條件的物件`);

  return {
    total: finalResults.length,
    results: finalResults,
    note: `混合模式：假房屋資料 + 真實Google Maps API (${transit_mode})`
  };
}

/**
 * 純假資料模式：使用直線距離計算
 */
async function searchWithMockCommute(params: CommuteSearchRequest, listings: ListingBasic[]): Promise<SearchResponse> {
  const {
    work_location,
    max_commute_time,
    min_price,
    max_price,
    min_size,
    city,
    district,
    max_distance = 10,
    transit_mode = "driving"
  } = params;

  // 計算每個物件到工作地點的直線距離
  const calculateDistance = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
    const R = 6371; // 地球半徑，公里
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLng = (lng2 - lng1) * (Math.PI / 180);
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * 
      Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  // 根據交通方式計算通勤時間的速度係數
  const getSpeedFactor = (mode: string): number => {
    switch (mode) {
      case "driving": return 2.0; // 開車：每公里約2分鐘
      case "transit": return 3.0; // 大眾運輸：每公里約3分鐘
      case "walking": return 12.0; // 步行：每公里約12分鐘
      default: return 2.5; // 預設值
    }
  };

  const speedFactor = getSpeedFactor(transit_mode);

  // 篩選假資料
  let filteredListings = listings.filter((listing: ListingBasic) => {
    // 計算距離
    const distance = calculateDistance(
      work_location.latitude,
      work_location.longitude,
      listing.coordinates[1], // 緯度
      listing.coordinates[0]  // 經度
    );

    // 根據交通方式重新計算通勤時間
    const estimatedCommuteTime = Math.round(distance * speedFactor);
    listing.commute_time = estimatedCommuteTime;

    // 篩選條件
    const conditions = {
      通勤時間: estimatedCommuteTime <= max_commute_time,
      距離範圍: distance <= max_distance,
      最低價格: !min_price || listing.price >= min_price,
      最高價格: !max_price || listing.price <= max_price,
      最小坪數: !min_size || listing.size_ping >= min_size,
      城市匹配: !city || listing.city === city,
      行政區匹配: !district || listing.district === district
    };

    const isMatching = Object.values(conditions).every(Boolean);
    
    if (isMatching) {
      console.log(`✅ ${listing.title} - 距離:${distance.toFixed(1)}km, 通勤:${estimatedCommuteTime}分鐘`);
    }

    return isMatching;
  });

  // 按通勤時間排序
  filteredListings.sort((a, b) => (a.commute_time || 0) - (b.commute_time || 0));

  console.log(`🎭 純假資料搜尋結果: 找到 ${filteredListings.length} 筆符合條件的物件 (交通方式: ${transit_mode})`);

  return {
    total: filteredListings.length,
    results: filteredListings,
    note: `使用假資料搜尋 (${transit_mode}模式)`
  };
}

// 輔助函數
function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371; // 地球半徑，公里
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLng = (lng2 - lng1) * (Math.PI / 180);
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * 
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function getSpeedFactor(mode: string): number {
  switch (mode) {
    case "driving": return 2.0; // 開車：每公里約2分鐘
    case "transit": return 3.0; // 大眾運輸：每公里約3分鐘
    case "walking": return 12.0; // 步行：每公里約12分鐘
    default: return 2.5; // 預設值
  }
}

// 獲取等時線 (時間範圍多邊形)
export const getIsochrone = async (
  lat: number,
  lng: number,
  minutes: number,
  maxDistance: number = 10, // 新增最大距離參數（公里）
  profile = "driving"
): Promise<any> => {
  const response = await api.get(`/commute/isochrone/${minutes}`, {
    params: { lat, lng, profile, max_distance: maxDistance },
  });
  return response.data;
};

// 獲取租屋物件列表
export const getListings = async (params: Record<string, any>): Promise<ListingBasic[]> => {
  const response = await api.get("/listings", { params });
  return response.data;
};

// 獲取租屋物件詳情
export const getListingDetail = async (id: number): Promise<ListingDetail> => {
  const response = await api.get(`/listings/${id}`);
  return response.data;
};

// 獲取城市列表
export const getCities = async (): Promise<string[]> => {
  const response = await api.get("/cities");
  return response.data;
};

// 獲取行政區列表
export const getDistricts = async (city?: string): Promise<string[]> => {
  const response = await api.get("/districts", { params: { city } });
  return response.data;
}; 