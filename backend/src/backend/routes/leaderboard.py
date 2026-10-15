from fastapi import APIRouter
from backend.database import db_manager

router = APIRouter(prefix="/api/leaderboard", tags=["Leaderboard"])

@router.get("")
async def get_leaderboard(limit: int = 20):
    leaders = await db_manager.get_leaderboard(limit=limit)
    return {"leaderboard": leaders}
