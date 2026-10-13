// Camada de dados dos racks, equipamentos e portas.
// Persistência em localStorage dentro do objeto de cada sala (chave
// nexredes_salas) — ponto único de acesso para trocar por um backend depois.
//
// Consultas são funções puras sobre o objeto `sala` (que o Dashboard já tem);
// mutações recarregam do storage por id, aplicam e salvam de uma vez (transação).

import { carregarSalas, salvarSalas } from './salas'
import { hojeISO } from './datas'
import { IPV4_REGEX } from './validation'

function criarIdItem(prefixo) {
  return `${prefixo}-${Date.now().toString(36)}-${Math.random()
    .toString(36)
    .slice(2, 8)}`
}

// ---------- Helpers internos de navegação (sala → rack → equipamento → porta) ----------

function encontrarSala(salas, salaId) {
  return salas.find((sala) => sala.id === salaId) || null
}

function encontrarRack(sala, rackId) {
  return (sala.racks || []).find((rack) => rack.id === rackId) || null
}

function encontrarEquipamentoEmRack(rack, equipamentoId) {
  return (rack.equipamentos || []).find((eq) => eq.id === equipamentoId) || null
}

function encontrarEquipamentoNaSala(sala, equipamentoId) {
  for (const rack of sala.racks || []) {
    const equipamento = encontrarEquipamentoEmRack(rack, equipamentoId)
    if (equipamento) return equipamento
  }
  return null
}

function encontrarPorta(equipamento, portaId) {
  return (equipamento.portas || []).find((porta) => porta.id === portaId) || null
}

function texto(valor) {
  return (valor || '').trim()
}

// ---------- Geração e normalização de portas ----------

function criarPortaBase(numero, extra = {}) {
  return {
    id: criarIdItem('porta'),
    numero,
    lado: null, // 'frente' | 'verso' — usado apenas em patch panels
    sfp: false, // portas de uplink/SFP do switch
    nome: '',
    estado: 'ativa', // ativa | desativada | reservada
    dispositivoConectado: { tipo: '', nome: '', mac: '', ip: '' },
    pontoRede: { identificacao: '', local: '' },
    vinculo: null, // { equipamentoId, portaId, lado }
    categoriaCabo: '',
    comprimentoM: '',
    velocidade: 'auto',
    poe: 'desligado',
    vlanNativa: '',
    vlansPermitidas: '',
    uplink: { ativo: false, destino: '' },
    ultimoTeste: 'SEM_TESTE',
    falhaId: null,
    observacao: '',
    ...extra,
  }
}

export function gerarPortas(equipamento) {
  const portas = []
  const quantidade = Number(equipamento.quantidadePortas) || 0
  if (equipamento.tipo === 'switch') {
    for (let i = 1; i <= quantidade; i++) {
      portas.push(criarPortaBase(i, { sfp: false }))
    }
    const uplinks = Number(equipamento.quantidadeUplink) || 0
    for (let i = 1; i <= uplinks; i++) {
      portas.push(criarPortaBase(quantidade + i, { sfp: true }))
    }
  } else {
    for (let i = 1; i <= quantidade; i++) {
      portas.push(
        criarPortaBase(i, {
          lado: 'frente',
          categoriaCabo: equipamento.categoriaCaboPadrao || '',
        })
      )
    }
    for (let i = 1; i <= quantidade; i++) {
      portas.push(
        criarPortaBase(i, {
          lado: 'verso',
          categoriaCabo: equipamento.categoriaCaboPadrao || '',
        })
      )
    }
  }
  return portas
}

// ---------- Consultas puras (recebem o objeto sala) ----------

export function listarRacks(sala) {
  return sala?.racks || []
}

export function obterRack(sala, rackId) {
  return encontrarRack(sala, rackId)
}

export function listarEquipamentos(sala) {
  const equipamentos = []
  for (const rack of sala?.racks || []) {
    for (const equipamento of rack.equipamentos || []) {
      equipamentos.push(equipamento)
    }
  }
  return equipamentos
}

export function obterEquipamento(sala, equipamentoId) {
  return encontrarEquipamentoNaSala(sala, equipamentoId)
}

export function listarSwitches(sala) {
  return listarEquipamentos(sala).filter((eq) => eq.tipo === 'switch')
}

