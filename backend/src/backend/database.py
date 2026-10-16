import logging
from typing import Optional, Any
from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
from backend.config import settings

logger = logging.getLogger("rair.database")

class DatabaseManager:
    client: Optional[AsyncIOMotorClient] = None
    db: Optional[AsyncIOMotorDatabase] = None
    is_connected: bool = False
    
    # In-memory storage fallback if MongoDB is unreachable
    _memory_store: dict[str, dict[str, Any]] = {
        "players": {},
        "leaderboard": {}
    }

    async def connect(self):
        try:
            logger.info(f"Connecting to MongoDB at {settings.mongo_uri}...")
            self.client = AsyncIOMotorClient(
                settings.mongo_uri,
                serverSelectionTimeoutMS=2500
            )
            # Ping database
            await self.client.admin.command('ping')
            self.db = self.client[settings.database_name]
            self.is_connected = True
            
            # Setup indices
            await self.db.players.create_index("player_id", unique=True)
            await self.db.players.create_index("guest_token")
            await self.db.players.create_index("google_id")
            await self.db.players.create_index("highest_floor")
            logger.info("Successfully connected to MongoDB with indices created.")
        except Exception as e:
            logger.warning(f"MongoDB connection failed: {e}. Falling back to in-memory store for session persistence.")
            self.is_connected = False

    async def disconnect(self):
        if self.client:
            self.client.close()
            logger.info("MongoDB connection closed.")

    async def get_player(self, player_id: str) -> Optional[dict]:
        if self.is_connected and self.db is not None:
            doc = await self.db.players.find_one({"player_id": player_id})
            if doc and "_id" in doc:
                del doc["_id"]
            return doc
        return self._memory_store["players"].get(player_id)

    async def get_player_by_token(self, guest_token: str) -> Optional[dict]:
        if self.is_connected and self.db is not None:
            doc = await self.db.players.find_one({"guest_token": guest_token})
            if doc and "_id" in doc:
                del doc["_id"]
            return doc
        for p in self._memory_store["players"].values():
            if p.get("guest_token") == guest_token:
                return p
        return None

    async def get_player_by_google_id(self, google_id: str) -> Optional[dict]:
        if not google_id:
            return None
        if self.is_connected and self.db is not None:
            doc = await self.db.players.find_one({"google_id": google_id})
            if doc and "_id" in doc:
                del doc["_id"]
            return doc
        for p in self._memory_store["players"].values():
            if p.get("google_id") == google_id:
                return p
        return None

    async def delete_player(self, player_id: str) -> bool:
        self._memory_store["players"].pop(player_id, None)
        if self.is_connected and self.db is not None:
            try:
                await self.db.players.delete_one({"player_id": player_id})
                return True
            except Exception as e:
                logger.error(f"Error deleting player from MongoDB: {e}")
                return False
        return True

    async def save_player(self, player_dict: dict) -> bool:
        player_id = player_dict["player_id"]
        # Always update memory cache
        self._memory_store["players"][player_id] = player_dict
        
        if self.is_connected and self.db is not None:
            try:
                await self.db.players.update_one(
                    {"player_id": player_id},
                    {"$set": player_dict},
                    upsert=True
                )
                return True
            except Exception as e:
                logger.error(f"Error persisting player to MongoDB: {e}")
                return False
        return True

    async def get_leaderboard(self, limit: int = 20) -> list[dict]:
        if self.is_connected and self.db is not None:
            cursor = self.db.players.find(
                {},
                {"player_id": 1, "handle": 1, "highest_floor": 1, "ascension_level": 1, "updated_at": 1}
            ).sort("highest_floor", -1).limit(limit)
            results = []
            async for doc in cursor:
                doc.pop("_id", None)
                results.append(doc)
            return results
        
        # In-memory fallback
        all_players = list(self._memory_store["players"].values())
        sorted_players = sorted(all_players, key=lambda x: x.get("highest_floor", 1), reverse=True)[:limit]
        return [
            {
                "player_id": p.get("player_id"),
                "handle": p.get("handle", "Unknown Ascendant"),
                "highest_floor": p.get("highest_floor", 1),
                "ascension_level": p.get("ascension_level", 0),
                "updated_at": p.get("updated_at")
            }
            for p in sorted_players
        ]

db_manager = DatabaseManager()
