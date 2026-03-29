import { Router } from 'express';
import { readExtensions, writeExtension, deleteExtension } from '../lib/fs-config.js';
import eslClient from '../lib/esl.js';
import crypto from 'crypto';

const router = Router();

// In-memory confirmation tokens (expire after 60s)
const confirmTokens = new Map();

/**
 * GET /api/extensions
 * List all configured extensions.
 */
router.get('/', async (req, res) => {
  try {
    const extensions = await readExtensions();
    return res.json({ extensions });
  } catch (err) {
    console.error('[Extensions] List error:', err.message);
    return res.status(500).json({ error: 'Failed to list extensions', detail: err.message });
  }
});

/**
 * POST /api/extensions
 * Add a new extension.
 * Body: { number, name, password }
 */
router.post('/', async (req, res) => {
  const { number, name, password } = req.body;

  if (!number || !name || !password) {
    return res.status(400).json({ error: 'number, name, and password are required' });
  }

  // Validate extension number format
  if (!/^\d{3,5}$/.test(number)) {
    return res.status(400).json({ error: 'Extension number must be 3-5 digits' });
  }

  try {
    const filepath = await writeExtension(number, name, password);

    // Try to reload FreeSWITCH config
    try {
      if (!eslClient.connected) await eslClient.connect();
      await eslClient.sendCommand('reloadxml');
    } catch {
      // FreeSWITCH may not be running
    }

    console.log(`[AUDIT] Extension ${number} (${name}) created via API`);
    return res.json({
      success: true,
      message: `Extension ${number} (${name}) created`,
      extension: { number, name, filepath }
    });
  } catch (err) {
    console.error('[Extensions] Create error:', err.message);
    return res.status(500).json({ error: 'Failed to create extension', detail: err.message });
  }
});

/**
 * DELETE /api/extensions/:ext
 * Delete an extension. Requires a confirmation token.
 * Query: ?token=<confirmation_token>
 * If no token provided, returns a token to confirm.
 */
router.delete('/:ext', async (req, res) => {
  const ext = req.params.ext;
  const token = req.query.token;

  // Safety: never delete 900
  if (ext === '900') {
    return res.status(403).json({ error: 'Cannot delete extension 900 (Molty AI agent)' });
  }

  if (!token) {
    // Generate confirmation token
    const confirmToken = crypto.randomBytes(16).toString('hex');
    confirmTokens.set(confirmToken, { ext, expires: Date.now() + 60000 });

    // Clean up expired tokens
    for (const [k, v] of confirmTokens) {
      if (v.expires < Date.now()) confirmTokens.delete(k);
    }

    return res.json({
      confirm: true,
      message: `Are you sure you want to delete extension ${ext}? Send DELETE again with ?token=${confirmToken}`,
      token: confirmToken
    });
  }

  // Verify token
  const pending = confirmTokens.get(token);
  if (!pending || pending.ext !== ext || pending.expires < Date.now()) {
    return res.status(400).json({ error: 'Invalid or expired confirmation token' });
  }
  confirmTokens.delete(token);

  try {
    await deleteExtension(ext);

    try {
      if (!eslClient.connected) await eslClient.connect();
      await eslClient.sendCommand('reloadxml');
    } catch {
      // FreeSWITCH may not be running
    }

    console.log(`[AUDIT] Extension ${ext} deleted via API`);
    return res.json({ success: true, message: `Extension ${ext} deleted` });
  } catch (err) {
    console.error('[Extensions] Delete error:', err.message);
    return res.status(500).json({ error: 'Failed to delete extension', detail: err.message });
  }
});

export default router;