export function listarPatchPanels(sala) {
  return listarEquipamentos(sala).filter((eq) => eq.tipo === 'patch_panel')
}

export function portasComuns(equipamento) {
  if (equipamento.tipo === 'switch') {
    return (equipamento.portas || []).filter((porta) => !porta.sfp)
  }
  return (equipamento.portas || []).filter((porta) => porta.lado === 'frente')
}

export function portasVerso(equipamento) {
  return (equipamento.portas || []).filter((porta) => porta.lado === 'verso')
}

export function portasUplink(equipamento) {
  return (equipamento.portas || []).filter((porta) => porta.sfp)
}

// Busca, na sala, a porta do outro lado de um vínculo
export function buscarPortaVinculada(sala, porta) {
  if (!porta?.vinculo) return null
  const equipamento = encontrarEquipamentoNaSala(sala, porta.vinculo.equipamentoId)
  if (!equipamento) return null
  return {
    equipamento,
    porta: encontrarPorta(equipamento, porta.vinculo.portaId),
  }
}

// Texto "EQUIP / porta N (lado)" do outro lado do vínculo (para tabelas)
export function descricaoVinculo(sala, porta) {
  const achado = porta?.vinculo ? buscarPortaVinculada(sala, porta) : null
  if (!achado || !achado.porta) return ''
  const lado = achado.porta.lado ? ` (${achado.porta.lado})` : ''
  return `${achado.equipamento.nome} / porta ${achado.porta.numero}${lado}`
}

// Resumo de ocupação do rack (falhas não contam como ocupação)
export function resumoRack(rack) {
  let total = 0
  let emUso = 0
  let switches = 0
  let patchPanels = 0
  for (const equipamento of rack.equipamentos || []) {
    if (equipamento.tipo === 'switch') switches++
    else patchPanels++
    for (const porta of equipamento.portas || []) {
      total++
      if (portaEmUso(porta)) emUso++
    }
  }
  return {
    total,
    emUso,
    livres: total - emUso,
    ocupacao: total > 0 ? Math.round((emUso / total) * 100) : 0,
    switches,
    patchPanels,
  }
}

// ---------- Regras de estado das portas (sempre derivadas, nunca salvas) ----------

// Porta "em uso" = tem alguma conexão ou vínculo físico
export function portaEmUso(porta) {
  return Boolean(
    porta.vinculo ||
      porta.uplink?.ativo ||
      texto(porta.dispositivoConectado?.nome) ||
      porta.dispositivoConectado?.tipo ||
      texto(porta.pontoRede?.identificacao) ||
      texto(porta.pontoRede?.local)
  )
}

// Porta com qualquer dado preenchido além do padrão (bloqueia redução de portas)
export function portaTemDados(porta, categoriaPadrao = '') {
  return Boolean(
    texto(porta.nome) ||
      porta.vinculo ||
      porta.uplink?.ativo ||
      texto(porta.dispositivoConectado?.nome) ||
      porta.dispositivoConectado?.tipo ||
      texto(porta.dispositivoConectado?.mac) ||
      texto(porta.dispositivoConectado?.ip) ||
      texto(porta.pontoRede?.identificacao) ||
      texto(porta.pontoRede?.local) ||
      porta.falhaId ||
      (porta.ultimoTeste && porta.ultimoTeste !== 'SEM_TESTE') ||
      (porta.estado && porta.estado !== 'ativa') ||
      texto(porta.observacao) ||
      (porta.categoriaCabo && porta.categoriaCabo !== categoriaPadrao) ||
      texto(porta.comprimentoM) ||
      (porta.velocidade && porta.velocidade !== 'auto') ||
      (porta.poe && porta.poe !== 'desligado') ||
      texto(porta.vlanNativa) ||
      texto(porta.vlansPermitidas)
  )
}

// Estado visual da porta pela regra de prioridade:
// Desativada/Reservada > Vermelho > Laranja > Roxo > Azul > Verde > Branco
export function calcularEstadoPorta(porta, falhas = []) {
  if (porta.estado === 'desativada' || porta.estado === 'reservada') {
    return 'bloqueada'
  }
  const falha = porta.falhaId
    ? falhas.find((f) => f.id === porta.falhaId && f.status !== 'resolvida')
    : null
  if (porta.ultimoTeste === 'FAIL' || (falha && falha.gravidade === 'critica')) {
    return 'critica'
  }
  if (falha) return 'atencao'
  if (porta.uplink?.ativo) return 'uplink'
  if (!portaEmUso(porta)) return 'livre'
  return porta.ultimoTeste === 'PASS' ? 'certificada' : 'aguardando'
}

