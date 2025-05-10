-- 啟用 PostGIS 擴充功能
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS postgis_topology;

-- 建立租屋物件資料表
CREATE TABLE IF NOT EXISTS listings (
    id SERIAL PRIMARY KEY,
    source_id VARCHAR(50) UNIQUE NOT NULL, -- 來源網站的物件 ID
    title VARCHAR(255) NOT NULL,
    price INTEGER NOT NULL,
    size_ping NUMERIC(5, 2) NOT NULL, -- 坪數
    house_type VARCHAR(50), -- 房屋類型 (整層住家、獨立套房等)
    room_type VARCHAR(50), -- 格局 (3房2廳等)
    address VARCHAR(255) NOT NULL,
    district VARCHAR(50) NOT NULL, -- 行政區
    city VARCHAR(50) NOT NULL, -- 城市
    description TEXT,
    image_urls TEXT[], -- 圖片 URL 陣列
    facilities TEXT[], -- 設施列表 (陽台、電梯等)
    contact_name VARCHAR(100),
    contact_phone VARCHAR(50),
    floor VARCHAR(10), -- 樓層
    total_floor VARCHAR(10), -- 總樓層
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    geom GEOMETRY(Point, 4326) -- 地理座標 (經緯度)
);

-- 建立空間索引以加速地理查詢
CREATE INDEX IF NOT EXISTS idx_listings_geom ON listings USING GIST (geom);

-- 建立使用者喜好資料表 (未來擴充功能使用)
CREATE TABLE IF NOT EXISTS user_preferences (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(50) NOT NULL,
    work_location GEOMETRY(Point, 4326) NOT NULL, -- 工作地點座標
    max_commute_time INTEGER NOT NULL, -- 最大通勤時間 (分鐘)
    min_price INTEGER, -- 最低租金
    max_price INTEGER, -- 最高租金
    min_size NUMERIC(5, 2), -- 最小坪數
    preferred_districts TEXT[], -- 偏好行政區
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 建立通勤時間資料表 (快取通勤時間查詢結果)
CREATE TABLE IF NOT EXISTS commute_times (
    id SERIAL PRIMARY KEY,
    origin_id INTEGER REFERENCES listings(id),
    destination VARCHAR(100), -- 目的地名稱或 ID
    destination_geom GEOMETRY(Point, 4326), -- 目的地座標
    commute_time INTEGER, -- 通勤時間（分鐘）
    commute_distance INTEGER, -- 通勤距離（公尺）
    transit_mode VARCHAR(20), -- 交通方式 (driving、transit、walking)
    calculated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(origin_id, destination, transit_mode)
);

-- 建立函數計算給定工作地點和最大通勤時間的可租屋範圍
CREATE OR REPLACE FUNCTION get_listings_within_commute_time(
    work_point GEOMETRY,
    max_minutes INTEGER,
    price_min INTEGER DEFAULT NULL,
    price_max INTEGER DEFAULT NULL,
    size_min NUMERIC DEFAULT NULL
) 
RETURNS TABLE (
    id INTEGER,
    title VARCHAR(255),
    price INTEGER,
    size_ping NUMERIC(5, 2),
    address VARCHAR(255),
    district VARCHAR(50),
    city VARCHAR(50),
    commute_time INTEGER,
    geom GEOMETRY
) AS $$
BEGIN
    RETURN QUERY
    WITH commute_filtered AS (
        SELECT 
            l.id,
            l.title,
            l.price,
            l.size_ping,
            l.address,
            l.district,
            l.city,
            COALESCE(ct.commute_time, 
                     (ST_Distance(l.geom, work_point)::INTEGER / 80)::INTEGER) AS estimated_commute_time,
            l.geom
        FROM 
            listings l
        LEFT JOIN 
            commute_times ct 
        ON 
            l.id = ct.origin_id 
            AND ST_Equals(ct.destination_geom, work_point)
        WHERE
            (price_min IS NULL OR l.price >= price_min)
            AND (price_max IS NULL OR l.price <= price_max)
            AND (size_min IS NULL OR l.size_ping >= size_min)
            -- 先以地理距離粗略篩選 (約 6公里半徑，假設時速 80)
            AND ST_DWithin(l.geom, work_point, (max_minutes * 80 * 1.5)::INTEGER)
    )
    SELECT 
        cf.id,
        cf.title,
        cf.price,
        cf.size_ping,
        cf.address,
        cf.district,
        cf.city,
        cf.estimated_commute_time,
        cf.geom
    FROM 
        commute_filtered cf
    WHERE
        cf.estimated_commute_time <= max_minutes
    ORDER BY 
        cf.price ASC;
END;
$$ LANGUAGE plpgsql; 