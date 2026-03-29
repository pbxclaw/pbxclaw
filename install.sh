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

# Parse flags
REMOTE_FS_HOST=""
EXISTING_FS=false
SKIP_FS_INSTALL=false
FS_MODE="fresh"  # fresh | remote | existing

for arg in "$@"; do
    case "$arg" in
        --remote-fs=*)
            REMOTE_FS_HOST="${arg#*=}"
            SKIP_FS_INSTALL=true
            FS_MODE="remote"
            ;;
        --remote-fs)
            SKIP_FS_INSTALL=true
            FS_MODE="remote"
            ;;
        --existing-fs)
            EXISTING_FS=true
            SKIP_FS_INSTALL=true
            FS_MODE="existing"
            ;;
        --help|-h)
            echo "Usage: ./install.sh [OPTIONS]"
            echo ""
            echo "Options:"
            echo "  (default)             Full install — FreeSWITCH + dashboard + everything"
            echo "  --existing-fs         Use your existing local FreeSWITCH (additive config)"
            echo "  --remote-fs           Skip local FreeSWITCH (use FREESWITCH_HOST from .env)"
            echo "  --remote-fs=HOST      Skip local FreeSWITCH, use HOST"
            echo "  -h, --help            Show this help"
            echo ""
            echo "Modes:"
            echo "  Fresh (default)   New PBX — installs FreeSWITCH + full config"
            echo "  Existing FS       Phone guys — layers PBXClaw onto your running FreeSWITCH"
            echo "  Remote FS         FreeSWITCH on another server — installs everything else locally"
            echo ""
            echo "Examples:"
            echo "  ./install.sh                        # Fresh install"
            echo "  ./install.sh --existing-fs          # Add PBXClaw to existing FreeSWITCH"
            echo "  ./install.sh --remote-fs=10.0.0.50  # FreeSWITCH on another box"
            exit 0
            ;;
    esac
done

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
if [ "$FS_MODE" != "fresh" ]; then
    info "Mode: $FS_MODE FreeSWITCH"
fi
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
# Phase 2: FreeSWITCH
# ═══════════════════════════════════════════
step "Phase 2: FreeSWITCH"

# Auto-detect remote FS from .env if no flag was given
if [ "$FS_MODE" = "fresh" ] && [ -f "$PBXCLAW_HOME/.env" ]; then
    ENV_FS_HOST=$(grep -E "^FREESWITCH_HOST=" "$PBXCLAW_HOME/.env" 2>/dev/null | cut -d= -f2 | tr -d '"' | tr -d "'" || true)
    if [ -n "$ENV_FS_HOST" ] && [ "$ENV_FS_HOST" != "127.0.0.1" ] && [ "$ENV_FS_HOST" != "localhost" ]; then
        FS_MODE="remote"
        SKIP_FS_INSTALL=true
        REMOTE_FS_HOST="$ENV_FS_HOST"
        info "FREESWITCH_HOST=$ENV_FS_HOST in .env — using remote mode"
    fi
fi

# ─── Detect existing local FreeSWITCH ───
detect_fs_config_dir() {
    # Check common FreeSWITCH config locations
    for dir in /usr/local/freeswitch/conf /etc/freeswitch /opt/freeswitch/conf; do
        if [ -d "$dir" ] && [ -f "$dir/freeswitch.xml" ]; then
            echo "$dir"
            return 0
        fi
    done
    # macOS Homebrew
    if [ "$OS" = "Darwin" ]; then
        local brew_prefix
        brew_prefix="$(brew --prefix 2>/dev/null || echo /opt/homebrew)"
        for dir in "$brew_prefix/etc/freeswitch" "$brew_prefix/opt/freeswitch/etc/freeswitch"; do
            if [ -d "$dir" ] && [ -f "$dir/freeswitch.xml" ]; then
                echo "$dir"
                return 0
            fi
        done
    fi
    return 1
}

