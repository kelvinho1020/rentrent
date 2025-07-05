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
];

const SearchPanel: FC = () => {
  const {
    workLocation,
    commuteTime,
    maxDistance,
    filteredListings,
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
      
      let resultMessage = `找到 ${response.total} 筆符合條件的租屋物件`;
      
      setSearchResult(resultMessage);
      
      const filterInfo = [];
      if (minPrice) filterInfo.push(`最低租金 ${minPrice.toLocaleString()}元`);
      if (maxPrice) filterInfo.push(`最高租金 ${maxPrice.toLocaleString()}元`);
      if (minSize) filterInfo.push(`最小坪數 ${minSize}坪`);
      if (city) filterInfo.push(`城市: ${city}`);
      if (district) filterInfo.push(`區域: ${district}`);
      filterInfo.push(`通勤時間 ≤ ${commuteTime}分鐘`);
      
      if (filterInfo.length > 1) {
        console.log(`🔍 篩選條件: ${filterInfo.join(', ')}`);
      }
    } catch (err) {
      console.error("搜尋失敗:", err);
      setError("搜尋過程中發生錯誤，請稍後再試");
    } finally {
      setIsLoading(false);
      setFullPageLoading(false);
    }
  };

  useEffect(() => {
    if (filteredListings.length > 0) {
      const resultMessage = `找到 ${filteredListings.length} 筆符合條件的租屋物件（圈圈範圍內）`;
      setSearchResult(resultMessage);
    } else if (filteredListings.length === 0 && searchResult?.includes("正在進行圈圈範圍篩選")) {
      // 如果篩選完成但沒有結果
      setSearchResult("沒有房屋在通勤圈圈範圍內，請嘗試增加通勤時間或距離");
    }
  }, [filteredListings, searchResult]);

  const handleDisabledButtonClick = () => {
    if (!workLocation) {
      setError("請先在地圖上點選您的工作地點");
    }
  };

  return (
    <div className="bg-white p-4 rounded-lg shadow-md">
      <h2 className="text-xl font-semibold text-gray-900 mb-4">搜尋設定a</h2>
      
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
        <label className="label mb-1">工作地點 <span className="text-red-500">*</span></label>
        <div className={`text-sm p-3 rounded-md border ${workLocation ? 'bg-green-50 border-green-200' : 'bg-yellow-50 border-yellow-200'}`}>
          {workLocation ? (
            <div className="flex items-center">
              <span className="text-green-600 mr-2">✓</span>
              <span className="text-green-700 font-medium">
                已選擇工作地點 ({workLocation.longitude.toFixed(4)}, {workLocation.latitude.toFixed(4)})
              </span>
            </div>
          ) : (
            <div className="flex items-center">
              <span className="text-yellow-600 mr-2">⚠️</span>
              <span className="text-yellow-700 font-medium">
                請先在右側地圖上點選您的工作地點
              </span>
            </div>
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
        <div className="grid grid-cols-3 gap-2">
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
      
      {/* 搜尋按鈕區域 */}
      <div className="space-y-2">
        <button 
          className={`w-full font-medium py-3 px-4 rounded-md transition-all duration-200 ${
            workLocation 
              ? 'bg-primary-600 hover:bg-primary-700 text-white shadow-md hover:shadow-lg focus:ring-2 focus:ring-primary-500 focus:ring-offset-2' 
              : 'bg-gray-300 text-gray-500 cursor-not-allowed'
          }`}
          onClick={workLocation ? handleSearch : handleDisabledButtonClick}
          disabled={!workLocation}
        >
          {workLocation ? '🔍 開始搜尋租屋' : '請先選擇地點'}
        </button>
      </div>
    </div>
  );
};

export default SearchPanel; 