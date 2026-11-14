# 🎮 Catalogames

*Catálogo de jogos com forma de backlog local.*

> [!WARNING]
> **Projeto 100% vibecodado.** Todo o código foi escrito por IA (Claude, da Anthropic) a partir das ideias, pedidos e testes de **[@leoblaidd](https://github.com/leoblaidd)**. Funciona e foi testado, mas não passou por revisão de um programador humano. Use, estude e modifique à vontade, sabendo disso.

**Autor:** [@leoblaidd](https://github.com/leoblaidd)

O Catalogames é um app para Windows que organiza os jogos que você já zerou, jogou ou quer jogar. Ele funciona como uma estante de capas: você cadastra cada jogo com nota, plataforma e ano, e monta listas e rankings com eles. Tudo fica salvo numa pasta do seu PC, sem conta, sem nuvem e sem internet obrigatória.

---

## ✨ Funções

### Catálogo
- Grade de capas com tamanho ajustável, agrupada por ano em que você terminou o jogo.
- Para cada jogo: título, plataforma, status (**Terminado**, **Jogado** ou **Quero jogar**), ano em que terminou, ano de lançamento, horas jogadas, nota de 0 a 10 (com meio ponto), gêneros, favorito e um comentário ou review.
- Busca instantânea (atalho <kbd>/</kbd>) e filtros por plataforma, gênero, status, ano e nota.
- **Filtro de nota exato:** "Nota 5" mostra os jogos com 5 e 5,5, com os 5,5 primeiro.
- Ordenação por data, nota, nome, horas ou lançamento.
- Botão para esconder a barra de busca e filtros e deixar só as capas.

### Listas e rankings
- Crie listas como "Top 10 RPGs" ou "Musous favoritos", com ou sem numeração. O top 3 aparece em ouro, prata e bronze.
- Arraste as capas para reordenar.
- Ao digitar o nome de um jogo, o app sugere os jogos que você já catalogou e reaproveita a capa deles.
- **Lista a partir da busca:** pesquisou ou filtrou? Um botão cria uma lista com os jogos que estão aparecendo.
- **Seleção com Ctrl:** segure <kbd>Ctrl</kbd> e clique nas capas para marcar. <kbd>Ctrl</kbd>+<kbd>A</kbd> marca todas. Depois é só criar uma lista com as marcadas.

### Capas
- **SteamGridDB integrado:** digite o nome do jogo e clique em *Buscar capa no SteamGridDB*. Abre uma grade com as capas da comunidade, e um clique baixa a escolhida. Precisa de uma [chave gratuita da API](https://www.steamgriddb.com/profile/preferences/api), configurada uma única vez.
- Também dá para colar uma imagem (<kbd>Ctrl</kbd>+<kbd>V</kbd>), arrastar um arquivo ou usar um link, inclusive o link da página do jogo na Steam.
- As imagens grandes são reduzidas automaticamente para não pesar a pasta.

### Aparência
- Tema **escuro**, **claro** ou **automático** (segue o Windows).
- Cor de destaque com 10 opções prontas ou qualquer cor personalizada.

---

## 💾 Onde ficam seus dados

Tudo fica dentro da pasta onde você instalou o app:

```
Catalogames\
├── Catalogames.exe
└── dados\
    ├── biblioteca.json   ← jogos e listas (texto legível)
    ├── config.json       ← tema, cor, preferências
    └── capas\            ← imagens das capas
```

- **Atualizar:** é só instalar a versão nova por cima, na mesma pasta. A pasta `dados` nunca é apagada.
- **Desinstalar:** o desinstalador pergunta se você quer apagar seus jogos. A resposta padrão é "Não".
- **Backup:** copie a pasta `dados`. Para levar para outro PC, instale lá e cole a pasta.

---

## 📥 Instalação

1. Baixe o `Catalogames-Instalador-x.y.z.exe` mais recente em **[Releases](../../releases)**.
2. Execute e escolha a pasta de instalação (por exemplo, `D:\Jogos\Catalogames`).
3. O Windows pode mostrar "O Windows protegeu o computador", porque o instalador não tem assinatura digital paga. Clique em **Mais informações → Executar assim mesmo**.

> Evite instalar em *Arquivos de Programas*: o Windows não deixa gravar ali, e aí os dados vão para `%APPDATA%\Catalogames\dados`.

---

## 🛠️ Rodando o código

Feito com [Electron](https://www.electronjs.org/). A interface inteira está em um único arquivo HTML, sem frameworks.

```bash
npm install
npm start          # abre o app em modo desenvolvimento
npm run dist       # gera o instalador do Windows em dist/
```

| Arquivo | O que faz |
|---|---|
| `app/index.html` | A interface toda: catálogo, listas, modais, temas |
| `main.js` | Processo principal: janela, leitura e gravação em `dados\`, downloads de imagens, API do SteamGridDB |
| `preload.js` | Ponte segura entre a interface e o disco |
| `build/installer.nsh` | Ajustes do instalador NSIS que protegem a pasta `dados` |

---

## 📜 Versões

### 1.2.0
- O nome mudou para **Catalogames**. A atualização por cima da versão antiga mantém tudo.
- Busca de capas no **SteamGridDB** dentro do app, no catálogo e nas listas.
- Novo botão para ocultar ou mostrar a busca e os filtros.
- O tamanho das capas voltou para a barra de filtros.

### 1.1.0
- Filtro de nota exato (5 = 5 e 5,5), com os ,5 primeiro.
- Listas sugerem jogos do catálogo e reaproveitam a capa.
- Criar lista a partir da busca ou dos jogos marcados com Ctrl.
- Tema claro, escuro ou automático e cor de destaque personalizável.
- Janela de configurações.

### 1.0.0
- Primeira versão como app instalável: catálogo, listas ranqueadas, capas salvas localmente e importação da versão HTML antiga.

---

## 🙏 Créditos

- Ideia, direção e testes: **[@leoblaidd](https://github.com/leoblaidd)**
- Código: gerado por IA (Claude, da Anthropic)
- Capas da comunidade: [SteamGridDB](https://www.steamgriddb.com)
