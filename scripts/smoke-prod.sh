#!/usr/bin/env bash
# ==============================================================================
# Student Hub — Production Smoke Test Suite
# Tests full user lifecycle against a live deployment:
#   1. Health check (/api/health)
#   2. User registration (/api/auth/register)
#   3. Authentication & session cookie issuance (/api/auth/login)
#   4. Authenticated identity verification (/api/auth/me)
#   5. Task creation (/api/tasks)
#   6. Task cleanup / deletion (/api/tasks/:id)
#   7. Session termination (/api/auth/logout)
#   8. Verify session invalidation (401 check)
# ==============================================================================

set -uo pipefail

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

RAW_URL="${1:-http://localhost:5001}"
# Strip trailing slash
BASE_URL="${RAW_URL%/}"

# Determine API base path
if [[ "$BASE_URL" == */api ]]; then
  API_BASE="$BASE_URL"
else
  API_BASE="${BASE_URL}/api"
fi

COOKIE_JAR=$(mktemp)
trap 'rm -f "$COOKIE_JAR"' EXIT

TIMESTAMP=$(date +%s)
RANDOM_ID=$((RANDOM % 9000 + 1000))
TEST_EMAIL="smoke_${TIMESTAMP}_${RANDOM_ID}@university.edu"
TEST_PASS="SmokeTestPass@123"
TEST_NAME="Smoke Automation ${RANDOM_ID}"
TEST_ROLL="SMK${RANDOM_ID}"

echo -e "${BLUE}======================================================${NC}"
echo -e "${BLUE}   STUDENT HUB — PRODUCTION SMOKE TEST SUITE          ${NC}"
echo -e "${BLUE}======================================================${NC}"
echo -e "Target API Base : ${YELLOW}${API_BASE}${NC}"
echo -e "Ephemeral User  : ${TEST_EMAIL} (${TEST_ROLL})"
echo ""

fail_smoke() {
  echo -e "\n${RED}[FAIL] Smoke test failed at step: $1${NC}"
  echo -e "${RED}Server response:${NC} $2"
  exit 1
}

pass_step() {
  echo -e "${GREEN}✓ [PASS] $1${NC}"
}

# ------------------------------------------------------------------------------
# STEP 1: API Health Check
# ------------------------------------------------------------------------------
echo -e "${YELLOW}Step 1/8:${NC} Pinging API Health Check..."
HEALTH_RES=$(curl -s -w "\n%{http_code}" -X GET "${API_BASE}/health" \
  -H "Accept: application/json")
HTTP_CODE=$(echo "$HEALTH_RES" | tail -n1)
BODY=$(echo "$HEALTH_RES" | sed '$d')

if [[ "$HTTP_CODE" -ne 200 ]]; then
  fail_smoke "API Health Check (expected 200, got ${HTTP_CODE})" "$BODY"
fi
pass_step "API is alive and reporting status: healthy"

# ------------------------------------------------------------------------------
# STEP 2: Register Ephemeral User
# ------------------------------------------------------------------------------
echo -e "\n${YELLOW}Step 2/8:${NC} Registering ephemeral smoke user..."
REG_PAYLOAD=$(cat <<EOF
{
  "name": "${TEST_NAME}",
  "email": "${TEST_EMAIL}",
  "password": "${TEST_PASS}",
  "rollNumber": "${TEST_ROLL}",
  "department": "Computer Science",
  "semester": 5
}
EOF
)

REG_RES=$(curl -s -w "\n%{http_code}" -c "$COOKIE_JAR" -b "$COOKIE_JAR" \
  -X POST "${API_BASE}/auth/register" \
  -H "Content-Type: application/json" \
  -d "$REG_PAYLOAD")
HTTP_CODE=$(echo "$REG_RES" | tail -n1)
BODY=$(echo "$REG_RES" | sed '$d')

if [[ "$HTTP_CODE" -ne 201 && "$HTTP_CODE" -ne 200 ]]; then
  fail_smoke "User Registration (expected 201/200, got ${HTTP_CODE})" "$BODY"
fi
pass_step "User account registered successfully"

# ------------------------------------------------------------------------------
# STEP 3: Authenticate & Capture Session Cookie
# ------------------------------------------------------------------------------
echo -e "\n${YELLOW}Step 3/8:${NC} Authenticating via /api/auth/login..."
LOGIN_PAYLOAD=$(cat <<EOF
{
  "email": "${TEST_EMAIL}",
  "password": "${TEST_PASS}"
}
EOF
)

LOGIN_RES=$(curl -s -w "\n%{http_code}" -c "$COOKIE_JAR" -b "$COOKIE_JAR" \
  -X POST "${API_BASE}/auth/login" \
  -H "Content-Type: application/json" \
  -d "$LOGIN_PAYLOAD")
HTTP_CODE=$(echo "$LOGIN_RES" | tail -n1)
BODY=$(echo "$LOGIN_RES" | sed '$d')

if [[ "$HTTP_CODE" -ne 200 ]]; then
  fail_smoke "Login (expected 200, got ${HTTP_CODE})" "$BODY"
fi

if ! grep -q "student_hub_token" "$COOKIE_JAR"; then
  fail_smoke "Session Cookie (student_hub_token cookie missing from jar)" "$BODY"
fi
pass_step "Authentication successful and session cookie captured in jar"

# ------------------------------------------------------------------------------
# STEP 4: Verify Session via /api/auth/me
# ------------------------------------------------------------------------------
echo -e "\n${YELLOW}Step 4/8:${NC} Querying current session identity (/api/auth/me)..."
ME_RES=$(curl -s -w "\n%{http_code}" -b "$COOKIE_JAR" \
  -X GET "${API_BASE}/auth/me" \
  -H "Accept: application/json")
