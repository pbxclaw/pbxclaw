import { Router } from 'express';
import axios from 'axios';

const router = Router();

/**
 * GET /api/auth/verify
 * Proxies to pbxclaw.com to verify the API key.
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

  try {
    const response = await axios.get('https://pbxclaw.com/api/auth/verify-key', {
      headers: {
        'x-api-key': apiKey,
        'Content-Type': 'application/json'
      },
      timeout: 10000
    });

    return res.json({
      valid: response.data.valid ?? true,
      plan: response.data.plan || 'unknown',
      status: response.data.status || 'active'
    });
  } catch (err) {
    if (err.response) {
      return res.json({
        valid: false,
        plan: null,
        status: 'invalid',
        message: err.response.data?.message || 'API key verification failed'
      });
    }
    return res.json({
      valid: false,
      plan: null,
      status: 'unreachable',
      message: 'Cannot reach pbxclaw.com — check internet connection'
    });
  }
});

export default router;
