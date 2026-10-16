import base64
import json
import logging
import uuid
from datetime import datetime, timezone
from typing import Optional
from fastapi import APIRouter, HTTPException, Header
from pydantic import BaseModel
from backend.config import settings
from backend.database import db_manager
from backend.models.player import Player
from backend.routes.player import create_starter_player, create_starter_gear
from backend.engine.offline import calculate_offline_gains

logger = logging.getLogger("rair.auth")
router = APIRouter(prefix="/api/auth", tags=["Auth"])

class GoogleAuthPayload(BaseModel):
    credential: Optional[str] = None
    google_id: Optional[str] = None
    email: Optional[str] = None
    name: Optional[str] = None
    picture: Optional[str] = None
    guest_token_to_link: Optional[str] = None

class LinkGooglePayload(BaseModel):
    guest_token: str
    credential: Optional[str] = None
    google_id: Optional[str] = None
    email: Optional[str] = None
    name: Optional[str] = None
    picture: Optional[str] = None
    conflict_strategy: Optional[str] = None  # "keep_guest" | "load_cloud"

class GuestAuthPayload(BaseModel):
    guest_token: Optional[str] = None
    handle: Optional[str] = "Guest Ascendant"

def decode_google_jwt(credential: str) -> dict:
    """Decodes Google Identity Services JWT payload safely."""
    try:
        parts = credential.split(".")
        if len(parts) < 2:
            return {}
        payload_b64 = parts[1]
        remainder = len(payload_b64) % 4
        if remainder > 0:
            payload_b64 += "=" * (4 - remainder)
        decoded_bytes = base64.urlsafe_b64decode(payload_b64)
        return json.loads(decoded_bytes.decode("utf-8"))
    except Exception as e:
        logger.warning(f"Error decoding Google credential: {e}")
        return {}

@router.get("/config")
async def get_auth_config():
    return {
        "google_client_id": settings.google_client_id,
        "is_google_auth_available": bool(settings.google_client_id)
    }

@router.post("/guest")
async def guest_login(payload: GuestAuthPayload):
    """Authenticate or initialize as guest."""
    if payload.guest_token:
        doc = await db_manager.get_player_by_token(payload.guest_token)
        if doc:
            player = Player.model_validate(doc)
            offline_report = calculate_offline_gains(player)
            player.last_active = datetime.now(timezone.utc)
            await db_manager.save_player(player.model_dump())
            return {
                "player": player,
                "token": player.guest_token,
                "offline_report": offline_report,
                "is_new": False
            }

    token = payload.guest_token or f"guest_{uuid.uuid4().hex}"
    player = create_starter_player(
        guest_token=token,
        handle=payload.handle or "Guest Ascendant",
        auth_provider="guest",
        is_guest=True
    )
    await db_manager.save_player(player.model_dump())
    return {
        "player": player,
        "token": player.guest_token,
        "offline_report": None,
        "is_new": True
    }

@router.post("/google")
async def google_login(payload: GoogleAuthPayload):
    """Sign in or register using Google."""
    google_id = payload.google_id
    email = payload.email
    name = payload.name
    picture = payload.picture

    if payload.credential:
        decoded = decode_google_jwt(payload.credential)
        if decoded:
            google_id = decoded.get("sub") or google_id
            email = decoded.get("email") or email
            name = decoded.get("name") or name
            picture = decoded.get("picture") or picture

    if not google_id:
        raise HTTPException(status_code=400, detail="Missing Google user credentials or identifier")

    # If requested to link an existing guest token directly from login flow
    if payload.guest_token_to_link:
        guest_doc = await db_manager.get_player_by_token(payload.guest_token_to_link)
        if guest_doc:
            # Check if there is already another player with this google_id
            existing_google = await db_manager.get_player_by_google_id(google_id)
            if not existing_google or existing_google.get("player_id") == guest_doc.get("player_id"):
                player = Player.model_validate(guest_doc)
                player.auth_provider = "google"
                player.google_id = google_id
                player.email = email
                player.avatar_url = picture
                player.is_guest = False
                if name and player.handle in ["Ascendant Rogue", "Guest Ascendant"]:
                    player.handle = name
                player.updated_at = datetime.now(timezone.utc)
                player.last_active = datetime.now(timezone.utc)
                await db_manager.save_player(player.model_dump())
                return {
                    "player": player,
                    "token": player.guest_token,
                    "offline_report": None,
                    "is_new": False,
                    "linked": True
                }

    # Standard Google Login or Account lookup
    doc = await db_manager.get_player_by_google_id(google_id)
    if doc:
        player = Player.model_validate(doc)
        offline_report = calculate_offline_gains(player)
        if email:
            player.email = email
        if picture:
            player.avatar_url = picture
        player.last_active = datetime.now(timezone.utc)
        await db_manager.save_player(player.model_dump())
        return {
            "player": player,
            "token": player.guest_token,
            "offline_report": offline_report,
            "is_new": False
        }

    # Create new Google Player
    token = f"google_{uuid.uuid4().hex}"
    handle = name or (email.split("@")[0] if email else "Google Ascendant")
    player = create_starter_player(
        guest_token=token,
        handle=handle,
        auth_provider="google",
        google_id=google_id,
        email=email,
        avatar_url=picture,
        is_guest=False
    )
    await db_manager.save_player(player.model_dump())
    return {
        "player": player,
        "token": player.guest_token,
        "offline_report": None,
        "is_new": True
    }