export function falhaAtivaDaPorta(porta, falhas = []) {
  if (!porta?.falhaId) return null
  return (
    falhas.find((f) => f.id === porta.falhaId && f.status !== 'resolvida') ||
    null
  )
}

// Contagem de portas por estado visual (para legenda, resumo e filtros)
export function contarEstados(portas, falhas = []) {
  const contagens = {}
  for (const porta of portas) {
    const estado = calcularEstadoPorta(porta, falhas)
    contagens[estado] = (contagens[estado] || 0) + 1
  }
  return contagens
}

// Resumo de portas de um equipamento (topo das páginas de switch/patch panel)
export function resumoPortas(equipamento, falhas = []) {
  const portas = equipamento?.portas || []
  let emUso = 0
  let comFalha = 0
  for (const porta of portas) {
    if (portaEmUso(porta)) emUso++
    const estado = calcularEstadoPorta(porta, falhas)
    if (estado === 'critica' || estado === 'atencao') comFalha++
  }
  const livres = portas.filter((p) => calcularEstadoPorta(p, falhas) === 'livre').length
  return {
    total: portas.length,
    emUso,
    livres,
    comFalha,
    ocupacao: portas.length > 0 ? Math.round((emUso / portas.length) * 100) : 0,
  }
}

// Pior estado de um conjunto de portas — para a vista do rack
// (só interessa critica/atencao na borda do equipamento)
export function piorEstado(portas, falhas = []) {
  let temCritica = false
  let temAtencao = false
  for (const porta of portas) {
    const estado = calcularEstadoPorta(porta, falhas)
    if (estado === 'critica') temCritica = true
    else if (estado === 'atencao') temAtencao = true
  }
  if (temCritica) return 'critica'
  if (temAtencao) return 'atencao'
  return 'ok'
}

// Ordem de severidade para agregar os dois lados de uma porta de patch panel
const ORDEM_SEVERIDADE = [
  'critica',
  'atencao',
  'bloqueada',
  'uplink',
  'aguardando',
  'certificada',
  'livre',
]

export function piorEstadoEntre(estadoA, estadoB) {
  return ORDEM_SEVERIDADE.indexOf(estadoA) <= ORDEM_SEVERIDADE.indexOf(estadoB)
    ? estadoA
    : estadoB
}

// Pior teste entre os dois lados: FAIL > Sem teste > PASS
const ORDEM_TESTE = ['FAIL', 'SEM_TESTE', 'PASS']

export function piorTesteEntre(testeA, testeB) {
  return ORDEM_TESTE.indexOf(testeA) <= ORDEM_TESTE.indexOf(testeB)
    ? testeA
    : testeB
}

// Resumo por NÚMERO de porta (patch panel: frente + verso juntos)
export function resumoPortasLinha(equipamento, falhas = []) {
  const quantidade = Number(equipamento.quantidadePortas) || 0
  const portas = equipamento.portas || []
  let emUso = 0
  let comFalha = 0
  let livres = 0
  for (let numero = 1; numero <= quantidade; numero++) {
    const frente = portas.find((p) => p.lado === 'frente' && p.numero === numero)
    const verso = portas.find((p) => p.lado === 'verso' && p.numero === numero)
    const estadoF = frente ? calcularEstadoPorta(frente, falhas) : 'livre'
    const estadoV = verso ? calcularEstadoPorta(verso, falhas) : 'livre'
    if (portaEmUso(frente) || portaEmUso(verso)) emUso++
    if (estadoF === 'livre' && estadoV === 'livre') livres++
    if (
      ['critica', 'atencao'].includes(estadoF) ||
      ['critica', 'atencao'].includes(estadoV)
    ) {
      comFalha++
    }
  }
  return {
    total: quantidade,
    emUso,
    livres,
    comFalha,
    ocupacao: quantidade > 0 ? Math.round((emUso / quantidade) * 100) : 0,
  }
}

