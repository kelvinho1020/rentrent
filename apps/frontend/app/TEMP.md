// 假設50個用戶搜尋台北101附近的房子

// ❌ 修改前：每次點擊都是新的快取 key
const beforeOptimization = [
  "distance_matrix:25.0337881,121.5645389:house_coords:driving", // 用戶1
  "distance_matrix:25.0338192,121.5645127:house_coords:driving", // 用戶2  
  "distance_matrix:25.0338456,121.5644987:house_coords:driving", // 用戶3
  // ... 50個不同的 key
];

// API 調用次數：50次
// 總費用：50 × $0.005 = $0.25
// 總時間：50 × 500ms = 25秒

// ✅ 修改後：相同區域的搜尋會命中快取
const afterOptimization = [
  "distance_matrix:25.034,121.565:house_coords:driving", // 用戶1-50都用這個
];

// API 調用次數：1次
// 總費用：1 × $0.005 = $0.005
// 總時間：1 × 500ms + 49 × 1ms = 549ms