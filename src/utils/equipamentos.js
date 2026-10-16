// Camada de dados da tela "Equipamentos": inventário unificado de switches,
// patch panels e racks (que vivem dentro de cada sala, via utils/racks.js)
// e dos equipamentos associados às salas (sala.equipamentos — as "máquinas"
// e dispositivos), com CRUD próprio e campos extras (fabricante, nº de série,
// garantia...). Trocar por backend = trocar só essa camada.

import { carregarSalas, salvarSalas } from './salas'
import { agoraISO } from './datas'
import { calcularEstadoPorta, criarEquipamento } from './racks'

function criarIdItem(prefixo) {
  return `${prefixo}-${Date.now().toString(36)}-${Math.random()
    .toString(36)
    .slice(2, 8)}`
}

function texto(valor) {
  return (valor || '').trim()
}

// Tipos oferecidos pelo painel "Novo equipamento" (switch/patch panel/rack
// viram entidades reais dos racks; o resto vira equipamento associado à sala)
export const TIPOS_PAINEL = [
  'Switch',
  'Patch panel',
  'Rack',
  'Máquina',
  'Roteador',
  'Access point',
  'Servidor',
  'Outro',
]

// Tipos exibidos na sub-aba "Máquinas" (dispositivos de ponta da sala)
export const TIPOS_MAQUINA = [
  'Máquina',
  'Roteador',
  'Access point',
  'Servidor',
]

// Status dos equipamentos de rack — id fixo, rótulo/cor podem vir da
// configuração (Configurações → Rede → status de equipamento)
export const STATUS_PADRAO = {
  operacao: { nome: 'Em operação', cor: '#15803d' },
  manutencao: { nome: 'Em manutenção', cor: '#b45309' },
  falha: { nome: 'Com falha', cor: '#b91c1c' },
}

export function infoStatus(id, statusConfig = []) {
  const achado = statusConfig.find((item) => item.id === id)
  if (achado) return { nome: achado.nome, cor: achado.cor }
  return STATUS_PADRAO[id] || { nome: '—', cor: '#6b7280' }
}

// ---------- Status (sempre derivado dos dados, nunca salvo) ----------

function statusEquipamentoRack(sala, equipamento) {
  const falhas = sala.falhas || []
  let comFalha = false
  let emManutencao = false
  for (const porta of equipamento.portas || []) {
    const estado = calcularEstadoPorta(porta, falhas)
    if (estado === 'critica' || estado === 'atencao') comFalha = true
  }
  // Falhas registradas nas portas deste equipamento ("EQUIP / porta N")
  const prefixo = `${equipamento.nome} / porta`
  for (const falha of falhas) {
    if (falha.status === 'resolvida') continue
    if (!(falha.alvo || '').startsWith(prefixo)) continue
    if (falha.status === 'em_andamento') emManutencao = true
    else comFalha = true
  }
  if (comFalha) return 'falha'
  if (emManutencao) return 'manutencao'
  return 'operacao'
}

function statusDoRack(sala, rack) {
  let status = 'operacao'
  for (const equipamento of rack.equipamentos || []) {
    const atual = statusEquipamentoRack(sala, equipamento)
    if (atual === 'falha') return 'falha'
    if (atual === 'manutencao') status = 'manutencao'
  }
  return status
}

// ---------- Inventário unificado ----------