case "$FS_MODE" in
    # ─── FRESH: Install FreeSWITCH + full PBXClaw config ───
    fresh)
        if nc -z 127.0.0.1 8021 2>/dev/null; then
            ok "FreeSWITCH already running (ESL port 8021 responding)"
        else
            info "Installing FreeSWITCH..."
            bash "$PBXCLAW_HOME/freeswitch/install-freeswitch.sh"
        fi
        ;;

    # ─── REMOTE: FS on another server, skip local install ───
    remote)
        FS_TARGET="${REMOTE_FS_HOST:-remote}"
        ok "Using remote FreeSWITCH at $FS_TARGET (skipping local install)"
        info "PBXClaw config files: $PBXCLAW_HOME/freeswitch/conf/"
        info "Copy to remote: scp -r freeswitch/conf/ user@$FS_TARGET:/usr/local/freeswitch/conf/"

        # Write the remote host to .env if provided via flag
        if [ -n "$REMOTE_FS_HOST" ] && [ -f "$PBXCLAW_HOME/.env" ]; then
            if grep -q "^FREESWITCH_HOST=" "$PBXCLAW_HOME/.env"; then
                sed -i.bak "s|^FREESWITCH_HOST=.*|FREESWITCH_HOST=$REMOTE_FS_HOST|" "$PBXCLAW_HOME/.env"
                rm -f "$PBXCLAW_HOME/.env.bak"
            else
                echo "FREESWITCH_HOST=$REMOTE_FS_HOST" >> "$PBXCLAW_HOME/.env"
            fi
            ok "FREESWITCH_HOST=$REMOTE_FS_HOST written to .env"
        fi
        ;;

    # ─── EXISTING: Layer PBXClaw onto running FreeSWITCH ───
    existing)
        info "Existing FreeSWITCH mode — additive config only"

        # Find their FS config
        FS_CONF_DIR=""
        if FS_CONF_DIR=$(detect_fs_config_dir); then
            ok "Found FreeSWITCH config at $FS_CONF_DIR"
        else
            fail "Could not find FreeSWITCH config directory"
            info "Checked: /usr/local/freeswitch/conf, /etc/freeswitch, Homebrew paths"
            info "Set FS_CONF_DIR=/path/to/your/conf and re-run, or install with default mode"
            exit 1
        fi

        # Verify FS is actually running
        if nc -z 127.0.0.1 8021 2>/dev/null; then
            ok "FreeSWITCH ESL responding on port 8021"
        else
            warn "FreeSWITCH ESL not responding — is it running?"
            info "PBXClaw needs ESL on port 8021. Continuing anyway..."
        fi

        # Backup existing config
        BACKUP_DIR="$FS_CONF_DIR/pre-pbxclaw-backup-$(date +%Y%m%d-%H%M%S)"
        info "Backing up existing config to $BACKUP_DIR"
        mkdir -p "$BACKUP_DIR"
        # Only backup files we might touch
        for f in dialplan/pbxclaw.xml directory/pbxclaw_agents.xml autoload_configs/event_socket.conf.xml; do
            src="$FS_CONF_DIR/$f"
            if [ -f "$src" ]; then
                mkdir -p "$BACKUP_DIR/$(dirname "$f")"
                cp "$src" "$BACKUP_DIR/$f"
            fi
        done
        ok "Backup created"

        # ── Add PBXClaw dialplan context (additive — new file, not replacing) ──
        DIALPLAN_DIR="$FS_CONF_DIR/dialplan"
        if [ -d "$DIALPLAN_DIR" ]; then
            PBXCLAW_DP="$DIALPLAN_DIR/pbxclaw.xml"
            if [ -f "$PBXCLAW_DP" ]; then
                ok "PBXClaw dialplan already exists at $PBXCLAW_DP"
            else
                info "Adding PBXClaw dialplan (extensions 900-909, paging, DND codes)..."
                cat > "$PBXCLAW_DP" << 'DPXML'
<!-- PBXClaw — AI agent extensions and features -->
<!-- This file is ADDITIVE — it does not replace your existing dialplan -->
<include>
  <context name="default">

    <!-- AI Agent Extensions (900-909) -->
    <extension name="pbxclaw-ai-agents">
      <condition field="destination_number" expression="^(90[0-9])$">
        <action application="set" data="call_timeout=30"/>
        <action application="bridge" data="user/$1@${domain_name}"/>
      </condition>
    </extension>

    <!-- DND Toggle (*78 on / *79 off) -->
    <extension name="pbxclaw-dnd-on">
      <condition field="destination_number" expression="^\*78$">
        <action application="execute_extension" data="dnd_on"/>
        <action application="set" data="dnd=true"/>
        <action application="db" data="insert/dnd/${caller_id_number}/true"/>
        <action application="playback" data="ivr/ivr-enabled.wav"/>
        <action application="hangup"/>
      </condition>
    </extension>
    <extension name="pbxclaw-dnd-off">
      <condition field="destination_number" expression="^\*79$">
        <action application="set" data="dnd=false"/>
        <action application="db" data="delete/dnd/${caller_id_number}"/>
        <action application="playback" data="ivr/ivr-disabled.wav"/>
        <action application="hangup"/>
      </condition>
    </extension>

    <!-- Page All (*724) -->
    <extension name="pbxclaw-page-all">
      <condition field="destination_number" expression="^\*724$">
        <action application="set" data="sip_auto_answer=true"/>
        <action application="set" data="api_result=${group_call(default@${domain_name}+A)}"/>
      </condition>
    </extension>

    <!-- Voicemail (*97) -->
    <extension name="pbxclaw-voicemail">
      <condition field="destination_number" expression="^\*97$">
        <action application="answer"/>
        <action application="voicemail" data="check default ${domain_name} ${caller_id_number}"/>
      </condition>
    </extension>

  </context>
