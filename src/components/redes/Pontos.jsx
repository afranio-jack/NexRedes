// Sub-aba "Pontos": faixa de cartões-resumo (total, PASS, FAIL, sem teste e
// não conectados), filtros por busca, sala, rack, patch panel, categoria,
// status do último teste e data do último teste, alternância de visualização
// Lista | Cartões e seleção múltipla para ações em lote (alterar status,
// mover de sala, gerar etiquetas e excluir). Clicar num ponto abre o painel
// lateral (PainelPonto); o modal de criação/edição (PontoModal) continua o
// mesmo. Cada linha mostra a cadeia: Sala → Rack → Patch panel/porta →
// Porta do switch → Categoria do cabo.

import { useMemo, useState } from 'react'
import {
  SearchIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
  NetworkIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  PlugIcon,
  ListIcon,
  GridIcon,
  TagIcon,
  BoxIcon,
  ArrowRightIcon,
} from '../icons'
import PontoModal from './PontoModal'
import ConfirmDialog from '../sala/ConfirmDialog'
import { LoteStatusDrawer, LoteMoverDrawer } from './LotePontos'
import {
  listarTodosPontos,
  excluirPonto,
  excluirPontos,
  criarPonto,
  editarPonto,
} from '../../utils/pontos'
import { excluirTestesDoPonto } from '../../utils/testes'
import { CATEGORIAS_CABO } from '../sala/opcoes'

const STATUS_FILTRO = [
  { id: 'todos', label: 'Todos os status' },
  { id: 'PASS', label: 'Último teste: PASS' },
  { id: 'FAIL', label: 'Último teste: FAIL' },
  { id: 'SEM_TESTE', label: 'Sem teste' },
]

const COLUNAS = [
  { chave: 'identificacao', label: 'Identificação' },
  { chave: 'sala', label: 'Sala' },
  { chave: 'rack', label: 'Rack' },
  { chave: 'patchPanel', label: 'Patch panel / porta' },
  { chave: 'switch', label: 'Porta do switch' },
  { chave: 'categoria', label: 'Categoria do cabo' },
  { chave: 'ultimoTeste', label: 'Último teste' },
]

// { nome, rack } do equipamento dentro da sala
function equipInfo(sala, equipamentoId) {
  for (const rack of sala.racks || []) {
    const equipamento = (rack.equipamentos || []).find(
      (item) => item.id === equipamentoId
    )
    if (equipamento) return { nome: equipamento.nome, rack }
  }
  return { nome: '', rack: null }
}

function badgeUltimoTeste(ultimo) {
  if (!ultimo) {
    return <span className="selo-teste sem_teste">Sem teste</span>
  }
  return (
    <span className={`selo-teste ${ultimo.resultado.toLowerCase()}`}>
      {ultimo.resultado}
    </span>
  )
}

