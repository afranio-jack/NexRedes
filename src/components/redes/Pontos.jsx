// Sub-aba "Pontos": tabela de todos os pontos de rede com filtros (busca,
// sala, categoria e status do último teste), ordenação por coluna e o
// modal de criação/edição (PontoModal). Clicar numa linha abre a página do
// ponto (/redes/pontos/:id).

import { useMemo, useState } from 'react'
import { SearchIcon, PlusIcon, PencilIcon, TrashIcon, NetworkIcon } from '../icons'
import PontoModal from './PontoModal'
import ConfirmDialog from '../sala/ConfirmDialog'
import {
  listarTodosPontos,
  excluirPonto,
  criarPonto,
  editarPonto,
} from '../../utils/pontos'
import { excluirTestesDoPonto } from '../../utils/testes'
import { CATEGORIAS_CABO } from '../sala/opcoes'
import { navegar } from '../../utils/rotas'

const STATUS_FILTRO = [
  { id: 'todos', label: 'Todos os status' },
  { id: 'PASS', label: 'Último teste: PASS' },
  { id: 'FAIL', label: 'Último teste: FAIL' },
  { id: 'SEM_TESTE', label: 'Sem teste' },
]

const COLUNAS = [
  { chave: 'identificacao', label: 'Identificação' },
  { chave: 'sala', label: 'Sala' },
  { chave: 'patchPanel', label: 'Patch panel / porta' },
  { chave: 'switch', label: 'Porta do switch' },
  { chave: 'categoria', label: 'Categoria do cabo' },
  { chave: 'ultimoTeste', label: 'Último teste' },
]

function nomeEquipamento(sala, equipamentoId) {
  for (const rack of sala.racks || []) {
    const equipamento = (rack.equipamentos || []).find(
      (item) => item.id === equipamentoId
    )
    if (equipamento) return equipamento.nome
  }
  return ''
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
}) {
  const [busca, setBusca] = useState('')
  const [salaFiltro, setSalaFiltro] = useState('todos')
  const [categoriaFiltro, setCategoriaFiltro] = useState('todos')
  const [statusFiltro, setStatusFiltro] = useState('todos')
  const [ordenacao, setOrdenacao] = useState({
    chave: 'identificacao',
    direcao: 1,
  })
  const [modal, setModal] = useState(null) // null | { ponto: Ponto | null }
  const [pontoParaExcluir, setPontoParaExcluir] = useState(null)

  const todos = useMemo(() => {
    return listarTodosPontos(salas).map((ponto) => {
      const doPonto = testes
        .filter((teste) => teste.pontoId === ponto.id)
        .sort((a, b) => (a.dataHora < b.dataHora ? 1 : -1))
      return {
        ponto,
        sala: ponto.sala,
        patchPanel: nomeEquipamento(ponto.sala, ponto.patchPanelId),
        switchNome: nomeEquipamento(ponto.sala, ponto.switchId),
        ultimo: doPonto[0] || null,
      }
    })
  }, [salas, testes])

  const visiveis = useMemo(() => {
    const termo = busca.trim().toLowerCase()
    const filtradas = todos.filter(({ ponto, sala, patchPanel, switchNome, ultimo }) => {
      if (termo) {
        const alvo = [
          ponto.identificacao,
          sala.nome,
          patchPanel,
          switchNome,
          ponto.observacoes,
        ]
          .join(' ')
          .toLowerCase()
        if (!alvo.includes(termo)) return false
      }
      if (salaFiltro !== 'todos' && sala.id !== salaFiltro) return false
      if (
        categoriaFiltro !== 'todos' &&
        (ponto.categoriaCabo || '') !== categoriaFiltro
      )
        return false
      if (statusFiltro !== 'todos') {
        const resultado = ultimo?.resultado || 'SEM_TESTE'
        if (resultado !== statusFiltro) return false
      }
      return true
    })
    const direcao = ordenacao.direcao
    const comparar = (a, b) => {
      switch (ordenacao.chave) {
        case 'sala':
          return a.sala.nome.localeCompare(b.sala.nome, 'pt-BR')
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
  }, [todos, busca, salaFiltro, categoriaFiltro, statusFiltro, ordenacao])

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
    setCategoriaFiltro('todos')
    setStatusFiltro('todos')
  }

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

  const temFiltroAtivo =
    busca.trim() !== '' ||
    salaFiltro !== 'todos' ||
    categoriaFiltro !== 'todos' ||
    statusFiltro !== 'todos'

  return (
    <div className="redes-conteudo">
      <div className="redes-filtros">
        <div className="redes-busca">
          <SearchIcon size={16} />
          <input
            type="text"
            placeholder="Buscar ponto, sala, observação..."
            value={busca}
            onChange={(evento) => setBusca(evento.target.value)}
            aria-label="Buscar ponto de rede"
          />
        </div>
        <select
          className="redes-select"
          aria-label="Filtrar por sala"
          value={salaFiltro}
          onChange={(evento) => setSalaFiltro(evento.target.value)}
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
        <button
          type="button"
          className="btn-new"
          onClick={() => setModal({ ponto: null })}
        >
          <PlusIcon size={16} />
          Novo ponto
        </button>
      </div>

      {todos.length === 0 && salas.length === 0 ? (
        <div className="empty-state">
          <NetworkIcon size={28} />
          <p>
            Nenhuma sala cadastrada ainda. Crie uma sala em Projetos para
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
      ) : (
        <div className="redes-tabela-wrap">
          <table className="redes-tabela">
            <thead>
              <tr>
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
              {visiveis.map(({ ponto, sala, patchPanel, switchNome, ultimo }) => (
                <tr
                  key={ponto.id}
                  className="redes-tr"
                  tabIndex={0}
                  onClick={() => navegar(`/redes/pontos/${encodeURIComponent(ponto.id)}`)}
                  onKeyDown={(evento) => {
                    if (evento.key === 'Enter') {
                      navegar(`/redes/pontos/${encodeURIComponent(ponto.id)}`)
                    }
                  }}
                >
                  <td>
                    <span className="redes-td-identificacao">
                      <NetworkIcon size={15} />
                      {ponto.identificacao}
                    </span>
                  </td>
                  <td>{sala.nome}</td>
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

      {temFiltroAtivo && visiveis.length > 0 && (
        <p className="redes-contagem" aria-live="polite">
          {visiveis.length} de {todos.length} ponto(s)
        </p>
      )}
    </div>
  )
}
