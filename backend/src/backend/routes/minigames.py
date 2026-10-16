import uuid
from fastapi import APIRouter, HTTPException, Header
from backend.database import db_manager
from backend.models.minigames import MinigameType, ActiveBuff, ClaimMinigameRequest
from backend.models.player import Player

from backend.engine.scaling import get_floor_gold_reward

router = APIRouter(prefix="/api/minigame", tags=["Minigames"])

STAT_LABELS = {
    "all_damage": "Total Damage",
    "attack_speed": "Attack Speed",
    "crit_chance": "Critical Chance",
    "crit_multiplier": "Critical Damage",
    "gold_multiplier": "Gold Find",
    "elemental_boost": "Elemental Mastery",
}

GAME_TITLES = {
    "abyssal_runner": "Abyssal Runner",
    "fates_gambit": "Fate's Gambit",
    "alchemical_brewmaster": "Alchemical Brewmaster",
    "rune_scribe": "Rune Scribe",
    "vault_cracker": "Vault Cracker",
    "titans_forge": "Titan's Forge",
    "celestial_orbit": "Celestial Orbit",
    "spire_defense": "Spire Defense",
    "astral_angler": "Astral Angler",
    "arcane_decryption": "Arcane Decryption",
}

@router.post("/claim-buff")
async def claim_minigame_buff(req: ClaimMinigameRequest, x_guest_token: str = Header(...)):
    player_doc = await db_manager.get_player_by_token(x_guest_token)
    if not player_doc:
        raise HTTPException(status_code=404, detail="Player not found")
        
    player = Player.model_validate(player_doc)
    
    # Calculate Constellation overdrive bonus if unlocked
    overdrive_bonus = 0.0
    if "overdrive_resonance" in player.ascension_tree.nodes:
        overdrive_bonus = player.ascension_tree.nodes["overdrive_resonance"].current_rank * 0.40
        
    buff = None
    gold_reward = 0.0
    
    # Legacy fallbacks
    if req.minigame_type == MinigameType.OVERDRIVE_RING.value:
        mult = (3.5 + overdrive_bonus) if req.success else 1.8
        dur = 25.0 * (1.0 + overdrive_bonus * 0.5)
        if req.success:
            floor_base_gold = get_floor_gold_reward(player.active_run.current_floor, 1.0)
            gold_reward = round(floor_base_gold * 4.0, 1)
            player.active_run.gold += gold_reward
            player.active_run.total_gold_this_run += gold_reward
        buff = ActiveBuff(
            id=f"buff_{uuid.uuid4().hex[:8]}",
            name="Overdrive Frenzy",
            multiplier=round(mult, 2),
            buff_type="all_damage",
            duration_seconds=round(dur, 1),
            time_remaining=round(dur, 1),
            is_debuff=False,
            gold_reward=gold_reward
        )
    elif req.minigame_type == MinigameType.RUNE_WEAVE.value:
        mult = (3.0 + overdrive_bonus) if req.success else 1.6
        dur = 30.0 * (1.0 + overdrive_bonus * 0.5)
        if req.success:
            floor_base_gold = get_floor_gold_reward(player.active_run.current_floor, 1.0)
            gold_reward = round(floor_base_gold * 4.0, 1)
            player.active_run.gold += gold_reward
            player.active_run.total_gold_this_run += gold_reward
        buff = ActiveBuff(
            id=f"buff_{uuid.uuid4().hex[:8]}",
            name=f"Elemental Surge ({req.element.capitalize()})",
            multiplier=round(mult, 2),
            buff_type="elemental_boost",
            duration_seconds=round(dur, 1),
            time_remaining=round(dur, 1),
            is_debuff=False,
            gold_reward=gold_reward
        )
    elif req.minigame_type == MinigameType.ALCHEMICAL_TRANSMUTATION.value:
        mult = (2.5 + overdrive_bonus) if req.success else 1.5
        dur = 35.0 * (1.0 + overdrive_bonus * 0.5)
        if req.success:
            floor_base_gold = get_floor_gold_reward(player.active_run.current_floor, 1.0)
            gold_reward = round(floor_base_gold * 4.0, 1)
            player.active_run.gold += gold_reward
            player.active_run.total_gold_this_run += gold_reward
        buff = ActiveBuff(
            id=f"buff_{uuid.uuid4().hex[:8]}",
            name="Philosopher's Midas Elixir",
            multiplier=round(mult, 2),
            buff_type="gold_multiplier",
            duration_seconds=round(dur, 1),
            time_remaining=round(dur, 1),
            is_debuff=False,
            gold_reward=gold_reward
        )
    else:
        # Endless Risk/Reward Minigames
        diff = req.difficulty.lower()
        if diff == "abyssal":
            d_mult = 4.0
            max_buff = 3.50  # Up to +350% (4.5x multiplier!)
            max_debuff = 0.55
            base_bounty_mult = 12.0
        elif diff == "adept":
            d_mult = 2.4
            max_buff = 1.80  # Up to +180% (2.8x multiplier!)
            max_debuff = 0.35
            base_bounty_mult = 6.0
        else:  # novice
            d_mult = 1.4
            max_buff = 0.75  # Up to +75% (1.75x multiplier!)
            max_debuff = 0.15
            base_bounty_mult = 3.0

        score = req.score
        is_debuff = score < 0

        if score >= 0:
            score_ratio = min(1.0, score / 120.0)
            bonus = max_buff * score_ratio
            bonus *= (1.0 + overdrive_bonus * 0.30)
            final_mult = 1.0 + bonus

            # Award instant Astral Gold Bounty based on floor and performance
            floor_base_gold = get_floor_gold_reward(player.active_run.current_floor, 1.0)
            gold_reward = round(floor_base_gold * (base_bounty_mult + score_ratio * base_bounty_mult), 1)
            player.active_run.gold += gold_reward
            player.active_run.total_gold_this_run += gold_reward
        else:
            penalty = min(max_debuff, (abs(score) / 120.0) * max_debuff)
            final_mult = max(0.35, 1.0 - penalty)
            gold_reward = 0.0

        final_mult = round(final_mult, 2)
        target_stat = req.target_stat if req.target_stat in STAT_LABELS else "all_damage"
        stat_name = STAT_LABELS.get(target_stat, "Stat")
        game_name = GAME_TITLES.get(req.minigame_type, req.minigame_type.replace("_", " ").title())

        dur = max(45.0, req.duration_seconds) * (1.0 + overdrive_bonus * 0.25)
        prefix = "Affliction:" if is_debuff else "Catalyst:"
        buff_name = f"{prefix} {game_name} ({stat_name})"

        buff = ActiveBuff(
            id=f"buff_{uuid.uuid4().hex[:8]}",
            name=buff_name,
            multiplier=final_mult,
            buff_type=target_stat,
            duration_seconds=round(dur, 1),
            time_remaining=round(dur, 1),
            is_debuff=is_debuff,
            gold_reward=gold_reward
        )
        
    if gold_reward > 0:
        await db_manager.save_player(player.model_dump())

    return {
        "status": "buff_awarded",
        "buff": buff,
        "gold_reward": gold_reward,
        "player_gold": player.active_run.gold
    }

