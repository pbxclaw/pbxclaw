#!/bin/bash
set -euo pipefail

# ═══════════════════════════════════════════
# PBXClaw — FreeSWITCH Installer
# No SignalWire token required.
# macOS: Homebrew  |  Linux: Source build
# ═══════════════════════════════════════════

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PBXCLAW_HOME="$(dirname "$SCRIPT_DIR")"

# FreeSWITCH version for source build
FS_VERSION="v1.10.12"
LIBKS_BRANCH="v1"
SPANDSP_COMMIT="67d2455"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

info()  { echo -e "${CYAN}[PBXClaw]${NC} $1"; }
ok()    { echo -e "${GREEN}[  OK  ]${NC} $1"; }
warn()  { echo -e "${YELLOW}[ WARN ]${NC} $1"; }
fail()  { echo -e "${RED}[ FAIL ]${NC} $1"; }

# ─── Detect Platform ────────────────────────
OS="$(uname -s)"
ARCH="$(uname -m)"

echo ""
echo -e "${CYAN}═══════════════════════════════════════════${NC}"
echo -e "${CYAN}  PBXClaw — FreeSWITCH Installer${NC}"
echo -e "${CYAN}  No SignalWire token required.${NC}"
echo -e "${CYAN}═══════════════════════════════════════════${NC}"
echo ""
info "Platform: $OS ($ARCH)"

# ═══════════════════════════════════════════
# macOS — Install via Homebrew
# ═══════════════════════════════════════════
install_macos() {
    info "Installing FreeSWITCH via Homebrew..."

    # Check Homebrew
    if ! command -v brew &>/dev/null; then
        warn "Homebrew not found. Installing..."
        /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
    fi
    ok "Homebrew available"

    # Check if already installed
    if brew list freeswitch &>/dev/null; then
        ok "FreeSWITCH already installed via Homebrew"
        FS_PREFIX="$(brew --prefix freeswitch)"
        info "Location: $FS_PREFIX"
    else
        info "Running: brew install freeswitch"
        info "This may take a few minutes..."
        brew install freeswitch
        FS_PREFIX="$(brew --prefix freeswitch)"
        ok "FreeSWITCH installed at $FS_PREFIX"
    fi

    # Determine config directory
    FS_CONF_DIR="$FS_PREFIX/etc/freeswitch"

    # Deploy PBXClaw config
    deploy_config "$FS_CONF_DIR"

    # Show how to start
    echo ""
    info "To start FreeSWITCH:"
    echo "  brew services start freeswitch"
    echo "  # or manually:"
    echo "  $FS_PREFIX/bin/freeswitch -nc"
    echo ""
}

