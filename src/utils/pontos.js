// Camada de dados dos pontos de rede estruturados (aba "Redes").
// Persistência: dentro do objeto de cada sala (chave nexredes_salas), em
// `sala.pontos` — aninhados como os racks, para acompanhar o ciclo de vida
// da sala. Trocar por backend = trocar só essa camada.
//
// Um ponto guarda a cadeia: identificação → patch panel/porta → porta de
// switch → categoria do cabo. Ao salvar, as portas envolvidas são marcadas
// (verso do patch panel e porta do switch) e, quando ambos os lados estão
// livres, o vínculo frente do patch panel ↔ porta do switch é criado
// espelhado — assim o visual colorido das portas e a "cadeia do cabo" já
// existentes refletem o ponto automaticamente.

import { carregarSalas, salvarSalas } from './salas'
import { agoraISO } from './datas'
import { calcularEstadoPorta, registrarHistorico } from './racks'

function criarIdItem(prefixo) {
  return `${prefixo}-${Date.now().toString(36)}-${Math.random()
    .toString(36)
    .slice(2, 8)}`
}

function texto(valor) {
  return (valor || '').trim()
}

function encontrarSala(salas, salaId) {
  return salas.find((sala) => sala.id === salaId) || null
}

function encontrarEquipamentoNaSala(sala, equipamentoId) {
  for (const rack of sala.racks || []) {
    const equipamento = (rack.equipamentos || []).find(
      (eq) => eq.id === equipamentoId
    )
    if (equipamento) return equipamento
  }
  return null
}

function encontrarPorta(equipamento, portaId) {
  return (equipamento.portas || []).find((porta) => porta.id === portaId) || null
}

function localizarPonto(salas, pontoId) {
  for (const sala of salas) {
    const pontos = sala.pontos || []
    const indice = pontos.findIndex((ponto) => ponto.id === pontoId)
    if (indice !== -1) return { sala, ponto: pontos[indice], indice }
  }
  return { sala: null, ponto: null, indice: -1 }
}

// ---------- Consultas puras ----------

export function listarPontos(sala) {
  return sala?.pontos || []
}

// Todos os pontos de todas as salas (cada item ganha `sala` anexada)
export function listarTodosPontos(salas) {
  const pontos = []
  for (const sala of salas) {
    for (const ponto of sala.pontos || []) {
      pontos.push({ ...ponto, sala })
    }
  }
  return pontos
}

export function obterPonto(salas, pontoId) {
  for (const sala of salas) {
    const ponto = (sala.pontos || []).find((item) => item.id === pontoId)
    if (ponto) return { ...ponto, sala }
  }
  return null
}

// Ponto ligado a qualquer porta do conjunto recebido (frente + verso do
// painel lateral, ou a porta única de um switch)
export function pontoDoPainel(sala, portas) {
  for (const porta of portas || []) {
    const pontoId = porta?.pontoRede?.pontoId
    if (!pontoId) continue
    const ponto = (sala?.pontos || []).find((item) => item.id === pontoId)
    if (ponto) return ponto
  }
  return null
}

// ---------- Validação ----------

// Porta disponível para o ponto: livre (visual branco) ou já marcada pelo
// próprio ponto (no caso de edição)
export function portaDisponivelParaPonto(porta, falhas = [], pontoIdAtual = null) {
  if (!porta) return false
  if (porta.pontoRede?.pontoId && porta.pontoRede.pontoId === pontoIdAtual) {
    return true
  }
  return calcularEstadoPorta(porta, falhas) === 'livre'
}

