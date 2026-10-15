from enum import Enum
from typing import Optional
from pydantic import BaseModel, Field

class MinigameType(str, Enum):
    # 10 Endless Risk/Reward Minigames
    ABYSSAL_RUNNER = "abyssal_runner"
    FATES_GAMBIT = "fates_gambit"
    ALCHEMICAL_BREWMASTER = "alchemical_brewmaster"
    RUNE_SCRIBE = "rune_scribe"
    VAULT_CRACKER = "vault_cracker"
    TITANS_FORGE = "titans_forge"
    CELESTIAL_ORBIT = "celestial_orbit"
    SPIRE_DEFENSE = "spire_defense"
    ASTRAL_ANGLER = "astral_angler"
    ARCANE_DECRYPTION = "arcane_decryption"
    # Legacy fallbacks
    OVERDRIVE_RING = "overdrive_ring"
    RUNE_WEAVE = "rune_weave"
    ALCHEMICAL_TRANSMUTATION = "alchemical_transmutation"

class ActiveBuff(BaseModel):
    id: str
    name: str
    multiplier: float
    buff_type: str  # "all_damage", "attack_speed", "crit_chance", "crit_multiplier", "gold_multiplier", "elemental_boost"
    duration_seconds: float
    time_remaining: float
    is_debuff: bool = False

class ClaimMinigameRequest(BaseModel):
    minigame_type: str
    score: int
    difficulty: str = "novice"       # "novice", "adept", "abyssal"
    target_stat: str = "all_damage"  # "all_damage", "attack_speed", "crit_chance", "crit_multiplier", "gold_multiplier", "elemental_boost"
    duration_seconds: float = 60.0
    success: bool = True
    element: str = "fire"
