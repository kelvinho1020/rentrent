import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import { logger } from '../utils/logger';
import { smartCommuteSearch, getPopularDestinations, cleanupOldCache } from '../services/commuteCacheService';

/**
 * 智能通勤搜尋
 * 使用地理篩選 + 快取系統，大幅減少 API 調用
 */
export async function searchByCommute(req: Request, res: Response) {
	try {
		const { lat, lng, mode = 'transit', maxTime = 30, radius = 15 } = req.body;

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

		if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
			return res.status(400).json({
				error: '座標範圍錯誤',
				message: '請提供有效的經緯度座標'
			});
		}

		const validModes = ['transit', 'driving', 'bicycling', 'walking'];
		if (!validModes.includes(mode)) {
			return res.status(400).json({
				error: '交通方式錯誤',
				message: `支援的交通方式: ${validModes.join(', ')}`
			});
		}

		const startTime = Date.now();
		logger.info(`開始智能通勤搜尋`, {
			destination: { lat, lng },
			mode,
			maxTime,
			radius,
		});

		// 執行智能搜尋
		const results = await smartCommuteSearch({
			destination: { lat, lng },
			mode,
			maxCommuteTime: maxTime,
			radiusKm: radius,
		});

		const endTime = Date.now();
		const duration = endTime - startTime;

		logger.info(`智能通勤搜尋完成`, {
			resultsCount: results.length,
			duration: `${duration}ms`,
		});

		// 按通勤時間排序
		const sortedResults = results.sort((a, b) => a.commute_time - b.commute_time);

		// 計算快取統計
		const cachedCount = results.filter(r => r.from_cache).length;
		const calculatedCount = results.length - cachedCount;

		// 在 console 中顯示快取狀態
		console.log(`🔍 智能通勤搜尋結果: 共 ${results.length} 筆`);
		console.log(`📋 快取命中: ${cachedCount} 筆 (來源: CommuteCache 表)`);
		console.log(`🔄 重新計算: ${calculatedCount} 筆 (來源: Google Maps API)`);
		console.log(`⚡ 快取命中率: ${results.length > 0 ? (cachedCount / results.length * 100).toFixed(1) : 0}%`);
		console.log(`📍 目的地座標: ${lat}, ${lng}`);
		console.log(`🎯 交通方式: ${mode}, 最大時間: ${maxTime}分鐘, 搜尋半徑: ${radius}km`);
		
		if (calculatedCount > 0) {
			console.log(`🌐 本次 Google Maps API 調用次數: ${Math.ceil(calculatedCount / 20)} 次 (批次大小: 20)`);
		}

		res.json({
			success: true,
			data: {
				listings: sortedResults,
				cache_stats: {
					cached_count: cachedCount,
					calculated_count: calculatedCount,
					cache_hit_rate: results.length > 0 ? (cachedCount / results.length * 100).toFixed(1) + '%' : '0%'
				},
				meta: {
					total: sortedResults.length,
					searchParams: {
						destination: { lat, lng },
						mode,
						maxCommuteTime: maxTime,
						radiusKm: radius,
					},
					processingTime: `${duration}ms`,
				},
			},
		});
	} catch (error) {
		// 輸出詳細錯誤信息
		console.error('🚨 智能通勤搜尋詳細錯誤:', error);
		logger.error('智能通勤搜尋失敗', { 
			error: {
				message: error instanceof Error ? error.message : String(error),
				stack: error instanceof Error ? error.stack : undefined,
				name: error instanceof Error ? error.name : 'Unknown'
			} 
		});
		res.status(500).json({
			error: '搜尋失敗',
			message: '伺服器內部錯誤，請稍後再試',
			details: error instanceof Error ? error.message : String(error)
		});
	}
}

/**
 * 取得熱門目的地
 * 用於前端推薦常用搜尋地點
 */
export async function getPopularDestinationsController(req: Request, res: Response) {
	try {
		const limit = parseInt(req.query.limit as string) || 10;

		if (limit < 1 || limit > 50) {
			return res.status(400).json({
				error: '參數錯誤',
				message: 'limit 必須在 1-50 之間'
			});
		}

		const destinations = await getPopularDestinations(limit);

		res.json({
			success: true,
			data: {
				destinations,
				meta: {
					total: destinations.length,
					limit,
				},
			},
		});
	} catch (error) {
		logger.error('取得熱門目的地失敗', { error });
		res.status(500).json({
			error: '取得失敗',
			message: '伺服器內部錯誤',
		});
	}
}

/**
 * 清理舊快取
 * 管理員功能，清理過期的快取資料
 */
export async function cleanupCacheController(req: Request, res: Response) {
	try {
		const daysOld = parseInt(req.body.daysOld as string) || 30;

		if (daysOld < 1) {
			return res.status(400).json({
				error: '參數錯誤',
				message: 'daysOld 必須大於 0'
			});
		}

		const deletedCount = await cleanupOldCache(daysOld);

		logger.info(`清理快取完成`, { deletedCount, daysOld });

		res.json({
			success: true,
			data: {
				deletedCount,
				daysOld,
				message: `成功清理 ${deletedCount} 筆超過 ${daysOld} 天的快取記錄`,
			},
		});
	} catch (error) {
		logger.error('清理快取失敗', { error });
		res.status(500).json({
			error: '清理失敗',
			message: '伺服器內部錯誤',
		});
	}
}

/**
 * 快取統計資訊
 * 提供快取系統的使用情況統計
 */
export async function getCacheStats(req: Request, res: Response) {
	try {
		// 這裡可以加入更多統計邏輯
		const stats = {
			message: '快取統計功能開發中',
			timestamp: new Date().toISOString(),
		};

		res.json({
			success: true,
			data: stats,
		});
	} catch (error) {
		logger.error('取得快取統計失敗', { error });
		res.status(500).json({
			error: '取得統計失敗',
			message: '伺服器內部錯誤',
		});
	}
} 