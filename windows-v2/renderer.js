const $ = id => document.getElementById(id);

// Titlebar
$('btnMin').onclick = () => window.passbox.minimize();
$('btnMax').onclick = () => window.passbox.maximize();
$('btnClose').onclick = () => window.passbox.close();

// Navigation
document.querySelectorAll('.nav-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    const page = btn.dataset.page;
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.getElementById('page-' + page).classList.add('active');
    if (page === 'vault') loadVault();
    if (page === '2fa') load2FAVault();
  });
});

// Vault path
window.passbox.getVault().then(({ vaultPath }) => {
  $('vaultPath').textContent = vaultPath;
}).catch(()=>{});

// Open vault / Clear
$('openVaultBtn').onclick = async () => {
  const p = await window.passbox.openVaultFolder();
  toast('Opened vault location', p, 'success');
};
$('openFolderBtn')?.addEventListener('click', async () => {
  const p = await window.passbox.openVaultFolder();
  toast('Vault folder opened', p, 'success');
});
$('clearVaultBtn').onclick = async () => {
  if (!confirm('Clear all passwords from vault.txt ? This cannot be undone.')) return;
  await window.passbox.clearVault();
  toast('Vault cleared', 'All entries removed', 'success');
  loadVault();
  $('vaultPath').textContent = (await window.passbox.getVault()).vaultPath;
};

// --- Toast ---
function toast(title, subtitle='', type='success') {
  const c = $('toastContainer');
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.innerHTML = `<div class="toast-icon">${type==='success'?'âœ“':'âœ•'}</div><div class="toast-content"><div class="toast-title">${title}</div>${subtitle?`<div class="toast-subtitle">${subtitle}</div>`:''}</div>`;
  c.appendChild(el);
  setTimeout(()=> {
    el.style.animation = 'toastOut 0.25s ease forwards';
    setTimeout(()=> el.remove(), 260);
  }, 2600);
}

async function copyToClipboard(text, btn) {
  try {
    await navigator.clipboard.writeText(text);
    if (btn) {
      const orig = btn.innerHTML;
      btn.innerHTML = 'âœ“';
      btn.classList.add('copied');
      setTimeout(()=> { btn.innerHTML = orig; btn.classList.remove('copied'); }, 1200);
    }
    toast('Copied to clipboard', text.slice(0,60) + (text.length>60?'...':''), 'success');
  } catch {
    toast('Copy failed', 'Try manual copy', 'error');
  }
}

// --- Create Page Logic ---
let toggles = { upper: true, numbers: true, symbols: true };
let realRevealed = false;
let decryptedRevealed = false;
let lastReal = '';
let lastEnc = '';

function updateTogglesUI() {
  document.querySelectorAll('.toggle[data-toggle]').forEach(el => {
    const k = el.dataset.toggle;
    const active = !!toggles[k];
    el.classList.toggle('active', active);
    el.setAttribute('aria-checked', active ? 'true' : 'false');
  });
}
document.querySelectorAll('.toggle[data-toggle]').forEach(el => {
  el.addEventListener('click', (e) => {
    e.preventDefault();
    const k = el.dataset.toggle;
    toggles[k] = !toggles[k];
    updateTogglesUI();
    updateStrength();
  });
  // keyboard
  el.addEventListener('keydown', e => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      el.click();
    }
  });
});

// Length slider
const lengthSlider = $('lengthSlider');
const lengthValue = $('lengthValue');
lengthSlider.addEventListener('input', () => {
  lengthValue.textContent = lengthSlider.value;
  updateStrength();
});

function getStrength(len, toggles) {
  let score = 0;
  if (len >= 12) score++;
  if (len >= 16) score++;
  if (len >= 20) score++;
  if (toggles.upper) score++;
  if (toggles.numbers) score++;
  if (toggles.symbols) score++;
  if (len < 10) score = Math.max(0, score -1);
  if (score <= 2) return { label: 'Weak', color: '#6B6B6B', bars: 1 };
  if (score === 3) return { label: 'Fair', color: '#9A9A9A', bars: 2 };
  if (score === 4) return { label: 'Good', color: '#FFC107', bars: 3 };
  return { label: 'Strong', color: '#FFC107', bars: 4 };
}
function updateStrength() {
  const s = getStrength(parseInt(lengthSlider.value), toggles);
  $('strengthLabel').textContent = s.label;
  $('strengthLabel').style.color = s.color;
  for (let i=1;i<=4;i++) {
    const bar = $('bar'+i);
    if (i <= s.bars) {
      bar.classList.add('active');
      bar.style.background = s.color;
      bar.style.color = s.color;
    } else {
      bar.classList.remove('active');
      bar.style.background = 'rgba(255,255,255,0.07)';
      bar.style.color = 'rgba(255,255,255,0.07)';
    }
  }
}
updateStrength();

