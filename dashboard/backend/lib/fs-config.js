import { readdir, readFile, writeFile, unlink, mkdir } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

/**
 * FreeSWITCH configuration file management.
 * Reads/writes extension and gateway XML files.
 */

export function getConfDir() {
  return process.env.FS_CONF_DIR || '/etc/freeswitch';
}

export function getDirectoryDir() {
  return join(getConfDir(), 'directory', 'default');
}

export function getGatewayDir() {
  return join(getConfDir(), 'sip_profiles', 'external');
}

/**
 * Parse all extension XML files from the directory.
 */
export async function readExtensions() {
  const dir = getDirectoryDir();
  const extensions = [];

  try {
    const files = await readdir(dir);
    for (const file of files) {
      if (!file.endsWith('.xml')) continue;
      try {
        const content = await readFile(join(dir, file), 'utf8');
        const ext = parseExtensionXml(content, file);
        if (ext) extensions.push(ext);
      } catch (err) {
        console.error(`[fs-config] Error reading ${file}:`, err.message);
      }
    }
  } catch (err) {
    console.error('[fs-config] Cannot read directory dir:', err.message);
  }

  return extensions.sort((a, b) => parseInt(a.number) - parseInt(b.number));
}

function parseExtensionXml(xml, filename) {
  // Extract id from <user id="...">
  const idMatch = xml.match(/<user\s+id="([^"]+)"/);
  // Extract effective_caller_id_name
  const nameMatch = xml.match(/effective_caller_id_name['"]\s+value=['"]([^'"]+)/);
  // Extract password
  const passMatch = xml.match(/password['"]\s+value=['"]([^'"]+)/);

  if (!idMatch) return null;

  return {
    number: idMatch[1],
    name: nameMatch ? nameMatch[1] : idMatch[1],
    password: passMatch ? passMatch[1] : '***',
    filename
  };
}

/**
 * Write an extension XML file.
 */
export async function writeExtension(number, name, password) {
  const dir = getDirectoryDir();
  await ensureDir(dir);

  const xml = `<include>
  <user id="${escapeXml(number)}">
    <params>
      <param name="password" value="${escapeXml(password)}"/>
    </params>
    <variables>
      <variable name="toll_allow" value="domestic,international,local"/>
      <variable name="accountcode" value="${escapeXml(number)}"/>
      <variable name="user_context" value="default"/>
      <variable name="effective_caller_id_name" value="${escapeXml(name)}"/>
      <variable name="effective_caller_id_number" value="${escapeXml(number)}"/>
      <variable name="outbound_caller_id_name" value="${escapeXml(name)}"/>
      <variable name="outbound_caller_id_number" value="${escapeXml(number)}"/>
    </variables>
  </user>
</include>
`;

  const filepath = join(dir, `${number}.xml`);
  await writeFile(filepath, xml, 'utf8');
  return filepath;
}

/**
 * Delete an extension XML file.
 */
export async function deleteExtension(number) {
  // Safety: never delete extension 900
  if (number === '900') {
    throw new Error('Cannot delete extension 900 (Molty AI agent)');
  }

  const dir = getDirectoryDir();
  const filepath = join(dir, `${number}.xml`);

  if (!existsSync(filepath)) {
    throw new Error(`Extension ${number} not found`);
  }

  await unlink(filepath);
  return filepath;
}

/**
 * Parse all gateway XML files.
 */
export async function readGateways() {
  const dir = getGatewayDir();
  const gateways = [];

  try {
    const files = await readdir(dir);
    for (const file of files) {
      if (!file.endsWith('.xml')) continue;
      try {
        const content = await readFile(join(dir, file), 'utf8');
        const gw = parseGatewayXml(content, file);
        if (gw) gateways.push(gw);
      } catch (err) {
        console.error(`[fs-config] Error reading gateway ${file}:`, err.message);
      }
    }
  } catch (err) {
    console.error('[fs-config] Cannot read gateway dir:', err.message);
  }

  return gateways;
}

function parseGatewayXml(xml, filename) {
  const nameMatch = xml.match(/<gateway\s+name="([^"]+)"/);
  const realmMatch = xml.match(/name="realm"\s+value="([^"]+)"/);
  const proxyMatch = xml.match(/name="proxy"\s+value="([^"]+)"/);
  const usernameMatch = xml.match(/name="username"\s+value="([^"]+)"/);
  const registerMatch = xml.match(/name="register"\s+value="([^"]+)"/);

  if (!nameMatch) return null;

  return {
    name: nameMatch[1],
    server: proxyMatch ? proxyMatch[1] : (realmMatch ? realmMatch[1] : 'unknown'),
    username: usernameMatch ? usernameMatch[1] : '',
    register: registerMatch ? registerMatch[1] === 'true' : true,
    filename
  };
}

/**
 * Write a gateway XML file.
 */
export async function writeGateway(name, server, username, password) {
  const dir = getGatewayDir();
  await ensureDir(dir);

  const safeName = name.replace(/[^a-zA-Z0-9_-]/g, '_');

  const xml = `<include>
  <gateway name="${escapeXml(safeName)}">
    <param name="username" value="${escapeXml(username)}"/>
    <param name="password" value="${escapeXml(password)}"/>
    <param name="realm" value="${escapeXml(server)}"/>
    <param name="proxy" value="${escapeXml(server)}"/>
    <param name="register" value="true"/>
    <param name="retry-seconds" value="30"/>
    <param name="expire-seconds" value="300"/>
    <param name="codec-prefs" value="PCMU,PCMA"/>
  </gateway>
</include>
`;

  const filepath = join(dir, `${safeName}.xml`);
  await writeFile(filepath, xml, 'utf8');
  return filepath;
}

/**
 * Delete a gateway XML file.
 */
export async function deleteGateway(name) {
  const dir = getGatewayDir();
  const safeName = name.replace(/[^a-zA-Z0-9_-]/g, '_');
  const filepath = join(dir, `${safeName}.xml`);

  if (!existsSync(filepath)) {
    throw new Error(`Gateway ${name} not found`);
  }

  await unlink(filepath);
  return filepath;
}

function escapeXml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

async function ensureDir(dir) {
  if (!existsSync(dir)) {
    await mkdir(dir, { recursive: true });
  }
}
