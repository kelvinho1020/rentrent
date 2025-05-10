import { create } from "zustand";
import { Coordinates } from "@/types";

interface MapState {
  workLocation: Coordinates | null;
  commuteTime: number;
  isochromePolygon: GeoJSON.Feature | null;
  isLoading: boolean;
  availableListings: any[];

  // Actions
  setWorkLocation: (location: Coordinates | null) => void;
  setCommuteTime: (minutes: number) => void;
  setIsochromePolygon: (polygon: GeoJSON.Feature | null) => void;
  setIsLoading: (loading: boolean) => void;
  setAvailableListings: (listings: any[]) => void;
  reset: () => void;
}

const initialState = {
  workLocation: null,
  commuteTime: 30,
  isochromePolygon: null,
  isLoading: false,
  availableListings: [],
};

export const useMapStore = create<MapState>((set) => ({
  ...initialState,

  setWorkLocation: (location) => set({ workLocation: location }),
  setCommuteTime: (minutes) => set({ commuteTime: minutes }),
  setIsochromePolygon: (polygon) => set({ isochromePolygon: polygon }),
  setIsLoading: (loading) => set({ isLoading: loading }),
  setAvailableListings: (listings) => set({ availableListings: listings }),
  reset: () => set(initialState),
})); 