// Toggle create master key visibility
const toggleCreateKeyBtn = $('toggleCreateKeyBtn');
if (toggleCreateKeyBtn) {
  toggleCreateKeyBtn.onclick = () => {
    const inp = $('createKeyInput');
    const isPwd = inp.type === 'password';
    inp.type = isPwd ? 'text' : 'password';
    toggleCreateKeyBtn.setAttribute('aria-label', isPwd ? 'Hide master key' : 'Show master key');
  };
}

// Validation
function validateCreate() {
  let ok = true;
  const service = $('serviceInput').value.trim();
  const email = $('emailInput').value.trim();
  const masterKey = $('createKeyInput').value;
  $('serviceInput').classList.toggle('error', !service);
  $('emailInput').classList.toggle('error', !email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email));
  $('createKeyInput').classList.toggle('error', !masterKey);
  if (!service) ok = false;
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) ok = false;
  if (!masterKey) ok = false;
  return ok;
}
$('serviceInput').addEventListener('input', ()=> $('serviceInput').classList.remove('error'));
$('emailInput').addEventListener('input', ()=> $('emailInput').classList.remove('error'));
$('createKeyInput').addEventListener('input', ()=> $('createKeyInput').classList.remove('error'));

// Generate & Save
$('generateBtn').onclick = async () => {
  if (!validateCreate()) {
    toast('Missing fields', 'Service, Email and Master Key are required', 'error');
    return;
  }
  const btn = $('generateBtn');
  btn.disabled = true;
  const orig = btn.innerHTML;
  btn.innerHTML = 'Generating...';
  try {
    const service = $('serviceInput').value.trim();
    const email = $('emailInput').value.trim();
    const masterKey = $('createKeyInput').value;
    const res = await window.passbox.generateAndSave({
      service, email, masterKey,
      length: parseInt(lengthSlider.value),
      useSymbols: toggles.symbols,
      useNumbers: toggles.numbers,
      useUpper: toggles.upper
    });
    lastReal = res.plain;
    lastEnc = res.encrypted;
    realRevealed = false;
    $('realPwdValue').textContent = 'â€¢'.repeat(lastReal.length);
    $('realPwdValue').style.filter = 'blur(6px)';
    $('encPwdValue').textContent = lastEnc;
    $('savedMeta').textContent = `${service} â€¢ ${email}`;
    $('createResult').classList.add('show');
    $('vaultPath').textContent = res.vaultPath;
    toast('Password generated & encrypted!', `Saved to vault.txt for ${service}`, 'success');
    $('createResult').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    loadVault();
  } catch (e) {
    toast('Failed to save', e.message, 'error');
  } finally {
    btn.disabled = false;
    btn.innerHTML = orig;
  }
};

// Copy real / encrypted
$('copyRealBtn').onclick = () => copyToClipboard(lastReal, $('copyRealBtn'));
$('copyEncBtn').onclick = () => copyToClipboard(lastEnc, $('copyEncBtn'));
$('toggleRealBtn').onclick = () => {
  realRevealed = !realRevealed;
  if (realRevealed) {
    $('realPwdValue').textContent = lastReal;
    $('realPwdValue').style.filter = 'none';
  } else {
    $('realPwdValue').textContent = 'â€¢'.repeat(lastReal.length);
    $('realPwdValue').style.filter = 'blur(6px)';
  }
};

// --- Get Page ---
$('toggleKeyBtn').onclick = () => {
  const inp = $('keyInput');
  const isPwd = inp.type === 'password';
  inp.type = isPwd ? 'text' : 'password';
  $('toggleKeyBtn').setAttribute('aria-label', isPwd ? 'Hide key' : 'Show key');
};
$('pasteEncBtn').onclick = async () => {
  try {
    const t = await navigator.clipboard.readText();
    $('encInput').value = t;
    toast('Pasted from clipboard', '', 'success');
  } catch {
    toast('Paste failed', 'Please paste manually (Ctrl+V)', 'error');
  }
};

