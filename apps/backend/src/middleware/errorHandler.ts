import { Request, Response, NextFunction } from 'express';
import { StatusCodes } from 'http-status-codes';
import { logger } from '../utils/logger';

// 自定義錯誤類型
interface AppError extends Error {
  statusCode?: number;
}

export const errorHandler = (
  err: AppError,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  next: NextFunction
) => {
  const statusCode = err.statusCode || StatusCodes.INTERNAL_SERVER_ERROR;
  const message = err.message || '伺服器錯誤';

  logger.error(`[ERROR] ${message}`, {
    url: req.originalUrl,
    method: req.method,
    statusCode,
    stack: err.stack,
  });

  res.status(statusCode).json({
    error: {
      message,
      status: statusCode,
    },
  });
}; 