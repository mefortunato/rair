import uuid
from fastapi import APIRouter, HTTPException, Header
from backend.database import db_manager
from backend.models.minigames import MinigameType, ActiveBuff, ClaimMinigameRequest
from backend.models.player import Player

router = APIRouter(prefix="/api/minigame", tags=["Minigames"])

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
    
    if req.minigame_type == MinigameType.OVERDRIVE_RING:
        # Precision ring hit gives frenzy crit + damage
        mult = (3.0 + overdrive_bonus) if req.success else 1.5
        dur = 12.0 * (1.0 + overdrive_bonus * 0.5)
        buff = ActiveBuff(
            id=f"buff_{uuid.uuid4().hex[:8]}",
            name="Overdrive Frenzy",
            multiplier=round(mult, 2),
            buff_type="all_damage",
            duration_seconds=round(dur, 1),
            time_remaining=round(dur, 1)
        )
    elif req.minigame_type == MinigameType.RUNE_WEAVE:
        # Rune weave unleashes elemental surge
        mult = (2.5 + overdrive_bonus) if req.success else 1.4
        dur = 15.0 * (1.0 + overdrive_bonus * 0.5)
        buff = ActiveBuff(
            id=f"buff_{uuid.uuid4().hex[:8]}",
            name=f"Elemental Surge ({req.element.capitalize()})",
            multiplier=round(mult, 2),
            buff_type="elemental_boost",
            duration_seconds=round(dur, 1),
            time_remaining=round(dur, 1)
        )
    elif req.minigame_type == MinigameType.ALCHEMICAL_TRANSMUTATION:
        # Transmutation crafts Midas gold rush or critical elixir
        mult = (2.0 + overdrive_bonus) if req.success else 1.3
        dur = 20.0 * (1.0 + overdrive_bonus * 0.5)
        buff = ActiveBuff(
            id=f"buff_{uuid.uuid4().hex[:8]}",
            name="Philosopher's Midas Elixir",
            multiplier=round(mult, 2),
            buff_type="gold_multiplier",
            duration_seconds=round(dur, 1),
            time_remaining=round(dur, 1)
        )
        
    return {
        "status": "buff_awarded",
        "buff": buff
    }