export function validarPonto(sala, form, pontoIdAtual = null) {
  const erros = {}
  const identificacao = texto(form.identificacao)
  if (!identificacao) {
    erros.identificacao = 'Informe a identificação do ponto.'
  } else if (
    (sala?.pontos || []).some(
      (ponto) =>
        ponto.id !== pontoIdAtual &&
        texto(ponto.identificacao).toLowerCase() === identificacao.toLowerCase()
    )
  ) {
    erros.identificacao = 'Já existe um ponto com essa identificação nesta sala.'
  }

  if (!form.salaId) erros.salaId = 'Escolha a sala.'
  if (!form.patchPanelId) erros.patchPanelId = 'Escolha o patch panel.'
  if (!form.portaPatchPanelId) {
    erros.portaPatchPanelId = 'Escolha a porta do patch panel.'
  }
  if (!form.switchId) erros.switchId = 'Escolha o switch.'
  if (!form.portaSwitchId) erros.portaSwitchId = 'Escolha a porta do switch.'
  if (!form.categoriaCabo) erros.categoriaCabo = 'Escolha a categoria do cabo.'

  // Defesa contra estados desatualizados: portas realmente disponíveis
  const falhas = sala?.falhas || []
  const patchPanel = form.patchPanelId
    ? encontrarEquipamentoNaSala(sala, form.patchPanelId)
    : null
  const portaVerso = patchPanel
    ? encontrarPorta(patchPanel, form.portaPatchPanelId)
    : null
  if (
    portaVerso &&
    !portaDisponivelParaPonto(portaVerso, falhas, pontoIdAtual)
  ) {
    erros.portaPatchPanelId = 'Essa porta do patch panel já está ocupada.'
  }
  const switchEquipamento = form.switchId
    ? encontrarEquipamentoNaSala(sala, form.switchId)
    : null
  const portaSwitch = switchEquipamento
    ? encontrarPorta(switchEquipamento, form.portaSwitchId)
    : null
  if (
    portaSwitch &&
    !portaDisponivelParaPonto(portaSwitch, falhas, pontoIdAtual)
  ) {
    erros.portaSwitchId = 'Essa porta do switch já está ocupada.'
  }
  return erros
}

// Sugere a próxima identificação disponível da sala (prefixo + número)
export function sugerirIdentificacao(sala, prefixo = 'CO-P') {
  const pontos = sala?.pontos || []
  let numero = pontos.length + 1
  for (;;) {
    const candidata = `${prefixo}${String(numero).padStart(2, '0')}`
    const existe = pontos.some(
      (ponto) =>
        texto(ponto.identificacao).toLowerCase() === candidata.toLowerCase()
    )
    if (!existe) return candidata
    numero++
  }
}

// ---------- Marcação das portas ----------

// Limpa a marca de um ponto numa porta (seja ela qual for a escrita atual)
function desmarcarPorta(porta, pontoId) {
  if (porta && porta.pontoRede?.pontoId === pontoId) {
    porta.pontoRede = { pontoId: null, identificacao: '', local: '' }
  }
}

// Marca as portas do ponto: verso do patch panel, porta do switch e (se os
// dois lados estiverem livres) o vínculo frente do PP ↔ porta do switch.
function marcarPortasDoPonto(ponto, { patchPanel, portaVerso, portaFrente, switchEquipamento, portaSwitch }) {
  const categoria = ponto.categoriaCabo || ''
  if (portaVerso) {
    portaVerso.pontoRede = {
      pontoId: ponto.id,
      identificacao: ponto.identificacao,
      local: '',
    }
    if (categoria) portaVerso.categoriaCabo = categoria
    registrarHistorico(
      portaVerso,
      `Porta vinculada ao ponto ${ponto.identificacao}`
    )
  }
  if (portaSwitch) {
    portaSwitch.pontoRede = {
      pontoId: ponto.id,
      identificacao: ponto.identificacao,
      local: '',
    }
    if (categoria) portaSwitch.categoriaCabo = categoria
    registrarHistorico(
      portaSwitch,
      `Porta vinculada ao ponto ${ponto.identificacao}`
    )
  }
  if (
    portaFrente &&
    !portaFrente.vinculo &&
    portaSwitch &&
    !portaSwitch.vinculo
  ) {
    portaFrente.vinculo = {
      equipamentoId: switchEquipamento.id,
      portaId: portaSwitch.id,
      lado: portaSwitch.lado,
    }
    portaSwitch.vinculo = {
      equipamentoId: patchPanel.id,
      portaId: portaFrente.id,
      lado: portaFrente.lado,
    }
    registrarHistorico(
      portaFrente,
      `Vinculada a ${switchEquipamento.nome} / porta ${portaSwitch.numero}`
    )
    registrarHistorico(
      portaSwitch,
      `Vinculada a ${patchPanel.nome} / porta ${portaFrente.numero}`
    )
  }
}

// Resolve a porta do patch panel: aceita o id da porta do verso ou (por
// defesa) da frente do mesmo número, normalizando sempre para o verso
function resolverPortaVerso(patchPanel, portaId) {
  const porta = encontrarPorta(patchPanel, portaId)
  if (!porta) return null
  if (porta.lado === 'verso') return porta
  return (
    (patchPanel.portas || []).find(
      (item) => item.lado === 'verso' && item.numero === porta.numero
    ) || porta
  )
}

// ---------- Mutações (recarregam do storage, aplicam e salvam) ----------

