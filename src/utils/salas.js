// Camada de dados das salas — persistência em localStorage.
// Ponto único de acesso para trocar por um backend depois.

import { ICONES_SALA, CORES_SALA } from '../components/sala/opcoes'

const STORAGE_KEY = 'nexredes_salas'

function criarId() {
  return `sala-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}

function criarIdItem(prefixo) {
  return `${prefixo}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}

// Garante id em pontos, equipamentos e falhas vindos do formulário
function normalizarItens(dados) {
  return {
    ...dados,
    pontosRede: (dados.pontosRede || []).map((item) => ({
      ...item,
      id: item.id || criarIdItem('ponto'),
    })),
    equipamentos: (dados.equipamentos || []).map((item) => ({
      ...item,
      id: item.id || criarIdItem('equip'),
    })),
    falhas: (dados.falhas || []).map((item) => ({
      ...item,
      id: item.id || criarIdItem('falha'),
    })),
  }
}

// Primitivas de persistência — também usadas pela camada de racks (utils/racks.js)
export function carregarSalas() {
  try {
    const bruto = localStorage.getItem(STORAGE_KEY)
    const salas = bruto ? JSON.parse(bruto) : []
    return Array.isArray(salas) ? salas : []
  } catch {
    return []
  }
}

export function salvarSalas(salas) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(salas))
}

export function listarSalas() {
  return carregarSalas()
}

export function criarSala(dados) {
  const agora = new Date().toISOString()
  const nova = {
    ...normalizarItens(dados),
    id: criarId(),
    racks: [],
    criadoEm: agora,
    atualizadoEm: agora,
  }
  const salas = carregarSalas()
  salas.push(nova)
  salvarSalas(salas)
  return nova
}

export function editarSala(id, dados) {
  const salas = carregarSalas()
  const indice = salas.findIndex((sala) => sala.id === id)
  if (indice === -1) return null
  const atualizada = {
    ...salas[indice],
    ...normalizarItens(dados),
    // Racks são gerenciados apenas pela camada utils/racks.js:
    // preservar o que já existe ao editar a sala pelo modal.
    racks: salas[indice].racks || [],
    id,
    atualizadoEm: new Date().toISOString(),
  }
  salas[indice] = atualizada
  salvarSalas(salas)
  return atualizada
}

export function excluirSala(id) {
  const salas = carregarSalas().filter((sala) => sala.id !== id)
  salvarSalas(salas)
}

// Sugere o próximo código sequencial disponível: SALA-01, SALA-02, ...
export function gerarCodigoSalas() {
  const salas = carregarSalas()
  let maior = 0
  for (const sala of salas) {
    const match = /^SALA-(\d+)$/.exec((sala.codigo || '').trim().toUpperCase())
    if (match) maior = Math.max(maior, Number(match[1]))
  }
  return `SALA-${String(maior + 1).padStart(2, '0')}`
}

// Status sempre derivado das falhas — nunca é salvo.
export function calcularStatus(falhas = []) {
  const ativas = falhas.filter((falha) => falha.status !== 'resolvida')
  if (ativas.some((falha) => falha.gravidade === 'critica')) return 'critico'
  if (ativas.length > 0) return 'atencao'
  return 'operacional'
}

export function contarFalhasAtivas(falhas = []) {
  return falhas.filter((falha) => falha.status !== 'resolvida').length
}

// Resolução de cor/ícone com fallbacks seguros
export function corDaSala(corId) {
  const cor = CORES_SALA.find((item) => item.id === corId)
  return cor ? cor.valor : CORES_SALA[0].valor
}

export function iconeSala(iconeId) {
  const icone = ICONES_SALA.find((item) => item.id === iconeId)
  return icone ? icone.Icon : ICONES_SALA[0].Icon
}
