// Camada de dados das salas — persistência em localStorage, ISOLADA POR
// USUÁRIO: cada usuário só lê/grava na própria chave (nexredes_salas:<user>),
// derivada sempre da sessão válida. O dono também é carimbado em cada sala
// e validado na leitura (segunda camada, como user_id + RLS).
// Entidades filhas (racks, equipamentos, portas, pontos, falhas) herdam o
// dono da sala — nunca são consultadas fora dela.
// Ponto único de acesso para trocar por um backend depois.

import { ICONES_SALA, CORES_SALA } from '../components/sala/opcoes'
import { usuarioDaSessao, chaveDeUsuario, carimbarDono } from './sessao'
import { migrarChaveLegada } from './migracao'

const CHAVE_BASE = 'nexredes_salas'
const CHAVE_LEGADA = 'nexredes_salas' // dados de antes do isolamento por usuário

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
// e pelas camadas de pontos e testes. Sem sessão: leitura devolve vazio,
// gravação é bloqueada (equivalente a 401).
export function carregarSalas() {
  migrarChaveLegada(CHAVE_LEGADA, CHAVE_BASE)
  const chave = chaveDeUsuario(CHAVE_BASE)
  if (!chave) return []
  try {
    const bruto = localStorage.getItem(chave)
    const salas = bruto ? JSON.parse(bruto) : []
    if (!Array.isArray(salas)) return []
    // Segunda camada: só salas carimbadas com o dono da sessão atual
    const usuario = usuarioDaSessao()
    return salas.filter((sala) => sala.usuario === usuario)
  } catch {
    return []
  }
}

export function salvarSalas(salas) {
  const chave = chaveDeUsuario(CHAVE_BASE)
  if (!chave) throw new Error('Salvar salas exige usuário autenticado.')
  const usuario = usuarioDaSessao()
  localStorage.setItem(chave, JSON.stringify(carimbarDono(salas, usuario)))
}

export function listarSalas() {
  return carregarSalas()
}

export function criarSala(dados) {
  const usuario = usuarioDaSessao()
  if (!usuario) throw new Error('Criar sala exige usuário autenticado.')
  const agora = new Date().toISOString()
  const nova = {
    ...normalizarItens(dados),
    id: criarId(),
    usuario, // dono gravado automaticamente, nunca pelo formulário
    racks: [],
    pontos: [],
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
    // Racks e pontos estruturados são gerenciados apenas pelas camadas
    // utils/racks.js e utils/pontos.js: preservar o que já existe ao editar
    // a sala pelo modal.
    racks: salas[indice].racks || [],
    pontos: salas[indice].pontos || [],
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
