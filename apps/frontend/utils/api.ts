import axios from "axios";
import { CommuteSearchRequest, ListingBasic, ListingDetail, SearchResponse } from "@/types";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

const api = axios.create({
	baseURL: API_URL,
	headers: {
		"Content-Type": "application/json",
	},
});

export const searchByCommuteTime = async (params: CommuteSearchRequest): Promise<SearchResponse> => {
  console.log("=====>")
	console.log("🌐 使用智能快取 API 調用");
	console.log("📍 搜尋參數:", {
		目的地: `${params.work_location.latitude}, ${params.work_location.longitude}`,
		最大通勤時間: params.max_commute_time,
		交通方式: params.transit_mode || "transit",
		最大距離: params.max_distance || 15,
		價格範圍: `${params.min_price || "不限"} - ${params.max_price || "不限"}`,
		坪數下限: params.min_size || "不限",
		城市: params.city || "不限",
		行政區: params.district || "不限"
	});

	try {
		// 調用智能快取API
		const response = await api.post("/smart-commute/search", {
			lat: params.work_location.latitude,
			lng: params.work_location.longitude,
			mode: params.transit_mode || "transit",
			maxTime: params.max_commute_time,
			radius: params.max_distance || 15,
		});

		// 處理API的回應格式
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
				cache_stats: cache_stats,
				note: `智能快取系統 (${params.transit_mode || "transit"}模式) - 處理時間: ${meta.processingTime}`
			};
		}

		// API回應格式異常
		throw new Error("API回應格式異常");

	} catch (error) {
		console.error("❌ 智能快取API調用失敗:", error);
		
		// 回退到舊API系統
		console.log("🔄 回退到舊API系統...");
		try {
			const fallbackResponse = await api.post("/commute/search", params);
			console.log("✅ 舊API系統調用成功");
			return {
				...fallbackResponse.data,
				note: `回退到舊系統 (${params.transit_mode || "driving"}模式) - 智能快取系統暫時不可用`
			};
		} catch (fallbackError) {
			console.error("❌ 舊API系統也失敗:", fallbackError);
			throw new Error("所有通勤搜尋系統都不可用，請稍後再試");
		}
	}
};

// 獲取等時線 (時間範圍多邊形)
export const getIsochrone = async (
	lat: number,
	lng: number,
	minutes: number,
	maxDistance: number = 10,
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