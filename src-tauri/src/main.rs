// Catalogames — versão experimental em Tauri (Rust).
// Faz exatamente o que o main.js da versão Electron fazia:
//   os dados ficam em <pasta onde o app foi instalado>\dados
//   dados\biblioteca.json  -> jogos e listas
//   dados\config.json      -> tema, cor, visualização, chave do SteamGridDB…
//   dados\capas\           -> imagens das capas
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use serde_json::{json, Value};
use std::{
    fs,
    io::{Read, Write},
    path::{Path, PathBuf},
    sync::Mutex,
    time::{Duration, Instant},
};
use tauri::{
    ipc::{InvokeBody, Request, Response},
    AppHandle, Emitter, Manager, WebviewUrl, WebviewWindowBuilder,
};
use tauri_plugin_dialog::DialogExt;
use tauri_plugin_opener::OpenerExt;

const REPO: &str = "leoblaidd/catalogames"; // onde as versões são publicadas (Releases do GitHub)
const PONTE: &str = include_str!("ponte.js");

#[derive(Clone)]
struct Asset {
    nome: String,
    url: String,
    tamanho: u64,
}
struct Estado {
    dados: PathBuf,
    fallback: bool,
    config: Mutex<Value>,
    ultimo_asset: Mutex<Option<Asset>>,
}

/* ---------- onde ficam os dados ---------- */
fn pode_escrever(dir: &Path) -> bool {
    if fs::create_dir_all(dir).is_err() {
        return false;
    }
    let t = dir.join(".teste-escrita");
    fs::write(&t, "ok").is_ok() && fs::remove_file(&t).is_ok()
}
fn pasta_appdata() -> PathBuf {
    if let Ok(p) = std::env::var("APPDATA") {
        return PathBuf::from(p);
    }
    std::env::var("HOME").map(|h| PathBuf::from(h).join(".config")).unwrap_or_else(|_| PathBuf::from("."))
}
fn resolver_dados() -> (PathBuf, bool) {
    if let Ok(p) = std::env::var("CATALOGAME_DADOS") {
        return (PathBuf::from(p), false); // usado nos testes
    }
    let base = std::env::current_exe()
        .ok()
        .and_then(|e| e.parent().map(Path::to_path_buf))
        .unwrap_or_else(|| PathBuf::from("."));
    let preferido = base.join("dados");
    if pode_escrever(&preferido) {
        return (preferido, false);
    }
    // pasta de instalação sem permissão de escrita (ex.: Arquivos de Programas)
    let antigo = pasta_appdata().join("Catalogame").join("dados");
    if antigo.join("biblioteca.json").exists() {
        return (antigo, true);
    }
    let alt = pasta_appdata().join("Catalogames").join("dados");
    let _ = fs::create_dir_all(&alt);
    (alt, true)
}

fn safe_name(n: &str) -> String {
    let base = n.rsplit(['/', '\\']).next().unwrap_or("");
    base.chars().filter(|c| c.is_ascii_alphanumeric() || matches!(c, '_' | '.' | '-')).collect()
}
fn write_atomic(file: &Path, data: &[u8]) -> std::io::Result<()> {
    let mut tmp = file.as_os_str().to_owned();
    tmp.push(".tmp");
    let tmp = PathBuf::from(tmp);
    fs::write(&tmp, data)?;
    fs::rename(&tmp, file)
}
fn pct_decode(s: &str) -> String {
    let b = s.as_bytes();
    let mut out = Vec::with_capacity(b.len());
    let mut i = 0;
    while i < b.len() {
        if b[i] == b'%' && i + 2 < b.len() {
            let hex = |c: u8| (c as char).to_digit(16);
            if let (Some(a), Some(z)) = (hex(b[i + 1]), hex(b[i + 2])) {
                let v = (a * 16 + z) as u8;
                out.push(v);
                i += 3;
                continue;
            }
        }
        out.push(b[i]);
        i += 1;
    }
    String::from_utf8_lossy(&out).into_owned()
}
// igual ao encodeURIComponent do JavaScript
fn pct_encode(s: &str) -> String {
    let mut o = String::new();
    for &c in s.as_bytes() {
        if c.is_ascii_alphanumeric() || b"-_.!~*'()".contains(&c) {
            o.push(c as char);
        } else {
            o.push_str(&format!("%{:02X}", c));
        }
    }
    o
}
fn estado(app: &AppHandle) -> tauri::State<'_, Estado> {
    app.state::<Estado>()
}
fn capas(app: &AppHandle) -> PathBuf {
    estado(app).dados.join("capas")
}
async fn bloqueante<T: Send + 'static>(f: impl FnOnce() -> T + Send + 'static) -> T {
    tauri::async_runtime::spawn_blocking(f).await.expect("tarefa interrompida")
}
fn corpo(req: &Request<'_>) -> Vec<u8> {
    match req.body() {
        InvokeBody::Raw(b) => b.clone(),
        InvokeBody::Json(Value::Array(a)) => a.iter().map(|v| v.as_u64().unwrap_or(0) as u8).collect(),
        _ => Vec::new(),
    }
}
fn cabecalho(req: &Request<'_>, nome: &str) -> String {
    req.headers().get(nome).and_then(|v| v.to_str().ok()).map(pct_decode).unwrap_or_default()
}

