#!/bin/bash

# 確保使用正確的 Node.js 版本
echo "配置 Node.js 環境..."
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"  # 加載 nvm
[ -s "$NVM_DIR/bash_completion" ] && \. "$NVM_DIR/bash_completion"  # 加載 nvm bash_completion

# 使用專案指定的 Node.js 版本
nvm use || nvm install

# 確保 PATH 中包含當前 Node.js 版本的 bin 目錄
export PATH="$NVM_DIR/versions/node/$(node -v)/bin:$PATH"

# 安裝 pnpm 依賴
echo "安裝前端依賴..."
pnpm install

# 安裝 Python 依賴
echo "安裝後端 Python 依賴..."
if [ -f "apps/backend/requirements.txt" ]; then
  # 建議使用虛擬環境
  if command -v python3 -m venv &> /dev/null; then
    echo "建立 Python 虛擬環境..."
    if [ ! -d "apps/backend/venv" ]; then
      python3 -m venv apps/backend/venv
    fi
    
    # 啟用虛擬環境
    echo "啟用虛擬環境..."
    source apps/backend/venv/bin/activate
    
    # 安裝依賴
    echo "安裝 backend 依賴..."
    pip install -r apps/backend/requirements.txt
    
    # 停用虛擬環境
    deactivate
    
    echo "後端依賴安裝完成！使用時請先啟用虛擬環境：source apps/backend/venv/bin/activate"
  else
    echo "直接安裝 Python 依賴 (不使用虛擬環境)..."
    pip install -r apps/backend/requirements.txt
  fi
else
  echo "警告: 找不到 apps/backend/requirements.txt 文件"
fi

echo "環境設置完成！"
echo "您可以使用以下命令啟動開發服務器："
echo "  前端: pnpm dev:frontend"
echo "  後端: 先啟用虛擬環境 'source apps/backend/venv/bin/activate' 再執行 'pnpm backend'" 