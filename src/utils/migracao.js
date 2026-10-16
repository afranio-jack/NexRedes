// Migração dos dados legados (chaves antigas, sem dono) para o PRIMEIRO
// usuário cadastrado — nenhum registro fica sem dono.
// Idempotente e barata: só faz algo enquanto a chave legada existir.
// Se ainda não houver nenhum usuário, adia para o próximo carregamento.

import { getUsers } from './storage'
import { chaveParaUsuario, carimbarDono } from './sessao'

function lerJSON(chave, padrao) {
  try {
    const bruto = localStorage.getItem(chave)
    const valor = bruto ? JSON.parse(bruto) : padrao
    return valor === undefined ? padrao : valor
  } catch {
    return padrao
  }
}

export function migrarChaveLegada(chaveLegada, chaveBase) {
  try {
    if (localStorage.getItem(chaveLegada) === null) return
    const users = getUsers()
    if (users.length === 0) return
    const dono = users[0].username
    const destino = chaveParaUsuario(chaveBase, dono)
    const legado = lerJSON(chaveLegada, null)
    if (legado === null) {
      localStorage.removeItem(chaveLegada)
      return
    }
    const atual = lerJSON(destino, Array.isArray(legado) ? [] : {})
    const mesclado = Array.isArray(legado)
      ? [...(Array.isArray(atual) ? atual : []), ...legado]
      : { ...(atual && typeof atual === 'object' ? atual : {}), ...legado }
    localStorage.setItem(destino, JSON.stringify(carimbarDono(mesclado, dono)))
    localStorage.removeItem(chaveLegada)
  } catch {
    // A migração nunca deve derrubar o app; tenta de novo no próximo load.
  }
}
