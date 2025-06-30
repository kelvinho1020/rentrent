import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { useMapStore } from "@/store/useMapStore";
import { getIsochrone } from "@/utils/api";
import { ListingBasic } from "@/types";
import { createRoot } from "react-dom/client";
import ListingPopup from "./ListingPopup";

// 從環境變數獲取 Mapbox API Key
const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_API_KEY;
if (!MAPBOX_TOKEN) {
  console.error("Mapbox API key is missing! Set NEXT_PUBLIC_MAPBOX_API_KEY in .env");
}
mapboxgl.accessToken = MAPBOX_TOKEN || "";

// 檢測點是否在等時線範圍內（圓形）
function isPointInIsochrone(point: [number, number], polygon: any): boolean {
  try {
    // 從等時線feature中獲取半徑和中心點資訊
    const properties = polygon.properties;
    if (properties && properties.radius && properties.center) {
      const [centerLng, centerLat] = properties.center;
      const radius = properties.radius; // 半徑（公里）
      
      // 計算點到中心的距離（公里）
      const distance = calculateDistance(centerLat, centerLng, point[1], point[0]);
      
      return distance <= radius;
    }
    
    // 如果沒有半徑資訊，使用複雜的多邊形檢測（備用方案）
    if (polygon.type === 'Polygon' && polygon.coordinates && polygon.coordinates[0]) {
      return isPointInSimplePolygon(point, polygon.coordinates[0]);
    }
    
    console.warn('無法檢測等時線範圍，預設顯示所有房屋');
    return true;
  } catch (error) {
    console.error('檢測點在等時線內失敗:', error);
    return true; // 出錯時預設顯示
  }
}

// 計算兩點之間的距離（公里）
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // 地球半徑（公里）
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

// 簡單的點在多邊形內檢測（備用方案）
function isPointInSimplePolygon(point: [number, number], ring: number[][]): boolean {
  const [x, y] = point;
  let inside = false;
  
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    
    if (((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi)) {
      inside = !inside;
    }
  }
  return inside;
}

