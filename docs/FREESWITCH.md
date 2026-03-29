# PBXClaw — FreeSWITCH Integration

## How PBXClaw Bundles FreeSWITCH

PBXClaw includes FreeSWITCH as its telephony engine. **No SignalWire token is required.**

- **macOS:** Installed via Homebrew (`brew install freeswitch`)
- **Linux:** Compiled from source (automated by `freeswitch/install-freeswitch.sh`)

## Modules Included

PBXClaw uses a minimal module set:

| Module | Purpose |
|--------|---------|
| mod_sofia | SIP stack (registration, calls, presence) |
| mod_event_socket | ESL — programmatic control (port 8021) |
| mod_dialplan_xml | XML-based dialplan routing |
| mod_commands | API commands |
| mod_dptools | Dialplan tools (bridge, playback, etc.) |
| mod_loopback | Internal call routing |
| mod_sndfile | WAV/audio file support |
| mod_native_file | Raw audio file support |
| mod_tone_stream | Tone generation |
| mod_spandsp | Codec support |
| mod_voicemail | Basic voicemail |

## Configuration

PBXClaw deploys its own minimal FreeSWITCH config to replace the default:

```
freeswitch/conf/
├── freeswitch.xml              # Main config loader
├── vars.xml                    # Global variables (codecs, IPs)
├── autoload_configs/
│   ├── event_socket.conf.xml   # ESL on port 8021
│   ├── modules.conf.xml        # Module loading
│   ├── sofia.conf.xml          # SIP profile loader
│   └── switch.conf.xml         # Core settings (RTP ports)
├── sip_profiles/
│   └── internal.xml            # SIP profile (port 5060, PCMU/PCMA)
├── dialplan/
│   └── default.xml             # Call routing (100-199, 900-909)
└── directory/
    └── default.xml             # User directory (ext 900 Molty)
```

## Codecs

PBXClaw forces **PCMU/PCMA** (G.711) codecs. This is intentional:
- Maximum compatibility with all SIP phones
- Proven with Cisco 8865, Polycom VVX, Yealink T-series
- Low CPU overhead
- Reliable with the pyVoIP bridge

## Firewall Ports

Open these ports for PBXClaw to work:

| Port | Protocol | Direction | Purpose |
|------|----------|-----------|---------|
| 5060 | UDP+TCP | Inbound | SIP signaling |
| 8021 | TCP | Localhost only | ESL |
| 16384-32768 | UDP | Bidirectional | RTP media |

## Adding Extensions

Extensions are managed through the dashboard chat admin or by adding XML files to the FreeSWITCH directory:

```xml
<!-- freeswitch/conf/directory/101.xml -->
<include>
  <user id="101">
    <params>
      <param name="password" value="your-secure-password"/>
    </params>
    <variables>
      <variable name="effective_caller_id_name" value="Front Desk"/>
      <variable name="effective_caller_id_number" value="101"/>
      <variable name="user_context" value="default"/>
    </variables>
  </user>
</include>
```

After adding, reload: `fs_cli -x reloadxml`

Or just tell the chat admin: *"Add extension 101 for the front desk"*
