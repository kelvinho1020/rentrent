import { ListingBasic } from "@/types";

// 檢測點是否在等時線範圍內（圓形）
export function isPointInIsochrone(point: [number, number], polygon: any): boolean {
  if (!polygon || !polygon.geometry || !polygon.geometry.coordinates) {
    return false;
  }

  const [lng, lat] = point;
  const coordinates = polygon.geometry.coordinates[0]; // 假設是簡單多邊形

  let inside = false;
  for (let i = 0, j = coordinates.length - 1; i < coordinates.length; j = i++) {
    const xi = coordinates[i][0];
    const yi = coordinates[i][1];
    const xj = coordinates[j][0];
    const yj = coordinates[j][1];

    if (yi > lat !== yj > lat && lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) {
      inside = !inside;
    }
  }

  return inside;
}

// 根據等時線多邊形篩選房屋列表
export function filterListingsByIsochrone(
  listings: ListingBasic[], 
  isochromePolygon: GeoJSON.Feature | null
): ListingBasic[] {
  // 如果沒有等時線多邊形，返回所有房屋
  if (!isochromePolygon) {
    return listings;
  }

  // 篩選在等時線範圍內的房屋
  return listings.filter((listing: ListingBasic) => {
    const point: [number, number] = [listing.coordinates[0], listing.coordinates[1]]; // [lng, lat]
    return isPointInIsochrone(point, isochromePolygon);
  });
} 