import express from 'express';
import multer, { FileFilterCallback } from 'multer';
import path from 'path';
import fs from 'fs';
import { StatusCodes } from 'http-status-codes';
import { 
  importListingsFromCrawlerData,
  batchUpdateListings,
  cleanupOldListings,
  smartCleanupOldListings,
  BatchUpdateOptions 
} from '../services/importService';
import { logger } from '../utils/logger';

const router = express.Router();

// 配置 multer 用於檔案上傳
const storage = multer.diskStorage({
  destination: (req: express.Request, file: Express.Multer.File, cb: (error: Error | null, destination: string) => void) => {
    const uploadDir = 'uploads';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req: express.Request, file: Express.Multer.File, cb: (error: Error | null, filename: string) => void) => {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    cb(null, `crawler-data-${timestamp}.json`);
  }
});

const upload = multer({ 
  storage,
  fileFilter: (req: express.Request, file: Express.Multer.File, cb: FileFilterCallback) => {
    if (file.mimetype === 'application/json' || 
        path.extname(file.originalname).toLowerCase() === '.json') {
      cb(null, true);
    } else {
      cb(new Error('只接受 JSON 檔案'));
    }
  },
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB 限制
  }
});

/**
 * 傳統導入 API（向後相容）
 */
router.post('/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        error: '請提供 JSON 檔案'
      });
    }

    const result = await importListingsFromCrawlerData(req.file.path);
    
    // 清理上傳的檔案
    fs.unlinkSync(req.file.path);
    
    res.status(StatusCodes.OK).json({
      message: '資料導入成功',
      result
    });

  } catch (error) {
    logger.error('導入失敗', { error, file: req.file?.path });
    
    // 清理上傳的檔案
    if (req.file?.path && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      error: '導入失敗',
      details: error instanceof Error ? error.message : '未知錯誤'
    });
  }
});

/**
 * 批次更新 API（軟刪除策略）
 */
router.post('/batch-update', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        error: '請提供 JSON 檔案'
      });
    }

    const options: BatchUpdateOptions = {
      batchSize: req.body.batchSize ? parseInt(req.body.batchSize) : 1000,
      keepOldDataDays: req.body.keepOldDataDays ? parseInt(req.body.keepOldDataDays) : 7,
      preserveCommuteData: req.body.preserveCommuteData !== 'false'
    };

    logger.info('開始批次更新', { 
      file: req.file.originalname,
      options 
    });

    const result = await batchUpdateListings(req.file.path, options);
    
    // 清理上傳的檔案
    fs.unlinkSync(req.file.path);
    
    res.status(StatusCodes.OK).json({
      message: '批次更新成功',
      strategy: 'soft-delete',
      result
    });

  } catch (error) {
    logger.error('批次更新失敗', { error, file: req.file?.path });
    
    // 清理上傳的檔案
    if (req.file?.path && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      error: '批次更新失敗',
      details: error instanceof Error ? error.message : '未知錯誤'
    });
  }
});

/**
 * 清理過期資料 API
 */
router.post('/cleanup', async (req, res) => {
  try {
    const { keepDays = 7, smart = true } = req.body;
    
    if (typeof keepDays !== 'number' || keepDays < 1 || keepDays > 30) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        error: '保留天數必須在 1-30 之間'
      });
    }

    logger.info('開始清理過期資料', { keepDays, smart });

    const result = smart 
      ? await smartCleanupOldListings(keepDays)
      : await cleanupOldListings(keepDays);
    
    res.status(StatusCodes.OK).json({
      message: '清理完成',
      strategy: smart ? 'smart-cleanup' : 'simple-cleanup',
      result
    });

  } catch (error) {
    logger.error('清理失敗', { error });
    
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      error: '清理失敗',
      details: error instanceof Error ? error.message : '未知錯誤'
    });
  }
});

/**
 * 獲取資料統計 API
 */
router.get('/stats', async (req, res) => {
  try {
    const { PrismaClient } = await import('@prisma/client');
    const prisma = new PrismaClient();

    const [
      totalActive,
      totalInactive,
      oldestActive,
      newestActive,
      totalCommuteData
    ] = await Promise.all([
      prisma.listing.count({ where: { isActive: true } }),
      prisma.listing.count({ where: { isActive: false } }),
      prisma.listing.findFirst({ 
        where: { isActive: true },
        orderBy: { updatedAt: 'asc' },
        select: { updatedAt: true }
      }),
      prisma.listing.findFirst({ 
        where: { isActive: true },
        orderBy: { updatedAt: 'desc' },
        select: { updatedAt: true }
      }),
      prisma.commuteTime.count()
    ]);

    res.status(StatusCodes.OK).json({
      activeListings: totalActive,
      inactiveListings: totalInactive,
      totalCommuteData,
      dataFreshness: {
        oldest: oldestActive?.updatedAt,
        newest: newestActive?.updatedAt
      },
      healthScore: totalActive > 0 ? 'healthy' : 'no-data'
    });

  } catch (error) {
    logger.error('獲取統計失敗', { error });
    
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      error: '獲取統計失敗',
      details: error instanceof Error ? error.message : '未知錯誤'
    });
  }
});

export default router; 