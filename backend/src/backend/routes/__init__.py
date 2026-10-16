from backend.routes.player import router as player_router
from backend.routes.ascension import router as ascension_router
from backend.routes.minigames import router as minigames_router
from backend.routes.leaderboard import router as leaderboard_router
from backend.routes.auth import router as auth_router

__all__ = [
    "player_router",
    "ascension_router",
    "minigames_router",
    "leaderboard_router",
    "auth_router"
]
