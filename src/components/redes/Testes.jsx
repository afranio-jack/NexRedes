// Sub-aba "Testes" (registro de testes de certificação): cartões de resumo
// (total, aprovados, reprovados e pontos sem teste), filtros por período,
// sala, resultado e ponto + busca livre, tabela completa com edição e
// exclusão (com confirmação) e exportação CSV dos testes filtrados.
// Um novo teste nunca sobrescreve o histórico — sempre cria um registro.

import { useMemo, useState } from 'react'
import {
  SearchIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
  ClipboardCheckIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  DownloadIcon,
} from '../icons'
import ConfirmDialog from '../sala/ConfirmDialog'
import { baixarCSV } from '../../utils/csv'
import { formatarDataHora } from '../../utils/datas'

const COLUNAS = [
  { chave: 'dataHora', label: 'Data' },
  { chave: 'ponto', label: 'Ponto' },
  { chave: 'sala', label: 'Sala' },
  { chave: 'categoria', label: 'Categoria do cabo' },
  { chave: 'resultado', label: 'Resultado' },
  { chave: 'tecnico', label: 'Técnico' },
  { chave: 'observacoes', label: 'Observação' },
]

export default function Testes({
  salas,
  testes,
  onRegistrarTeste,
  onEditarTeste,
  onExcluirTeste,
  onMostrarToast,
}) {
  const [busca, setBusca] = useState('')
  const [dataDe, setDataDe] = useState('')
  const [dataAte, setDataAte] = useState('')
  const [salaFiltro, setSalaFiltro] = useState('todos')
  const [resultadoFiltro, setResultadoFiltro] = useState('todos')
  const [pontoFiltro, setPontoFiltro] = useState('todos')
  const [ordenacao, setOrdenacao] = useState({
    chave: 'dataHora',
    direcao: -1,
  })
  const [testeParaExcluir, setTesteParaExcluir] = useState(null)

  // Mapa pontoId → { ponto, sala } para preencher as linhas da tabela
  const pontosPorId = useMemo(() => {
    const mapa = new Map()
    for (const sala of salas) {
      for (const ponto of sala.pontos || []) {
        mapa.set(ponto.id, { ponto, sala })
      }
    }
    return mapa
  }, [salas])

  const linhas = useMemo(() => {
    return testes.map((teste) => {
      const atual = pontosPorId.get(teste.pontoId)
      return {
        teste,
        pontoNome: atual
          ? atual.ponto.identificacao
          : teste.snapshot?.pontoIdentificacao || 'Ponto removido',
        removido: !atual,
        salaId: atual ? atual.sala.id : teste.snapshot?.salaId || null,
        salaNome: atual
          ? atual.sala.nome
          : teste.snapshot?.salaNome || 'Sala removida',
        categoria: atual
          ? atual.ponto.categoriaCabo || '—'
          : teste.snapshot?.categoriaCabo || '—',
      }
    })
  }, [testes, pontosPorId])

  const visiveis = useMemo(() => {
    const termo = busca.trim().toLowerCase()
    const filtradas = linhas.filter((linha) => {
      const data = (linha.teste.dataHora || '').slice(0, 10)
      if (dataDe && data < dataDe) return false
      if (dataAte && data > dataAte) return false
      if (salaFiltro !== 'todos' && linha.salaId !== salaFiltro) return false
      if (
        resultadoFiltro !== 'todos' &&
        linha.teste.resultado !== resultadoFiltro
      )
        return false
      if (pontoFiltro !== 'todos' && linha.teste.pontoId !== pontoFiltro) {
        return false
      }
      if (termo) {
        const alvo = [
          linha.pontoNome,
          linha.salaNome,
          linha.teste.tecnico,
          linha.teste.norma,
          linha.teste.motivoFalha,
          linha.teste.observacoes,
        ]
          .join(' ')
          .toLowerCase()
        if (!alvo.includes(termo)) return false
      }
      return true
    })
    const direcao = ordenacao.direcao
    const comparar = (a, b) => {
      switch (ordenacao.chave) {
        case 'ponto':
          return a.pontoNome.localeCompare(b.pontoNome, 'pt-BR')
        case 'sala':
          return a.salaNome.localeCompare(b.salaNome, 'pt-BR')
        case 'categoria':
          return a.categoria.localeCompare(b.categoria, 'pt-BR')
        case 'resultado':
          return a.teste.resultado.localeCompare(b.teste.resultado)
        case 'tecnico':
          return (a.teste.tecnico || '').localeCompare(
            b.teste.tecnico || '',
            'pt-BR'
          )
        case 'observacoes':
          return (a.teste.observacoes || '').localeCompare(
            b.teste.observacoes || '',
            'pt-BR'
          )
        default:
          return (a.teste.dataHora || '').localeCompare(b.teste.dataHora || '')
      }
    }
    return [...filtradas].sort((a, b) => direcao * comparar(a, b))
  }, [
    linhas,
    busca,
    dataDe,
    dataAte,
    salaFiltro,
    resultadoFiltro,
    pontoFiltro,
    ordenacao,
  ])

  const resumo = useMemo(() => {
    const totalPontos = [...pontosPorId.values()].length
    const comTeste = new Set(testes.map((teste) => teste.pontoId))
    return {
      total: testes.length,
      aprovados: testes.filter((teste) => teste.resultado === 'PASS').length,
      reprovados: testes.filter((teste) => teste.resultado === 'FAIL').length,
      semTeste: totalPontos - [...comTeste].filter((id) => pontosPorId.has(id)).length,
    }
  }, [testes, pontosPorId])

  function aoOrdenar(chave) {
    setOrdenacao((atual) =>
      atual.chave === chave
        ? { chave, direcao: -atual.direcao }
        : { chave, direcao: 1 }
    )
  }

  function limparFiltros() {
    setBusca('')
    setDataDe('')
    setDataAte('')
    setSalaFiltro('todos')
    setResultadoFiltro('todos')
    setPontoFiltro('todos')
  }

  function exportarCSV() {
    const cabecalho = [
      'Data',
      'Ponto',
      'Sala',
      'Categoria do cabo',
      'Resultado',
      'Técnico',
      'Norma',
      'Motivo da falha',
      'Observações',
    ]
    const registros = visiveis.map((linha) => [
      formatarDataHora(linha.teste.dataHora),
      linha.pontoNome + (linha.removido ? ' (removido)' : ''),
      linha.salaNome,
      linha.categoria,
      linha.teste.resultado,
      linha.teste.tecnico,
      linha.teste.norma,
      linha.teste.motivoFalha,
      linha.teste.observacoes,
    ])
    baixarCSV('testes-certificacao.csv', cabecalho, registros)
    onMostrarToast?.(`${registros.length} teste(s) exportado(s) para CSV`)
  }

  const temFiltroAtivo =
    busca.trim() !== '' ||
    dataDe !== '' ||
    dataAte !== '' ||
    salaFiltro !== 'todos' ||
    resultadoFiltro !== 'todos' ||
    pontoFiltro !== 'todos'

  return (
    <div className="redes-conteudo">
      <div className="redes-resumo-grid">
        <div className="redes-resumo-card azul">
          <span className="redes-resumo-icone" aria-hidden="true">
            <ClipboardCheckIcon size={20} />
          </span>
          <div>
            <strong>{resumo.total}</strong>
            <span>Total de testes</span>
          </div>
        </div>
        <div className="redes-resumo-card verde">
          <span className="redes-resumo-icone" aria-hidden="true">
            <CheckCircleIcon size={20} />
          </span>
          <div>
            <strong>{resumo.aprovados}</strong>
            <span>Aprovados (PASS)</span>
          </div>
        </div>
        <div className="redes-resumo-card vermelho">
          <span className="redes-resumo-icone" aria-hidden="true">
            <XCircleIcon size={20} />
          </span>
          <div>
            <strong>{resumo.reprovados}</strong>
            <span>Reprovados (FAIL)</span>
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
      </div>

      <div className="redes-filtros">
        <div className="redes-busca">
          <SearchIcon size={16} />
          <input
            type="text"
            placeholder="Buscar ponto, técnico, observação..."
            value={busca}
            onChange={(evento) => setBusca(evento.target.value)}
            aria-label="Buscar teste"
          />
        </div>
        <input
          type="date"
          className="redes-select redes-data"
          aria-label="Filtrar a partir de"
          value={dataDe}
          onChange={(evento) => setDataDe(evento.target.value)}
        />
        <input
          type="date"
          className="redes-select redes-data"
          aria-label="Filtrar até"
          value={dataAte}
          onChange={(evento) => setDataAte(evento.target.value)}
        />
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
          aria-label="Filtrar por resultado"
          value={resultadoFiltro}
          onChange={(evento) => setResultadoFiltro(evento.target.value)}
        >
          <option value="todos">Todos os resultados</option>
          <option value="PASS">PASS</option>
          <option value="FAIL">FAIL</option>
        </select>
        <select
          className="redes-select"
          aria-label="Filtrar por ponto"
          value={pontoFiltro}
          onChange={(evento) => setPontoFiltro(evento.target.value)}
        >
          <option value="todos">Todos os pontos</option>
          {salas
            .filter((sala) => (sala.pontos || []).length > 0)
            .map((sala) => (
              <optgroup key={sala.id} label={sala.nome}>
                {(sala.pontos || []).map((ponto) => (
                  <option key={ponto.id} value={ponto.id}>
                    {ponto.identificacao}
                  </option>
                ))}
              </optgroup>
            ))}
        </select>
        <button
          type="button"
          className="btn-new"
          onClick={() => onRegistrarTeste()}
        >
          <PlusIcon size={16} />
          Registrar teste
        </button>
      </div>

      {testes.length === 0 ? (
        <div className="empty-state">
          <ClipboardCheckIcon size={28} />
          <p>Nenhum teste de certificação registrado ainda.</p>
          <button
            type="button"
            className="btn-new"
            onClick={() => onRegistrarTeste()}
          >
            <PlusIcon size={16} />
            Registrar o primeiro teste
          </button>
        </div>
      ) : visiveis.length === 0 ? (
        <div className="empty-state">
          <SearchIcon size={28} />
          <p>Nenhum teste encontrado com os filtros atuais.</p>
          <button type="button" className="redes-filtro-btn" onClick={limparFiltros}>
            Limpar filtros
          </button>
        </div>
      ) : (
        <>
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
                {visiveis.map((linha) => (
                  <tr key={linha.teste.id} className="redes-tr">
                    <td className="redes-td-data">
                      {formatarDataHora(linha.teste.dataHora)}
                    </td>
                    <td className="redes-td-ponto">
                      {linha.pontoNome}
                      {linha.removido && (
                        <span className="redes-td-aviso"> (removido)</span>
                      )}
                    </td>
                    <td>{linha.salaNome}</td>
                    <td>{linha.categoria}</td>
                    <td>
                      <span
                        className={`selo-teste ${linha.teste.resultado.toLowerCase()}`}
                      >
                        {linha.teste.resultado}
                      </span>
                    </td>
                    <td>{linha.teste.tecnico || '—'}</td>
                    <td
                      className="redes-td-observacao"
                      title={linha.teste.observacoes}
                    >
                      {linha.teste.observacoes || '—'}
                    </td>
                    <td className="redes-td-acoes">
                      <button
                        type="button"
                        className="redes-btn-acao"
                        aria-label="Editar teste"
                        title="Editar"
                        onClick={() => onEditarTeste(linha.teste)}
                      >
                        <PencilIcon size={15} />
                      </button>
                      <button
                        type="button"
                        className="redes-btn-acao perigo"
                        aria-label="Excluir teste"
                        title="Excluir"
                        onClick={() => setTesteParaExcluir(linha.teste)}
                      >
                        <TrashIcon size={15} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="redes-rodape-tabela">
            <p className="redes-contagem" aria-live="polite">
              {visiveis.length} de {testes.length} teste(s)
            </p>
            <button
              type="button"
              className="ponto-btn-neutro"
              onClick={exportarCSV}
            >
              <DownloadIcon size={15} />
              Exportar CSV
            </button>
          </div>
        </>
      )}

      {testeParaExcluir && (
        <ConfirmDialog
          titulo="Excluir teste"
          texto={`Tem certeza que deseja excluir o teste de ${formatarDataHora(
            testeParaExcluir.dataHora
          )} (${testeParaExcluir.resultado})? O histórico não pode ser recuperado.`}
          confirmarLabel="Excluir"
          perigo
          onConfirmar={() => {
            onExcluirTeste(testeParaExcluir.id)
            setTesteParaExcluir(null)
          }}
          onCancelar={() => setTesteParaExcluir(null)}
        />
      )}
    </div>
  )
}
