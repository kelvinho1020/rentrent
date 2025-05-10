FROM node:18-alpine

WORKDIR /app

# 安裝依賴
COPY apps/frontend/package.json apps/frontend/package-lock.json* ./
RUN npm ci

# 複製前端程式碼
COPY apps/frontend/ .

# 開發環境啟動命令
CMD ["npm", "run", "dev"]

# 生產環境 build 與部署
# RUN npm run build
# CMD ["npm", "start"] 