from enum import Enum
from pydantic import BaseModel, Field

class MinigameType(str, Enum):
    OVERDRIVE_RING = "overdrive_ring"
    RUNE_WEAVE = "rune_weave"
    ALCHEMICAL_TRANSMUTATION = "alchemical_transmutation"

class ActiveBuff(BaseModel):
    id: str
    name: str
    multiplier: float
    buff_type: str  # "all_damage", "crit_guaranteed", "gold_multiplier", "elemental_boost"
    duration_seconds: float
    time_remaining: float

class ClaimMinigameRequest(BaseModel):
    minigame_type: MinigameType
    score: int
    success: bool
    element: str = "fire"
