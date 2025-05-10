from sqlalchemy import Column, Integer, String, Float, DateTime, Text, ForeignKey, ARRAY, UniqueConstraint
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.ext.declarative import declarative_base
from geoalchemy2 import Geometry
from datetime import datetime

Base = declarative_base()


class Listing(Base):
    """租屋物件資料表"""
    __tablename__ = "listings"

    id = Column(Integer, primary_key=True)
    source_id = Column(String(50), unique=True, nullable=False)  # 來源網站的物件 ID
    title = Column(String(255), nullable=False)
    price = Column(Integer, nullable=False)
    size_ping = Column(Float, nullable=False)  # 坪數
    house_type = Column(String(50))  # 房屋類型 (整層住家、獨立套房等)
    room_type = Column(String(50))  # 格局 (3房2廳等)
    address = Column(String(255), nullable=False)
    district = Column(String(50), nullable=False)  # 行政區
    city = Column(String(50), nullable=False)  # 城市
    description = Column(Text)
    image_urls = Column(ARRAY(Text))  # 圖片 URL 陣列
    facilities = Column(ARRAY(Text))  # 設施列表 (陽台、電梯等)
    contact_name = Column(String(100))
    contact_phone = Column(String(50))
    floor = Column(String(10))  # 樓層
    total_floor = Column(String(10))  # 總樓層
    last_updated = Column(DateTime, default=datetime.utcnow)
    created_at = Column(DateTime, default=datetime.utcnow)
    geom = Column(Geometry('POINT', srid=4326))  # 地理座標 (經緯度)

    def __repr__(self):
        return f"<Listing(id={self.id}, title='{self.title}', price={self.price})>"

    def to_dict(self):
        """轉換為 dict 格式方便序列化為 JSON"""
        return {
            "id": self.id,
            "source_id": self.source_id,
            "title": self.title,
            "price": self.price,
            "size_ping": self.size_ping,
            "house_type": self.house_type,
            "room_type": self.room_type,
            "address": self.address,
            "district": self.district,
            "city": self.city,
            "description": self.description,
            "image_urls": self.image_urls,
            "facilities": self.facilities,
            "contact_name": self.contact_name,
            "contact_phone": self.contact_phone,
            "floor": self.floor,
            "total_floor": self.total_floor,
            "last_updated": self.last_updated.isoformat() if self.last_updated else None,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            # 轉換點座標為 [lng, lat] 格式
            "coordinates": [float(x) for x in self.geom.coords(0)] if self.geom else None,
        }


class UserPreference(Base):
    """使用者偏好設定資料表"""
    __tablename__ = "user_preferences"

    id = Column(Integer, primary_key=True)
    user_id = Column(String(50), nullable=False)
    work_location = Column(Geometry('POINT', srid=4326), nullable=False)  # 工作地點座標
    max_commute_time = Column(Integer, nullable=False)  # 最大通勤時間 (分鐘)
    min_price = Column(Integer)  # 最低租金
    max_price = Column(Integer)  # 最高租金
    min_size = Column(Float)  # 最小坪數
    preferred_districts = Column(ARRAY(Text))  # 偏好行政區
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow)

    def __repr__(self):
        return f"<UserPreference(user_id='{self.user_id}', max_commute_time={self.max_commute_time})>"


class CommuteTime(Base):
    """通勤時間資料表"""
    __tablename__ = "commute_times"

    id = Column(Integer, primary_key=True)
    origin_id = Column(Integer, ForeignKey('listings.id'))
    destination = Column(String(100))  # 目的地名稱或 ID
    destination_geom = Column(Geometry('POINT', srid=4326))  # 目的地座標
    commute_time = Column(Integer)  # 通勤時間（分鐘）
    commute_distance = Column(Integer)  # 通勤距離（公尺）
    transit_mode = Column(String(20))  # 交通方式 (driving、transit、walking)
    calculated_at = Column(DateTime, default=datetime.utcnow)

    __table_args__ = (
        UniqueConstraint('origin_id', 'destination', 'transit_mode', name='unique_commute_route'),
    )

    def __repr__(self):
        return f"<CommuteTime(origin_id={self.origin_id}, commute_time={self.commute_time})>" 