// Filtro rápido / por estado visual (usado pelos chips e pela legenda clicável)
export function portaCombinaFiltro(porta, estadoVisual, filtroId) {
  switch (filtroId) {
    case 'em_uso':
      return portaEmUso(porta)
    case 'livres':
      return estadoVisual === 'livre'
    case 'com_falha':
      return estadoVisual === 'critica' || estadoVisual === 'atencao'
    case 'reservadas':
      return estadoVisual === 'bloqueada'
    case 'uplink':
      return Boolean(porta.uplink?.ativo) || Boolean(porta.sfp)
    case 'est-livre':
      return estadoVisual === 'livre'
    case 'est-certificada':
      return estadoVisual === 'certificada'
    case 'est-aguardando':
      return estadoVisual === 'aguardando'
    case 'est-uplink':
      return estadoVisual === 'uplink'
    case 'est-atencao':
      return estadoVisual === 'atencao'
    case 'est-critica':
      return estadoVisual === 'critica'
    case 'est-bloqueada':
      return estadoVisual === 'bloqueada'
    default:
      return true
  }
}

// Busca livre por nome, ponto de rede, dispositivo, VLAN ou observação
export function portaCombinaBusca(porta, termo) {
  const alvo = (termo || '').trim().toLowerCase()
  if (!alvo) return true
  return (
    texto(porta.nome).toLowerCase().includes(alvo) ||
    texto(porta.pontoRede?.identificacao).toLowerCase().includes(alvo) ||
    texto(porta.pontoRede?.local).toLowerCase().includes(alvo) ||
    texto(porta.dispositivoConectado?.nome).toLowerCase().includes(alvo) ||
    texto(porta.dispositivoConectado?.ip).includes(alvo) ||
    texto(porta.vlanNativa).includes(alvo) ||
    texto(porta.vlansPermitidas).includes(alvo) ||
    texto(porta.observacao).toLowerCase().includes(alvo)
  )
}

// ---------- Validações (funções puras, devolvem mapa de erros por chave) ----------

export function validarRack(form, sala, rackIdAtual) {
  const erros = {}
  const nome = texto(form.nome)
  if (!nome) erros.nome = 'Informe o nome do rack.'
  else if (
    (sala.racks || []).some(
      (rack) =>
        rack.id !== rackIdAtual &&
        texto(rack.nome).toLowerCase() === nome.toLowerCase()
    )
  ) {
    erros.nome = 'Já existe um rack com esse nome nesta sala.'
  }

  const altura = Number(form.alturaU)
  if (!Number.isInteger(altura) || altura < 1 || altura > 48) {
    erros.alturaU = 'Escolha a altura do rack.'
  } else if (rackIdAtual) {
    const rack = encontrarRack(sala, rackIdAtual)
    const maiorOcupada = Math.max(
      0,
      ...(rack?.equipamentos || []).map((eq) => eq.posicaoU || 0)
    )
    if (altura < maiorOcupada) {
      erros.alturaU = `Há equipamento na posição U${maiorOcupada}. A altura não pode ser menor que isso.`
    }
  }
  return erros
}

//Primeira porta que bloquearia a redução da quantidade de portas
export function portaBloqueanteReducao(equipamento, novaQuantidade) {
  const quantidade = Number(novaQuantidade) || 0
  if (quantidade >= (Number(equipamento.quantidadePortas) || 0)) return null
  const grupos =
    equipamento.tipo === 'switch'
      ? [portasComuns(equipamento)]
      : [portasComuns(equipamento), portasVerso(equipamento)]
  for (const grupo of grupos) {
    for (const porta of grupo) {
      if (
        porta.numero > quantidade &&
        portaTemDados(porta, equipamento.categoriaCaboPadrao)
      ) {
        return porta
      }
    }
  }
  return null
}

