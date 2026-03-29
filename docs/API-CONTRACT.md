# PBXClaw — Cloud-to-Local API Contract

> This document defines every API interaction between pbxclaw.com (cloud) and the local PBXClaw install (dashboard + install.sh). Both sides must implement to this spec.

## Authentication

All authenticated requests use one of these headers (cloud accepts both):

```
x-api-key: <PBXCLAW_API_KEY>
Authorization: Bearer <PBXCLAW_API_KEY>
```

The API key is a UUID generated at signup and shown once to the customer.

---

## Endpoints — pbxclaw.com

### Auth

#### `POST /api/auth/signup`

Creates a new customer account with 7-day trial.

**Request:**
```json
{
  "email": "user@example.com",
  "first_name": "John",
  "last_name": "Smith",
  "company": "Acme Inc",
  "phone": "+1-555-0100",
  "country": "United States",
  "plan": "business"
}
```

**Response (201):**
```json
{
  "success": true,
  "api_key": "550e8400-e29b-41d4-a716-446655440000",
  "trial_ends_at": "2026-04-05T00:00:00.000Z",
  "customer": {
    "id": "uuid",
    "email": "user@example.com",
    "plan": "business",
    "status": "trial",
    "trial_ends_at": "2026-04-05T00:00:00.000Z"
  }
}
```

**Errors:** 400 (missing fields), 403 (blocked country), 409 (email exists)

**Notes:**
- `api_key` is shown once at signup. Customer must save it.
- Welcome email sent via Resend.
- Valid plans: `solo`, `business`, `enterprise`, `callcenter`

---

#### `POST /api/auth/signin`

