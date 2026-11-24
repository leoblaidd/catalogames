; Catalogames — instalador (Tauri, NSIS)
; Usa as mesmas chaves de registro e a mesma pasta da versão Electron:
; dá pra instalar uma por cima da outra, nos dois sentidos, sem perder a pasta "dados".
; Segue as mesmas chaves de registro do instalador antigo (electron-builder),
; então instalar por cima de uma versão anterior funciona normalmente.
; Os jogos ficam em $INSTDIR\dados e NUNCA são apagados sem perguntar.

Unicode true
!ifndef VERSION
  !error "passe -DVERSION=x.y.z"
!endif
!ifndef SRC
  !error "passe -DSRC=<pasta win-unpacked>"
!endif
!ifndef OUT
  !error "passe -DOUT=<arquivo .exe>"
!endif

!define APP_GUID    "6476126b-6692-5569-917c-d782f7c62c51"
!define PRODUCT     "Catalogames"
!define EXE         "Catalogames.exe"
!define UNINST_EXE  "Uninstall Catalogames.exe"
!define INSTALL_KEY "Software\${APP_GUID}"
!define UNINST_KEY  "Software\Microsoft\Windows\CurrentVersion\Uninstall\${APP_GUID}"

Name "${PRODUCT}"
OutFile "${OUT}"
RequestExecutionLevel user
InstallDir "$LOCALAPPDATA\Programs\${PRODUCT}"
InstallDirRegKey HKCU "${INSTALL_KEY}" "InstallLocation"
SetCompressor /SOLID lzma
ManifestDPIAware true
BrandingText "${PRODUCT} ${VERSION}"

!include "MUI2.nsh"
!include "LogicLib.nsh"
!include "FileFunc.nsh"

!define MUI_ICON "icon.ico"
!define MUI_UNICON "icon.ico"
!define MUI_ABORTWARNING
!define MUI_DIRECTORYPAGE_TEXT_TOP "$(TxtPasta)"
!define MUI_FINISHPAGE_RUN "$INSTDIR\${EXE}"
!define MUI_FINISHPAGE_RUN_TEXT "$(TxtAbrir)"

!insertmacro MUI_PAGE_DIRECTORY
!insertmacro MUI_PAGE_INSTFILES
!insertmacro MUI_PAGE_FINISH
!insertmacro MUI_UNPAGE_CONFIRM
!insertmacro MUI_UNPAGE_INSTFILES
; idiomas: o Windows escolhe sozinho (inglês se não for português nem espanhol)
!insertmacro MUI_LANGUAGE "English"
!insertmacro MUI_LANGUAGE "PortugueseBR"
!insertmacro MUI_LANGUAGE "Spanish"

