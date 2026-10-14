# Corrigir tela branca ao clicar em porta (PP/switch) + fallback "Página não encontrada"

## Diagnóstico (confirmado com reprodução)

- **Não há navegação real.** Grep em todo `src/`: nenhum `navigate()`, `<Link>`, `router.push`,
  `window.location` nos handlers de porta/linha. O único `<a href="/">` é o `Logo.jsx` das telas
  de auth (vai para home/login — mantido). **Não existe rota `/porta/:id`** nem no fonte nem no
  bundle `dist/` (confirmado nos dois).
- **A tela branca é um crash de render do React:** `src/components/rack/PainelPorta.jsx`
  define `function opcioneTeste()` (linha 66) mas chama `opicioneTeste()` (linha 959 — campo
  "Resultado do último teste" do `FormIndividual`). `ReferenceError` no meio do render →
  React 18 desmonta a árvore inteira → página totalmente em branco.
- **Por que "Editar em lote" funciona:** o modo lote renderiza `FormLote` (não usa o helper
  quebrado). O modo porta única renderiza `FormIndividual` (mesmo escondido atrás da aba
  Resumo) → crash em qualquer clique de porta: quadradinho frente/verso, linha das tabelas
  PP/switch e até o destaque vindo da cadeia do cabo (`portaDestaqueId`).
- O `npm run build` não pega esse erro (esbuild/rollup não resolvem identificadores
  dinâmicos) — por isso passou no commit.
- Reprodução: harness SSR (vite + react-dom/server do próprio projeto, dados realistas) —
  6/9 cenários quebram com o mesmo `ReferenceError`; lote e páginas fechadas renderizam OK.

## Mudanças

### 1. Corrigir o crash — `src/components/rack/PainelPorta.jsx`
- Linha 66: `function opcioneTeste()` → `function opcoesTeste()`
- Linha 959: `opcoes={opicioneTeste()}` → `opcoes={opcoesTeste()}`
- Únicas 2 ocorrências no repo (grep confirmado).

### 2. Ajustes do modo porta única (decisão: manter drawer atual + ajustes) — `PainelPorta.jsx`
- Título do drawer: `Porta {n} ({Frente|Verso})` — trocar ` · ${ROTULO_LADO[...]}` por
  ` (${ROTULO_LADO[...]})`; manter sufixo `(SFP)` quando existir.
- Subtítulo abaixo do título: `<p>{Switch|Patch panel} - {equipamento.nome}</p>`
  (CSS já existe: `.porta-painel-cabecalho p` em rack.css:1170 — nenhuma mudança de CSS).
- Rodapé do `FormIndividual`: botão "Aplicar alterações" → **"Salvar"**.
- Novo prop opcional `onPortaAtivaChange(portaId)` + `useEffect` disparando quando
  `portaAtiva?.id` mudar (nunca em modo lote) — usado pelo destaque (item 3).
- Intactos: aba Resumo, cadeia do cabo, falhas, testes, liberar, histórico, navegação ‹ ›,
  confirmações de descarte, modo lote e botão "Aplicar a N porta(s)".

### 3. Destacar o lado ativo no painel visual (decisão: lado ativo) — `PaginaPatchPanel.jsx`, `PaginaSwitch.jsx`
- Novo estado `portaAtivaPainelId` em cada página; inicializar em toda abertura do painel
  (clique na porta, clique na linha, destaque da cadeia, troca de passo ‹ ›).
- `selecionadaId` das `FaixaPortas` passa a ser
  `painel && !painel.lote ? (portaAtivaPainelId || painel.portaIds[0]) : null`;
  passar `onPortaAtivaChange={setPortaAtivaPainelId}` ao `PainelPorta`.
- Efeito: trocar de aba Frente/Verso (ou navegar ‹ ›) move o destaque para o quadradinho
  correspondente; a linha da tabela continua destacada como hoje (`tr.ativa`).
- `PaginaSwitch`: mesmo mecanismo (portas sem lado — callback devolve o id ativo).

### 4. Fallback "Página não encontrada" — `src/App.jsx` + novo `src/components/NaoEncontrada.jsx` (+ `src/App.css`)
- Sem router (AGENTS.md proíbe react-router sem perguntar): em `App.jsx`,
  `useState(() => window.location.pathname.replace(/\/+$/, '') !== '')`; se verdadeiro,
  renderiza `<NaoEncontrada onVoltar={...} />` no lugar do app. "Voltar" faz
  `history.replaceState(null, '', '/')` e limpa o estado (volta para o login).
- `NaoEncontrada.jsx`: card centralizado, título "Página não encontrada", texto explicativo
  curto, botão "Voltar" — usando as variáveis de auth do `App.css` (`--primary` etc.),
  texto 100% pt-BR, mesmo visual das telas de auth.
- CSS: pequeno bloco no `App.css` (telas de auth), nada de novo no rack.css.

## O que NÃO muda (já está conforme a spec)
- Checkbox da linha: `td-check` já tem `stopPropagation` (só seleciona p/ lote, não abre painel).
- Fechamento: X, Cancelar, clique no fundo escuro e Esc (com confirmação de descarte) já ok.
- Salvar: `salvarPorta` + `onDadosAlterados` já atualizam faixa visual e tabela + toast.
- Porta clicada e linha clicada já abrem o MESMO painel (PainelPorta).
- Sem rotas a remover.

## Verificação
1. Re-executar o harness SSR (mesmo comando `node --input-type=module` do diagnóstico) —
   os 9 cenários devem renderizar OK, sem nenhum ReferenceError.
2. `npm run build` passa.
3. Checagem manual no `npm run dev` (conforme AGENTS.md):
   - PP e switch: clicar quadradinho frente/verso e linha da lista abre o drawer
     (título "Porta N (frente)", subtítulo, campos preenchidos, botão "Salvar");
   - destaque acompanha a aba ativa; checkbox só seleciona;
   - X / Cancelar / fundo / Esc fecham; salvar atualiza faixa + tabela com toast;
   - URL inexistente (ex.: `/porta/3`) mostra "Página não encontrada"; "Voltar" funciona.

## Arquivos afetados
- `src/components/rack/PainelPorta.jsx` (fix do crash + rótulos + callback)
- `src/components/rack/PaginaPatchPanel.jsx` (destaque ativo)
- `src/components/rack/PaginaSwitch.jsx` (destaque ativo)
- `src/App.jsx` (fallback 404)
- `src/components/NaoEncontrada.jsx` (novo)
- `src/App.css` (estilos do 404)

## Commit
Só quando pedido. Sugestão (curto, pt-BR): "Corrige tela branca ao abrir painel da porta única".
