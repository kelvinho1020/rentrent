"use client";

import dynamic from "next/dynamic";
import { useState, useEffect } from "react";
import SearchPanel from "@/components/SearchPanel";
import ListingsList from "@/components/ListingsList";
import FullPageLoading from "@/components/FullPageLoading";
import { useMapStore } from "@/store/useMapStore";

// 動態導入地圖元件，避免 SSR 時報錯
const Map = dynamic(() => import("@/components/Map"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-gray-100">
      <div className="text-center">
        <div className="text-lg text-gray-500">地圖載入中...</div>
      </div>
    </div>
  ),
});

export default function Home() {
  const [leftPanelTab, setLeftPanelTab] = useState<"search" | "results">("search");
  const [mapLoaded, setMapLoaded] = useState(false);
  const { isFullPageLoading, fullPageLoadingMessage } = useMapStore();

  // 監聽頁面加載完成，設置地圖容器的高度
  useEffect(() => {
    console.log("Page loaded");
    // 延遲設置，確保DOM已經完全渲染
    const timer = setTimeout(() => {
      setMapLoaded(true);
      console.log("Map container should be visible now");
    }, 100);
    
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="flex flex-col h-full">
      {/* 全頁面載入中 */}
      {isFullPageLoading && (
        <FullPageLoading message={fullPageLoadingMessage} />
      )}
      
      <div className="flex-1 grid grid-cols-12 h-full">
        {/* 左側面板 */}
        <div className="col-span-12 md:col-span-4 lg:col-span-3 border-r border-gray-200 flex flex-col h-full overflow-hidden">
          {/* 頁籤切換 */}
          <div className="flex border-b border-gray-200">
            <button
              className={`flex-1 py-3 px-4 text-center font-medium text-sm ${
                leftPanelTab === "search"
                  ? "text-primary-600 border-b-2 border-primary-600"
                  : "text-gray-500 hover:text-gray-900"
              }`}
              onClick={() => setLeftPanelTab("search")}
            >
              搜尋設定
            </button>
            <button
              className={`flex-1 py-3 px-4 text-center font-medium text-sm ${
                leftPanelTab === "results"
                  ? "text-primary-600 border-b-2 border-primary-600"
                  : "text-gray-500 hover:text-gray-900"
              }`}
              onClick={() => setLeftPanelTab("results")}
            >
              租屋列表
            </button>
          </div>

          {/* 面板內容 */}
          <div className="flex-1 overflow-y-auto">
            {leftPanelTab === "search" && <SearchPanel />}
            {leftPanelTab === "results" && <ListingsList />}
          </div>
        </div>

        {/* 地圖區域 */}
        <div className={`col-span-12 md:col-span-8 lg:col-span-9 min-h-screen-h-0 lg:h-auto transition-opacity duration-500 ${mapLoaded ? 'opacity-100' : 'opacity-0'}`}>
          <Map />
        </div>
      </div>
    </div>
  );
} 