LangString TxtPasta ${LANG_PORTUGUESEBR} "Escolha a pasta onde o Catalogames vai ficar. Seus jogos, listas e capas são salvos dentro dela, na subpasta $\"dados$\".$\r$\n$\r$\nPra atualizar, use a mesma pasta da instalação anterior (ela já vem preenchida)."
LangString TxtPasta ${LANG_ENGLISH} "Choose the folder where Catalogames will live. Your games, lists and covers are saved inside it, in the $\"dados$\" subfolder.$\r$\n$\r$\nTo update, use the same folder as your previous install (it's already filled in)."
LangString TxtPasta ${LANG_SPANISH} "Elige la carpeta donde estará Catalogames. Tus juegos, listas y portadas se guardan dentro de ella, en la subcarpeta $\"dados$\".$\r$\n$\r$\nPara actualizar, usa la misma carpeta de la instalación anterior (ya viene completada)."
LangString TxtAbrir ${LANG_PORTUGUESEBR} "Abrir o Catalogames"
LangString TxtAbrir ${LANG_ENGLISH} "Open Catalogames"
LangString TxtAbrir ${LANG_SPANISH} "Abrir Catalogames"
LangString TxtAberto ${LANG_PORTUGUESEBR} "O Catalogames está aberto.$\r$\n$\r$\nClique em OK pra fechar ele e continuar."
LangString TxtAberto ${LANG_ENGLISH} "Catalogames is open.$\r$\n$\r$\nClick OK to close it and continue."
LangString TxtAberto ${LANG_SPANISH} "Catalogames está abierto.$\r$\n$\r$\nHaz clic en Aceptar para cerrarlo y continuar."
LangString TxtWebView ${LANG_PORTUGUESEBR} "Essa versão do Catalogames precisa do Microsoft Edge WebView2, que não foi encontrado nesse PC.$\r$\n$\r$\n(Ele já vem no Windows 11 e na maioria dos Windows 10 atualizados.)$\r$\n$\r$\nQuer abrir a página da Microsoft pra instalar? A instalação do Catalogames continua normalmente."
LangString TxtWebView ${LANG_ENGLISH} "This version of Catalogames needs Microsoft Edge WebView2, which wasn't found on this PC.$\r$\n$\r$\n(It comes with Windows 11 and most updated Windows 10 PCs.)$\r$\n$\r$\nDo you want to open Microsoft's page to install it? The Catalogames install will continue normally."
LangString TxtWebView ${LANG_SPANISH} "Esta versión de Catalogames necesita Microsoft Edge WebView2, que no se encontró en este PC.$\r$\n$\r$\n(Viene con Windows 11 y con la mayoría de los Windows 10 actualizados.)$\r$\n$\r$\n¿Quieres abrir la página de Microsoft para instalarlo? La instalación de Catalogames continúa normalmente."
LangString TxtApagar ${LANG_PORTUGUESEBR} "Apagar também seus jogos, listas e capas?$\r$\n$\r$\nEles estão em:$\r$\n$INSTDIR\dados$\r$\n$\r$\nClique em NÃO para manter. Se instalar o Catalogames de novo nessa mesma pasta, tudo volta."
LangString TxtApagar ${LANG_ENGLISH} "Also delete your games, lists and covers?$\r$\n$\r$\nThey're in:$\r$\n$INSTDIR\dados$\r$\n$\r$\nClick NO to keep them. If you install Catalogames again in this same folder, everything comes back."
LangString TxtApagar ${LANG_SPANISH} "¿Borrar también tus juegos, listas y portadas?$\r$\n$\r$\nEstán en:$\r$\n$INSTDIR\dados$\r$\n$\r$\nHaz clic en NO para conservarlos. Si vuelves a instalar Catalogames en esta misma carpeta, todo regresa."

VIProductVersion "${VERSION}.0"
VIAddVersionKey /LANG=${LANG_ENGLISH} "ProductName" "${PRODUCT}"
VIAddVersionKey /LANG=${LANG_ENGLISH} "ProductVersion" "${VERSION}"
VIAddVersionKey /LANG=${LANG_ENGLISH} "FileVersion" "${VERSION}"
VIAddVersionKey /LANG=${LANG_ENGLISH} "FileDescription" "${PRODUCT} Setup"
VIAddVersionKey /LANG=${LANG_ENGLISH} "CompanyName" "leoblaidd"
VIAddVersionKey /LANG=${LANG_ENGLISH} "LegalCopyright" "leoblaidd"

; ---------- fecha o app se estiver aberto ----------
!macro FecharApp UN
Function ${UN}FecharApp
  FindWindow $0 "" "${PRODUCT}"
  ${If} $0 <> 0
    MessageBox MB_OKCANCEL|MB_ICONINFORMATION "$(TxtAberto)" /SD IDOK IDOK +2
    Abort
  ${EndIf}
  nsExec::Exec 'taskkill /IM "${EXE}"'
  nsExec::Exec 'taskkill /IM "Catalogame.exe"'
  Sleep 800
  nsExec::Exec 'taskkill /F /IM "${EXE}"'
  nsExec::Exec 'taskkill /F /IM "Catalogame.exe"'
  Sleep 300
FunctionEnd
!macroend
!insertmacro FecharApp ""
!insertmacro FecharApp "un."

; ---------- apaga os arquivos do app, menos a pasta "dados" ----------
!macro LimparMenosDados UN
Function ${UN}LimparMenosDados
  ClearErrors
  FindFirst $R1 $R2 "$INSTDIR\*.*"
  loop:
    StrCmp $R2 "" done
    StrCmp $R2 "." next
    StrCmp $R2 ".." next
    StrCmp $R2 "dados" next
    IfFileExists "$INSTDIR\$R2\*.*" 0 isfile
      RMDir /r "$INSTDIR\$R2"
      Goto next
    isfile:
      Delete "$INSTDIR\$R2"
    next:
    FindNext $R1 $R2
    Goto loop
  done:
  FindClose $R1
FunctionEnd
!macroend
!insertmacro LimparMenosDados ""
!insertmacro LimparMenosDados "un."

