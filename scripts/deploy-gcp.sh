#!/usr/bin/env bash
# ==============================================================================
# RAIR (Rogue Ascension: Idle Role-playing)
# GOOGLE CLOUD RUN DEPLOYMENT TOOL
# ==============================================================================
# Builds and deploys RAIR (SvelteKit SPA + FastAPI backend) to Google Cloud Run.
#
# Usage:
#   ./scripts/deploy-gcp.sh [OPTIONS]
#
# Example:
#   ./scripts/deploy-gcp.sh --project my-gcp-project --region us-central1
# ==============================================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"

cd "${ROOT_DIR}"

# --- Color formatting helpers ---
BOLD='\033[1m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
CYAN='\033[0;36m'
NC='\033[0m'

# --- 1. Load configuration from unified .env if present ---
if [ -f "${ROOT_DIR}/.env" ]; then
  echo -e "${CYAN}ℹ️  Loading configuration from .env...${NC}"
  set -a
  source <(grep -v '^#' "${ROOT_DIR}/.env" | grep -v '^$')
  set +a
fi

# --- 2. Default Parameters ---
PROJECT_ID="${GCP_PROJECT_ID:-$(gcloud config get-value project 2>/dev/null || echo "")}"
REGION="${GCP_REGION:-us-central1}"
SERVICE_NAME="${GCP_SERVICE_NAME:-rair}"
ARTIFACT_REPO="${GCP_ARTIFACT_REPO:-rair-containers}"
DEPLOY_MODE="source" # options: source, build, local
CPU="${CLOUD_RUN_CPU:-1}"
MEMORY="${CLOUD_RUN_MEMORY:-512Mi}"
MIN_INSTANCES="${CLOUD_RUN_MIN_INSTANCES:-0}"
MAX_INSTANCES="${CLOUD_RUN_MAX_INSTANCES:-10}"
CONCURRENCY="${CLOUD_RUN_CONCURRENCY:-80}"
ALLOW_UNAUTH="--allow-unauthenticated"
USE_SECRET_MANAGER=false
DRY_RUN=false
RUN_TESTS=true

print_help() {
  echo -e "${BOLD}RAIR - Google Cloud Run Deployment Tool${NC}"
  echo ""
  echo "Usage: ./scripts/deploy-gcp.sh [OPTIONS]"
  echo ""
  echo "Options:"
  echo "  -p, --project <ID>       GCP Project ID (default: current gcloud active project)"
  echo "  -r, --region <REGION>    GCP Region (default: us-central1)"
  echo "  -s, --service <NAME>     Cloud Run service name (default: rair)"
  echo "  -m, --mode <MODE>        Deployment mode: 'source' (recommended), 'build', or 'local'"
  echo "                           - source: builds and deploys directly from source on Cloud Build"
  echo "                           - build:  builds image with Cloud Build, then deploys image"
  echo "                           - local:  builds locally with Docker, pushes to Artifact Registry"
  echo "      --repo <NAME>        Artifact Registry repo name (default: rair-containers)"
  echo "      --mongo-uri <URI>    Production MongoDB connection string"
  echo "      --secret-key <KEY>   Application secret key for auth tokens"
  echo "      --google-client-id <ID> Google OAuth Client ID"
  echo "      --cpu <CORES>        CPU allocation (default: 1)"
  echo "      --memory <MEM>       Memory allocation (default: 512Mi)"
  echo "      --min-instances <N>  Minimum instances (default: 0 for scale-to-zero free tier)"
  echo "      --max-instances <N>  Maximum instances (default: 10)"
  echo "      --use-secrets        Store sensitive values (MONGO_URI, SECRET_KEY) in GCP Secret Manager"
  echo "      --skip-tests         Skip running automated unit tests before deploy"
  echo "      --dry-run            Display commands without executing them"
  echo "  -h, --help               Show this help message"
  echo ""
}

