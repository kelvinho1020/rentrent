import { Request, Response } from 'express';
import { logger } from '../utils/logger';
import { smartCommuteSearch } from '../services/commuteCacheService';

/**
 * 通勤搜尋
 * 使用 Google Maps API + 快取系統
 */
export async function searchByCommute(req: Request, res: Response) {
	try {
		const { 
			lat, 
			lng, 
			mode = 'transit', 
			maxTime = 30, 
			radius = 15,
			minPrice,
			maxPrice,
			minSize,
			city,
			district
		} = req.body;

		// 參數驗證
		if (!lat || !lng) {
			return res.status(400).json({
				error: '缺少必要參數',
				message: '請提供目的地座標 lat, lng'
			});
		}

		if (typeof lat !== 'number' || typeof lng !== 'number') {
			return res.status(400).json({
				error: '參數格式錯誤',
				message: 'lat, lng 必須是數字'
			});
		}

		const validModes = ['transit', 'driving', 'walking'];
		if (!validModes.includes(mode)) {
			return res.status(400).json({
				error: '交通方式錯誤',
				message: `支援的交通方式: ${validModes.join(', ')}`
			});
		}

		logger.info(`開始通勤搜尋`, {
			destination: { lat, lng },
			mode,
			maxTime,
			radius
		});

		// 執行搜尋
		const searchResult = await smartCommuteSearch({
			destination: { lat, lng },
			mode,
			maxCommuteTime: maxTime,
			radiusKm: radius,
			filters: {
				minPrice,
				maxPrice,
				minSize,
				city,
				district
			}
		});

		// 處理搜尋結果
		const listings = Array.isArray(searchResult) ? searchResult : searchResult.listings;
		const fromCache = Array.isArray(searchResult) ? false : searchResult.from_cache;

		// 按通勤時間排序
		const sortedResults = listings.sort((a, b) => a.commute_time - b.commute_time);

		res.json({
			success: true,
			data: {
				listings: sortedResults,
				from_cache: fromCache,
				meta: {
					total: sortedResults.length,
					searchParams: {
						destination: { lat, lng },
						mode,
						maxCommuteTime: maxTime,
						radiusKm: radius,
						filters: { minPrice, maxPrice, minSize, city, district }
					}
				},
			},
		});
	} catch (error) {
		logger.error('"通勤搜尋失敗', { error });
		res.status(500).json({
			error: '搜尋失敗',
			message: '伺服器內部錯誤，請稍後再試'
		});
	}
}