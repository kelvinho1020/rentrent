import { Router } from 'express';
import {
	searchByCommute,
	getPopularDestinationsController,
	cleanupCacheController,
	getCacheStats,
} from '../controllers/smartCommute.controller';

const router = Router();

/**
 * POST /api/smart-commute/search
 * 智能通勤搜尋
 * 
 * Body:
 * {
 *   "lat": 25.033,
 *   "lng": 121.565,
 *   "mode": "transit",      // transit, driving, bicycling, walking
 *   "maxTime": 30,          // 最大通勤時間（分鐘）
 *   "radius": 10            // 搜尋半徑（公里）
 * }
 */
router.post('/search', searchByCommute);

/**
 * GET /api/smart-commute/popular-destinations
 * 取得熱門目的地
 * 
 * Query:
 * ?limit=10
 */
router.get('/popular-destinations', getPopularDestinationsController);

/**
 * POST /api/smart-commute/cleanup-cache
 * 清理舊快取（管理員功能）
 * 
 * Body:
 * {
 *   "daysOld": 30
 * }
 */
router.post('/cleanup-cache', cleanupCacheController);

/**
 * GET /api/smart-commute/cache-stats
 * 取得快取統計資訊
 */
router.get('/cache-stats', getCacheStats);

export default router; 