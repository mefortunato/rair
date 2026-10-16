import uuid
from datetime import datetime, timezone
from typing import Optional
from fastapi import APIRouter, HTTPException, Header
from pydantic import BaseModel
from backend.database import db_manager
from backend.models.player import Player, SyncPayload, ActiveRun, PlayerStats
from backend.models.ascension import AscensionTree
from backend.models.gear import GearSlot, Rarity, ElementType, GearItem, Affix
from backend.engine.offline import calculate_offline_gains

router = APIRouter(prefix="/api/player", tags=["Player"])

class InitRequest(BaseModel):
    guest_token: Optional[str] = None
    handle: Optional[str] = None

class SalvageRequest(BaseModel):
    item_id: str

def create_starter_gear() -> dict[str, Optional[GearItem]]:
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
    return {
        GearSlot.WEAPON.value: starter_weapon,
        GearSlot.ARMOR.value: None,
        GearSlot.RING.value: None,
        GearSlot.AMULET.value: None,
        GearSlot.CATALYST.value: None,
    }

def create_starter_player(
    guest_token: str,
    handle: str = "Ascendant Rogue",
    auth_provider: str = "guest",
    google_id: Optional[str] = None,
    email: Optional[str] = None,
    avatar_url: Optional[str] = None,
    is_guest: bool = True
) -> Player:
    player_id = f"rair_{uuid.uuid4().hex[:12]}"
    return Player(
        player_id=player_id,
        guest_token=guest_token,
        handle=handle,
        auth_provider=auth_provider,
        google_id=google_id,
        email=email,
        avatar_url=avatar_url,
        is_guest=is_guest,
        equipped_gear=create_starter_gear(),
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
            auth_provider=payload.auth_provider or "guest",
            google_id=payload.google_id,
            email=payload.email,
            avatar_url=payload.avatar_url,
            is_guest=payload.is_guest if payload.is_guest is not None else True,
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
        if payload.auth_provider:
            player.auth_provider = payload.auth_provider
        if payload.google_id:
            player.google_id = payload.google_id
        if payload.email:
            player.email = payload.email
        if payload.avatar_url:
            player.avatar_url = payload.avatar_url
        if payload.is_guest is not None:
            player.is_guest = payload.is_guest
        player.updated_at = now
        player.last_active = now

    await db_manager.save_player(player.model_dump())
    return {"status": "synced", "highest_floor": player.highest_floor}

@router.post("/reset")
async def reset_player(x_guest_token: str = Header(...)):
    player_doc = await db_manager.get_player_by_token(x_guest_token)
    if not player_doc:
        raise HTTPException(status_code=404, detail="Player session not found")
        
    player = Player.model_validate(player_doc)
    now = datetime.now(timezone.utc)
    
    # Reset all game progression back to day 1 starter state
    player.highest_floor = 1
    player.ascension_level = 0
    player.active_run = ActiveRun()
    player.stats = PlayerStats()
    player.ascension_tree = AscensionTree.default_tree()
    player.equipped_gear = create_starter_gear()
    player.inventory = []
    player.updated_at = now
    player.last_active = now
    
    await db_manager.save_player(player.model_dump())
    return {
        "status": "reset",
        "message": "Player progression completely reset to starting state",
        "player": player
    }

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