/* ---------- configurações (tema, cor, visualização) ---------- */
fn ler_config(dados: &Path) -> Value {
    fs::read_to_string(dados.join("config.json"))
        .ok()
        .and_then(|t| serde_json::from_str::<Value>(&t).ok())
        .filter(Value::is_object)
        .unwrap_or_else(|| json!({}))
}
fn tema_de(c: &Value) -> Option<tauri::Theme> {
    match c.get("tema").and_then(Value::as_str) {
        Some("claro") => Some(tauri::Theme::Light),
        Some("auto") => None,
        _ => Some(tauri::Theme::Dark),
    }
}
fn aplicar_tema(app: &AppHandle) {
    let t = tema_de(&estado(app).config.lock().unwrap());
    if let Some(w) = app.get_webview_window("main") {
        let _ = w.set_theme(t);
    }
}

/* ---------- internet ---------- */
fn agente() -> ureq::Agent {
    let mut b = ureq::AgentBuilder::new()
        .timeout_connect(Duration::from_secs(20))
        .timeout_read(Duration::from_secs(60))
        .user_agent("Mozilla/5.0 Catalogames");
    if let Ok(tls) = native_tls::TlsConnector::new() {
        b = b.tls_connector(std::sync::Arc::new(tls));
    }
    b.build()
}
fn base_sgdb() -> String {
    std::env::var("CG_TESTE_SGDB").unwrap_or_else(|_| "https://www.steamgriddb.com/api/v2".into())
}
fn base_github() -> String {
    std::env::var("CG_TESTE_GITHUB").unwrap_or_else(|_| "https://api.github.com".into())
}

/* ---------- ponte com a interface ---------- */
#[tauri::command]
fn info(app: AppHandle) -> Value {
    let st = estado(&app);
    json!({
        "dados": st.dados.to_string_lossy(),
        "fallback": st.fallback,
        "versao": format!("{} (experimental Tauri)", app.package_info().version),
    })
}

#[tauri::command(async)]
fn load(app: AppHandle) -> Result<Option<String>, String> {
    let dados = estado(&app).dados.clone();
    let lib = dados.join("biblioteca.json");
    let backup = dados.join("biblioteca.backup.json");
    let valido = |t: &str| serde_json::from_str::<serde::de::IgnoredAny>(t).is_ok();
    let erro = match fs::read_to_string(&lib) {
        Err(e) if e.kind() == std::io::ErrorKind::NotFound => return Ok(None),
        Err(e) => e.to_string(),
        Ok(txt) => {
            if txt.trim().is_empty() {
                return Ok(None);
            }
            if valido(&txt) {
                let _ = fs::write(&backup, &txt); // cópia de segurança a cada abertura (só a última)
                return Ok(Some(txt));
            }
            "o arquivo está corrompido".into()
        }
    };
    // arquivo corrompido: tenta a cópia de segurança
    match fs::read_to_string(&backup) {
        Ok(b) if valido(&b) => Ok(Some(b)),
        _ => Err(format!("Não consegui ler biblioteca.json: {erro}")),
    }
}