export function criarPonto(dados) {
  const salas = carregarSalas()
  const sala = encontrarSala(salas, dados.salaId)
  if (!sala) return null
  const patchPanel = encontrarEquipamentoNaSala(sala, dados.patchPanelId)
  const switchEquipamento = encontrarEquipamentoNaSala(sala, dados.switchId)
  if (!patchPanel || !switchEquipamento) return null
  const portaVerso = resolverPortaVerso(patchPanel, dados.portaPatchPanelId)
  const portaSwitch = encontrarPorta(switchEquipamento, dados.portaSwitchId)
  if (!portaVerso || !portaSwitch) return null

  const portaFrente = (patchPanel.portas || []).find(
    (porta) => porta.lado === 'frente' && porta.numero === portaVerso.numero
  )
  const ponto = {
    id: criarIdItem('ponto'),
    identificacao: texto(dados.identificacao),
    salaId: sala.id,
    patchPanelId: patchPanel.id,
    portaPatchPanelId: portaVerso.id,
    portaPatchPanel: portaVerso.numero,
    switchId: switchEquipamento.id,
    portaSwitchId: portaSwitch.id,
    portaSwitch: portaSwitch.numero,
    categoriaCabo: dados.categoriaCabo || '',
    observacoes: texto(dados.observacoes),
    criadoEm: agoraISO(),
  }
  sala.pontos = [...(sala.pontos || []), ponto]
  marcarPortasDoPonto(ponto, {
    patchPanel,
    portaVerso,
    portaFrente,
    switchEquipamento,
    portaSwitch,
  })
  salvarSalas(salas)
  return ponto
}

export function editarPonto(pontoId, dados) {
  const salas = carregarSalas()
  const { sala, ponto } = localizarPonto(salas, pontoId)
  if (!ponto) return null

  const patchPanelAntigo = ponto.patchPanelId
    ? encontrarEquipamentoNaSala(sala, ponto.patchPanelId)
    : null
  const versoAntigo = patchPanelAntigo
    ? encontrarPorta(patchPanelAntigo, ponto.portaPatchPanelId)
    : null
  const frenteAntiga = versoAntigo && patchPanelAntigo
    ? (patchPanelAntigo.portas || []).find(
        (porta) => porta.lado === 'frente' && porta.numero === versoAntigo.numero
      )
    : null
  const switchAntigo = ponto.switchId
    ? encontrarEquipamentoNaSala(sala, ponto.switchId)
    : null
  const portaSwitchAntiga = switchAntigo
    ? encontrarPorta(switchAntigo, ponto.portaSwitchId)
    : null

  const patchPanelNovo = dados.patchPanelId
    ? encontrarEquipamentoNaSala(sala, dados.patchPanelId)
    : null
  const switchNovo = dados.switchId
    ? encontrarEquipamentoNaSala(sala, dados.switchId)
    : null
  const versoNovo = patchPanelNovo
    ? resolverPortaVerso(patchPanelNovo, dados.portaPatchPanelId)
    : null
  const portaSwitchNova = switchNovo
    ? encontrarPorta(switchNovo, dados.portaSwitchId)
    : null

  const mudouPatchPanel = ponto.portaPatchPanelId !== (versoNovo?.id ?? null)
  const mudouSwitch = ponto.portaSwitchId !== (portaSwitchNova?.id ?? null)

  // 1. Desmarca as portas antigas que não continuam no ponto
  if (mudouPatchPanel && versoAntigo) {
    desmarcarPorta(versoAntigo, pontoId)
    registrarHistorico(
      versoAntigo,
      `Vínculo com o ponto ${ponto.identificacao} removido`
    )
  }
  if (mudouSwitch && portaSwitchAntiga) {
    desmarcarPorta(portaSwitchAntiga, pontoId)
    registrarHistorico(
      portaSwitchAntiga,
      `Vínculo com o ponto ${ponto.identificacao} removido`
    )
    // Desfaz o vínculo frente ↔ switch antigo, se foi este ponto quem criou
    if (
      frenteAntiga?.vinculo?.portaId === portaSwitchAntiga.id &&
      portaSwitchAntiga.vinculo?.portaId === frenteAntiga.id
    ) {
      frenteAntiga.vinculo = null
      portaSwitchAntiga.vinculo = null
    }
  }

  // 2. Atualiza o registro do ponto
  Object.assign(ponto, {
    identificacao: texto(dados.identificacao),
    salaId: sala.id,
    patchPanelId: patchPanelNovo?.id || null,
    portaPatchPanelId: versoNovo?.id || null,
    portaPatchPanel: versoNovo?.numero ?? null,
    switchId: switchNovo?.id || null,
    portaSwitchId: portaSwitchNova?.id || null,
    portaSwitch: portaSwitchNova?.numero ?? null,
    categoriaCabo: dados.categoriaCabo || '',
    observacoes: texto(dados.observacoes),
  })

  // 3. Marca as portas (novas e as que continuam, atualizando texto/categoria)
  if (versoNovo && portaSwitchNova) {
    const frenteNova = (patchPanelNovo.portas || []).find(
      (porta) => porta.lado === 'frente' && porta.numero === versoNovo.numero
    )
    marcarPortasDoPonto(ponto, {
      patchPanel: patchPanelNovo,
      portaVerso: versoNovo,
      portaFrente: frenteNova,
      switchEquipamento: switchNovo,
      portaSwitch: portaSwitchNova,
    })
  }

  salvarSalas(salas)
  return ponto
}

