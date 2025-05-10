import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';

export const notFound = (req: Request, res: Response) => {
  res.status(StatusCodes.NOT_FOUND).json({
    error: {
      message: `找不到請求的資源: ${req.originalUrl}`,
      status: StatusCodes.NOT_FOUND,
    },
  });
}; 