export function validarEquipamento(form, rack, equipamentoIdAtual) {
  const erros = {}
  const tipo = form.tipo
  const nome = texto(form.nome)
  if (!nome) erros.nome = 'Informe o nome do equipamento.'

  const quantidade = Number(form.quantidadePortas)
  if (!Number.isInteger(quantidade) || quantidade < 1 || quantidade > 96) {
    erros.quantidadePortas = 'Informe uma quantidade de portas entre 1 e 96.'
  }

  if (tipo === 'switch') {
    const uplinks = Number(form.quantidadeUplink)
    if (!Number.isInteger(uplinks) || uplinks < 0 || uplinks > 4) {
      erros.quantidadeUplink = 'Escolha de 0 a 4 portas de uplink/SFP.'
    }
    const ip = texto(form.ipGerencia)
    if (ip && !IPV4_REGEX.test(ip)) {
      erros.ipGerencia = 'Informe um IPv4 válido (ex.: 192.168.10.24).'
    }
  }

  const posicao = Number(form.posicaoU)
  if (!Number.isInteger(posicao) || posicao < 1 || posicao > rack.alturaU) {
    erros.posicaoU = `Escolha uma posição entre U1 e U${rack.alturaU}.`
  } else if (
    (rack.equipamentos || []).some(
      (eq) =>
        eq.id !== equipamentoIdAtual &&
        Number(eq.posicaoU) === posicao
    )
  ) {
    erros.posicaoU = `Já existe um equipamento na posição U${posicao}.`
  }

  // Redução de portas só é permitida sem dados acima do novo limite
  if (equipamentoIdAtual) {
    const equipamentoAtual = (rack.equipamentos || []).find(
      (eq) => eq.id === equipamentoIdAtual
    )
    if (equipamentoAtual) {
      const bloqueio = portaBloqueanteReducao(equipamentoAtual, quantidade)
      if (bloqueio) {
        const sufixo =
          equipamentoAtual.tipo === 'patch_panel' && bloqueio.lado === 'verso'
            ? ' (verso)'
            : equipamentoAtual.tipo === 'patch_panel'
              ? ' (frente)'
              : ''
        erros.quantidadePortas = `A porta ${bloqueio.numero}${sufixo} ainda tem dados (vínculo, dispositivo ou falha). Limpe-a antes de reduzir a quantidade de portas.`
      }
      // Redução de uplinks/SFP também é bloqueada com portas SFP em uso
      if (equipamentoAtual.tipo === 'switch') {
        const novosUplinks = Number(form.quantidadeUplink)
        const sfpsRemovidas = portasUplink(equipamentoAtual).slice(novosUplinks)
        if (
          sfpsRemovidas.some((porta) =>
            portaTemDados(porta, equipamentoAtual.categoriaCaboPadrao)
          )
        ) {
          erros.quantidadeUplink =
            'Há portas SFP com dados/vínculos acima do novo limite. Limpe-as antes de reduzir os uplinks.'
        }
      }
    }
  }
  return erros
}

// ---------- Mutações (recarregam do storage, aplicam e salvam) ----------

// ----- Racks -----

export function criarRack(salaId, dados) {
  const salas = carregarSalas()
  const sala = encontrarSala(salas, salaId)
  if (!sala) return null
  const rack = {
    id: criarIdItem('rack'),
    salaId,
    nome: texto(dados.nome),
    alturaU: Number(dados.alturaU),
    localizacao: texto(dados.localizacao),
    observacoes: texto(dados.observacoes),
    equipamentos: [],
  }
  sala.racks = [...(sala.racks || []), rack]
  salvarSalas(salas)
  return rack
}

export function editarRack(salaId, rackId, dados) {
  const salas = carregarSalas()
  const sala = encontrarSala(salas, salaId)
  const rack = sala && encontrarRack(sala, rackId)
  if (!rack) return null
  Object.assign(rack, {
    nome: texto(dados.nome),
    alturaU: Number(dados.alturaU),
    localizacao: texto(dados.localizacao),
    observacoes: texto(dados.observacoes),
  })
  salvarSalas(salas)
  return rack
}

// Remove todos os vínculos que apontam para o equipamento (dos dois lados)
function limparVinculosDeEquipamento(sala, equipamentoId) {
  for (const rack of sala.racks || []) {
    for (const equipamento of rack.equipamentos || []) {
      for (const porta of equipamento.portas || []) {
        if (porta.vinculo?.equipamentoId === equipamentoId) {
          porta.vinculo = null
        }
      }
    }
  }
}

