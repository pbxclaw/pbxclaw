import { Router } from 'express';
import eslClient from '../lib/esl.js';

const router = Router();

// Commands that are explicitly blocked for safety
const BLOCKED_COMMANDS = [
  'shutdown',         // Full shutdown (not restart)
  'fsctl shutdown',
  'load mod_',        // Loading arbitrary modules
  'unload mod_',
  'eval',
];

// Commands that are allowed without restriction
const SAFE_COMMANDS = [
  'sofia status',
  'sofia global siptrace',
  'show',
  'status',
  'version',
  'uptime',
  'reloadxml',
  'reload',
  'sofia profile',
  'originate',
  'uuid_',
  'hupall',
];

function isCommandSafe(cmd) {
  const lower = cmd.toLowerCase().trim();

  // Check blocked first
  for (const blocked of BLOCKED_COMMANDS) {
    if (lower.startsWith(blocked)) {
      return { safe: false, reason: `Command "${blocked}" is blocked for safety` };
    }
  }

  return { safe: true };
}

/**
 * GET /api/freeswitch/status
 * Return sofia status via ESL.
 */
router.get('/status', async (req, res) => {
  try {
    if (!eslClient.connected) await eslClient.connect();

    const [status, sofiaStatus, uptime] = await Promise.all([
      eslClient.sendCommand('status'),
      eslClient.sendCommand('sofia status'),
      eslClient.sendCommand('uptime')
    ]);

    return res.json({
      connected: true,
      status,
      sofia: sofiaStatus,
      uptime
    });
  } catch (err) {
    return res.status(503).json({
      connected: false,
      error: err.message,
      hint: 'FreeSWITCH is not reachable. Check that it is running and ESL is configured in .env'
    });
  }
});

/**
 * POST /api/freeswitch/command
 * Execute an ESL command with safety check.
 * Body: { command: string }
 */
router.post('/command', async (req, res) => {
  const { command } = req.body;

  if (!command || typeof command !== 'string') {
    return res.status(400).json({ error: 'command is required' });
  }

  const check = isCommandSafe(command);
  if (!check.safe) {
    return res.status(403).json({ error: check.reason });
  }

  try {
    if (!eslClient.connected) await eslClient.connect();
    const result = await eslClient.sendCommand(command);
    console.log(`[AUDIT] ESL command: ${command}`);
    return res.json({ success: true, result });
  } catch (err) {
    return res.status(503).json({
      error: 'Command failed',
      detail: err.message
    });
  }
});

/**
 * Setup WebSocket handler for live FreeSWITCH CLI streaming.
 */
export function setupFreeswitchWebSocket(wss) {
  wss.on('connection', async (ws) => {
    console.log('[WS] FreeSWITCH CLI client connected');

    let eslSubscribed = false;

    const onLog = (data) => {
      if (ws.readyState === ws.OPEN) {
        ws.send(JSON.stringify({ type: 'log', data }));
      }
    };

    const onEvent = (headers, body) => {
      if (ws.readyState === ws.OPEN) {
        ws.send(JSON.stringify({
          type: 'event',
          event: headers['Event-Name'] || 'unknown',
          data: { headers, body }
        }));
      }
    };

    const onDisconnect = () => {
      if (ws.readyState === ws.OPEN) {
        ws.send(JSON.stringify({ type: 'status', connected: false }));
      }
    };

    try {
      if (!eslClient.connected) await eslClient.connect();

      // Subscribe to logs and events
      if (!eslSubscribed) {
        try {
          await eslClient.subscribeLogs('info');
          await eslClient.subscribeEvents('CHANNEL_CREATE CHANNEL_ANSWER CHANNEL_HANGUP CODEC HEARTBEAT');
          eslSubscribed = true;
        } catch {
          // May already be subscribed
        }
      }

      eslClient.on('log', onLog);
      eslClient.on('event', onEvent);
      eslClient.on('disconnect', onDisconnect);

      ws.send(JSON.stringify({ type: 'status', connected: true }));
    } catch (err) {
      ws.send(JSON.stringify({
        type: 'status',
        connected: false,
        error: err.message
      }));
    }

    // Handle commands from the WebSocket client
    ws.on('message', async (msg) => {
      try {
        const parsed = JSON.parse(msg);

        if (parsed.type === 'command' && parsed.command) {
          const check = isCommandSafe(parsed.command);
          if (!check.safe) {
            ws.send(JSON.stringify({ type: 'error', message: check.reason }));
            return;
          }

          try {
            if (!eslClient.connected) await eslClient.connect();
            const result = await eslClient.sendCommand(parsed.command);
            ws.send(JSON.stringify({ type: 'response', command: parsed.command, result }));
          } catch (err) {
            ws.send(JSON.stringify({ type: 'error', message: err.message }));
          }
        }
      } catch {
        // Ignore malformed messages
      }
    });

    ws.on('close', () => {
      console.log('[WS] FreeSWITCH CLI client disconnected');
      eslClient.off('log', onLog);
      eslClient.off('event', onEvent);
      eslClient.off('disconnect', onDisconnect);
    });
  });
}

export default router;
