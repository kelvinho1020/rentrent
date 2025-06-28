import express from 'express';
import multer from 'multer';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { ImportController } from '../controllers/import.controller';
import { validateTokenMiddleware } from "../middleware/auth";

const router = express.Router();
const importController = new ImportController();

/**
 * @swagger
 * tags:
 *   name: Import
 *   description: 租屋資料匯入功能
 */

/**
 * @swagger
 * /import/listings/path:
 *   post:
 *     summary: 從指定檔案路徑匯入租屋資料
 *     tags: [Import]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - filePath
 *             properties:
 *               filePath:
 *                 type: string
 *                 description: JSON檔案的絕對路徑
 *     responses:
 *       200:
 *         description: 資料匯入成功
 *       400:
 *         description: 請求錯誤，缺少參數或檔案不存在
 *       500:
 *         description: 伺服器錯誤
 */

// 配置 multer 臨時存儲空間
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/");
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, file.fieldname + "-" + uniqueSuffix + path.extname(file.originalname));
  },
});

// 限制上傳的文件類型
const fileFilter = (req: Express.Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  // 只接受JSON檔案
  if (file.mimetype === "application/json") {
    cb(null, true);
  } else {
    cb(new Error("只接受JSON檔案"));
  }
};

// 配置 multer
const upload = multer({ 
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 限制檔案大小為10MB
  }
});

/**
 * @swagger
 * /import/listings:
 *   post:
 *     summary: 上傳並匯入租屋資料JSON檔案
 *     tags: [Import]
 *     consumes:
 *       - multipart/form-data
 *     parameters:
 *       - in: formData
 *         name: file
 *         type: file
 *         required: true
 *         description: 要上傳的JSON檔案
 *     responses:
 *       200:
 *         description: 資料匯入成功
 *       400:
 *         description: 請求錯誤，缺少檔案或格式不正確
 *       500:
 *         description: 伺服器錯誤
 */
router.post('/listings', validateTokenMiddleware, upload.single('file'), importController.importListings);

/**
 * @swagger
 * /import/status:
 *   get:
 *     summary: 獲取資料匯入狀態
 *     tags: [Import]
 *     responses:
 *       200:
 *         description: 成功獲取匯入狀態
 *       500:
 *         description: 伺服器錯誤
 */
router.get('/status', validateTokenMiddleware, importController.getImportStatus);

export default router; 