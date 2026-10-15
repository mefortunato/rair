from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from backend.config import settings
from backend.database import db_manager
from backend.routes.player import router as player_router
from backend.routes.ascension import router as ascension_router
from backend.routes.minigames import router as minigames_router
from backend.routes.leaderboard import router as leaderboard_router

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Connect to MongoDB
    await db_manager.connect()
    yield
    # Shutdown: Disconnect
    await db_manager.disconnect()

app = FastAPI(
    title=settings.app_name,
    version="1.0.0",
    description="Backend API for RAIR: Rogue Ascension Idle Role-playing",
    lifespan=lifespan
)

# CORS setup
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include Routers
app.include_router(player_router)
app.include_router(ascension_router)
app.include_router(minigames_router)
app.include_router(leaderboard_router)

@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "app": settings.app_name,
        "database_connected": db_manager.is_connected
    }

def main():
    import uvicorn
    uvicorn.run("backend.main:app", host=settings.host, port=settings.port, reload=True)

if __name__ == "__main__":
    main()
