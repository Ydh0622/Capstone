from fastapi import APIRouter, Query, Depends
from sqlalchemy.orm import Session
from app.services.location_service import get_nearby_places
from app.database import get_db

router = APIRouter()

@router.get("/places/nearby")
async def search_nearby_places(
    lat: float = Query(..., description="위도"),
    lon: float = Query(..., description="경도"),
    radius: int = Query(1000, description="검색 반경 (미터)"),
    db: Session = Depends(get_db)
):
    return get_nearby_places(lat, lon, radius, db)