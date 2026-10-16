import pytest
from httpx import AsyncClient, ASGITransport
from backend.main import app

@pytest.mark.anyio
async def test_health():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.get("/health")
        assert resp.status_code == 200
        data = resp.json()
        assert data["status"] == "healthy"

@pytest.mark.anyio
async def test_player_init_and_sync():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # Init new player
        init_resp = await client.post("/api/player/init", json={"handle": "Test Hero"})
        assert init_resp.status_code == 200
        data = init_resp.json()
        assert "player" in data
        player = data["player"]
        token = player["guest_token"]
        assert player["handle"] == "Test Hero"
        assert player["highest_floor"] == 1
        assert "weapon" in player["equipped_gear"]
        assert player["equipped_gear"]["weapon"] is not None

        # Fetch state with token
        state_resp = await client.get("/api/player/state", headers={"x-guest-token": token})
        assert state_resp.status_code == 200
        assert state_resp.json()["player"]["player_id"] == player["player_id"]

        # Sync state
        player["active_run"]["current_floor"] = 5
        player["highest_floor"] = 5
        sync_resp = await client.post("/api/player/sync", json={
            "player_id": player["player_id"],
            "guest_token": token,
            "active_run": player["active_run"],
            "stats": player["stats"],
            "equipped_gear": player["equipped_gear"],
            "inventory": player["inventory"],
            "ascension_tree": player["ascension_tree"],
            "highest_floor": 5,
            "handle": "Test Hero"
        })
        assert sync_resp.status_code == 200
        assert sync_resp.json()["highest_floor"] == 5

@pytest.mark.anyio
async def test_minigame_claim():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        init_resp = await client.post("/api/player/init", json={})
        token = init_resp.json()["player"]["guest_token"]

        # Legacy claim
        claim_resp = await client.post(
            "/api/minigame/claim-buff",
            headers={"x-guest-token": token},
            json={
                "minigame_type": "overdrive_ring",
                "score": 100,
                "success": True,
                "element": "fire"
            }
        )
        assert claim_resp.status_code == 200
        buff_data = claim_resp.json()
        assert "buff" in buff_data
        assert buff_data["buff"]["name"] == "Overdrive Frenzy"
        assert buff_data["buff"]["multiplier"] >= 3.0

        # Endless Minigame Positive Claim (Abyssal Runner -> Attack Speed)
        runner_resp = await client.post(
            "/api/minigame/claim-buff",
            headers={"x-guest-token": token},
            json={
                "minigame_type": "abyssal_runner",
                "score": 360,
                "difficulty": "abyssal",
                "target_stat": "attack_speed",
                "duration_seconds": 60.0
            }
        )
        assert runner_resp.status_code == 200
        runner_data = runner_resp.json()
        assert "gold_reward" in runner_data
        assert runner_data["gold_reward"] > 0
        runner_buff = runner_data["buff"]
        assert runner_buff["buff_type"] == "attack_speed"
        assert runner_buff["multiplier"] >= 2.0
        assert runner_buff["is_debuff"] is False
        assert "Abyssal Runner" in runner_buff["name"]

        # Endless Minigame Negative Claim (Fate's Gambit Bust -> Crit Multiplier Debuff)
        gambit_resp = await client.post(
            "/api/minigame/claim-buff",
            headers={"x-guest-token": token},
            json={
                "minigame_type": "fates_gambit",
                "score": -180,
                "difficulty": "adept",
                "target_stat": "crit_multiplier",
                "duration_seconds": 60.0
            }
        )
        assert gambit_resp.status_code == 200
        assert gambit_resp.json()["gold_reward"] == 0
        gambit_buff = gambit_resp.json()["buff"]
        assert gambit_buff["buff_type"] == "crit_multiplier"
        assert gambit_buff["multiplier"] < 1.0
        assert gambit_buff["is_debuff"] is True
        assert "Affliction:" in gambit_buff["name"]

