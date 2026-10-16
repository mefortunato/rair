# RAIR (Rogue Ascension: Idle Role-playing)

A modern, web-first idle role-playing game inspired by the incremental prestige and depth of *Obelisk Miner*, re-imagined as an infinite **Ascension Spire** climb with elemental affinities, active minigames, and procedural rogue gear.

---

## 🌟 Key Features

1. **Ascension Spire Combat**:
   - Idle automatic combat against escalating Spire Guardians and Bosses.
   - Exponential HP and defense curves that demand strategic prestige resets.
2. **Elemental Advantage Wheel**:
   - **Fire (Inferno)**: Melts Ice (+50% DMG), resisted by Lightning (-25%).
   - **Ice (Glacier)**: Freezes Lightning (+50% DMG), resisted by Fire (-25%).
   - **Lightning (Tempest)**: Overloads Fire (+50% DMG), resisted by Ice (-25%).
   - **Void (Abyss)**: Universal bonus damage (+35%) with volatile crit mechanics.
3. **Prestige & Ascension**:
   - Resets active floor and gold to earn permanent **Ascension Sparks**.
   - Unlock permanent perks in the **Constellation Tree** (Cosmic Might, Elemental Apotheosis, Spire Stride floor skip, Overdrive Resonance).
4. **Role-Playing Gear System**:
   - 5 equipment slots: Weapon, Armor, Ring, Amulet, Catalyst.
   - 5 rarity tiers: Common, Rare, Epic, Legendary, Mythic with randomized elemental affixes.
   - In-game inventory bag, equipment comparison, and Aether Essence salvaging.
5. **Three Active Progression Minigames**:
   - **Overdrive Timing Ring**: Precision timing click for guaranteed crits and +300% Frenzy DPS.
   - **Elemental Rune Weave**: Memory sequence game triggering cataclysmic Elemental Surge nukes.
   - **Alchemical Transmutation**: 3x3 shard matching puzzle crafting 2x Gold Philosopher's Elixirs.
6. **Offline Progression Engine**:
   - Automatically computes simulated floor clears, gold, and gear drops for time away (up to 24 hours).
7. **Procedural Web Audio API Synthesizer**:
   - Zero external audio files; all blades, crits, chimes, and fanfare synthesized dynamically via Web Audio API.

---

## 🛠️ Tech Stack

- **Frontend**: SvelteKit 3 (`@sveltejs/kit` v3) + Svelte 5 + TypeScript in client-side SPA mode (`ssr = false`), styled with custom Vanilla CSS and Web Audio API.
- **Backend**: FastAPI (Python 3.14) managed with `uv` (`pyproject.toml`, `uv sync`, `uv run`).
- **Database**: MongoDB storing player documents, active runs, constellation perks, and leaderboards.

---

## 🚀 Getting Started

### Quick Start (One Command)
Run MongoDB, FastAPI backend, and SvelteKit frontend concurrently with live reloading and automatic process cleanup:
```bash
./scripts/dev.sh
```
*Alternatively: `./dev.sh`.*
*This automatically starts the local MongoDB container (port `27019`), boots FastAPI with hot reload (`http://localhost:8001`), and launches the Vite dev server (`http://localhost:5173`). Press `Ctrl+C` to cleanly stop all servers and free ports.*

---

### Manual Step-by-Step Start

#### 1. Start MongoDB
MongoDB runs on host port `27019` via Docker Compose:
```bash
docker compose up -d mongodb
```

#### 2. Start the Backend (with `uv`)
```bash
cd backend
uv sync
MONGO_URI="mongodb://127.0.0.1:27019" uv run uvicorn backend.main:app --host 127.0.0.1 --port 8001 --reload
```
Runs at `http://localhost:8001`.

#### 3. Start the Frontend (SvelteKit 3)
```bash
cd frontend
npm install
npm run dev
```
Runs at `http://localhost:5173` (proxies `/api` requests to backend at port `8001`).

---

### 🧪 Automated Tests & Build
To run backend unit tests and build the frontend:
```bash
./scripts/build.sh
```
Or run pytest directly:
```bash
cd backend
uv run pytest -v
```
All 14 unit tests verify floor scaling, combat damage, loot generation, ascension reset formulas, SPA serving, and API routes.

---

## ☁️ Deployment to Google Cloud Run

RAIR includes complete dev tooling to deploy as an auto-scaling, serverless container on Google Cloud Run.

### 1. Pre-Flight Local Container Validation
Test the multi-stage production Docker container locally before deploying:
```bash
./scripts/test-docker.sh
```

### 2. One-Command Deploy to GCP Cloud Run
Deploy the game directly to your Google Cloud project (configured via `.env`):
```bash
./scripts/deploy-gcp.sh
```
*Supports `--dry-run`, `--use-secrets` (GCP Secret Manager), and custom `--region` / `--project` flags.*

For full configuration and architecture details, see the [GCP Cloud Run Deployment Guide](docs/GCP_RUN_DEPLOYMENT.md).

