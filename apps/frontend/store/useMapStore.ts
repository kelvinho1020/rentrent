import { create } from "zustand";
import { Coordinates } from "@/types";

interface MapState {
  workLocation: Coordinates | null;
  commuteTime: number;
  maxDistance: number;
  isochromePolygon: GeoJSON.Feature | null;
  isLoading: boolean;
  isFullPageLoading: boolean;
  fullPageLoadingMessage: string;
  availableListings: any[]; // 後端返回的原始房屋列表
  filteredListings: any[]; // 經過等時線篩選的房屋列表

  // Actions
  setWorkLocation: (location: Coordinates | null) => void;
  setCommuteTime: (minutes: number) => void;
  setMaxDistance: (distance: number) => void;
  setIsochromePolygon: (polygon: GeoJSON.Feature | null) => void;
  setIsLoading: (loading: boolean) => void;
  setFullPageLoading: (loading: boolean, message?: string) => void;
  setAvailableListings: (listings: any[]) => void;
  setFilteredListings: (listings: any[]) => void;
  reset: () => void;
}

const initialState = {
  workLocation: null,
  commuteTime: 30,
  maxDistance: 10,
  isochromePolygon: null,
  isLoading: false,
  isFullPageLoading: false,
  fullPageLoadingMessage: "",
  availableListings: [],
  filteredListings: [],
};

export const useMapStore = create<MapState>((set) => ({
  ...initialState,

  setWorkLocation: (location) => set({ workLocation: location }),
  setCommuteTime: (minutes) => set({ commuteTime: minutes }),
  setMaxDistance: (distance) => set({ maxDistance: distance }),
  setIsochromePolygon: (polygon) => set({ isochromePolygon: polygon }),
  setIsLoading: (loading) => set({ isLoading: loading }),
  setFullPageLoading: (loading, message = "載入中...") => set({ 
    isFullPageLoading: loading, 
    fullPageLoadingMessage: message 
  }),
  setAvailableListings: (listings) => set({ availableListings: listings }),
  setFilteredListings: (listings) => set({ filteredListings: listings }),
  reset: () => set(initialState),
})); 