@router.post("/link-google")
async def link_google_account(payload: LinkGooglePayload):
    """
    Links current Guest progress to a Google Account.
    If the Google account already has a saved game, offers conflict resolution
    or applies the specified conflict_strategy ('keep_guest' or 'load_cloud').
    """
    guest_doc = await db_manager.get_player_by_token(payload.guest_token)
    if not guest_doc:
        raise HTTPException(status_code=404, detail="Guest session not found")

    google_id = payload.google_id
    email = payload.email
    name = payload.name
    picture = payload.picture

    if payload.credential:
        decoded = decode_google_jwt(payload.credential)
        if decoded:
            google_id = decoded.get("sub") or google_id
            email = decoded.get("email") or email
            name = decoded.get("name") or name
            picture = decoded.get("picture") or picture

    if not google_id:
        raise HTTPException(status_code=400, detail="Missing Google ID or credentials")

    existing_google = await db_manager.get_player_by_google_id(google_id)

    # Case 1: Google account already matches this guest session
    if existing_google and existing_google.get("player_id") == guest_doc.get("player_id"):
        player = Player.model_validate(guest_doc)
        return {
            "status": "already_linked",
            "message": "Account is already linked to Google",
            "player": player,
            "token": player.guest_token
        }

    # Case 2: Existing Google account has saved progress (Conflict)
    if existing_google:
        if not payload.conflict_strategy:
            return {
                "status": "conflict",
                "message": "A saved game already exists for this Google account. Choose which progress you want to keep.",
                "guest_summary": {
                    "handle": guest_doc.get("handle", "Guest"),
                    "highest_floor": guest_doc.get("highest_floor", 1),
                    "sparks": guest_doc.get("ascension_tree", {}).get("sparks", 0),
                    "inventory_count": len(guest_doc.get("inventory", []))
                },
                "cloud_summary": {
                    "handle": existing_google.get("handle", "Cloud Ascendant"),
                    "highest_floor": existing_google.get("highest_floor", 1),
                    "sparks": existing_google.get("ascension_tree", {}).get("sparks", 0),
                    "inventory_count": len(existing_google.get("inventory", []))
                }
            }

        if payload.conflict_strategy == "keep_guest":
            # Overwrite Cloud save with Guest progress
            guest_player = Player.model_validate(guest_doc)
            cloud_player = Player.model_validate(existing_google)

            cloud_player.active_run = guest_player.active_run
            cloud_player.stats = guest_player.stats
            cloud_player.ascension_tree = guest_player.ascension_tree
            cloud_player.equipped_gear = guest_player.equipped_gear
            cloud_player.inventory = guest_player.inventory
            cloud_player.highest_floor = max(guest_player.highest_floor, cloud_player.highest_floor)
            cloud_player.ascension_level = max(guest_player.ascension_level, cloud_player.ascension_level)
            cloud_player.auth_provider = "google"
            cloud_player.is_guest = False
            if email:
                cloud_player.email = email
            if picture:
                cloud_player.avatar_url = picture
            cloud_player.updated_at = datetime.now(timezone.utc)
            cloud_player.last_active = datetime.now(timezone.utc)

            if guest_player.player_id != cloud_player.player_id:
                await db_manager.delete_player(guest_player.player_id)

            await db_manager.save_player(cloud_player.model_dump())
            return {
                "status": "linked",
                "message": "Guest progress saved to Google account (overwrote previous cloud save)",
                "player": cloud_player,
                "token": cloud_player.guest_token
            }

        elif payload.conflict_strategy == "load_cloud":
            # Discard guest, load existing cloud account
            cloud_player = Player.model_validate(existing_google)
            return {
                "status": "cloud_loaded",
                "message": "Loaded existing Google cloud save",
                "player": cloud_player,
                "token": cloud_player.guest_token
            }
        else:
            raise HTTPException(status_code=400, detail="Invalid conflict strategy")

    # Case 3: No conflict - upgrade current guest to Google
    player = Player.model_validate(guest_doc)
    player.auth_provider = "google"
    player.is_guest = False
    player.google_id = google_id
    player.email = email
    player.avatar_url = picture
    if name and player.handle in ["Ascendant Rogue", "Guest Ascendant"]:
        player.handle = name
    player.updated_at = datetime.now(timezone.utc)
    player.last_active = datetime.now(timezone.utc)

    await db_manager.save_player(player.model_dump())
    return {
        "status": "linked",
        "message": "Guest progress successfully linked to Google account",
        "player": player,
        "token": player.guest_token
    }