async function doDecrypt() {
  const enc = $('encInput').value.trim();
  const key = $('keyInput').value;
  const alertBox = $('decryptAlert');
  alertBox.innerHTML = '';
  if (!enc) {
    alertBox.innerHTML = `<div class="alert alert-error">Encrypted password is required</div>`;
    return;
  }
  if (!key) {
    alertBox.innerHTML = `<div class="alert alert-error">Secret key is required</div>`;
    return;
  }
  const btn = $('decryptBtn');
  btn.disabled = true;
  const orig = btn.innerHTML;
  btn.innerHTML = 'Decrypting...';
  try {
    const plain = await window.passbox.decrypt({ encrypted: enc, masterKey: key });
    decryptedRevealed = false;
    $('decryptedValue').textContent = 'â€¢'.repeat(plain.length);
    $('decryptedValue').dataset.plain = plain;
    $('decryptedValue').style.filter = 'blur(6px)';
    $('decryptResult').classList.add('show');
    alertBox.innerHTML = `<div class="alert alert-success">Decrypted successfully â€” reveal and copy below</div>`;
    toast('Decrypted!', 'Real password revealed', 'success');
  } catch (e) {
    alertBox.innerHTML = `<div class="alert alert-error">${e.message}</div>`;
    $('decryptResult').classList.remove('show');
    toast('Decryption failed', e.message, 'error');
  } finally {
    btn.disabled = false;
    btn.innerHTML = orig;
  }
}
$('decryptBtn').onclick = doDecrypt;
$('encInput').addEventListener('keydown', e => { if (e.key === 'Enter') doDecrypt(); });
$('keyInput').addEventListener('keydown', e => { if (e.key === 'Enter') doDecrypt(); });

$('copyDecryptedBtn').onclick = () => {
  const plain = $('decryptedValue').dataset.plain || '';
  copyToClipboard(plain, $('copyDecryptedBtn'));
};
$('toggleDecryptedBtn').onclick = () => {
  const el = $('decryptedValue');
  const plain = el.dataset.plain || '';
  decryptedRevealed = !decryptedRevealed;
  if (decryptedRevealed) {
    el.textContent = plain;
    el.style.filter = 'none';
  } else {
    el.textContent = 'â€¢'.repeat(plain.length);
    el.style.filter = 'blur(6px)';
  }
};

// --- Vault ---
let vaultEntries = [];

