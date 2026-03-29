import { Router } from 'express';
import { readGateways, writeGateway, deleteGateway } from '../lib/fs-config.js';
import eslClient from '../lib/esl.js';

const router = Router();

/**
 * GET /api/providers
 * List all configured SIP trunks/gateways.
 */
router.get('/', async (req, res) => {
  try {
    const gateways = await readGateways();
    return res.json({ providers: gateways });
  } catch (err) {
    console.error('[Providers] List error:', err.message);
    return res.status(500).json({ error: 'Failed to list providers', detail: err.message });
  }
});

/**
 * POST /api/providers
 * Add a new SIP trunk.
 * Body: { name, server, username, password }
 */
router.post('/', async (req, res) => {
  const { name, server, username, password } = req.body;

  if (!name || !server || !username || !password) {
    return res.status(400).json({ error: 'name, server, username, and password are required' });
  }

  try {
    const filepath = await writeGateway(name, server, username, password);

    // Restart external sofia profile to pick up new gateway
    try {
      if (!eslClient.connected) await eslClient.connect();
      await eslClient.sendCommand('sofia profile external restart reloadxml');
    } catch {
      // FreeSWITCH may not be running
    }

    console.log(`[AUDIT] SIP trunk "${name}" added via API`);
    return res.json({
      success: true,
      message: `SIP trunk "${name}" configured`,
      provider: { name, server, username, filepath }
    });
  } catch (err) {
    console.error('[Providers] Create error:', err.message);
    return res.status(500).json({ error: 'Failed to create provider', detail: err.message });
  }
});

/**
 * DELETE /api/providers/:name
 * Remove a SIP trunk.
 */
router.delete('/:name', async (req, res) => {
  const { name } = req.params;

  try {
    await deleteGateway(name);

    try {
      if (!eslClient.connected) await eslClient.connect();
      await eslClient.sendCommand('sofia profile external restart reloadxml');
    } catch {
      // FreeSWITCH may not be running
    }

    console.log(`[AUDIT] SIP trunk "${name}" removed via API`);
    return res.json({ success: true, message: `SIP trunk "${name}" removed` });
  } catch (err) {
    console.error('[Providers] Delete error:', err.message);
    return res.status(500).json({ error: 'Failed to delete provider', detail: err.message });
  }
});

/**
 * POST /api/providers/:name/test
 * Test a trunk's registration status.
 */
router.post('/:name/test', async (req, res) => {
  const { name } = req.params;

  try {
    if (!eslClient.connected) await eslClient.connect();
    const result = await eslClient.sendCommand(`sofia status gateway ${name}`);

    // Parse registration state
    const stateMatch = result.match(/State\s+(\S+)/i);
    const statusMatch = result.match(/Status\s+(\S+)/i);

    return res.json({
      success: true,
      gateway: name,
      state: stateMatch ? stateMatch[1] : 'unknown',
      status: statusMatch ? statusMatch[1] : 'unknown',
      raw: result
    });
  } catch (err) {
    return res.status(503).json({
      error: 'Cannot test trunk',
      detail: err.message,
      hint: 'FreeSWITCH may not be running or the gateway may not exist'
    });
  }
});

export default router;
