import express from 'express';
import listingsRouter from './listings';
import commuteRouter from './commute';

const router = express.Router();

// 註冊路由
router.use('/listings', listingsRouter);
router.use('/commute', commuteRouter);

export default router; 