import { Router } from 'express';
import { readdir, stat, unlink } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

const router = Router();

function getVoicemailDir() {
  return process.env.FS_VOICEMAIL_DIR || '/var/lib/freeswitch/storage/voicemail/default';
}

/**
 * GET /api/voicemail
 * List voicemail messages, optionally filtered by extension.
 * Query: ?ext=101
 */
router.get('/', async (req, res) => {
  const vmDir = getVoicemailDir();
  const filterExt = req.query.ext;

  if (!existsSync(vmDir)) {
    return res.json({
      messages: [],
      message: 'Voicemail directory not found. Set FS_VOICEMAIL_DIR in .env'
    });
  }

  try {
    const results = [];
    // Voicemail structure: vmDir/<domain>/<ext>/inbox/*.wav
    // Or simpler: vmDir/<ext>/inbox/*.wav
    const entries = await readdir(vmDir);

    for (const entry of entries) {
      const extDir = join(vmDir, entry);
      const extStat = await stat(extDir).catch(() => null);
      if (!extStat?.isDirectory()) continue;

      // If filtering by extension, skip non-matching
      if (filterExt && entry !== filterExt) continue;

      // Check for inbox folder
      for (const folder of ['inbox', 'new', 'saved']) {
        const folderPath = join(extDir, folder);
        if (!existsSync(folderPath)) continue;

        const files = await readdir(folderPath);
        for (const file of files) {
          if (!file.endsWith('.wav') && !file.endsWith('.mp3')) continue;
          const fileStat = await stat(join(folderPath, file)).catch(() => null);
          results.push({
            extension: entry,
            folder,
            filename: file,
            size: fileStat?.size || 0,
            created: fileStat?.birthtime || fileStat?.mtime || null,
            path: `${entry}/${folder}/${file}`
          });
        }
      }
    }

    results.sort((a, b) => new Date(b.created) - new Date(a.created));
    return res.json({ messages: results });
  } catch (err) {
    console.error('[Voicemail] List error:', err.message);
    return res.status(500).json({ error: 'Failed to list voicemail', detail: err.message });
  }
});

/**
 * GET /api/voicemail/:ext/:file
 * Serve a voicemail audio file.
 * The :file param can include subfolder like "inbox/msg_12345.wav"
 */
router.get('/:ext/*', (req, res) => {
  const vmDir = getVoicemailDir();
  const ext = req.params.ext;
  const filePath = req.params[0]; // Everything after :ext/

  const fullPath = join(vmDir, ext, filePath);

  // Security: prevent directory traversal
  if (!fullPath.startsWith(vmDir)) {
    return res.status(403).json({ error: 'Access denied' });
  }

  if (!existsSync(fullPath)) {
    return res.status(404).json({ error: 'Voicemail file not found' });
  }

  res.sendFile(fullPath);
});

/**
 * DELETE /api/voicemail/:ext/:file
 * Delete a voicemail message.
 */
router.delete('/:ext/*', async (req, res) => {
  const vmDir = getVoicemailDir();
  const ext = req.params.ext;
  const filePath = req.params[0];

  const fullPath = join(vmDir, ext, filePath);

  // Security: prevent directory traversal
  if (!fullPath.startsWith(vmDir)) {
    return res.status(403).json({ error: 'Access denied' });
  }

  if (!existsSync(fullPath)) {
    return res.status(404).json({ error: 'Voicemail file not found' });
  }

  try {
    await unlink(fullPath);
    console.log(`[AUDIT] Voicemail deleted: ${fullPath}`);
    return res.json({ success: true, message: `Voicemail ${filePath} deleted for extension ${ext}` });
  } catch (err) {
    console.error('[Voicemail] Delete error:', err.message);
    return res.status(500).json({ error: 'Failed to delete voicemail', detail: err.message });
  }
});

export default router;
