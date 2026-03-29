#!/bin/bash
set -euo pipefail

# ═══════════════════════════════════════════
# PBXClaw Alpha Installer
# The AI-native Voice OS
# One command. Working PBX. Molty on ext 900.
# ═══════════════════════════════════════════

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PBXCLAW_HOME="$SCRIPT_DIR"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

info()  { echo -e "${CYAN}[PBXClaw]${NC} $1"; }
ok()    { echo -e "${GREEN}[  OK  ]${NC} $1"; }
warn()  { echo -e "${YELLOW}[ WARN ]${NC} $1"; }
fail()  { echo -e "${RED}[ FAIL ]${NC} $1"; }
step()  { echo -e "\n${BOLD}═══ $1 ═══${NC}"; }

OS="$(uname -s)"
ARCH="$(uname -m)"

echo ""
echo -e "${CYAN}"
echo "  ╔═══════════════════════════════════════╗"
echo "  ║     PBXClaw Alpha Installer           ║"
echo "  ║     The AI-native Voice OS            ║"
echo "  ║                                       ║"
echo "  ║     Built by a phone guy.             ║"
echo "  ║     Powered by AI.                    ║"
echo "  ║     On prem as God intended.          ║"
echo "  ╚═══════════════════════════════════════╝"
echo -e "${NC}"
info "Platform: $OS ($ARCH)"
info "Install dir: $PBXCLAW_HOME"
echo ""

# ═══════════════════════════════════════════
# Phase 1: Preflight
# ═══════════════════════════════════════════
step "Phase 1: Preflight Check"

ERRORS=0

# Python 3.10+
if command -v python3 &>/dev/null; then
    PY_VER=$(python3 -c 'import sys; print(f"{sys.version_info.major}.{sys.version_info.minor}")')
    PY_MAJOR=$(echo "$PY_VER" | cut -d. -f1)
    PY_MINOR=$(echo "$PY_VER" | cut -d. -f2)
    if [ "$PY_MAJOR" -ge 3 ] && [ "$PY_MINOR" -ge 10 ]; then
        ok "Python $PY_VER"
    else
        fail "Python $PY_VER found, need 3.10+"
        ERRORS=$((ERRORS + 1))
    fi
else
    fail "Python 3 not found"
    ERRORS=$((ERRORS + 1))
fi

# Node.js 18+
if command -v node &>/dev/null; then
    NODE_VER=$(node -v | sed 's/v//' | cut -d. -f1)
    if [ "$NODE_VER" -ge 18 ]; then
        ok "Node.js v$(node -v | sed 's/v//')"
    else
        fail "Node.js v$(node -v | sed 's/v//') found, need 18+"
        ERRORS=$((ERRORS + 1))
    fi
else
    fail "Node.js not found"
    if [ "$OS" = "Darwin" ]; then
        info "Install with: brew install node"
    else
        info "Install with: curl -fsSL https://deb.nodesource.com/setup_20.x | sudo bash -"
    fi
    ERRORS=$((ERRORS + 1))
fi

# ffmpeg
if command -v ffmpeg &>/dev/null; then
    ok "ffmpeg"
else
    warn "ffmpeg not found (needed for TTS audio conversion)"
    if [ "$OS" = "Darwin" ]; then
        info "Install with: brew install ffmpeg"
    else
        info "Install with: sudo apt install ffmpeg"
    fi
fi

# npm
if command -v npm &>/dev/null; then
    ok "npm $(npm -v)"
else
    fail "npm not found (installed with Node.js)"
    ERRORS=$((ERRORS + 1))
fi

if [ "$ERRORS" -gt 0 ]; then
    echo ""
    fail "$ERRORS preflight check(s) failed. Fix the above before continuing."
    exit 1
fi

ok "All preflight checks passed"

# ═══════════════════════════════════════════
# Phase 2: Install FreeSWITCH
# ═══════════════════════════════════════════
step "Phase 2: FreeSWITCH"

# Check if already running
if nc -z 127.0.0.1 8021 2>/dev/null; then
    ok "FreeSWITCH already running (ESL port 8021 responding)"
else
    info "Installing FreeSWITCH..."
    bash "$PBXCLAW_HOME/freeswitch/install-freeswitch.sh"
fi

# ═══════════════════════════════════════════
# Phase 3: Environment Setup
# ═══════════════════════════════════════════
step "Phase 3: Environment"

ENV_FILE="$PBXCLAW_HOME/.env"

