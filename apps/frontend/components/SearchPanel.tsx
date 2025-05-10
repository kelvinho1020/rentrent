import { FC, useState, useEffect } from "react";
import { useMapStore } from "@/store/useMapStore";
import { searchByCommuteTime } from "@/utils/api";
import { ListingBasic } from "@/types";

const commuteTimes = [
  { value: 15, label: "15 分鐘" },
  { value: 30, label: "30 分鐘" },
  { value: 45, label: "45 分鐘" },
  { value: 60, label: "60 分鐘" },
];

const SearchPanel: FC = () => {
  const {
    workLocation,
    commuteTime,
    setCommuteTime,
    setAvailableListings,
    setIsLoading,
  } = useMapStore();

  const [minPrice, setMinPrice] = useState<number | undefined>(undefined);
  const [maxPrice, setMaxPrice] = useState<number | undefined>(undefined);
  const [minSize, setMinSize] = useState<number | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);

  // 執行搜尋
  const handleSearch = async () => {
    if (!workLocation) {
      setError("請在地圖上選擇工作地點");
      return;
    }

    setError(null);
    setIsLoading(true);

    try {
      const response = await searchByCommuteTime({
        work_location: workLocation,
        max_commute_time: commuteTime,
        min_price: minPrice,
        max_price: maxPrice,
        min_size: minSize,
      });
      
      setAvailableListings(response.results);
    } catch (err) {
      console.error("搜尋失敗:", err);
      setError("搜尋過程中發生錯誤，請稍後再試");
    } finally {
      setIsLoading(false);
    }
  };

  // 當工作地點或通勤時間變更時，自動搜尋
  useEffect(() => {
    if (workLocation) {
      handleSearch();
    }
  }, [workLocation, commuteTime]);

  return (
    <div className="bg-white p-4 rounded-lg shadow-md">
      <h2 className="text-xl font-semibold text-gray-900 mb-4">搜尋設定</h2>
      
      {error && (
        <div className="mb-4 p-2 bg-red-50 text-red-700 text-sm rounded">
          {error}
        </div>
      )}
      
      <div className="mb-4">
        <label className="label mb-1">工作地點</label>
        <div className="text-sm">
          {workLocation ? (
            <span className="text-green-600">
              已選擇 (經度: {workLocation.longitude.toFixed(4)}, 緯度: {workLocation.latitude.toFixed(4)})
            </span>
          ) : (
            <span className="text-gray-500">請在地圖上點選位置</span>
          )}
        </div>
      </div>
      
      <div className="mb-4">
        <label className="label mb-1">通勤時間上限</label>
        <div className="grid grid-cols-4 gap-2">
          {commuteTimes.map((time) => (
            <button
              key={time.value}
              className={`btn text-sm py-1 ${
                commuteTime === time.value ? "btn-primary" : "btn-secondary"
              }`}
              onClick={() => setCommuteTime(time.value)}
            >
              {time.label}
            </button>
          ))}
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <label htmlFor="minPrice" className="label mb-1">最低租金</label>
          <input
            id="minPrice"
            type="number"
            min={0}
            step={1000}
            className="input"
            placeholder="不限"
            value={minPrice || ""}
            onChange={(e) => setMinPrice(e.target.value ? Number(e.target.value) : undefined)}
          />
        </div>
        <div>
          <label htmlFor="maxPrice" className="label mb-1">最高租金</label>
          <input
            id="maxPrice"
            type="number"
            min={0}
            step={1000}
            className="input"
            placeholder="不限"
            value={maxPrice || ""}
            onChange={(e) => setMaxPrice(e.target.value ? Number(e.target.value) : undefined)}
          />
        </div>
      </div>
      
      <div className="mb-6">
        <label htmlFor="minSize" className="label mb-1">最小坪數</label>
        <input
          id="minSize"
          type="number"
          min={0}
          step={1}
          className="input"
          placeholder="不限"
          value={minSize || ""}
          onChange={(e) => setMinSize(e.target.value ? Number(e.target.value) : undefined)}
        />
      </div>
      
      <button className="btn btn-primary w-full" onClick={handleSearch}>
        搜尋租屋
      </button>
    </div>
  );
};

export default SearchPanel; 