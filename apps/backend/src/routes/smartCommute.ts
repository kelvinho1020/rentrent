import { Router } from 'express';
import {
	searchByCommute,
} from '../controllers/smartCommute.controller';

const router = Router();

/**
 * POST /api/smart-commute/search
 * 通勤搜尋
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

export default router; 