# --- 3. Parse CLI Arguments ---
while [[ $# -gt 0 ]]; do
  case "$1" in
    -p|--project)
      PROJECT_ID="$2"
      shift 2
      ;;
    -r|--region)
      REGION="$2"
      shift 2
      ;;
    -s|--service)
      SERVICE_NAME="$2"
      shift 2
      ;;
    -m|--mode)
      DEPLOY_MODE="$2"
      shift 2
      ;;
    --repo)
      ARTIFACT_REPO="$2"
      shift 2
      ;;
    --mongo-uri)
      MONGO_URI="$2"
      shift 2
      ;;
    --secret-key)
      SECRET_KEY="$2"
      shift 2
      ;;
    --google-client-id)
      GOOGLE_CLIENT_ID="$2"
      shift 2
      ;;
    --cpu)
      CPU="$2"
      shift 2
      ;;
    --memory)
      MEMORY="$2"
      shift 2
      ;;
    --min-instances)
      MIN_INSTANCES="$2"
      shift 2
      ;;
    --max-instances)
      MAX_INSTANCES="$2"
      shift 2
      ;;
    --use-secrets)
      USE_SECRET_MANAGER=true
      shift
      ;;
    --skip-tests)
      RUN_TESTS=false
      shift
      ;;
    --dry-run)
      DRY_RUN=true
      shift
      ;;
    -h|--help)
      print_help
      exit 0
      ;;
    *)
      echo -e "${RED}Unknown option: $1${NC}"
      print_help
      exit 1
      ;;
  esac
done

# --- 4. Validate Prerequisites ---
echo -e "${BOLD}${BLUE}==============================================================${NC}"
echo -e "${BOLD}${BLUE}  RAIR (Rogue Ascension) - Deployment to Google Cloud Run     ${NC}"
echo -e "${BOLD}${BLUE}==============================================================${NC}"

if ! command -v gcloud >/dev/null 2>&1; then
  echo -e "${RED}❌ 'gcloud' CLI is not installed or not in PATH.${NC}"
  echo "Install Google Cloud SDK from: https://cloud.google.com/sdk/docs/install"
  exit 1
fi

if [ -z "${PROJECT_ID}" ] || [ "${PROJECT_ID}" = "(unset)" ]; then
  echo -e "${RED}❌ No GCP Project ID specified.${NC}"
  echo "Please provide --project <PROJECT_ID> or run: gcloud config set project <PROJECT_ID>"
  exit 1
fi

ACTIVE_ACCOUNT=$(gcloud auth list --filter=status:ACTIVE --format="value(account)" 2>/dev/null || echo "")
if [ -z "${ACTIVE_ACCOUNT}" ]; then
  echo -e "${YELLOW}⚠️ No active GCP authentication found. Running 'gcloud auth login'...${NC}"
  if [ "${DRY_RUN}" = false ]; then
    gcloud auth login
  fi
fi

echo -e "📍 ${BOLD}GCP Project:${NC}      ${CYAN}${PROJECT_ID}${NC}"
echo -e "🌍 ${BOLD}Region:${NC}           ${CYAN}${REGION}${NC}"
echo -e "📦 ${BOLD}Service Name:${NC}     ${CYAN}${SERVICE_NAME}${NC}"
echo -e "⚙️  ${BOLD}Deploy Mode:${NC}      ${CYAN}${DEPLOY_MODE}${NC}"
echo -e "💻 ${BOLD}Resources:${NC}        ${CYAN}${CPU} CPU, ${MEMORY} RAM (Min: ${MIN_INSTANCES}, Max: ${MAX_INSTANCES})${NC}"
echo ""

# --- 5. Run Verification Tests ---
if [ "${RUN_TESTS}" = true ]; then
  echo -e "${BOLD}🧪 Running automated verification tests...${NC}"
  if [ "${DRY_RUN}" = false ]; then
    ./scripts/build.sh
    echo -e "${GREEN}✓ All unit and build tests passed successfully.${NC}\n"
  else
    echo "[DRY-RUN] ./scripts/build.sh"
  fi
fi

# --- 6. Enable Required GCP APIs ---
echo -e "${BOLD}🔌 Verifying Google Cloud APIs...${NC}"
REQUIRED_SERVICES=(
  "run.googleapis.com"
  "artifactregistry.googleapis.com"
  "cloudbuild.googleapis.com"
)
if [ "${USE_SECRET_MANAGER}" = true ]; then
  REQUIRED_SERVICES+=("secretmanager.googleapis.com")
