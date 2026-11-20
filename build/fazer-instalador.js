// Gera o instalador do Windows sem precisar de Wine:
//   1) electron-builder monta a pasta do app (win-unpacked), sem editar o .exe
//   2) resedit coloca ícone e versão no Catalogames.exe
//   3) makensis compila build/instalador.nsi
// Uso: node build/fazer-instalador.js
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const ResEdit = require('resedit');

const raiz = path.join(__dirname, '..');
const pkg = require(path.join(raiz, 'package.json'));
const versao = pkg.version;
const dist = path.join(raiz, 'dist');
const unpacked = path.join(dist, 'win-unpacked');

console.log('1/3 montando o app…');
fs.rmSync(dist, { recursive: true, force: true });
execFileSync(process.execPath, [require.resolve('electron-builder/cli.js'), '--win', 'dir', '--x64', '-c.win.signAndEditExecutable=false'], { cwd: raiz, stdio: 'inherit' });

console.log('2/3 ícone e versão no .exe…');
const exe = path.join(unpacked, 'Catalogames.exe');
const data = fs.readFileSync(exe);
const res = ResEdit.NtExecutableResource.from(ResEdit.NtExecutable.from(data, { ignoreCert: true }));
const ico = ResEdit.Data.IconFile.from(fs.readFileSync(path.join(__dirname, 'icon.ico')));
const grupos = ResEdit.Resource.IconGroupEntry.fromEntries(res.entries);
const idIcone = grupos.length ? grupos[0].id : 1, lang = grupos.length ? grupos[0].lang : 1033;
ResEdit.Resource.IconGroupEntry.replaceIconsForResource(res.entries, idIcone, lang, ico.icons.map(i => i.data));
const vi = ResEdit.Resource.VersionInfo.fromEntries(res.entries)[0] || ResEdit.Resource.VersionInfo.createEmpty();
const [ma, mi, pa] = versao.split('.').map(n => parseInt(n, 10) || 0);
vi.setFileVersion(ma, mi, pa, 0, 1033); vi.setProductVersion(ma, mi, pa, 0, 1033);
vi.setStringValues({ lang: 1033, codepage: 1200 }, {
  FileDescription: 'Catalogames', ProductName: 'Catalogames', CompanyName: 'leoblaidd',
  FileVersion: versao, ProductVersion: versao, OriginalFilename: 'Catalogames.exe', InternalName: 'Catalogames', LegalCopyright: 'leoblaidd',
});
vi.outputToResourceEntries(res.entries);
const novo = ResEdit.NtExecutable.from(data, { ignoreCert: true });
res.outputResource(novo);
fs.writeFileSync(exe, Buffer.from(novo.generate()));

console.log('3/3 compilando o instalador…');
const cache = path.join(require('os').homedir(), '.cache', 'electron-builder', 'nsis-3.0.4.1');
const bundle = fs.readdirSync(cache).map(d => path.join(cache, d)).find(d => fs.existsSync(path.join(d, 'linux', 'makensis')));
if (!bundle) throw new Error('makensis não encontrado no cache do electron-builder');
const out = path.join(dist, `Catalogames-Instalador-${versao}.exe`);
execFileSync(path.join(bundle, 'linux', 'makensis'), ['-V2', `-DVERSION=${versao}`, `-DSRC=${unpacked}`, `-DOUT=${out}`, path.join(__dirname, 'instalador.nsi')],
  { cwd: __dirname, stdio: 'inherit', env: { ...process.env, NSISDIR: bundle } });
console.log('Pronto:', out, Math.round(fs.statSync(out).size / 1048576) + ' MB');
