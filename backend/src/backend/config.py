import os
from pydantic import BaseModel
from dotenv import load_dotenv

load_dotenv()

class Settings(BaseModel):
    app_name: str = "RAIR - Rogue Ascension: Idle Role-playing"
    mongo_uri: str = os.getenv("MONGO_URI", "mongodb://localhost:27017")
    database_name: str = os.getenv("DATABASE_NAME", "rair_db")
    port: int = int(os.getenv("PORT", "8001"))
    host: str = os.getenv("HOST", "0.0.0.0")
    secret_key: str = os.getenv("SECRET_KEY", "rair-cosmic-secret-key-2026")
    cors_origins: list[str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:4173",
        "http://127.0.0.1:4173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "*"
    ]

settings = Settings()