if [ -f "$ENV_FILE" ]; then
    ok ".env file exists"
else
    info "Creating .env from .env.example..."
    cp "$PBXCLAW_HOME/.env.example" "$ENV_FILE"
    ok ".env created"
fi

# Source .env
set -a
source "$ENV_FILE" 2>/dev/null || true
set +a

# Prompt for required keys if interactive and missing
if [ -t 0 ]; then
    if [ -z "${PBXCLAW_API_KEY:-}" ]; then
        echo ""
        echo -e "${YELLOW}PBXClaw API key required.${NC}"
        echo "Get yours at: https://pbxclaw.com/signup"
        echo ""
        read -rp "Enter your PBXClaw API key: " PBXCLAW_API_KEY
        if [ -n "$PBXCLAW_API_KEY" ]; then
            # Write to .env (replace existing line or append)
            if grep -q "^PBXCLAW_API_KEY=" "$ENV_FILE"; then
                sed -i.bak "s|^PBXCLAW_API_KEY=.*|PBXCLAW_API_KEY=$PBXCLAW_API_KEY|" "$ENV_FILE"
                rm -f "$ENV_FILE.bak"
            else
                echo "PBXCLAW_API_KEY=$PBXCLAW_API_KEY" >> "$ENV_FILE"
            fi
            ok "PBXClaw API key saved to .env"
        else
            warn "No API key entered. Dashboard will require it to load."
        fi
    else
        ok "PBXClaw API key found in .env"
    fi

    if [ -z "${ANTHROPIC_API_KEY:-}" ]; then
        echo ""
        echo -e "${YELLOW}Anthropic API key needed for AI voice (ext 900 Molty).${NC}"
        echo "Get one at: https://console.anthropic.com"
        echo ""
        read -rp "Enter your Anthropic API key (or press Enter to skip): " ANTHROPIC_API_KEY
        if [ -n "$ANTHROPIC_API_KEY" ]; then
            if grep -q "^ANTHROPIC_API_KEY=" "$ENV_FILE"; then
                sed -i.bak "s|^ANTHROPIC_API_KEY=.*|ANTHROPIC_API_KEY=$ANTHROPIC_API_KEY|" "$ENV_FILE"
                rm -f "$ENV_FILE.bak"
            else
                echo "ANTHROPIC_API_KEY=$ANTHROPIC_API_KEY" >> "$ENV_FILE"
            fi
            ok "Anthropic API key saved to .env"
        else
            warn "No Anthropic key. Molty won't be able to respond on calls."
        fi
    else
        ok "Anthropic API key found in .env"
    fi
fi

# Validate PBXClaw API key
if [ -n "${PBXCLAW_API_KEY:-}" ]; then
    info "Validating PBXClaw API key..."
    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" \
        -H "Authorization: Bearer $PBXCLAW_API_KEY" \
        "https://pbxclaw.com/api/auth/verify-key" 2>/dev/null || echo "000")
    if [ "$HTTP_CODE" = "200" ]; then
        ok "PBXClaw API key validated"
    elif [ "$HTTP_CODE" = "000" ]; then
        warn "Could not reach pbxclaw.com (offline install OK)"
    else
        warn "API key validation returned HTTP $HTTP_CODE"
    fi
fi

# ═══════════════════════════════════════════
# Phase 4: Python Virtual Environment
# ═══════════════════════════════════════════
step "Phase 4: Python Environment"

VENV_DIR="$PBXCLAW_HOME/.venv"

if [ -d "$VENV_DIR" ] && [ -f "$VENV_DIR/bin/python" ]; then
    ok "Python venv exists"
else
    info "Creating Python virtual environment..."
    python3 -m venv "$VENV_DIR"
    ok "Python venv created at .venv/"
fi

info "Installing Python dependencies..."
"$VENV_DIR/bin/pip" install -q --upgrade pip 2>/dev/null
if [ -f "$PBXCLAW_HOME/sip-voice/requirements.txt" ]; then
    "$VENV_DIR/bin/pip" install -q -r "$PBXCLAW_HOME/sip-voice/requirements.txt" 2>/dev/null
    ok "Python dependencies installed"
else
    warn "sip-voice/requirements.txt not found — skipping Python deps"
fi

# ═══════════════════════════════════════════
# Phase 5: Dashboard
# ═══════════════════════════════════════════
step "Phase 5: Dashboard"

