import uuid
from datetime import datetime, timezone
from typing import Optional
from fastapi import APIRouter, HTTPException, Header
from pydantic import BaseModel
from backend.database import db_manager
from backend.models.player import Player, SyncPayload
from backend.models.gear import GearSlot, Rarity, ElementType, GearItem, Affix
from backend.engine.offline import calculate_offline_gains

router = APIRouter(prefix="/api/player", tags=["Player"])

class InitRequest(BaseModel):
    guest_token: Optional[str] = None
    handle: Optional[str] = None

class SalvageRequest(BaseModel):
    item_id: str

def create_starter_player(guest_token: str, handle: str = "Ascendant Rogue") -> Player:
    player_id = f"rair_{uuid.uuid4().hex[:12]}"
    starter_weapon = GearItem(
        id=f"gear_{uuid.uuid4().hex[:8]}",
        name="Novice Spire Blade",
        slot=GearSlot.WEAPON,
        rarity=Rarity.COMMON,
        element=ElementType.FIRE,
        level=1,
        base_atk=8.0,
        base_def=0.0,
        affixes=[Affix(stat="fire_dmg", value=0.10, description="+10% Inferno Mastery")],
        salvage_value=10,
        is_equipped=True
    )
    equipped = {
        GearSlot.WEAPON.value: starter_weapon,
        GearSlot.ARMOR.value: None,
        GearSlot.RING.value: None,
        GearSlot.AMULET.value: None,
        GearSlot.CATALYST.value: None,
    }
    return Player(
        player_id=player_id,
        guest_token=guest_token,
        handle=handle,
        equipped_gear=equipped,
        highest_floor=1
    )

@router.post("/init")
async def init_player(req: InitRequest):
    token = req.guest_token or f"guest_{uuid.uuid4().hex}"
    player_doc = await db_manager.get_player_by_token(token)
    
    offline_report = None
    if player_doc:
        player = Player.model_validate(player_doc)
        # Calculate offline gains
        offline_report = calculate_offline_gains(player)
        if offline_report and offline_report.get("bosses_cleared", 0) > 0:
            player.active_run.pending_perk_picks += offline_report["bosses_cleared"]
        # Update last_active
        player.last_active = datetime.now(timezone.utc)
        await db_manager.save_player(player.model_dump())
    else:
        player = create_starter_player(token, req.handle or "Ascendant Rogue")
        await db_manager.save_player(player.model_dump())
        
    return {
        "player": player,
        "offline_report": offline_report,
        "is_new": player_doc is None
    }

@router.get("/state")
async def get_player_state(x_guest_token: str = Header(...)):
    player_doc = await db_manager.get_player_by_token(x_guest_token)
    if not player_doc:
        raise HTTPException(status_code=404, detail="Player session not found")
    return {"player": Player.model_validate(player_doc)}

@router.post("/sync")
async def sync_player_state(payload: SyncPayload):
    now = datetime.now(timezone.utc)
    player_doc = await db_manager.get_player_by_token(payload.guest_token)
    if not player_doc:
        # Create from payload
        player = Player(
            player_id=payload.player_id,
            guest_token=payload.guest_token,
            handle=payload.handle or "Ascendant Rogue",
            active_run=payload.active_run,
            stats=payload.stats,
            equipped_gear=payload.equipped_gear,
            inventory=payload.inventory,
            ascension_tree=payload.ascension_tree,
            highest_floor=payload.highest_floor,
            last_active=now
        )
    else:
        player = Player.model_validate(player_doc)
        player.active_run = payload.active_run
        player.stats = payload.stats
        player.equipped_gear = payload.equipped_gear
        player.inventory = payload.inventory
        player.ascension_tree = payload.ascension_tree
        player.highest_floor = max(player.highest_floor, payload.highest_floor, payload.active_run.current_floor)
        if payload.handle:
            player.handle = payload.handle
        player.updated_at = now
        player.last_active = now

    await db_manager.save_player(player.model_dump())
    return {"status": "synced", "highest_floor": player.highest_floor}

@router.post("/salvage")
async def salvage_item(req: SalvageRequest, x_guest_token: str = Header(...)):
    player_doc = await db_manager.get_player_by_token(x_guest_token)
    if not player_doc:
        raise HTTPException(status_code=404, detail="Player not found")
        
    player = Player.model_validate(player_doc)
    item_to_remove = None
    remaining_inventory = []
    
    for item in player.inventory:
        if item.id == req.item_id:
            item_to_remove = item
        else:
            remaining_inventory.append(item)
            
    if not item_to_remove:
        raise HTTPException(status_code=400, detail="Item not found in inventory")
        
    aether_earned = item_to_remove.salvage_value
    player.stats.aether_essences += aether_earned
    player.inventory = remaining_inventory
    player.updated_at = datetime.now(timezone.utc)
    
    await db_manager.save_player(player.model_dump())
    return {
        "status": "salvaged",
        "aether_earned": aether_earned,
        "total_aether": player.stats.aether_essences,
        "inventory": player.inventory
    }
