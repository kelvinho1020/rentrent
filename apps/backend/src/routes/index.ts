import express from 'express';
import listingsRouter from './listings';
import commuteRouter from './commute';
import importRouter from './import';

const router = express.Router();

// 註冊路由
router.use('/listings', listingsRouter);
router.use('/commute', commuteRouter);
router.use('/import', importRouter);

export default router; 