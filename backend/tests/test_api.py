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

        # Push to floor 20
        player["active_run"]["current_floor"] = 20
        player["active_run"]["total_gold_this_run"] = 50000.0
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
        assert ascend_data["player"]["ascension_level"] == 1

        # Upgrade constellation node
        upgrade_resp = await client.post(
            "/api/ascension/constellation/upgrade",
            headers={"x-guest-token": token},
            json={"node_id": "cosmic_might"}
        )
        assert upgrade_resp.status_code == 200
        assert upgrade_resp.json()["new_rank"] == 1
