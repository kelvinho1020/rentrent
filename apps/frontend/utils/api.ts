import axios from "axios";
import { CommuteSearchRequest, ListingBasic, ListingDetail, SearchResponse } from "@/types";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

const api = axios.create({
  baseURL: API_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// 依通勤時間搜尋租屋物件
export const searchByCommuteTime = async (params: CommuteSearchRequest): Promise<SearchResponse> => {
  const response = await api.post("/commute/search", params);
  return response.data;
};

// 獲取等時線 (時間範圍多邊形)
export const getIsochrone = async (
  lat: number,
  lng: number,
  minutes: number,
  profile = "driving"
): Promise<any> => {
  const response = await api.get(`/commute/isochrone/${minutes}`, {
    params: { lat, lng, profile },
  });
  return response.data;
};

// 獲取租屋物件列表
export const getListings = async (params: Record<string, any>): Promise<ListingBasic[]> => {
  const response = await api.get("/listings", { params });
  return response.data;
};

// 獲取租屋物件詳情
export const getListingDetail = async (id: number): Promise<ListingDetail> => {
  const response = await api.get(`/listings/${id}`);
  return response.data;
};

// 獲取城市列表
export const getCities = async (): Promise<string[]> => {
  const response = await api.get("/cities");
  return response.data;
};

// 獲取行政區列表
export const getDistricts = async (city?: string): Promise<string[]> => {
  const response = await api.get("/districts", { params: { city } });
  return response.data;
}; 