# ═══════════════════════════════════════════
# Linux — Compile from source
# ═══════════════════════════════════════════
install_linux() {
    info "Installing FreeSWITCH from source (no SignalWire token needed)..."
    info "This will take 20-40 minutes on first run."
    echo ""

    BUILD_DIR="/usr/local/src/pbxclaw-freeswitch-build"
    FS_PREFIX="/usr/local/freeswitch"
    FS_CONF_DIR="$FS_PREFIX/etc/freeswitch"

    # Check if already installed
    if [ -x "$FS_PREFIX/bin/freeswitch" ]; then
        ok "FreeSWITCH already installed at $FS_PREFIX"
        FS_VER=$("$FS_PREFIX/bin/freeswitch" -version 2>&1 | head -1 || echo "unknown")
        info "Version: $FS_VER"
        deploy_config "$FS_CONF_DIR"
        return 0
    fi

    # Check root/sudo
    if [ "$EUID" -ne 0 ]; then
        fail "Linux source build requires root. Run with sudo."
        exit 1
    fi

    # Install build dependencies
    info "Installing build dependencies..."
    apt-get update -qq
    apt-get install -y -qq \
        build-essential cmake autoconf automake libtool pkg-config \
        libssl-dev libcurl4-openssl-dev libpcre3-dev libspeexdsp-dev \
        libsqlite3-dev libedit-dev libldns-dev libtiff-dev \
        libjpeg-dev libopus-dev libsndfile-dev uuid-dev \
        libavformat-dev libswscale-dev wget git \
        yasm nasm python3-dev 2>/dev/null
    ok "Build dependencies installed"

    mkdir -p "$BUILD_DIR"
    cd "$BUILD_DIR"

    # ─── 1. Build libks ────────────────────
    if ! ldconfig -p | grep -q libks; then
        info "[1/5] Building libks..."
        if [ ! -d libks ]; then
            git clone -b "$LIBKS_BRANCH" --depth 1 https://github.com/signalwire/libks.git
        fi
        cd libks
        cmake -B build -DCMAKE_INSTALL_PREFIX=/usr/local
        cmake --build build -j"$(nproc)"
        cmake --install build
        ldconfig
        cd "$BUILD_DIR"
        ok "libks installed"
    else
        ok "libks already installed"
    fi

    # ─── 2. Build signalwire-c ─────────────
    if ! ldconfig -p | grep -q libsignalwire_client; then
        info "[2/5] Building signalwire-c..."
        if [ ! -d signalwire-c ]; then
            git clone --depth 1 https://github.com/signalwire/signalwire-c.git
        fi
        cd signalwire-c
        cmake -B build -DCMAKE_INSTALL_PREFIX=/usr/local
        cmake --build build -j"$(nproc)"
        cmake --install build
        ldconfig
        cd "$BUILD_DIR"
        ok "signalwire-c installed"
    else
        ok "signalwire-c already installed"
    fi

    # ─── 3. Build sofia-sip ────────────────
    if ! ldconfig -p | grep -q libsofia-sip; then
        info "[3/5] Building sofia-sip..."
        if [ ! -d sofia-sip ]; then
            git clone --depth 1 https://github.com/freeswitch/sofia-sip.git
        fi
        cd sofia-sip
        ./bootstrap.sh
        ./configure --prefix=/usr/local
        make -j"$(nproc)"
        make install
        ldconfig
        cd "$BUILD_DIR"
        ok "sofia-sip installed"
    else
        ok "sofia-sip already installed"
    fi

    # ─── 4. Build spandsp ──────────────────
    if ! ldconfig -p | grep -q libspandsp; then
        info "[4/5] Building spandsp (pinned to $SPANDSP_COMMIT)..."
        if [ ! -d spandsp ]; then
            git clone https://github.com/signalwire/spandsp.git
        fi
        cd spandsp
        git checkout "$SPANDSP_COMMIT" 2>/dev/null || true
        ./bootstrap.sh
        ./configure --prefix=/usr/local
        make -j"$(nproc)"
        make install
        ldconfig
        cd "$BUILD_DIR"
        ok "spandsp installed"
    else
        ok "spandsp already installed"
    fi

    # ─── 5. Build FreeSWITCH ──────────────
    info "[5/5] Building FreeSWITCH $FS_VERSION..."
    info "This is the longest step. Grab a coffee."
    if [ ! -d freeswitch ]; then
        git clone -b "$FS_VERSION" --depth 1 https://github.com/signalwire/freeswitch.git
    fi
    cd freeswitch

    # Configure minimal modules
    cat > modules.conf <<'MODULES'
applications/mod_commands
applications/mod_dptools
applications/mod_voicemail
codecs/mod_spandsp
codecs/mod_opus
dialplans/mod_dialplan_xml
endpoints/mod_sofia
endpoints/mod_loopback
event_handlers/mod_event_socket
formats/mod_sndfile
formats/mod_native_file
formats/mod_tone_stream
loggers/mod_console
loggers/mod_logfile
MODULES

    ./bootstrap.sh -j
    ./configure --prefix="$FS_PREFIX" \
        --enable-core-pgsql-support=no \
        --enable-core-odbc-support=no
    make -j"$(nproc)"
    make install
    make sounds-install moh-install

    ok "FreeSWITCH $FS_VERSION installed at $FS_PREFIX"
    cd "$BUILD_DIR"

    # Deploy PBXClaw config
    deploy_config "$FS_CONF_DIR"

    # Create systemd service
    create_systemd_service

    echo ""
    info "To start FreeSWITCH:"
    echo "  systemctl start freeswitch"
    echo "  # or manually:"
    echo "  $FS_PREFIX/bin/freeswitch -nc"
    echo ""
}

# ═══════════════════════════════════════════
# Deploy PBXClaw config into FreeSWITCH
# ═══════════════════════════════════════════
deploy_config() {
    local conf_dir="$1"
    info "Deploying PBXClaw FreeSWITCH config to $conf_dir..."

    # Backup existing config if present
    if [ -d "$conf_dir" ] && [ "$(ls -A "$conf_dir" 2>/dev/null)" ]; then
        local backup_dir="${conf_dir}.backup.$(date +%Y%m%d%H%M%S)"
        warn "Backing up existing config to $backup_dir"
        cp -r "$conf_dir" "$backup_dir"
    fi

    # Copy PBXClaw config
    mkdir -p "$conf_dir"
    cp -r "$SCRIPT_DIR/conf/"* "$conf_dir/"

    ok "PBXClaw FreeSWITCH config deployed"
}

# ═══════════════════════════════════════════
# Create systemd service (Linux only)
# ═══════════════════════════════════════════
create_systemd_service() {
    if [ ! -d /etc/systemd/system ]; then
        return 0
    fi

    cat > /etc/systemd/system/freeswitch.service <<EOF
[Unit]
Description=FreeSWITCH (PBXClaw)
After=network.target

[Service]
Type=forking
ExecStart=/usr/local/freeswitch/bin/freeswitch -nc -nonat
ExecStop=/usr/local/freeswitch/bin/fs_cli -x shutdown
Restart=on-failure
RestartSec=5
LimitNOFILE=65536
LimitNPROC=65536

[Install]
WantedBy=multi-user.target
EOF

    systemctl daemon-reload
    ok "systemd service created (freeswitch.service)"
}

# ═══════════════════════════════════════════
# Main
# ═══════════════════════════════════════════
case "$OS" in
    Darwin)
        install_macos
        ;;
    Linux)
        install_linux
        ;;
    *)
        fail "Unsupported platform: $OS"
        fail "PBXClaw supports macOS and Linux (Debian/Ubuntu)."
        exit 1
        ;;
esac

echo ""
ok "FreeSWITCH installation complete."
echo ""
