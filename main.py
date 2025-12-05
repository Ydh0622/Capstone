from fastapi import FastAPI, Request, Form, HTTPException, Depends, Query
from fastapi.responses import FileResponse, RedirectResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy import create_engine, Column, Integer, String
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from passlib.context import CryptContext
from fastapi.middleware.cors import CORSMiddleware

# FastAPI 앱 생성
app = FastAPI()

# CORS 미들웨어 추가
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 모든 오리진 허용
    allow_credentials=True,
    allow_methods=["*"],  # 모든 HTTP 메소드 허용
    allow_headers=["*"],  # 모든 헤더 허용
)

# 데이터베이스 설정 (SQLite 사용 예시)
SQLALCHEMY_DATABASE_URL = "sqlite:///./test.db"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False}
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# 비밀번호 해시
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# 정적 파일과 템플릿 설정
app.mount("/static", StaticFiles(directory="app/static"), name="static")
templates = Jinja2Templates(directory="app/templates")

# 사용자 모델
class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True)
    password_hash = Column(String)

    def set_password(self, password: str):
        self.password_hash = pwd_context.hash(password)

    def verify_password(self, password: str) -> bool:
        return pwd_context.verify(password, self.password_hash)

# 리뷰 모델
class ReviewModel(Base):
    __tablename__ = "reviews"

    id = Column(Integer, primary_key=True, index=True)
    place_id = Column(String, index=True)
    username = Column(String)
    rating = Column(Integer)
    comment = Column(String)

# Pydantic 모델
class Review(BaseModel):
    username: str
    rating: int
    comment: str

class ReviewUpdate(BaseModel):
    comment: str

# DB 세션
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# DB 테이블 생성
Base.metadata.create_all(bind=engine)

# 루트 페이지
@app.get("/")
async def read_root(request: Request):
    return templates.TemplateResponse("index.html", {"request": request})

# 리뷰 페이지
@app.get("/review")
async def review(request: Request, place_id: str = Query(...), place_name: str = Query(...), user_id: str = Query(...), username: str = Query(...)):
    return templates.TemplateResponse("review.html", {"request": request, "place_id": place_id, "place_name": place_name, "user_id": user_id, "username": username})

# 프로필 페이지 추가
@app.get("/profile")
async def profile(request: Request):
    return templates.TemplateResponse("profile.html", {"request": request})

@app.get("/Map.html")
async def Map(request: Request):
    return templates.TemplateResponse("Map.html", {"request": request})


@app.get("/favicon.ico", include_in_schema=False)
async def favicon():
    return FileResponse("app/static/favicon.ico")


# 내가 쓴 리뷰 목록 조회
@app.get("/my-reviews/{username}")
async def get_my_reviews(username: str, db: Session = Depends(get_db)):
    reviews = db.query(ReviewModel).filter(ReviewModel.username == username).all()
    return reviews

# 내 리뷰 페이지
@app.get("/my-reviews")
async def my_reviews_page(request: Request):
    return templates.TemplateResponse("my_reviews.html", {"request": request})


# 리뷰 목록 조회
@app.get("/reviews")
async def get_reviews(place_id: str, db: Session = Depends(get_db)):
    reviews = db.query(ReviewModel).filter(ReviewModel.place_id == place_id).all()
    return [
        {
            "id": review.id,
            "username": review.username,
            "rating": review.rating,
            "comment": review.comment
        }
        for review in reviews
    ]

# 리뷰 추가
@app.post("/reviews")
async def add_review(place_id: str, review: Review, db: Session = Depends(get_db)):
    new_review = ReviewModel(
        place_id=place_id,
        username=review.username,
        rating=review.rating,
        comment=review.comment
    )
    db.add(new_review)
    db.commit()
    db.refresh(new_review)
    return {"message": "리뷰가 추가되었습니다."}

# 리뷰 수정
@app.put("/reviews/{review_id}")
async def update_review(review_id: int, updated: ReviewUpdate, db: Session = Depends(get_db)):
    review = db.query(ReviewModel).filter(ReviewModel.id == review_id).first()
    if not review:
        raise HTTPException(status_code=404, detail="리뷰를 찾을 수 없습니다.")
    review.comment = updated.comment
    db.commit()
    return {"message": "리뷰가 수정되었습니다."}

# 리뷰 삭제
@app.delete("/reviews/{review_id}")
async def delete_review(review_id: int, db: Session = Depends(get_db)):
    review = db.query(ReviewModel).filter(ReviewModel.id == review_id).first()
    if not review:
        raise HTTPException(status_code=404, detail="리뷰를 찾을 수 없습니다.")
    db.delete(review)
    db.commit()
    return {"message": "리뷰가 삭제되었습니다."}