# PBXClaw Alpha — Known Issues

## Audio

- **Whisper model downloads ~140MB on first call.** The first call to ext 900 may take 30-60 seconds while the Whisper model downloads. Subsequent calls start immediately.

- **RTP port conflicts.** If another application uses ports 16384-32768, calls may have no audio. Check with `lsof -i UDP:16384`.

## FreeSWITCH

- **Codec cache (FusionPBX).** If upgrading from a FusionPBX installation, codec changes require: DB flush + `rm -rf /etc/freeswitch/cache/*` + restart. PBXClaw's fresh config avoids this.

- **Linux source build takes 20-40 minutes.** This is the time to compile FreeSWITCH and its dependencies from source. No way around it — but it only happens once.

- **spandsp build may fail on HEAD.** The installer pins to a known-good commit. If you're building manually, use commit `67d2455`.

## Dashboard

- **Requires internet for auth.** The dashboard validates your PBXClaw API key against pbxclaw.com on startup. Offline mode is not yet supported.

## Phone Compatibility

- **DND/BLF lamp sync is not yet verified on physical handsets.** The bridge code exists but synchronizing DND state to physical BLF lamps on Cisco 8865, Polycom VVX, etc. is still in development. Coming soon.

- **Auto-provisioning is not yet available.** Register phones manually via their web UI or provisioning server.

## SIP Trunking

- **PBXClaw managed PSTN is coming soon.** For alpha, use BYO trunk (bring your own SIP trunk from Twilio, Telnyx, SignalWire, etc.).

## macOS Specific

- **FreeSWITCH via Homebrew** is less battle-tested than Debian packages but works for development and small deployments.

- **PortAudio may need manual install** for PyAudio: `brew install portaudio`
