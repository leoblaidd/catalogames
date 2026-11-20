// Catalogames — processo principal (Electron)
// Os dados ficam em <pasta onde o app foi instalado>\dados
//   dados\biblioteca.json  -> jogos e listas
//   dados\capas\           -> imagens das capas
const { app, BrowserWindow, ipcMain, shell, dialog, net, nativeTheme } = require('electron');
const path = require('path');
const fs = require('fs');
const fsp = fs.promises;
const { pathToFileURL } = require('url');
const { spawn } = require('child_process');

const REPO = 'leoblaidd/catalogames';   // onde as versões são publicadas (Releases do GitHub)

app.setAppUserModelId('com.leandro.catalogame');

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
  // versões antigas (Catalogame, sem S) usavam essa pasta: continua nela se já existir
  const antigo = path.join(app.getPath('appData'), 'Catalogame', 'dados');
  if (fs.existsSync(path.join(antigo, 'biblioteca.json'))) return antigo;
  const alt = path.join(app.getPath('appData'), 'Catalogames', 'dados');
  fs.mkdirSync(alt, { recursive: true });
  return alt;
}
const LIB = () => path.join(DATA_DIR, 'biblioteca.json');
const CONF = () => path.join(DATA_DIR, 'config.json');
const CAPAS = () => path.join(DATA_DIR, 'capas');
const safeName = n => path.basename(String(n || '')).replace(/[^\w.\-]/g, '');

async function writeAtomic(file, data){
  const tmp = file + '.tmp';
  await fsp.writeFile(tmp, data);
  await fsp.rename(tmp, file);
}

/* ---------- configurações (tema, cor, visualização) ---------- */
let config = {};
function readConfig(){ try { config = JSON.parse(fs.readFileSync(CONF(), 'utf8')) || {}; } catch { config = {}; } }
function applyTheme(){
  nativeTheme.themeSource = config.tema === 'claro' ? 'light' : config.tema === 'auto' ? 'system' : 'dark';
}

