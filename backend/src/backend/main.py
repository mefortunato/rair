from contextlib import asynccontextmanager
from pathlib import Path
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from backend.config import settings
from backend.database import db_manager
from backend.routes.player import router as player_router
from backend.routes.ascension import router as ascension_router
from backend.routes.minigames import router as minigames_router
from backend.routes.leaderboard import router as leaderboard_router
from backend.routes.auth import router as auth_router
import mimetypes

mimetypes.add_type("application/manifest+json", ".webmanifest")

def resolve_static_dir() -> Path | None:
    candidates = []
    if settings.static_dir:
        candidates.append(Path(settings.static_dir))
    candidates.extend([
        Path("/app/static"),
        Path(__file__).resolve().parent.parent.parent.parent / "frontend" / "build",
        Path("static"),
        Path("../frontend/build")
    ])
    for p in candidates:
        if p.exists() and (p / "index.html").is_file():
            return p.resolve()
    return None

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
app.include_router(auth_router)
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

# Serve static frontend if built
static_dir = resolve_static_dir()
if static_dir:
    app_assets_dir = static_dir / "_app"
    if app_assets_dir.exists():
        app.mount("/_app", StaticFiles(directory=str(app_assets_dir)), name="_app")
    
    images_dir = static_dir / "images"
    if images_dir.exists():
        app.mount("/images", StaticFiles(directory=str(images_dir)), name="images")

    @app.get("/")
    async def serve_root():
        index_file = static_dir / "index.html"
        if index_file.is_file():
            return FileResponse(index_file)
        return {"status": "healthy", "message": "RAIR API is running"}

    @app.get("/{full_path:path}")
    async def serve_spa(full_path: str):
        if full_path.startswith("api/") or full_path == "api":
            raise HTTPException(status_code=404, detail="API route not found")
        
        file_path = static_dir / full_path
        if full_path and file_path.is_file():
            if full_path == "service-worker.js":
                return FileResponse(
                    file_path,
                    media_type="application/javascript",
                    headers={
                        "Service-Worker-Allowed": "/",
                        "Cache-Control": "no-cache, no-store, must-revalidate"
                    }
                )
            if full_path == ".well-known/assetlinks.json":
                return FileResponse(file_path, media_type="application/json")
            if full_path in ("manifest.webmanifest", "manifest.json"):
                return FileResponse(file_path, media_type="application/manifest+json")
            return FileResponse(file_path)
        
        index_file = static_dir / "index.html"
        if index_file.is_file():
            return FileResponse(index_file)
        
        raise HTTPException(status_code=404, detail="Not Found")
else:
    @app.get("/")
    async def serve_root_fallback():
        return {
            "app": settings.app_name,
            "status": "online",
            "docs": "/docs",
            "health": "/health"
        }

def main():
    import uvicorn
    uvicorn.run("backend.main:app", host=settings.host, port=settings.port, reload=False)

if __name__ == "__main__":
    main()

