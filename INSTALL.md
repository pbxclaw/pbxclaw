# PBXClaw Alpha — Installation Guide

## Prerequisites

| Requirement | macOS | Linux |
|------------|-------|-------|
| Python 3.10+ | `brew install python@3.12` | `apt install python3` |
| Node.js 18+ | `brew install node` | `curl -fsSL https://deb.nodesource.com/setup_20.x \| sudo bash -` |
| ffmpeg | `brew install ffmpeg` | `apt install ffmpeg` |
| Git | pre-installed | `apt install git` |

## Quick Start

```bash
git clone https://github.com/pbxclaw/pbxclaw.git
cd pbxclaw
./install.sh
```

The installer will:

1. Check your system for required tools
2. Install FreeSWITCH (Homebrew on macOS, source build on Linux — no SignalWire token needed)
3. Ask for your PBXClaw API key (get one at [pbxclaw.com/signup](https://pbxclaw.com/signup))
4. Ask for your Anthropic API key (for AI voice on ext 900)
5. Create a Python virtual environment and install dependencies
6. Build the dashboard
7. Run connectivity checks

## After Installation

### 1. Start FreeSWITCH

**macOS:**
```bash
brew services start freeswitch
```

**Linux:**
```bash
sudo systemctl start freeswitch
```

### 2. Start the Dashboard

```bash
cd dashboard/backend && node server.js
```

Open [http://localhost:4444](http://localhost:4444) in your browser.

### 3. Start the SIP Voice Bridge

```bash
./sip-voice/start_sip_bridge.sh
```

### 4. Verify

```bash
./verify-install.sh
```

### 5. Make a Call

Register a SIP phone to your FreeSWITCH (port 5060) and call extension 900. Molty will answer.

## Configuration

### `.env` file

The installer creates `.env` from `.env.example`. Edit it with your keys:

```bash
PBXCLAW_API_KEY=your-key-here
ANTHROPIC_API_KEY=sk-ant-...
```

### SIP Bridge Config

`sip-voice/agent_sip_config.json` — Extension passwords and PBX connection settings. The installer creates this from the example file. Edit the passwords before starting the bridge.

### BYO SIP Trunk

Go to the **Providers** page in the dashboard. Enter your SIP trunk credentials:
- Provider name (e.g., "Twilio", "Telnyx", "SignalWire")
- SIP server address
- Username and password

The dashboard auto-configures FreeSWITCH and tests the connection.

## Troubleshooting

**FreeSWITCH won't start:**
- Check if port 5060 is in use: `lsof -i :5060`
- Check logs: `brew services log freeswitch` (macOS) or `journalctl -u freeswitch` (Linux)

**Dashboard shows "Invalid API Key":**
- Verify your key at [pbxclaw.com](https://pbxclaw.com)
- Check `.env` has the correct `PBXCLAW_API_KEY`

**No audio on calls:**
- Ensure PCMU/PCMA codecs are set on your phone
- Check firewall: UDP ports 16384-32768 must be open for RTP
- Check ESL port 8021 is accessible

**Molty doesn't respond:**
- Verify `ANTHROPIC_API_KEY` is set in `.env`
- Check the SIP bridge is running: `curl http://localhost:5090/status`
- Check the bridge logs: `tail -f sip-voice/sip_bridge.log`

**Linux source build fails:**
- Ensure all build dependencies are installed (the script handles this with apt)
- spandsp build may need `libtiff-dev` — install with `apt install libtiff-dev`
- Check available disk space (needs ~2GB for the build)
