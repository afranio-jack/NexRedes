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

function texto(valor) {
  return (valor || '').trim()
}

// Migração dos tipos de dispositivo removidos das opções ("Outro switch" e
// "Patch panel"): registros legados viram 'outro' quando têm nome/MAC/IP
// (dados preservados) ou '' (Nenhum) quando não há mais nada preenchido.
// O vínculo equivalente NÃO é gerado automaticamente — não dá para inferir
// a porta alvo — e pode ser criado manualmente no campo "Vínculos".
// Pura e idempotente: devolve quantas portas foram alteradas.
export function migrarTiposDispositivoRemovidos(salas) {
  let alteradas = 0
  for (const sala of salas || []) {
    for (const rack of sala?.racks || []) {
      for (const equipamento of rack.equipamentos || []) {
        for (const porta of equipamento.portas || []) {
          const tipo = porta.dispositivoConectado?.tipo
          if (tipo !== 'switch' && tipo !== 'patch_panel') continue
          const restante =
            texto(porta.dispositivoConectado?.nome) ||
            texto(porta.dispositivoConectado?.mac) ||
            texto(porta.dispositivoConectado?.ip)
          porta.dispositivoConectado.tipo = restante ? 'outro' : ''
          alteradas++
        }
      }
    }
  }
  return alteradas
}
