// Catalogame — processo principal (Electron)
// Os dados ficam em <pasta onde o app foi instalado>\dados
//   dados\biblioteca.json  -> jogos e listas
//   dados\capas\           -> imagens das capas
const { app, BrowserWindow, ipcMain, shell, dialog, net, nativeTheme } = require('electron');
const path = require('path');
const fs = require('fs');
const fsp = fs.promises;
const { pathToFileURL } = require('url');

app.setAppUserModelId('com.leandro.catalogame');
nativeTheme.themeSource = 'dark';

if (!app.requestSingleInstanceLock()) { app.quit(); process.exit(0); }

/* ---------- onde ficam os dados ---------- */
function canWrite(dir){
  try {
    fs.mkdirSync(dir, { recursive: true });
    const t = path.join(dir, '.teste-escrita');
    fs.writeFileSync(t, 'ok'); fs.unlinkSync(t);
    return true;
  } catch { return false; }
}
let DATA_DIR, dataFallback = false;
function resolveDataDir(){
  if (process.env.CATALOGAME_DADOS) return process.env.CATALOGAME_DADOS;   // usado nos testes
  const base = app.isPackaged ? path.dirname(app.getPath('exe')) : __dirname;
  const preferido = path.join(base, 'dados');
  if (canWrite(preferido)) return preferido;
  // pasta de instalação sem permissão de escrita (ex.: Arquivos de Programas)
  dataFallback = true;
  const alt = path.join(app.getPath('appData'), 'Catalogame', 'dados');
  fs.mkdirSync(alt, { recursive: true });
  return alt;
}
const LIB = () => path.join(DATA_DIR, 'biblioteca.json');
const CAPAS = () => path.join(DATA_DIR, 'capas');
const safeName = n => path.basename(String(n || '')).replace(/[^\w.\-]/g, '');

async function writeAtomic(file, data){
  const tmp = file + '.tmp';
  await fsp.writeFile(tmp, data);
  await fsp.rename(tmp, file);
}

/* ---------- janela ---------- */
let win;
function createWindow(){
  win = new BrowserWindow({
    width: 1440, height: 920, minWidth: 900, minHeight: 600,
    backgroundColor: '#0d1016',
    title: 'Catalogame',
    icon: path.join(__dirname, 'build', 'icon.png'),
    autoHideMenuBar: true,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      spellcheck: false,
    },
  });
  win.setMenuBarVisibility(false);
  win.once('ready-to-show', () => { win.maximize(); win.show(); });
  // links (Google Imagens, SteamGridDB…) abrem no navegador do PC
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:/i.test(url)) shell.openExternal(url);
    return { action: 'deny' };
  });
  win.webContents.on('will-navigate', (e, url) => {
    if (!url.startsWith('file:')) { e.preventDefault(); if (/^https?:/i.test(url)) shell.openExternal(url); }
  });
  win.loadFile(path.join(__dirname, 'app', 'index.html'));
}

app.on('second-instance', () => { if (win) { if (win.isMinimized()) win.restore(); win.focus(); } });
app.on('window-all-closed', () => app.quit());

/* ---------- ponte com a interface ---------- */
ipcMain.handle('info', () => ({ dados: DATA_DIR, fallback: dataFallback, versao: app.getVersion() }));

ipcMain.handle('load', async () => {
  try {
    const txt = await fsp.readFile(LIB(), 'utf8');
    if (!txt.trim()) return null;
    const data = JSON.parse(txt);
    // cópia de segurança a cada abertura (só a última)
    try { await fsp.writeFile(path.join(DATA_DIR, 'biblioteca.backup.json'), txt); } catch {}
    return data;
  } catch (e) {
    if (e.code === 'ENOENT') return null;
    // arquivo corrompido: tenta a cópia de segurança
    try { return JSON.parse(await fsp.readFile(path.join(DATA_DIR, 'biblioteca.backup.json'), 'utf8')); }
    catch { throw new Error('Não consegui ler biblioteca.json: ' + e.message); }
  }
});

ipcMain.handle('save', async (_e, json) => {
  await fsp.mkdir(DATA_DIR, { recursive: true });
  await writeAtomic(LIB(), json);
  return true;
});

ipcMain.handle('cover:write', async (_e, name, bytes) => {
  name = safeName(name); if (!name) throw new Error('nome de capa inválido');
  await fsp.mkdir(CAPAS(), { recursive: true });
  await writeAtomic(path.join(CAPAS(), name), Buffer.from(bytes));
  return name;
});
ipcMain.handle('cover:remove', async (_e, name) => {
  name = safeName(name); if (!name) return;
  try { await fsp.unlink(path.join(CAPAS(), name)); } catch {}
});
ipcMain.handle('cover:url', (_e, name) => {
  name = safeName(name); if (!name) return null;
  const f = path.join(CAPAS(), name);
  return fs.existsSync(f) ? pathToFileURL(f).href : null;
});

// baixa uma imagem da internet (sem as travas de CORS do navegador)
ipcMain.handle('fetch-image', async (_e, url) => {
  try {
    if (!/^https?:\/\//i.test(url)) return null;
    const r = await net.fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 Catalogame' } });
    if (!r.ok) return null;
    const type = (r.headers.get('content-type') || '').split(';')[0].trim();
    if (!type.startsWith('image/')) return null;
    const buf = await r.arrayBuffer();
    if (buf.byteLength > 25 * 1024 * 1024) return null;
    return { type, bytes: new Uint8Array(buf) };
  } catch { return null; }
});

ipcMain.handle('open-data-folder', () => shell.openPath(DATA_DIR));

// importar do Catalogame antigo (pasta com biblioteca.json + capas, ou arquivo de backup .json)
ipcMain.handle('import:pick', async (_e, kind) => {
  if (kind === 'folder') {
    const r = await dialog.showOpenDialog(win, { title: 'Escolha a pasta antiga do Catalogame (a que tem biblioteca.json)', properties: ['openDirectory'] });
    if (r.canceled || !r.filePaths[0]) return null;
    const dir = r.filePaths[0];
    let txt;
    try { txt = await fsp.readFile(path.join(dir, 'biblioteca.json'), 'utf8'); }
    catch { return { erro: 'Essa pasta não tem o arquivo biblioteca.json.' }; }
    const data = JSON.parse(txt);
    // copia as capas
    let capas = 0;
    try {
      await fsp.mkdir(CAPAS(), { recursive: true });
      for (const f of await fsp.readdir(path.join(dir, 'capas'))) {
        const n = safeName(f); if (!n) continue;
        await fsp.copyFile(path.join(dir, 'capas', f), path.join(CAPAS(), n)); capas++;
      }
    } catch {}
    return { data, capas };
  }
  const r = await dialog.showOpenDialog(win, { title: 'Escolha o arquivo de backup do Catalogame', properties: ['openFile'], filters: [{ name: 'Backup do Catalogame', extensions: ['json'] }] });
  if (r.canceled || !r.filePaths[0]) return null;
  try { return { data: JSON.parse(await fsp.readFile(r.filePaths[0], 'utf8')), capas: 0 }; }
  catch (e) { return { erro: 'Esse arquivo não é um backup válido: ' + e.message }; }
});

app.whenReady().then(() => {
  DATA_DIR = resolveDataDir();
  createWindow();
});
