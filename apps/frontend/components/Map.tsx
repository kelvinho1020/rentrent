import { useEffect, useRef, useState } from "react";
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
  console.error("Mapbox API key is missing! Set NEXT_PUBLIC_MAPBOX_API_KEY in .env.local");
}
mapboxgl.accessToken = MAPBOX_TOKEN || "";

export default function Map() {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const markers = useRef<mapboxgl.Marker[]>([]);
  const [mapInitialized, setMapInitialized] = useState(false);
  const [isochroneLoaded, setIsochroneLoaded] = useState(false);
  
  const {
    workLocation,
    commuteTime,
    availableListings,
    isochromePolygon,
    setIsochromePolygon,
    setIsLoading,
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
  
  // 當工作地點變更時，添加標記並獲取等時線
  useEffect(() => {
    if (!map.current || !workLocation || !mapInitialized) return;
    
    console.log("Work location changed:", workLocation);
    
    // 清除現有的工作地點標記
    markers.current.forEach((marker) => marker.remove());
    markers.current = [];
    
    // 添加工作地點標記
    const marker = new mapboxgl.Marker({ color: "#4c70f7" })
      .setLngLat([workLocation.longitude, workLocation.latitude])
      .addTo(map.current);
    
    markers.current.push(marker);
    
    // 移動地圖至新位置
    map.current.flyTo({
      center: [workLocation.longitude, workLocation.latitude],
      zoom: 13,
      essential: true,
    });
    
    // 獲取等時線
    const fetchIsochrone = async () => {
      try {
        setIsLoading(true);
        console.log("Fetching isochrone for:", workLocation, commuteTime);
        const data = await getIsochrone(
          workLocation.latitude,
          workLocation.longitude,
          commuteTime
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
      }
    };
    
    fetchIsochrone();
  }, [workLocation, commuteTime, setIsLoading, setIsochromePolygon, mapInitialized]);
  
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
    if (!map.current || !isochroneLoaded || !mapInitialized) return;
    
    console.log("Available listings changed:", availableListings.length);
    
    // 清除現有的租屋物件標記 (保留工作地點標記)
    markers.current.slice(1).forEach((marker) => marker.remove());
    markers.current = markers.current.slice(0, 1);
    
    // 添加租屋物件標記
    availableListings.forEach((listing: ListingBasic) => {
      // 創建自定義 Popup 元素
      const popupNode = document.createElement("div");
      const popupRoot = createRoot(popupNode);
      
      // 添加標記
      const marker = new mapboxgl.Marker({ color: "#e67e22" })
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
  }, [availableListings, isochroneLoaded, mapInitialized]);

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