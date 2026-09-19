const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('passbox', {
  // Window
  minimize: () => ipcRenderer.send('window-minimize'),
  maximize: () => ipcRenderer.send('window-maximize'),
  close: () => ipcRenderer.send('window-close'),
  isMaximized: () => ipcRenderer.invoke('is-maximized'),

  // Core
  generateAndSave: (data) => ipcRenderer.invoke('generate-and-save', data),
  quickGenerate: (data) => ipcRenderer.invoke('quick-generate', data),
  encryptOnly: (data) => ipcRenderer.invoke('encrypt-only', data),
  decrypt: (data) => ipcRenderer.invoke('decrypt', data),
  getVault: () => ipcRenderer.invoke('get-vault'),
  openVaultFolder: () => ipcRenderer.invoke('open-vault-folder'),
  clearVault: () => ipcRenderer.invoke('clear-vault'),
  deleteEntry: (data) => ipcRenderer.invoke('delete-entry', data),

  // 2FA
  add2FA: (data) => ipcRenderer.invoke('add-2fa', data),
  get2FAVault: () => ipcRenderer.invoke('get-2fa-vault'),
  generate2FA: (data) => ipcRenderer.invoke('generate-2fa', data),
  delete2FA: (data) => ipcRenderer.invoke('delete-2fa', data),
  clear2FAVault: () => ipcRenderer.invoke('clear-2fa-vault'),
  open2FAFolder: () => ipcRenderer.invoke('open-2fa-folder'),
});
