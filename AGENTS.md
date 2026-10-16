# AGENTS.md — NexRedes

SPA React 18 + Vite 5, sem TypeScript, sem Tailwind, sem testes.
UI 100% em pt-BR — manter labels, mensagens e textos de commit em português.

## Comandos

- `npm run dev` — dev server (verificação manual das telas)
- `npm run build` — produção (script chama `node ./node_modules/vite/bin/vite.js build` de propósito; não "corrigir")
- `npm run preview` — serve o `dist/`
- Não há lint, typecheck, testes nem CI. Verificação = `npm run build` passa + revisar no dev server.

## Git — cuidado

- Não existe `.gitignore` e `node_modules/` + `dist/` estão commitados (problema conhecido, não intencional). Não rodar `npm install`/`npm update` sem necessidade — gera diff gigante. Não commitar artefatos de build novos sem pedir.
- Branches por tela, em português: `Tela-de-Login`, `Tela-Controle-de-Redes`; padrão é `main`.
- Commits curtos em português (ex.: "IA-2").

## Arquitetura

- Sem router: `src/App.jsx` alterna views (`login | signup | forgot | success | dashboard`) via `useState`; a página da sala é um estado interno do Dashboard (`salaAbertaId`). Não instalar react-router sem perguntar (deps: só react/react-dom).
- Auth fake e local: `src/utils/storage.js` grava em `localStorage` (chave `nexredes_users`); username/email normalizados para minúsculas; senha comparada em texto puro (demo intencional).
- **Isolamento por usuário**: cada usuário só vê os próprios dados. Sessão = marcador em `sessionStorage` (chave `nexredes_sessao`, por aba) gerenciado por `src/utils/sessao.js` (`iniciarSessao` no login, `encerrarSessao` no logout — só no `App.jsx`). Dados de negócio vivem em chaves por dono (`nexredes_salas:<username>`, `nexredes_testes:<username>`, `nexredes_modelos_etiqueta:<username>`, `nexredes_config:<username>`) + carimbo `usuario` em cada registro, validado na leitura (segunda camada, tipo user_id + RLS). Regras: o dono SEMPRE deriva da sessão na camada de dados (`usuarioDaSessao`/`chaveDeUsuario`), nunca de parâmetros do front; sem sessão, leitura devolve vazio e gravação lança erro; entidades filhas (racks, portas, pontos, falhas) herdam o dono da sala. Dados legados (chaves sem sufixo) migram para o 1º usuário cadastrado via `src/utils/migracao.js`, chamada pelas próprias camadas. Não adicionar user_id a formulários nem criar chaves globais de dados.
- Salas persistem via camada de dados `src/utils/salas.js` (`listarSalas`, `criarSala`, `editarSala`, `excluirSala`), em `localStorage` (chave por usuário `nexredes_salas:<username>`), começando vazio, sem seed. Trocar por backend = trocar só essa camada.
- Status da sala é DERIVADO das falhas (`calcularStatus`): falha ativa crítica → crítico; falha ativa baixa/atenção → atenção; senão operacional. Status nunca é salvo nem digitado.
- Busca do dashboard filtra por nome, código, prédio e nome de equipamento; ordenação client-side com `localeCompare(..., 'pt-BR')`.
- Componentes da sala em `src/components/sala/`: `SalaModal` (criação/edição, 6 seções em blocos), `SalaDetalhe` (página "Acessar" com abas "Visão geral"/"Racks" + navegação rack→equipamento via estado interno), `SalaVisaoGeral` (conteúdo da aba Visão geral), `ListaPontosRede`, `ListaEquipamentos`, `ListaFalhas`, `ConfirmDialog`, `Campo` (campos com rótulo/erro; `CampoSelect` aceita opções `{valor, label, desabilitada}`), `opcoes.js` (cores, ícones, tipos, gravidades, status). Toast: `src/components/Toast.jsx`.
- Cartão tracejado "Criar mais uma sala" é sempre o último item da grade; menu "⋮" do cartão tem Editar/Excluir (exclusão pede confirmação).
- Ícones: SVG inline feitos à mão em `src/components/icons.jsx` — não usar biblioteca de ícones; ícones novos entram lá.
- CSS: `src/App.css` (telas de auth) + `src/components/Dashboard.css` (dashboard) + `src/components/sala/*.css` + `src/components/rack/rack.css` (módulo de racks) + `src/components/Toast.css`, cada um importado pelo componente correspondente.

## Módulo de racks (switches e patch panels)

