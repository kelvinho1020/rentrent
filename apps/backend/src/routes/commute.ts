import express from 'express';
import { CommuteController } from '../controllers/commute.controller';

const router = express.Router();
const commuteController = new CommuteController();

// 依直線距離搜尋租屋物件
router.post('/search', commuteController.searchByDistance);

// 獲取等時線 (搜尋範圍多邊形)
router.get('/isochrone', commuteController.getIsochrone);

export default router; 