HTTP_CODE=$(echo "$ME_RES" | tail -n1)
BODY=$(echo "$ME_RES" | sed '$d')

if [[ "$HTTP_CODE" -ne 200 ]]; then
  fail_smoke "Session Verification (expected 200, got ${HTTP_CODE})" "$BODY"
fi

if ! echo "$BODY" | grep -q "${TEST_EMAIL}"; then
  fail_smoke "Session Identity (email mismatch in /auth/me payload)" "$BODY"
fi
pass_step "Session verified: authenticated as ${TEST_EMAIL}"

# ------------------------------------------------------------------------------
# STEP 5: Create Academic Task
# ------------------------------------------------------------------------------
echo -e "\n${YELLOW}Step 5/8:${NC} Creating test task on Kanban board..."
FUTURE_DATE=$(date -u -v+7d "+%Y-%m-%dT12:00:00.000Z" 2>/dev/null || date -u -d "+7 days" "+%Y-%m-%dT12:00:00.000Z" 2>/dev/null || echo "2026-11-05T12:00:00.000Z")

TASK_PAYLOAD=$(cat <<EOF
{
  "title": "Automated Smoke Verification Task",
  "description": "Transient task generated by CI/CD smoke test",
  "dueDate": "${FUTURE_DATE}",
  "priority": "medium",
  "status": "pending"
}
EOF
)

TASK_RES=$(curl -s -w "\n%{http_code}" -b "$COOKIE_JAR" \
  -X POST "${API_BASE}/tasks" \
  -H "Content-Type: application/json" \
  -d "$TASK_PAYLOAD")
HTTP_CODE=$(echo "$TASK_RES" | tail -n1)
BODY=$(echo "$TASK_RES" | sed '$d')

if [[ "$HTTP_CODE" -ne 201 && "$HTTP_CODE" -ne 200 ]]; then
  fail_smoke "Task Creation (expected 201/200, got ${HTTP_CODE})" "$BODY"
fi

# Extract task ID using node or sed
TASK_ID=$(node -e "try { const d = JSON.parse(process.argv[1]); console.log(d.data?._id || d._id || ''); } catch { console.log(''); }" "$BODY" 2>/dev/null || echo "")

if [[ -z "$TASK_ID" ]]; then
  TASK_ID=$(echo "$BODY" | sed -n 's/.*"_id":"\([^"]*\)".*/\1/p' | head -n1)
fi

if [[ -z "$TASK_ID" ]]; then
  fail_smoke "Task ID Extraction (could not parse _id from task response)" "$BODY"
fi
pass_step "Task created successfully with ID: ${TASK_ID}"

# ------------------------------------------------------------------------------
# STEP 6: Delete Academic Task (Cleanup)
# ------------------------------------------------------------------------------
echo -e "\n${YELLOW}Step 6/8:${NC} Deleting test task (${TASK_ID})..."
DEL_RES=$(curl -s -w "\n%{http_code}" -b "$COOKIE_JAR" \
  -X DELETE "${API_BASE}/tasks/${TASK_ID}")
HTTP_CODE=$(echo "$DEL_RES" | tail -n1)
BODY=$(echo "$DEL_RES" | sed '$d')

if [[ "$HTTP_CODE" -ne 200 ]]; then
  fail_smoke "Task Deletion (expected 200, got ${HTTP_CODE})" "$BODY"
fi
pass_step "Task deleted successfully"

# ------------------------------------------------------------------------------
# STEP 7: Logout
# ------------------------------------------------------------------------------
echo -e "\n${YELLOW}Step 7/8:${NC} Terminating session via /api/auth/logout..."
LOGOUT_RES=$(curl -s -w "\n%{http_code}" -c "$COOKIE_JAR" -b "$COOKIE_JAR" \
  -X POST "${API_BASE}/auth/logout")
HTTP_CODE=$(echo "$LOGOUT_RES" | tail -n1)
BODY=$(echo "$LOGOUT_RES" | sed '$d')

if [[ "$HTTP_CODE" -ne 200 ]]; then
  fail_smoke "Logout (expected 200, got ${HTTP_CODE})" "$BODY"
fi
pass_step "Logout endpoint returned 200 OK"

# ------------------------------------------------------------------------------
# STEP 8: Verify Session Invalidation (401 Unauthorized)
# ------------------------------------------------------------------------------
echo -e "\n${YELLOW}Step 8/8:${NC} Verifying session cookie invalidation..."
POST_LOGOUT_RES=$(curl -s -w "\n%{http_code}" -b "$COOKIE_JAR" \
  -X GET "${API_BASE}/auth/me" \
  -H "Accept: application/json")
HTTP_CODE=$(echo "$POST_LOGOUT_RES" | tail -n1)
BODY=$(echo "$POST_LOGOUT_RES" | sed '$d')

if [[ "$HTTP_CODE" -ne 401 ]]; then
  fail_smoke "Session Invalidation Check (expected 401 Unauthorized after logout, got ${HTTP_CODE})" "$BODY"
fi
pass_step "Session invalidated: protected endpoint rejected with 401"

echo ""
echo -e "${GREEN}======================================================${NC}"
echo -e "${GREEN}   ALL 8 PRODUCTION SMOKE CHECKS PASSED!             ${NC}"
echo -e "${GREEN}======================================================${NC}"
exit 0