Sign in by email + password.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "their-password"
}
```

**Response (200):**
```json
{
  "success": true,
  "customer": {
    "id": "uuid",
    "email": "user@example.com",
    "plan": "business",
    "status": "active"
  }
}
```

**Note:** Password hashing not yet implemented (alpha). Accepts any password for a valid email.

---

#### `GET /api/auth/verify-key`

Validates a PBXClaw API key. Used by `install.sh` and the dashboard auth gate.

**Headers:** `x-api-key` or `Authorization: Bearer`

**Response (200) — valid:**
```json
{
  "valid": true,
  "status": "active",
  "customer": {
    "id": "uuid",
    "email": "user@example.com",
    "first_name": "John",
    "last_name": "Smith",
    "company": "Acme Inc",
    "plan": "business",
    "status": "active",
    "trial_ends_at": "2026-04-05T00:00:00.000Z"
  }
}
```

**Response (401) — invalid:**
```json
{
  "valid": false,
  "error": "Invalid API key"
}
```

**Response (200) — suspended/past_due:**
```json
{
  "valid": false,
  "status": "suspended",
  "customer": {
    "id": "uuid",
    "email": "user@example.com",
    "plan": "business",
    "status": "suspended"
  }
}
```

**Status values:** `trial`, `active`, `past_due`, `suspended`, `cancelled`

---

### Customer

#### `GET /api/customer/me`

Returns full customer profile.

**Headers:** `x-api-key` or `Authorization: Bearer`

**Response (200):**
```json
{
  "customer": {
    "id": "uuid",
    "email": "user@example.com",
    "first_name": "John",
    "last_name": "Smith",
    "company": "Acme Inc",
    "phone": "+1-555-0100",
    "country": "United States",
    "plan": "business",
    "status": "active",
    "trial_ends_at": "2026-04-05T00:00:00.000Z",
    "next_billing_at": "2026-05-05T00:00:00.000Z",
    "created_at": "2026-03-29T00:00:00.000Z"
  }
}
```

---

### Billing (Stripe)

#### `POST /api/stripe/webhook`

Handles Stripe subscription events. Called by Stripe, not by PBXClaw.

**Events handled:**
- `invoice.payment_succeeded` → sets status to `active`, advances `next_billing_at`
- `invoice.payment_failed` → sets status to `past_due`, sends payment failed email
- `customer.subscription.deleted` → sets status to `cancelled`

**Note:** Webhook signature verification not yet implemented (alpha/test mode).

---

### Notifications

#### `POST /api/notify/subscribe`

Adds email to waitlist/notification list.

**Request:**
```json
{ "email": "user@example.com" }
```

**Response (201):**
```json
{ "success": true, "message": "Subscribed to notifications" }
```

---

### Install / Machine Bootstrap

#### `POST /api/install/validate-key`

Called by `install.sh`. Validates key and returns a bootstrap token.

**Request:**
```json
{ "api_key": "550e8400-e29b-41d4-a716-446655440000" }
```

**Response (200):**
```json
{
  "valid": true,
  "status": "trial",
  "plan": "business",
  "bootstrap_token": "<HMAC-signed token, 24h TTL>",
  "customer": {
    "id": "uuid",
    "email": "user@example.com",
    "first_name": "John",
    "plan": "business",
    "status": "trial",
    "trial_ends_at": "2026-04-05T00:00:00.000Z"
  }
}
```

**Errors:** 400 (no key), 401 (invalid), 403 (suspended/cancelled)

---

#### `POST /api/install/register-machine`

Registers an install instance. Requires bootstrap token.

**Headers:** `Authorization: Bearer <bootstrap_token>`

**Request:**
```json
{
  "machine_name": "Office PBX",
  "hostname": "pbx-server",
  "os": "Linux",
  "arch": "x86_64",
  "freeswitch_host": "127.0.0.1",
  "freeswitch_mode": "fresh"
}
```

**Response (201):**
```json
{
  "success": true,
  "machine_id": "uuid"
}
```

---

#### `GET /api/install/manifest`

Returns install manifest with versions, feature flags, port config.
Requires bootstrap token.

**Headers:** `Authorization: Bearer <bootstrap_token>`

**Response (200):**
```json
{
  "version": "0.1.0-alpha",
  "channel": "alpha",
  "plan": "business",
  "components": {
    "freeswitch": { "version": "1.10.12", "required": true },
    "dashboard": { "version": "0.1.0-alpha", "port": 4444, "required": true },
    "sip_bridge": { "version": "0.1.0-alpha", "required": false }
  },
  "ports": { "sip": 5060, "esl": 8021, "dashboard": 4444, "rtp_start": 16384, "rtp_end": 32768 },
  "features": {
    "max_extensions": 25,
    "ai_admin": true,
    "byo_trunk": true,
    "pstn_service": false,
    "call_recording": true
  }
}
```

---

### Dashboard Bootstrap

#### `POST /api/dashboard/bootstrap`

Called once by dashboard backend on startup. Sends API key, gets session token.
Dashboard uses this token for subsequent cloud requests instead of raw key.

**Request:**
```json
{
  "api_key": "550e8400-e29b-41d4-a716-446655440000",
  "machine_id": "uuid"
}
```

**Response (200):**
```json
{
  "valid": true,
  "token": "<HMAC-signed session token>",
  "expires_in": 86400,
  "customer": {
    "id": "uuid",
    "email": "user@example.com",
    "first_name": "John",
    "plan": "business",
    "status": "active",
    "trial_ends_at": "2026-04-05T00:00:00.000Z"
  }
}
```

---

### API Key Management

#### `GET /api/account/api-keys`

List all API keys for account. Key values are NOT returned.

**Headers:** `x-api-key` or `Authorization: Bearer`

**Response (200):**
```json
{
  "keys": [
    { "id": "uuid", "label": "default", "is_active": 1, "created_at": "...", "revoked_at": null }
  ]
}
```

---

#### `POST /api/account/api-keys`

Create a new API key. Returns key value ONCE. Max 5 active per account.

**Request:**
```json
{ "label": "staging server" }
```

**Response (201):**
```json
{
  "success": true,
  "key": {
    "id": "uuid",
    "key_value": "new-uuid-key",
    "label": "staging server",
    "created_at": "..."
  },
  "warning": "Save this API key now. It will NOT be shown again."
}
```

---

#### `POST /api/account/api-keys/:id/revoke`

Revoke an API key. Cannot be undone.

**Response (200):**
```json
{ "success": true, "message": "API key revoked" }
```

---

### Billing (Stripe)

#### `POST /api/billing/create-checkout-session`

Creates Stripe Checkout session. **Currently returns 503 — Stripe in test mode.**

#### `POST /api/billing/create-portal-session`

Creates Stripe Billing Portal session. **Currently returns 503 — Stripe in test mode.**

#### `POST /api/stripe/webhook`

Handles Stripe subscription events. Called by Stripe, not by PBXClaw.

**Events handled:**
- `invoice.payment_succeeded` → sets status to `active`, advances `next_billing_at`
- `invoice.payment_failed` → sets status to `past_due`, sends payment failed email
- `customer.subscription.deleted` → sets status to `cancelled`

**Note:** Webhook signature verification required before going live.

---

## How Each Component Uses the API

### install.sh (Updated Flow)

```
Phase 3: Validate API key
  → POST /api/install/validate-key { api_key }
  → Gets back: bootstrap_token + account status + plan
  → If valid: cache bootstrap_token for machine registration
  → If unreachable: warn, continue (offline OK)
  → If invalid: warn, continue

Phase 7: Register machine (if token available)
  → POST /api/install/register-machine (Bearer: bootstrap_token)
  → Sends: hostname, os, arch, freeswitch_host, freeswitch_mode
  → Gets back: machine_id (stored in .env)
```

### Dashboard Backend (port 4444)

```
First request:
  → POST pbxclaw.com/api/dashboard/bootstrap { api_key }
  → Gets back: session token (24h TTL)
  → Caches token in memory

Subsequent requests (within 24h):
  → Uses cached token, no raw API key sent
  → Returns { valid, plan, status } to frontend

Token expired or cleared:
  → Re-bootstraps with API key
  → Falls back to GET /api/auth/verify-key if bootstrap fails
