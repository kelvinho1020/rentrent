import os
from pydantic import BaseSettings


class Settings(BaseSettings):
    """通用配置設定"""
    
    # API 路徑前綴
    API_PREFIX: str = "/api"
    
    # 資料庫連接設定
    DB_HOST: str = os.getenv("DB_HOST", "db")
    DB_PORT: str = os.getenv("DB_PORT", "5432")
    DB_NAME: str = os.getenv("DB_NAME", "rentrent")
    DB_USER: str = os.getenv("DB_USER", "postgres")
    DB_PASSWORD: str = os.getenv("DB_PASSWORD", "postgres")
    DATABASE_URL: str = os.getenv(
        "DATABASE_URL", 
        f"postgresql://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}"
    )
    
    # 通勤時間 API 設定
    MAPBOX_API_KEY: str = os.getenv("MAPBOX_API_KEY", "")
    
    # 591 爬蟲配置
    SCRAPER_INTERVAL_HOURS: int = int(os.getenv("SCRAPER_INTERVAL_HOURS", "24"))
    SCRAPER_USER_AGENT: str = os.getenv(
        "SCRAPER_USER_AGENT", 
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
    )
    
    # CORS 設定
    CORS_ORIGINS: list = os.getenv("CORS_ORIGINS", "*").split(",")
    
    # 項目通用設定
    PROJECT_NAME: str = "RentRent"
    VERSION: str = "0.1.0"
    DESCRIPTION: str = "租屋搜尋平台 API"
    
    class Config:
        env_file = ".env"


# 創建全域設定實例
settings = Settings() 