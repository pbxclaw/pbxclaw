import eslClient from './esl.js';
import {
  readExtensions,
  writeExtension,
  deleteExtension as removeExtension,
  readGateways,
  writeGateway
} from './fs-config.js';

/**
 * Tool definitions for AI (Claude tool_use format).
 */
export const toolDefinitions = [
  // READ tools
  {
    name: 'show_registrations',
    description: 'Show all SIP registrations on the PBX. Returns a list of registered phones/devices.',
    input_schema: {
      type: 'object',
      properties: {},
      required: []
    }
  },
  {
    name: 'show_channels',
    description: 'Show all active call channels. Returns current calls in progress.',
    input_schema: {
      type: 'object',
      properties: {},
      required: []
    }
  },
  {
    name: 'list_extensions',
    description: 'List all configured extensions on the PBX system.',
    input_schema: {
      type: 'object',
      properties: {},
      required: []
    }
  },
  {
    name: 'get_call_logs',
    description: 'Get recent call logs from FreeSWITCH.',
    input_schema: {
      type: 'object',
      properties: {},
      required: []
    }
  },

  // WRITE tools
  {
    name: 'add_extension',
    description: 'Add a new SIP extension to the PBX. Requires confirmation before executing.',
    input_schema: {
      type: 'object',
      properties: {
        number: { type: 'string', description: 'Extension number (e.g., "101")' },
        name: { type: 'string', description: 'Display name for the extension' },
        password: { type: 'string', description: 'SIP password for the extension' }
      },
      required: ['number', 'name', 'password']
    }
  },
  {
    name: 'delete_extension',
    description: 'Delete a SIP extension. DESTRUCTIVE — requires confirmation phrase. Cannot delete extension 900.',
    input_schema: {
      type: 'object',
      properties: {
        number: { type: 'string', description: 'Extension number to delete' }
      },
      required: ['number']
    }
  },
  {
    name: 'add_sip_trunk',
    description: 'Add a SIP trunk/gateway for outbound calling. Requires confirmation before executing.',
    input_schema: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Trunk name (e.g., "twilio")' },
        server: { type: 'string', description: 'SIP server hostname or IP' },
        username: { type: 'string', description: 'SIP authentication username' },
        password: { type: 'string', description: 'SIP authentication password' }
      },
      required: ['name', 'server', 'username', 'password']
    }
  },
  {
    name: 'reload_config',
    description: 'Reload FreeSWITCH XML configuration without restart.',
    input_schema: {
      type: 'object',
      properties: {},
      required: []
    }
  },

  // DESTRUCTIVE tools
  {
    name: 'restart_freeswitch',
    description: 'Restart the FreeSWITCH service. DESTRUCTIVE — will drop all active calls. Requires confirmation.',
    input_schema: {
      type: 'object',
      properties: {},
      required: []
    }
  }
];

/**
 * Tool handlers — execute the actual operations.
 */
export const toolHandlers = {
  // READ
  async show_registrations() {
    try {
      await ensureConnected();
      const result = await eslClient.sendCommand('sofia status profile internal reg');
      return { success: true, data: result };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  async show_channels() {
    try {
      await ensureConnected();
      const result = await eslClient.sendCommand('show channels as json');
      try {
        return { success: true, data: JSON.parse(result) };
      } catch {
        return { success: true, data: result };
      }
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  async list_extensions() {
    try {
      const extensions = await readExtensions();
      return { success: true, data: extensions };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  async get_call_logs() {
    try {
      await ensureConnected();
      const result = await eslClient.sendCommand('show calls as json');
      try {
        return { success: true, data: JSON.parse(result) };
      } catch {
        return { success: true, data: result };
      }
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  // WRITE
  async add_extension({ number, name, password }) {
    try {
      const filepath = await writeExtension(number, name, password);
      // Reload XML config
      try {
        await ensureConnected();
        await eslClient.sendCommand('reloadxml');
      } catch {
        // FS might not be running, config was still written
      }
      console.log(`[AUDIT] Extension ${number} (${name}) added — ${filepath}`);
      return { success: true, message: `Extension ${number} (${name}) created`, filepath };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  async delete_extension({ number }) {
    try {
      if (number === '900') {
        return { success: false, error: 'Cannot delete extension 900 (Molty)' };
      }
      const filepath = await removeExtension(number);
      try {
        await ensureConnected();
        await eslClient.sendCommand('reloadxml');
      } catch {
        // FS might not be running
      }
      console.log(`[AUDIT] Extension ${number} deleted — ${filepath}`);
      return { success: true, message: `Extension ${number} deleted` };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  async add_sip_trunk({ name, server, username, password }) {
    try {
      const filepath = await writeGateway(name, server, username, password);
      try {
        await ensureConnected();
        await eslClient.sendCommand('sofia profile external restart reloadxml');
      } catch {
        // FS might not be running
      }
      console.log(`[AUDIT] SIP trunk "${name}" added — ${filepath}`);
      return { success: true, message: `SIP trunk "${name}" configured`, filepath };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  async reload_config() {
    try {
      await ensureConnected();
      const result = await eslClient.sendCommand('reloadxml');
      console.log('[AUDIT] Configuration reloaded');
      return { success: true, data: result };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  // DESTRUCTIVE
  async restart_freeswitch() {
    try {
      await ensureConnected();
      // Check for active calls first
      const channels = await eslClient.sendCommand('show channels count');
      console.log(`[AUDIT] FreeSWITCH restart requested. Active channels: ${channels}`);
      const result = await eslClient.sendCommand('shutdown restart');
      return { success: true, data: result };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }
};

async function ensureConnected() {
  if (!eslClient.connected || !eslClient.authenticated) {
    await eslClient.connect();
  }
}

/**
 * Execute a tool by name with given input.
 */
export async function executeTool(name, input = {}) {
  const handler = toolHandlers[name];
  if (!handler) {
    return { success: false, error: `Unknown tool: ${name}` };
  }
  return handler(input);
}
