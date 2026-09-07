<p align="center">
  <img src="icon.png" width="88" height="88" alt="PassBox"/>
</p>

<h1 align="center">PassBox v2.0 — Free Offline Password Vault for Windows</h1>
<p align="center">No cloud. No subscription. AES-256 + 2FA TOTP. Made by Andrew_Geo.</p>

<p align="center">
  <img src="https://img.shields.io/badge/version-2.0.0-FFC107?style=for-the-badge&labelColor=0A0A0A" alt="version"/>
  <img src="https://img.shields.io/badge/platform-Windows-111111?style=for-the-badge&labelColor=0A0A0A" alt="windows"/>
  <img src="https://img.shields.io/badge/offline-00C853?style=for-the-badge&labelColor=0A0A0A" alt="offline"/>
  <img src="https://img.shields.io/badge/VirusTotal-0_69_clean-00C853?style=for-the-badge&labelColor=0A0A0A" alt="virustotal"/>
</p>

<p align="center">
  <a href="https://github.com/Andrew-Geo1/PassBox/releases/download/v2.0.0/PassBox-Setup-v2.0.exe"><b>⬇ Download PassBox-Setup-v2.0.exe (180 MB)</b></a><br/>
  <sub>Windows 10/11 64-bit • Installer + Desktop shortcut • Vault stays next to app</sub><br/>
  <sub>✅ <a href="https://www.virustotal.com/gui/file/1786b10b315b93377571fe3b6d5d2781e9290421554aaf6cb23b807295014c5a/detection">VirusTotal: 0/69 Clean</a> • Open source • MIT</sub>
</p>

> Windows says "Unknown publisher"? Click **More info → Run anyway**. Normal for free indie apps without $200/yr signing. Verified clean on VirusTotal 0/69.

---

### Why PassBox?
- **100% offline** — vault.txt stays in `C:\Program Files\PassBox\`, never sent anywhere
- **AES-256-CBC + SHA256(key) + random 16B IV** — master key never saved
- **Password generator 8-32 chars** — Upper / Numbers / Symbols toggles + strength meter
- **2FA vault NEW in v2** — encrypted TOTP secrets in `vault_2fa.txt`, 6-digit codes, 30s auto-refresh, no spaces
- **Vault manager** — Search, Copy / Decrypt / Delete, Show in Folder, Clear

### Install (2 min)
1. Download `PassBox-Setup-v2.0.exe` from [Releases](https://github.com/Andrew-Geo1/PassBox/releases)
2. Double-click → Yes (admin) → Install
3. Launch PassBox from Desktop

### How to use
**Create:** Service + Email + Master Key → Length + toggles → **Generate & Encrypt & Save**
> Saves line to vault.txt: `SERVICE | EMAIL | iv:encrypted`

**Get:** Copy hex from `vault.txt` → paste in Get tab + Master Key → **Decrypt & Reveal**

**Vault tab:** Search, Copy encrypted, Decrypt with key, Delete, Show in Folder

**2FA Add:** Service + Email + Master Key + TOTP Secret (blank = auto-generate random 20-byte) → saves to `vault_2fa.txt`

**2FA Generate:** Paste `Encrypted 2FA Secret` + `Master Key you used` → 6-digit code, Copy, 30s progress bar

### Files
- `passbox.exe` — the app
- `vault.txt` — `# PassBox Vault` header, then `SERVICE | EMAIL | ENCRYPTED`
- `vault_2fa.txt` — `SERVICE | EMAIL | ENCRYPTED_SECRET`
- Back up these 2 .txt files to USB to back up all passwords. Lose Master Key = cannot decrypt, by design.

### Security model
- AES-256-CBC, key = SHA256(masterKey), fresh IV per entry, format `iv_hex:cipher_hex`
- TOTP = SHA1, 30s, 6 digits, RFC6238, Base32 secret A-Z2-7
- No network calls, no telemetry, no account. Verify in `main.js` + DevTools Network = 0 requests.
- Wrong key → `Decryption failed - wrong key` error, nothing crashes.

### FAQ
**Is it free?** Yes, MIT. No premium, no cloud paywall.
**Why 180MB?** Electron bundles Chromium + Node. Small portable build coming in v2.1.
**Chrome / Bitwarden leaked, should I switch?** PassBox is for people who want a local file they control. Try it for non-critical logins first.
**Forgot master key?** Cannot recover. That's the point of zero-knowledge.

---
<p align="center"><b>© PassBox • Made by Andrew_Geo • v2.0 • Star ⭐ if useful</b></p>
