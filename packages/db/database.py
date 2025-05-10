import os
from contextlib import contextmanager
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, scoped_session
from sqlalchemy.pool import NullPool
from urllib.parse import quote_plus

from .models import Base


def get_db_url():
    """從環境變數獲取資料庫連接 URL"""
    db_host = os.getenv("DB_HOST", "db")
    db_port = os.getenv("DB_PORT", "5432")
    db_name = os.getenv("DB_NAME", "rentrent")
    db_user = os.getenv("DB_USER", "postgres")
    # 密碼需要 URL 編碼以處理特殊字元
    db_password = quote_plus(os.getenv("DB_PASSWORD", "postgres"))
    
    # 直接從環境變數讀取完整 URL
    db_url = os.getenv("DATABASE_URL")
    
    if not db_url:
        db_url = f"postgresql://{db_user}:{db_password}@{db_host}:{db_port}/{db_name}"
    
    return db_url


# 創建資料庫引擎
engine = create_engine(get_db_url())

# 創建會話工廠
session_factory = sessionmaker(bind=engine, expire_on_commit=False)

# 創建具有線程隔離的會話
SessionLocal = scoped_session(session_factory)


def init_db():
    """初始化資料庫 (建立所有表)"""
    Base.metadata.create_all(bind=engine)


def get_session():
    """取得資料庫會話"""
    session = SessionLocal()
    try:
        return session
    finally:
        session.close()


@contextmanager
def db_session():
    """資料庫會話上下文管理器"""
    session = SessionLocal()
    try:
        yield session
        session.commit()
    except Exception as e:
        session.rollback()
        raise e
    finally:
        session.close() 