// Remove do array de falhas da sala as falhas ATIVAS vinculadas às portas do
// equipamento. Falhas já resolvidas permanecem como histórico.
function removerFalhasDasPortas(sala, equipamento) {
  const falhaIds = new Set(
    (equipamento.portas || []).map((porta) => porta.falhaId).filter(Boolean)
  )
  if (falhaIds.size === 0) return
  sala.falhas = (sala.falhas || []).filter(
    (falha) => !falhaIds.has(falha.id) || falha.status === 'resolvida'
  )
}

// Quantidade de vínculos e falhas ATIVAS que serão perdidos ao excluir
export function impactosExclusaoEquipamento(sala, equipamento) {
  let vinculos = 0
  const falhaIds = new Set()
  for (const porta of equipamento.portas || []) {
    if (porta.vinculo) vinculos++
    if (porta.falhaId) falhaIds.add(porta.falhaId)
  }
  const falhas = (sala.falhas || []).filter(
    (falha) => falhaIds.has(falha.id) && falha.status !== 'resolvida'
  ).length
  return { vinculos, falhas }
}

export function excluirRack(salaId, rackId) {
  const salas = carregarSalas()
  const sala = encontrarSala(salas, salaId)
  const rack = sala && encontrarRack(sala, rackId)
  if (!rack) return null
  for (const equipamento of rack.equipamentos || []) {
    limparVinculosDeEquipamento(sala, equipamento.id)
    removerFalhasDasPortas(sala, equipamento)
  }
  sala.racks = (sala.racks || []).filter((item) => item.id !== rackId)
  salvarSalas(salas)
  return true
}

// ----- Equipamentos -----

// Ajusta um grupo de portas (comuns/frente/verso) para a nova quantidade.
// Devolve { lista } ou { erro } quando há portas com dados acima do limite.
function ajustarGrupoPortas(lista, novaQuantidade, criar, categoriaPadrao) {
  const ordenadas = [...lista].sort((a, b) => a.numero - b.numero)
  if (novaQuantidade === ordenadas.length) return { lista: ordenadas }
  if (novaQuantidade > ordenadas.length) {
    const novas = []
    for (let i = ordenadas.length + 1; i <= novaQuantidade; i++) {
      novas.push(criar(i))
    }
    return { lista: [...ordenadas, ...novas] }
  }
  const removidas = ordenadas.filter((porta) => porta.numero > novaQuantidade)
  if (removidas.some((porta) => portaTemDados(porta, categoriaPadrao))) {
    return { erro: true }
  }
  return { lista: ordenadas.filter((porta) => porta.numero <= novaQuantidade) }
}

function redimensionarPortas(equipamento) {
  const quantidade = Number(equipamento.quantidadePortas) || 0
  const padrao = equipamento.categoriaCaboPadrao || ''
  if (equipamento.tipo === 'switch') {
    const comuns = portasComuns(equipamento)
    const sfps = portasUplink(equipamento)
    const ajuste = ajustarGrupoPortas(
      comuns,
      quantidade,
      (i) => criarPortaBase(i, { sfp: false }),
      padrao
    )
    if (ajuste.erro) return false
    // SFPs sempre renumerados para depois da última porta comum
    const novosSfps =
      Number(equipamento.quantidadeUplink) === sfps.length
        ? sfps
        : sfps.slice(0, Number(equipamento.quantidadeUplink))
    novosSfps.forEach((porta, i) => {
      porta.numero = quantidade + 1 + i
    })
    equipamento.portas = [...ajuste.lista, ...novosSfps]
  } else {
    const frentes = portasComuns(equipamento)
    const versos = portasVerso(equipamento)
    const ajusteFrente = ajustarGrupoPortas(
      frentes,
      quantidade,
      (i) => criarPortaBase(i, { lado: 'frente', categoriaCabo: padrao }),
      padrao
    )
    const ajusteVerso = ajustarGrupoPortas(
      versos,
      quantidade,
      (i) => criarPortaBase(i, { lado: 'verso', categoriaCabo: padrao }),
      padrao
    )
    if (ajusteFrente.erro || ajusteVerso.erro) return false
    equipamento.portas = [...ajusteFrente.lista, ...ajusteVerso.lista]
  }
  return true
}

