// Página "Relatórios" (/relatorios): dashboard com filtros (período, sala e
// tipo de equipamento), cartões de indicadores (salas, equipamentos, pontos,
// máquinas, falhas abertas e % de aprovação), gráficos — rosca PASS×FAIL,
// falhas por sala, testes ao longo do tempo, ocupação de portas por
// switch/patch panel (empilhadas) e equipamentos por status — mais as listas
// "Últimas atividades" e "Pontos que precisam de atenção" e a exportação
// (CSV/Excel/PDF do dashboard e backup JSON) pelo modal "Exportar".

import { useEffect, useMemo, useState } from 'react'
import {
  DownloadIcon,
  BuildingIcon,
  ServerIcon,
  NetworkIcon,
  MonitorIcon,
  AlertTriangleIcon,
  CheckCircleIcon,
  SearchIcon,
  ClipboardCheckIcon,
} from '../icons'
import { navegar } from '../../utils/rotas'
import { listarTestes } from '../../utils/testes'
import {
  montarInventario,
  abaDaLinha,
} from '../../utils/equipamentos'
import { resumoPortas, resumoPortasLinha } from '../../utils/racks'
import { obterConfig, listarModelos } from '../../utils/etiquetas'
import { baixarJSON } from '../../utils/exportacao'
import {
  formatarDataHora,
  formatarDataRelativa,
  formatarDataInput,
} from '../../utils/datas'
import {
  GraficoRosca,
  GraficoBarras,
  GraficoLinha,
  BarrasEmpilhadas,
  GraficoVazio,
} from './Graficos'
import ModalExportar from './ModalExportar'
import './relatorios.css'
import '../redes/redes.css'

const TIPOS_FILTRO = [
  { id: 'todos', label: 'Todos os tipos' },
  { id: 'switches', label: 'Switches' },
  { id: 'patch_panels', label: 'Patch panels' },
  { id: 'racks', label: 'Racks' },
  { id: 'maquinas', label: 'Máquinas' },
  { id: 'outros', label: 'Outros' },
]

const MESES_CURTOS = [
  'jan', 'fev', 'mar', 'abr', 'mai', 'jun',
  'jul', 'ago', 'set', 'out', 'nov', 'dez',
]

