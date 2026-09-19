const { app, BrowserWindow, ipcMain, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

let mainWindow;

// Vault file location: same folder as app (as requested)
function getVaultPath() {
  if (app.isPackaged) {
    return path.join(path.dirname(app.getPath('exe')), 'vault.txt');
  } else {
    return path.join(__dirname, 'vault.txt');
  }
}

function ensureVaultFile() {
  const vaultPath = getVaultPath();
  try {
    const dir = path.dirname(vaultPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    if (!fs.existsSync(vaultPath)) {
      fs.writeFileSync(vaultPath, '# PassBox Vault - Encrypted Passwords\n# Format: SERVICE | EMAIL | ENCRYPTED_PASSWORD\n# WARNING: Do not edit encrypted values manually\n\n', 'utf8');
    }
  } catch (e) {
    console.error('Failed to ensure vault file:', e);
  }
  return vaultPath;
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1100,
    height: 720,
    minWidth: 980,
    minHeight: 640,
    frame: false,
    transparent: false,
    backgroundColor: '#0A0A0A',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    },
    icon: fs.existsSync(path.join(__dirname, 'icon.ico')) ? path.join(__dirname, 'icon.ico') : undefined,
    show: false
  });

  mainWindow.loadFile('index.html');
  mainWindow.once('ready-to-show', () => mainWindow.show());

  // Open external links in browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });
}

