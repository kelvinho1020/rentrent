/**
 * 前端專用類型定義
 */

/**
 * 座標類型
 */
export interface Coordinates {
	longitude: number;
	latitude: number;
}

/**
 * 支援的交通方式
 */
export type TransitMode = "driving" | "transit" | "walking";

/**
 * 有效的交通方式列表
 */
export const VALID_TRANSIT_MODES: TransitMode[] = [
	"driving",
	"transit", 
	"walking"
];

/**
 * 通勤搜尋請求
 */
export interface CommuteSearchRequest {
	work_location: Coordinates;
	max_commute_time: number;
	min_price?: number;
	max_price?: number;
	min_size?: number;
	city?: string;
	district?: string;
	transit_mode?: TransitMode;
	max_distance?: number; // 最大直線距離，單位公里
}

/**
 * 距離搜尋參數
 */
export interface DistanceSearchParams {
	destination: [number, number]; // [lat, lng]
	maxDistanceKm: number;
	filter?: {
		minPrice?: number;
		maxPrice?: number;
		minSize?: number;
		city?: string;
		district?: string;
	};
}

/**
 * 智能通勤搜尋參數
 */
export interface SmartCommuteSearchParams {
	destination: { lat: number; lng: number };
	mode: TransitMode;
	maxCommuteTime: number;
	radiusKm: number;
	filters?: {
		minPrice?: number;
		maxPrice?: number;
		minSize?: number;
		city?: string;
		district?: string;
	};
} 