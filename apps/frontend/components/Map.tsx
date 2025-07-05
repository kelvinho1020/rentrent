import "mapbox-gl/dist/mapbox-gl.css";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import mapboxgl from "mapbox-gl";
import { useMapStore } from "@/store/useMapStore";
import { getIsochrone } from "@/utils/api";
import { ListingBasic } from "@/types";
import { createRoot } from "react-dom/client";

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_API_KEY;
if (!MAPBOX_TOKEN) {
	console.error("Mapbox API key is missing!");
}
mapboxgl.accessToken = MAPBOX_TOKEN || "";

function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
	const R = 6371;
	const dLat = (lat2 - lat1) * Math.PI / 180;
	const dLon = (lon2 - lon1) * Math.PI / 180;
	const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
		Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
		Math.sin(dLon/2) * Math.sin(dLon/2);
	const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
	return R * c;
}

function isPointInIsochrone(point: [number, number], polygon: any): boolean {
	try {
		const properties = polygon.properties;
		if (properties?.radius && properties?.center) {
			const [centerLng, centerLat] = properties.center;
			const radius = properties.radius;
			const distance = calculateDistance(centerLat, centerLng, point[1], point[0]);
			return distance <= radius;
		}
		return true;
	} catch (error) {
		console.error("檢測點在等時線內失敗:", error);
		return true;
	}
}

function getMarkerColor(commuteTime?: number): string {
	if (!commuteTime) return "#e67e22";
	if (commuteTime <= 15) return "#10b981";
	if (commuteTime <= 30) return "#3b82f6";
	if (commuteTime > 45) return "#ef4444";
	return "#e67e22";
}

export default function Map() {
	const router = useRouter();
	const mapContainer = useRef<HTMLDivElement>(null);
	const map = useRef<mapboxgl.Map | null>(null);
	const markers = useRef<mapboxgl.Marker[]>([]);
	const [mapInitialized, setMapInitialized] = useState(false);
	
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
		
		map.current = new mapboxgl.Map({
			container: mapContainer.current,
			style: "mapbox://styles/mapbox/streets-v11",
			center: [121.5654, 25.0330],
			zoom: 12,
		});
		
		map.current.on("load", () => {
			setMapInitialized(true);
		});
		
		map.current.addControl(
			new mapboxgl.NavigationControl({ showCompass: false }),
			"top-right"
		);
		
		map.current.on("click", (e) => {
			const { lng, lat } = e.lngLat;
			useMapStore.getState().setWorkLocation({
				longitude: lng,
				latitude: lat,
			});
		});
		
		map.current.addControl(new mapboxgl.ScaleControl(), "bottom-left");

		return () => {
			map.current?.remove();
			map.current = null;
			setMapInitialized(false);
		};
	}, []);
	
	// 處理工作地點變更
	useEffect(() => {
		if (!map.current || !workLocation || !mapInitialized) return;
		
		// 清除工作地點標記
		markers.current.forEach((marker) => marker.remove());
		markers.current = [];
		
		// 添加工作地點標記
		const marker = new mapboxgl.Marker({ 
			color: "#4c70f7",
			scale: 1.2
		})
			.setLngLat([workLocation.longitude, workLocation.latitude])
			.addTo(map.current);
		
		markers.current.push(marker);
		
		// 獲取等時線
		const fetchIsochrone = async () => {
			try {
				setIsLoading(true);
				setFullPageLoading(true, "正在生成通勤範圍圈...");
				const data = await getIsochrone(
					workLocation.latitude,
					workLocation.longitude,
					commuteTime,
					maxDistance
				);
				
				if (data?.features?.length > 0) {
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
	
	// 處理等時線顯示
	useEffect(() => {
		if (!map.current || !isochromePolygon || !mapInitialized) return;
		
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
		};
		
		if (map.current.loaded()) {
			addIsochroneLayer();
		} else {
			map.current.on("load", addIsochroneLayer);
		}
	}, [isochromePolygon, mapInitialized]);
	
	// 處理租屋物件顯示
	useEffect(() => {
		if (!map.current || !mapInitialized) return;
		
		// 清除租屋物件標記
		markers.current.slice(1).forEach((marker) => marker.remove());
		markers.current = markers.current.slice(0, 1);
		
		// 過濾在等時線範圍內的房屋
		const filteredListings = availableListings.filter((listing: ListingBasic) => {
			if (!isochromePolygon) return true;
			const point: [number, number] = [listing.coordinates[0], listing.coordinates[1]];
			return isPointInIsochrone(point, isochromePolygon);
		});
		
		setFilteredListings(filteredListings);
		
		// 添加租屋物件標記
		filteredListings.forEach((listing: ListingBasic) => {
			const popupNode = document.createElement("div");
			const popupRoot = createRoot(popupNode);
			
			const markerColor = getMarkerColor(listing.commute_time);
			
			const markerElement = document.createElement("div");
			markerElement.className = "cursor-pointer hover:scale-110 transition-transform duration-200";
			markerElement.style.width = "20px";
			markerElement.style.height = "20px";
			markerElement.style.backgroundColor = markerColor;
			markerElement.style.borderRadius = "50%";
			markerElement.style.border = "2px solid white";
			markerElement.style.boxShadow = "0 2px 4px rgba(0,0,0,0.3)";
			
			markerElement.addEventListener("click", (e) => {
				e.stopPropagation();
				router.push(`/listings/${listing.id}`);
			});
			
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
		});
	}, [availableListings, workLocation, mapInitialized, isochromePolygon, router, setFilteredListings]);

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