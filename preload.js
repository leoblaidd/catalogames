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
  updateCheck:    ()             => ipcRenderer.invoke('update:check'),
  updateInstall:  ()             => ipcRenderer.invoke('update:install'),
  onUpdateProgress: cb           => ipcRenderer.on('update:progress', (_e, p) => cb(p)),
  openExternal:   url            => ipcRenderer.invoke('open-external', url),
  savePng:        (nome, bytes)  => ipcRenderer.invoke('save-png', nome, bytes),
  showInFolder:   f              => ipcRenderer.invoke('show-in-folder', f),
  sgdbSearch:     termo          => ipcRenderer.invoke('sgdb:search', termo),
  sgdbGrids:      (id, page, st) => ipcRenderer.invoke('sgdb:grids', id, page, st),
  importPick:     kind           => ipcRenderer.invoke('import:pick', kind),
});
