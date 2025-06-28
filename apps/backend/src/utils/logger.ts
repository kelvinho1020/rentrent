/**
 * 日誌工具
 * 用於記錄應用程序中的各種級別的日誌信息
 */

import winston from "winston";
import path from "path";
import fs from "fs";

// 確保日誌目錄存在
const logsDir = path.join(process.cwd(), "logs");
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// 定義日誌級別
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

// 根據環境選擇日誌級別
const level = () => {
  const env = process.env.NODE_ENV || "development";
  const isDevelopment = env === "development";
  return isDevelopment ? "debug" : "info";
};

// 定義日誌顏色
const colors = {
  error: "red",
  warn: "yellow",
  info: "green",
  http: "magenta",
  debug: "blue",
};

// 添加顏色
winston.addColors(colors);

// 日誌格式
const format = winston.format.combine(
  winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss:ms" }),
  winston.format.colorize({ all: true }),
  winston.format.printf(
    (info) => `${info.timestamp} ${info.level}: ${info.message}`,
  ),
);

// 日誌輸出目標
const transports = [
  // 控制台輸出
  new winston.transports.Console(),
  
  // 錯誤日誌文件
  new winston.transports.File({
    filename: path.join(logsDir, "error.log"),
    level: "error",
  }),
  
  // 所有日誌文件
  new winston.transports.File({ filename: path.join(logsDir, "all.log") }),
];

// 創建日誌實例
export const logger = winston.createLogger({
  level: level(),
  levels,
  format,
  transports,
});

// 在開發環境下添加更多詳細日誌
if (process.env.NODE_ENV === "development") {
  logger.add(
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple(),
      ),
    }),
  );
}

// 捕獲未處理的異常和承諾拒絕
process.on("uncaughtException", (error) => {
  logger.error("未捕獲的異常: " + error.message);
  logger.error(error.stack || "無堆疊跟踪");
  process.exit(1);
});

process.on("unhandledRejection", (reason) => {
  if (reason instanceof Error) {
    logger.error("未處理的承諾拒絕: " + reason.message);
    logger.error(reason.stack || "無堆疊跟踪");
  } else {
    logger.error("未處理的承諾拒絕: " + String(reason));
  }
});

export default logger; 