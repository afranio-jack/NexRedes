// Camada de dados do gerador de etiquetas: modelos de etiqueta
// (tamanhos pré-definidos, editáveis em Configurações) e a configuração
// geral (prefixo padrão de nomenclatura).
// ISOLADA POR USUÁRIO: chaves derivadas sempre da sessão válida
// (nexredes_modelos_etiqueta:<user> e nexredes_config:<user>) + carimbo de
// dono em cada registro. Trocar por backend = trocar só essa camada.

import { usuarioDaSessao, chaveDeUsuario, carimbarDono } from './sessao'
import { migrarChaveLegada } from './migracao'

const CHAVE_MODELOS_BASE = 'nexredes_modelos_etiqueta'
const CHAVE_MODELOS_LEGADA = 'nexredes_modelos_etiqueta' // antes do isolamento
const CHAVE_CONFIG_BASE = 'nexredes_config'
const CHAVE_CONFIG_LEGADA = 'nexredes_config' // antes do isolamento

// Modelos pré-definidos (largura/altura em milímetros)
const MODELOS_PADRAO = [
  { id: 'modelo-9x25', nome: '9 × 25 mm', largura: 25, altura: 9, configuracao: {} },
  { id: 'modelo-12x50', nome: '12 × 50 mm', largura: 50, altura: 12, configuracao: {} },
  { id: 'modelo-25x50', nome: '25 × 50 mm', largura: 50, altura: 25, configuracao: {} },
  { id: 'modelo-a4-30', nome: 'Folha A4 com 30 etiquetas', largura: 70, altura: 29.7, configuracao: {} },
]

function criarIdItem(prefixo) {
  return `${prefixo}-${Date.now().toString(36)}-${Math.random()
    .toString(36)
    .slice(2, 8)}`
}

export function listarModelos() {
  migrarChaveLegada(CHAVE_MODELOS_LEGADA, CHAVE_MODELOS_BASE)
  const chave = chaveDeUsuario(CHAVE_MODELOS_BASE)
  if (!chave) return [...MODELOS_PADRAO] // sem sessão: só leitura padrão
  let modelos = []
  try {
    const bruto = localStorage.getItem(chave)
    const lista = bruto ? JSON.parse(bruto) : []
    modelos = Array.isArray(lista) ? lista : []
  } catch {
    modelos = []
  }
  // Segunda camada: só modelos carimbados com o dono da sessão atual
  const usuario = usuarioDaSessao()
  modelos = modelos.filter((item) => item.usuario === usuario)
  if (modelos.length > 0) return modelos
  return salvarModelos([...MODELOS_PADRAO])
}

// Grava a lista completa de modelos (usada pela tela Configurações).
// Sem sessão: bloqueada (equivalente a 401). Devolve a lista carimbada.
export function salvarModelos(modelos) {
  const chave = chaveDeUsuario(CHAVE_MODELOS_BASE)
  if (!chave) throw new Error('Salvar modelos exige usuário autenticado.')
  const usuario = usuarioDaSessao()
  const carimbados = carimbarDono(modelos, usuario)
  localStorage.setItem(chave, JSON.stringify(carimbados))
  return carimbados
}

export function salvarModelo(modelo) {
  const modelos = listarModelos()
  if (modelo.id) {
    const indice = modelos.findIndex((item) => item.id === modelo.id)
    if (indice !== -1) modelos[indice] = { ...modelos[indice], ...modelo }
  } else {
    modelos.push({
      id: criarIdItem('modelo'),
      nome: modelo.nome || 'Novo modelo',
      largura: Number(modelo.largura) || 25,
      altura: Number(modelo.altura) || 9,
      configuracao: {},
    })
  }
  salvarModelos(modelos)
  return modelos
}

export function excluirModelo(id) {
  salvarModelos(listarModelos().filter((item) => item.id !== id))
}

export function restaurarModelosPadrao() {
  salvarModelos(
    MODELOS_PADRAO.map((modelo) => ({
      ...modelo,
      configuracao: { ...modelo.configuracao },
    }))
  )
}

// Grade da folha A4 para o modelo (colunas × linhas por página)
export function gradeDoModelo(modelo) {
  const largura = Number(modelo?.largura) || 25
  const altura = Number(modelo?.altura) || 9
  const colunas = Math.max(1, Math.floor(210 / largura))
  const linhas = Math.max(1, Math.floor(297 / altura))
  return { colunas, linhas, porPagina: colunas * linhas }
}

// ---------- Configuração geral ----------

export function obterConfig() {
  migrarChaveLegada(CHAVE_CONFIG_LEGADA, CHAVE_CONFIG_BASE)
  const chave = chaveDeUsuario(CHAVE_CONFIG_BASE)
  if (!chave) return { prefixoPadrao: 'CO-P' } // sem sessão: só padrões
  try {
    const bruto = localStorage.getItem(chave)
    const config = bruto ? JSON.parse(bruto) : {}
    if (!config || typeof config !== 'object') return { prefixoPadrao: 'CO-P' }
    // Segunda camada: config de outro dono é ignorada (fail closed)
    if (config.usuario !== usuarioDaSessao()) {
      return { prefixoPadrao: 'CO-P' }
    }
    return { prefixoPadrao: 'CO-P', ...config }
  } catch {
    return { prefixoPadrao: 'CO-P' }
  }
}

export function salvarConfig(config) {
  const chave = chaveDeUsuario(CHAVE_CONFIG_BASE)
  if (!chave) throw new Error('Salvar configuração exige usuário autenticado.')
  const usuario = usuarioDaSessao()
  localStorage.setItem(chave, JSON.stringify(carimbarDono(config, usuario)))
}
