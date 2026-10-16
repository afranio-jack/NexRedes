// Camada de dados dos testes de certificação (aba "Redes").
// Persistência em localStorage, ISOLADA POR USUÁRIO (nexredes_testes:<user>,
// chave derivada sempre da sessão válida + carimbo de dono em cada teste):
// o histórico pode sobreviver à exclusão do ponto — cada teste guarda um
// retrato (snapshot) do ponto e da sala no momento do registro.
// Um novo teste SEMPRE cria um registro novo; nunca sobrescreve o histórico.
// Trocar por backend = trocar só essa camada.

import { carregarSalas, salvarSalas } from './salas'
import { hojeISO, agoraISO } from './datas'
import { registrarHistorico } from './racks'
import { usuarioDaSessao, chaveDeUsuario, carimbarDono } from './sessao'
import { migrarChaveLegada } from './migracao'

const CHAVE_BASE = 'nexredes_testes'
const CHAVE_LEGADA = 'nexredes_testes' // dados de antes do isolamento por usuário

export const NORMAS = ['TIA/EIA-568-C', 'NBR 14565']
export const MAPAS_FIOS = [
  { id: '', label: '—' },
  { id: 'OK', label: 'OK' },
  { id: 'Falha', label: 'Falha' },
]

function criarIdItem(prefixo) {
  return `${prefixo}-${Date.now().toString(36)}-${Math.random()
    .toString(36)
    .slice(2, 8)}`
}

function texto(valor) {
  return (valor || '').trim()
}

export function listarTestes() {
  migrarChaveLegada(CHAVE_LEGADA, CHAVE_BASE)
  const chave = chaveDeUsuario(CHAVE_BASE)
  if (!chave) return []
  try {
    const bruto = localStorage.getItem(chave)
    const testes = bruto ? JSON.parse(bruto) : []
    if (!Array.isArray(testes)) return []
    // Segunda camada: só testes carimbados com o dono da sessão atual
    const usuario = usuarioDaSessao()
    return testes.filter((teste) => teste.usuario === usuario)
  } catch {
    return []
  }
}

// Grava a lista completa de testes (usada pela tela Configurações, no
// restore do backup). Sem sessão: bloqueada (equivalente a 401).
export function salvarTestes(testes) {
  const chave = chaveDeUsuario(CHAVE_BASE)
  if (!chave) throw new Error('Salvar testes exige usuário autenticado.')
  const usuario = usuarioDaSessao()
  localStorage.setItem(chave, JSON.stringify(carimbarDono(testes, usuario)))
}

function ordenarPorData(testes) {
  return [...testes].sort((a, b) => (a.dataHora < b.dataHora ? 1 : -1))
}

export function listarTestesDoPonto(pontoId) {
  return ordenarPorData(listarTestes().filter((teste) => teste.pontoId === pontoId))
}

// Último teste do ponto pelo histórico (mais recente primeiro)
export function ultimoTesteDe(pontoId) {
  return listarTestesDoPonto(pontoId)[0] || null
}

function localizarPonto(salas, pontoId) {
  for (const sala of salas) {
    const ponto = (sala.pontos || []).find((item) => item.id === pontoId)
    if (ponto) return { sala, ponto }
  }
  return { sala: null, ponto: null }
}

// ---------- Sincronização com as portas (visual colorido) ----------

