import uuid
import random
from backend.models.gear import GearItem, GearSlot, Rarity, ElementType, Affix

AFFIX_TEMPLATES = [
    {"stat": "base_atk", "label": "Attack Power", "base": 5.0, "scale": 1.5, "unit": ""},
    {"stat": "crit_chance", "label": "Critical Strike Chance", "base": 0.03, "scale": 0.005, "unit": "%"},
    {"stat": "crit_dmg", "label": "Critical Damage", "base": 0.15, "scale": 0.03, "unit": "%"},
    {"stat": "fire_dmg", "label": "Inferno Mastery", "base": 0.10, "scale": 0.02, "unit": "%"},
    {"stat": "ice_dmg", "label": "Glacier Mastery", "base": 0.10, "scale": 0.02, "unit": "%"},
    {"stat": "lightning_dmg", "label": "Tempest Mastery", "base": 0.10, "scale": 0.02, "unit": "%"},
    {"stat": "void_dmg", "label": "Void Resonance", "base": 0.15, "scale": 0.03, "unit": "%"},
    {"stat": "gold_bonus", "label": "Gold Find", "base": 0.15, "scale": 0.02, "unit": "%"},
]

RARITY_AFFIX_COUNT = {
    Rarity.COMMON: 1,
    Rarity.RARE: 2,
    Rarity.EPIC: 3,
    Rarity.LEGENDARY: 4,
    Rarity.MYTHIC: 5,
}

ITEM_PREFIXES = {
    ElementType.FIRE: ["Blazing", "Infernal", "Molten", "Phoenix"],
    ElementType.ICE: ["Glacial", "Frostforged", "Arctic", "Blizzard"],
    ElementType.LIGHTNING: ["Charged", "Thunderous", "Stormbound", "Static"],
    ElementType.VOID: ["Abyssal", "Cosmic", "Astral", "Singularity"],
    ElementType.NEUTRAL: ["Reinforced", "Keen", "Balanced", "Ancient"],
}

SLOT_NAMES = {
    GearSlot.WEAPON: ["Blade", "Scythe", "Edge", "Spire-Cleaver"],
    GearSlot.ARMOR: ["Cuirass", "Vestments", "Hauberk", "Aegis"],
    GearSlot.RING: ["Signet", "Band", "Loop", "Circle of Power"],
    GearSlot.AMULET: ["Pendant", "Talisman", "Choker", "Medallion"],
    GearSlot.CATALYST: ["Core", "Prism", "Orb", "Relic"],
}

def roll_rarity(floor: int, luck_bonus: float = 0.0) -> Rarity:
    roll = random.random() - (luck_bonus * 0.1)
    # Rarity thresholds improve slightly with floor depth
    floor_factor = min(0.15, floor * 0.003)
    
    if roll < 0.02 + floor_factor:
        return Rarity.MYTHIC
    elif roll < 0.08 + floor_factor:
        return Rarity.LEGENDARY
    elif roll < 0.25 + floor_factor:
        return Rarity.EPIC
    elif roll < 0.55:
        return Rarity.RARE
    return Rarity.COMMON

def generate_gear_item(floor: int, guaranteed_slot: GearSlot | None = None, luck_bonus: float = 0.0) -> GearItem:
    slot = guaranteed_slot or random.choice(list(GearSlot))
    rarity = roll_rarity(floor, luck_bonus)
    element = random.choice([ElementType.FIRE, ElementType.ICE, ElementType.LIGHTNING, ElementType.VOID])
    
    prefix = random.choice(ITEM_PREFIXES.get(element, ["Ancient"]))
    base_name = random.choice(SLOT_NAMES[slot])
    name = f"{prefix} {base_name}"
    
    # Calculate base stats scaled to floor
    base_atk = 0.0
    base_def = 0.0
    if slot in (GearSlot.WEAPON, GearSlot.CATALYST):
        base_atk = round(6.0 * (1.08 ** max(0, floor - 1)), 1)
    else:
        base_def = round(3.5 * (1.06 ** max(0, floor - 1)), 1)
        
    # Generate affixes
    num_affixes = RARITY_AFFIX_COUNT[rarity]
    chosen_templates = random.sample(AFFIX_TEMPLATES, min(num_affixes, len(AFFIX_TEMPLATES)))
    affixes = []
    
    rarity_multiplier = {
        Rarity.COMMON: 1.0,
        Rarity.RARE: 1.3,
        Rarity.EPIC: 1.7,
        Rarity.LEGENDARY: 2.2,
        Rarity.MYTHIC: 3.0,
    }[rarity]
    
    for t in chosen_templates:
        val = (t["base"] + t["scale"] * floor * 0.1) * rarity_multiplier
        if "%" in t["unit"]:
            val = round(val, 3)
            desc = f"+{int(val * 100)}% {t['label']}"
        else:
            val = round(val, 1)
            desc = f"+{val} {t['label']}"
        affixes.append(Affix(stat=t["stat"], value=val, description=desc))
        
    salvage_val = {
        Rarity.COMMON: 10,
        Rarity.RARE: 30,
        Rarity.EPIC: 75,
        Rarity.LEGENDARY: 200,
        Rarity.MYTHIC: 500,
    }[rarity]
    
    return GearItem(
        id=str(uuid.uuid4()),
        name=name,
        slot=slot,
        rarity=rarity,
        element=element,
        level=floor,
        base_atk=base_atk,
        base_def=base_def,
        affixes=affixes,
        salvage_value=salvage_val,
        is_equipped=False
    )
