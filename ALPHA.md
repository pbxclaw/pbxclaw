# PBXClaw Alpha — Scope and Status

> Honest about what works. Honest about what doesn't.

## What Works

- **Extension 900 "Molty"** — Full AI voice pipeline. Call ext 900, Molty answers, you have a conversation. STT via Whisper (local), AI via Claude Haiku 4.5, TTS via OpenAI or pyttsx3.
- **SIP registration** — Extensions register with FreeSWITCH via pyVoIP. Watchdog keeps them alive.
- **Internal calls** — Extensions can call each other. PCMU/PCMA codecs.
- **Dashboard** — Web-based admin at port 4444 with chat interface, live FS CLI, extension management.
- **Chat admin** — Manage your PBX in plain English through the dashboard chat.
- **BYO SIP trunk** — Paste your own SIP trunk credentials, FreeSWITCH auto-configures.
- **FreeSWITCH bundled** — No SignalWire token required. Homebrew on macOS, source build on Linux.

## What is Experimental

- **DND bridge** — Bridge code included, syncs DND state via ESL. Not auto-started.
- **Agent presence bridge** — Tracks AI agent availability. Included, not auto-started.
- **Smart paging** — Page bridge included. Architecture works, needs testing with physical phones.
- **Extensions 901-909** — Defined in config, disabled by default. Ready for additional AI agents.

## What is NOT Included

- Cisco 8865 DND/BLF lamp synchronization (coming soon)
- Auto phone provisioning (coming soon)
- PBXClaw managed PSTN (coming soon — use BYO trunk for now)
- Docker packaging
- Multi-tenant support
- Call recording / transcription
- Call center queues

## Known Issues

See [docs/KNOWN-ISSUES.md](docs/KNOWN-ISSUES.md)

## Architecture

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)