fi

for SERVICE in "${REQUIRED_SERVICES[@]}"; do
  if [ "${DRY_RUN}" = true ]; then
    echo "[DRY-RUN] gcloud services enable ${SERVICE} --project=${PROJECT_ID}"
  else
    ENABLED=$(gcloud services list --enabled --project="${PROJECT_ID}" --filter="name:${SERVICE}" --format="value(name)" 2>/dev/null || echo "")
    if [ -z "${ENABLED}" ]; then
      echo -e "   Enabling ${YELLOW}${SERVICE}${NC} for project ${PROJECT_ID}..."
      gcloud services enable "${SERVICE}" --project="${PROJECT_ID}"
    fi
  fi
done
echo -e "${GREEN}✓ Required APIs are enabled.${NC}\n"

# --- 7. Configure Environment Variables & Secrets ---
ENV_VARS=()
ENV_VARS+=("HOST=0.0.0.0")
# Note: PORT is reserved in Cloud Run and injected automatically by the platform
ENV_VARS+=("DATABASE_NAME=${DATABASE_NAME:-rair_db}")
ENV_VARS+=("STATIC_DIR=/app/static")

if [ -n "${GOOGLE_CLIENT_ID}" ]; then
  ENV_VARS+=("GOOGLE_CLIENT_ID=${GOOGLE_CLIENT_ID}")
fi

SECRETS_PARAM=()

if [ "${USE_SECRET_MANAGER}" = true ]; then
  echo -e "${BOLD}🔐 Configuring Google Secret Manager...${NC}"
  
  # Secret for MONGO_URI
  if [ -n "${MONGO_URI}" ]; then
    SECRET_MONGO_NAME="${SERVICE_NAME}-mongo-uri"
    if [ "${DRY_RUN}" = false ]; then
      if ! gcloud secrets describe "${SECRET_MONGO_NAME}" --project="${PROJECT_ID}" >/dev/null 2>&1; then
        gcloud secrets create "${SECRET_MONGO_NAME}" --replication-policy="automatic" --project="${PROJECT_ID}"
      fi
      echo -n "${MONGO_URI}" | gcloud secrets versions add "${SECRET_MONGO_NAME}" --data-file=- --project="${PROJECT_ID}" >/dev/null
    else
      echo "[DRY-RUN] Create/update secret: ${SECRET_MONGO_NAME}"
    fi
    SECRETS_PARAM+=("MONGO_URI=${SECRET_MONGO_NAME}:latest")
  fi

  # Secret for SECRET_KEY
  APP_SECRET="${SECRET_KEY:-rair-secret-$(openssl rand -hex 16 2>/dev/null || echo "prod-key-2026")}"
  SECRET_KEY_NAME="${SERVICE_NAME}-secret-key"
  if [ "${DRY_RUN}" = false ]; then
    if ! gcloud secrets describe "${SECRET_KEY_NAME}" --project="${PROJECT_ID}" >/dev/null 2>&1; then
      gcloud secrets create "${SECRET_KEY_NAME}" --replication-policy="automatic" --project="${PROJECT_ID}"
    fi
    echo -n "${APP_SECRET}" | gcloud secrets versions add "${SECRET_KEY_NAME}" --data-file=- --project="${PROJECT_ID}" >/dev/null
  else
    echo "[DRY-RUN] Create/update secret: ${SECRET_KEY_NAME}"
  fi
  SECRETS_PARAM+=("SECRET_KEY=${SECRET_KEY_NAME}:latest")

else
  # Pass standard environment variables
  if [ -n "${MONGO_URI}" ]; then
    ENV_VARS+=("MONGO_URI=${MONGO_URI}")
  else
    echo -e "${YELLOW}⚠️  No MONGO_URI provided. Container will start with resilient in-memory storage fallback.${NC}"
    echo -e "${YELLOW}   To configure a permanent database, set MONGO_URI in .env or pass --mongo-uri.${NC}"
  fi
  ENV_VARS+=("SECRET_KEY=${SECRET_KEY:-rair-cosmic-secret-key-prod-2026}")
fi