// Reescreve o resultado do último teste nas portas ligadas ao ponto:
// verso E frente do patch panel (a linha completa fica verde/vermelha) e a
// porta do switch.
function aplicarUltimoTesteNasPortas(sala, ponto, resultado, dataHora, tecnico) {
  const mudarPorta = (equipamentoId, portaId) => {
    if (!equipamentoId || !portaId) return
    for (const rack of sala.racks || []) {
      const equipamento = (rack.equipamentos || []).find(
        (item) => item.id === equipamentoId
      )
      if (!equipamento) continue
      const porta = (equipamento.portas || []).find(
        (item) => item.id === portaId
      )
      if (!porta) continue
      porta.ultimoTeste = resultado
      porta.dataUltimoTeste = dataHora
      if (resultado === 'SEM_TESTE') {
        registrarHistorico(porta, 'Resultado de teste removido')
      } else {
        registrarHistorico(
          porta,
          `Teste ${resultado} registrado${tecnico ? ` por ${tecnico}` : ''}`
        )
      }
    }
  }
  mudarPorta(ponto.patchPanelId, ponto.portaPatchPanelId)
  // frente do patch panel (mesma linha do verso)
  const patchPanel = ponto.patchPanelId
    ? (sala.racks || []).flatMap((rack) => rack.equipamentos || []).find(
        (item) => item.id === ponto.patchPanelId
      )
    : null
  if (patchPanel && ponto.portaPatchPanel) {
    const frente = (patchPanel.portas || []).find(
      (porta) =>
        porta.lado === 'frente' && porta.numero === ponto.portaPatchPanel
    )
    if (frente) mudarPorta(patchPanel.id, frente.id)
  }
  mudarPorta(ponto.switchId, ponto.portaSwitchId)
}

// Recalcula o último teste do ponto pelo histórico e regrava as portas
function ressincronizarPonto(pontoId) {
  const salas = carregarSalas()
  const { sala, ponto } = localizarPonto(salas, pontoId)
  if (!sala || !ponto) return
  const ultimo = ultimoTesteDe(pontoId)
  aplicarUltimoTesteNasPortas(
    sala,
    ponto,
    ultimo ? ultimo.resultado : 'SEM_TESTE',
    ultimo ? ultimo.dataHora : null,
    ultimo ? ultimo.tecnico : null
  )
  salvarSalas(salas)
}

// ---------- Mutações ----------

export function criarTeste(dados, opcoes = {}) {
  const usuario = usuarioDaSessao()
  if (!usuario) throw new Error('Criar teste exige usuário autenticado.')
  const salas = carregarSalas()
  const { sala, ponto } = localizarPonto(salas, dados.pontoId)
  const resultado = dados.resultado === 'FAIL' ? 'FAIL' : 'PASS'
  const teste = {
    id: criarIdItem('teste'),
    pontoId: dados.pontoId,
    usuario, // dono gravado automaticamente, nunca pelo formulário
    dataHora: dados.dataHora || agoraISO(),
    tecnico: texto(dados.tecnico),
    norma: dados.norma || NORMAS[0],
    resultado,
    medicoes: {
      comprimentoM: texto(dados.medicoes?.comprimentoM),
      mapaFios: dados.medicoes?.mapaFios || '',
      atenuacao: texto(dados.medicoes?.atenuacao),
      next: texto(dados.medicoes?.next),
      perdaRetorno: texto(dados.medicoes?.perdaRetorno),
    },
    motivoFalha: resultado === 'FAIL' ? texto(dados.motivoFalha) : '',
    observacoes: texto(dados.observacoes),
    snapshot: {
      pontoIdentificacao: ponto ? ponto.identificacao : 'Ponto removido',
      salaId: sala ? sala.id : null,
      salaNome: sala ? sala.nome : 'Sala removida',
      categoriaCabo: ponto ? ponto.categoriaCabo || '' : '',
    },
  }

  const testes = listarTestes()
  testes.push(teste)
  salvarTestes(testes)

  if (sala && ponto) {
    aplicarUltimoTesteNasPortas(
      sala,
      ponto,
      teste.resultado,
      teste.dataHora,
      teste.tecnico
    )
    // Registro de falha/manutenção na sala (opcional, apenas para FAIL)
    if (resultado === 'FAIL' && opcoes.criarFalha && teste.motivoFalha) {
      const falha = {
        id: criarIdItem('falha'),
        alvo: ponto.identificacao,
        descricao: `Teste de certificação FAIL — ${teste.motivoFalha}`,
        dataIdentificacao: hojeISO(),
        gravidade: opcoes.gravidade || 'baixa',
        status: 'aberta',
        historicoManutencao: [],
      }
      sala.falhas = [...(sala.falhas || []), falha]
    }
    salvarSalas(salas)
  }
  return teste
}

