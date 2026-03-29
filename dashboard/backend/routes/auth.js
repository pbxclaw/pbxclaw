import { Router } from 'express';
import axios from 'axios';

const router = Router();

// In-memory cache for bootstrap token (avoids re-sending API key every request)
let cachedToken = null;
let tokenExpiresAt = 0;
let cachedCustomer = null;

/**
 * GET /api/auth/verify
 *
 * On first call: sends API key to pbxclaw.com/api/dashboard/bootstrap
 * Gets back a short-lived session token (24h).
 * Subsequent calls use the cached token until it expires.
 * Falls back to direct verify-key if bootstrap fails.
 */
router.get('/verify', async (req, res) => {
  const apiKey = process.env.PBXCLAW_API_KEY;

  if (!apiKey) {
    return res.json({
      valid: false,
      plan: null,
      status: 'no_key',
      message: 'PBXCLAW_API_KEY not configured in .env'
    });
  }

  // Use cached token if still valid
  if (cachedToken && Date.now() < tokenExpiresAt && cachedCustomer) {
    return res.json({
      valid: true,
      plan: cachedCustomer.plan || 'unknown',
      status: cachedCustomer.status || 'active'
    });
  }

  try {
    // Try bootstrap endpoint first (sends key once, gets session token)
    const response = await axios.post('https://pbxclaw.com/api/dashboard/bootstrap', {
      api_key: apiKey,
    }, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 10000
    });

    if (response.data.valid && response.data.token) {
      // Cache the token — don't send raw API key again for 24h
      cachedToken = response.data.token;
      tokenExpiresAt = Date.now() + ((response.data.expires_in || 86400) * 1000) - 60000; // 1 min early
      cachedCustomer = response.data.customer;

      return res.json({
        valid: true,
        plan: response.data.customer?.plan || 'unknown',
        status: response.data.customer?.status || 'active'
      });
    }

    // Bootstrap returned invalid
    return res.json({
      valid: false,
      plan: response.data.customer?.plan || null,
      status: response.data.status || 'invalid',
      message: response.data.error || 'API key verification failed'
    });
  } catch (err) {
    // Bootstrap endpoint might not exist yet — fall back to verify-key
    try {
      const fallback = await axios.get('https://pbxclaw.com/api/auth/verify-key', {
        headers: {
          'x-api-key': apiKey,
          'Content-Type': 'application/json'
        },
        timeout: 10000
      });

      return res.json({
        valid: fallback.data.valid ?? true,
        plan: fallback.data.customer?.plan || 'unknown',
        status: fallback.data.status || 'active'
      });
    } catch (fallbackErr) {
      if (fallbackErr.response) {
        return res.json({
          valid: false,
          plan: null,
          status: 'invalid',
          message: fallbackErr.response.data?.error || 'API key verification failed'
        });
      }
      return res.json({
        valid: false,
        plan: null,
        status: 'unreachable',
        message: 'Cannot reach pbxclaw.com — check internet connection'
      });
    }
  }
});

// Clear cached token (useful for key rotation)
router.post('/clear-token', (req, res) => {
  cachedToken = null;
  tokenExpiresAt = 0;
  cachedCustomer = null;
  res.json({ success: true, message: 'Session token cleared' });
});

export default router;