async function loadVault() {
  try {
    const { vaultPath, entries } = await window.passbox.getVault();
    $('vaultPath').textContent = vaultPath;
    const fileName = vaultPath.split(/[/\\]/).pop();
    $('statFileSize').textContent = fileName;
    vaultEntries = entries;
    $('statTotal').textContent = entries.length;
    const uniq = new Set(entries.map(e=>e.service.toLowerCase())).size;
    $('statServices').textContent = uniq;
    renderVault(entries);
  } catch (e) {
    console.error(e);
    toast('Failed to load vault', e.message, 'error');
  }
}
function renderVault(entries) {
  const tbody = $('vaultTbody');
  const table = $('vaultTable');
  const empty = $('vaultEmpty');
  const filter = $('vaultSearch').value.toLowerCase().trim();
  let filtered = entries;
  if (filter) {
    filtered = entries.filter(e => e.service.toLowerCase().includes(filter) || e.email.toLowerCase().includes(filter));
  }
  if (filtered.length === 0) {
    table.style.display = 'none';
    empty.style.display = 'block';
    if (filter) {
      empty.innerHTML = `<div class="empty-icon" aria-hidden="true"><svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" opacity="0.35"><circle cx="11" cy="11" r="7"/><path d="M21 21l-3.5-3.5"/></svg></div><h4>No results for "${escapeHtml(filter)}"</h4><p>Try another service or email.</p>`;
    } else {
      empty.innerHTML = `<div class="empty-icon" aria-hidden="true"><svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" opacity="0.35"><path d="M3 7h18M3 12h18M3 17h18"/></svg></div><h4>No passwords yet</h4><p>Create your first password in the <strong>Create</strong> tab.<br>Encrypted entries will appear here and in vault.txt.</p>`;
    }
    return;
  }
  empty.style.display = 'none';
  table.style.display = 'table';
  tbody.innerHTML = '';
  [...filtered].reverse().forEach(entry => {
    const tr = document.createElement('tr');
    const initial = entry.service.charAt(0).toUpperCase();
    tr.innerHTML = `
      <td>
        <div class="service-cell">
          <span class="service-icon">${initial}</span>
          <span>${escapeHtml(entry.service)}</span>
        </div>
      </td>
      <td class="email-cell">${escapeHtml(entry.email)}</td>
      <td><div class="encrypted-cell" title="${escapeHtml(entry.encrypted)}">${escapeHtml(entry.encrypted)}</div></td>
      <td>
        <div class="row-actions" style="justify-content:flex-end">
          <button class="btn btn-secondary btn-small" data-decrypt="${escapeHtml(entry.encrypted)}">Decrypt</button>
          <button class="btn btn-ghost btn-small" data-copy="${escapeHtml(entry.encrypted)}" title="Copy encrypted">Copy</button>
          <button class="btn btn-ghost btn-small" data-del="${escapeHtml(entry.encrypted)}" title="Delete" style="color:#FCA5A5;border-color:rgba(239,68,68,0.15)">Delete</button>
        </div>
      </td>
    `;
    tbody.appendChild(tr);
  });

  tbody.querySelectorAll('[data-copy]').forEach(btn => {
    btn.addEventListener('click', () => copyToClipboard(btn.dataset.copy, btn));
  });
  tbody.querySelectorAll('[data-decrypt]').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.nav-btn').forEach(b=>b.classList.remove('active'));
      document.querySelector('[data-page="get"]').classList.add('active');
      document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
      $('page-get').classList.add('active');
      $('encInput').value = btn.dataset.decrypt;
      $('encInput').focus();
      toast('Encrypted pasted to Get tab', 'Enter key and decrypt', 'success');
      document.querySelector('.main').scrollTop = 0;
    });
  });
  tbody.querySelectorAll('[data-del]').forEach(btn => {
    btn.addEventListener('click', async () => {
      if (!confirm('Delete this entry from vault.txt ?')) return;
      try {
        await window.passbox.deleteEntry({ encrypted: btn.dataset.del });
        toast('Entry deleted', '', 'success');
loadVault();
load2FAVault();
      } catch(e) { toast('Delete failed', e.message, 'error'); }
    });
  });
}
function escapeHtml(s) {
  return s.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}
$('vaultSearch').addEventListener('input', () => renderVault(vaultEntries));
$('refreshVaultBtn').onclick = loadVault;

// --- 2FA ---
$('toggleTfaMasterKey')?.addEventListener('click', () => {
  const i = $('tfaMasterKey');
  i.type = i.type === 'password' ? 'text' : 'password';
});
$('toggleGenTfaKeyBtn')?.addEventListener('click', () => {
  const i = $('genTfaMasterKey');
  i.type = i.type === 'password' ? 'text' : 'password';
});
$('genTfaSecretBtn')?.addEventListener('click', async () => {
  // Generate random base32-like placeholder (client side, will be validated server side)
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  let s = '';
  const arr = new Uint32Array(32);
  crypto.getRandomValues(arr);
  for (let i = 0; i < 32; i++) s += chars[arr[i] % chars.length];
  $('tfaSecret').value = s.match(/.{4}/g).join(' ').trim();
});

let lastTfaSecret = '';
let lastTfaEnc = '';
let tfaTimer = null;
let lastTfaParams = null; // for auto refresh

function stopTfaTimer() {
  if (tfaTimer) { clearInterval(tfaTimer); tfaTimer = null; }
}
function startTfaCountdown(remaining) {
  stopTfaTimer();
  let r = remaining;
  const bar = $('tfaProgress');
  const txt = $('tfaRemaining');
  function tick() {
    if (!bar || !txt) return;
    bar.style.width = ((r / 30) * 100) + '%';
    txt.textContent = r + 's';
    if (r <= 0) {
      // auto refresh code
      if (lastTfaParams) doGenerateTfa(true);
      return;
    }
    r--;
  }
  tick();
  tfaTimer = setInterval(tick, 1000);
}

