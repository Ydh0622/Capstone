from fastapi import APIRouter, HTTPException, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import Column, Integer, String, ForeignKey
from sqlalchemy.orm import relationship
from ..models import Review, get_db  # Review 모델과 get_db 의존성
from sqlalchemy.exc import IntegrityError

router = APIRouter()

# 특정 장소의 리뷰 조회
@router.get("/reviews")
def get_reviews(place_id: str = Query(...), db: Session = Depends(get_db)):
    reviews = db.query(Review).filter(Review.place_id == place_id).all()
    if not reviews:
        raise HTTPException(status_code=404, detail="리뷰가 없습니다.")
    return reviews

# 새로운 리뷰 저장
@router.post("/reviews")
def add_review(place_id: str, username: str, rating: int, comment: str, db: Session = Depends(get_db)):
    if not (1 <= rating <= 5):
        raise HTTPException(status_code=400, detail="평점은 1~5 사이여야 합니다.")
    
    review = Review(place_id=place_id, username=username, rating=rating, comment=comment)
    
    try:
        db.add(review)
        db.commit()
        db.refresh(review)
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=400, detail="리뷰 저장에 실패했습니다.")
    
    return {"message": "리뷰가 추가되었습니다.", "review": review}

# 리뷰 수정
@router.put("/reviews/{review_id}")
def update_review(review_id: int, comment: str, db: Session = Depends(get_db)):
    review = db.query(Review).filter(Review.id == review_id).first()
    if not review:
        raise HTTPException(status_code=404, detail="리뷰를 찾을 수 없습니다.")
    review.comment = comment
    db.commit()
    db.refresh(review)
    return {"message": "리뷰가 수정되었습니다.", "review": review}

# 리뷰 삭제
@router.delete("/reviews/{review_id}")
def delete_review(review_id: int, db: Session = Depends(get_db)):
    review = db.query(Review).filter(Review.id == review_id).first()
    if not review:
        raise HTTPException(status_code=404, detail="리뷰를 찾을 수 없습니다.")
    db.delete(review)
    db.commit()
    return {"message": "리뷰가 삭제되었습니다."}
