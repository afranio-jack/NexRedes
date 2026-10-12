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

- Sem router: `src/App.jsx` alterna views (`login | signup | forgot | success | dashboard`) via `useState`. Não instalar react-router sem perguntar (deps: só react/react-dom).
- Auth fake e local: `src/utils/storage.js` grava em `localStorage` (chave `nexredes_users`); username/email normalizados para minúsculas; senha comparada em texto puro (demo intencional).
- Validações centralizadas em `src/utils/validation.js` (`EMAIL_REGEX`, `USERNAME_REGEX`: 3–20 chars, `[a-zA-Z0-9_]`).
- Dashboard é estático: array `ROOMS` em `src/components/Dashboard.jsx`, nada é fetchado; busca/ordenação client-side com `localeCompare(..., 'pt-BR')`.
- Ícones: SVG inline feitos à mão em `src/components/icons.jsx` — não usar biblioteca de ícones; ícones novos entram lá.
- CSS: global em `src/App.css` (telas de auth) + `src/components/Dashboard.css` (dashboard), cada um importado pelo componente correspondente.

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

Logo — não alterar o gradiente:

- Ícone (Logo.jsx): `#00A8FF → #2979FF → #1565D8 → #1A3FCC`
- Texto "Redes": `#1a3fcc → #2e8fff → #3b9dff`; "Nex": `#0a0e1a → #12141f`

Fontes: Inter (UI) e Poppins (só o logo), via Google Fonts no `index.html`.
