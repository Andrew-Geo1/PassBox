<p align="center">
  <img src="icon.ico" width="88" height="88" alt="PassBox"/>
</p>

<h1 align="center">PassBox — MADE BY ANDREW_GEO — v2.0</h1>
<p align="center">Secure desktop password vault — Black • Yellow • White • AES-256 + 2FA</p>

<p align="center">
  <img src="https://img.shields.io/badge/version-2.0.0-FFC107?style=for-the-badge&labelColor=0A0A0A" alt="version"/>
  <img src="https://img.shields.io/badge/platform-Windows-111111?style=for-the-badge&labelColor=0A0A0A" alt="windows"/>
  <img src="https://img.shields.io/badge/AES--256-FFC107?style=for-the-badge&labelColor=0A0A0A" alt="aes"/>
</p>

<p align="center">
  <b>⬇ Download: <a href="https://github.com/Andrew-Geo1/PassBox/releases">install_passbox.exe</a> (178MB)</b><br/>
  <sub>One file → <code>C:\Program Files\PassBox\passbox.exe</code> + Desktop shortcut • vaults same folder</sub>
</p>

<p align="center">
  <img src="preview.png" width="720" alt="PassBox Preview"/>
</p>

---

### Install
1. Download `install_passbox.exe`
2. Double-click → **Yes** (admin) → **Install PassBox**
3. Tutorial shows while installing

Installs to `C:\Program Files\PassBox\passbox.exe` + `PassBox.lnk`
- `vault.txt` — `SERVICE | EMAIL | ENCRYPTED`
- `vault_2fa.txt` — `SERVICE | EMAIL | ENCRYPTED_SECRET`

### How it works
**Create:** Service + Email + Master Key → Length 8-32 + toggles → **Generate & Encrypt & Save**

**Get:** Copy hex from `vault.txt` + Master Key → **Decrypt & Reveal**

**Vault:** Search, Copy / Decrypt / Delete, Show in Folder

**2FA NEW in v2:**
Add: Service + Email + Master Key + TOTP Secret (blank = auto) → `vault_2fa.txt`
Generate: Paste `Encrypted 2FA Secret` + `Master Key you used` only → 6-digit code, no spaces, 30s auto-refresh

### Security
AES-256-CBC + SHA256(key) + 16B IV, TOTP SHA1 30s. Master key never saved.

### Changelog v2.0
- Added 2FA vault
- Generate 2FA simplified to Encrypted + Master Key only
- 2FA code no spaces
- Installer tutorial updated for 2FA

---

<p align="center"><b>© PassBox • Made by Andrew_Geo • v2.0</b></p>