app.whenReady().then(() => {
  ensureVaultFile();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// Window controls
ipcMain.on('window-minimize', () => mainWindow?.minimize());
ipcMain.on('window-maximize', () => {
  if (mainWindow?.isMaximized()) mainWindow.unmaximize();
  else mainWindow?.maximize();
});
ipcMain.on('window-close', () => mainWindow?.close());

ipcMain.handle('is-maximized', () => mainWindow?.isMaximized());

// --- Crypto helpers ---

function deriveKey(masterKey) {
  // SHA256 -> 32 bytes for AES-256
  return crypto.createHash('sha256').update(masterKey).digest();
}

function encryptText(plainText, masterKey) {
  const key = deriveKey(masterKey);
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
  let encrypted = cipher.update(plainText, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return iv.toString('hex') + ':' + encrypted;
}

function decryptText(encryptedText, masterKey) {
  const key = deriveKey(masterKey);
  const parts = encryptedText.split(':');
  if (parts.length !== 2) throw new Error('Invalid encrypted format. Expected iv:ciphertext');
  const iv = Buffer.from(parts[0], 'hex');
  if (iv.length !== 16) throw new Error('Invalid IV length');
  const encrypted = parts[1];
  const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

function generateRandomPassword(length = 16, useSymbols = true, useNumbers = true, useUpper = true) {
  const lower = 'abcdefghijklmnopqrstuvwxyz';
  const upper = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const numbers = '0123456789';
  const symbols = '!@#$%^&*_-+=?';
  let charset = lower;
  if (useUpper) charset += upper;
  if (useNumbers) charset += numbers;
  if (useSymbols) charset += symbols;
  if (!charset) charset = lower + upper + numbers;

  let pwd = '';
  // Ensure at least one of each selected type
  const required = [];
  if (useUpper) required.push(upper[crypto.randomInt(0, upper.length)]);
  if (useNumbers) required.push(numbers[crypto.randomInt(0, numbers.length)]);
  if (useSymbols) required.push(symbols[crypto.randomInt(0, symbols.length)]);
  required.push(lower[crypto.randomInt(0, lower.length)]);

  for (let i = 0; i < length; i++) {
    pwd += charset[crypto.randomInt(0, charset.length)];
  }
  // Inject required chars at random positions to guarantee complexity
  let arr = pwd.split('');
  for (let i = 0; i < required.length && i < arr.length; i++) {
    const pos = crypto.randomInt(0, arr.length);
    arr[pos] = required[i];
  }
  // Shuffle a bit
  for (let i = arr.length - 1; i > 0; i--) {
    const j = crypto.randomInt(0, i + 1);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr.join('').slice(0, length);
}

// --- IPC: Generate + Encrypt + Save ---
ipcMain.handle('generate-and-save', async (event, { service, email, masterKey, length, useSymbols, useNumbers, useUpper }) => {
  if (!service || !email) throw new Error('Service and Email are required');
  if (!masterKey) throw new Error('Master key is required');
  if (service.includes('|') || email.includes('|')) throw new Error('Service/Email cannot contain "|"');

  const plain = generateRandomPassword(length || 16, useSymbols !== false, useNumbers !== false, useUpper !== false);
  const encrypted = encryptText(plain, masterKey);

  const vaultPath = ensureVaultFile();
  const line = `${service.trim()} | ${email.trim()} | ${encrypted}\n`;

  try {
    fs.appendFileSync(vaultPath, line, 'utf8');
  } catch (e) {
    throw new Error('Failed to save to vault: ' + e.message);
  }

  return { plain, encrypted, vaultPath };
});

// Quick generate without saving (for preview - kept for compatibility but unused now)
ipcMain.handle('quick-generate', async (event, { length, useSymbols, useNumbers, useUpper }) => {
  return generateRandomPassword(length || 16, useSymbols !== false, useNumbers !== false, useUpper !== false);
});

ipcMain.handle('encrypt-only', async (event, { plain, masterKey }) => {
  if (!plain) throw new Error('Plain text required');
  if (!masterKey) throw new Error('Master key required');
  return encryptText(plain, masterKey);
});

ipcMain.handle('decrypt', async (event, { encrypted, masterKey }) => {
  if (!encrypted) throw new Error('Encrypted password required');
  if (!masterKey) throw new Error('Master key required');
  const trimmed = encrypted.trim();
  try {
    const decrypted = decryptText(trimmed, masterKey);
    return decrypted;
  } catch (e) {
    // Provide helpful error
    if (e.message.includes('bad decrypt') || e.message.includes('Invalid')) {
      throw new Error('Decryption failed - wrong key or corrupted encrypted password');
    }
    throw e;
  }
});

ipcMain.handle('get-vault', async () => {
  const vaultPath = ensureVaultFile();
  try {
    const content = fs.readFileSync(vaultPath, 'utf8');
    const lines = content.split('\n').filter(l => l.trim() && !l.trim().startsWith('#'));
    const entries = lines.map((line, idx) => {
      const parts = line.split('|').map(s => s.trim());
      if (parts.length < 3) return null;
      return {
        id: idx,
        service: parts[0],
        email: parts[1],
        encrypted: parts[2],
        raw: line
      };
    }).filter(Boolean);
    return { vaultPath, content, entries };
  } catch (e) {
    throw new Error('Failed to read vault: ' + e.message);
  }
});

ipcMain.handle('open-vault-folder', async () => {
  const vaultPath = getVaultPath();
  shell.showItemInFolder(vaultPath);
  return vaultPath;
});

ipcMain.handle('clear-vault', async () => {
  const vaultPath = ensureVaultFile();
  fs.writeFileSync(vaultPath, '# PassBox Vault - Encrypted Passwords\n# Format: SERVICE | EMAIL | ENCRYPTED_PASSWORD\n\n', 'utf8');
  return vaultPath;
});

ipcMain.handle('delete-entry', async (event, { encrypted }) => {
  const vaultPath = ensureVaultFile();
  try {
    const content = fs.readFileSync(vaultPath, 'utf8');
    const lines = content.split('\n');
    const filtered = lines.filter(l => !l.includes(encrypted));
    fs.writeFileSync(vaultPath, filtered.join('\n'), 'utf8');
    return true;
  } catch (e) {
    throw new Error(e.message);
  }
});

// --- 2FA Helpers ---
function get2FaVaultPath() {
  if (app.isPackaged) {
    return path.join(path.dirname(app.getPath('exe')), 'vault_2fa.txt');
  } else {
    return path.join(__dirname, 'vault_2fa.txt');
  }
}
function ensure2FaVaultFile() {
  const p = get2FaVaultPath();
  try {
    const dir = path.dirname(p);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    if (!fs.existsSync(p)) {
      fs.writeFileSync(p, '# PassBox 2FA Vault - Encrypted TOTP Secrets\n# Format: SERVICE | EMAIL | ENCRYPTED_SECRET\n# WARNING: Do not edit encrypted values manually\n\n', 'utf8');
    }
  } catch (e) { console.error('Failed to ensure 2FA vault', e); }
  return p;
}
const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
function base32Encode(buffer) {
  let bits = 0, value = 0, output = '';
  for (let i = 0; i < buffer.length; i++) {
    value = (value << 8) | buffer[i];
    bits += 8;
    while (bits >= 5) {
      output += BASE32_ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) output += BASE32_ALPHABET[(value << (5 - bits)) & 31];
  while (output.length % 8 !== 0) output += '=';
  return output;
}
function base32Decode(str) {
  const clean = str.replace(/=+$/,'').toUpperCase();
  let bits = 0, value = 0;
  const bytes = [];
  for (let i = 0; i < clean.length; i++) {
    const idx = BASE32_ALPHABET.indexOf(clean[i]);
    if (idx === -1) throw new Error('Invalid base32 character');
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }
  return Buffer.from(bytes);
}
function generateTOTPSecret() {
  return base32Encode(crypto.randomBytes(20));
}
function generateTOTP(secretBase32, timeStep = 30, digits = 6) {
  const key = base32Decode(secretBase32);
  const counter = Math.floor(Date.now() / 1000 / timeStep);
  const counterBuf = Buffer.alloc(8);
  counterBuf.writeBigUInt64BE(BigInt(counter), 0);
  const hmac = crypto.createHmac('sha1', key).update(counterBuf).digest();
  const offset = hmac[hmac.length - 1] & 0x0f;
  const code = ((hmac[offset] & 0x7f) << 24) | ((hmac[offset+1] & 0xff) << 16) | ((hmac[offset+2] & 0xff) << 8) | (hmac[offset+3] & 0xff);
  const otp = (code % (10 ** digits)).toString().padStart(digits, '0');
  const remaining = timeStep - (Math.floor(Date.now()/1000) % timeStep);
  return { code: otp, remaining, secret: secretBase32 };
}

ipcMain.handle('add-2fa', async (event, { service, email, masterKey, secret }) => {
  if (!service || !email) throw new Error('Service and Email are required');
  if (!masterKey) throw new Error('Master key is required');
  if (service.includes('|') || email.includes('|')) throw new Error('Service/Email cannot contain "|"');
  let totpSecret = secret && secret.trim() ? secret.trim().replace(/\s/g,'').toUpperCase() : generateTOTPSecret();
  // Validate base32
  try { base32Decode(totpSecret); } catch { throw new Error('Invalid 2FA secret — must be base32 (A-Z, 2-7)'); }
  const encrypted = encryptText(totpSecret, masterKey);
  const p = ensure2FaVaultFile();
  const line = `${service.trim()} | ${email.trim()} | ${encrypted}\n`;
  // Prevent duplicate service+email
  try {
    const existing = fs.readFileSync(p, 'utf8');
    const dup = existing.split('\n').some(l => {
      const parts = l.split('|').map(s=>s.trim().toLowerCase());
      return parts[0]===service.trim().toLowerCase() && parts[1]===email.trim().toLowerCase();
    });
    if (dup) throw new Error('2FA entry already exists for this service+email');
  } catch (e) { if (e.message.includes('already exists')) throw e; }
  fs.appendFileSync(p, line, 'utf8');
  return { secret: totpSecret, encrypted, vaultPath: p };
});

ipcMain.handle('get-2fa-vault', async () => {
  const p = ensure2FaVaultFile();
  try {
    const content = fs.readFileSync(p, 'utf8');
    const lines = content.split('\n').filter(l => l.trim() && !l.trim().startsWith('#'));
    const entries = lines.map((line, idx) => {
      const parts = line.split('|').map(s=>s.trim());
      if (parts.length < 3) return null;
      return { id: idx, service: parts[0], email: parts[1], encrypted: parts[2], raw: line };
    }).filter(Boolean);
    return { vaultPath: p, content, entries };
  } catch (e) { throw new Error('Failed to read 2FA vault: '+e.message); }
});

ipcMain.handle('generate-2fa', async (event, { service, email, masterKey, encrypted }) => {
  if (!masterKey) throw new Error('Master key is required');
  let secretBase32 = '';
  if (encrypted) {
    secretBase32 = decryptText(encrypted.trim(), masterKey);
  } else {
    if (!service || !email) throw new Error('Service, Email and Master Key are required, or provide encrypted');
    const p = ensure2FaVaultFile();
    const content = fs.readFileSync(p, 'utf8');
    const lines = content.split('\n');
    let found = null;
    for (const l of lines) {
      const parts = l.split('|').map(s=>s.trim());
      if (parts.length < 3) continue;
      if (parts[0].toLowerCase()===service.trim().toLowerCase() && parts[1].toLowerCase()===email.trim().toLowerCase()) {
        found = parts[2];
        break;
      }
    }
    if (!found) throw new Error('No 2FA entry found for this service+email');
    try {
      secretBase32 = decryptText(found, masterKey);
    } catch {
      throw new Error('Decryption failed - wrong master key');
    }
  }
  // Validate and generate
  try { base32Decode(secretBase32); } catch { throw new Error('Invalid 2FA secret'); }
  return generateTOTP(secretBase32);
});

ipcMain.handle('delete-2fa', async (event, { encrypted }) => {
  const p = ensure2FaVaultFile();
  try {
    const content = fs.readFileSync(p, 'utf8');
    const lines = content.split('\n');
    const filtered = lines.filter(l => !l.includes(encrypted));
    fs.writeFileSync(p, filtered.join('\n'), 'utf8');
    return true;
  } catch (e) { throw new Error(e.message); }
});

ipcMain.handle('clear-2fa-vault', async () => {
  const p = ensure2FaVaultFile();
  fs.writeFileSync(p, '# PassBox 2FA Vault - Encrypted TOTP Secrets\n# Format: SERVICE | EMAIL | ENCRYPTED_SECRET\n\n', 'utf8');
  return p;
});

ipcMain.handle('open-2fa-folder', async () => {
  const p = get2FaVaultPath();
  shell.showItemInFolder(p);
  return p;
});
