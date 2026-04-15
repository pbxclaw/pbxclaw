<div align="center">

# 🦀 PBXClaw

### The AI-native PBX. On prem as God intended.

Every phone. Every feature. Plain English control.

[![Website](https://img.shields.io/badge/Website-pbxclaw.com-1B3A5C?style=flat)](https://pbxclaw.com)
[![License](https://img.shields.io/badge/License-Proprietary-C0392B?style=flat)](LICENSE)
[![Support](https://img.shields.io/badge/Support-support%40pbxclaw.com-00D4FF?style=flat)](mailto:support@pbxclaw.com)

**Status:** Alpha — accepting early customers. Core PBX features stable. Advanced features (managed PSTN, multi-site, voice AI) in active development.

</div>

---

## What is PBXClaw?

PBXClaw is an AI-native on-premises PBX phone system. It runs on your own server, speaks plain English, and works with the SIP phones you already own — including the ones the cloud vendors told you to throw away.

**Built by phone guys. Powered by AI. Never sold to the cloud.**

We fixed the 15-year-old DND/BLF bug that every other open source PBX shipped broken. We built a dashboard an IT admin and a receptionist can both use. We made the whole thing respond to plain English so you can add an employee in 10 seconds instead of clicking through 47 menus.

### Key features

- 📞 **Every SIP phone works** — Cisco, Polycom, Yealink, Grandstream, and the rest. Auto-provisioned from IP address.
- 🤖 **Plain English control** — "Add Sarah to extension 206, sales department" and it's done.
- 🫡 **On-prem always** — Your server, your data. Internal calls work even when your internet is down.
- 🔒 **Bring your own provider** — SignalWire, Twilio, or any SIP trunk. No lock-in, no markup.
- 💬 **AI chief of staff** — Manage your entire phone system through natural language conversations.
- 🎯 **No per-seat pricing** — Flat monthly plans. No surprise bills.

---

## Getting Started

### 1. Sign up

Visit [pbxclaw.com/signup](https://pbxclaw.com/signup) and pick a plan. You'll get:
- A 7-day free trial
- Your PBXClaw API key via email
- Access to your dashboard at [pbxclaw.com/dashboard](https://pbxclaw.com/dashboard)

### 2. Install on your server

On your Linux server, run:

```bash
curl -sSL -H "X-API-Key: YOUR_API_KEY" https://pbxclaw.com/install.sh | bash
```

Replace `YOUR_API_KEY` with the key from your welcome email.

The installer will:
- Install PBXClaw and all required services
- Configure your local PBX Mission Control dashboard
- Set up all bridge services
- Verify everything is working

**Supported platforms:**
- **Linux** — Debian 11+, Ubuntu 20.04+, CentOS/RHEL 8+

macOS (for Mac mini deployments) is in active development and coming soon.

### 3. Open Mission Control

After install, your local PBX Mission Control dashboard runs on port 4444:

```
http://your-server-ip:4444
```

Log in with your PBXClaw credentials and start managing your phone system.

---

## Plans and pricing

| Plan | Price | Extensions | Best for |
|---|---|---|---|
| **Solo** | $19.99/mo | 1–3 | Small offices, home businesses |
| **Business** | $79/mo | Up to 25 | Growing businesses |
| **Enterprise** | $249/mo | Up to 100 | Multi-location businesses |
| **Call Center** | $449/mo | Unlimited | High-volume call centers |

All plans include:
- Full PBX Mission Control dashboard
- Bring your own SIP trunk support
- Auto phone provisioning
- Voicemail, IVR, ring groups, paging
- Plain English AI control

**PSTN service:** Bring your own SIP trunk provider (SignalWire, Twilio, or any SIP trunk) at no additional cost. PBXClaw-managed phone numbers and minutes coming soon.

Visit [pbxclaw.com](https://pbxclaw.com) for current pricing and feature details.

---

## Documentation and support

- 📖 **Documentation** — [pbxclaw.com](https://pbxclaw.com) (product tour, features, pricing)
- 💬 **Support** — [support@pbxclaw.com](mailto:support@pbxclaw.com)
- 🔐 **Security** — [security@pbxclaw.com](mailto:security@pbxclaw.com)
- 🚨 **Abuse reports** — [abuse@pbxclaw.com](mailto:abuse@pbxclaw.com)
- 🐛 **Bug reports** — Email support with your PBXClaw version and logs
- 💡 **Feature requests** — Email us — we read every one

---

## Licensing

PBXClaw is proprietary commercial software. All source code, binaries, and intellectual property are the exclusive property of PBXClaw LLC. See `LICENSE` for full terms.

A valid PBXClaw subscription is required to use this software. By using PBXClaw, you agree to our [Terms of Service](https://pbxclaw.com/terms) and [Privacy Policy](https://pbxclaw.com/privacy).

---

## About

PBXClaw is built by [PBXClaw LLC](https://pbxclaw.com), based in New Jersey. We're phone guys who got tired of watching small businesses get charged $50 per seat per month for a phone system that doesn't work half the time.

We grew up near Bell Labs. We've been configuring PBXs since before VoIP was a word. We built PBXClaw because we wanted a phone system that actually works — on our own hardware, in plain English, with the phones we already own.

Follow our progress and new features at [pbxclaw.com](https://pbxclaw.com).

---

<div align="center">

**On prem as God intended.** 🦀

[Website](https://pbxclaw.com) · [Sign Up](https://pbxclaw.com/signup) · [Pricing](https://pbxclaw.com/#pricing) · [Support](mailto:support@pbxclaw.com)

</div>
