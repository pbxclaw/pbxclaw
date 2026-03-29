import net from 'net';
import { EventEmitter } from 'events';

class ESLClient extends EventEmitter {
  constructor() {
    super();
    this.host = process.env.FS_ESL_HOST || '127.0.0.1';
    this.port = parseInt(process.env.FS_ESL_PORT, 10) || 8021;
    this.password = process.env.FS_ESL_PASSWORD || 'ClueCon';
    this.socket = null;
    this.connected = false;
    this.authenticated = false;
    this.buffer = '';
    this.commandQueue = [];
    this.reconnectTimer = null;
    this.reconnectDelay = 3000;
  }

  connect() {
    return new Promise((resolve, reject) => {
      if (this.connected && this.authenticated) {
        return resolve();
      }

      this.socket = net.createConnection(this.port, this.host);
      this.socket.setEncoding('utf8');

      let resolved = false;

      this.socket.on('connect', () => {
        this.connected = true;
        this.buffer = '';
        console.log('[ESL] Connected to FreeSWITCH');
      });

      this.socket.on('data', (data) => {
        this.buffer += data;
        this._processBuffer();

        // Once authenticated, resolve
        if (this.authenticated && !resolved) {
          resolved = true;
          resolve();
        }
      });

      this.socket.on('close', () => {
        this.connected = false;
        this.authenticated = false;
        this.emit('disconnect');
        console.log('[ESL] Disconnected from FreeSWITCH');
        this._scheduleReconnect();
      });

      this.socket.on('error', (err) => {
        console.error('[ESL] Socket error:', err.message);
        if (!resolved) {
          resolved = true;
          reject(new Error(`ESL connection failed: ${err.message}`));
        }
      });

      // Timeout for initial connection
      setTimeout(() => {
        if (!resolved) {
          resolved = true;
          reject(new Error('ESL connection timeout'));
        }
      }, 5000);
    });
  }

  _processBuffer() {
    // ESL protocol: headers separated by \n, blank line separates headers from body
    while (this.buffer.includes('\n\n')) {
      const idx = this.buffer.indexOf('\n\n');
      const headerBlock = this.buffer.substring(0, idx);
      const headers = this._parseHeaders(headerBlock);

      const contentLength = parseInt(headers['Content-Length'], 10) || 0;
      const bodyStart = idx + 2;

      if (this.buffer.length < bodyStart + contentLength) {
        return; // Wait for more data
      }

      const body = this.buffer.substring(bodyStart, bodyStart + contentLength);
      this.buffer = this.buffer.substring(bodyStart + contentLength);

      this._handleMessage(headers, body);
    }
  }

  _parseHeaders(block) {
    const headers = {};
    for (const line of block.split('\n')) {
      const colonIdx = line.indexOf(':');
      if (colonIdx > 0) {
        const key = line.substring(0, colonIdx).trim();
        const value = line.substring(colonIdx + 1).trim();
        headers[key] = value;
      }
    }
    return headers;
  }

  _handleMessage(headers, body) {
    const contentType = headers['Content-Type'] || '';

    // Auth request
    if (contentType === 'auth/request') {
      this.socket.write(`auth ${this.password}\n\n`);
      return;
    }

    // Auth reply
    if (contentType === 'command/reply') {
      const reply = headers['Reply-Text'] || body;
      if (reply.includes('+OK')) {
        if (!this.authenticated) {
          this.authenticated = true;
          this.emit('authenticated');
          console.log('[ESL] Authenticated');
        }
        // Resolve pending command
        if (this.commandQueue.length > 0) {
          const pending = this.commandQueue.shift();
          pending.resolve(reply);
        }
      } else if (reply.includes('-ERR')) {
        if (this.commandQueue.length > 0) {
          const pending = this.commandQueue.shift();
          pending.reject(new Error(reply));
        }
      }
      return;
    }

    // API response
    if (contentType === 'api/response') {
      if (this.commandQueue.length > 0) {
        const pending = this.commandQueue.shift();
        pending.resolve(body);
      }
      return;
    }

    // Events
    if (contentType.startsWith('text/event')) {
      this.emit('event', headers, body);
      const eventName = headers['Event-Name'];
      if (eventName) {
        this.emit(`event::${eventName}`, headers, body);
      }
      return;
    }

    // Log data
    if (contentType === 'log/data') {
      this.emit('log', body);
      return;
    }

    // text/disconnect
    if (contentType === 'text/disconnect-notice') {
      this.emit('disconnect-notice');
    }
  }

  sendCommand(cmd) {
    return new Promise((resolve, reject) => {
      if (!this.connected || !this.authenticated) {
        return reject(new Error('ESL not connected'));
      }
      this.commandQueue.push({ resolve, reject });
      this.socket.write(`api ${cmd}\n\n`);
    });
  }

  sendBgCommand(cmd) {
    return new Promise((resolve, reject) => {
      if (!this.connected || !this.authenticated) {
        return reject(new Error('ESL not connected'));
      }
      this.commandQueue.push({ resolve, reject });
      this.socket.write(`bgapi ${cmd}\n\n`);
    });
  }

  subscribeEvents(events = 'all') {
    return new Promise((resolve, reject) => {
      if (!this.connected || !this.authenticated) {
        return reject(new Error('ESL not connected'));
      }
      this.commandQueue.push({ resolve, reject });
      this.socket.write(`event plain ${events}\n\n`);
    });
  }

  subscribeLogs(level = 'debug') {
    return new Promise((resolve, reject) => {
      if (!this.connected || !this.authenticated) {
        return reject(new Error('ESL not connected'));
      }
      this.commandQueue.push({ resolve, reject });
      this.socket.write(`log ${level}\n\n`);
    });
  }

  close() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.socket) {
      this.socket.destroy();
      this.socket = null;
    }
    this.connected = false;
    this.authenticated = false;
  }

  _scheduleReconnect() {
    if (this.reconnectTimer) return;
    this.reconnectTimer = setTimeout(async () => {
      this.reconnectTimer = null;
      console.log('[ESL] Attempting reconnect...');
      try {
        await this.connect();
      } catch {
        // Will retry on next disconnect cycle
      }
    }, this.reconnectDelay);
  }
}

// Singleton
const eslClient = new ESLClient();
export default eslClient;