; ---------- o Tauri usa o WebView2 (motor do Edge) que vem no Windows ----------
Function ChecarWebView2
  ReadRegStr $0 HKLM "SOFTWARE\WOW6432Node\Microsoft\EdgeUpdate\Clients\{F3017226-FE2A-4295-8BDF-00C3A9A7E4C5}" "pv"
  ${If} $0 == ""
  ${OrIf} $0 == "0.0.0.0"
    ReadRegStr $0 HKLM "SOFTWARE\Microsoft\EdgeUpdate\Clients\{F3017226-FE2A-4295-8BDF-00C3A9A7E4C5}" "pv"
  ${EndIf}
  ${If} $0 == ""
  ${OrIf} $0 == "0.0.0.0"
    ReadRegStr $0 HKCU "Software\Microsoft\EdgeUpdate\Clients\{F3017226-FE2A-4295-8BDF-00C3A9A7E4C5}" "pv"
  ${EndIf}
  ${If} $0 == ""
  ${OrIf} $0 == "0.0.0.0"
    MessageBox MB_YESNO|MB_ICONEXCLAMATION "$(TxtWebView)" /SD IDNO IDNO +2
    ExecShell "open" "https://developer.microsoft.com/microsoft-edge/webview2/#download"
  ${EndIf}
FunctionEnd

Section "Catalogames" SecMain
  SetShellVarContext current
  Call ChecarWebView2
  Call FecharApp
  SetOutPath "$INSTDIR"
  ; versão anterior: tira os arquivos antigos (a pasta dados fica)
  IfFileExists "$INSTDIR\${EXE}" 0 +2
    Call LimparMenosDados
  IfFileExists "$INSTDIR\Catalogame.exe" 0 +2
    Call LimparMenosDados

  SetOutPath "$INSTDIR"
  File /r "${SRC}\*.*"
  WriteUninstaller "$INSTDIR\${UNINST_EXE}"

  ; atalhos (substitui os da versão antiga)
  Delete "$DESKTOP\Catalogame.lnk"
  Delete "$SMPROGRAMS\Catalogame.lnk"
  CreateShortCut "$DESKTOP\${PRODUCT}.lnk" "$INSTDIR\${EXE}" "" "$INSTDIR\${EXE}" 0
  CreateShortCut "$SMPROGRAMS\${PRODUCT}.lnk" "$INSTDIR\${EXE}" "" "$INSTDIR\${EXE}" 0

  ; registro (mesmas chaves do instalador antigo)
  WriteRegStr HKCU "${INSTALL_KEY}" "InstallLocation" "$INSTDIR"
  WriteRegStr HKCU "${INSTALL_KEY}" "KeepShortcuts" "true"
  WriteRegStr HKCU "${INSTALL_KEY}" "ShortcutName" "${PRODUCT}"
  WriteRegStr HKCU "${UNINST_KEY}" "DisplayName" "${PRODUCT} ${VERSION}"
  WriteRegStr HKCU "${UNINST_KEY}" "DisplayVersion" "${VERSION}"
  WriteRegStr HKCU "${UNINST_KEY}" "Publisher" "leoblaidd"
  WriteRegStr HKCU "${UNINST_KEY}" "DisplayIcon" "$INSTDIR\${EXE},0"
  WriteRegStr HKCU "${UNINST_KEY}" "InstallLocation" "$INSTDIR"
  WriteRegStr HKCU "${UNINST_KEY}" "UninstallString" '"$INSTDIR\${UNINST_EXE}" /currentuser'
  WriteRegStr HKCU "${UNINST_KEY}" "QuietUninstallString" '"$INSTDIR\${UNINST_EXE}" /currentuser /S'
  WriteRegDWORD HKCU "${UNINST_KEY}" "NoModify" 1
  WriteRegDWORD HKCU "${UNINST_KEY}" "NoRepair" 1
  ${GetSize} "$INSTDIR" "/S=0K" $0 $1 $2
  IntFmt $0 "0x%08X" $0
  WriteRegDWORD HKCU "${UNINST_KEY}" "EstimatedSize" "$0"
SectionEnd

Section "Uninstall"
  SetShellVarContext current
  Call un.FecharApp
  Call un.LimparMenosDados
  IfFileExists "$INSTDIR\dados\*.*" 0 semdados
    MessageBox MB_YESNO|MB_ICONQUESTION|MB_DEFBUTTON2 "$(TxtApagar)" /SD IDNO IDNO semdados
    RMDir /r "$INSTDIR\dados"
  semdados:
  RMDir "$INSTDIR"
  Delete "$DESKTOP\${PRODUCT}.lnk"
  Delete "$SMPROGRAMS\${PRODUCT}.lnk"
  DeleteRegKey HKCU "${UNINST_KEY}"
  DeleteRegKey HKCU "${INSTALL_KEY}"
SectionEnd
