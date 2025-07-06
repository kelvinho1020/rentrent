import { ListingBasic } from "./listing";

/**
 * 搜尋結果
 */
export interface SearchResponse {
	total: number;
	results: ListingBasic[];
	note?: string; 
}

/**
 * API 錯誤響應
 */
export interface ApiErrorResponse {
	error: {
		message: string;
		status: number;
	};
}
