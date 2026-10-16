import pytest
from backend.models.gear import ElementType, GearSlot, Rarity
from backend.engine.scaling import (
    get_floor_element,
    is_boss_floor,
    get_guardian_max_hp,
    get_guardian_defense,
    get_floor_gold_reward,
    calculate_ascension_sparks
)
from backend.engine.combat import calculate_hero_hit, get_elemental_multiplier
from backend.engine.loot import generate_gear_item
from backend.engine.offline import calculate_offline_gains
from backend.models.player import Player, ActiveRun, PlayerStats

def test_floor_scaling():
    hp_1 = get_guardian_max_hp(1)
    hp_2 = get_guardian_max_hp(2)
    hp_5 = get_guardian_max_hp(5)  # Boss floor
    hp_10 = get_guardian_max_hp(10) # Void Boss floor
    
    assert hp_1 == 250.0
    assert hp_2 > hp_1
    assert hp_5 > hp_2 * 2.0  # Boss multiplier active
    assert hp_10 > hp_5
    assert is_boss_floor(5) is True
    assert is_boss_floor(10) is True
    assert is_boss_floor(3) is False

def test_elemental_cycle():
    assert get_floor_element(1) == ElementType.FIRE
    assert get_floor_element(2) == ElementType.ICE
    assert get_floor_element(3) == ElementType.LIGHTNING
    assert get_floor_element(10) == ElementType.VOID

def test_elemental_combat_advantages():
    # Fire vs Ice -> 1.5x
    assert get_elemental_multiplier(ElementType.FIRE, ElementType.ICE) == 1.50
    # Ice vs Fire -> 0.75x
    assert get_elemental_multiplier(ElementType.ICE, ElementType.FIRE) == 0.75
    # Lightning vs Fire -> 1.50x
    assert get_elemental_multiplier(ElementType.LIGHTNING, ElementType.FIRE) == 1.50
    # Void vs All -> 1.35x
    assert get_elemental_multiplier(ElementType.VOID, ElementType.FIRE) == 1.35
    assert get_elemental_multiplier(ElementType.VOID, ElementType.ICE) == 1.35

def test_hero_damage_hit():
    dmg, is_crit, mult = calculate_hero_hit(
        base_atk=50.0,
        guardian_def=10.0,
        attacker_element=ElementType.FIRE,
        defender_element=ElementType.ICE,
        crit_chance=0.0,
        crit_multiplier=2.0
    )
    # Effective atk = 40.0, mult = 1.5 -> 60.0 dmg
    assert dmg == 60.0
    assert is_crit is False

    # Guaranteed crit
    dmg_crit, is_crit_true, _ = calculate_hero_hit(
        base_atk=50.0,
        guardian_def=10.0,
        attacker_element=ElementType.FIRE,
        defender_element=ElementType.ICE,
        crit_chance=1.0,
        crit_multiplier=2.0
    )
    assert dmg_crit == 120.0
    assert is_crit_true is True

def test_ascension_sparks():
    # Floor < 15 earns 0 sparks
    assert calculate_ascension_sparks(10, 5000) == 0
    
    # Floor 20 earns sparks
    sparks_20 = calculate_ascension_sparks(20, 10000)
    assert sparks_20 >= 5
    
    # Floor 50 earns significantly more
    sparks_50 = calculate_ascension_sparks(50, 100000)
    assert sparks_50 > sparks_20 * 5

def test_gear_loot_generation():
    item = generate_gear_item(floor=10)
    assert item.id is not None
    assert item.slot in list(GearSlot)
    assert item.rarity in list(Rarity)
    assert item.level == 10
    assert len(item.affixes) > 0

def test_perk_mechanics_and_costs():
    from backend.engine.scaling import get_perk_reroll_cost, get_perk_upgrade_cost
    from backend.models.player import RunPerk, ActiveRun

    # Test reroll cost scaling
    cost_0 = get_perk_reroll_cost(0, floor=5)
    cost_1 = get_perk_reroll_cost(1, floor=5)
    assert cost_0 > 0
    assert cost_1 > cost_0

    # Test perk upgrade cost by rarity and rank
    common_cost = get_perk_upgrade_cost("common", rank=1)
    rare_cost = get_perk_upgrade_cost("rare", rank=1)
    epic_cost = get_perk_upgrade_cost("epic", rank=1)
    legendary_cost = get_perk_upgrade_cost("legendary", rank=1)
    assert common_cost < rare_cost < epic_cost < legendary_cost

    # Higher rank costs more
    common_rank2 = get_perk_upgrade_cost("common", rank=2)
    assert common_rank2 > common_cost

    # Test ActiveRun with perks
    perk = RunPerk(
        id="colossus_might",
        name="Colossus Might",
        description="+20% Attack Power",
        icon="⚔️",
        rarity="common",
        rank=1,
        category="offensive"
    )
    run = ActiveRun(perks=[perk], pending_perk_picks=1)
    assert len(run.perks) == 1
    assert run.perks[0].id == "colossus_might"
    assert run.pending_perk_picks == 1

