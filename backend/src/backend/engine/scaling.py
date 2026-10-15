import math
from backend.models.gear import ElementType

def get_floor_element(floor: int) -> ElementType:
    """Determines guardian element based on floor sequence."""
    if floor % 10 == 0:
        return ElementType.VOID  # Every 10th floor is a Void boss!
    cycle = [ElementType.FIRE, ElementType.ICE, ElementType.LIGHTNING]
    return cycle[(floor - 1) % len(cycle)]

def is_boss_floor(floor: int) -> bool:
    """Boss floors occur every 5 and 10 floors."""
    return floor % 5 == 0

def get_guardian_max_hp(floor: int) -> float:
    """
    Exponential scaling formula:
    Base 120 HP * (1.14)^(floor - 1) * (1 + floor//10 * 0.6)
    Boss floors have an extra 2.5x to 4x multiplier.
    """
    base_hp = 120.0
    exponential_factor = 1.14 ** max(0, floor - 1)
    tier_boost = 1.0 + (floor // 10) * 0.6
    hp = base_hp * exponential_factor * tier_boost
    
    if is_boss_floor(floor):
        boss_mult = 3.5 if floor % 10 == 0 else 2.5
        hp *= boss_mult
        
    return round(hp, 1)

def get_guardian_defense(floor: int) -> float:
    """Defenses scale gently to reward active upgrades and gear."""
    return math.floor(2.0 * (1.08 ** max(0, floor - 1)))

def get_floor_gold_reward(floor: int, gold_multiplier: float = 1.0) -> float:
    """Exponential gold reward scaling per floor."""
    base_gold = 20.0
    scaling = 1.12 ** max(0, floor - 1)
    return round(base_gold * scaling * gold_multiplier, 1)

def get_active_upgrade_cost(upgrade_id: str, current_level: int) -> float:
    """Calculates active run gold cost for an upgrade."""
    base_costs = {
        "weapon_sharpening": 15.0,
        "swift_strike": 25.0,
        "focus_training": 35.0,
        "deadly_precision": 50.0,
        "elemental_infusion": 40.0,
        "midas_greed": 30.0
    }
    multipliers = {
        "weapon_sharpening": 1.25,
        "swift_strike": 1.35,
        "focus_training": 1.45,
        "deadly_precision": 1.50,
        "elemental_infusion": 1.30,
        "midas_greed": 1.40
    }
    base = base_costs.get(upgrade_id, 20.0)
    mult = multipliers.get(upgrade_id, 1.3)
    return round(base * (mult ** current_level), 1)

def calculate_ascension_sparks(highest_floor: int, total_gold_earned: float) -> int:
    """
    Ascension sparks formula:
    Sparks = floor( (highest_floor / 10)^2.4 * (1 + total_gold_earned / 10000)^0.15 )
    Minimum requirement: floor 15.
    """
    if highest_floor < 15:
        return 0
    floor_factor = (highest_floor / 10.0) ** 2.4
    gold_factor = (1.0 + total_gold_earned / 10000.0) ** 0.15
    return max(1, math.floor(floor_factor * gold_factor))
