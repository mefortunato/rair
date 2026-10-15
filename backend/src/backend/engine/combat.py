import random
from typing import Tuple
from backend.models.gear import ElementType

# Elemental wheel:
# Fire beats Ice (+50% dmg)
# Ice beats Lightning (+50% dmg)
# Lightning beats Fire (+50% dmg)
# Void deals +35% to all standard elements

ELEMENT_ADVANTAGES: dict[Tuple[ElementType, ElementType], float] = {
    # (Attacker, Defender) -> multiplier
    (ElementType.FIRE, ElementType.ICE): 1.50,
    (ElementType.FIRE, ElementType.LIGHTNING): 0.75,
    (ElementType.ICE, ElementType.LIGHTNING): 1.50,
    (ElementType.ICE, ElementType.FIRE): 0.75,
    (ElementType.LIGHTNING, ElementType.FIRE): 1.50,
    (ElementType.LIGHTNING, ElementType.ICE): 0.75,
    (ElementType.VOID, ElementType.FIRE): 1.35,
    (ElementType.VOID, ElementType.ICE): 1.35,
    (ElementType.VOID, ElementType.LIGHTNING): 1.35,
    (ElementType.VOID, ElementType.VOID): 1.20,
}

def get_elemental_multiplier(attacker_elem: ElementType, defender_elem: ElementType) -> float:
    if attacker_elem == ElementType.NEUTRAL or defender_elem == ElementType.NEUTRAL:
        return 1.0
    if attacker_elem == defender_elem:
        return 1.0
    return ELEMENT_ADVANTAGES.get((attacker_elem, defender_elem), 1.0)

def calculate_hero_hit(
    base_atk: float,
    guardian_def: float,
    attacker_element: ElementType,
    defender_element: ElementType,
    crit_chance: float,
    crit_multiplier: float,
    elemental_mastery_bonus: float = 0.0,
    all_dmg_multiplier: float = 1.0,
    rng_val: float | None = None
) -> Tuple[float, bool, float]:
    """
    Calculates single hit damage against a Spire Guardian.
    Returns: (damage, is_critical, elemental_multiplier)
    """
    effective_atk = max(1.0, base_atk - guardian_def)
    
    elem_mult = get_elemental_multiplier(attacker_element, defender_element)
    if elem_mult > 1.0:
        elem_mult += elemental_mastery_bonus
    
    roll = random.random() if rng_val is None else rng_val
    is_crit = roll < crit_chance
    
    crit_factor = crit_multiplier if is_crit else 1.0
    
    damage = effective_atk * elem_mult * crit_factor * all_dmg_multiplier
    return round(damage, 1), is_crit, elem_mult