export function editarTeste(id, dados, opcoes = {}) {
  const testes = listarTestes()
  const indice = testes.findIndex((teste) => teste.id === id)
  if (indice === -1) return null
  const atual = testes[indice]
  const resultado = dados.resultado === 'FAIL' ? 'FAIL' : 'PASS'
  const pontoId = dados.pontoId || atual.pontoId
  const salas = carregarSalas()
  const { sala, ponto } = localizarPonto(salas, pontoId)
  const novo = {
    ...atual,
    pontoId,
    dataHora: dados.dataHora || atual.dataHora,
    tecnico: texto(dados.tecnico),
    norma: dados.norma || atual.norma,
    resultado,
    medicoes: {
      comprimentoM: texto(dados.medicoes?.comprimentoM),
      mapaFios: dados.medicoes?.mapaFios || '',
      atenuacao: texto(dados.medicoes?.atenuacao),
      next: texto(dados.medicoes?.next),
      perdaRetorno: texto(dados.medicoes?.perdaRetorno),
    },
    motivoFalha: resultado === 'FAIL' ? texto(dados.motivoFalha) : '',
    observacoes: texto(dados.observacoes),
    snapshot: {
      pontoIdentificacao: ponto ? ponto.identificacao : atual.snapshot?.pontoIdentificacao || 'Ponto removido',
      salaId: sala ? sala.id : atual.snapshot?.salaId || null,
      salaNome: sala ? sala.nome : atual.snapshot?.salaNome || 'Sala removida',
      categoriaCabo: ponto ? ponto.categoriaCabo || '' : atual.snapshot?.categoriaCabo || '',
    },
  }
  testes[indice] = novo
  salvarTestes(testes)

  // Falha na sala (apenas quando o resultado editado é FAIL)
  if (resultado === 'FAIL' && opcoes.criarFalha && novo.motivoFalha && sala && ponto) {
    const falha = {
      id: criarIdItem('falha'),
      alvo: ponto.identificacao,
      descricao: `Teste de certificação FAIL — ${novo.motivoFalha}`,
      dataIdentificacao: hojeISO(),
      gravidade: opcoes.gravidade || 'baixa',
      status: 'aberta',
      historicoManutencao: [],
    }
    sala.falhas = [...(sala.falhas || []), falha]
    salvarSalas(salas)
  }

  ressincronizarPonto(atual.pontoId)
  if (pontoId !== atual.pontoId) ressincronizarPonto(pontoId)
  return novo
}

export function excluirTeste(id) {
  const testes = listarTestes()
  const atual = testes.find((teste) => teste.id === id)
  salvarTestes(testes.filter((teste) => teste.id !== id))
  if (atual) ressincronizarPonto(atual.pontoId)
  return Boolean(atual)
}

export function excluirTestesDoPonto(pontoId) {
  const testes = listarTestes()
  const restantes = testes.filter((teste) => teste.pontoId !== pontoId)
  salvarTestes(restantes)
  return testes.length - restantes.length
}

// ---------- Resumo (pronto para a futura tela "Relatórios") ----------

export function resumoTestes(salas) {
  const testes = listarTestes()
  const pontosAtuais = []
  for (const sala of salas || []) {
    for (const ponto of sala.pontos || []) pontosAtuais.push(ponto)
  }
  const pontosComTeste = new Set(testes.map((teste) => teste.pontoId))
  const aprovados = testes.filter((teste) => teste.resultado === 'PASS').length
  const reprovados = testes.filter((teste) => teste.resultado === 'FAIL').length
  return {
    total: testes.length,
    aprovados,
    reprovados,
    pontosSemTeste: pontosAtuais.filter((ponto) => !pontosComTeste.has(ponto.id))
      .length,
    percentualAprovacao: testes.length
      ? Math.round((aprovados / testes.length) * 100)
      : 0,
  }
}