#[tauri::command(async)]
fn save(app: AppHandle, json: String) -> Result<bool, String> {
    let dados = estado(&app).dados.clone();
    fs::create_dir_all(&dados).map_err(|e| e.to_string())?;
    write_atomic(&dados.join("biblioteca.json"), json.as_bytes()).map_err(|e| e.to_string())?;
    Ok(true)
}

#[tauri::command]
fn cover_write(app: AppHandle, request: Request<'_>) -> Result<String, String> {
    let name = safe_name(&cabecalho(&request, "x-nome"));
    if name.is_empty() {
        return Err("nome de capa inválido".into());
    }
    let dir = capas(&app);
    fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    write_atomic(&dir.join(&name), &corpo(&request)).map_err(|e| e.to_string())?;
    Ok(name)
}
#[tauri::command(async)]
fn cover_read(app: AppHandle, name: String) -> Response {
    let name = safe_name(&name);
    let b = if name.is_empty() { Vec::new() } else { fs::read(capas(&app).join(name)).unwrap_or_default() };
    Response::new(b)
}
#[tauri::command]
fn cover_remove(app: AppHandle, name: String) {
    let name = safe_name(&name);
    if !name.is_empty() {
        let _ = fs::remove_file(capas(&app).join(name));
    }
}
#[tauri::command]
fn cover_url(app: AppHandle, name: String) -> Option<String> {
    let name = safe_name(&name);
    if name.is_empty() || !capas(&app).join(&name).exists() {
        return None;
    }
    let f = capas(&app).join(&name);
    #[cfg(windows)]
    let base = "http://asset.localhost/";
    #[cfg(not(windows))]
    let base = "asset://localhost/";
    Some(format!("{base}{}", pct_encode(&f.to_string_lossy())))
}

#[tauri::command(async)]
fn config_set(app: AppHandle, c: Value) -> Result<bool, String> {
    let c = if c.is_object() { c } else { json!({}) };
    let txt = serde_json::to_string_pretty(&c).map_err(|e| e.to_string())?;
    *estado(&app).config.lock().unwrap() = c;
    aplicar_tema(&app);
    write_atomic(&estado(&app).dados.join("config.json"), txt.as_bytes()).map_err(|e| e.to_string())?;
    Ok(true)
}

// baixa uma imagem da internet (sem as travas de CORS do navegador)
// resposta: "tipo/da-imagem\n" + bytes
#[tauri::command(async)]
fn fetch_image(url: String) -> Response {
    let baixar = || -> Option<Vec<u8>> {
        let min = url.to_ascii_lowercase();
        if !(min.starts_with("http://") || min.starts_with("https://")) {
            return None;
        }
        let r = agente().get(&url).call().ok()?;
        let tipo = r.header("content-type").unwrap_or("").split(';').next().unwrap_or("").trim().to_string();
        if !tipo.starts_with("image/") {
            return None;
        }
        let mut buf = Vec::new();
        r.into_reader().take(25 * 1024 * 1024 + 1).read_to_end(&mut buf).ok()?;
        if buf.len() > 25 * 1024 * 1024 {
            return None;
        }
        let mut out = tipo.into_bytes();
        out.push(b'\n');
        out.extend(buf);
        Some(out)
    };
    Response::new(baixar().unwrap_or_default())
}

