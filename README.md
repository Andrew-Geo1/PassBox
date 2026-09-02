<p align="center">
  <img src="icon.ico" width="88" height="88" alt="PassBox"/>
</p>
# PassBox — MADE BY ANDREW_GEO

Secure desktop password vault — Black • Yellow • White • AES-256

**Download:** `install_passbox.exe` below (Releases) — 178MB

### Install
1. Download `install_passbox.exe`
2. Double-click → **Yes** (admin) → **Install PassBox**
3. Tutorial shows while installing

Installs to `C:\Program Files\PassBox\passbox.exe` + Desktop shortcut `PassBox.lnk`
`vault.txt` is **same folder as app** (`C:\Program Files\PassBox\vault.txt`, writable) — one file, all encrypted

### How it works
**Create:** Service + Email + *your* Master Key → Length 8-32 + toggles (Aa/#/*! ) → **Generate & Encrypt & Save** — real shown once, only `iv:cipher` hex saved as `SERVICE | EMAIL | ENCRYPTED`

**Get:** Copy hex after 2nd `|` from `vault.txt` → paste + same Master Key → **Decrypt & Reveal**

**Vault:** Search, Copy / Decrypt / Delete, Show in Folder, Clear — `AES-256-CBC + SHA256(key) + 16B IV`, no dates, no plain saved

### Security
Master key never saved. Without correct key, encrypted is unbreakable.

© PassBox • Made by Andrew_Geo • v1.0
