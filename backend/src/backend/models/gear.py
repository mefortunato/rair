from enum import Enum
from typing import Optional
from pydantic import BaseModel, Field

class ElementType(str, Enum):
    FIRE = "fire"
    ICE = "ice"
    LIGHTNING = "lightning"
    VOID = "void"
    NEUTRAL = "neutral"

class GearSlot(str, Enum):
    WEAPON = "weapon"
    ARMOR = "armor"
    RING = "ring"
    AMULET = "amulet"
    CATALYST = "catalyst"

class Rarity(str, Enum):
    COMMON = "common"
    RARE = "rare"
    EPIC = "epic"
    LEGENDARY = "legendary"
    MYTHIC = "mythic"

class Affix(BaseModel):
    stat: str  # e.g., "atk", "crit_chance", "crit_dmg", "fire_dmg", "gold_bonus"
    value: float
    description: str

class GearItem(BaseModel):
    id: str
    name: str
    slot: GearSlot
    rarity: Rarity
    element: ElementType = ElementType.NEUTRAL
    level: int = 1
    base_atk: float = 0.0
    base_def: float = 0.0
    affixes: list[Affix] = Field(default_factory=list)
    salvage_value: int = 10  # Aether essences given on salvage
    is_equipped: bool = False