// Monta uma linha por item do inventário:
// - switches e patch panels dos racks (kind 'rack_equipment')
// - os próprios racks (kind 'rack')
// - equipamentos associados às salas (kind 'associado' — máquinas e outros)
export function montarInventario(salas) {
  const linhas = []
  for (const sala of salas) {
    for (const rack of sala.racks || []) {
      linhas.push({
        chave: `rack-${rack.id}`,
        kind: 'rack',
        id: rack.id,
        nome: rack.nome,
        tipoExibicao: 'Rack',
        sala,
        salaId: sala.id,
        rack: null,
        rackId: rack.id,
        rackObj: rack,
        modelo: '',
        fabricante: '',
        numeroSerie: '',
        ip: '',
        mac: '',
        quantidadePortas: null,
        posicaoU: null,
        alturaU: rack.alturaU,
        localizacao: rack.localizacao || '',
        dataAquisicao: '',
        garantia: '',
        observacoes: rack.observacoes || '',
        status: statusDoRack(sala, rack),
        atualizadoEm: sala.atualizadoEm || null,
        equipamento: null,
        item: null,
      })
      for (const equipamento of rack.equipamentos || []) {
        linhas.push({
          chave: `eq-${equipamento.id}`,
          kind: 'rack_equipment',
          id: equipamento.id,
          nome: equipamento.nome,
          tipoExibicao:
            equipamento.tipo === 'switch' ? 'Switch' : 'Patch panel',
          sala,
          salaId: sala.id,
          rack,
          rackId: rack.id,
          rackObj: rack,
          modelo: equipamento.modelo || '',
          fabricante: equipamento.fabricante || '',
          numeroSerie: equipamento.numeroSerie || '',
          ip: equipamento.ipGerencia || '',
          mac: equipamento.mac || '',
          quantidadePortas: equipamento.quantidadePortas || 0,
          quantidadeUplink: equipamento.quantidadeUplink || 0,
          categoriaCaboPadrao: equipamento.categoriaCaboPadrao || '',
          posicaoU: equipamento.posicaoU || null,
          alturaU: null,
          localizacao: '',
          dataAquisicao: equipamento.dataAquisicao || '',
          garantia: equipamento.garantia || '',
          observacoes: equipamento.observacoes || '',
          status: statusEquipamentoRack(sala, equipamento),
          atualizadoEm:
            equipamento.atualizadoEm || sala.atualizadoEm || null,
          equipamento,
          item: null,
        })
      }
    }
    for (const item of sala.equipamentos || []) {
      linhas.push({
        chave: `assoc-${item.id}`,
        kind: 'associado',
        id: item.id,
        nome: item.nome,
        tipoExibicao: item.tipo || 'Outro',
        sala,
        salaId: sala.id,
        rack: null,
        rackId: null,
        rackObj: null,
        modelo: item.modelo || '',
        fabricante: item.fabricante || '',
        numeroSerie: item.numeroSerie || '',
        ip: item.ip || '',
        mac: item.mac || '',
        quantidadePortas: null,
        posicaoU: null,
        alturaU: null,
        localizacao: '',
        dataAquisicao: item.dataAquisicao || '',
        garantia: item.garantia || '',
        observacoes: item.observacao || item.observacoes || '',
        status: null, // sem telemetria — "—"
        atualizadoEm: item.atualizadoEm || sala.atualizadoEm || null,
        equipamento: null,
        item,
      })
    }
  }
  return linhas
}

// Sub-aba de cada linha do inventário
export function abaDaLinha(linha) {
  if (linha.kind === 'rack') return 'racks'
  const tipo = linha.tipoExibicao
  if (tipo === 'Switch') return 'switches'
  if (tipo === 'Patch panel') return 'patch_panels'
  if (tipo === 'Rack') return 'racks'
  if (TIPOS_MAQUINA.includes(tipo)) return 'maquinas'
  return 'outros'
}

// ---------- Equipamentos associados à sala (máquinas e outros) ----------

export function salvarEquipamentoAssociado(salaId, dados, itemId = null) {
  const salas = carregarSalas()
  const sala = salas.find((item) => item.id === salaId)
  if (!sala) return null
  const agora = agoraISO()
  if (itemId) {
    const item = (sala.equipamentos || []).find((item) => item.id === itemId)
    if (!item) return null
    Object.assign(item, {
      tipo: dados.tipo,
      nome: texto(dados.nome),
      fabricante: texto(dados.fabricante),
      modelo: texto(dados.modelo),
      numeroSerie: texto(dados.numeroSerie),
      ip: texto(dados.ip),
      mac: texto(dados.mac),
      dataAquisicao: dados.dataAquisicao || '',
      garantia: dados.garantia || '',
      observacao: texto(dados.observacoes),
      atualizadoEm: agora,
    })
  } else {
    sala.equipamentos = [
      ...(sala.equipamentos || []),
      {
        id: criarIdItem('equip'),
        tipo: dados.tipo,
        nome: texto(dados.nome),
        fabricante: texto(dados.fabricante),
        modelo: texto(dados.modelo),
        numeroSerie: texto(dados.numeroSerie),
        ip: texto(dados.ip),
        mac: texto(dados.mac),
        vlan: '',
        dataAquisicao: dados.dataAquisicao || '',
        garantia: dados.garantia || '',
        observacao: texto(dados.observacoes),
        atualizadoEm: agora,
      },
    ]
  }
  salvarSalas(salas)
  return true
}

