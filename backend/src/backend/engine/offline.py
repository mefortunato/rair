import math
from datetime import datetime, timezone
from backend.models.player import Player
from backend.engine.scaling import get_guardian_max_hp, get_floor_gold_reward
from backend.engine.loot import generate_gear_item

def calculate_offline_gains(player: Player, now: datetime | None = None) -> dict:
    if now is None:
        now = datetime.now(timezone.utc)
    elif now.tzinfo is None:
        now = now.replace(tzinfo=timezone.utc)
        
    last_active = player.last_active or player.updated_at
    if last_active.tzinfo is None:
        last_active = last_active.replace(tzinfo=timezone.utc)
        
    elapsed_seconds = max(0.0, (now - last_active).total_seconds())
    
    # Threshold: at least 30 seconds to count as offline session
    if elapsed_seconds < 30.0:
        return {
            "elapsed_seconds": elapsed_seconds,
            "floors_cleared": 0,
            "gold_earned": 0.0,
            "items_found": []
        }
        
    # Cap at 24 hours (86400s)
    capped_seconds = min(86400.0, elapsed_seconds)
    
    # Calculate player effective DPS
    atk = player.stats.base_atk
    # Add weapon atk if equipped
    weapon = player.equipped_gear.get("weapon")
    if weapon:
        atk += weapon.base_atk
        
    # Add Constellation damage bonus
    cosmic_rank = 0
    if player.ascension_tree and "cosmic_might" in player.ascension_tree.nodes:
        cosmic_rank = player.ascension_tree.nodes["cosmic_might"].current_rank
    atk *= (1.0 + cosmic_rank * 0.25)
    
    attack_speed = max(0.5, player.stats.attack_speed)
    crit_chance = player.stats.crit_chance
    crit_mult = player.stats.crit_multiplier
    effective_crit_factor = 1.0 + (crit_chance * (crit_mult - 1.0))
    
    estimated_dps = max(5.0, atk * attack_speed * effective_crit_factor)
    
    # Constellation offline efficiency bonus
    offline_rank = 0
    if player.ascension_tree and "chronos_slumber" in player.ascension_tree.nodes:
        offline_rank = player.ascension_tree.nodes["chronos_slumber"].current_rank
    offline_efficiency = 0.60 + (offline_rank * 0.20)  # 60% base offline rate, up to 260%
    
    current_floor = player.active_run.current_floor
    simulated_floor = current_floor
    gold_accumulated = 0.0
    items_found = []
    bosses_cleared = 0
    
    time_remaining = capped_seconds
    
    # Simulate step by step with max 500 floors
    while time_remaining > 0 and (simulated_floor - current_floor) < 500:
        guardian_hp = get_guardian_max_hp(simulated_floor)
        time_to_kill = (guardian_hp / (estimated_dps * offline_efficiency)) + 1.0
        
        # If boss floor (every 5 floors) takes longer than 30s, player hits a wall and farms current floor
        if simulated_floor % 5 == 0 and time_to_kill > 30.0:
            # Wall hit: farm current non-boss floor with remaining time
            farm_floor = max(1, simulated_floor - 1)
            farm_hp = get_guardian_max_hp(farm_floor)
            farm_ttk = (farm_hp / (estimated_dps * offline_efficiency)) + 1.0
            clears = int(time_remaining / farm_ttk)
            gold_accumulated += clears * get_floor_gold_reward(farm_floor, player.stats.gold_multiplier)
            break
            
        if time_remaining >= time_to_kill:
            time_remaining -= time_to_kill
            gold_accumulated += get_floor_gold_reward(simulated_floor, player.stats.gold_multiplier)
            
            # Chance of finding loot on floor clear
            if simulated_floor % 5 == 0:
                bosses_cleared += 1
                item = generate_gear_item(simulated_floor)
                items_found.append(item.model_dump())
            elif simulated_floor % 2 == 0 and len(items_found) < 5:
                item = generate_gear_item(simulated_floor)
                items_found.append(item.model_dump())
                
            simulated_floor += 1
        else:
            # Partial floor gold
            fraction = time_remaining / time_to_kill
            gold_accumulated += get_floor_gold_reward(simulated_floor, player.stats.gold_multiplier) * fraction
            time_remaining = 0
            
    floors_cleared = simulated_floor - current_floor
    
    return {
        "elapsed_seconds": elapsed_seconds,
        "floors_cleared": max(0, floors_cleared),
        "bosses_cleared": bosses_cleared,
        "gold_earned": round(gold_accumulated, 1),
        "items_found": items_found[:6]  # Max 6 items
    }
