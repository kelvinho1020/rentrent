import { Request, Response, NextFunction } from "express";
import { StatusCodes } from "http-status-codes";
import jwt from "jsonwebtoken";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";

// 驗證身份認證令牌
export const validateTokenMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    // 在開發環境中可以選擇跳過驗證
    if (process.env.NODE_ENV === "development" && process.env.SKIP_AUTH === "true") {
      // 為開發環境設置一個默認用戶
      req.user = { id: 1, email: "dev@example.com", role: "admin" };
      return next();
    }

    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(StatusCodes.UNAUTHORIZED).json({
        success: false,
        message: "未提供有效的認證令牌",
      });
    }

    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: number };
    
    if (!decoded || !decoded.userId) {
      return res.status(StatusCodes.UNAUTHORIZED).json({
        success: false,
        message: "認證令牌無效",
      });
    }

    // 從資料庫獲取用戶信息
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { id: true, email: true, role: true },
    });

    if (!user) {
      return res.status(StatusCodes.UNAUTHORIZED).json({
        success: false,
        message: "找不到用戶，請重新登入",
      });
    }

    // 將用戶信息附加到請求對象
    req.user = user;
    next();
  } catch (error) {
    return res.status(StatusCodes.UNAUTHORIZED).json({
      success: false,
      message: "認證失敗，請重新登入",
      error: error instanceof Error ? error.message : "未知錯誤",
    });
  }
};

// 檢查是否有管理員權限
export const isAdminMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (req.user && req.user.role === "admin") {
    next();
  } else {
    return res.status(StatusCodes.FORBIDDEN).json({
      success: false,
      message: "需要管理員權限",
    });
  }
};

// 擴展 Express 的 Request 類型
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: number;
        email: string;
        role: string;
      };
    }
  }
} 