/* ---------- SteamGridDB (API v2, precisa da chave do usuário) ---------- */
fn sgdb(app: &AppHandle, rota: &str) -> Value {
    let key = estado(app).config.lock().unwrap().get("sgdbKey").and_then(Value::as_str).unwrap_or("").trim().to_string();
    if key.is_empty() {
        return json!({ "erro": "sem-chave" });
    }
    let req = agente()
        .get(&format!("{}{}", base_sgdb(), rota))
        .set("Authorization", &format!("Bearer {key}"))
        .set("User-Agent", "Catalogames")
        .set("Accept", "application/json");
    let detalhe = |j: &Option<Value>, status: u16| -> String {
        j.as_ref()
            .and_then(|j| j.get("errors"))
            .map(|e| match e {
                Value::Array(a) => a.iter().map(|x| x.as_str().map(String::from).unwrap_or_else(|| x.to_string())).collect::<Vec<_>>().join(", "),
                Value::String(s) => s.clone(),
                o => o.to_string(),
            })
            .filter(|s| !s.is_empty())
            .unwrap_or_else(|| format!("HTTP {status}"))
    };
    match req.call() {
        Ok(r) => {
            let status = r.status();
            let j: Option<Value> = r.into_json().ok();
            match &j {
                Some(v) if v.get("success") != Some(&Value::Bool(false)) => {
                    json!({ "data": v.get("data").filter(|d| d.is_array()).cloned().unwrap_or_else(|| json!([])) })
                }
                _ => json!({ "erro": "falha", "detalhe": detalhe(&j, status) }),
            }
        }
        Err(ureq::Error::Status(401 | 403, _)) => json!({ "erro": "chave" }),
        Err(ureq::Error::Status(404, _)) => json!({ "data": [] }),
        Err(ureq::Error::Status(s, r)) => {
            let j: Option<Value> = r.into_json().ok();
            json!({ "erro": "falha", "detalhe": detalhe(&j, s) })
        }
        Err(e) => json!({ "erro": "rede", "detalhe": e.to_string() }),
    }
}
#[tauri::command(async)]
fn sgdb_search(app: AppHandle, termo: String) -> Value {
    let termo = termo.trim();
    if termo.is_empty() {
        return json!({ "data": [] });
    }
    sgdb(&app, &format!("/search/autocomplete/{}", pct_encode(termo)))
}
#[tauri::command(async)]
fn sgdb_grids(app: AppHandle, game_id: String, page: i64, estilo: String, tipo: String) -> Value {
    let id: i64 = game_id.trim().chars().take_while(|c| c.is_ascii_digit()).collect::<String>().parse().unwrap_or(0);
    if id == 0 {
        return json!({ "data": [] });
    }
    let heroes = tipo == "heroes";
    let mut q = format!("types=static&nsfw=false&humor=any&limit=50&page={}", page.max(0));
    if !heroes {
        q.push_str("&dimensions=600x900%2C342x482%2C660x930"); // capas verticais
    }
    if !estilo.is_empty() && estilo.chars().all(|c| c.is_ascii_lowercase() || c == '_') {
        q.push_str(&format!("&styles={estilo}"));
    }
    sgdb(&app, &format!("/{}/game/{id}?{q}", if heroes { "heroes" } else { "grids" })) // heroes = banners largos
}