export function criarEquipamento(salaId, rackId, dados) {
  const salas = carregarSalas()
  const sala = encontrarSala(salas, salaId)
  const rack = sala && encontrarRack(sala, rackId)
  if (!rack) return null
  const equipamento = {
    id: criarIdItem('equip'),
    rackId,
    tipo: dados.tipo,
    nome: texto(dados.nome),
    modelo: texto(dados.modelo),
    quantidadePortas: Number(dados.quantidadePortas),
    quantidadeUplink: dados.tipo === 'switch' ? Number(dados.quantidadeUplink) || 0 : 0,
    posicaoU: Number(dados.posicaoU),
    ipGerencia: texto(dados.ipGerencia),
    categoriaCaboPadrao: dados.tipo === 'patch_panel' ? dados.categoriaCaboPadrao : '',
    observacoes: texto(dados.observacoes),
    portas: [],
  }
  equipamento.portas = gerarPortas(equipamento)
  rack.equipamentos = [...(rack.equipamentos || []), equipamento]
  salvarSalas(salas)
  return equipamento
}

export function editarEquipamento(salaId, rackId, equipamentoId, dados) {
  const salas = carregarSalas()
  const sala = encontrarSala(salas, salaId)
  const rack = sala && encontrarRack(sala, rackId)
  const equipamento = rack && encontrarEquipamentoEmRack(rack, equipamentoId)
  if (!equipamento) return null
  Object.assign(equipamento, {
    nome: texto(dados.nome),
    modelo: texto(dados.modelo),
    quantidadePortas: Number(dados.quantidadePortas),
    quantidadeUplink:
      equipamento.tipo === 'switch' ? Number(dados.quantidadeUplink) || 0 : 0,
    posicaoU: Number(dados.posicaoU),
    ipGerencia: texto(dados.ipGerencia),
    categoriaCaboPadrao:
      equipamento.tipo === 'patch_panel' ? dados.categoriaCaboPadrao : '',
    observacoes: texto(dados.observacoes),
  })
  if (!redimensionarPortas(equipamento)) return null
  salvarSalas(salas)
  return equipamento
}

export function excluirEquipamento(salaId, rackId, equipamentoId) {
  const salas = carregarSalas()
  const sala = encontrarSala(salas, salaId)
  const rack = sala && encontrarRack(sala, rackId)
  const equipamento = rack && encontrarEquipamentoEmRack(rack, equipamentoId)
  if (!equipamento) return null
  limparVinculosDeEquipamento(sala, equipamentoId)
  removerFalhasDasPortas(sala, equipamento)
  rack.equipamentos = (rack.equipamentos || []).filter(
    (eq) => eq.id !== equipamentoId
  )
  salvarSalas(salas)
  return true
}

// ----- Portas -----

