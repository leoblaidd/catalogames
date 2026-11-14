// Ponte segura entre a interface e o disco
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('catalogame', {
  info:           ()             => ipcRenderer.invoke('info'),
  load:           ()             => ipcRenderer.invoke('load'),
  save:           json           => ipcRenderer.invoke('save', json),
  writeCover:     (name, bytes)  => ipcRenderer.invoke('cover:write', name, bytes),
  removeCover:    name           => ipcRenderer.invoke('cover:remove', name),
  coverURL:       name           => ipcRenderer.invoke('cover:url', name),
  readCover:      name           => ipcRenderer.invoke('cover:read', name),
  getConfig:      ()             => ipcRenderer.sendSync('config:get'),
  setConfig:      c              => ipcRenderer.invoke('config:set', c),
  fetchImage:     url            => ipcRenderer.invoke('fetch-image', url),
  openDataFolder: ()             => ipcRenderer.invoke('open-data-folder'),
  importPick:     kind           => ipcRenderer.invoke('import:pick', kind),
});
