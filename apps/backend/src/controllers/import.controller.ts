import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import { logger } from '../utils/logger';
import * as fs from 'fs';
import * as path from 'path';
import { importListingsFromCrawlerData } from '../services/importService';
import * as os from 'os';
import multer, { FileFilterCallback } from 'multer';
import { v4 as uuidv4 } from 'uuid';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// 記錄匯入操作的狀態
let importStatus = {
  lastImport: null as { 
    date: Date; 
    file: string; 
    status: string; 
    totalItems: number; 
    successCount: number; 
    errorCount: number; 
    errors: string[];
  } | null,
  inProgress: false,
  queue: [] as string[],
};

// 設置multer儲存配置
const storage = multer.diskStorage({
  destination: function (req: Express.Request, file: Express.Multer.File, cb: Function) {
    const tempDir = path.join(os.tmpdir(), "rentrent-uploads");
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    cb(null, tempDir);
  },
  filename: function (req: Express.Request, file: Express.Multer.File, cb: Function) {
    const uniqueSuffix = `${Date.now()}-${uuidv4()}`;
    cb(null, `${uniqueSuffix}-${file.originalname}`);
  }
});

// 檔案上傳配置
export const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 限制10MB
  },
  fileFilter: (req: Express.Request, file: Express.Multer.File, cb: FileFilterCallback) => {
    // 只接受JSON檔案
    if (file.mimetype === "application/json") {
      cb(null, true);
    } else {
      cb(new Error("只接受JSON格式檔案"));
    }
  }
});

export class ImportController {
  /**
   * 匯入房源資料
   */
  public importListings = async (req: Request, res: Response): Promise<void> => {
    try {
      // 確認有上傳文件
      if (!req.file) {
        res.status(StatusCodes.BAD_REQUEST).json({
          success: false,
          message: "未提供檔案",
        });
        return;
      }

      const filePath = req.file.path;
      const fileName = req.file.originalname;

      // 開始處理匯入
      if (importStatus.inProgress) {
        // 如果有正在進行的匯入，則加入佇列
        importStatus.queue.push(filePath);
        res.status(StatusCodes.ACCEPTED).json({
          success: true,
          message: "檔案已加入匯入佇列",
          queue_position: importStatus.queue.length,
        });
        return;
      }

      // 設置匯入狀態
      importStatus.inProgress = true;
      const currentImport = {
        date: new Date(),
        file: fileName,
        status: "處理中",
        totalItems: 0,
        successCount: 0,
        errorCount: 0,
        errors: [] as string[],
      };
      importStatus.lastImport = currentImport;

      // 回應給客戶端
      res.status(StatusCodes.ACCEPTED).json({
        success: true,
        message: "開始匯入資料",
        import_id: currentImport.date.getTime().toString(),
      });

      // 在後台處理匯入
      try {
        // 讀取檔案
        const fileData = fs.readFileSync(filePath, "utf8");
        let jsonData;
        
        try {
          jsonData = JSON.parse(fileData);
        } catch (err) {
          currentImport.status = "失敗";
          currentImport.errors.push("JSON 格式錯誤");
          logger.error(`匯入失敗: JSON 格式錯誤 - ${fileName}`);
          return;
        }

        // 處理匯入
        const result = await importListingsFromCrawlerData(jsonData);
        
        // 更新匯入狀態
        currentImport.status = "完成";
        currentImport.totalItems = result.totalItems;
        currentImport.successCount = result.imported + result.updated;
        currentImport.errorCount = result.errors;
        if (result.errorMessages) {
          currentImport.errors = result.errorMessages;
        }

        logger.info(`匯入完成: ${fileName} - 成功: ${result.imported + result.updated}, 失敗: ${result.errors}`);
      } catch (error) {
        // 處理匯入過程中的錯誤
        currentImport.status = "失敗";
        currentImport.errors.push(error instanceof Error ? error.message : "未知錯誤");
        logger.error(`匯入處理失敗: ${error instanceof Error ? error.message : "未知錯誤"} - ${fileName}`);
      } finally {
        // 完成后清理
        importStatus.inProgress = false;
        
        // 刪除臨時檔案
        try {
          fs.unlinkSync(filePath);
        } catch (err) {
          logger.warn(`無法刪除臨時檔案 ${filePath}: ${err instanceof Error ? err.message : "未知錯誤"}`);
        }

        // 處理佇列中的下一個檔案
        if (importStatus.queue.length > 0) {
          const nextFilePath = importStatus.queue.shift();
          if (nextFilePath) {
            // 這裡可以啟動處理下一個匯入的邏輯
            // 比如透過 processNextImport(nextFilePath) 函數
          }
        }
      }
    } catch (error) {
      logger.error(`匯入控制器錯誤: ${error instanceof Error ? error.message : "未知錯誤"}`);
      
      // 只有在還沒有回應時才回應錯誤
      if (!res.headersSent) {
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
          success: false,
          message: "匯入失敗",
          error: error instanceof Error ? error.message : "未知錯誤",
        });
      }

      // 重置匯入狀態
      importStatus.inProgress = false;
    }
  };

  /**
   * 獲取匯入狀態
   */
  public getImportStatus = async (req: Request, res: Response): Promise<void> => {
    try {
      res.status(StatusCodes.OK).json({
        success: true,
        data: {
          lastImport: importStatus.lastImport,
          inProgress: importStatus.inProgress,
          queueLength: importStatus.queue.length,
        },
      });
    } catch (error) {
      logger.error(`獲取匯入狀態失敗: ${error instanceof Error ? error.message : "未知錯誤"}`);
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: "無法獲取匯入狀態",
        error: error instanceof Error ? error.message : "未知錯誤",
      });
    }
  };
}

// 創建控制器實例
const importController = new ImportController();
export default importController; 