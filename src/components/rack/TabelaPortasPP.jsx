// Tabela de portas do patch panel: uma linha por número de porta, com a
// cadeia do inventário — frente (porta do switch) e verso (ponto de rede).

import { useMemo } from 'react'
import {
  descricaoVinculo,
  piorTesteEntre,
} from '../../utils/racks'
import { estadoPortaInfo, rotuloTeste } from './opcoes'

const COLUNAS = [
  { chave: 'numero', label: 'Porta' },
  { chave: 'frente', label: 'Frente → porta do switch' },
  { chave: 'verso', label: 'Verso → ponto de rede' },
  { chave: 'local', label: 'Local do ponto' },
  { chave: 'categoriaCabo', label: 'Categoria do cabo' },
  { chave: 'comprimento', label: 'Comprimento (m)' },
  { chave: 'status', label: 'Status' },
  { chave: 'teste', label: 'Último teste' },
  { chave: 'observacao', label: 'Observação' },
]

const ORDEM_STATUS = [
  'critica',
  'atencao',
  'bloqueada',
  'uplink',
  'aguardando',
  'certificada',
  'livre',
]

const ORDEM_TESTE = ['FAIL', 'SEM_TESTE', 'PASS']

function valorDe(linha, chave, sala) {
  const { frente, verso, estadoLinha } = linha
  switch (chave) {
    case 'numero':
      return linha.numero
    case 'frente':
      return descricaoVinculo(sala, frente)
    case 'verso':
      return verso?.pontoRede?.identificacao || ''
    case 'local':
      return verso?.pontoRede?.local || ''
    case 'categoriaCabo':
      return frente?.categoriaCabo || verso?.categoriaCabo || ''
    case 'comprimento':
      return verso?.comprimentoM || ''
    case 'status':
      return ORDEM_STATUS.indexOf(estadoLinha)
    case 'teste':
      return ORDEM_TESTE.indexOf(
        piorTesteEntre(frente?.ultimoTeste, verso?.ultimoTeste)
      )
    case 'observacao':
      return frente?.observacao || verso?.observacao || ''
    default:
      return ''
  }
}

function comparar(va, vb) {
  if (typeof va === 'number' && typeof vb === 'number') return va - vb
  return String(va ?? '').localeCompare(String(vb ?? ''), 'pt-BR')
}

export default function TabelaPortasPP({
  sala,
  linhas,
  ordenacao,
  onOrdenar,
  numerosSelecionados,
  onToggleNumero,
  onSelecionarTodos,
  onDesmarcarTodos,
  linhaPainelNumero,
  onAbrirLinha,
}) {
  const { chave, direcao } = ordenacao

  const ordenadas = useMemo(() => {
    const lista = [...linhas]
    lista.sort((a, b) =>
      direcao * comparar(valorDe(a, chave, sala), valorDe(b, chave, sala))
    )
    return lista
  }, [linhas, chave, direcao, sala])

  const todosSelecionados =
    ordenadas.length > 0 &&
    ordenadas.every((linha) => numerosSelecionados.has(linha.numero))

  return (
    <div className="tabela-wrap">
      <table className="tabela-portas">
        <thead>
          <tr>
            <th className="td-check">
              <input
                type="checkbox"
                checked={todosSelecionados}
                onChange={(event) =>
                  event.target.checked ? onSelecionarTodos() : onDesmarcarTodos()
                }
                aria-label="Selecionar todas as portas visíveis"
              />
            </th>
            {COLUNAS.map((coluna) => (
              <th
                key={coluna.chave}
                aria-sort={
                  chave === coluna.chave
                    ? direcao === 1
                      ? 'ascending'
                      : 'descending'
                    : 'none'
                }
              >
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
          {ordenadas.map((linha) => {
            const info = estadoPortaInfo(linha.estadoLinha)
            const marcada = numerosSelecionados.has(linha.numero)
            const ativa = linhaPainelNumero === linha.numero
            return (
              <tr
                key={linha.numero}
                className={`${marcada ? 'selecionada' : ''}${ativa ? ' ativa' : ''}`}
                onClick={() => onAbrirLinha(linha)}
              >
                <td className="td-check" onClick={(e) => e.stopPropagation()}>
                  <input
                    type="checkbox"
                    checked={marcada}
                    onChange={() => onToggleNumero(linha.numero)}
                    aria-label={`Selecionar porta ${linha.numero}`}
                  />
                </td>
                <td className="td-porta">
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
                  <strong>{linha.numero}</strong>
                </td>
                <td>{descricaoVinculo(sala, linha.frente) || '—'}</td>
                <td>{linha.verso?.pontoRede?.identificacao || '—'}</td>
                <td>{linha.verso?.pontoRede?.local || '—'}</td>
                <td>
                  {linha.frente?.categoriaCabo ||
                    linha.verso?.categoriaCabo ||
                    '—'}
                </td>
                <td>{linha.verso?.comprimentoM || '—'}</td>
                <td>
                  <span className="td-status-nome">{info.curto || info.label}</span>
                </td>
                <td>
                  <span
                    className={`chip-teste teste-${piorTesteEntre(
                      linha.frente?.ultimoTeste,
                      linha.verso?.ultimoTeste
                    )}`}
                  >
                    {rotuloTeste(
                      piorTesteEntre(
                        linha.frente?.ultimoTeste,
                        linha.verso?.ultimoTeste
                      )
                    )}
                  </span>
                </td>
                <td className="td-observacao">
                  {linha.frente?.observacao || linha.verso?.observacao || '—'}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
