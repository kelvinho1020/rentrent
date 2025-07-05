import { Router } from 'express';
import listingsRouter from './listings';
import commuteRouter from './commute';
import smartCommuteRouter from './smartCommute';

const router = Router();

// 健康檢查端點
router.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

router.use('/listings', listingsRouter);
router.use('/commute', commuteRouter);
router.use('/smart-commute', smartCommuteRouter);

export default router; 