; Catalogame — ajustes do instalador
; Os jogos e capas ficam em $INSTDIR\dados. Atualizar ou desinstalar NUNCA apaga essa pasta
; sem perguntar.

!macro customRemoveFiles
  SetOutPath $TEMP
  ClearErrors
  FindFirst $R1 $R2 "$INSTDIR\*.*"
  cg_loop:
    StrCmp $R2 "" cg_done
    StrCmp $R2 "." cg_next
    StrCmp $R2 ".." cg_next
    StrCmp $R2 "dados" cg_next
    IfFileExists "$INSTDIR\$R2\*.*" 0 cg_file
      RMDir /r "$INSTDIR\$R2"
      Goto cg_next
    cg_file:
      Delete "$INSTDIR\$R2"
    cg_next:
      FindNext $R1 $R2
      Goto cg_loop
  cg_done:
  FindClose $R1

  ${ifNot} ${isUpdated}
    IfFileExists "$INSTDIR\dados\*.*" 0 cg_semdados
      MessageBox MB_YESNO|MB_ICONQUESTION|MB_DEFBUTTON2 "Apagar também seus jogos, listas e capas?$\r$\n$\r$\nEles estão em:$\r$\n$INSTDIR\dados$\r$\n$\r$\nClique em NÃO para manter. Se instalar o Catalogame de novo nessa mesma pasta, tudo volta." /SD IDNO IDNO cg_semdados
      RMDir /r "$INSTDIR\dados"
    cg_semdados:
    RMDir "$INSTDIR"
  ${endIf}
!macroend
