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

## How Each Component Uses the API

### install.sh

```
Phase 3: Validate API key
  → GET /api/auth/verify-key (header: x-api-key)
  → If 200 + valid=true: continue
  → If 000 (unreachable): warn, continue (offline OK)
  → If 401: warn, continue (key may work later)
```

### Dashboard Backend (port 4444)

```
GET /api/auth/verify (local endpoint)
  → Reads PBXCLAW_API_KEY from .env
  → Proxies to GET pbxclaw.com/api/auth/verify-key (header: x-api-key)
  → Returns { valid, plan, status } to frontend
```

### Dashboard Frontend (AuthGate)

```
On load:
  → GET /api/auth/verify (hits local backend)
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
  first_name TEXT,
  last_name TEXT,
  company TEXT,
  phone TEXT,
  country TEXT,
  plan TEXT DEFAULT 'solo',
  status TEXT DEFAULT 'trial',
  api_key TEXT UNIQUE NOT NULL,
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  trial_ends_at DATETIME,
  next_billing_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
)

api_key_events (
  id TEXT PRIMARY KEY,
  api_key TEXT NOT NULL,
  event_type TEXT,
  ip_address TEXT,
  country TEXT,
  user_agent TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
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

## Future Endpoints (Not Yet Built)

These are planned for weeks 2-4:

```
POST /api/billing/create-checkout-session  — Start Stripe Checkout
POST /api/billing/create-portal-session    — Stripe billing portal
POST /api/install/register-machine         — Register install instance
GET  /api/install/manifest                 — Config manifest for installer
GET  /api/pstn/numbers                     — List customer DIDs
POST /api/pstn/purchase-number             — Buy DID ($4.99/mo)
GET  /api/pstn/usage                       — Call records + costs
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
- All endpoints on pbxclaw.com run on Cloudflare Workers (edge)
- D1 is the only database — no external DB connections
- Stripe webhook signature verification required before going live
- No secrets in install.sh — keys come from .env or interactive prompt
- Dashboard backend reads key from .env, never exposes it to frontend
