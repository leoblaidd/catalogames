// Catalogames (Tauri) — ponte entre a interface e o disco.
// Faz o mesmo papel do preload.js da versão Electron: cria window.catalogame
// com exatamente as mesmas funções, então o index.html não precisa mudar.
(() => {
  if (window.catalogame) return;
  const T = () => window.__TAURI__ || {};
  const invoke = (cmd, args, opts) => (T().core || window.__TAURI_INTERNALS__).invoke(cmd, args, opts);
  let CONFIG = window.__CG_CONFIG__ || {};

  const bytesDe = b => b instanceof Uint8Array ? b : new Uint8Array(b || []);
  const comoBytes = r => r instanceof ArrayBuffer ? new Uint8Array(r) : Array.isArray(r) ? new Uint8Array(r) : bytesDe(r);

  // capas: o normal é o <img> ler direto da pasta (protocolo "asset" do Tauri).
  // Se esse caminho não carregar imagem nesse PC, cai pra um plano B que sempre funciona:
  // lê a capa pela ponte e entrega como blob (o "#" no fim deixa o app colar ?v=… sem quebrar).
  let modo = null;           // null = ainda não testou, 'proto' ou 'blob'
  const blobs = new Map();
  const MIME = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp', gif: 'image/gif', svg: 'image/svg+xml', avif: 'image/avif', bmp: 'image/bmp' };
  const esquecer = name => { const b = blobs.get(String(name)); if (b) { URL.revokeObjectURL(b.cru); blobs.delete(String(name)); } };
  const testar = u => new Promise(res => { const i = new Image(); const t = setTimeout(() => res(false), 4000); i.onload = () => { clearTimeout(t); res(i.naturalWidth > 0); }; i.onerror = () => { clearTimeout(t); res(false); }; i.src = u; });
  async function urlCapa(name){
    const u = await invoke('cover_url', { name });
    if (!u) return null;
    if (!modo) modo = testar(u).then(ok => ok ? 'proto' : 'blob');
    if (await modo === 'proto') return u;
    if (blobs.has(name)) return blobs.get(name).url;
    const b = comoBytes(await invoke('cover_read', { name }));
    if (!b.length) return null;
    const cru = URL.createObjectURL(new Blob([b], { type: MIME[name.split('.').pop().toLowerCase()] || 'image/jpeg' }));
    blobs.set(name, { cru, url: cru + '#' });
    return cru + '#';
  }

  window.catalogame = {
    info:           ()            => invoke('info'),
    load:           async ()      => { const t = await invoke('load'); return t == null ? null : JSON.parse(t); },
    save:           json          => invoke('save', { json }),
    writeCover:     (name, bytes) => { esquecer(name); return invoke('cover_write', bytesDe(bytes), { headers: { 'x-nome': encodeURIComponent(name) } }); },
    removeCover:    name          => { esquecer(name); return invoke('cover_remove', { name: String(name || '') }); },
    coverURL:       name          => urlCapa(String(name || '')),
    readCover:      async name    => { try { const b = comoBytes(await invoke('cover_read', { name: String(name || '') })); return b.length ? b : null; } catch { return null; } },
    getConfig:      ()            => CONFIG,
    setConfig:      c             => { CONFIG = c && typeof c === 'object' ? c : {}; return invoke('config_set', { c: CONFIG }); },
    fetchImage:     async url     => {
      try {
        const b = comoBytes(await invoke('fetch_image', { url: String(url || '') }));
        const i = b.indexOf(10); if (!b.length || i < 0) return null;
        return { type: new TextDecoder().decode(b.subarray(0, i)), bytes: b.slice(i + 1) };
      } catch { return null; }
    },
    openDataFolder: ()            => invoke('open_data_folder'),
    updateCheck:    ()            => invoke('update_check'),
    updateInstall:  ()            => invoke('update_install'),
    onUpdateProgress: cb          => { const ev = T().event; if (ev) ev.listen('update-progress', e => cb(e.payload)); else window.__TAURI_INTERNALS__.invoke('plugin:event|listen', { event: 'update-progress', target: { kind: 'Any' }, handler: window.__TAURI_INTERNALS__.transformCallback(e => cb(e.payload)) }); },
    openExternal:   url           => invoke('open_external', { url: String(url || '') }),
    savePng:        (nome, bytes) => invoke('save_png', bytesDe(bytes), { headers: { 'x-nome': encodeURIComponent(String(nome || 'Catalogames')) } }),
    showInFolder:   f             => invoke('show_in_folder', { f: String(f || '') }),
    sgdbSearch:     termo         => invoke('sgdb_search', { termo: String(termo || '') }),
    sgdbGrids:      (id, page, st, tipo) => invoke('sgdb_grids', { gameId: String(id ?? ''), page: Number(page) || 0, estilo: String(st || ''), tipo: String(tipo || '') }),
    importPick:     kind          => invoke('import_pick', { kind: String(kind || '') }),
    // janela (o app desenha a própria barra de título)
    janela: (() => {
      const w = () => T().window && T().window.getCurrentWindow ? T().window.getCurrentWindow() : null;
      const cmd = (c, extra = {}) => invoke('plugin:window|' + c, { label: 'main', ...extra });
      return {
        minimizar:  () => w() ? w().minimize() : cmd('minimize'),
        maximizar:  () => w() ? w().toggleMaximize() : cmd('toggle_maximize'),
        fechar:     () => w() ? w().close() : cmd('close'),
        arrastar:   () => w() ? w().startDragging() : cmd('start_dragging'),
        maximizada: () => w() ? w().isMaximized() : cmd('is_maximized'),
        aoMudar:    cb => { const x = w(); if (x) x.onResized(() => cb()); },
      };
    })(),
  };

  // links pra fora (Google Imagens, SteamGridDB…) abrem no navegador do PC, como no Electron
  const externo = u => /^https?:/i.test(u) && !String(u).startsWith(location.origin);
  document.addEventListener('click', e => {
    const a = e.target.closest && e.target.closest('a[href]');
    if (a && externo(a.href)) { e.preventDefault(); invoke('open_external', { url: a.href }); }
  }, true);
  window.open = u => { if (externo(String(u))) invoke('open_external', { url: String(u) }); return null; };

  // sem menu de navegador no botão direito (fica só nos campos de texto)
  document.addEventListener('contextmenu', e => {
    if (!e.target.closest || !e.target.closest('input,textarea,[contenteditable]')) e.preventDefault();
  });
  // atalhos de navegador que não fazem sentido num app (recarregar, imprimir, procurar…)
  document.addEventListener('keydown', e => {
    const k = (e.key || '').toLowerCase(), c = e.ctrlKey || e.metaKey;
    if (k === 'f5' || k === 'f3' || k === 'f7' || (c && ['r', 'p', 'f', 'g', 'j', 'u', 's', 'h', 'o', 'n', 't', 'w'].includes(k)) || (e.altKey && (k === 'arrowleft' || k === 'arrowright')))
      e.preventDefault();
  }, true);
})();