/* ---------- atualizações (Releases do GitHub) ---------- */
fn cmp_ver(a: &str, b: &str) -> i64 {
    let p = |s: &str| s.split(['.', '-']).map(|n| n.trim().chars().take_while(|c| c.is_ascii_digit()).collect::<String>().parse::<i64>().unwrap_or(0)).collect::<Vec<_>>();
    let (pa, pb) = (p(a), p(b));
    for i in 0..pa.len().max(pb.len()) {
        let d = pa.get(i).copied().unwrap_or(0) - pb.get(i).copied().unwrap_or(0);
        if d != 0 {
            return d;
        }
    }
    0
}
#[tauri::command(async)]
fn update_check(app: AppHandle) -> Value {
    let atual = app.package_info().version.to_string();
    let r = agente()
        .get(&format!("{}/repos/{REPO}/releases/latest", base_github()))
        .set("User-Agent", "Catalogames")
        .set("Accept", "application/vnd.github+json")
        .call();
    let j: Value = match r {
        Ok(r) => match r.into_json() {
            Ok(j) => j,
            Err(e) => return json!({ "erro": "rede", "detalhe": e.to_string(), "atual": atual }),
        },
        Err(ureq::Error::Status(404, _)) => return json!({ "erro": "sem-release", "atual": atual }),
        Err(ureq::Error::Status(s, _)) => return json!({ "erro": "falha", "detalhe": format!("HTTP {s}"), "atual": atual }),
        Err(e) => return json!({ "erro": "rede", "detalhe": e.to_string(), "atual": atual }),
    };
    let s = |k: &str| j.get(k).and_then(Value::as_str).unwrap_or("").to_string();
    let tag = if s("tag_name").is_empty() { s("name") } else { s("tag_name") };
    let versao: String = tag.trim_start_matches(|c: char| !c.is_ascii_digit()).to_string();
    let asset = j.get("assets").and_then(Value::as_array).and_then(|a| {
        a.iter().find(|x| x.get("name").and_then(Value::as_str).map(|n| n.to_lowercase().ends_with(".exe")).unwrap_or(false))
    });
    let asset = asset.map(|a| Asset {
        nome: a.get("name").and_then(Value::as_str).unwrap_or("").into(),
        url: a.get("browser_download_url").and_then(Value::as_str).unwrap_or("").into(),
        tamanho: a.get("size").and_then(Value::as_u64).unwrap_or(0),
    });
    let tamanho = asset.as_ref().map(|a| a.tamanho);
    let tem = asset.is_some();
    *estado(&app).ultimo_asset.lock().unwrap() = asset;
    json!({
        "atual": atual,
        "versao": versao,
        "nova": !versao.is_empty() && cmp_ver(&versao, &atual) > 0,
        "titulo": if s("name").is_empty() { tag.clone() } else { s("name") },
        "notas": s("body"),
        "pagina": s("html_url"),
        "temInstalador": tem,
        "tamanho": tamanho,
    })
}
#[tauri::command(async)]
fn update_install(app: AppHandle) -> Value {
    let a = estado(&app).ultimo_asset.lock().unwrap().clone();
    let permitido = |u: &str| u.starts_with("https://github.com/") || std::env::var("CG_TESTE_GITHUB").map(|b| u.starts_with(&b)).unwrap_or(false);
    let Some(a) = a.filter(|a| permitido(&a.url)) else {
        return json!({ "erro": "Nenhum instalador encontrado nessa versão." });
    };
    let baixar = || -> Result<PathBuf, String> {
        let r = agente().get(&a.url).set("User-Agent", "Catalogames").call().map_err(|e| match e {
            ureq::Error::Status(s, _) => format!("Download falhou (HTTP {s})."),
            e => e.to_string(),
        })?;
        let total: u64 = r.header("content-length").and_then(|v| v.parse().ok()).unwrap_or(a.tamanho);
        let nome = safe_name(&a.nome);
        let destino = std::env::temp_dir().join(if nome.is_empty() { "Catalogames-Instalador.exe".into() } else { nome });
        let mut out = fs::File::create(&destino).map_err(|e| e.to_string())?;
        let mut rd = r.into_reader();
        let mut buf = vec![0u8; 64 * 1024];
        let (mut recebido, mut ultimo) = (0u64, Instant::now() - Duration::from_secs(1));
        loop {
            let n = rd.read(&mut buf).map_err(|e| e.to_string())?;
            if n == 0 {
                break;
            }
            out.write_all(&buf[..n]).map_err(|e| e.to_string())?;
            recebido += n as u64;
            if ultimo.elapsed() > Duration::from_millis(150) {
                ultimo = Instant::now();
                let _ = app.emit("update-progress", json!({ "recebido": recebido, "total": total }));
            }
        }
        out.flush().map_err(|e| e.to_string())?;
        drop(out);
        let _ = app.emit("update-progress", json!({ "recebido": recebido, "total": if total > 0 { total } else { recebido } }));
        Ok(destino)
    };
    match baixar() {
        Ok(destino) => {
            if std::env::var("CG_TESTE_GITHUB").is_ok() {
                return json!({ "ok": true, "teste": destino.to_string_lossy() });
            }
            // abre o instalador e fecha o app pra ele poder atualizar os arquivos
            let mut cmd = std::process::Command::new(&destino);
            #[cfg(windows)]
            {
                use std::os::windows::process::CommandExt;
                cmd.creation_flags(0x0000_0008); // DETACHED_PROCESS
            }
            if let Err(e) = cmd.spawn() {
                return json!({ "erro": e.to_string() });
            }
            let h = app.clone();
            std::thread::spawn(move || {
                std::thread::sleep(Duration::from_millis(1200));
                h.exit(0);
            });
            json!({ "ok": true })
        }
        Err(e) => json!({ "erro": e }),
    }
}
#[tauri::command]
fn open_external(app: AppHandle, url: String) {
    if url.starts_with("https://") || url.starts_with("http://") {
        let _ = app.opener().open_url(url, None::<&str>);
    }
}