if [ -f "$PBXCLAW_HOME/dashboard/backend/package.json" ]; then
    info "Installing dashboard backend dependencies..."
    cd "$PBXCLAW_HOME/dashboard/backend"
    npm install --silent 2>/dev/null
    ok "Dashboard backend dependencies installed"
    cd "$PBXCLAW_HOME"
else
    warn "Dashboard backend not found — skipping"
fi

if [ -f "$PBXCLAW_HOME/dashboard/frontend/package.json" ]; then
    info "Installing dashboard frontend dependencies..."
    cd "$PBXCLAW_HOME/dashboard/frontend"
    npm install --silent 2>/dev/null
    info "Building dashboard frontend..."
    npm run build --silent 2>/dev/null
    ok "Dashboard frontend built"
    cd "$PBXCLAW_HOME"
else
    warn "Dashboard frontend not found — skipping"
fi

# ═══════════════════════════════════════════
# Phase 6: SIP Bridge Config
# ═══════════════════════════════════════════
step "Phase 6: SIP Bridge Config"

SIP_CONFIG="$PBXCLAW_HOME/sip-voice/agent_sip_config.json"
SIP_EXAMPLE="$PBXCLAW_HOME/sip-voice/agent_sip_config.example.json"

if [ -f "$SIP_CONFIG" ]; then
    ok "SIP bridge config exists"
elif [ -f "$SIP_EXAMPLE" ]; then
    cp "$SIP_EXAMPLE" "$SIP_CONFIG"
    ok "SIP bridge config created from example"
    warn "Edit sip-voice/agent_sip_config.json with your extension passwords"
else
    warn "No SIP bridge config template found"
fi

# ═══════════════════════════════════════════
# Phase 7: Connectivity Check
# ═══════════════════════════════════════════
step "Phase 7: Connectivity"

FS_HOST="${FREESWITCH_HOST:-127.0.0.1}"
ESL_PORT="${FREESWITCH_ESL_PORT:-8021}"

if nc -z "$FS_HOST" "$ESL_PORT" 2>/dev/null; then
    ok "FreeSWITCH ESL ($FS_HOST:$ESL_PORT)"
else
    warn "FreeSWITCH ESL not responding at $FS_HOST:$ESL_PORT"
    info "Start FreeSWITCH first, then run verify-install.sh"
fi

if nc -z "$FS_HOST" 5060 2>/dev/null; then
    ok "FreeSWITCH SIP ($FS_HOST:5060)"
else
    warn "FreeSWITCH SIP not responding at $FS_HOST:5060"
fi

OPENCLAW_URL="${OPENCLAW_API_URL:-http://127.0.0.1:18789}"
if curl -s "$OPENCLAW_URL/status" &>/dev/null; then
    ok "OpenClaw gateway ($OPENCLAW_URL)"
else
    info "OpenClaw not detected (optional — chat admin will use direct API keys)"
fi

# ═══════════════════════════════════════════
# Done
# ═══════════════════════════════════════════
echo ""
echo -e "${GREEN}═══════════════════════════════════════════${NC}"
echo -e "${GREEN}  PBXClaw Alpha — Installation Complete${NC}"
echo -e "${GREEN}═══════════════════════════════════════════${NC}"
echo ""
echo -e "  ${BOLD}Install dir:${NC}  $PBXCLAW_HOME"
echo -e "  ${BOLD}Config:${NC}       $PBXCLAW_HOME/.env"
echo -e "  ${BOLD}Python venv:${NC}  $PBXCLAW_HOME/.venv"
echo ""
echo -e "  ${BOLD}Next steps:${NC}"
echo ""
echo "  1. Start FreeSWITCH:"
if [ "$OS" = "Darwin" ]; then
    echo "     brew services start freeswitch"
else
    echo "     sudo systemctl start freeswitch"
fi
echo ""
echo "  2. Start the dashboard:"
echo "     cd $PBXCLAW_HOME/dashboard/backend && node server.js"
echo "     → Open http://localhost:${DASHBOARD_PORT:-4444}"
echo ""
echo "  3. Start the SIP voice bridge:"
echo "     $PBXCLAW_HOME/sip-voice/start_sip_bridge.sh"
echo ""
echo "  4. Verify everything:"
echo "     $PBXCLAW_HOME/verify-install.sh"
echo ""
echo "  5. Call extension 900 — Molty is waiting."
echo ""
echo -e "  ${CYAN}pbxclaw.com${NC} — ${CYAN}Built by a phone guy.${NC}"
echo ""
