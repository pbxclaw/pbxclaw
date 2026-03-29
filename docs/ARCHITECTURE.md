# PBXClaw Architecture

## System Overview

```
┌──────────────────────────────────────────────────────────────────┐
│                        PBXClaw System                            │
│                                                                  │
│  ┌─────────────┐    ┌──────────────┐    ┌───────────────────┐   │
│  │ SIP Phones  │    │  FreeSWITCH  │    │   Agent Bridge    │   │
│  │ (100-199)   │◄──►│  Port 5060   │◄──►│   (pyVoIP)       │   │
│  │             │    │  ESL: 8021   │    │   Port 5090 HTTP  │   │
│  └─────────────┘    └──────┬───────┘    │   Port 5091 SIP   │   │
│                            │            │   RTP: 20200+     │   │
│                            │            └─────────┬─────────┘   │
│                            │                      │              │
│                     ┌──────┴───────┐    ┌─────────▼─────────┐   │
│                     │  Dashboard   │    │    AI Pipeline     │   │
│                     │  Port 4444   │    │                    │   │
│                     │  React +     │    │  STT (Whisper)     │   │
│                     │  Express     │    │       ↓            │   │
│                     └──────────────┘    │  AI (Haiku 4.5)   │   │
│                                         │       ↓            │   │
│                                         │  TTS (OpenAI/     │   │
│                                         │       pyttsx3)    │   │
│                                         └───────────────────┘   │
└──────────────────────────────────────────────────────────────────┘
```

## Call Flow: Phone → Molty (Extension 900)

```
1. Physical phone dials 900
2. FreeSWITCH routes call via dialplan → agent bridge (pyVoIP registered as ext 900)
3. Agent bridge answers call
4. Agent bridge captures caller audio (RTP → PCMU frames)
5. Speech-to-Text: Whisper transcribes audio locally
6. AI Processing: Transcript sent to Claude Haiku 4.5 via Anthropic API
7. Text-to-Speech: Response rendered to WAV (OpenAI tts-1 or pyttsx3)
8. WAV uploaded to FreeSWITCH, played back via ESL uuid_broadcast
9. Caller hears response, conversation continues (multi-turn)
```

## Components

### FreeSWITCH
- SIP server handling all call signaling and media
- Minimal config: mod_sofia, mod_event_socket, mod_dialplan_xml
- PCMU/PCMA codecs (maximum phone compatibility)
- ESL on port 8021 for programmatic control

### Agent Bridge (`sip-voice/`)
- Python service using pyVoIP for SIP registration
- Registers ext 900 (Molty) with FreeSWITCH
- Handles inbound/outbound calls
- Orchestrates STT → AI → TTS pipeline
- HTTP API on port 5090 for status and control

### Dashboard (`dashboard/`)
- React 19 frontend + Express.js backend
- Chat-first admin interface (primary UI)
- Live FreeSWITCH CLI view via WebSocket + ESL
- Extension management, call logs, voicemail, SIP trunk config
- Auth gate validates PBXClaw API key against pbxclaw.com

### Bridges (`bridges/` — experimental)
- **DND Bridge** — Syncs Do Not Disturb state via ESL events
- **Page Bridge** — Smart paging with private call pickup
- **Agent Presence Bridge** — Tracks AI agent availability for BLF lamps

## Network Ports

| Port | Protocol | Service |
|------|----------|---------|
| 5060 | UDP/TCP | FreeSWITCH SIP |
| 8021 | TCP | FreeSWITCH ESL (localhost only) |
| 16384-32768 | UDP | RTP media |
| 4444 | TCP | Dashboard |
| 5090 | TCP | Agent bridge HTTP API |
| 5091+ | UDP | Agent bridge SIP (per-agent) |
| 20200-20400 | UDP | Agent bridge RTP |

## AI Fallback Chain (Dashboard Chat)

```
1. OpenClaw gateway (if running locally)
2. Local LLM (Ollama, LM Studio — if configured)
3. Direct Anthropic API (using ANTHROPIC_API_KEY)
4. Direct OpenAI API (using OPENAI_API_KEY)
5. "AI unavailable" message
```

## File Structure

```
pbxclaw/
├── install.sh              # Main installer
├── verify-install.sh       # Post-install doctor
├── .env.example            # Config template
├── freeswitch/             # FreeSWITCH installer + config
├── dashboard/              # Admin dashboard (React + Express)
├── sip-voice/              # SIP voice bridge (pyVoIP)
├── bridges/                # ESL bridges (experimental)
└── docs/                   # Documentation
```
