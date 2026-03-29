#!/bin/bash
set -uo pipefail

# ═══════════════════════════════════════════
# PBXClaw — Installation Verification
# Run after install.sh to check everything.
# ═══════════════════════════════════════════

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PBXCLAW_HOME="$SCRIPT_DIR"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
BOLD='\033[1m'
DIM='\033[2m'
NC='\033[0m'

PASS=0
FAIL=0
WARN=0

check() {
    local desc="$1"
    shift
    if "$@" &>/dev/null; then
        echo -e "  ${GREEN}[OK]${NC}  $desc"
        PASS=$((PASS + 1))
    else
        echo -e "  ${RED}[!!]${NC}  $desc"
        FAIL=$((FAIL + 1))
    fi
}

warn_check() {
    local desc="$1"
    shift
    if "$@" &>/dev/null; then
        echo -e "  ${GREEN}[OK]${NC}  $desc"
        PASS=$((PASS + 1))
    else
        echo -e "  ${YELLOW}[--]${NC}  $desc ${DIM}(optional)${NC}"
        WARN=$((WARN + 1))
    fi
}

# Source .env
ENV_FILE="$PBXCLAW_HOME/.env"
if [ -f "$ENV_FILE" ]; then
    set -a
    source "$ENV_FILE" 2>/dev/null || true
    set +a
fi

FS_HOST="${FREESWITCH_HOST:-127.0.0.1}"
ESL_PORT="${FREESWITCH_ESL_PORT:-8021}"
DASH_PORT="${DASHBOARD_PORT:-4444}"

echo ""
echo -e "${CYAN}═══════════════════════════════════════════${NC}"
echo -e "${CYAN}  PBXClaw — Installation Verification${NC}"
echo -e "${CYAN}═══════════════════════════════════════════${NC}"
echo ""

# ─── FreeSWITCH ─────────────────────────
IS_REMOTE_FS=false
if [ "$FS_HOST" != "127.0.0.1" ] && [ "$FS_HOST" != "localhost" ]; then
    IS_REMOTE_FS=true
fi

if [ "$IS_REMOTE_FS" = true ]; then
    echo -e "${BOLD}FreeSWITCH ${DIM}(remote: $FS_HOST)${NC}"
else
    echo -e "${BOLD}FreeSWITCH ${DIM}(local)${NC}"
fi

if [ "$IS_REMOTE_FS" = false ]; then
    check "FreeSWITCH binary exists" bash -c "command -v freeswitch || [ -x /usr/local/freeswitch/bin/freeswitch ] || brew list freeswitch"
fi
check "ESL port $ESL_PORT responding ($FS_HOST)" nc -z "$FS_HOST" "$ESL_PORT"
check "SIP port 5060 responding ($FS_HOST)" nc -z "$FS_HOST" 5060

echo ""

# ─── Python ─────────────────────────────
echo -e "${BOLD}Python Environment${NC}"

check "Python venv exists" test -f "$PBXCLAW_HOME/.venv/bin/python"
check "pyVoIP installed" "$PBXCLAW_HOME/.venv/bin/python" -c "import pyVoIP" 2>/dev/null
warn_check "faster-whisper installed" "$PBXCLAW_HOME/.venv/bin/python" -c "import faster_whisper" 2>/dev/null
warn_check "openai installed" "$PBXCLAW_HOME/.venv/bin/python" -c "import openai" 2>/dev/null

echo ""

# ─── Configuration ──────────────────────
echo -e "${BOLD}Configuration${NC}"

check ".env file exists" test -f "$PBXCLAW_HOME/.env"

# Check PBXCLAW_API_KEY is set and non-empty
check "PBXCLAW_API_KEY is set" test -n "${PBXCLAW_API_KEY:-}"

# Validate key with pbxclaw.com
if [ -n "${PBXCLAW_API_KEY:-}" ]; then
    warn_check "API key validated with pbxclaw.com" bash -c "
        HTTP_CODE=\$(curl -s -o /dev/null -w '%{http_code}' \
            -H 'Authorization: Bearer $PBXCLAW_API_KEY' \
            'https://pbxclaw.com/api/auth/verify-key' 2>/dev/null)
        [ \"\$HTTP_CODE\" = '200' ]
    "
fi

check "ANTHROPIC_API_KEY is set" test -n "${ANTHROPIC_API_KEY:-}"
warn_check "OPENAI_API_KEY is set" test -n "${OPENAI_API_KEY:-}"
warn_check "SIP bridge config exists" test -f "$PBXCLAW_HOME/sip-voice/agent_sip_config.json"

echo ""

# ─── System Dependencies ────────────────
echo -e "${BOLD}System Dependencies${NC}"

check "ffmpeg available" command -v ffmpeg
check "Node.js available" command -v node
check "npm available" command -v npm

echo ""

# ─── Services ──────────────────────────
echo -e "${BOLD}Services ${DIM}(running checks)${NC}"

warn_check "Dashboard responding (port $DASH_PORT)" curl -s "http://localhost:$DASH_PORT" -o /dev/null
warn_check "SIP bridge API (port 5090)" curl -s "http://localhost:5090/status" -o /dev/null
warn_check "OpenClaw gateway" curl -s "${OPENCLAW_API_URL:-http://127.0.0.1:18789}/status" -o /dev/null

echo ""

# ─── Dashboard ──────────────────────────
echo -e "${BOLD}Dashboard${NC}"

check "Backend package.json exists" test -f "$PBXCLAW_HOME/dashboard/backend/package.json"
warn_check "Backend node_modules installed" test -d "$PBXCLAW_HOME/dashboard/backend/node_modules"
warn_check "Frontend built" test -d "$PBXCLAW_HOME/dashboard/frontend/dist"

echo ""

# ─── Summary ────────────────────────────
TOTAL=$((PASS + FAIL + WARN))
SCORE=$((PASS * 10 / (TOTAL > 0 ? TOTAL : 1)))

echo -e "${BOLD}═══════════════════════════════════════════${NC}"
echo -e "  ${GREEN}Passed:${NC}   $PASS"
echo -e "  ${RED}Failed:${NC}   $FAIL"
echo -e "  ${YELLOW}Optional:${NC} $WARN"
echo -e "  ${BOLD}Score:${NC}    $SCORE/10"
echo -e "${BOLD}═══════════════════════════════════════════${NC}"
echo ""

if [ "$FAIL" -eq 0 ]; then
    echo -e "  ${GREEN}Ready to go.${NC}"
    echo "  Start FreeSWITCH, the dashboard, and the SIP bridge."
    echo "  Then call extension 900 — Molty is waiting."
elif [ "$FAIL" -le 2 ]; then
    echo -e "  ${YELLOW}Almost there.${NC} Fix the failed checks above."
else
    echo -e "  ${RED}Several issues found.${NC} Run install.sh again or check the docs."
fi

echo ""
exit "$FAIL"
