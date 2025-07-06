/**
 * 租屋物件基本資訊
 */
export interface ListingBasic {
	id: number;
	title: string;
	price: number;
	size_ping: number;
	address: string;
	district: string;
	city: string;
	coordinates: [number, number];
	commute_time?: number; // 通勤時間 (分鐘)
}

/**
 * 租屋物件詳細資訊
 */
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

 