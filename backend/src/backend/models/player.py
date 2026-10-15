from datetime import datetime, timezone
from typing import Optional
from pydantic import BaseModel, Field
from backend.models.gear import GearItem, GearSlot, ElementType
from backend.models.ascension import AscensionTree
from backend.models.minigames import ActiveBuff

class ActiveUpgrades(BaseModel):
    weapon_sharpening: int = 0      # Base ATK
    swift_strike: int = 0           # Attack Speed
    focus_training: int = 0         # Crit Chance
    deadly_precision: int = 0       # Crit Damage
    elemental_infusion: int = 0     # Elemental Mastery
    midas_greed: int = 0            # Gold Find

class ActiveRun(BaseModel):
    current_floor: int = 1
    highest_floor_this_run: int = 1
    gold: float = 0.0
    total_gold_this_run: float = 0.0
    guardian_hp_current: float = 120.0
    guardian_hp_max: float = 120.0
    guardian_element: ElementType = ElementType.FIRE
    is_boss_floor: bool = False
    upgrades: ActiveUpgrades = Field(default_factory=ActiveUpgrades)
    active_buffs: list[ActiveBuff] = Field(default_factory=list)

class PlayerStats(BaseModel):
    base_atk: float = 10.0
    attack_speed: float = 1.0       # Hits per second
    crit_chance: float = 0.05       # 5%
    crit_multiplier: float = 1.5    # 150%
    fire_bonus: float = 0.0
    ice_bonus: float = 0.0
    lightning_bonus: float = 0.0
    void_bonus: float = 0.0
    gold_multiplier: float = 1.0
    aether_essences: int = 0        # Material obtained from salvaging

class Player(BaseModel):
    player_id: str
    guest_token: str
    handle: str = "Ascendant Rogue"
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    last_active: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    highest_floor: int = 1
    ascension_level: int = 0
    active_run: ActiveRun = Field(default_factory=ActiveRun)
    stats: PlayerStats = Field(default_factory=PlayerStats)
    ascension_tree: AscensionTree = Field(default_factory=AscensionTree.default_tree)
    equipped_gear: dict[str, Optional[GearItem]] = Field(default_factory=lambda: {
        GearSlot.WEAPON.value: None,
        GearSlot.ARMOR.value: None,
        GearSlot.RING.value: None,
        GearSlot.AMULET.value: None,
        GearSlot.CATALYST.value: None
    })
    inventory: list[GearItem] = Field(default_factory=list)

class SyncPayload(BaseModel):
    player_id: str
    guest_token: str
    active_run: ActiveRun
    stats: PlayerStats
    equipped_gear: dict[str, Optional[GearItem]]
    inventory: list[GearItem]
    ascension_tree: AscensionTree
    highest_floor: int
    handle: Optional[str] = None
