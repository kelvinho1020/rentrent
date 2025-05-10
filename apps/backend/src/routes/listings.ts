import express from 'express';
import { ListingsController } from '../controllers/listings.controller';

const router = express.Router();
const listingsController = new ListingsController();

// 獲取租屋物件列表
router.get('/', listingsController.getListings);

// 獲取租屋物件詳情
router.get('/:id', listingsController.getListingById);

// 獲取城市列表
router.get('/cities', listingsController.getCities);

// 獲取行政區列表
router.get('/districts', listingsController.getDistricts);

export default router; 