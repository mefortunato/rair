from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException, Header
from pydantic import BaseModel
from backend.database import db_manager
from backend.models.player import Player, ActiveRun, ActiveUpgrades
from backend.engine.scaling import calculate_ascension_sparks, get_guardian_max_hp, get_floor_element

router = APIRouter(prefix="/api/ascension", tags=["Ascension"])

class UpgradeNodeRequest(BaseModel):
    node_id: str

@router.post("/ascend")
async def trigger_ascension(x_guest_token: str = Header(...)):
    player_doc = await db_manager.get_player_by_token(x_guest_token)
    if not player_doc:
        raise HTTPException(status_code=404, detail="Player not found")
        
    player = Player.model_validate(player_doc)
    highest_floor = max(player.highest_floor, player.active_run.current_floor)
    
    if highest_floor < 15:
        raise HTTPException(status_code=400, detail="Must reach at least Floor 15 to perform Ascension.")
        
    sparks_awarded = calculate_ascension_sparks(
        highest_floor=highest_floor,
        total_gold_earned=player.active_run.total_gold_this_run
    )
    
    # Calculate starting floor skip from Constellation perk if unlocked
    starting_floor = 1
    if "spire_stride" in player.ascension_tree.nodes:
        stride_rank = player.ascension_tree.nodes["spire_stride"].current_rank
        max_skip = int(highest_floor * 0.40)
        potential_skip = 1 + (stride_rank * 5)
        starting_floor = min(potential_skip, max_skip)
        starting_floor = max(1, starting_floor)
        
    # Apply Ascension updates
    player.ascension_tree.sparks += sparks_awarded
    player.ascension_tree.total_sparks_earned += sparks_awarded
    player.ascension_tree.times_ascended += 1
    player.ascension_level += 1
    
    # Reset active run
    first_hp = get_guardian_max_hp(starting_floor)
    first_elem = get_floor_element(starting_floor)
    
    player.active_run = ActiveRun(
        current_floor=starting_floor,
        highest_floor_this_run=starting_floor,
        gold=0.0,
        total_gold_this_run=0.0,
        guardian_hp_current=first_hp,
        guardian_hp_max=first_hp,
        guardian_element=first_elem,
        is_boss_floor=starting_floor % 5 == 0,
        upgrades=ActiveUpgrades(),
        active_buffs=[]
    )
    
    player.updated_at = datetime.now(timezone.utc)
    player.last_active = datetime.now(timezone.utc)
    
    await db_manager.save_player(player.model_dump())
    
    return {
        "status": "ascended",
        "sparks_awarded": sparks_awarded,
        "total_sparks": player.ascension_tree.sparks,
        "times_ascended": player.ascension_tree.times_ascended,
        "new_starting_floor": starting_floor,
        "player": player
    }

@router.post("/constellation/upgrade")
async def upgrade_constellation_node(req: UpgradeNodeRequest, x_guest_token: str = Header(...)):
    player_doc = await db_manager.get_player_by_token(x_guest_token)
    if not player_doc:
        raise HTTPException(status_code=404, detail="Player not found")
        
    player = Player.model_validate(player_doc)
    
    if req.node_id not in player.ascension_tree.nodes:
        raise HTTPException(status_code=404, detail=f"Constellation node '{req.node_id}' not found")
        
    node = player.ascension_tree.nodes[req.node_id]
    if node.current_rank >= node.max_rank:
        raise HTTPException(status_code=400, detail="Constellation node already at max rank")
        
    cost = node.get_cost_for_next_rank()
    if player.ascension_tree.sparks < cost:
        raise HTTPException(
            status_code=400,
            detail=f"Insufficient Ascension Sparks. Need {cost}, have {player.ascension_tree.sparks}."
        )
        
    player.ascension_tree.sparks -= cost
    node.current_rank += 1
    player.updated_at = datetime.now(timezone.utc)
    
    await db_manager.save_player(player.model_dump())
    
    return {
        "status": "upgraded",
        "node_id": req.node_id,
        "new_rank": node.current_rank,
        "remaining_sparks": player.ascension_tree.sparks,
        "node": node
    }
