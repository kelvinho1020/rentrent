from typing import List, Optional, Any
from pydantic import BaseModel, Field, validator
from datetime import datetime


class Coordinates(BaseModel):
    """座標結構"""
    longitude: float = Field(..., description="經度")
    latitude: float = Field(..., description="緯度")


class CommuteSearchRequest(BaseModel):
    """通勤搜尋請求結構"""
    work_location: Coordinates = Field(..., description="工作地點座標")
    max_commute_time: int = Field(..., ge=5, le=120, description="最大通勤時間（分鐘）")
    min_price: Optional[int] = Field(None, ge=0, description="最低租金")
    max_price: Optional[int] = Field(None, ge=0, description="最高租金")
    min_size: Optional[float] = Field(None, ge=0, description="最小坪數")
    
    @validator('max_price')
    def max_price_must_be_greater_than_min(cls, v, values):
        """確保最高租金大於最低租金"""
        if v is not None and 'min_price' in values and values['min_price'] is not None:
            if v < values['min_price']:
                raise ValueError('最高租金必須大於最低租金')
        return v


class ListingBasic(BaseModel):
    """租屋物件基本資訊"""
    id: int
    title: str
    price: int
    size_ping: float
    address: str
    district: str
    city: str
    coordinates: List[float]  # [lng, lat] 格式
    commute_time: Optional[int] = None  # 通勤時間 (分鐘)
    
    class Config:
        orm_mode = True


class ListingDetail(ListingBasic):
    """租屋物件詳細資訊"""
    source_id: str
    house_type: Optional[str] = None
    room_type: Optional[str] = None
    description: Optional[str] = None
    image_urls: Optional[List[str]] = None
    facilities: Optional[List[str]] = None
    contact_name: Optional[str] = None
    contact_phone: Optional[str] = None
    floor: Optional[str] = None
    total_floor: Optional[str] = None
    last_updated: Optional[datetime] = None
    created_at: Optional[datetime] = None
    
    class Config:
        orm_mode = True


class ListingSearchResponse(BaseModel):
    """租屋搜尋結果"""
    total: int
    results: List[ListingBasic] 