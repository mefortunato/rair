# Deploying RAIR to Google Cloud Run

This guide covers how to build, test, and deploy **RAIR (Rogue Ascension: Idle Role-playing)** to **Google Cloud Run** using the project's developer tooling.

---

## 🏗️ Architecture on Cloud Run

RAIR deploys as a **unified, multi-stage production container**:
1. **Frontend**: SvelteKit 3 client-side Single Page Application (SPA) compiled into static HTML, CSS, and JS bundles via `@sveltejs/adapter-static`.
2. **Backend**: FastAPI running on Python 3.14, powered by `uv` and `uvicorn`.
3. **Routing**: FastAPI serves both the high-performance `/api/...` endpoints and static frontend SPA assets (`index.html` fallback for client routes) from a single port (`$PORT`, default `8080`).
4. **Database**: Connects to MongoDB (MongoDB Atlas or hosted MongoDB) via `MONGO_URI`. If no database is configured or during initial setup, it automatically uses an in-memory fallback store so the game stays fully playable.
5. **Scale to Zero**: Scaled down to 0 instances when idle, incurring zero cost while maintaining instant scale-up on player visits.

---

## 🚀 Quick Start (One Command)

Deploy directly to Google Cloud Run:

```bash
./scripts/deploy-gcp.sh
```

This script:
1. Loads settings from your root `.env` file.
2. Runs unit tests and builds the static frontend to ensure zero regressions.
3. Automatically enables required Google Cloud APIs (`run.googleapis.com`, `artifactregistry.googleapis.com`, `cloudbuild.googleapis.com`).
4. Builds the container and deploys to Google Cloud Run.
5. Validates the live service health and prints your public HTTPS URL!

---

## ⚙️ Configuration (Single `.env` File)

All local development and Cloud Run deployment settings live in the single root `.env` file:

```bash
# Copy template if you haven't already
cp .env.example .env
```

Key GCP deployment variables in `.env`:

| Variable | Description | Default |
| :--- | :--- | :--- |
| `GCP_PROJECT_ID` | Your Google Cloud project ID | `` |
| `GCP_REGION` | GCP region for deployment | `us-central1` |
| `GCP_SERVICE_NAME` | Cloud Run service name | `rair` |
| `GCP_ARTIFACT_REPO` | Artifact Registry repository | `rair-containers` |
| `MONGO_URI` | MongoDB connection string (Atlas or hosted) | `mongodb://127.0.0.1:27017` |
| `DATABASE_NAME` | Database name | `rair_db` |
| `SECRET_KEY` | Auth secret key | `rair-cosmic-secret-key-2026` |
| `GOOGLE_CLIENT_ID` | Google OAuth Client ID for cloud saves | *(Optional)* |
| `CLOUD_RUN_CPU` | Cloud Run vCPU allocation | `1` |
| `CLOUD_RUN_MEMORY` | Cloud Run memory allocation | `512Mi` |
| `CLOUD_RUN_MIN_INSTANCES` | Min instances (0 = scale-to-zero) | `0` |
| `CLOUD_RUN_MAX_INSTANCES` | Max container instances | `10` |

---

## 🧪 Pre-Flight Testing: Local Container Test

Before deploying to the cloud, you can test the exact production multi-stage container locally:

```bash
./scripts/test-docker.sh
```

This automated test:
- Builds the multi-stage Dockerfile.
- Boots the container locally on port `8085`.
- Tests `/health`, `/` (HTML index), static CSS/JS assets, SPA route fallback, and API player initialization.
- Cleans up the test container automatically upon completion.

---

## 🛠️ Deployment Modes

The `./scripts/deploy-gcp.sh` tool supports three deployment workflows:

### 1. Source Deploy (Recommended, Default)
Builds directly on Google Cloud Build from source and deploys in a single command without needing local Docker:
```bash
./scripts/deploy-gcp.sh --mode source
```

### 2. Cloud Build Image Deploy
Submits container build to Google Cloud Build, stores the image in Artifact Registry, and deploys to Cloud Run:
```bash
./scripts/deploy-gcp.sh --mode build
```

### 3. Local Docker Build & Push
Builds the container on your local Docker daemon, pushes to Google Artifact Registry, and deploys:
```bash
./scripts/deploy-gcp.sh --mode local
```

### Dry Run
Preview all `gcloud` commands without modifying any cloud resources:
```bash
./scripts/deploy-gcp.sh --dry-run
```

---

## 🔐 Managing Secrets with Google Secret Manager

To avoid storing credentials in plaintext environment variables, use the `--use-secrets` flag:

```bash
./scripts/deploy-gcp.sh --use-secrets
```

This automatically:
1. Enables `secretmanager.googleapis.com`.
2. Creates or updates secrets for `rair-mongo-uri` and `rair-secret-key`.
3. Binds them to the Cloud Run container via `--set-secrets`.

---

## 🍃 Production Database: MongoDB Atlas Setup

To connect a permanent cloud database:
1. Create a free M0 cluster on [MongoDB Atlas](https://www.mongodb.com/atlas).
2. Under **Network Access**, add `0.0.0.0/0` (allow access from anywhere) so Cloud Run dynamic container IPs can connect.
3. Under **Database Access**, create a user and password.
4. Set the connection string in your `.env`:
   ```env
   MONGO_URI=mongodb+srv://<username>:<password>@cluster0.mongodb.net/rair_db?retryWrites=true&w=majority
   ```
5. Deploy:
   ```bash
   ./scripts/deploy-gcp.sh
   ```

---

## 📊 Monitoring & Logs

Stream real-time production logs from Cloud Run:
```bash
gcloud beta run services logs tail rair --region us-central1 --project rair-511815
```

View Cloud Run metrics in the Google Cloud Console:
```
https://console.cloud.google.com/run/detail/us-central1/rair/metrics?project=rair-511815
```