async function doGenerateTfa(isAuto = false) {
  const alertBox = $('genTfaAlert');
  if (!isAuto) alertBox.innerHTML = '';
  const masterKey = $('genTfaMasterKey').value;
  const encrypted = $('genTfaEncrypted').value.trim();
  if (!masterKey) {
    if (!isAuto) alertBox.innerHTML = `<div class="alert alert-error">Master key is required</div>`;
    return;
  }
  if (!encrypted) {
    if (!isAuto) alertBox.innerHTML = `<div class="alert alert-error">Encrypted 2FA is required</div>`;
    return;
  }
  const btn = $('genTfaCodeBtn');
  if (!isAuto) { btn.disabled = true; btn.textContent = 'Generating...'; }
  try {
    const res = await window.passbox.generate2FA({ masterKey, encrypted });
    $('tfaCodeValue').textContent = res.code;
    $('tfaCodeValue').dataset.raw = res.code;
    $('genTfaResult').classList.add('show');
    startTfaCountdown(res.remaining);
    lastTfaParams = { masterKey, encrypted };
    if (!isAuto) toast('2FA code generated', `Valid for ${res.remaining}s`, 'success');
  } catch (e) {
    if (!isAuto) {
      alertBox.innerHTML = `<div class="alert alert-error">${e.message}</div>`;
      toast('2FA failed', e.message, 'error');
    }
  } finally {
    if (!isAuto) { btn.disabled = false; btn.textContent = 'Generate 2FA Code'; }
  }
}

$('genTfaCodeBtn')?.addEventListener('click', () => doGenerateTfa(false));
$('refreshTfaCodeBtn')?.addEventListener('click', () => doGenerateTfa(false));
$('copyTfaCodeBtn')?.addEventListener('click', () => {
  const raw = $('tfaCodeValue').dataset.raw || $('tfaCodeValue').textContent.replace(/\s/g,'');
  copyToClipboard(raw, $('copyTfaCodeBtn'));
});
$('pasteGenTfaEncBtn')?.addEventListener('click', async () => {
  try {
    const t = await navigator.clipboard.readText();
    $('genTfaEncrypted').value = t.trim();
    toast('Pasted', '', 'success');
  } catch { toast('Paste failed', 'Ctrl+V', 'error'); }
});
$('genTfaMasterKey')?.addEventListener('keydown', e => { if (e.key==='Enter') doGenerateTfa(false); });
$('genTfaEncrypted')?.addEventListener('keydown', e => { if (e.key==='Enter') doGenerateTfa(false); });

$('addTfaBtn')?.addEventListener('click', async () => {
  const service = $('tfaService').value.trim();
  const email = $('tfaEmail').value.trim();
  const masterKey = $('tfaMasterKey').value;
  let secret = $('tfaSecret').value.trim();
  const alertBox = $('addTfaAlert');
  alertBox.innerHTML = '';
  if (!service || !email || !masterKey) {
    alertBox.innerHTML = `<div class="alert alert-error">Service, Email and Master Key are required</div>`;
    return;
  }
  const btn = $('addTfaBtn');
  btn.disabled = true; btn.textContent = 'Saving...';
  try {
    const res = await window.passbox.add2FA({ service, email, masterKey, secret: secret || undefined });
    lastTfaSecret = res.secret;
    lastTfaEnc = res.encrypted;
    $('tfaSecretValue').textContent = res.secret.match(/.{4}/g).join(' ');
    $('tfaEncValue').textContent = res.encrypted;
    $('addTfaResult').classList.add('show');
    toast('2FA saved', `Encrypted for ${service}`, 'success');
    load2FAVault();
    // also clear secret input if auto-generated
    if (!secret) $('tfaSecret').value = '';
  } catch (e) {
    alertBox.innerHTML = `<div class="alert alert-error">${e.message}</div>`;
    toast('Save failed', e.message, 'error');
  } finally {
    btn.disabled = false; btn.textContent = 'Add Encrypted 2FA';
  }
});
$('copyTfaSecretBtn')?.addEventListener('click', () => copyToClipboard(lastTfaSecret, $('copyTfaSecretBtn')));
$('copyTfaEncBtn')?.addEventListener('click', () => copyToClipboard(lastTfaEnc, $('copyTfaEncBtn')));

