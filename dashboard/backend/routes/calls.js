import { Router } from 'express';
import { existsSync } from 'fs';
import { join } from 'path';
import eslClient from '../lib/esl.js';

const router = Router();

/**
 * GET /api/calls
 * Returns active channels via ESL.
 */
router.get('/', async (req, res) => {
  try {
    if (!eslClient.connected) await eslClient.connect();
    const result = await eslClient.sendCommand('show channels as json');

    try {
      const data = JSON.parse(result);
      return res.json({
        count: data.row_count || 0,
        channels: data.rows || []
      });
    } catch {
      return res.json({ count: 0, channels: [], raw: result });
    }
  } catch (err) {
    return res.status(503).json({
      error: 'FreeSWITCH not available',
      detail: err.message,
      hint: 'Is FreeSWITCH running? Check ESL connection settings in .env'
    });
  }
});

/**
 * GET /api/calls/history
 * Returns CDR from SQLite database if available.
 */
router.get('/history', async (req, res) => {
  const limit = parseInt(req.query.limit, 10) || 50;
  const offset = parseInt(req.query.offset, 10) || 0;

  // Try to find CDR database
  const cdrPaths = [
    process.env.FS_CDR_DB,
    '/var/lib/freeswitch/db/cdr.db',
    '/usr/local/freeswitch/db/cdr.db',
    '/var/lib/freeswitch/db/core.db'
  ].filter(Boolean);

  let dbPath = null;
  for (const p of cdrPaths) {
    if (existsSync(p)) {
      dbPath = p;
      break;
    }
  }

  if (!dbPath) {
    return res.json({
      calls: [],
      total: 0,
      message: 'No CDR database found. Set FS_CDR_DB in .env or check FreeSWITCH CDR configuration.'
    });
  }

  try {
    // Dynamic import to handle if better-sqlite3 native module isn't built
    const Database = (await import('better-sqlite3')).default;
    const db = new Database(dbPath, { readonly: true });

    // Try common CDR table names
    let tableName = null;
    for (const name of ['cdr', 'detailed_calls', 'calls']) {
      try {
        db.prepare(`SELECT 1 FROM ${name} LIMIT 1`).get();
        tableName = name;
        break;
      } catch {
        continue;
      }
    }

    if (!tableName) {
      db.close();
      return res.json({
        calls: [],
        total: 0,
        message: 'CDR database found but no recognized table'
      });
    }

    const countRow = db.prepare(`SELECT COUNT(*) as total FROM ${tableName}`).get();
    const rows = db.prepare(`SELECT * FROM ${tableName} ORDER BY rowid DESC LIMIT ? OFFSET ?`).all(limit, offset);
    db.close();

    return res.json({
      calls: rows,
      total: countRow.total,
      limit,
      offset
    });
  } catch (err) {
    console.error('[Calls] CDR read error:', err.message);
    return res.status(500).json({ error: 'Failed to read CDR database', detail: err.message });
  }
});

export default router;