export function excluirPonto(pontoId) {
  const salas = carregarSalas()
  const { sala, ponto, indice } = localizarPonto(salas, pontoId)
  if (!ponto) return null

  const patchPanel = ponto.patchPanelId
    ? encontrarEquipamentoNaSala(sala, ponto.patchPanelId)
    : null
  const portaVerso = patchPanel
    ? encontrarPorta(patchPanel, ponto.portaPatchPanelId)
    : null
  const portaFrente = portaVerso && patchPanel
    ? (patchPanel.portas || []).find(
        (porta) => porta.lado === 'frente' && porta.numero === portaVerso.numero
      )
    : null
  const switchEquipamento = ponto.switchId
    ? encontrarEquipamentoNaSala(sala, ponto.switchId)
    : null
  const portaSwitch = switchEquipamento
    ? encontrarPorta(switchEquipamento, ponto.portaSwitchId)
    : null

  if (portaVerso) {
    desmarcarPorta(portaVerso, pontoId)
    registrarHistorico(
      portaVerso,
      `Vínculo com o ponto ${ponto.identificacao} removido`
    )
  }
  if (portaSwitch) {
    desmarcarPorta(portaSwitch, pontoId)
    registrarHistorico(
      portaSwitch,
      `Vínculo com o ponto ${ponto.identificacao} removido`
    )
  }
  if (
    portaFrente &&
    portaSwitch &&
    portaFrente.vinculo?.portaId === portaSwitch.id &&
    portaSwitch.vinculo?.portaId === portaFrente.id
  ) {
    portaFrente.vinculo = null
    portaSwitch.vinculo = null
  }

  sala.pontos.splice(indice, 1)
  salvarSalas(salas)
  return true
}

// ---------- Reconciliação (portas mudam por fora do ponto) ----------

// Chamar após salvarPorta/liberarPorta: se a porta perdeu a marca do ponto,
// o lado correspondente do ponto é zerado (identificação, observações e
// histórico de testes continuam).
export function sincronizarPontoDaPorta(salaId, equipamentoId, portaId) {
  const salas = carregarSalas()
  const sala = encontrarSala(salas, salaId)
  if (!sala) return
  const equipamento = encontrarEquipamentoNaSala(sala, equipamentoId)
  const porta = equipamento ? encontrarPorta(equipamento, portaId) : null
  if (!porta) return
  let mudou = false
  for (const ponto of sala.pontos || []) {
    const ligaPatchPanel =
      ponto.patchPanelId === equipamentoId &&
      ponto.portaPatchPanelId === portaId
    const ligaSwitch =
      ponto.switchId === equipamentoId && ponto.portaSwitchId === portaId
    if (!ligaPatchPanel && !ligaSwitch) continue
    if (porta.pontoRede?.pontoId === ponto.id) continue // ainda marcada
    if (ligaPatchPanel) {
      ponto.patchPanelId = null
      ponto.portaPatchPanelId = null
      ponto.portaPatchPanel = null
      mudou = true
    }
    if (ligaSwitch) {
      ponto.switchId = null
      ponto.portaSwitchId = null
      ponto.portaSwitch = null
      mudou = true
    }
  }
  if (mudou) salvarSalas(salas)
}

// Chamar após excluir equipamento (ou rack): zera os lados dos pontos que
// referenciavam o equipamento.
export function aoExcluirEquipamento(salaId, equipamentoId) {
  const salas = carregarSalas()
  const sala = encontrarSala(salas, salaId)
  if (!sala) return
  let mudou = false
  for (const ponto of sala.pontos || []) {
    if (ponto.patchPanelId === equipamentoId) {
      ponto.patchPanelId = null
      ponto.portaPatchPanelId = null
      ponto.portaPatchPanel = null
      mudou = true
    }
    if (ponto.switchId === equipamentoId) {
      ponto.switchId = null
      ponto.portaSwitchId = null
      ponto.portaSwitch = null
      mudou = true
    }
  }
  if (mudou) salvarSalas(salas)
}