// 2FA Vault
let tfaEntries = [];
async function load2FAVault() {
  try {
    const { entries } = await window.passbox.get2FAVault();
    tfaEntries = entries;
    render2FAVault(entries);
  } catch (e) {
    console.error(e);
  }
}
function render2FAVault(entries) {
  const tbody = $('tfaTbody');
  const table = $('tfaTable');
  const empty = $('tfaEmpty');
  if (!tbody || !table || !empty) return;
  const filter = ($('tfaSearch')?.value || '').toLowerCase().trim();
  let filtered = entries;
  if (filter) filtered = entries.filter(e => e.service.toLowerCase().includes(filter) || e.email.toLowerCase().includes(filter));
  if (filtered.length === 0) {
    table.style.display = 'none';
    empty.style.display = 'block';
    return;
  }
  empty.style.display = 'none';
  table.style.display = 'table';
  tbody.innerHTML = '';
  [...filtered].reverse().forEach(entry => {
    const tr = document.createElement('tr');
    const initial = entry.service.charAt(0).toUpperCase();
    tr.innerHTML = `
      <td><div class="service-cell"><span class="service-icon">${initial}</span><span>${escapeHtml(entry.service)}</span></div></td>
      <td class="email-cell">${escapeHtml(entry.email)}</td>
      <td><div class="encrypted-cell" title="${escapeHtml(entry.encrypted)}">${escapeHtml(entry.encrypted)}</div></td>
      <td>
        <div class="row-actions" style="justify-content:flex-end">
          <button class="btn btn-secondary btn-small" data-gen2fa="${escapeHtml(entry.encrypted)}">Generate</button>
          <button class="btn btn-ghost btn-small" data-copy2fa="${escapeHtml(entry.encrypted)}">Copy</button>
          <button class="btn btn-ghost btn-small" data-del2fa="${escapeHtml(entry.encrypted)}" style="color:#FCA5A5;border-color:rgba(239,68,68,0.15)">Delete</button>
        </div>
      </td>
    `;
    tbody.appendChild(tr);
  });
  tbody.querySelectorAll('[data-copy2fa]').forEach(btn => {
    btn.addEventListener('click', () => copyToClipboard(btn.dataset.copy2fa, btn));
  });
  tbody.querySelectorAll('[data-gen2fa]').forEach(btn => {
    btn.addEventListener('click', () => {
      $('genTfaEncrypted').value = btn.dataset.gen2fa;
      document.querySelectorAll('.nav-btn').forEach(b=>b.classList.remove('active'));
      document.querySelector('[data-page="2fa"]').classList.add('active');
      document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
      $('page-2fa').classList.add('active');
      // Focus master key
      $('genTfaMasterKey').focus();
      toast('Encrypted pasted', 'Enter master key and Generate', 'success');
    });
  });
  tbody.querySelectorAll('[data-del2fa]').forEach(btn => {
    btn.addEventListener('click', async () => {
      if (!confirm('Delete this 2FA entry?')) return;
      try {
        await window.passbox.delete2FA({ encrypted: btn.dataset.del2fa });
        toast('2FA deleted', '', 'success');
        load2FAVault();
      } catch (e) { toast('Delete failed', e.message, 'error'); }
    });
  });
}
$('tfaSearch')?.addEventListener('input', () => render2FAVault(tfaEntries));
$('refresh2FAVaultBtn')?.addEventListener('click', load2FAVault);
$('open2FAFolderBtn')?.addEventListener('click', async () => {
  const p = await window.passbox.open2FAFolder();
  toast('Opened 2FA folder', p, 'success');
});
$('clear2FAVaultBtn')?.addEventListener('click', async () => {
  if (!confirm('Clear all 2FA entries?')) return;
  await window.passbox.clear2FAVault();
  toast('2FA vault cleared', '', 'success');
  load2FAVault();
});

// Hook 2FA vault load on nav
document.querySelector('[data-page="2fa"]')?.addEventListener('click', () => {
  load2FAVault();
});

loadVault();

document.addEventListener('keydown', e => {
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'n') {
    e.preventDefault();
    document.querySelector('[data-page="create"]').click();
    $('serviceInput').focus();
  }
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
    e.preventDefault();
    document.querySelector('[data-page="get"]').click();
    $('encInput').focus();
  }
});
