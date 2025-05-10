import winston from 'winston';
import { config } from '../config';

// 定義日誌格式
const logFormat = winston.format.printf(({ level, message, timestamp, ...meta }) => {
  return `${timestamp} [${level}]: ${message} ${
    Object.keys(meta).length ? JSON.stringify(meta) : ''
  }`;
});

// 創建 logger 實例
export const logger = winston.createLogger({
  level: config.logger.level,
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    winston.format.splat(),
    winston.format.json()
  ),
  defaultMeta: { service: 'rentrent-backend' },
  transports: [
    // 控制台輸出
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        logFormat
      ),
    }),
    // 生產環境添加文件日誌
    ...(config.nodeEnv === 'production'
      ? [
          // 錯誤日誌
          new winston.transports.File({
            filename: 'logs/error.log',
            level: 'error',
          }),
          // 所有日誌
          new winston.transports.File({ filename: 'logs/combined.log' }),
        ]
      : []),
  ],
}); 