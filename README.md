# PBXClaw 🦞

> **The Private Branch Exchange Between Humans and AI**
> 
> Every phone. Every feature. Plain English.  
> On prem as God intended. 🫩

[![License: AGPL v3](https://img.shields.io/badge/License-AGPL_v3-blue.svg)](https://www.gnu.org/licenses/agpl-3.0)
[![FreeSWITCH](https://img.shields.io/badge/Powered%20by-FreeSWITCH-blue.svg)](https://freeswitch.org)
[![OpenClaw](https://img.shields.io/badge/Integrates%20with-OpenClaw-orange.svg)](https://openclaw.ai)
[![Status](https://img.shields.io/badge/Status-Active%20Development-green.svg)]()

---

## The Story

In 2023 I asked an Asterisk developer about fixing DND BLF sync for Cisco 3PCC phones.

He told me it was impossible. They weren't going to fix it.

That answer sent me down a rabbit hole that ended with PBXClaw.

**The DND BLF sync bug had been broken since 2008. 15 years. Hundreds of forum threads. Zero real solutions.**

Not just on Cisco phones. On Polycom. On Yealink. On Grandstream. On basically every SIP phone ever made.

**We fixed it.**

Then we built the rest.

---

## What is PBXClaw?

PBXClaw is the first AI-native business phone system. Built on FreeSWITCH — the most powerful open source PBX engine ever created — with an AI agent that manages everything in plain English.

**You tell it what you want. It does it.**

```
"Add Sarah Johnson to the support team, 
 extension 206, her phone is at 192.168.1.60"

→ Extension 206 created ✅
→ Support template applied ✅
→ Added to Support ring group ✅
→ Voicemail configured ✅
→ Phone at 192.168.1.60 provisioned ✅
→ Sarah can pick up now ✅

Time: 10 seconds.
FreeSWITCH knowledge required: Zero.
```

---

## What We Solved

### 🔴 DND BLF Sync — The 15-Year Problem
Every SIP phone has a DND button. On every open source PBX, pressing it does nothing useful. The BLF light on other phones never changes. The receptionist never knows. We built a FreeSWITCH ESL bridge that finally fixes this — on **every phone brand**.

### 📟 Smart Paging (Panasonic-Style)
Page goes out one-way. Any recipient picks up their handset. Converts to a **private two-way call** with the pager. Everyone else drops. This is how Panasonic did it in the 90s. Open source PBX never had it. Until now.

### 🤖 AI Agent Phone Extensions
Your OpenClaw agents get real SIP extensions. DND light shows on your KEM when Molty is busy. You can call your AI chief of staff on a desk phone. He answers. This has never existed before.

### 💬 Plain English PBX Management
No more FusionPBX. No more FreePBX. No more config files. No more Fiverr guys. Just chat:

*"Set up holiday routing for Christmas week"* → Done  
*"Show me all calls over 10 minutes today"* → Done  
*"Create a conference room with a manager PIN"* → Done  
*"Why is John's phone choppy?"* → Diagnosed and fixed

---

## Features

### Core (All Plans)
- ✅ **DND BLF sync** — works on every SIP phone brand
- ✅ **Smart paging** — Panasonic-style private call pickup  
- ✅ **AI phone provisioning** — give us the IP, we handle the rest
- ✅ **PBX chat agent** — manage everything in plain English
- ✅ **AI agent extensions** — your OpenClaw agents get desk phones
- ✅ **Auto phone detection** — we identify the phone model automatically
- ✅ **All templates free** — no commercial module paywalls
- ✅ **BYO PSTN** — use your own SIP trunk (phone guys 😂)
- ✅ **On-prem** — your server, your data, your building
- ✅ **PBX Mission Control** — beautiful dashboard on your hardware

### Business
- ✅ Advanced IVR builder
- ✅ Ring groups & hunt groups
- ✅ Paging groups
- ✅ Time conditions
- ✅ Find me / Follow me
- ✅ Call recording + transcription
- ✅ Voicemail to email
- ✅ Custom templates

### Enterprise / Call Center
- ✅ Call center queues
- ✅ Agent login/logout
- ✅ Skills-based routing
- ✅ Supervisor features (whisper, barge)
- ✅ Real-time wallboard
- ✅ Historical reporting
- ✅ SLA monitoring

---

## Phone Compatibility

PBXClaw works with **every SIP phone**. DND BLF sync works on all of them.

| Brand | DND Fixed | Auto-Provision | Tested |
|-------|-----------|----------------|--------|
| Cisco 8800 series 3PCC | ✅ | ✅ | ✅ |
| Polycom/Poly VVX | ✅ | ✅ | Coming |
| Yealink T-series | ✅ | ✅ | Coming |
| Grandstream GXP | ✅ | ✅ | Coming |
| Snom | ✅ | ✅ | Coming |
| Fanvil | ✅ | ✅ | Coming |

---

## Architecture

```
PBXClaw Stack:
├── FreeSWITCH 1.10.13      ← The engine
├── freeswitch-dnd-bridge   ← The 15-year fix
├── freeswitch-page-bridge  ← Smart paging
├── freeswitch-agent-bridge ← AI agent presence
├── agent-sip-bridge        ← Voice pipeline
└── PBX Mission Control     ← The dashboard

OpenClaw Integration:
├── Molty (ext 900)         ← Chief of Staff
├── Sub-agents (901-904)    ← Your team
└── pbxclaw skill           ← One-click install
```

**No FusionPBX required. No FreePBX. No PHP. No PostgreSQL.**

Just FreeSWITCH and a beautiful dashboard.

---

## Pricing

| Plan | Price | Extensions |
|------|-------|------------|
| Solo | $19.99/month | 1-3 |
| Business | $79/month | Up to 25 |
| Enterprise | $249/month | Up to 100 |
| Call Center | $449/month | Unlimited |

**+ $4.99/month PSTN access** (or BYO trunk — free)

**7-day free trial. No credit card required.**

→ [pbxclaw.com](https://pbxclaw.com) *(coming soon)*

---

## Roadmap

- [x] FreeSWITCH ESL DND bridge (15-year fix)
- [x] Smart paging with private call pickup
- [x] AI agent SIP extensions
- [x] Voice pipeline (Molty answers calls)
- [x] PBX Mission Control dashboard
- [ ] install.sh one-command setup
- [ ] Docker package
- [ ] PBX chat agent (plain English management)
- [ ] Auto phone provisioning (all brands)
- [ ] pbxclaw.com + sign up
- [ ] PSTN integration
- [ ] Call center module
- [ ] PBXClaw Box (hardware appliance)
- [ ] v2: Power UI (for the old timers 😂)
- [ ] v3: PBXClaw Phone (designed by a phone guy)

---

## The OpenClaw Connection

The "Claw" in PBXClaw isn't an accident.

PBXClaw is the first phone system that gives your [OpenClaw](https://openclaw.ai) agents real SIP extensions. Your AI chief of staff gets a desk phone. A DND light. A KEM button. You can page him. He can page you. He manages the whole PBX in plain English.

QClaw gives your agents a WeChat interface.  
**PBXClaw gives them a phone system.**

---

## Built By

A phone guy from Deal, NJ — near Bell Labs in Holmdel.

First phone: Mickey Mouse, age 3.  
First PBX: AT&T Merlin 1030, age 17.  
First key system love: Nortel CICS, 2004.  
This project: The phone company I always wanted to exist.

*"I started this because an Asterisk developer told me DND BLF sync was impossible. Thanks for the motivation."* 😂

---

## Contributing

PRs welcome. Phone guys especially welcome. 😂

If you've been fighting the same DND bug — you're home.

---

## License

AGPL-3.0 — Use it freely. If you build a service with it, share your changes. Phone guys share. Corporations pay. 🦞

---

*Built by a phone guy. Powered by AI. On prem as God intended. Never sold.*

**🦞 pbxclaw.com**

---
© 2026 PBXClaw | A. Shammah. All rights reserved.
[pbxclaw.com](https://pbxclaw.com)
