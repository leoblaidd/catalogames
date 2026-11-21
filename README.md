# 🎮 Catalogames

*Catálogo de jogos com forma de backlog local.*

> [!NOTE]
> **Oi! Um aviso antes de tudo: este projeto é vibecodado.** 🤖
> Todo o código foi escrito com IA (Claude, da Anthropic), a partir das ideias, pedidos e testes de **[@leoblaidd](https://github.com/leoblaidd)**.
> Sei que muita gente não curte trabalho feito por IA, e tudo bem. Por isso o aviso vem logo aqui no começo, pra você decidir com calma se quer seguir. Se quiser, seja bem-vindo! 🎮

**Autor:** [@leoblaidd](https://github.com/leoblaidd)

O Catalogames é um app para Windows que organiza os jogos que você já zerou, jogou ou quer jogar. Ele funciona como uma estante de capas: você cadastra cada jogo com nota, plataforma e ano, e monta listas e rankings com eles. Tudo fica salvo numa pasta do seu PC, sem conta, sem nuvem e sem internet obrigatória.

---

## ✨ Funções

O app tem três abas no centro do topo: **🎮 Catálogo**, **📚 Listas** e **👤 Perfil**, com uma animação deslizando entre elas. O nome fica à esquerda, com os números da aba ao lado, e os botões da aba à direita, com as configurações sempre no canto.

### Catálogo
- Grade de capas com tamanho ajustável, agrupada pelo ano em que você terminou, pelo ano de lançamento ou sem agrupar.
- Para cada jogo: título, plataforma, status (**Terminado**, **Jogado** ou **Quero jogar**), ano em que terminou, ano de lançamento, horas jogadas, nota de 0 a 10 (com meio ponto), gêneros, favorito e um comentário ou review.
- Busca instantânea (atalho <kbd>/</kbd>) e filtros por plataforma, gênero, status, ano e nota.
- **Filtro de nota exato:** "Nota 5" mostra os jogos com 5 e 5,5, com os 5,5 primeiro.
- Ordenação por data, nota, nome, horas ou lançamento.
- Botão para esconder a barra de busca e filtros e deixar só as capas.
- **Jogou de novo?** Jogos com o mesmo título contam como o mesmo jogo jogado em anos diferentes:
  - Ao cadastrar, o app sugere o jogo e puxa nota, lançamento, gêneros e capa. Você só ajusta o ano.
  - Nota, lançamento, gêneros e capa ficam sempre iguais em todas as jogadas.
  - Fora do agrupamento por ano terminado, as jogadas viram uma pilha de capas. Passando o mouse, elas se abrem para o lado.
- Gêneros em ordem alfabética, com busca: digite pra filtrar ou criar um novo. A lista é editável nas configurações.
- **Importar uma lista de jogos** de um arquivo `.txt` ou `.md`, um por linha: `Nome - ano que jogou - ano do jogo - plataforma - nota`. O que não estiver no padrão é pulado, e o app mostra uma prévia antes de importar. Os jogos importados aparecem com borda colorida até você completar capa, horas e gêneros.

- **Tela do jogo:** clique numa capa e abre um card centralizado com o banner do jogo no topo e a capa grande sobreposta. Sem banner, o app usa a própria capa desfocada. Depois de editar, você volta para essa tela.

### Perfil
- Foto de perfil, nome e uma imagem de topo larga, que expande quando você rola para cima.
- Números: jogos catalogados, listas e horas jogadas.
- **Top 5 favoritos**, com coroa no 1º. Clique para escolher e arraste para reordenar.
- Painéis com plataformas mais jogadas, jogos terminados por ano, o mais rejogado, nota média e gênero favorito.
- Dá pra ajustar a posição da imagem do topo, arrastando ou pelo controle.

### Exportar imagens (PNG)
- **Card do perfil** (800 × 1200): foto, um pouco da imagem do topo, nome, Top 5 lado a lado (o 1º com coroa e um pouco maior) e números como jogos do ano, jogos ao todo e plataforma mais jogada. Você desmarca o que não quiser antes de exportar.
- **Lista:** fundo preto, nome da lista na cor do tema, capas grandes em 3, 5 ou 10 colunas, com ou sem ranking e nomes.
- **Catálogo:** os jogos de um ano, de uma plataforma ou de um gênero (um filtro por vez), com nota e nomes opcionais.
- Sempre com prévia antes, e você escolhe onde salvar.

### Atualizações
- Em Configurações, o botão **Verificar atualização** procura uma versão nova nas Releases deste repositório. Ele baixa o instalador e abre sozinho. Também dá pra deixar ele verificar toda vez que o app abre.

### Listas e rankings
- Crie listas como "Top 10 RPGs" ou "Musous favoritos", com ou sem numeração. O top 3 aparece em ouro, prata e bronze.
- Cada lista abre em tela cheia, com busca, tamanho das capas ajustável e botões de editar e excluir.
- Arraste as capas para reordenar, tanto na lista aberta quanto no editor. Os números do ranking se ajustam na hora.
- Opção de esconder os nomes embaixo das capas.
- Ao digitar o nome de um jogo, o app sugere os jogos que você já catalogou e reaproveita a capa deles.
- **Lista a partir da busca:** pesquisou ou filtrou? Um botão cria uma lista com os jogos que estão aparecendo.
- **Seleção com Ctrl:** segure <kbd>Ctrl</kbd> e clique nas capas para marcar. <kbd>Ctrl</kbd>+<kbd>A</kbd> marca todas. Depois é só criar uma lista com as marcadas.

### Capas
- **SteamGridDB integrado:** digite o nome do jogo e clique em *Buscar capa no SteamGridDB*. Abre uma grade com as capas da comunidade, e um clique baixa a escolhida. Precisa de uma [chave gratuita da API](https://www.steamgriddb.com/profile/preferences/api), configurada uma única vez.
- **Banner do topo:** na edição do jogo tem um espaço para o banner largo, com busca nos **Heroes** do SteamGridDB, arquivo ou link.
- Também dá para colar uma imagem (<kbd>Ctrl</kbd>+<kbd>V</kbd>), arrastar um arquivo ou usar um link, inclusive o link da página do jogo na Steam.
- Ao cadastrar um jogo que já está em alguma lista, o app sugere ele e reaproveita a capa.
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
npm run dist       # gera o instalador do Windows em dist/ (NSIS, sem precisar de Wine)
```

| Arquivo | O que faz |
|---|---|
| `app/index.html` | A interface toda: catálogo, listas, modais, temas |
| `main.js` | Processo principal: janela, leitura e gravação em `dados\`, downloads de imagens, API do SteamGridDB |
| `preload.js` | Ponte segura entre a interface e o disco |
| `build/instalador.nsi` | Script do instalador (NSIS). Instala por cima mantendo a pasta `dados` |
| `build/fazer-instalador.js` | Monta o app e compila o instalador |

---

## 📜 Versões

### 1.7.1
- Topo reorganizado: nome e números à esquerda, abas no centro, botões e configurações à direita.
- O X da tela do jogo voltou para o canto superior direito.
- Ao salvar ou cancelar a edição, você volta para a tela do jogo.
- Jogadas repetidas: o aviso também mostra quando a capa ou o banner estão diferentes, e o "igualar" inclui o banner.
- Ícone novo: preto e cinza escuro, com borda branca leve.

### 1.7.0
- Abas centralizadas no topo, com animação deslizante; botões à esquerda.
- Filtros do catálogo mais compactos, cabendo numa linha só em 1080p.
- Nova tela do jogo: centralizada, com banner no topo, capa maior e X no canto superior esquerdo.
- Banner do jogo na edição, com busca nos Heroes do SteamGridDB.
- Formulário de edição mais largo e organizado em seções.
- Card do perfil: Top 5 lado a lado, com o 1º maior e de coroa.

### 1.6.0
- Exportar PNG: card do perfil, listas e catálogo (por ano, plataforma ou gênero), com prévia.
- Verificar atualização direto pelas Releases do GitHub, com download e instalação.
- Ajuste da posição da imagem do topo do perfil.
- Capas do Top 5 maiores, acompanhando a largura da tela.
- Busca nos gêneros: digitar filtra os gêneros, e Enter marca ou cria.
- Saiu o aviso "role pra cima" da imagem do topo.

### 1.5.0
- Abas lado a lado: Catálogo, Listas e **Perfil**.
- Aba Perfil com foto, nome, imagem de topo, números, Top 5 favoritos e painéis de estatísticas.
- Importar lista de jogos por arquivo `.txt`/`.md`, com prévia. Os jogos ficam marcados "para completar".
- Filtro "Para completar".
- O selo de vezes jogadas saiu. A pilha de capas continua.

### 1.4.0
- Agrupar por ano de lançamento, além de ano terminado ou sem agrupar.
- Jogos repetidos (o mesmo jogo jogado em anos diferentes):
  - O cadastro sugere o jogo e puxa os dados para uma nova jogada.
  - As jogadas aparecem empilhadas quando você busca, filtra ou ordena.
  - A tela do jogo lista todas as jogadas.
  - Nota, lançamento, gêneros e capa ficam sincronizados entre elas.
- Gêneros em ordem alfabética.
- Adicionar e excluir gêneros nas configurações.

### 1.3.0
- As listas abrem em tela cheia, com voltar, busca, tamanho das capas e editar/excluir.
- Arrastar para reordenar com a lista aberta, com o ranking renumerando sozinho.
- Opção de esconder os nomes dos jogos embaixo das capas.
- Números do ranking do 4º em diante em branco com número preto.
- No cadastro, o app sugere jogos que já estão nas listas, com capa.
- Botões de tema alinhados nas configurações.

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
- Código: escrito com IA (Claude, da Anthropic)
- Capas da comunidade: [SteamGridDB](https://www.steamgriddb.com)
