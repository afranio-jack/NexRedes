// Camada de dados do gerador de etiquetas: modelos de etiqueta
// (tamanhos pré-definidos, editáveis em Configurações) e a configuração
// geral (prefixo padrão de nomenclatura).
// Trocar por backend = trocar só essa camada.

const STORAGE_MODELOS = 'nexredes_modelos_etiqueta'
const STORAGE_CONFIG = 'nexredes_config'

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
  try {
    const bruto = localStorage.getItem(STORAGE_MODELOS)
    const modelos = bruto ? JSON.parse(bruto) : []
    if (Array.isArray(modelos) && modelos.length > 0) return modelos
  } catch {
    // segue para o seed abaixo
  }
  salvarModelos([...MODELOS_PADRAO])
  return [...MODELOS_PADRAO]
}

function salvarModelosInternal(modelos) {
  localStorage.setItem(STORAGE_MODELOS, JSON.stringify(modelos))
}

// Grava a lista completa de modelos (usada pela tela Configurações)
export function salvarModelos(modelos) {
  salvarModelosInternal(modelos)
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
  salvarModelosInternal(modelos)
  return modelos
}

export function excluirModelo(id) {
  salvarModelosInternal(listarModelos().filter((item) => item.id !== id))
}

export function restaurarModelosPadrao() {
  salvarModelosInternal(
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
  try {
    const bruto = localStorage.getItem(STORAGE_CONFIG)
    const config = bruto ? JSON.parse(bruto) : {}
    return { prefixoPadrao: 'CO-P', ...config }
  } catch {
    return { prefixoPadrao: 'CO-P' }
  }
}

export function salvarConfig(config) {
  localStorage.setItem(STORAGE_CONFIG, JSON.stringify(config))
}
