// Tabela de portas do switch: todas as colunas do inventário, ordenação por
// qualquer coluna, caixa de seleção para edição em lote e linha clicável
// que abre o painel lateral.

import { useMemo } from 'react'
import {
  calcularEstadoPorta,
  descricaoVinculo,
} from '../../utils/racks'
import {
  estadoPortaInfo,
  dispositivoInfo,
  rotuloVelocidade,
  rotuloPoe,
  rotuloTeste,
  VELOCIDADES,
  MODOS_POE,
  ULTIMOS_TESTES,
  ESTADOS_PORTA,
} from './opcoes'

const COLUNAS = [
  { chave: 'numero', label: 'Porta' },
  { chave: 'nome', label: 'Nome' },
  { chave: 'status', label: 'Status' },
  { chave: 'dispositivo', label: 'Dispositivo conectado' },
  { chave: 'pontoRede', label: 'Ponto de rede' },
  { chave: 'vinculo', label: 'Patch panel / porta' },
  { chave: 'categoriaCabo', label: 'Categoria do cabo' },
  { chave: 'velocidade', label: 'Velocidade' },
  { chave: 'poe', label: 'PoE' },
  { chave: 'vlan', label: 'VLAN' },
  { chave: 'teste', label: 'Último teste' },
  { chave: 'observacao', label: 'Observação' },
]

function valorDe(porta, estado, chave, sala) {
  switch (chave) {
    case 'numero':
      return porta.numero
    case 'nome':
      return porta.nome || ''
    case 'status':
      return ESTADOS_PORTA.findIndex((item) => item.id === estado)
    case 'dispositivo':
      return porta.dispositivoConectado?.nome || ''
    case 'pontoRede':
      return porta.pontoRede?.identificacao || ''
    case 'vinculo':
      return descricaoVinculo(sala, porta)
    case 'categoriaCabo':
      return porta.categoriaCabo || ''
    case 'velocidade':
      return VELOCIDADES.findIndex((item) => item.id === porta.velocidade)
    case 'poe':
      return MODOS_POE.findIndex((item) => item.id === porta.poe)
    case 'vlan': {
      const numero = Number(porta.vlanNativa)
      return Number.isFinite(numero) && porta.vlanNativa !== ''
        ? numero
        : -1
    }
    case 'teste':
      return ULTIMOS_TESTES.findIndex((item) => item.id === porta.ultimoTeste)
    case 'observacao':
      return porta.observacao || ''
    default:
      return ''
  }
}

function comparar(va, vb) {
  if (typeof va === 'number' && typeof vb === 'number') return va - vb
  return String(va === undefined ? '' : va).localeCompare(
    String(vb === undefined ? '' : vb),
    'pt-BR'
  )
}

function QuadroEstado({ estado }) {
  const info = estadoPortaInfo(estado)
  return (
    <span
      className="porta-quadro-mini"
      style={{
        background: info.cor,
        borderColor: info.borda,
        color: info.iconeFundo,
      }}
      aria-hidden="true"
    >
      <info.Icone size={9} />
    </span>
  )
}

export default function TabelaPortas({
  sala,
  falhas,
  portas,
  ordenacao,
  onOrdenar,
  selecionadas,
  onToggleSelecao,
  onSelecionarTodas,
  onDesmarcarTodas,
  portaPainelId,
  onAbrirPorta,
}) {
  const { chave, direcao } = ordenacao

  const portasComEstado = useMemo(
    () =>
      portas.map((porta) => ({
        porta,
        estado: calcularEstadoPorta(porta, falhas),
      })),
    [portas, falhas]
  )

  const ordenadas = useMemo(() => {
    const lista = [...portasComEstado]
    lista.sort((a, b) =>
      direcao *
      comparar(
        valorDe(a.porta, a.estado, chave, sala),
        valorDe(b.porta, b.estado, chave, sala)
      )
    )
    return lista
  }, [portasComEstado, chave, direcao, sala])

  const todasSelecionadas =
    ordenadas.length > 0 &&
    ordenadas.every(({ porta }) => selecionadas.has(porta.id))

  function aoTrocarTodas(event) {
    if (event.target.checked) {
      onSelecionarTodas?.()
    } else {
      onDesmarcarTodas?.()
    }
  }

  return (
    <div className="tabela-wrap">
      <table className="tabela-portas">
        <thead>
          <tr>
            <th className="td-check">
              <input
                type="checkbox"
                checked={todasSelecionadas}
                onChange={aoTrocarTodas}
                aria-label="Selecionar todas as portas visíveis"
              />
            </th>
            {COLUNAS.map((coluna) => (
              <th key={coluna.chave} aria-sort={
                chave === coluna.chave
                  ? direcao === 1
                    ? 'ascending'
                    : 'descending'
                  : 'none'
              }>
                <button
                  type="button"
                  className="th-ordenar"
                  onClick={() => onOrdenar(coluna.chave)}
                  title={`Ordenar por ${coluna.label}`}
                >
                  {coluna.label}
                  <span className="th-indice" aria-hidden="true">
                    {chave === coluna.chave ? (direcao === 1 ? '↑' : '↓') : ''}
                  </span>
                </button>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {ordenadas.length === 0 && (
            <tr>
              <td colSpan={COLUNAS.length + 1} className="td-vazia">
                Nenhuma porta encontrada com os filtros atuais.
              </td>
            </tr>
          )}
          {ordenadas.map(({ porta, estado }) => {
            const info = estadoPortaInfo(estado)
            const dispositivo = porta.dispositivoConectado || {}
            const InfoDispositivo = dispositivoInfo(dispositivo.tipo)
            const marcada = selecionadas.has(porta.id)
            const ativa = portaPainelId === porta.id
            return (
              <tr
                key={porta.id}
                className={`${marcada ? 'selecionada' : ''}${ativa ? ' ativa' : ''}`}
                onClick={() => onAbrirPorta(porta)}
              >
                <td className="td-check" onClick={(e) => e.stopPropagation()}>
                  <input
                    type="checkbox"
                    checked={marcada}
                    onChange={() => onToggleSelecao(porta.id)}
                    aria-label={`Selecionar porta ${porta.numero}`}
                  />
                </td>
                <td className="td-porta">
                  <QuadroEstado estado={estado} />
                  <strong>
                    {porta.numero}
                    {porta.sfp ? ' SFP' : ''}
                  </strong>
                </td>
                <td>{porta.nome || '—'}</td>
                <td>
                  <span className="td-status-nome">{info.curto || info.label}</span>
                </td>
                <td>
                  <span className="td-dispositivo">
                    {InfoDispositivo && (
                      <InfoDispositivo.Icone size={14} />
                    )}
                    {dispositivo.nome || '—'}
                  </span>
                </td>
                <td>{porta.pontoRede?.identificacao || '—'}</td>
                <td>{descricaoVinculo(sala, porta) || '—'}</td>
                <td>{porta.categoriaCabo || '—'}</td>
                <td>{porta.velocidade === 'auto' ? 'Auto' : rotuloVelocidade(porta.velocidade)}</td>
                <td>{porta.poe && porta.poe !== 'desligado' ? rotuloPoe(porta.poe) : '—'}</td>
                <td>{porta.vlanNativa || '—'}</td>
                <td>
                  <span className={`chip-teste teste-${porta.ultimoTeste}`}>
                    {rotuloTeste(porta.ultimoTeste)}
                  </span>
                </td>
                <td className="td-observacao">{porta.observacao || '—'}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
