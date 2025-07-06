/**
 * 後端專用類型定義
 */

/**
 * 座標元組 [經度, 緯度]
 */
export type CoordinatesTuple = [number, number];

/**
 * 地理等時線參數
 */
export interface IsochroneParams {
	location: CoordinatesTuple;
	mode: string;
	maxDistance?: number;
}

/**
 * 通勤過濾器
 */
export interface CommuteFilter {
	minPrice?: number;
	maxPrice?: number;
	minSize?: number;
	city?: string;
	district?: string;
}

/**
 * 智能通勤過濾器
 */
export interface SmartCommuteFilters {
	minPrice?: number;
	maxPrice?: number;
	minSize?: number;
	city?: string;
	district?: string;
}

/**
 * 帶距離的租屋物件（用於距離搜尋）
 */
export interface ListingWithDistance {
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
 * 爬蟲資料格式
 */
export interface CrawlerData {
	id?: string;
	url?: string;
	title: string;
	price: string | number;
	size?: string | number;
	address?: string;
	latitude?: number;
	longitude?: number;
	houseType?: string;
	roomLayout?: string;
	floor_info?: string;
	parking?: string;
	images?: string[];
	facilities?: string[];
	city?: string;
	district?: string;
}

/**
 * 資料匯入結果
 */
export interface ImportResult {
	imported: number;
	updated: number;
	skipped: number;
	errors: number;
	totalItems: number;
}

/**
 * Google Maps Distance Matrix API 響應格式
 */
export interface DistanceMatrixResponse {
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

/**
 * 距離搜尋 API 響應
 */
export interface DistanceSearchResponse {
	total: number;
	results: any[];
	meta: {
		searchParams: {
			destination: [number, number];
			maxDistanceKm: number;
			filters: Record<string, any>;
		};
	};
	note: string;
}

/**
 * 智能通勤搜尋 API 響應
 */
export interface SmartCommuteSearchResponse {
	success: boolean;
	data: {
		listings: any[];
		from_cache: boolean;
		meta: {
			total: number;
			searchParams: {
				destination: { lat: number; lng: number };
				mode: string;
				maxCommuteTime: number;
				radiusKm: number;
				filters: Record<string, any>;
			};
		};
	};
}

/**
 * 基本 API 響應
 */
export interface BaseApiResponse<T = any> {
	success: boolean;
	data?: T;
	error?: string;
	message?: string;
} 