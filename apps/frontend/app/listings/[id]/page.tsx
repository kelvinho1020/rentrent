"use client";

import { useEffect, useState, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { ListingDetail } from "@/types";
import { getListingDetail } from "@/utils/api";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";

// 從環境變數獲取 Mapbox API Key
const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_API_KEY;
if (typeof window !== 'undefined' && MAPBOX_TOKEN) {
  mapboxgl.accessToken = MAPBOX_TOKEN;
}

export default function ListingDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const [listing, setListing] = useState<ListingDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);

  useEffect(() => {
    const fetchListing = async () => {
      setIsLoading(true);
      try {
        const data = await getListingDetail(parseInt(params.id));
        setListing(data);
        setError(null);
      } catch (err) {
        console.error("獲取租屋物件失敗:", err);
        setError("無法載入租屋物件詳細資訊，請稍後再試");
      } finally {
        setIsLoading(false);
      }
    };

    fetchListing();
  }, [params.id]);

  // 初始化地圖
  useEffect(() => {
    if (!listing || !mapContainer.current || !MAPBOX_TOKEN || map.current) return;

    try {
      const [lng, lat] = listing.coordinates;
      
      map.current = new mapboxgl.Map({
        container: mapContainer.current,
        style: "mapbox://styles/mapbox/streets-v11",
        center: [lng, lat],
        zoom: 15,
        interactive: true,
      });

      // 添加導航控制
      map.current.addControl(
        new mapboxgl.NavigationControl({ showCompass: false }),
        "top-right"
      );

      // 添加標記
      new mapboxgl.Marker({ color: "#4c70f7" })
        .setLngLat([lng, lat])
        .setPopup(
          new mapboxgl.Popup({ offset: 25 })
            .setHTML(`<h3 class="font-bold">${listing.title}</h3><p>${listing.address}</p>`)
        )
        .addTo(map.current);
    } catch (error) {
      console.error("初始化地圖失敗:", error);
    }

    return () => {
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, [listing]);

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8 flex justify-center">
        <div className="text-center">
          <svg
            className="animate-spin h-12 w-12 mx-auto mb-3 text-primary-500"
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
          <div className="text-lg text-gray-600">正在載入租屋資訊...</div>
        </div>
      </div>
    );
  }

  if (error || !listing) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-red-50 p-4 rounded-lg">
          <div className="text-xl text-red-700 mb-2">發生錯誤</div>
          <div className="text-red-600">{error || "找不到該租屋物件"}</div>
          <Link href="/" className="btn btn-primary mt-4">
            返回首頁
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <Link href="/" className="text-primary-600 hover:text-primary-700 mb-4 inline-block">
        &larr; 返回搜尋
      </Link>

      <div className="bg-white rounded-lg shadow-lg overflow-hidden">
        {/* 標題和價格 */}
        <div className="p-6 border-b border-gray-200">
          <h1 className="text-3xl font-bold text-gray-900">{listing.title}</h1>
          <div className="flex items-center justify-between mt-2">
            <div className="text-2xl font-bold text-primary-600">
              NT$ {listing.price.toLocaleString()} / 月
            </div>
            <div className="text-sm text-gray-500">
              資料更新時間: {new Date(listing.last_updated || "").toLocaleDateString()}
            </div>
          </div>
        </div>

        {/* 圖片展示 */}
        <div className="p-6 border-b border-gray-200">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {listing.image_urls && listing.image_urls.length > 0 ? (
              listing.image_urls.slice(0, 4).map((url, index) => (
                <div key={index} className="aspect-w-16 aspect-h-9 relative h-64">
                  <img
                    src={url}
                    alt={`${listing.title} 圖片 ${index + 1}`}
                    className="object-cover rounded-lg w-full h-full"
                  />
                </div>
              ))
            ) : (
              <div className="aspect-w-16 aspect-h-9 bg-gray-200 flex items-center justify-center rounded-lg h-64">
                <span className="text-gray-500">無圖片</span>
              </div>
            )}
          </div>
        </div>

        {/* 地圖和基本資訊 */}
        <div className="p-6 grid grid-cols-1 lg:grid-cols-2 gap-6 border-b border-gray-200">
          {/* 左側：地圖 */}
          <div className="h-80 rounded-lg overflow-hidden shadow-inner">
            {MAPBOX_TOKEN ? (
              <div ref={mapContainer} className="w-full h-full" />
            ) : (
              <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                <p className="text-gray-500">地圖 API 金鑰缺失</p>
              </div>
            )}
          </div>

          {/* 右側：基本資訊 */}
          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">基本資訊</h2>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <div className="text-sm text-gray-500">坪數</div>
                <div className="text-lg font-medium">{listing.size_ping} 坪</div>
              </div>
              {listing.room_type && (
                <div>
                  <div className="text-sm text-gray-500">格局</div>
                  <div className="text-lg font-medium">{listing.room_type}</div>
                </div>
              )}
              {listing.house_type && (
                <div>
                  <div className="text-sm text-gray-500">房屋類型</div>
                  <div className="text-lg font-medium">{listing.house_type}</div>
                </div>
              )}
              {listing.floor && (
                <div>
                  <div className="text-sm text-gray-500">樓層</div>
                  <div className="text-lg font-medium">
                    {listing.floor} {listing.total_floor && `/ ${listing.total_floor}`}
                  </div>
                </div>
              )}
            </div>

            <h2 className="text-xl font-semibold text-gray-900 mb-4">位置資訊</h2>
            <div className="mb-2">
              <div className="text-sm text-gray-500">地址</div>
              <div className="text-lg font-medium">{listing.address}</div>
            </div>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <div className="text-sm text-gray-500">城市</div>
                <div className="text-lg font-medium">{listing.city}</div>
              </div>
              <div>
                <div className="text-sm text-gray-500">行政區</div>
                <div className="text-lg font-medium">{listing.district}</div>
              </div>
              {listing.commute_time && (
                <div>
                  <div className="text-sm text-gray-500">估計通勤時間</div>
                  <div className="text-lg font-medium text-green-600">
                    {listing.commute_time} 分鐘
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 房屋描述 */}
        {listing.description && (
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">房屋描述</h2>
            <div className="text-gray-700 whitespace-pre-line">{listing.description}</div>
          </div>
        )}

        {/* 房屋設施 */}
        {listing.facilities && listing.facilities.length > 0 && (
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">設施與服務</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {listing.facilities.map((facility, index) => (
                <div key={index} className="flex items-center">
                  <svg
                    className="h-5 w-5 text-green-500 mr-2"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M5 13l4 4L19 7"
                    ></path>
                  </svg>
                  <span className="text-gray-700">{facility}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 聯絡資訊 */}
        <div className="p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">聯絡資訊</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {listing.contact_name && (
              <div>
                <div className="text-sm text-gray-500">聯絡人</div>
                <div className="text-lg font-medium">{listing.contact_name}</div>
              </div>
            )}
            {listing.contact_phone && (
              <div>
                <div className="text-sm text-gray-500">電話</div>
                <div className="text-lg font-medium">{listing.contact_phone}</div>
              </div>
            )}
          </div>
          
          <div className="mt-6 flex flex-col sm:flex-row gap-3">
            <button className="btn btn-primary flex-1 sm:flex-none px-6">
              聯絡房東
            </button>
            {listing.url && (
              <a
                href={listing.url}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-secondary flex-1 sm:flex-none px-6 inline-flex items-center justify-center"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
                查看原始頁面
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}