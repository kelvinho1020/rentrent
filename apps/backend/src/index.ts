import 'express-async-errors';
import express, { Express } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { StatusCodes } from 'http-status-codes';

import { config } from './config';
import { errorHandler, notFound } from './middleware';
import { logger } from './utils/logger';
import routes from './routes';

// 初始化 Express 應用
const app: Express = express();
const port = config.port;

// 中間件
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('combined', { stream: { write: message => logger.info(message.trim()) } }));

// 健康檢查端點
app.get('/health', (req, res) => {
  res.status(StatusCodes.OK).json({ status: 'UP', time: new Date().toISOString() });
});

// API 路由
app.use(config.apiPrefix, routes);

// 處理 404 錯誤
app.use(notFound);

// 全局錯誤處理
app.use(errorHandler);

// 啟動服務器
const startServer = async () => {
  try {
    app.listen(port, () => {
      logger.info(`伺服器正在運行: http://localhost:${port}`);
      logger.info(`API 文檔: http://localhost:${port}${config.apiPrefix}/docs`);
    });
  } catch (error) {
    if (error instanceof Error) {
      logger.error(`啟動伺服器時出錯: ${error.message}`);
    } else {
      logger.error('啟動伺服器時出現未知錯誤');
    }
    process.exit(1);
  }
};

startServer(); 