export default function Relatorios({ salas, onMostrarToast }) {
  const [de, setDe] = useState('')
  const [ate, setAte] = useState('')
  const [salaFiltro, setSalaFiltro] = useState('todos')
  const [tipoFiltro, setTipoFiltro] = useState('todos')
  const [modalExportar, setModalExportar] = useState(false)
  // 'relatorio' (PDF do dashboard) | 'dados' (PDF de tabelas)
  const [imprimindo, setImprimindo] = useState(null)
  const [planilhasImpressao, setPlanilhasImpressao] = useState([])
  const [testes, setTestes] = useState(() => listarTestes())

  // Recarrega o histórico quando os dados mudam (mutações em outra tela)
  useEffect(() => {
    setTestes(listarTestes())
  }, [salas])

  const config = useMemo(() => obterConfig(), [salas])
  const statusConfig = config.rede.statusEquipamento || []

  const salasFiltradas = useMemo(
    () =>
      salaFiltro === 'todos'
        ? salas
        : salas.filter((sala) => sala.id === salaFiltro),
    [salas, salaFiltro]
  )

  // Testes dentro do período/sala escolhidos
  const testesFiltrados = useMemo(() => {
    return testes.filter((teste) => {
      const data = (teste.dataHora || '').slice(0, 10)
      if (de && data < de) return false
      if (ate && data > ate) return false
      if (salaFiltro !== 'todos') {
        if ((teste.snapshot?.salaId || null) !== salaFiltro) return false
      }
      return true
    })
  }, [testes, de, ate, salaFiltro])

  // Último teste de cada ponto da seleção
  const ultimoPorPonto = useMemo(() => {
    const mapa = new Map()
    for (const teste of testes) {
      const atual = mapa.get(teste.pontoId)
      if (!atual || teste.dataHora > atual.dataHora) mapa.set(teste.pontoId, teste)
    }
    return mapa
  }, [testes])

  const inventarioTipo = useMemo(() => {
    const inventario = montarInventario(salasFiltradas)
    if (tipoFiltro === 'todos') return inventario
    return inventario.filter((linha) => abaDaLinha(linha) === tipoFiltro)
  }, [salasFiltradas, tipoFiltro])

  // ---------- Indicadores ----------

  const indicadores = useMemo(() => {
    let pontos = 0
    let maquinas = 0
    let falhasAbertas = 0
    let pass = 0
    let comTeste = 0
    for (const sala of salasFiltradas) {
      pontos += (sala.pontos || []).length
      maquinas += sala.quantidadeMaquinas || 0
      falhasAbertas += (sala.falhas || []).filter(
        (falha) => falha.status !== 'resolvida'
      ).length
      for (const ponto of sala.pontos || []) {
        const ultimo = ultimoPorPonto.get(ponto.id)
        if (ultimo) {
          comTeste++
          if (ultimo.resultado === 'PASS') pass++
        }
      }
    }
    return {
      salas: salasFiltradas.length,
      equipamentos: inventarioTipo.length,
      pontos,
      maquinas,
      falhasAbertas,
      percentualAprovacao: comTeste > 0 ? Math.round((pass / comTeste) * 100) : 0,
      pass,
      fail: comTeste - pass,
      comTeste,
      semTeste: pontos - comTeste,
    }
  }, [salasFiltradas, inventarioTipo, ultimoPorPonto])

  // ---------- Gráficos ----------

  const dadosRosca = useMemo(() => {
    if (indicadores.comTeste === 0) return []
    return [
      { label: 'Aprovados (PASS)', valor: indicadores.pass, cor: '#16a34a' },
      { label: 'Reprovados (FAIL)', valor: indicadores.fail, cor: '#dc2626' },
    ]
  }, [indicadores])

  const dadosFalhasPorSala = useMemo(() => {
    return salasFiltradas.map((sala) => ({
      label: sala.nome,
      valor: (sala.falhas || []).filter((falha) => falha.status !== 'resolvida')
        .length,
      cor: '#dc2626',
    }))
  }, [salasFiltradas])

  const dadosTestesTempo = useMemo(() => {
    const porMes = new Map()
    for (const teste of testesFiltrados) {
      const chave = (teste.dataHora || '').slice(0, 7) // yyyy-mm
      if (!chave) continue
      porMes.set(chave, (porMes.get(chave) || 0) + 1)
    }
    const chaves = [...porMes.keys()].sort()
    const ultimos = chaves.slice(-12)
    return ultimos.map((chave) => {
      const [ano, mes] = chave.split('-')
      return {
        label: `${MESES_CURTOS[Number(mes) - 1]}/${ano.slice(2)}`,
        valor: porMes.get(chave),
      }
    })
  }, [testesFiltrados])

  const dadosOcupacao = useMemo(() => {
    const itens = []
    for (const linha of inventarioTipo) {
      if (linha.kind !== 'rack_equipment' || !linha.sala) continue
      const resumo =
        linha.equipamento.tipo === 'switch'
          ? resumoPortas(linha.equipamento, linha.sala.falhas || [])
          : resumoPortasLinha(linha.equipamento, linha.sala.falhas || [])
      itens.push({
        label: linha.nome,
        valores: {
          livres: resumo.livres,
          emUso: resumo.emUso,
          comFalha: resumo.comFalha,
        },
      })
    }
    return itens
  }, [inventarioTipo])

  const dadosStatusEquip = useMemo(() => {
    const contagem = { operacao: 0, manutencao: 0, falha: 0 }
    for (const linha of inventarioTipo) {
      if (linha.status) contagem[linha.status]++
    }
    return statusConfig.map((status) => ({
      label: status.nome,
      valor: contagem[status.id] || 0,
      cor: status.cor,
    }))
  }, [inventarioTipo, statusConfig])

  // ---------- Listas ----------

  const ultimasAtividades = useMemo(() => {
    const atividades = []
    for (const teste of testesFiltrados.slice(0, 60)) {
      atividades.push({
        quando: teste.dataHora,
        icone: teste.resultado === 'PASS' ? 'pass' : 'fail',
        texto: `Teste ${teste.resultado} — ${teste.snapshot?.pontoIdentificacao || 'ponto'}${
          teste.tecnico ? ` (técnico: ${teste.tecnico})` : ''
        }`,
        local: teste.snapshot?.salaNome || '',
      })
    }
    for (const sala of salasFiltradas) {
      for (const falha of sala.falhas || []) {
        const data = falha.dataIdentificacao || ''
        if (de && data < de) continue
        if (ate && data > ate) continue
        atividades.push({
          quando: data ? `${data}T12:00:00` : '',
          icone: 'falha',
          texto: `Falha ${falha.gravidade || 'baixa'} — ${falha.alvo || sala.nome}`,
          local: sala.nome,
        })
      }
      if (sala.criadoEm) {
        const data = sala.criadoEm.slice(0, 10)
        if ((!de || data >= de) && (!ate || data <= ate)) {
          atividades.push({
            quando: sala.criadoEm,
            icone: 'sala',
            texto: `Sala “${sala.nome}” criada`,
            local: sala.predio || '',
          })
        }
      }
    }
    return atividades
      .sort((a, b) => (b.quando || '').localeCompare(a.quando || ''))
      .slice(0, 10)
  }, [testesFiltrados, salasFiltradas, de, ate])

  const pontosAtencao = useMemo(() => {
    const lista = []
    for (const sala of salasFiltradas) {
      for (const ponto of sala.pontos || []) {
        const ultimo = ultimoPorPonto.get(ponto.id)
        if (ultimo && ultimo.resultado === 'PASS') continue
        lista.push({
          ponto,
          sala,
          motivo: ultimo ? 'Último teste FAIL' : 'Sem teste de certificação',
          fail: Boolean(ultimo),
        })
      }
    }
    return lista
      .sort((a, b) => {
        if (a.fail !== b.fail) return a.fail ? -1 : 1
        return a.ponto.identificacao.localeCompare(b.ponto.identificacao, 'pt-BR')
      })
      .slice(0, 8)
  }, [salasFiltradas, ultimoPorPonto])

  // ---------- Impressão (PDF via navegador) ----------

  useEffect(() => {
    if (!imprimindo) return
    const timer = window.setTimeout(() => {
      window.print()
      setImprimindo(null)
    }, 120)
    function aposImprimir() {
      setImprimindo(null)
    }
    window.addEventListener('afterprint', aposImprimir)
    return () => {
      window.clearTimeout(timer)
      window.removeEventListener('afterprint', aposImprimir)
    }
  }, [imprimindo])

  const descricaoFiltros = [
    de || ate
      ? `período ${de ? formatarDataInput(de) : 'início'} a ${ate ? formatarDataInput(ate) : 'hoje'}`
      : 'todo o período',
    salaFiltro !== 'todos'
      ? `sala ${(salas.find((sala) => sala.id === salaFiltro) || {}).nome || ''}`
      : 'todas as salas',
    `tipo: ${(TIPOS_FILTRO.find((tipo) => tipo.id === tipoFiltro) || {}).label.toLowerCase()}`,
  ].join(' · ')

  function backup() {
    baixarJSON('nexredes-backup.json', {
      versao: 1,
      exportadoEm: new Date().toISOString(),
      salas,
      testes,
      modelos: listarModelos(),
      config: obterConfig(),
    })
    onMostrarToast?.('Backup completo baixado (JSON)')
  }

  const temFalhaGrafico = dadosFalhasPorSala.some((item) => item.valor > 0)

  return (
    <main className="dash-main relatorios">
      <div className="main-header">
        <div>
          <h1>Relatórios</h1>
          <p>Indicadores, gráficos e exportação da sua rede.</p>
        </div>
        <button
          type="button"
          className="btn-new"
          onClick={() => setModalExportar(true)}
        >
          <DownloadIcon size={16} />
          Exportar
        </button>
      </div>

      {salas.length === 0 ? (
        <div className="empty-state">
          <SearchIcon size={28} />
          <p>
            Nenhuma sala cadastrada ainda. Crie salas, racks e pontos para ver
            os relatórios aqui.
          </p>
        </div>
      ) : (
        <>
          <div className="redes-filtros">
            <label className="rel-filtro-campo">
              <span>Período</span>
              <div className="rel-filtro-periodo">
                <input
                  type="date"
                  className="redes-select redes-data"
                  aria-label="A partir de"
                  value={de}
                  onChange={(evento) => setDe(evento.target.value)}
                />
                <span aria-hidden="true">até</span>
                <input
                  type="date"
                  className="redes-select redes-data"
                  aria-label="Até"
                  value={ate}
                  onChange={(evento) => setAte(evento.target.value)}
                />
              </div>
            </label>
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
              aria-label="Filtrar por tipo de equipamento"
              value={tipoFiltro}
              onChange={(evento) => setTipoFiltro(evento.target.value)}
            >
              {TIPOS_FILTRO.map((tipo) => (
                <option key={tipo.id} value={tipo.id}>
                  {tipo.label}
                </option>
              ))}
            </select>
          </div>

          {/* Indicadores */}
          <div className="rel-indicadores">
            <div className="rel-indicador">
              <BuildingIcon size={18} />
              <div>
                <strong>{indicadores.salas}</strong>
                <span>Salas</span>
              </div>
            </div>
            <div className="rel-indicador">
              <ServerIcon size={18} />
              <div>
                <strong>{indicadores.equipamentos}</strong>
                <span>Equipamentos</span>
              </div>
            </div>
            <div className="rel-indicador">
              <NetworkIcon size={18} />
              <div>
                <strong>{indicadores.pontos}</strong>
                <span>Pontos de rede</span>
              </div>
            </div>
            <div className="rel-indicador">
              <MonitorIcon size={18} />
              <div>
                <strong>{indicadores.maquinas}</strong>
                <span>Máquinas</span>
              </div>
            </div>
            <div className="rel-indicador">
              <AlertTriangleIcon size={18} />
              <div>
                <strong>{indicadores.falhasAbertas}</strong>
                <span>Falhas abertas</span>
              </div>
            </div>
            <div className="rel-indicador destaque">
              <CheckCircleIcon size={18} />
              <div>
                <strong>{indicadores.percentualAprovacao}%</strong>
                <span>Pontos aprovados</span>
              </div>
            </div>
          </div>

          {/* Gráficos */}
          <div className="rel-grade">
            <section className="rel-card">
              <h2>Pontos PASS × FAIL</h2>
              {dadosRosca.length === 0 ? (
                <GraficoVazio texto="Nenhum teste registrado nos filtros atuais." />
              ) : (
                <GraficoRosca
                  dados={dadosRosca}
                  textoCentral={`${indicadores.percentualAprovacao}%`}
                  subTexto="aprovados"
                />
              )}
            </section>

            <section className="rel-card">
              <h2>Equipamentos por status</h2>
              <GraficoBarras dados={dadosStatusEquip} />
            </section>

            <section className="rel-card">
              <h2>Falhas por sala (ativas)</h2>
              {temFalhaGrafico ? (
                <GraficoBarras dados={dadosFalhasPorSala} />
              ) : (
                <GraficoVazio texto="Nenhuma falha ativa. Tudo sob controle!" />
              )}
            </section>

            <section className="rel-card">
              <h2>Testes ao longo do tempo</h2>
              <GraficoLinha pontos={dadosTestesTempo} />
            </section>

            <section className="rel-card rel-card-largo">
              <h2>Ocupação de portas por switch/patch panel</h2>
              <BarrasEmpilhadas
                chaves={[
                  { id: 'livres', label: 'Livres', cor: '#d1d5db' },
                  { id: 'emUso', label: 'Em uso', cor: '#2563eb' },
                  { id: 'comFalha', label: 'Com falha', cor: '#dc2626' },
                ]}
                itens={dadosOcupacao}
              />
            </section>
          </div>

          {/* Listas */}
          <div className="rel-listas">
            <section className="rel-card">
              <h2>Últimas atividades</h2>
              {ultimasAtividades.length === 0 ? (
                <GraficoVazio texto="Nenhuma atividade no período." />
              ) : (
                <ul className="rel-atividades">
                  {ultimasAtividades.map((atividade, indice) => (
                    <li key={indice}>
                      <span
                        className={`rel-atividade-icone ${atividade.icone}`}
                        aria-hidden="true"
                      >
                        {atividade.icone === 'pass' ? (
                          <CheckCircleIcon size={14} />
                        ) : atividade.icone === 'fail' ? (
                          <ClipboardCheckIcon size={14} />
                        ) : atividade.icone === 'falha' ? (
                          <AlertTriangleIcon size={14} />
                        ) : (
                          <BuildingIcon size={14} />
                        )}
                      </span>
                      <div>
                        <p>{atividade.texto}</p>
                        <span>
                          {atividade.local ? `${atividade.local} · ` : ''}
                          {formatarDataRelativa(atividade.quando)}
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="rel-card">
              <h2>Pontos que precisam de atenção</h2>
              {pontosAtencao.length === 0 ? (
                <GraficoVazio texto="Todos os pontos estão aprovados. Excelente!" />
              ) : (
                <ul className="rel-atencao">
                  {pontosAtencao.map(({ ponto, sala, motivo, fail }) => (
                    <li key={ponto.id}>
                      <div>
                        <p className="rel-atencao-ponto">{ponto.identificacao}</p>
                        <span>
                          {sala.nome} · {motivo}
                        </span>
                      </div>
                      <button
                        type="button"
                        className={`redes-filtro-btn${fail ? ' perigo' : ''}`}
                        onClick={() =>
                          navegar(`/redes/pontos/${encodeURIComponent(ponto.id)}`)
                        }
                      >
                        Ver ponto
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        </>
      )}

      {modalExportar && (
        <ModalExportar
          salas={salas}
          testes={testes}
          onFechar={() => setModalExportar(false)}
          onMostrarToast={onMostrarToast}
          onImprimirRelatorio={() => {
            setModalExportar(false)
            setImprimindo('relatorio')
          }}
          onImprimirDados={(planilhas) => {
            setModalExportar(false)
            setPlanilhasImpressao(planilhas)
            setImprimindo('dados')
          }}
          onBackup={backup}
        />
      )}

      {/* Versões de impressão (PDF) — visíveis apenas na janela de impressão */}
      {imprimindo === 'relatorio' && (
        <div className="relatorio-impressao">
          <header>
            <h1>NexRedes — Relatório do dashboard</h1>
            <p>
              Gerado em {formatarDataHora(new Date().toISOString())} ·{' '}
              {descricaoFiltros}
            </p>
          </header>
          <section>
            <h2>Indicadores</h2>
            <ul className="impressao-indicadores">
              <li><span>Salas</span><strong>{indicadores.salas}</strong></li>
              <li><span>Equipamentos</span><strong>{indicadores.equipamentos}</strong></li>
              <li><span>Pontos de rede</span><strong>{indicadores.pontos}</strong></li>
              <li><span>Máquinas</span><strong>{indicadores.maquinas}</strong></li>
              <li><span>Falhas abertas</span><strong>{indicadores.falhasAbertas}</strong></li>
              <li><span>Pontos aprovados</span><strong>{indicadores.percentualAprovacao}%</strong></li>
            </ul>
          </section>
          <section>
            <h2>Pontos PASS × FAIL</h2>
            {dadosRosca.length === 0 ? (
              <p>Nenhum teste registrado.</p>
            ) : (
              <GraficoRosca
                dados={dadosRosca}
                textoCentral={`${indicadores.percentualAprovacao}%`}
                subTexto="aprovados"
              />
            )}
          </section>
          <section>
            <h2>Equipamentos por status</h2>
            <GraficoBarras dados={dadosStatusEquip} altura={160} />
          </section>
          <section>
            <h2>Falhas por sala (ativas)</h2>
            {temFalhaGrafico ? (
              <GraficoBarras dados={dadosFalhasPorSala} altura={160} />
            ) : (
              <p>Nenhuma falha ativa.</p>
            )}
          </section>
          <section>
            <h2>Testes ao longo do tempo</h2>
            <GraficoLinha pontos={dadosTestesTempo} altura={180} />
          </section>
          <section>
            <h2>Ocupação de portas por switch/patch panel</h2>
            <BarrasEmpilhadas
              chaves={[
                { id: 'livres', label: 'Livres', cor: '#d1d5db' },
                { id: 'emUso', label: 'Em uso', cor: '#2563eb' },
                { id: 'comFalha', label: 'Com falha', cor: '#dc2626' },
              ]}
              itens={dadosOcupacao}
            />
          </section>
          <section>
            <h2>Pontos que precisam de atenção</h2>
            {pontosAtencao.length === 0 ? (
              <p>Nenhum ponto pendente.</p>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>Ponto</th>
                    <th>Sala</th>
                    <th>Motivo</th>
                  </tr>
                </thead>
                <tbody>
                  {pontosAtencao.map(({ ponto, sala, motivo }) => (
                    <tr key={ponto.id}>
                      <td>{ponto.identificacao}</td>
                      <td>{sala.nome}</td>
                      <td>{motivo}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>
        </div>
      )}

      {imprimindo === 'dados' && (
        <div className="relatorio-impressao">
          <header>
            <h1>NexRedes — Exportação de dados</h1>
            <p>
              Gerado em {formatarDataHora(new Date().toISOString())} ·{' '}
              {descricaoFiltros}
            </p>
          </header>
          {planilhasImpressao.map((planilha) => (
            <section key={planilha.id}>
              <h2>{planilha.nome} ({planilha.linhas.length})</h2>
              {planilha.linhas.length === 0 ? (
                <p>Nenhum registro.</p>
              ) : (
                <table>
                  <thead>
                    <tr>
                      {planilha.cabecalho.map((coluna) => (
                        <th key={coluna}>{coluna}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {planilha.linhas.slice(0, 150).map((linha, indice) => (
                      <tr key={indice}>
                        {linha.map((celula, i) => (
                          <td key={i}>{celula === '' ? '—' : String(celula)}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
              {planilha.linhas.length > 150 && (
                <p className="impressao-nota">
                  … e mais {planilha.linhas.length - 150} linha(s) no arquivo
                  exportado.
                </p>
              )}
            </section>
          ))}
        </div>
      )}
    </main>
  )
}