/* ---------- salvar imagem exportada ---------- */
#[tauri::command]
async fn save_png(app: AppHandle, request: Request<'_>) -> Result<Option<String>, String> {
    let bytes = corpo(&request);
    let nome = cabecalho(&request, "x-nome");
    let limpo: String = nome.chars().map(|c| if "\\/:*?\"<>|".contains(c) { ' ' } else { c }).collect::<String>().trim().to_string();
    let sugerido = format!("{}.png", if limpo.is_empty() { "Catalogames".into() } else { limpo });
    let destino: Option<PathBuf> = if let Ok(t) = std::env::var("CG_TESTE_SALVAR") {
        Some(PathBuf::from(t).join(&sugerido))
    } else {
        let mut d = app.dialog().file().set_title("Salvar imagem").set_file_name(&sugerido).add_filter("Imagem PNG", &["png"]);
        if let Ok(p) = app.path().download_dir() {
            d = d.set_directory(p);
        }
        if let Some(w) = app.get_webview_window("main") {
            d = d.set_parent(&w);
        }
        bloqueante(move || d.blocking_save_file()).await.and_then(|f| f.into_path().ok())
    };
    let Some(destino) = destino else { return Ok(None) };
    fs::write(&destino, bytes).map_err(|e| e.to_string())?;
    Ok(Some(destino.to_string_lossy().into_owned()))
}
#[tauri::command]
fn show_in_folder(app: AppHandle, f: String) {
    if !f.is_empty() && std::env::var("CG_TESTE_SALVAR").is_err() {
        let _ = app.opener().reveal_item_in_dir(f);
    }
}
#[tauri::command]
fn open_data_folder(app: AppHandle) {
    let d = estado(&app).dados.to_string_lossy().into_owned();
    let _ = app.opener().open_path(d, None::<&str>);
}

// importar do Catalogame antigo (pasta com biblioteca.json + capas, ou arquivo de backup .json)
#[tauri::command]
async fn import_pick(app: AppHandle, kind: String) -> Result<Value, String> {
    let teste = std::env::var("CG_TESTE_ABRIR").ok().map(PathBuf::from);
    let pai = app.get_webview_window("main");
    if kind == "folder" {
        let dir = match teste {
            Some(t) => Some(t),
            None => {
                let mut d = app.dialog().file().set_title("Escolha a pasta antiga do Catalogame (a que tem biblioteca.json)");
                if let Some(w) = &pai {
                    d = d.set_parent(w);
                }
                bloqueante(move || d.blocking_pick_folder()).await.and_then(|f| f.into_path().ok())
            }
        };
        let Some(dir) = dir else { return Ok(Value::Null) };
        let Ok(txt) = fs::read_to_string(dir.join("biblioteca.json")) else {
            return Ok(json!({ "erro": "Essa pasta não tem o arquivo biblioteca.json." }));
        };
        let data: Value = serde_json::from_str(&txt).map_err(|e| e.to_string())?;
        // copia as capas
        let mut n = 0;
        let destino = capas(&app);
        let _ = fs::create_dir_all(&destino);
        if let Ok(rd) = fs::read_dir(dir.join("capas")) {
            for e in rd.flatten() {
                let nome = safe_name(&e.file_name().to_string_lossy());
                if !nome.is_empty() && fs::copy(e.path(), destino.join(&nome)).is_ok() {
                    n += 1;
                }
            }
        }
        return Ok(json!({ "data": data, "capas": n }));
    }
    let arq = match teste {
        Some(t) => Some(t),
        None => {
            let mut d = app.dialog().file().set_title("Escolha o arquivo de backup do Catalogame").add_filter("Backup do Catalogame", &["json"]);
            if let Some(w) = &pai {
                d = d.set_parent(w);
            }
            bloqueante(move || d.blocking_pick_file()).await.and_then(|f| f.into_path().ok())
        }
    };
    let Some(arq) = arq else { return Ok(Value::Null) };
    match fs::read_to_string(&arq).map_err(|e| e.to_string()).and_then(|t| serde_json::from_str::<Value>(&t).map_err(|e| e.to_string())) {
        Ok(data) => Ok(json!({ "data": data, "capas": 0 })),
        Err(e) => Ok(json!({ "erro": format!("Esse arquivo não é um backup válido: {e}") })),
    }
}

