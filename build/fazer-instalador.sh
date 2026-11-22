#!/bin/bash
# Gera o instalador da versão experimental em Tauri (tudo a partir do Linux):
#   1) compila o app em Rust pra Windows (x86_64-pc-windows-gnu)
#   2) junta Catalogames.exe + WebView2Loader.dll numa pasta
#   3) makensis compila build/instalador.nsi
set -e
cd "$(dirname "$0")/.."
VERSAO=$(grep -m1 '^version' src-tauri/Cargo.toml | cut -d'"' -f2)
echo "1/3 compilando (Rust → Windows)…"
(cd src-tauri && RUSTC_BOOTSTRAP=1 cargo build --release -Zbuild-std=std,panic_abort --target x86_64-pc-windows-gnu)
echo "2/3 montando a pasta do app…"
rm -rf dist && mkdir -p dist/app
cp src-tauri/target/x86_64-pc-windows-gnu/release/catalogames.exe dist/app/Catalogames.exe
cp src-tauri/target/x86_64-pc-windows-gnu/release/WebView2Loader.dll dist/app/
echo "3/3 compilando o instalador…"
NSIS=$(dirname "$(dirname "$(ls ~/.cache/electron-builder/nsis-3.0.4.1/*/linux/makensis | head -1)")")
OUT="$PWD/dist/Catalogames-Tauri-Experimental-$VERSAO.exe"
(cd build && NSISDIR="$NSIS" "$NSIS/linux/makensis" -V2 -DVERSION="$VERSAO" -DSRC="$PWD/../dist/app" -DOUT="$OUT" instalador.nsi)
ls -la dist/app "$OUT"