```

### Dashboard Frontend (AuthGate)

```
On load:
  → GET /api/auth/verify (hits local backend, which handles token)
  → If status=suspended → show billing overlay
  → If valid=false → show signup link
  → If valid=true → load dashboard
```

---

## Database Schema (D1)

```sql
customers (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  first_name TEXT, last_name TEXT, company TEXT, phone TEXT, country TEXT,
  plan TEXT DEFAULT 'solo',
  status TEXT DEFAULT 'trial',
  api_key TEXT UNIQUE NOT NULL,
  stripe_customer_id TEXT, stripe_subscription_id TEXT,
  trial_ends_at DATETIME, next_billing_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
)

api_key_events (
  id TEXT PRIMARY KEY,
  api_key TEXT NOT NULL,
  event_type TEXT,
  ip_address TEXT, country TEXT, user_agent TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
)

machines (
  id TEXT PRIMARY KEY,
  customer_id TEXT NOT NULL REFERENCES customers(id),
  machine_name TEXT, hostname TEXT, os TEXT, arch TEXT,
  freeswitch_host TEXT DEFAULT '127.0.0.1',
  freeswitch_mode TEXT DEFAULT 'fresh',
  last_seen_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
)

api_keys (
  id TEXT PRIMARY KEY,
  customer_id TEXT NOT NULL REFERENCES customers(id),
  key_value TEXT UNIQUE NOT NULL,
  label TEXT DEFAULT 'default',
  is_active INTEGER DEFAULT 1,
  last_used_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  revoked_at DATETIME
)

notify_list (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
)
```

---

## Customer Statuses

| Status | Meaning | Dashboard |
|--------|---------|-----------|
| `trial` | 7-day free trial active | Full access |
| `active` | Paying customer | Full access |
| `past_due` | Payment failed | Full access + billing warning |
| `suspended` | Multiple failed payments | Billing overlay, no access |
| `cancelled` | Subscription cancelled | Signup link, no access |

---

## Plans

| ID | Name | Price | Extensions |
|----|------|-------|------------|
| `solo` | Solo | $19.99/mo | 1-3 |
| `business` | Business | $79/mo | Up to 25 |
| `enterprise` | Enterprise | $249/mo | Up to 100 |
| `callcenter` | Call Center | $449/mo | Unlimited |

---

## Endpoint Status

| Endpoint | Status | Notes |
|----------|--------|-------|
| `POST /api/auth/signup` | **Live** | Creates account, returns API key |
| `POST /api/auth/signin` | **Alpha** | No password hashing yet |
| `GET /api/auth/verify-key` | **Live** | Accepts x-api-key + Bearer |
| `GET /api/customer/me` | **Live** | Full profile by key |
| `POST /api/install/validate-key` | **Live** | Returns bootstrap token |
| `POST /api/install/register-machine` | **Live** | Requires bootstrap token |
| `GET /api/install/manifest` | **Live** | Version, features, ports |
| `POST /api/dashboard/bootstrap` | **Live** | Session token (24h) |
| `GET /api/account/api-keys` | **Live** | List keys (no values) |
| `POST /api/account/api-keys` | **Live** | Create key (shown once) |
| `POST /api/account/api-keys/:id/revoke` | **Live** | Permanent revoke |
| `POST /api/billing/create-checkout-session` | **Stub (503)** | Waiting on Stripe activation |
| `POST /api/billing/create-portal-session` | **Stub (503)** | Waiting on Stripe activation |
| `POST /api/stripe/webhook` | **Alpha** | No signature verification yet |
| `POST /api/notify/subscribe` | **Live** | Waitlist |

### Still Planned (PSTN — weeks 2-4)

```
GET  /api/pstn/numbers          — List customer DIDs
POST /api/pstn/purchase-number  — Buy DID ($4.99/mo)
GET  /api/pstn/usage            — Call records + costs
```

---

## Environment Variables

### pbxclaw.com (Cloudflare Workers)
```
STRIPE_SECRET_KEY=sk_test_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
RESEND_API_KEY=re_...
```

### Local Install (.env)
```
PBXCLAW_API_KEY=<from signup>
ANTHROPIC_API_KEY=sk-ant-...
FREESWITCH_HOST=127.0.0.1
FREESWITCH_ESL_PORT=8021
FREESWITCH_ESL_PASSWORD=ClueCon
DASHBOARD_PORT=4444
```

---

## Security Rules

- API keys are UUIDs, generated at signup, shown once
- Never log full API keys — truncate to first 8 chars in logs
- All endpoints on pbxclaw.com run on Cloudflare Workers (edge, `runtime = 'edge'`)
- D1 is the only database — no external DB connections
- Bootstrap tokens are HMAC-signed (SHA-256) with 24h TTL
- Dashboard caches session token — raw API key sent only once per 24h
- Stripe webhook signature verification required before going live
- No secrets in install.sh — keys come from .env or interactive prompt
- Dashboard backend reads key from .env, never exposes it to frontend
- Max 5 API keys per account, revocation is permanent
- Machine registration requires bootstrap token (not raw API key)