/* ---------- Windows: sem atalhos/menu de navegador ---------- */
#[cfg(windows)]
fn ajustar_webview2(w: &tauri::WebviewWindow) {
    use webview2_com::Microsoft::Web::WebView2::Win32::{ICoreWebView2Settings, ICoreWebView2Settings3};
    use windows_core::Interface;
    let _ = w.with_webview(|pw| unsafe {
        let Ok(core) = pw.controller().CoreWebView2() else { return };
        let Ok(s): windows_core::Result<ICoreWebView2Settings> = core.Settings() else { return };
        let _ = s.SetAreDefaultContextMenusEnabled(false);
        let _ = s.SetIsStatusBarEnabled(false);
        if let Ok(s3) = s.cast::<ICoreWebView2Settings3>() {
            let _ = s3.SetAreBrowserAcceleratorKeysEnabled(false);
        }
    });
}

fn main() {
    let (dados, fallback) = resolver_dados();
    let config = ler_config(&dados);
    let script = format!("window.__CG_CONFIG__ = {};\n{}", serde_json::to_string(&config).unwrap_or_else(|_| "{}".into()), PONTE);
    let tema = tema_de(&config);
    // só nos testes automáticos: roda um script extra na interface
    let script = match std::env::var("CG_TESTE_SCRIPT").ok().and_then(|f| fs::read_to_string(f).ok()) {
        Some(t) => format!("{script}\n{t}"),
        None => script,
    };

    let builder = tauri::Builder::default();
    #[cfg(windows)]
    let builder = builder.plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
        if let Some(w) = app.get_webview_window("main") {
            let _ = w.unminimize();
            let _ = w.set_focus();
        }
    }));
    builder
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .manage(Estado { dados, fallback, config: Mutex::new(config), ultimo_asset: Mutex::new(None) })
        .invoke_handler(tauri::generate_handler![
            info, load, save, cover_write, cover_read, cover_remove, cover_url, config_set, fetch_image,
            sgdb_search, sgdb_grids, update_check, update_install, open_external, save_png, show_in_folder,
            open_data_folder, import_pick
        ])
        .setup(move |app| {
            let h = app.handle().clone();
            // as capas são servidas pelo protocolo "asset" do Tauri, só da pasta dados\capas
            let _ = app.asset_protocol_scope().allow_directory(app.state::<Estado>().dados.join("capas"), false);
            let escuro = tema != Some(tauri::Theme::Light);
            let fundo = if escuro { tauri::window::Color(13, 16, 22, 255) } else { tauri::window::Color(243, 245, 249, 255) };
            let w = WebviewWindowBuilder::new(app, "main", WebviewUrl::App("index.html".into()))
                .title("Catalogames")
                .inner_size(1440.0, 920.0)
                .min_inner_size(900.0, 600.0)
                .maximized(true)
                .theme(tema)
                .background_color(fundo)
                .disable_drag_drop_handler() // deixa a interface receber arquivos arrastados, como no Electron
                .initialization_script(&script)
                .on_navigation(move |url| {
                    let interno = matches!(url.scheme(), "tauri" | "asset" | "about" | "data" | "blob")
                        || matches!(url.host_str(), Some("tauri.localhost") | Some("asset.localhost") | Some("ipc.localhost"));
                    if !interno && matches!(url.scheme(), "http" | "https") {
                        let _ = h.opener().open_url(url.as_str(), None::<&str>);
                    }
                    interno
                })
                .build()?;
            #[cfg(windows)]
            ajustar_webview2(&w);
            let _ = &w;
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("erro ao abrir o Catalogames");
}