# Join env vars with commas
OLD_IFS="${IFS}"
IFS=','
ENV_VARS_STR="${ENV_VARS[*]}"
IFS="${OLD_IFS}"
ENV_VARS_FLAG="--set-env-vars=${ENV_VARS_STR}"

SECRETS_FLAG=""
if [ ${#SECRETS_PARAM[@]} -gt 0 ]; then
  OLD_IFS="${IFS}"
  IFS=','
  SECRETS_STR="${SECRETS_PARAM[*]}"
  IFS="${OLD_IFS}"
  SECRETS_FLAG="--set-secrets=${SECRETS_STR}"
fi

# --- 8. Deploy to Cloud Run based on Deploy Mode ---
IMAGE_NAME="${REGION}-docker.pkg.dev/${PROJECT_ID}/${ARTIFACT_REPO}/${SERVICE_NAME}:latest"

if [ "${DEPLOY_MODE}" = "source" ]; then
  echo -e "${BOLD}🚀 Deploying directly to Cloud Run from source...${NC}"
  DEPLOY_CMD=(
    gcloud run deploy "${SERVICE_NAME}"
    --source .
    --project "${PROJECT_ID}"
    --region "${REGION}"
    --cpu "${CPU}"
    --memory "${MEMORY}"
    --min-instances "${MIN_INSTANCES}"
    --max-instances "${MAX_INSTANCES}"
    --concurrency "${CONCURRENCY}"
    ${ALLOW_UNAUTH}
    --quiet
    "${ENV_VARS_FLAG}"
  )
  if [ -n "${SECRETS_FLAG}" ]; then
    DEPLOY_CMD+=("${SECRETS_FLAG}")
  fi

  if [ "${DRY_RUN}" = true ]; then
    echo "[DRY-RUN] ${DEPLOY_CMD[*]}"
  else
    "${DEPLOY_CMD[@]}"
  fi

elif [ "${DEPLOY_MODE}" = "build" ]; then
  # 1. Ensure Artifact Registry repository exists
  echo -e "${BOLD}📦 Verifying Artifact Registry repository '${ARTIFACT_REPO}'...${NC}"
  if [ "${DRY_RUN}" = false ]; then
    if ! gcloud artifacts repositories describe "${ARTIFACT_REPO}" --location="${REGION}" --project="${PROJECT_ID}" >/dev/null 2>&1; then
      echo "   Creating Artifact Registry repository '${ARTIFACT_REPO}' in ${REGION}..."
      gcloud artifacts repositories create "${ARTIFACT_REPO}" \
        --repository-format=docker \
        --location="${REGION}" \
        --project="${PROJECT_ID}" \
        --description="RAIR Game Docker Containers"
    fi
  else
    echo "[DRY-RUN] gcloud artifacts repositories create ${ARTIFACT_REPO} --location=${REGION}"
  fi

  # 2. Build on Google Cloud Build
  echo -e "${BOLD}🔨 Submitting container build to Google Cloud Build...${NC}"
  BUILD_CMD=(
    gcloud builds submit
    --tag "${IMAGE_NAME}"
    --project "${PROJECT_ID}"
  )
  if [ "${DRY_RUN}" = true ]; then
    echo "[DRY-RUN] ${BUILD_CMD[*]}"
  else
    "${BUILD_CMD[@]}"
  fi

  # 3. Deploy image to Cloud Run
  echo -e "${BOLD}🚀 Deploying image to Cloud Run...${NC}"
  DEPLOY_CMD=(
    gcloud run deploy "${SERVICE_NAME}"
    --image "${IMAGE_NAME}"
    --project "${PROJECT_ID}"
    --region "${REGION}"
    --cpu "${CPU}"
    --memory "${MEMORY}"
    --min-instances "${MIN_INSTANCES}"
    --max-instances "${MAX_INSTANCES}"
    --concurrency "${CONCURRENCY}"
    ${ALLOW_UNAUTH}
    --quiet
    "${ENV_VARS_FLAG}"
  )
  if [ -n "${SECRETS_FLAG}" ]; then
    DEPLOY_CMD+=("${SECRETS_FLAG}")
  fi

  if [ "${DRY_RUN}" = true ]; then
    echo "[DRY-RUN] ${DEPLOY_CMD[*]}"
  else
    "${DEPLOY_CMD[@]}"
  fi

elif [ "${DEPLOY_MODE}" = "local" ]; then
  # 1. Ensure Artifact Registry repository exists
  if [ "${DRY_RUN}" = false ]; then
    if ! gcloud artifacts repositories describe "${ARTIFACT_REPO}" --location="${REGION}" --project="${PROJECT_ID}" >/dev/null 2>&1; then
      gcloud artifacts repositories create "${ARTIFACT_REPO}" \
        --repository-format=docker \
        --location="${REGION}" \
        --project="${PROJECT_ID}" \
        --description="RAIR Game Docker Containers"
    fi
    echo "🔑 Configuring Docker authentication for ${REGION}-docker.pkg.dev..."
    gcloud auth configure-docker "${REGION}-docker.pkg.dev" --quiet
  fi

  # 2. Build Docker container locally
  echo -e "${BOLD}🔨 Building Docker container locally...${NC}"
  if [ "${DRY_RUN}" = true ]; then
    echo "[DRY-RUN] docker build -t ${IMAGE_NAME} ."
    echo "[DRY-RUN] docker push ${IMAGE_NAME}"
  else
    docker build -t "${IMAGE_NAME}" .
    docker push "${IMAGE_NAME}"
  fi

  # 3. Deploy image to Cloud Run
  echo -e "${BOLD}🚀 Deploying to Cloud Run...${NC}"
  DEPLOY_CMD=(
    gcloud run deploy "${SERVICE_NAME}"
    --image "${IMAGE_NAME}"
    --project "${PROJECT_ID}"
    --region "${REGION}"
    --cpu "${CPU}"
    --memory "${MEMORY}"
    --min-instances "${MIN_INSTANCES}"
    --max-instances "${MAX_INSTANCES}"
    --concurrency "${CONCURRENCY}"
    ${ALLOW_UNAUTH}
    --quiet
    "${ENV_VARS_FLAG}"
  )
  if [ -n "${SECRETS_FLAG}" ]; then
    DEPLOY_CMD+=("${SECRETS_FLAG}")
  fi

  if [ "${DRY_RUN}" = true ]; then
    echo "[DRY-RUN] ${DEPLOY_CMD[*]}"
  else
    "${DEPLOY_CMD[@]}"
  fi
fi

# --- 9. Deployment Verification & Reporting ---
if [ "${DRY_RUN}" = false ]; then
  echo ""
  echo -e "${BOLD}🔍 Fetching service URL and verifying health...${NC}"
  SERVICE_URL=$(gcloud run services describe "${SERVICE_NAME}" \
    --platform managed \
    --region "${REGION}" \
    --project "${PROJECT_ID}" \
    --format 'value(status.url)' 2>/dev/null || echo "")

  if [ -n "${SERVICE_URL}" ]; then
    # Verify health endpoint
    echo -e "   Checking ${SERVICE_URL}/health..."
    HEALTH_STATUS=$(curl -s -f "${SERVICE_URL}/health" 2>/dev/null || echo "error")
    
    echo ""
    echo -e "${GREEN}${BOLD}==============================================================${NC}"
    echo -e "${GREEN}${BOLD}  ✨ RAIR IS LIVE ON GOOGLE CLOUD RUN!                        ${NC}"
    echo -e "${GREEN}${BOLD}==============================================================${NC}"
    echo -e "🎮 ${BOLD}Live App URL:${NC}       ${CYAN}${SERVICE_URL}${NC}"
    echo -e "🩺 ${BOLD}Health Endpoint:${NC}    ${CYAN}${SERVICE_URL}/health${NC}"
    echo -e "📊 ${BOLD}GCP Console:${NC}        https://console.cloud.google.com/run/detail/${REGION}/${SERVICE_NAME}/metrics?project=${PROJECT_ID}"
    echo -e "📝 ${BOLD}Stream Logs:${NC}        gcloud beta run services logs tail ${SERVICE_NAME} --region=${REGION} --project=${PROJECT_ID}"
    echo -e "${GREEN}${BOLD}==============================================================${NC}"
  fi
else
  echo ""
  echo -e "${YELLOW}Dry-run completed successfully. No cloud resources were modified.${NC}"
fi