- Página da sala tem abas "Visão geral" e "Racks"; a navegação interna (rack aberto → equipamento aberto) é estado de `SalaDetalhe.jsx` (aba, rackAbertoId, equipamentoAbertoId), sem router. `Dashboard` passa `onDadosAlterados` para `SalaDetalhe` recarregar as salas após cada mutação.
- Camada de dados: `src/utils/racks.js` — racks ANINHADOS no objeto da sala (`sala.racks`, mesma chave `nexredes_salas`). Consultas são funções puras sobre o objeto `sala`; mutações recebem ids, recarregam, aplicam e salvam de uma vez. Trocar por backend = trocar só essa camada. `salas.js` exporta `carregarSalas`/`salvarSalas` e `editarSala` preserva `racks` (não adicionar racks ao `normalizarItens` — apagaria os racks ao editar a sala).
- Modelo: Rack {id, salaId, nome, alturaU, localizacao, observacoes, equipamentos}; Equipamento {id, rackId, tipo switch|patch_panel, nome, modelo, quantidadePortas, quantidadeUplink, posicaoU (1U fixo por equipamento), ipGerencia, categoriaCaboPadrao, observacoes, portas}; Porta {id, numero, lado frente|verso (só PP — PP de N portas = 2N registros), sfp, nome, estado, dispositivoConectado, pontoRede, vinculo {equipamentoId, portaId, lado}, categoriaCabo, comprimentoM, velocidade, poe, vlanNativa, vlansPermitidas, uplink, ultimoTeste, falhaId, observacao}.
- Estado VISUAL da porta é sempre calculado por `calcularEstadoPorta` (prioridade: bloqueada > critica > atencao > uplink > aguardando > certificada > livre) — cores/ícones em `src/components/rack/opcoes.js` (`ESTADOS_PORTA`); nunca salvar cor/estado visual.
- Vínculos são bidirecionais e espelhados (`salvarPorta` desfaz o antigo dos dois lados e espelha o novo; categorias de cabo sincronizam). Dropdowns só oferecem portas livres.
- "Registrar falha nesta porta" cria registro em `sala.falhas` (alvo "EQUIP / porta N") + `porta.falhaId`; resolver na aba Falhas devolve a porta ao normal automaticamente. Excluir equipamento/rack desfaz vínculos do outro lado e remove falhas ATIVAS de porta (resolvidas ficam como histórico).
- Componentes em `src/components/rack/`: `ListaRacks`, `RackModal`, `RackDetalhe` (+`RackVista` desenho em U), `EquipamentoModal`, `Porta` (quadradinho cor+ícone+tooltip), `FaixaPortas` (switch 2 fileiras ímpares/pares + SFP à direita; PP 1 fileira, 2 se >26), `LegendaPortas` (clicável, filtra), `ResumoPortas`, `FiltrosPortas`, `TabelaPortas` (switch), `TabelaPortasPP` (agregada frente/verso), `PainelPorta` (drawer individual + lote), `PaginaSwitch`, `PaginaPatchPanel`, `Trilha` (breadcrumb), `opcoes.js`.
- Reduzir quantidade de portas/uplinks é bloqueado quando há dados acima do novo limite (`portaTemDados`, `portaBloqueanteReducao`).
- Teclado: setas navegam entre portas na faixa (roving tabindex), Enter abre o painel, Esc fecha painel/modais.

## Cores

Auth e dashboard têm acentos DIFERENTES de propósito — não unificar.

Telas de auth — usar as variáveis de `:root` em `src/App.css`:

- `--primary: #4f46e5` (índigo), hover `--primary-hover: #4338ca`
- `--error: #dc2626` · `--success: #047857` · `--info: #2563eb`
- `--text: #1f2937` · `--muted: #6b7280` · `--border: #d1d5db` · `--bg: #f1f2f4`
- Fundos de alerta: erro `#fef2f2`, sucesso `#ecfdf5`, info `#eff6ff`

Dashboard (`Dashboard.css`, hex fixos):

- Primário/foco: azul `#2563eb` (anel `rgba(37,99,235,.12)`)
- CTA destaque (`.btn-new` "Nova sala", `.room-access`): roxo `#7c3aed`, hover `#6d28d9`
- Badge de notificação: vermelho `#ef4444`

Status das salas (cor · fundo): `operacional` `#15803d` · `#ecfdf5` — `.st-ok`; `atencao` `#b45309` · `#fffbeb` — `.st-warn`; `critico` `#b91c1c` · `#fef2f2` — `.st-crit`.

Cor de identidade por sala: campo `color` em cada item de `ROOMS` (paleta atual: `#2563EB`, `#7C3AED`, `#F59E0B`, `#EF4444`, `#16A34A`), aplicada via `style={{ '--room-color': room.color }}` no RoomCard; CSS usa `var(--room-color, #2563eb)`.

Logo — unificada em auth e dashboard, não divergir:

- `Logo.jsx` e `.topbar-brand` (Dashboard.jsx) seguem o mesmo padrão: `NetworkIcon` (stroke) + texto "NexRedes", tudo em azul `#2563eb`
- Texto: Poppins 800, 20px, sem gradiente

Fontes: Inter (UI) e Poppins (só o logo), via Google Fonts no `index.html`.
