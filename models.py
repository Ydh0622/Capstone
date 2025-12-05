from sqlalchemy import Column, Integer, String, ForeignKey, Float
from sqlalchemy.orm import relationship
from sqlalchemy.ext.declarative import declarative_base
from passlib.context import CryptContext

# SQLAlchemy 기본 베이스
Base = declarative_base()

# 비밀번호 해싱을 위한 패스워드 컨텍스트 설정
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

class Place(Base):
    __tablename__ = "places"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    lat = Column(Float)
    lon = Column(Float)
    category = Column(String)
    reviews = relationship("Review", back_populates="place")

# User 모델 정의
class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True)
    email = Column(String, unique=True, index=True, nullable=True)
    password_hash = Column(String)

    # 사용자 비밀번호 설정 및 확인 메소드
    def set_password(self, password: str):
        self.password_hash = pwd_context.hash(password)
    
    def verify_password(self, password: str) -> bool:
        return pwd_context.verify(password, self.password_hash)

    # 사용자와 리뷰의 관계 설정
    reviews = relationship("Review", back_populates="user", cascade="all, delete-orphan")

# Review 모델 정의
class Review(Base):
    __tablename__ = "reviews"
    
    id = Column(Integer, primary_key=True, index=True)
    place_id = Column(Integer, ForeignKey("places.id"))  # 장소 ID
    username = Column(String, ForeignKey("users.username"))  # 사용자 이름 (User 모델과 관계)
    rating = Column(Integer)
    comment = Column(String)
    
    # User 모델과의 관계 설정
    user = relationship("User", back_populates="reviews")
    place = relationship("Place", back_populates="reviews")