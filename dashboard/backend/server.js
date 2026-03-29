import { createServer } from 'http';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import express from 'express';
import cors from 'cors';
import { WebSocketServer } from 'ws';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .env from project root (../../.env)
dotenv.config({ path: join(__dirname, '..', '..', '.env') });

import authRoutes from './routes/auth.js';
import chatRoutes from './routes/chat.js';
import extensionsRoutes from './routes/extensions.js';
import callsRoutes from './routes/calls.js';
import voicemailRoutes from './routes/voicemail.js';
import providersRoutes from './routes/providers.js';
import freeswitchRoutes from './routes/freeswitch.js';
import { setupFreeswitchWebSocket } from './routes/freeswitch.js';

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Serve static frontend
app.use(express.static(join(__dirname, '..', 'frontend', 'dist')));

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/extensions', extensionsRoutes);
app.use('/api/calls', callsRoutes);
app.use('/api/voicemail', voicemailRoutes);
app.use('/api/providers', providersRoutes);
app.use('/api/freeswitch', freeswitchRoutes);

// SPA fallback — serve index.html for non-API routes
app.get('*', (req, res) => {
  if (!req.path.startsWith('/api') && !req.path.startsWith('/ws')) {
    res.sendFile(join(__dirname, '..', 'frontend', 'dist', 'index.html'));
  } else {
    res.status(404).json({ error: 'Not found' });
  }
});

// Error handler
app.use((err, req, res, _next) => {
  console.error('[ERROR]', err.message);
  res.status(500).json({ error: 'Internal server error' });
});

const server = createServer(app);

// WebSocket server for FreeSWITCH CLI
const wss = new WebSocketServer({ server, path: '/ws/freeswitch-cli' });
setupFreeswitchWebSocket(wss);

// Auto-detect available port starting from DASHBOARD_PORT (default 4444)
const basePort = parseInt(process.env.DASHBOARD_PORT, 10) || 4444;
const maxPort = 4450;

async function tryListen(port) {
  return new Promise((resolve, reject) => {
    server.once('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        resolve(false);
      } else {
        reject(err);
      }
    });
    server.listen(port, () => resolve(true));
  });
}

async function start() {
  for (let port = basePort; port <= maxPort; port++) {
    const ok = await tryListen(port);
    if (ok) {
      console.log(`[PBXClaw Dashboard] Running on http://localhost:${port}`);
      return;
    }
    console.log(`[PBXClaw Dashboard] Port ${port} busy, trying next...`);
  }
  console.error(`[PBXClaw Dashboard] No available port in range ${basePort}-${maxPort}`);
  process.exit(1);
}

start();
