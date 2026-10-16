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

// Config padrão do app — merge profundo com o que estiver salvo, então novas
// chaves sempre existem (telas nunca quebram com config antiga no storage).
export const CONFIG_PADRAO = {
  prefixoPadrao: 'CO-P',
  organizacao: {
    nomeEmpresa: '',
    responsavel: '',
    logo: '',
    endereco: '',
    fuso: 'America/Sao_Paulo',
    idioma: 'pt-BR',
    formatoData: 'dd/mm/aaaa',
    formatoHora: '24h',
    unidade: 'm',
  },
  nomenclatura: {
    digitos: 2, // 2 → P01 · 3 → P001
    prefixoPatchPanel: 'PP',
    prefixoSwitch: 'SW',
    prefixoRack: 'RACK',
    prefixoSala: 'SALA',
  },
  etiquetas: {
    conteudo: {
      nomePonto: true,
      patchPanel: false,
      switchPorta: true,
      qr: false,
      logo: false,
    },
    tamanhoFonte: 9,
    margens: 1,
    modeloPadraoId: '',
  },
  rede: {
    categoriasCabo: [
      { id: 'cat5e', nome: 'Cat5e', cor: '#2563eb', comprimentoMax: '100' },
      { id: 'cat6', nome: 'Cat6', cor: '#16a34a', comprimentoMax: '100' },
      { id: 'cat6a', nome: 'Cat6A', cor: '#f59e0b', comprimentoMax: '100' },
      { id: 'outro', nome: 'Outro', cor: '#6b7280', comprimentoMax: '' },
    ],
    categoriasPonto: [
      { id: 'dados', nome: 'Dados', icone: 'plug', cor: '#2563eb' },
      { id: 'voz', nome: 'Voz', icone: 'phone', cor: '#7c3aed' },
      { id: 'wifi', nome: 'Wi-Fi', icone: 'wifi', cor: '#f59e0b' },
      { id: 'camera', nome: 'Câmera', icone: 'camera', cor: '#ef4444' },
      { id: 'impressora', nome: 'Impressora', icone: 'printer', cor: '#6b7280' },
    ],
    statusPonto: [
      { id: 'operacional', nome: 'Operacional', cor: '#15803d' },
      { id: 'atencao', nome: 'Atenção', cor: '#b45309' },
      { id: 'critico', nome: 'Crítico', cor: '#b91c1c' },
    ],
    statusEquipamento: [
      { id: 'operacao', nome: 'Em operação', cor: '#15803d' },
      { id: 'manutencao', nome: 'Em manutenção', cor: '#b45309' },
      { id: 'falha', nome: 'Com falha', cor: '#b91c1c' },
    ],
    faixasVlan: [],
    portasPadraoPatchPanel: '24',
    portasPadraoSwitch: '24',
  },
  equipamentos: {
    tipos: [],
    fabricantes: [],
    avisoGarantiaDias: '30',
    camposPersonalizados: [],
  },
  testes: {
    criterios: {
      comprimentoMax: '100',
      atenuacaoMax: '',
      perdaRetornoMax: '',
      nextMin: '',
    },
    camposObrigatorios: {
      comprimentoM: false,
      mapaFios: false,
      atenuacao: false,
      next: false,
      perdaRetorno: false,
    },
    responsaveis: [],
    normaPadrao: 'TIA/EIA-568-C',
  },
  notificacoes: {
    falhasNovas: true,
    testesReprovados: true,
    garantiaVencendo: true,
    pontosSemTeste: true,
    diasSemTeste: '30',
    silenciar: false,
  },
  aparencia: {
    tema: 'claro',
    corDestaque: '',
    tamanhoFonte: 'padrao',
    densidade: 'confortavel',
    telaInicial: 'salas',
  },
  conta: {
    foto: '',
  },
}

// Mescla o salvo por cima dos padrões (o salvo sempre vence)
function mesclarConfig(padrao, salvo) {
  if (Array.isArray(padrao)) return Array.isArray(salvo) ? salvo : padrao
  if (padrao && typeof padrao === 'object') {
    const saida = {}
    for (const chave of Object.keys(padrao)) {
      saida[chave] = mesclarConfig(
        padrao[chave],
        salvo && typeof salvo === 'object' ? salvo[chave] : undefined
      )
    }
    for (const chave of Object.keys(salvo || {})) {
      if (!(chave in saida)) saida[chave] = salvo[chave]
    }
    return saida
  }
  return salvo === undefined ? padrao : salvo
}

export function obterConfig() {
  migrarChaveLegada(CHAVE_CONFIG_LEGADA, CHAVE_CONFIG_BASE)
  const chave = chaveDeUsuario(CHAVE_CONFIG_BASE)
  if (!chave) return mesclarConfig(CONFIG_PADRAO, null) // sem sessão: só padrões
  try {
    const bruto = localStorage.getItem(chave)
    const config = bruto ? JSON.parse(bruto) : {}
    if (!config || typeof config !== 'object') {
      return mesclarConfig(CONFIG_PADRAO, null)
    }
    // Segunda camada: config de outro dono é ignorada (fail closed)
    if (config.usuario !== usuarioDaSessao()) {
      return mesclarConfig(CONFIG_PADRAO, null)
    }
    return mesclarConfig(CONFIG_PADRAO, config)
  } catch {
    return mesclarConfig(CONFIG_PADRAO, null)
  }
}

export function salvarConfig(config) {
  const chave = chaveDeUsuario(CHAVE_CONFIG_BASE)
  if (!chave) throw new Error('Salvar configuração exige usuário autenticado.')
  const usuario = usuarioDaSessao()
  localStorage.setItem(chave, JSON.stringify(carimbarDono(config, usuario)))
}