export function excluirEquipamentoAssociado(salaId, itemId) {
  const salas = carregarSalas()
  const sala = salas.find((item) => item.id === salaId)
  if (!sala) return false
  const antes = (sala.equipamentos || []).length
  sala.equipamentos = (sala.equipamentos || []).filter(
    (item) => item.id !== itemId
  )
  if (sala.equipamentos.length === antes) return false
  salvarSalas(salas)
  return true
}

export function duplicarEquipamentoAssociado(salaId, itemId) {
  const salas = carregarSalas()
  const sala = salas.find((item) => item.id === salaId)
  if (!sala) return null
  const item = (sala.equipamentos || []).find((entry) => entry.id === itemId)
  if (!item) return null
  const copia = {
    ...item,
    id: criarIdItem('equip'),
    nome: `${item.nome || 'Equipamento'} (cópia)`,
    atualizadoEm: agoraISO(),
  }
  sala.equipamentos = [...(sala.equipamentos || []), copia]
  salvarSalas(salas)
  return copia
}

// ---------- Campos extras dos equipamentos de rack ----------

// Guarda os campos que não existem no modelo básico do rack (fabricante,
// nº de série, MAC, aquisição, garantia) e o carimbo de atualização.
export function salvarExtrasEquipamentoRack(salaId, equipamentoId, extras) {
  const salas = carregarSalas()
  let equipamento = null
  for (const sala of salas) {
    for (const rack of sala.racks || []) {
      equipamento =
        (rack.equipamentos || []).find((item) => item.id === equipamentoId) ||
        null
      if (equipamento) break
    }
    if (equipamento) break
  }
  if (!equipamento) return null
  Object.assign(equipamento, {
    fabricante: texto(extras.fabricante),
    numeroSerie: texto(extras.numeroSerie),
    mac: texto(extras.mac),
    dataAquisicao: extras.dataAquisicao || '',
    garantia: extras.garantia || '',
    atualizadoEm: agoraISO(),
  })
  salvarSalas(salas)
  return equipamento
}

// Duplica um switch/patch panel: mesma configuração, próxima posição U livre
export function duplicarEquipamentoRack(salaId, rackId, equipamentoId) {
  const salas = carregarSalas()
  const sala = salas.find((item) => item.id === salaId)
  const rack = sala && (sala.racks || []).find((item) => item.id === rackId)
  const equipamento =
    rack && (rack.equipamentos || []).find((item) => item.id === equipamentoId)
  if (!equipamento) return null
  const usadas = new Set(
    (rack.equipamentos || []).map((item) => Number(item.posicaoU))
  )
  let posicao = 1
  while (usadas.has(posicao) && posicao <= rack.alturaU) posicao++
  if (posicao > rack.alturaU) return null // rack cheio
  // cria via camada de racks (gera as portas) e depois copia os extras
  const novo = criarEquipamento(salaId, rackId, {
    tipo: equipamento.tipo,
    nome: `${equipamento.nome || 'Equipamento'} (cópia)`,
    modelo: equipamento.modelo,
    quantidadePortas: equipamento.quantidadePortas,
    quantidadeUplink: equipamento.quantidadeUplink || 0,
    posicaoU: posicao,
    ipGerencia: equipamento.ipGerencia,
    categoriaCaboPadrao: equipamento.categoriaCaboPadrao,
    observacoes: equipamento.observacoes,
  })
  if (!novo) return null
  salvarExtrasEquipamentoRack(salaId, novo.id, {
    fabricante: equipamento.fabricante,
    numeroSerie: equipamento.numeroSerie,
    mac: equipamento.mac,
    dataAquisicao: equipamento.dataAquisicao,
    garantia: equipamento.garantia,
  })
  return novo
}