@pytest.mark.anyio
async def test_ascension_flow():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        init_resp = await client.post("/api/player/init", json={})
        player = init_resp.json()["player"]
        token = player["guest_token"]

        # Try ascend at floor 1 -> should fail (< 15)
        fail_resp = await client.post("/api/ascension/ascend", headers={"x-guest-token": token})
        assert fail_resp.status_code == 400

        # Push to floor 20 and add perks
        player["active_run"]["current_floor"] = 20
        player["active_run"]["total_gold_this_run"] = 50000.0
        player["active_run"]["perks"] = [
            {"id": "colossus_might", "name": "Colossus Might", "description": "+20% ATK", "icon": "⚔️", "rarity": "rare", "rank": 2, "category": "offensive"}
        ]
        player["active_run"]["pending_perk_picks"] = 2
        player["highest_floor"] = 20
        await client.post("/api/player/sync", json={
            "player_id": player["player_id"],
            "guest_token": token,
            "active_run": player["active_run"],
            "stats": player["stats"],
            "equipped_gear": player["equipped_gear"],
            "inventory": player["inventory"],
            "ascension_tree": player["ascension_tree"],
            "highest_floor": 20,
            "handle": "Ascender"
        })

        # Ascend now
        ascend_resp = await client.post("/api/ascension/ascend", headers={"x-guest-token": token})
        assert ascend_resp.status_code == 200
        ascend_data = ascend_resp.json()
        assert ascend_data["status"] == "ascended"
        assert ascend_data["sparks_awarded"] > 0
        assert ascend_data["player"]["active_run"]["current_floor"] == 1
        assert ascend_data["player"]["active_run"]["perks"] == []
        assert ascend_data["player"]["active_run"]["pending_perk_picks"] == 0
        assert ascend_data["player"]["ascension_level"] == 1

        # Upgrade constellation node
        upgrade_resp = await client.post(
            "/api/ascension/constellation/upgrade",
            headers={"x-guest-token": token},
            json={"node_id": "cosmic_might"}
        )
        assert upgrade_resp.status_code == 200
        assert upgrade_resp.json()["new_rank"] == 1

@pytest.mark.anyio
async def test_player_reset_everything():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # Create player and advance progress
        init_resp = await client.post("/api/player/init", json={"handle": "Veteran Climber"})
        assert init_resp.status_code == 200
        player = init_resp.json()["player"]
        token = player["guest_token"]
        player_id = player["player_id"]

        # Simulate heavy progression: floor 25, 100k gold, perks, ascension sparks, inventory items
        player["active_run"]["current_floor"] = 25
        player["active_run"]["gold"] = 99999.0
        player["active_run"]["total_gold_this_run"] = 150000.0
        player["active_run"]["perks"] = [
            {"id": "colossus_might", "name": "Colossus Might", "description": "+20% ATK", "icon": "⚔️", "rarity": "rare", "rank": 3, "category": "offensive"}
        ]
        player["active_run"]["pending_perk_picks"] = 3
        player["highest_floor"] = 25
        player["ascension_level"] = 2
        player["ascension_tree"]["sparks"] = 450
        player["stats"]["aether_essences"] = 120
        player["inventory"] = [
            {
                "id": "gear_test_epic",
                "name": "Abyssal Ring of Doom",
                "slot": "ring",
                "rarity": "epic",
                "element": "void",
                "level": 25,
                "base_atk": 45.0,
                "base_def": 10.0,
                "affixes": [],
                "salvage_value": 75,
                "is_equipped": False
            }
        ]

        await client.post("/api/player/sync", json={
            "player_id": player_id,
            "guest_token": token,
            "active_run": player["active_run"],
            "stats": player["stats"],
            "equipped_gear": player["equipped_gear"],
            "inventory": player["inventory"],
            "ascension_tree": player["ascension_tree"],
            "highest_floor": 25,
            "handle": "Veteran Climber"
        })

        # Verify state is advanced
        state_resp = await client.get("/api/player/state", headers={"x-guest-token": token})
        assert state_resp.json()["player"]["highest_floor"] == 25
        assert len(state_resp.json()["player"]["inventory"]) == 1

        # Execute Hard Reset: reset everything back to as if you just started playing for the first time
        reset_resp = await client.post("/api/player/reset", headers={"x-guest-token": token})
        assert reset_resp.status_code == 200
        reset_data = reset_resp.json()
        assert reset_data["status"] == "reset"
        reset_player = reset_data["player"]

        # Verify reset player has starting floor 1, no perks, 0 sparks, empty inventory, starter blade
        assert reset_player["player_id"] == player_id
        assert reset_player["guest_token"] == token
        assert reset_player["highest_floor"] == 1
        assert reset_player["ascension_level"] == 0
        assert reset_player["active_run"]["current_floor"] == 1
        assert reset_player["active_run"]["gold"] == 0.0
        assert reset_player["active_run"]["perks"] == []
        assert reset_player["active_run"]["pending_perk_picks"] == 0
        assert reset_player["ascension_tree"]["sparks"] == 0
        assert reset_player["stats"]["aether_essences"] == 0
        assert reset_player["inventory"] == []
        assert reset_player["equipped_gear"]["weapon"]["name"] == "Novice Spire Blade"
        assert reset_player["equipped_gear"]["armor"] is None