export default function Map() {
  const router = useRouter();
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const markers = useRef<mapboxgl.Marker[]>([]);
  const [mapInitialized, setMapInitialized] = useState(false);
  const [isochroneLoaded, setIsochroneLoaded] = useState(false);
  
  const {
    workLocation,
    commuteTime,
    maxDistance,
    availableListings,
    isochromePolygon,
    setIsochromePolygon,
    setIsLoading,
    setFullPageLoading,
    setFilteredListings,
  } = useMapStore();

  // 初始化地圖
  useEffect(() => {
    if (map.current || !mapContainer.current || !MAPBOX_TOKEN) return;
    
    try {
      console.log("Initializing map with token:", MAPBOX_TOKEN.substring(0, 10) + "...");
      
      map.current = new mapboxgl.Map({
        container: mapContainer.current,
        style: "mapbox://styles/mapbox/streets-v11",
        center: [121.5654, 25.0330], // 台北市中心
        zoom: 12,
      });
      
      map.current.on("load", () => {
        console.log("Map loaded successfully");
        setMapInitialized(true);
      });
      
      // 添加導航控制
      map.current.addControl(
        new mapboxgl.NavigationControl({ showCompass: false }),
        "top-right"
      );
      
      // 添加點擊事件設置工作地點
      map.current.on("click", (e) => {
        const { lng, lat } = e.lngLat;
        console.log("Map clicked at:", lng, lat);
        useMapStore.getState().setWorkLocation({
          longitude: lng,
          latitude: lat,
        });
      });
      
      // 添加比例尺
      map.current.addControl(new mapboxgl.ScaleControl(), "bottom-left");
    } catch (error) {
      console.error("Error initializing map:", error);
    }

    return () => {
      console.log("Cleaning up map");
      map.current?.remove();
      map.current = null;
      setMapInitialized(false);
    };
  }, []);
  
  // 當工作地點、通勤時間或最大距離變更時，添加標記並獲取等時線
  useEffect(() => {
    if (!map.current || !workLocation || !mapInitialized) return;
    
    console.log("Work location, commute time, or max distance changed:", { workLocation, commuteTime, maxDistance });
    
    // 清除現有的工作地點標記
    markers.current.forEach((marker) => marker.remove());
    markers.current = [];
    
    // 添加工作地點標記
    const marker = new mapboxgl.Marker({ 
      color: "#4c70f7",
      scale: 1.2
    })
      .setLngLat([workLocation.longitude, workLocation.latitude])
      .addTo(map.current);
    
    // 添加自定義彈窗
    const popupNode = document.createElement("div");
    const popupRoot = createRoot(popupNode);
    popupRoot.render(
      <div className="p-2">
        <h3 className="font-bold text-primary-600">工作地點</h3>
        <p className="text-sm text-gray-600">
          經度: {workLocation.longitude.toFixed(4)}<br />
          緯度: {workLocation.latitude.toFixed(4)}
        </p>
      </div>
    );
    
    marker.setPopup(
      new mapboxgl.Popup({ offset: 25 })
        .setDOMContent(popupNode)
    );
    
    markers.current.push(marker);
    
    // 獲取等時線
    const fetchIsochrone = async () => {
      try {
        setIsLoading(true);
        setFullPageLoading(true, "正在生成通勤範圍圈...");
        console.log("Fetching isochrone for:", { workLocation, commuteTime, maxDistance });
        const data = await getIsochrone(
          workLocation.latitude,
          workLocation.longitude,
          commuteTime,
          maxDistance
        );
        
        console.log("Isochrone data received:", data);
        
        // 設置等時線多邊形
        if (data && data.features && data.features.length > 0) {
          setIsochromePolygon(data.features[0]);
        }
      } catch (error) {
        console.error("獲取等時線失敗:", error);
      } finally {
        setIsLoading(false);
        setFullPageLoading(false);
      }
    };
    
    fetchIsochrone();
  }, [workLocation, commuteTime, maxDistance, setIsLoading, setIsochromePolygon, mapInitialized]);
  
  // 當等時線變更時，在地圖上顯示
  useEffect(() => {
    if (!map.current || !isochromePolygon || !mapInitialized) return;
    
    console.log("Isochrone polygon changed, updating map");
    
    // 如果地圖已加載
    const addIsochroneLayer = () => {
      // 移除已存在的等時線層
      if (map.current?.getLayer("isochrone-fill")) {
        map.current.removeLayer("isochrone-fill");
      }
      if (map.current?.getLayer("isochrone-outline")) {
        map.current.removeLayer("isochrone-outline");
      }
      if (map.current?.getSource("isochrone")) {
        map.current.removeSource("isochrone");
      }
      
      // 添加新的等時線
      map.current?.addSource("isochrone", {
        type: "geojson",
        data: isochromePolygon,
      });
      
      // 填充層
      map.current?.addLayer({
        id: "isochrone-fill",
        type: "fill",
        source: "isochrone",
        layout: {},
        paint: {
          "fill-color": "#4c70f7",
          "fill-opacity": 0.1,
        },
      });
      
      // 邊界層
      map.current?.addLayer({
        id: "isochrone-outline",
        type: "line",
        source: "isochrone",
        layout: {},
        paint: {
          "line-color": "#4c70f7",
          "line-width": 2,
        },
      });
      
      setIsochroneLoaded(true);
    };
    
    if (map.current.loaded()) {
      addIsochroneLayer();
    } else {
      map.current.on("load", addIsochroneLayer);
    }
  }, [isochromePolygon, mapInitialized]);
  
  // 當可用租屋物件變更時，在地圖上顯示
  useEffect(() => {
    if (!map.current || !mapInitialized) return;
    
    console.log("Available listings changed:", availableListings.length);
    
    // 清除現有的租屋物件標記 (保留工作地點標記)
    markers.current.slice(1).forEach((marker) => marker.remove());
    markers.current = markers.current.slice(0, 1);
    
    // 🎯 雙重篩選策略：
    // 1. 後端已用直線距離預篩選，減少API調用
    // 2. 前端再用等時線範圍篩選，確保只顯示圈圈內的房屋
    const filteredListings = availableListings.filter((listing: ListingBasic) => {
      // 如果沒有等時線多邊形，顯示所有房屋
      if (!isochromePolygon) {
        return true;
      }
      
      // 檢查房屋座標是否在等時線多邊形內
      const point: [number, number] = [listing.coordinates[0], listing.coordinates[1]]; // [lng, lat]
      return isPointInIsochrone(point, isochromePolygon);
    });
    
    console.log(`🔍 搜尋結果：後端返回 ${availableListings.length} 筆房屋`);
    console.log(`🎯 等時線篩選：${filteredListings.length} 筆在圈圈範圍內`);
    
    // 🔄 同步更新 store 中的篩選結果，讓其他組件使用相同的資料
    setFilteredListings(filteredListings);
    
    // 添加租屋物件標記
    filteredListings.forEach((listing: ListingBasic) => {
      // 創建自定義 Popup 元素
      const popupNode = document.createElement("div");
      const popupRoot = createRoot(popupNode);
      
      // 根據通勤時間決定標記顏色
      let markerColor = "#e67e22"; // 默認橙色
      if (listing.commute_time) {
        if (listing.commute_time <= 15) {
          markerColor = "#10b981"; // 綠色 - 通勤時間很短
        } else if (listing.commute_time <= 30) {
          markerColor = "#3b82f6"; // 藍色 - 通勤時間適中
        } else if (listing.commute_time > 45) {
          markerColor = "#ef4444"; // 紅色 - 通勤時間較長
        }
      }
      
      // 創建可點擊的marker元素
      const markerElement = document.createElement("div");
      markerElement.className = "cursor-pointer hover:scale-110 transition-transform duration-200";
      markerElement.style.width = "20px";
      markerElement.style.height = "20px";
      markerElement.style.backgroundColor = markerColor;
      markerElement.style.borderRadius = "50%";
      markerElement.style.border = "2px solid white";
      markerElement.style.boxShadow = "0 2px 4px rgba(0,0,0,0.3)";
      
      // 添加點擊事件 - 導航到房屋詳情頁
      markerElement.addEventListener("click", (e) => {
        e.stopPropagation();
        console.log(`點擊房屋: ${listing.title} (ID: ${listing.id})`);
        router.push(`/listings/${listing.id}`);
      });
      
      // 添加標記
      const marker = new mapboxgl.Marker({ 
        element: markerElement,
        anchor: "center"
      })
        .setLngLat(listing.coordinates)
        .setPopup(
          new mapboxgl.Popup({ offset: 25 }).setDOMContent(popupNode)
        )
        .addTo(map.current!);
      
      markers.current.push(marker);
      
      // 渲染 Popup 內容
      const { content } = ListingPopup({ listing });
      popupRoot.render(content);
    });
    
    // 如果有列表且沒有工作地點標記，調整地圖視圖以包含所有標記
    if (availableListings.length > 0 && markers.current.length > 0 && !workLocation) {
      try {
        const bounds = new mapboxgl.LngLatBounds();
        
        // 將所有標記的位置添加到邊界中
        markers.current.forEach(marker => {
          bounds.extend(marker.getLngLat());
        });
        
        // 調整地圖以適應所有標記
        map.current.fitBounds(bounds, {
          padding: 50,
          maxZoom: 15
        });
      } catch (error) {
        console.error("調整地圖視圖失敗:", error);
      }
    }
  }, [availableListings, workLocation, mapInitialized]);

  console.log("Rendering Map component");

  return (
    <div className="relative w-full h-full">
      <div ref={mapContainer} className="absolute inset-0" />
      {!MAPBOX_TOKEN && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-200 text-red-600 font-bold">
          Error: Mapbox API Key is missing!
        </div>
      )}
    </div>
  );
} 