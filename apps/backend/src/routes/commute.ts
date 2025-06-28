import express from 'express';
import { CommuteController } from '../controllers/commute.controller';

const router = express.Router();
const commuteController = new CommuteController();

// 依通勤時間搜尋租屋物件
router.post('/search', commuteController.searchByCommuteTime);

// 獲取等時線 (時間範圍多邊形)
router.get('/isochrone/:minutes', commuteController.getIsochrone);

// 批次計算多個地點到單一目的地的通勤時間
router.post('/batch-distance', commuteController.batchDistanceMatrix);

export default router; 