@pytest.mark.anyio
async def test_auth_google_and_guest_linking():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # 1. Config check
        cfg_resp = await client.get("/api/auth/config")
        assert cfg_resp.status_code == 200
        assert "google_client_id" in cfg_resp.json()

        # 2. Guest login
        guest_resp = await client.post("/api/auth/guest", json={"handle": "Rogue Traveler"})
        assert guest_resp.status_code == 200
        guest_data = guest_resp.json()
        assert guest_data["player"]["is_guest"] is True
        guest_token = guest_data["token"]

        # Advance guest progress to floor 10
        guest_player = guest_data["player"]
        guest_player["active_run"]["current_floor"] = 10
        guest_player["highest_floor"] = 10
        await client.post("/api/player/sync", json={
            "player_id": guest_player["player_id"],
            "guest_token": guest_token,
            "active_run": guest_player["active_run"],
            "stats": guest_player["stats"],
            "equipped_gear": guest_player["equipped_gear"],
            "inventory": guest_player["inventory"],
            "ascension_tree": guest_player["ascension_tree"],
            "highest_floor": 10,
            "handle": "Rogue Traveler"
        })

        # 3. Link guest progress to a new Google account
        link_resp = await client.post("/api/auth/link-google", json={
            "guest_token": guest_token,
            "google_id": "google_sub_12345",
            "email": "climber@gmail.com",
            "name": "Climber Supreme",
            "picture": "https://example.com/avatar.png"
        })
        assert link_resp.status_code == 200
        linked_data = link_resp.json()
        assert linked_data["status"] == "linked"
        linked_player = linked_data["player"]
        assert linked_player["auth_provider"] == "google"
        assert linked_player["is_guest"] is False
        assert linked_player["google_id"] == "google_sub_12345"
        assert linked_player["email"] == "climber@gmail.com"
        assert linked_player["highest_floor"] == 10

        # 4. Login directly with this Google account on another session
        google_login_resp = await client.post("/api/auth/google", json={
            "google_id": "google_sub_12345",
            "email": "climber@gmail.com"
        })
        assert google_login_resp.status_code == 200
        g_data = google_login_resp.json()
        assert g_data["is_new"] is False
        assert g_data["player"]["highest_floor"] == 10
        assert g_data["player"]["google_id"] == "google_sub_12345"

        # 5. Test Linking Conflict: Another guest wants to link to existing Google account
        guest2_resp = await client.post("/api/auth/guest", json={"handle": "Second Guest"})
        guest2_token = guest2_resp.json()["token"]

        conflict_resp = await client.post("/api/auth/link-google", json={
            "guest_token": guest2_token,
            "google_id": "google_sub_12345"
        })
        assert conflict_resp.status_code == 200
        c_data = conflict_resp.json()
        assert c_data["status"] == "conflict"
        assert "guest_summary" in c_data
        assert "cloud_summary" in c_data

        # Conflict resolution: load_cloud
        resolve_cloud = await client.post("/api/auth/link-google", json={
            "guest_token": guest2_token,
            "google_id": "google_sub_12345",
            "conflict_strategy": "load_cloud"
        })
        assert resolve_cloud.status_code == 200
        assert resolve_cloud.json()["status"] == "cloud_loaded"
        assert resolve_cloud.json()["player"]["google_id"] == "google_sub_12345"

@pytest.mark.anyio
async def test_spa_and_static_serving():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # Root endpoint
        root_resp = await client.get("/")
        assert root_resp.status_code == 200
        # If static build exists, index.html is served (contains HTML)
        assert "<!doctype html>" in root_resp.text.lower() or "rair" in root_resp.text.lower()

        # Unknown API endpoint returns 404 JSON, not HTML SPA fallback
        api_404_resp = await client.get("/api/unknown-endpoint")
        assert api_404_resp.status_code == 404
        assert api_404_resp.headers.get("content-type", "").startswith("application/json")