/* ---------- janela ---------- */
let win;
function createWindow(){
  win = new BrowserWindow({
    width: 1440, height: 920, minWidth: 900, minHeight: 600,
    backgroundColor: nativeTheme.shouldUseDarkColors ? '#0d1016' : '#f3f5f9',
    title: 'Catalogames',
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
ipcMain.handle('cover:read', async (_e, name) => {
  name = safeName(name); if (!name) return null;
  try { return new Uint8Array(await fsp.readFile(path.join(CAPAS(), name))); } catch { return null; }
});
ipcMain.on('config:get', e => { e.returnValue = config; });
ipcMain.handle('config:set', async (_e, c) => {
  config = c && typeof c === 'object' ? c : {};
  applyTheme();
  await writeAtomic(CONF(), JSON.stringify(config, null, 2));
  return true;
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
    const r = await net.fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 Catalogames' } });
    if (!r.ok) return null;
    const type = (r.headers.get('content-type') || '').split(';')[0].trim();
    if (!type.startsWith('image/')) return null;
    const buf = await r.arrayBuffer();
    if (buf.byteLength > 25 * 1024 * 1024) return null;
    return { type, bytes: new Uint8Array(buf) };
  } catch { return null; }
});

/* ---------- SteamGridDB (API v2, precisa da chave do usuário) ---------- */
async function sgdb(rota){
  const key = String(config.sgdbKey || '').trim();
  if (!key) return { erro: 'sem-chave' };
  try {
    const r = await net.fetch('https://www.steamgriddb.com/api/v2' + rota, {
      headers: { Authorization: 'Bearer ' + key, 'User-Agent': 'Catalogames', Accept: 'application/json' },
    });
    if (r.status === 401 || r.status === 403) return { erro: 'chave' };
    if (r.status === 404) return { data: [] };
    const j = await r.json().catch(() => null);
    if (!r.ok || !j || j.success === false) return { erro: 'falha', detalhe: (j && j.errors && [].concat(j.errors).join(', ')) || ('HTTP ' + r.status) };
    return { data: Array.isArray(j.data) ? j.data : [] };
  } catch (e) { return { erro: 'rede', detalhe: e.message }; }
}
ipcMain.handle('sgdb:search', (_e, termo) => {
  termo = String(termo || '').trim(); if (!termo) return { data: [] };
  return sgdb('/search/autocomplete/' + encodeURIComponent(termo));
});
ipcMain.handle('sgdb:grids', (_e, gameId, page, estilo) => {
  const id = parseInt(gameId, 10); if (!id) return { data: [] };
  const q = new URLSearchParams({ dimensions: '600x900,342x482,660x930', types: 'static', nsfw: 'false', humor: 'any', limit: '50', page: String(parseInt(page, 10) || 0) });
  if (/^[a-z_]+$/.test(estilo || '')) q.set('styles', estilo);
  return sgdb(`/grids/game/${id}?${q}`);
});

/* ---------- atualizações (Releases do GitHub) ---------- */
const cmpVer = (a, b) => {
  const pa = String(a).split(/[.-]/).map(n => parseInt(n, 10) || 0), pb = String(b).split(/[.-]/).map(n => parseInt(n, 10) || 0);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) { const d = (pa[i] || 0) - (pb[i] || 0); if (d) return d; }
  return 0;
};
let ultimoAsset = null;
ipcMain.handle('update:check', async () => {
  try {
    const r = await net.fetch(`https://api.github.com/repos/${REPO}/releases/latest`, {
      headers: { 'User-Agent': 'Catalogames', Accept: 'application/vnd.github+json' },
    });
    if (r.status === 404) return { erro: 'sem-release', atual: app.getVersion() };
    if (!r.ok) return { erro: 'falha', detalhe: 'HTTP ' + r.status, atual: app.getVersion() };
    const j = await r.json();
    const versao = String(j.tag_name || j.name || '').replace(/^[^\d]*/, '');
    const a = (j.assets || []).find(x => /\.exe$/i.test(x.name));
    ultimoAsset = a ? { nome: a.name, url: a.browser_download_url, tamanho: a.size } : null;
    return { atual: app.getVersion(), versao, nova: !!versao && cmpVer(versao, app.getVersion()) > 0,
      titulo: j.name || j.tag_name, notas: j.body || '', pagina: j.html_url, temInstalador: !!ultimoAsset, tamanho: ultimoAsset && ultimoAsset.tamanho };
  } catch (e) { return { erro: 'rede', detalhe: e.message, atual: app.getVersion() }; }
});
ipcMain.handle('update:install', async e => {
  const a = ultimoAsset;
  if (!a || !/^https:\/\/github\.com\//.test(a.url)) return { erro: 'Nenhum instalador encontrado nessa versão.' };
  try {
    const r = await net.fetch(a.url, { headers: { 'User-Agent': 'Catalogames' } });
    if (!r.ok || !r.body) return { erro: 'Download falhou (HTTP ' + r.status + ').' };
    const total = Number(r.headers.get('content-length')) || a.tamanho || 0;
    const destino = path.join(app.getPath('temp'), safeName(a.nome) || 'Catalogames-Instalador.exe');
    const out = fs.createWriteStream(destino);
    const reader = r.body.getReader();
    let recebido = 0, ultimo = 0;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      recebido += value.length;
      if (!out.write(Buffer.from(value))) await new Promise(res => out.once('drain', res));
      if (Date.now() - ultimo > 150) { ultimo = Date.now(); e.sender.send('update:progress', { recebido, total }); }
    }
    await new Promise((res, rej) => out.end(err => err ? rej(err) : res()));
    e.sender.send('update:progress', { recebido, total: total || recebido });
    // abre o instalador e fecha o app pra ele poder atualizar os arquivos
    const proc = spawn(destino, [], { detached: true, stdio: 'ignore' });
    proc.on('error', () => {}); proc.unref();
    setTimeout(() => app.quit(), 1200);
    return { ok: true };
  } catch (err) { return { erro: err.message }; }
});
ipcMain.handle('open-external', (_e, url) => { if (/^https:\/\//.test(url)) shell.openExternal(url); });

/* ---------- salvar imagem exportada ---------- */
ipcMain.handle('save-png', async (_e, nome, bytes) => {
  const sugerido = (String(nome || 'Catalogames').replace(/[\\/:*?"<>|]+/g, ' ').trim() || 'Catalogames') + '.png';
  const r = await dialog.showSaveDialog(win, {
    title: 'Salvar imagem', defaultPath: path.join(app.getPath('downloads'), sugerido),
    filters: [{ name: 'Imagem PNG', extensions: ['png'] }],
  });
  if (r.canceled || !r.filePath) return null;
  await fsp.writeFile(r.filePath, Buffer.from(bytes));
  return r.filePath;
});
ipcMain.handle('show-in-folder', (_e, f) => { if (f) shell.showItemInFolder(f); });

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
  readConfig(); applyTheme();
  createWindow();
});
