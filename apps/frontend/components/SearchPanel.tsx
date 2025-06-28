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

const distanceOptions = [
  { value: 3, label: "3 公里" },
  { value: 5, label: "5 公里" },
  { value: 10, label: "10 公里" },
  { value: 15, label: "15 公里" },
];

const SearchPanel: FC = () => {
  const {
    workLocation,
    commuteTime,
    maxDistance,
    setCommuteTime,
    setMaxDistance,
    setAvailableListings,
    setIsLoading,
    setFullPageLoading,
  } = useMapStore();

  const [minPrice, setMinPrice] = useState<number | undefined>(undefined);
  const [maxPrice, setMaxPrice] = useState<number | undefined>(undefined);
  const [minSize, setMinSize] = useState<number | undefined>(undefined);
  const [city, setCity] = useState<string | undefined>(undefined);
  const [district, setDistrict] = useState<string | undefined>(undefined);
  const [transitMode, setTransitMode] = useState<string>("driving");
  const [error, setError] = useState<string | null>(null);
  const [searchResult, setSearchResult] = useState<string | null>(null);

  // 執行搜尋
  const handleSearch = async () => {
    if (!workLocation) {
      setError("請在地圖上選擇工作地點");
      return;
    }

    setError(null);
    setSearchResult(null);
    setIsLoading(true);
    setFullPageLoading(true, "正在搜尋符合條件的租屋物件...");

    try {
      const response = await searchByCommuteTime({
        work_location: workLocation,
        max_commute_time: commuteTime,
        transit_mode: transitMode,
        min_price: minPrice,
        max_price: maxPrice,
        min_size: minSize,
        city,
        district,
        max_distance: maxDistance,
      });
      
      setAvailableListings(response.results);
      
      // 顯示搜尋結果摘要
      if (response.note) {
        setSearchResult(`找到 ${response.total} 筆資料 (${response.note})`);
      } else {
        setSearchResult(`找到 ${response.total} 筆符合通勤時間的租屋物件`);
      }
    } catch (err) {
      console.error("搜尋失敗:", err);
      setError("搜尋過程中發生錯誤，請稍後再試");
    } finally {
      setIsLoading(false);
      setFullPageLoading(false);
    }
  };

  return (
    <div className="bg-white p-4 rounded-lg shadow-md">
      <h2 className="text-xl font-semibold text-gray-900 mb-4">搜尋設定</h2>
      
      {error && (
        <div className="mb-4 p-2 bg-red-50 text-red-700 text-sm rounded">
          {error}
        </div>
      )}
      
      {searchResult && (
        <div className="mb-4 p-2 bg-green-50 text-green-700 text-sm rounded">
          {searchResult}
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
      
      <div className="mb-4">
        <label className="label mb-1">交通方式</label>
        <div className="grid grid-cols-3 gap-2">
          <button
            className={`btn text-sm py-1 ${
              transitMode === "driving" ? "btn-primary" : "btn-secondary"
            }`}
            onClick={() => setTransitMode("driving")}
          >
            開車
          </button>
          <button
            className={`btn text-sm py-1 ${
              transitMode === "transit" ? "btn-primary" : "btn-secondary"
            }`}
            onClick={() => setTransitMode("transit")}
          >
            大眾運輸
          </button>
          <button
            className={`btn text-sm py-1 ${
              transitMode === "walking" ? "btn-primary" : "btn-secondary"
            }`}
            onClick={() => setTransitMode("walking")}
          >
            步行
          </button>
        </div>
      </div>
      
      <div className="mb-4">
        <label className="label mb-1">最大距離 (無法計算通勤時時使用)</label>
        <div className="grid grid-cols-4 gap-2">
          {distanceOptions.map((option) => (
            <button
              key={option.value}
              className={`btn text-sm py-1 ${
                maxDistance === option.value ? "btn-primary" : "btn-secondary"
              }`}
              onClick={() => setMaxDistance(option.value)}
            >
              {option.label}
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
      
      <div className="mb-4">
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
      
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <label htmlFor="city" className="label mb-1">城市</label>
          <select
            id="city"
            className="select input"
            value={city || ""}
            onChange={(e) => {
              const value = e.target.value;
              setCity(value || undefined);
              setDistrict(undefined); // 重置區域
            }}
          >
            <option value="">不限</option>
            <option value="台北市">台北市</option>
            <option value="新北市">新北市</option>
            <option value="桃園市">桃園市</option>
          </select>
        </div>
        <div>
          <label htmlFor="district" className="label mb-1">行政區</label>
          <select
            id="district"
            className="select input"
            value={district || ""}
            onChange={(e) => setDistrict(e.target.value || undefined)}
            disabled={!city}
          >
            <option value="">不限</option>
            {city === "台北市" && (
              <>
                <option value="中正區">中正區</option>
                <option value="大同區">大同區</option>
                <option value="中山區">中山區</option>
                <option value="松山區">松山區</option>
                <option value="大安區">大安區</option>
                <option value="萬華區">萬華區</option>
                <option value="信義區">信義區</option>
                <option value="士林區">士林區</option>
                <option value="北投區">北投區</option>
                <option value="內湖區">內湖區</option>
                <option value="南港區">南港區</option>
                <option value="文山區">文山區</option>
              </>
            )}
            {city === "新北市" && (
              <>
                <option value="板橋區">板橋區</option>
                <option value="三重區">三重區</option>
                <option value="中和區">中和區</option>
                <option value="永和區">永和區</option>
                <option value="新莊區">新莊區</option>
                <option value="新店區">新店區</option>
                <option value="土城區">土城區</option>
                <option value="蘆洲區">蘆洲區</option>
                <option value="汐止區">汐止區</option>
                <option value="樹林區">樹林區</option>
                <option value="淡水區">淡水區</option>
              </>
            )}
            {city === "桃園市" && (
              <>
                <option value="桃園區">桃園區</option>
                <option value="中壢區">中壢區</option>
                <option value="平鎮區">平鎮區</option>
                <option value="八德區">八德區</option>
                <option value="楊梅區">楊梅區</option>
                <option value="龜山區">龜山區</option>
              </>
            )}
          </select>
        </div>
      </div>
      
      <button 
        className="btn btn-primary w-full" 
        onClick={handleSearch}
        disabled={!workLocation}
      >
        搜尋租屋
      </button>
    </div>
  );
};

export default SearchPanel; 