// Aplica a edição de uma porta, tratando o vínculo bidirecional:
// desfaz o vínculo anterior dos dois lados, espelha o novo e por fim
// sincroniza a categoria do cabo entre os dois lados.
export function salvarPorta(salaId, equipamentoId, portaId, dados) {
  const salas = carregarSalas()
  const sala = encontrarSala(salas, salaId)
  const equipamento = sala && encontrarEquipamentoNaSala(sala, equipamentoId)
  const porta = equipamento && encontrarPorta(equipamento, portaId)
  if (!porta) return null

  // 1. Vínculo — antigo é desfeito dos dois lados; novo é espelhado
  const vinculoAntigo = porta.vinculo || null
  const vinculoNovo = dados.vinculo || null
  if (vinculoAntigo) {
    const outroEquip = encontrarEquipamentoNaSala(
      sala,
      vinculoAntigo.equipamentoId
    )
    const outraPorta =
      outroEquip && encontrarPorta(outroEquip, vinculoAntigo.portaId)
    if (
      outraPorta &&
      outraPorta.vinculo &&
      outraPorta.vinculo.portaId === portaId
    ) {
      outraPorta.vinculo = null
    }
  }
  let portaAlvo = null
  if (vinculoNovo) {
    const alvoEquip = encontrarEquipamentoNaSala(sala, vinculoNovo.equipamentoId)
    portaAlvo = alvoEquip && encontrarPorta(alvoEquip, vinculoNovo.portaId)
    if (portaAlvo) {
      // Defesa: se o alvo tinha outro vínculo, também desfaz
      if (portaAlvo.vinculo && portaAlvo.vinculo.portaId !== portaId) {
        const terceiroEquip = encontrarEquipamentoNaSala(
          sala,
          portaAlvo.vinculo.equipamentoId
        )
        const terceiraPorta =
          terceiroEquip && encontrarPorta(terceiroEquip, portaAlvo.vinculo.portaId)
        if (terceiraPorta?.vinculo?.portaId === portaAlvo.id) {
          terceiraPorta.vinculo = null
        }
      }
      portaAlvo.vinculo = {
        equipamentoId: equipamento.id,
        portaId: porta.id,
        lado: porta.lado,
      }
      porta.vinculo = {
        equipamentoId: alvoEquip.id,
        portaId: portaAlvo.id,
        lado: portaAlvo.lado,
      }
    } else {
      porta.vinculo = null
    }
  } else {
    porta.vinculo = null
  }

  // 2. Demais campos
  Object.assign(porta, {
    nome: texto(dados.nome),
    estado: dados.estado || 'ativa',
    categoriaCabo: dados.categoriaCabo || '',
    comprimentoM: dados.comprimentoM || '',
    velocidade: dados.velocidade || 'auto',
    poe: dados.poe || 'desligado',
    vlanNativa: texto(dados.vlanNativa),
    vlansPermitidas: texto(dados.vlansPermitidas),
    uplink: dados.uplink || { ativo: false, destino: '' },
    ultimoTeste: dados.ultimoTeste || 'SEM_TESTE',
    observacao: texto(dados.observacao),
    dispositivoConectado: {
      tipo: dados.dispositivoConectado?.tipo || '',
      nome: texto(dados.dispositivoConectado?.nome),
      mac: texto(dados.dispositivoConectado?.mac),
      ip: texto(dados.dispositivoConectado?.ip),
    },
    pontoRede: {
      identificacao: texto(dados.pontoRede?.identificacao),
      local: texto(dados.pontoRede?.local),
    },
  })

  // 3. Sincroniza a categoria do cabo entre os dois lados do vínculo
  //    (após o assign, para não ser sobrescrita por um campo vazio)
  if (porta.vinculo && portaAlvo) {
    if (!porta.categoriaCabo && portaAlvo.categoriaCabo) {
      porta.categoriaCabo = portaAlvo.categoriaCabo
    } else if (!portaAlvo.categoriaCabo && porta.categoriaCabo) {
      portaAlvo.categoriaCabo = porta.categoriaCabo
    }
  }

  salvarSalas(salas)
  return porta
}

// Edição em lote: aplica apenas as chaves presentes em `campos`
// (campos vazios significam "manter o valor atual")
export function salvarPortasLote(salaId, equipamentoId, portaIds, campos) {
  const salas = carregarSalas()
  const sala = encontrarSala(salas, salaId)
  const equipamento = sala && encontrarEquipamentoNaSala(sala, equipamentoId)
  if (!equipamento) return null
  let alteradas = 0
  for (const portaId of portaIds) {
    const porta = encontrarPorta(equipamento, portaId)
    if (!porta) continue
    Object.assign(porta, campos)
    alteradas++
  }
  if (alteradas > 0) salvarSalas(salas)
  return { alteradas }
}

// ----- Falhas de porta -----

// Rótulo do alvo da falha no formato "EQUIP / porta N (lado)"
export function alvoFalhaPorta(equipamento, porta) {
  const sufixo = porta.lado ? ` (${porta.lado})` : ''
  return `${equipamento.nome} / porta ${porta.numero}${sufixo}`
}

// Registra uma falha na seção "Falhas e manutenção" da sala e vincula à porta
export function registrarFalhaPorta(
  salaId,
  equipamentoId,
  portaId,
  { gravidade, descricao }
) {
  const salas = carregarSalas()
  const sala = encontrarSala(salas, salaId)
  const equipamento = sala && encontrarEquipamentoNaSala(sala, equipamentoId)
  const porta = equipamento && encontrarPorta(equipamento, portaId)
  if (!porta) return null

  const falha = {
    id: criarIdItem('falha'),
    alvo: alvoFalhaPorta(equipamento, porta),
    descricao: texto(descricao),
    dataIdentificacao: hojeISO(),
    gravidade: gravidade || 'baixa',
    status: 'aberta',
    historicoManutencao: [],
  }
  sala.falhas = [...(sala.falhas || []), falha]
  porta.falhaId = falha.id
  salvarSalas(salas)
  return falha
}
