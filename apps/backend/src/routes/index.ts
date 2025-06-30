import express from 'express';
import listingsRouter from './listings';
import commuteRouter from './commute';
import smartCommuteRouter from './smartCommute';

const router = express.Router();

router.use('/listings', listingsRouter);
router.use('/commute', commuteRouter);
router.use('/smart-commute', smartCommuteRouter);

export default router; 