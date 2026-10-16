// Sessão do usuário logado — equivalente local do token/sessão do servidor.
// O marcador fica em sessionStorage (por aba): dois logins em abas diferentes
// ficam isolados entre si. A camada de dados deriva SEMPRE o dono daqui —
// componentes nunca passam user_id (o valor enviado pelo front não é confiável).
//
// Trocar por backend = trocar só essa camada (token real no lugar do marcador).

import { getUsers } from './storage'

const SESSAO_KEY = 'nexredes_sessao'

export function iniciarSessao(username) {
  sessionStorage.setItem(
    SESSAO_KEY,
    JSON.stringify({ username: (username || '').toLowerCase() })
  )
}

export function encerrarSessao() {
  sessionStorage.removeItem(SESSAO_KEY)
}

// Nome de usuário normalizado da sessão válida, ou null se não houver.
// Só é válida se o usuário ainda existir (equivalente a validar o token).
export function usuarioDaSessao() {
  try {
    const bruto = sessionStorage.getItem(SESSAO_KEY)
    if (!bruto) return null
    const sessao = JSON.parse(bruto)
    const username = (sessao?.username || '').toLowerCase()
    if (!username) return null
    const existe = getUsers().some((user) => user.username === username)
    return existe ? username : null
  } catch {
    return null
  }
}

// Chave de storage exclusiva do usuário indicado (isolamento por dono).
export function chaveParaUsuario(base, username) {
  return `${base}:${(username || '').toLowerCase()}`
}

// Chave de storage exclusiva do usuário logado, ou null sem sessão.
export function chaveDeUsuario(base) {
  const usuario = usuarioDaSessao()
  return usuario ? chaveParaUsuario(base, usuario) : null
}

// Carimba o dono no registro (nível superior) — equivalente ao user_id da
// tabela. Listas recebem o carimbo em cada item; objetos, no próprio objeto.
// Entidades filhas (racks, portas, pontos, falhas) herdam o dono do pai —
// vivem dentro do registro da sala e nunca são consultadas fora dele.
export function carimbarDono(dados, usuario) {
  if (Array.isArray(dados)) {
    return dados.map((item) => ({ ...item, usuario }))
  }
  if (dados && typeof dados === 'object') {
    return { ...dados, usuario }
  }
  return dados
}
