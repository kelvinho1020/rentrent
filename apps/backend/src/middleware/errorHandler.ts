import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import { logger } from '../utils/logger';

interface AppError extends Error {
  statusCode?: number;
}

export const errorHandler = (
  err: AppError,
  req: Request,
  res: Response,
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