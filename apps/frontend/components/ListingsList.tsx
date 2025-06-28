import { FC } from "react";
import Link from "next/link";
import { useMapStore } from "@/store/useMapStore";
import { ListingBasic } from "@/types";

const ListingItem: FC<{ listing: ListingBasic }> = ({ listing }) => {
  return (
    <div className="bg-white p-4 rounded-lg shadow-card hover:shadow-lg transition-shadow duration-200">
      <h3 className="text-lg font-semibold text-gray-900 truncate mb-1">{listing.title}</h3>
      <div className="text-xl font-medium text-primary-600 mb-2">
        NT$ {listing.price.toLocaleString()} / 月
      </div>
      
      <div className="text-sm text-gray-500 mb-2 truncate">{listing.address}</div>
      
      <div className="flex justify-between items-center mb-3">
        <div className="text-sm text-gray-700">
          <span className="font-medium">{listing.size_ping}</span> 坪
        </div>
        {listing.commute_time && (
          <div className="text-sm text-green-600">
            通勤時間: <span className="font-medium">{listing.commute_time}</span> 分鐘
          </div>
        )}
      </div>
      
      <div className="mb-3">
        <span className="inline-block text-xs text-gray-600 bg-gray-100 px-2 py-1 rounded-full mr-1">
          {listing.city}
        </span>
        <span className="inline-block text-xs text-gray-600 bg-gray-100 px-2 py-1 rounded-full">
          {listing.district}
        </span>
      </div>
      
      <Link href={`/listings/${listing.id}`} className="btn btn-primary w-full text-center text-sm">
        查看詳情
      </Link>
    </div>
  );
};

const ListingsList: FC = () => {
  const { availableListings, isLoading, workLocation } = useMapStore();

  if (isLoading) {
    return (
      <div className="p-4 text-center text-gray-600">
        <svg
          className="animate-spin h-8 w-8 mx-auto mb-2 text-primary-500"
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
        <div>正在搜尋符合條件的租屋物件...</div>
      </div>
    );
  }

  if (!workLocation) {
    return (
      <div className="p-4 text-center text-gray-600">
        請在地圖上選擇工作地點，開始搜尋附近的租屋物件
      </div>
    );
  }

  if (availableListings.length === 0) {
    return (
      <div className="p-4 text-center text-gray-600">
        找不到符合條件的租屋物件，請嘗試調整搜尋條件或增加通勤時間上限
      </div>
    );
  }

  // 依照價格排序
  const sortedListings = [...availableListings].sort((a, b) => a.price - b.price);

  return (
    <div className="p-4">
      <div className="mb-4 text-gray-700 font-medium">
        找到 {availableListings.length} 個符合條件的租屋物件
      </div>
      <div className="grid grid-cols-1 gap-4">
        {sortedListings.map((listing: ListingBasic) => (
          <ListingItem key={listing.id} listing={listing} />
        ))}
      </div>
    </div>
  );
};

export default ListingsList; 