export default function Pontos({
  salas,
  testes,
  onMostrarToast,
  onDadosAlterados,
  onTestesAlterados,
  onAbrirPainel,
  onGerarEtiquetasLote,
}) {
  const [busca, setBusca] = useState('')
  const [salaFiltro, setSalaFiltro] = useState('todos')
  const [rackFiltro, setRackFiltro] = useState('todos')
  const [patchPanelFiltro, setPatchPanelFiltro] = useState('todos')
  const [categoriaFiltro, setCategoriaFiltro] = useState('todos')
  const [statusFiltro, setStatusFiltro] = useState('todos')
  const [testeDe, setTesteDe] = useState('')
  const [testeAte, setTesteAte] = useState('')
  const [ordenacao, setOrdenacao] = useState({
    chave: 'identificacao',
    direcao: 1,
  })
  const [vista, setVista] = useState('lista') // 'lista' | 'cartoes'
  const [selecionados, setSelecionados] = useState(() => new Set())
  const [modal, setModal] = useState(null) // null | { ponto: Ponto | null }
  const [pontoParaExcluir, setPontoParaExcluir] = useState(null)
  const [excluirEmLote, setExcluirEmLote] = useState(false)
  const [lote, setLote] = useState(null) // null | 'status' | 'mover'

  const todos = useMemo(() => {
    return listarTodosPontos(salas).map((ponto) => {
      const doPonto = testes
        .filter((teste) => teste.pontoId === ponto.id)
        .sort((a, b) => (a.dataHora < b.dataHora ? 1 : -1))
      const pp = equipInfo(ponto.sala, ponto.patchPanelId)
      const sw = equipInfo(ponto.sala, ponto.switchId)
      return {
        ponto,
        sala: ponto.sala,
        patchPanel: pp.nome,
        rack: pp.rack ? pp.rack.nome : '',
        rackId: pp.rack ? pp.rack.id : null,
        switchNome: sw.nome,
        ultimo: doPonto[0] || null,
        conectado: Boolean(ponto.patchPanelId && ponto.switchId),
      }
    })
  }, [salas, testes])

  const resumo = useMemo(() => {
    const contagem = { PASS: 0, FAIL: 0, SEM_TESTE: 0 }
    let naoConectados = 0
    for (const item of todos) {
      const resultado = item.ultimo?.resultado || 'SEM_TESTE'
      contagem[resultado]++
      if (!item.conectado) naoConectados++
    }
    return {
      total: todos.length,
      pass: contagem.PASS,
      fail: contagem.FAIL,
      semTeste: contagem.SEM_TESTE,
      naoConectados,
    }
  }, [todos])

  // Opções de rack/patch panel acompanhando o filtro de sala
  const racksVisiveisFiltro = useMemo(() => {
    const lista = []
    for (const sala of salas) {
      if (salaFiltro !== 'todos' && sala.id !== salaFiltro) continue
      for (const rack of sala.racks || []) {
        lista.push({ sala, rack })
      }
    }
    return lista
  }, [salas, salaFiltro])

  const patchPanelsFiltro = useMemo(() => {
    const lista = []
    for (const { sala, rack } of racksVisiveisFiltro) {
      if (rackFiltro !== 'todos' && rack.id !== rackFiltro) continue
      for (const equipamento of rack.equipamentos || []) {
        if (equipamento.tipo === 'patch_panel') {
          lista.push({ sala, rack, equipamento })
        }
      }
    }
    return lista
  }, [racksVisiveisFiltro, rackFiltro])

  const visiveis = useMemo(() => {
    const termo = busca.trim().toLowerCase()
    const filtradas = todos.filter(({ ponto, sala, patchPanel, rack, switchNome, ultimo, rackId }) => {
      if (termo) {
        const alvo = [
          ponto.identificacao,
          sala.nome,
          patchPanel,
          switchNome,
          rack,
          ponto.observacoes,
        ]
          .join(' ')
          .toLowerCase()
        if (!alvo.includes(termo)) return false
      }
      if (salaFiltro !== 'todos' && sala.id !== salaFiltro) return false
      if (rackFiltro !== 'todos' && rackId !== rackFiltro) return false
      if (
        patchPanelFiltro !== 'todos' &&
        ponto.patchPanelId !== patchPanelFiltro
      )
        return false
      if (
        categoriaFiltro !== 'todos' &&
        (ponto.categoriaCabo || '') !== categoriaFiltro
      )
        return false
      if (statusFiltro !== 'todos') {
        const resultado = ultimo?.resultado || 'SEM_TESTE'
        if (resultado !== statusFiltro) return false
      }
      if (testeDe !== '' || testeAte !== '') {
        const data = (ultimo?.dataHora || '').slice(0, 10)
        if (!data) return false
        if (testeDe && data < testeDe) return false
        if (testeAte && data > testeAte) return false
      }
      return true
    })
    const direcao = ordenacao.direcao
    const comparar = (a, b) => {
      switch (ordenacao.chave) {
        case 'sala':
          return a.sala.nome.localeCompare(b.sala.nome, 'pt-BR')
        case 'rack':
          return (a.rack || '').localeCompare(b.rack || '', 'pt-BR')
        case 'patchPanel': {
          const aNome = a.patchPanel || ''
          const bNome = b.patchPanel || ''
          if (aNome !== bNome) return aNome.localeCompare(bNome, 'pt-BR')
          return (a.ponto.portaPatchPanel || 0) - (b.ponto.portaPatchPanel || 0)
        }
        case 'switch': {
          const aNome = a.switchNome || ''
          const bNome = b.switchNome || ''
          if (aNome !== bNome) return aNome.localeCompare(bNome, 'pt-BR')
          return (a.ponto.portaSwitch || 0) - (b.ponto.portaSwitch || 0)
        }
        case 'categoria':
          return (a.ponto.categoriaCabo || '').localeCompare(
            b.ponto.categoriaCabo || '',
            'pt-BR'
          )
        case 'ultimoTeste': {
          const ordem = { FAIL: 0, PASS: 1, SEM_TESTE: 2 }
          const valor = (item) => ordem[item.ultimo?.resultado || 'SEM_TESTE']
          if (valor(a) !== valor(b)) return valor(a) - valor(b)
          return (a.ultimo?.dataHora || '').localeCompare(b.ultimo?.dataHora || '')
        }
        default:
          return a.ponto.identificacao.localeCompare(
            b.ponto.identificacao,
            'pt-BR'
          )
      }
    }
    return [...filtradas].sort((a, b) => direcao * comparar(a, b))
  }, [
    todos,
    busca,
    salaFiltro,
    rackFiltro,
    patchPanelFiltro,
    categoriaFiltro,
    statusFiltro,
    testeDe,
    testeAte,
    ordenacao,
    racksVisiveisFiltro,
  ])

  function aoOrdenar(chave) {
    setOrdenacao((atual) =>
      atual.chave === chave
        ? { chave, direcao: -atual.direcao }
        : { chave, direcao: 1 }
    )
  }

  function limparFiltros() {
    setBusca('')
    setSalaFiltro('todos')
    setRackFiltro('todos')
    setPatchPanelFiltro('todos')
    setCategoriaFiltro('todos')
    setStatusFiltro('todos')
    setTesteDe('')
    setTesteAte('')
  }

  // ---------- Seleção múltipla ----------

  function alternarSelecionado(pontoId) {
    setSelecionados((atual) => {
      const novo = new Set(atual)
      if (novo.has(pontoId)) novo.delete(pontoId)
      else novo.add(pontoId)
      return novo
    })
  }

  const todosVisiveisSelecionados =
    visiveis.length > 0 &&
    visiveis.every((item) => selecionados.has(item.ponto.id))

  function alternarSelecionarTodosVisiveis() {
    setSelecionados((atual) => {
      const novo = new Set(atual)
      if (todosVisiveisSelecionados) {
        for (const item of visiveis) novo.delete(item.ponto.id)
      } else {
        for (const item of visiveis) novo.add(item.ponto.id)
      }
      return novo
    })
  }

  function limparSelecao() {
    setSelecionados(new Set())
  }

  const idsSelecionados = useMemo(
    () => [...selecionados].filter((id) =>
      todos.some((item) => item.ponto.id === id)
    ),
    [selecionados, todos]
  )

  function aoSalvarPonto(dados, pontoAtual) {
    if (pontoAtual) {
      editarPonto(pontoAtual.id, dados)
      onMostrarToast?.('Ponto atualizado com sucesso')
    } else {
      criarPonto(dados)
      onMostrarToast?.('Ponto criado com sucesso')
    }
    onDadosAlterados?.()
    setModal(null)
  }

  const testesDoPontoParaExcluir = pontoParaExcluir
    ? testes.filter((teste) => teste.pontoId === pontoParaExcluir.id).length
    : 0

  function confirmarExclusao({ apagarHistorico }) {
    if (!pontoParaExcluir) return
    excluirPonto(pontoParaExcluir.id)
    if (apagarHistorico) {
      excluirTestesDoPonto(pontoParaExcluir.id)
      onTestesAlterados?.()
    }
    onDadosAlterados?.()
    onMostrarToast?.(
      apagarHistorico
        ? 'Ponto e histórico de testes excluídos'
        : 'Ponto excluído'
    )
    setPontoParaExcluir(null)
  }

  function confirmarExclusaoLote() {
    const total = excluirPontos(idsSelecionados)
    setExcluirEmLote(false)
    limparSelecao()
    onDadosAlterados?.()
    onMostrarToast?.(`${total} ponto(s) excluído(s)`)
  }

  function aoConcluirLote(mensagem) {
    setLote(null)
    limparSelecao()
    onDadosAlterados?.()
    if (mensagem) onMostrarToast?.(mensagem)
  }

  const temFiltroAtivo =
    busca.trim() !== '' ||
    salaFiltro !== 'todos' ||
    rackFiltro !== 'todos' ||
    patchPanelFiltro !== 'todos' ||
    categoriaFiltro !== 'todos' ||
    statusFiltro !== 'todos' ||
    testeDe !== '' ||
    testeAte !== ''

  return (
    <div className="redes-conteudo">
      {/* Faixa de cartões-resumo */}
      <div className="redes-resumo-grid cinco">
        <div className="redes-resumo-card azul">
          <span className="redes-resumo-icone" aria-hidden="true">
            <NetworkIcon size={20} />
          </span>
          <div>
            <strong>{resumo.total}</strong>
            <span>Total de pontos</span>
          </div>
        </div>
        <div className="redes-resumo-card verde">
          <span className="redes-resumo-icone" aria-hidden="true">
            <CheckCircleIcon size={20} />
          </span>
          <div>
            <strong>{resumo.pass}</strong>
            <span>Pontos OK (PASS)</span>
          </div>
        </div>
        <div className="redes-resumo-card vermelho">
          <span className="redes-resumo-icone" aria-hidden="true">
            <XCircleIcon size={20} />
          </span>
          <div>
            <strong>{resumo.fail}</strong>
            <span>Pontos com falha (FAIL)</span>
          </div>
        </div>
        <div className="redes-resumo-card ambar">
          <span className="redes-resumo-icone" aria-hidden="true">
            <ClockIcon size={20} />
          </span>
          <div>
            <strong>{resumo.semTeste}</strong>
            <span>Pontos sem teste</span>
          </div>
        </div>
        <div className="redes-resumo-card cinza">
          <span className="redes-resumo-icone" aria-hidden="true">
            <PlugIcon size={20} />
          </span>
          <div>
            <strong>{resumo.naoConectados}</strong>
            <span>Não conectados</span>
          </div>
        </div>
      </div>

      <div className="redes-filtros">
        <div className="redes-busca">
          <SearchIcon size={16} />
          <input
            type="text"
            placeholder="Buscar ponto, sala, rack, observação..."
            value={busca}
            onChange={(evento) => setBusca(evento.target.value)}
            aria-label="Buscar ponto de rede"
          />
        </div>
        <select
          className="redes-select"
          aria-label="Filtrar por sala"
          value={salaFiltro}
          onChange={(evento) => {
            setSalaFiltro(evento.target.value)
            setRackFiltro('todos')
            setPatchPanelFiltro('todos')
          }}
        >
          <option value="todos">Todas as salas</option>
          {salas.map((sala) => (
            <option key={sala.id} value={sala.id}>
              {sala.nome}
            </option>
          ))}
        </select>
        <select
          className="redes-select"
          aria-label="Filtrar por rack"
          value={rackFiltro}
          onChange={(evento) => {
            setRackFiltro(evento.target.value)
            setPatchPanelFiltro('todos')
          }}
          disabled={racksVisiveisFiltro.length === 0}
        >
          <option value="todos">Todos os racks</option>
          {racksVisiveisFiltro.length > 0 &&
            [...salas]
              .filter(
                (sala) => salaFiltro === 'todos' || sala.id === salaFiltro
              )
              .map((sala) => {
                const racksDaSala = racksVisiveisFiltro.filter(
                  (item) => item.sala.id === sala.id
                )
                if (racksDaSala.length === 0) return null
                return (
                  <optgroup key={sala.id} label={sala.nome}>
                    {racksDaSala.map(({ rack }) => (
                      <option key={rack.id} value={rack.id}>
                        {rack.nome}
                      </option>
                    ))}
                  </optgroup>
                )
              })}
        </select>
        <select
          className="redes-select"
          aria-label="Filtrar por patch panel"
          value={patchPanelFiltro}
          onChange={(evento) => setPatchPanelFiltro(evento.target.value)}
          disabled={patchPanelsFiltro.length === 0}
        >
          <option value="todos">Todos os patch panels</option>
          {patchPanelsFiltro.length > 0 &&
            [...salas]
              .filter(
                (sala) => salaFiltro === 'todos' || sala.id === salaFiltro
              )
              .map((sala) => {
                const ppsDaSala = patchPanelsFiltro.filter(
                  (item) => item.sala.id === sala.id
                )
                if (ppsDaSala.length === 0) return null
                return (
                  <optgroup key={sala.id} label={sala.nome}>
                    {ppsDaSala.map(({ equipamento }) => (
                      <option key={equipamento.id} value={equipamento.id}>
                        {equipamento.nome}
                      </option>
                    ))}
                  </optgroup>
                )
              })}
        </select>
        <select
          className="redes-select"
          aria-label="Filtrar por categoria do cabo"
          value={categoriaFiltro}
          onChange={(evento) => setCategoriaFiltro(evento.target.value)}
        >
          <option value="todos">Todas as categorias</option>
          {CATEGORIAS_CABO.map((categoria) => (
            <option key={categoria} value={categoria}>
              {categoria}
            </option>
          ))}
        </select>
        <select
          className="redes-select"
          aria-label="Filtrar por status do último teste"
          value={statusFiltro}
          onChange={(evento) => setStatusFiltro(evento.target.value)}
        >
          {STATUS_FILTRO.map((item) => (
            <option key={item.id} value={item.id}>
              {item.label}
            </option>
          ))}
        </select>
        <input
          type="date"
          className="redes-select redes-data"
          aria-label="Último teste a partir de"
          value={testeDe}
          onChange={(evento) => setTesteDe(evento.target.value)}
          title="Último teste a partir de"
        />
        <input
          type="date"
          className="redes-select redes-data"
          aria-label="Último teste até"
          value={testeAte}
          onChange={(evento) => setTesteAte(evento.target.value)}
          title="Último teste até"
        />
        <div
          className="redes-vista-toggle"
          role="radiogroup"
          aria-label="Modo de visualização"
        >
          <button
            type="button"
            className={vista === 'lista' ? 'ativo' : ''}
            aria-pressed={vista === 'lista'}
            onClick={() => setVista('lista')}
            title="Visualização em lista"
          >
            <ListIcon size={15} />
            Lista
          </button>
          <button
            type="button"
            className={vista === 'cartoes' ? 'ativo' : ''}
            aria-pressed={vista === 'cartoes'}
            onClick={() => setVista('cartoes')}
            title="Visualização em cartões"
          >
            <GridIcon size={15} />
            Cartões
          </button>
        </div>
        <button
          type="button"
          className="btn-new"
          onClick={() => setModal({ ponto: null })}
        >
          <PlusIcon size={16} />
          Novo ponto
        </button>
      </div>

      {/* Barra de ações em lote */}
      {idsSelecionados.length > 0 && (
        <div className="redes-lote-bar" role="toolbar" aria-label="Ações em lote">
          <strong>{idsSelecionados.length} selecionado(s)</strong>
          <div className="redes-lote-acoes">
            <button type="button" className="redes-filtro-btn" onClick={() => setLote('status')}>
              <CheckCircleIcon size={14} />
              Alterar status
            </button>
            <button type="button" className="redes-filtro-btn" onClick={() => setLote('mover')}>
              <BoxIcon size={14} />
              Mover de sala
            </button>
            <button
              type="button"
              className="redes-filtro-btn"
              onClick={() => onGerarEtiquetasLote?.(idsSelecionados)}
            >
              <TagIcon size={14} />
              Gerar etiquetas
            </button>
            <button
              type="button"
              className="redes-filtro-btn perigo"
              onClick={() => setExcluirEmLote(true)}
            >
              <TrashIcon size={14} />
              Excluir
            </button>
            <button type="button" className="redes-filtro-btn" onClick={limparSelecao}>
              Limpar seleção
            </button>
          </div>
        </div>
      )}

      {todos.length === 0 && salas.length === 0 ? (
        <div className="empty-state">
          <NetworkIcon size={28} />
          <p>
            Nenhuma sala cadastrada ainda. Crie uma sala em Salas para
            começar a cadastrar pontos de rede.
          </p>
        </div>
      ) : todos.length === 0 ? (
        <div className="empty-state">
          <NetworkIcon size={28} />
          <p>Nenhum ponto de rede cadastrado.</p>
          <button
            type="button"
            className="btn-new"
            onClick={() => setModal({ ponto: null })}
          >
            <PlusIcon size={16} />
            Criar o primeiro ponto
          </button>
        </div>
      ) : visiveis.length === 0 ? (
        <div className="empty-state">
          <SearchIcon size={28} />
          <p>Nenhum ponto encontrado com os filtros atuais.</p>
          <button type="button" className="redes-filtro-btn" onClick={limparFiltros}>
            Limpar filtros
          </button>
        </div>
      ) : vista === 'cartoes' ? (
        <div className="redes-cartoes-grid">
          {visiveis.map(({ ponto, sala, patchPanel, rack, switchNome, ultimo, conectado }) => (
            <article key={ponto.id} className="ponto-card">
              <label className="ponto-card-check">
                <input
                  type="checkbox"
                  checked={selecionados.has(ponto.id)}
                  onChange={() => alternarSelecionado(ponto.id)}
                  aria-label={`Selecionar ${ponto.identificacao}`}
                />
              </label>
              <button
                type="button"
                className="ponto-card-corpo"
                onClick={() => onAbrirPainel?.(ponto.id)}
              >
                <span className="ponto-card-topo">
                  <span className="ponto-card-titulo">
                    <NetworkIcon size={15} />
                    {ponto.identificacao}
                  </span>
                  {badgeUltimoTeste(ultimo)}
                </span>
                <span className="ponto-card-cadeia">
                  <span>{sala.nome}</span>
                  {rack ? (
                    <>
                      <ArrowRightIcon size={11} />
                      <span>{rack}</span>
                    </>
                  ) : null}
                  {patchPanel && ponto.portaPatchPanel ? (
                    <>
                      <ArrowRightIcon size={11} />
                      <span>
                        {patchPanel} / porta {ponto.portaPatchPanel}
                      </span>
                    </>
                  ) : null}
                  {switchNome && ponto.portaSwitch ? (
                    <>
                      <ArrowRightIcon size={11} />
                      <span>
                        {switchNome} / porta {ponto.portaSwitch}
                      </span>
                    </>
                  ) : null}
                  {ponto.categoriaCabo ? (
                    <>
                      <ArrowRightIcon size={11} />
                      <span>{ponto.categoriaCabo}</span>
                    </>
                  ) : null}
                </span>
                {!conectado && (
                  <span className="ponto-card-aviso">Cadeia incompleta</span>
                )}
              </button>
              <div className="ponto-card-acoes">
                <button
                  type="button"
                  className="redes-btn-acao"
                  aria-label={`Editar ${ponto.identificacao}`}
                  title="Editar"
                  onClick={() => setModal({ ponto })}
                >
                  <PencilIcon size={15} />
                </button>
                <button
                  type="button"
                  className="redes-btn-acao perigo"
                  aria-label={`Excluir ${ponto.identificacao}`}
                  title="Excluir"
                  onClick={() => setPontoParaExcluir(ponto)}
                >
                  <TrashIcon size={15} />
                </button>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="redes-tabela-wrap">
          <table className="redes-tabela">
            <thead>
              <tr>
                <th scope="col" className="redes-th-check">
                  <input
                    type="checkbox"
                    checked={todosVisiveisSelecionados}
                    onChange={alternarSelecionarTodosVisiveis}
                    aria-label="Selecionar todos os pontos visíveis"
                  />
                </th>
                {COLUNAS.map((coluna) => (
                  <th key={coluna.chave} scope="col">
                    <button
                      type="button"
                      className={`redes-th${
                        ordenacao.chave === coluna.chave ? ' ativa' : ''
                      }`}
                      onClick={() => aoOrdenar(coluna.chave)}
                      aria-label={`Ordenar por ${coluna.label}`}
                    >
                      {coluna.label}
                      <span className="redes-th-seta" aria-hidden="true">
                        {ordenacao.chave === coluna.chave
                          ? ordenacao.direcao === 1
                            ? '↑'
                            : '↓'
                          : ''}
                      </span>
                    </button>
                  </th>
                ))}
                <th scope="col" className="redes-th-acoes">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody>
              {visiveis.map(({ ponto, sala, patchPanel, rack, switchNome, ultimo }) => (
                <tr
                  key={ponto.id}
                  className="redes-tr"
                  tabIndex={0}
                  onClick={() => onAbrirPainel?.(ponto.id)}
                  onKeyDown={(evento) => {
                    if (evento.key === 'Enter') onAbrirPainel?.(ponto.id)
                  }}
                >
                  <td className="redes-td-check" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={selecionados.has(ponto.id)}
                      onChange={() => alternarSelecionado(ponto.id)}
                      aria-label={`Selecionar ${ponto.identificacao}`}
                    />
                  </td>
                  <td>
                    <span className="redes-td-identificacao">
                      <NetworkIcon size={15} />
                      {ponto.identificacao}
                    </span>
                  </td>
                  <td>{sala.nome}</td>
                  <td>{rack || '—'}</td>
                  <td>
                    {patchPanel
                      ? `${patchPanel} / porta ${ponto.portaPatchPanel}`
                      : '—'}
                  </td>
                  <td>
                    {switchNome
                      ? `${switchNome} / porta ${ponto.portaSwitch}`
                      : '—'}
                  </td>
                  <td>
                    <span className="detalhe-chip neutro">
                      {ponto.categoriaCabo || '—'}
                    </span>
                  </td>
                  <td>{badgeUltimoTeste(ultimo)}</td>
                  <td className="redes-td-acoes">
                    <button
                      type="button"
                      className="redes-btn-acao"
                      aria-label={`Editar ${ponto.identificacao}`}
                      title="Editar"
                      onClick={(evento) => {
                        evento.stopPropagation()
                        setModal({ ponto })
                      }}
                    >
                      <PencilIcon size={15} />
                    </button>
                    <button
                      type="button"
                      className="redes-btn-acao perigo"
                      aria-label={`Excluir ${ponto.identificacao}`}
                      title="Excluir"
                      onClick={(evento) => {
                        evento.stopPropagation()
                        setPontoParaExcluir(ponto)
                      }}
                    >
                      <TrashIcon size={15} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modal && (
        <PontoModal
          salas={salas}
          ponto={modal.ponto}
          onFechar={() => setModal(null)}
          onSalvar={aoSalvarPonto}
        />
      )}

      {pontoParaExcluir && (
        <ConfirmDialog
          titulo="Excluir ponto de rede"
          texto={
            testesDoPontoParaExcluir > 0
              ? `Tem certeza que deseja excluir “${pontoParaExcluir.identificacao}”? O ponto possui ${testesDoPontoParaExcluir} teste(s) de certificação registrado(s). As portas ligadas a ele serão liberadas.`
              : `Tem certeza que deseja excluir “${pontoParaExcluir.identificacao}”? As portas ligadas a ele serão liberadas.`
          }
          confirmarLabel={
            testesDoPontoParaExcluir > 0
              ? 'Excluir ponto e histórico'
              : 'Excluir'
          }
          extraLabel={testesDoPontoParaExcluir > 0 ? 'Excluir só o ponto' : undefined}
          onExtra={() => confirmarExclusao({ apagarHistorico: false })}
          perigo
          onConfirmar={() => confirmarExclusao({ apagarHistorico: true })}
          onCancelar={() => setPontoParaExcluir(null)}
        />
      )}

      {excluirEmLote && (
        <ConfirmDialog
          titulo="Excluir pontos selecionados"
          texto={`Tem certeza que deseja excluir ${idsSelecionados.length} ponto(s)? As portas ligadas a eles serão liberadas. O histórico de testes é mantido.`}
          confirmarLabel="Excluir todos"
          perigo
          onConfirmar={confirmarExclusaoLote}
          onCancelar={() => setExcluirEmLote(false)}
        />
      )}

      {lote === 'status' && (
        <LoteStatusDrawer
          pontos={idsSelecionados.map((id) =>
            todos.find((item) => item.ponto.id === id)?.ponto
          ).filter(Boolean)}
          onFechar={() => setLote(null)}
          onConcluir={aoConcluirLote}
          onTestesAlterados={onTestesAlterados}
        />
      )}

      {lote === 'mover' && (
        <LoteMoverDrawer
          salas={salas}
          pontoIds={idsSelecionados}
          onFechar={() => setLote(null)}
          onConcluir={aoConcluirLote}
        />
      )}

      {temFiltroAtivo && visiveis.length > 0 && (
        <p className="redes-contagem" aria-live="polite">
          {visiveis.length} de {todos.length} ponto(s)
        </p>
      )}
    </div>
  )
}
