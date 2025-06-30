// 座標類型
export interface Coordinates {
  longitude: number;
  latitude: number;
}

// 租屋物件基本資訊
export interface ListingBasic {
  id: number;
  title: string;
  price: number;
  size_ping: number;
  address: string;
  district: string;
  city: string;
  coordinates: [number, number]; // [經度, 緯度]
  commute_time?: number; // 通勤時間 (分鐘)
}

// 租屋物件詳細資訊
export interface ListingDetail extends ListingBasic {
  source_id: string;
  url?: string;
  house_type?: string;
  room_type?: string;
  description?: string;
  image_urls?: string[];
  facilities?: string[];
  contact_name?: string;
  contact_phone?: string;
  floor?: string;
  total_floor?: string;
  last_updated?: string;
  created_at?: string;
}

// 快取統計資訊
export interface CacheStats {
  cached_count: number;
  calculated_count: number;
  cache_hit_rate: string;
}

// 搜尋結果
export interface SearchResponse {
  total: number;
  results: ListingBasic[];
  cache_stats?: CacheStats; // 新增：快取統計資訊
  note?: string; // 新增：備註說明，例如使用直線距離搜尋的備註
}

// 通勤搜尋請求
export interface CommuteSearchRequest {
  work_location: Coordinates;
  max_commute_time: number;
  min_price?: number;
  max_price?: number;
  min_size?: number;
  city?: string; // 新增：城市篩選
  district?: string; // 新增：行政區篩選
  transit_mode?: string; // 新增：交通方式 (driving、transit、walking)
  max_distance?: number; // 新增：最大直線距離，單位公里
} 