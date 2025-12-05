from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from .models import Base

# 데이터베이스 URL (여기서는 SQLite를 예시로 사용합니다)
SQLALCHEMY_DATABASE_URL = "sqlite:///./test.db"

# 엔진 설정
engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})

# 세션 생성
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# 데이터베이스 연결을 가져오는 함수
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