</include>
DPXML
                ok "PBXClaw dialplan added at $PBXCLAW_DP"
            fi
        else
            warn "No dialplan directory found at $DIALPLAN_DIR"
        fi

        # ── Add ext 900 (Molty) to directory (additive — new file) ──
        DIRECTORY_DIR="$FS_CONF_DIR/directory"
        if [ -d "$DIRECTORY_DIR" ]; then
            PBXCLAW_DIR_FILE="$DIRECTORY_DIR/pbxclaw_agents.xml"
            if [ -f "$PBXCLAW_DIR_FILE" ]; then
                ok "PBXClaw agent directory already exists"
            else
                info "Adding ext 900 (Molty) to directory..."
                cat > "$PBXCLAW_DIR_FILE" << 'DIRXML'
<!-- PBXClaw AI Agent Extensions -->
<!-- ADDITIVE — does not modify your existing user directory -->
<include>
  <!-- Molty — AI Chief of Staff -->
  <user id="900">
    <params>
      <param name="password" value="CHANGE_ME"/>
      <param name="vm-password" value="900"/>
    </params>
    <variables>
      <variable name="toll_allow" value="domestic,international,local"/>
      <variable name="effective_caller_id_name" value="Molty"/>
      <variable name="effective_caller_id_number" value="900"/>
      <variable name="user_context" value="default"/>
      <variable name="callgroup" value="ai-agents"/>
    </variables>
  </user>
</include>
DIRXML
                ok "Ext 900 (Molty) added to directory"
                warn "Edit $PBXCLAW_DIR_FILE and change CHANGE_ME to a real password"
            fi
        else
            warn "No directory folder found at $DIRECTORY_DIR"
        fi

        # ── Ensure ESL is enabled ──
        ESL_CONF="$FS_CONF_DIR/autoload_configs/event_socket.conf.xml"
        if [ -f "$ESL_CONF" ]; then
            ok "ESL config exists at $ESL_CONF"
            # Check if it's listening on 8021
            if grep -q "8021" "$ESL_CONF" 2>/dev/null; then
                ok "ESL configured on port 8021"
            else
                warn "ESL config found but may not be on port 8021 — PBXClaw needs ESL on 8021"
                info "Check: $ESL_CONF"
            fi
        else
            info "ESL config not found — creating..."
            mkdir -p "$FS_CONF_DIR/autoload_configs"
            cat > "$ESL_CONF" << 'ESLXML'
<configuration name="event_socket.conf" description="Socket Client">
  <settings>
    <param name="nat-map" value="false"/>
    <param name="listen-ip" value="127.0.0.1"/>
    <param name="listen-port" value="8021"/>
    <param name="password" value="ClueCon"/>
  </settings>
</configuration>
ESLXML
            ok "ESL config created (port 8021, localhost only)"
            warn "Restart FreeSWITCH to load ESL: fs_cli -x 'reloadxml' or systemctl restart freeswitch"
        fi

        # ── Summary ──
        echo ""
        info "PBXClaw layered onto existing FreeSWITCH:"
        info "  Dialplan: $DIALPLAN_DIR/pbxclaw.xml (new file — your dialplan untouched)"
        info "  Directory: $DIRECTORY_DIR/pbxclaw_agents.xml (new file — your users untouched)"
        info "  ESL: $ESL_CONF (verified)"
        info ""
        info "Run 'fs_cli -x reloadxml' to pick up changes without restarting."
        ;;
esac

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

# Re-source .env in case we wrote FREESWITCH_HOST during Phase 2
set -a
source "$PBXCLAW_HOME/.env" 2>/dev/null || true
set +a

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
case "$FS_MODE" in
    fresh)
        echo "  1. Start FreeSWITCH:"
        if [ "$OS" = "Darwin" ]; then
            echo "     brew services start freeswitch"
        else
            echo "     sudo systemctl start freeswitch"
        fi
        ;;
    remote)
        echo "  1. Ensure FreeSWITCH is running on $FS_HOST"
        echo "     Copy config: scp -r $PBXCLAW_HOME/freeswitch/conf/ user@$FS_HOST:/usr/local/freeswitch/conf/"
        echo "     Reload: ssh user@$FS_HOST 'fs_cli -x reloadxml'"
        ;;
    existing)
        echo "  1. Reload FreeSWITCH config:"
        echo "     fs_cli -x reloadxml"
        ;;
esac
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
