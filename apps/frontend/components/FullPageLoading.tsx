import { FC } from "react";

interface FullPageLoadingProps {
  message?: string;
}

const FullPageLoading: FC<FullPageLoadingProps> = ({ 
  message = "載入中..." 
}) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
      <div className="bg-white rounded-lg p-8 max-w-sm mx-4 text-center shadow-2xl">
        {/* 載入動畫 */}
        <div className="relative">
          <div className="w-16 h-16 mx-auto mb-4">
            <svg
              className="animate-spin w-full h-full text-primary-500"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              ></circle>
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              ></path>
            </svg>
          </div>
          
          {/* 載入點動畫 */}
          <div className="flex justify-center space-x-1 mb-4">
            <div className="w-2 h-2 bg-primary-500 rounded-full animate-bounce"></div>
            <div className="w-2 h-2 bg-primary-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
            <div className="w-2 h-2 bg-primary-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
          </div>
        </div>
        
        {/* 載入訊息 */}
        <div className="text-lg font-medium text-gray-900 mb-2">
          {message}
        </div>
        
        {/* 輔助訊息 */}
        <div className="text-sm text-gray-500">
          正在處理您的請求，請稍候...
        </div>
      </div>
    </div>
  );
};

export default FullPageLoading; 