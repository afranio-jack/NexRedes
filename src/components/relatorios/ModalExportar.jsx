// Modal "Exportar" da tela Relatórios: escolha do que exportar (Salas,
// Equipamentos, Pontos de rede, Testes de certificação, Etiquetas,
// Falhas/manutenção ou Tudo), formato (CSV, Excel .xlsx ou PDF via
// impressão), período e sala opcionais, pré-visualização e botão Baixar.
// Também abriga o atalho "Exportar relatório do dashboard em PDF" e o
// "Backup completo (JSON)".

import { useMemo, useState } from 'react'
import { XIcon, DownloadIcon, PrinterIcon, DatabaseIcon } from '../icons'
import {
  datasetSalas,
  datasetEquipamentos,
  datasetPontos,
  datasetTestes,
  datasetFalhas,
  datasetEtiquetas,
  baixarXLSX,
} from '../../utils/exportacao'
import { obterConfig } from '../../utils/etiquetas'
import '../sala/SalaModal.css'
import '../redes/redes.css'
import '../rack/rack.css'
import './relatorios.css'

const ALVOS = [
  { id: 'salas', label: 'Salas' },
  { id: 'equipamentos', label: 'Equipamentos' },
  { id: 'pontos', label: 'Pontos de rede' },
  { id: 'testes', label: 'Testes de certificação' },
  { id: 'etiquetas', label: 'Etiquetas' },
  { id: 'falhas', label: 'Falhas/manutenção' },
]

const FORMATOS = [
  { id: 'csv', label: 'CSV' },
  { id: 'xlsx', label: 'Excel (.xlsx)' },
  { id: 'pdf', label: 'PDF' },
]

export default function ModalExportar({
  salas,
  testes,
  onFechar,
  onMostrarToast,
  onImprimirRelatorio,
  onImprimirDados,
  onBackup,
}) {
  const statusConfig = obterConfig().rede.statusEquipamento || []
  const [alvos, setAlvos] = useState(() => ({
    salas: true,
    equipamentos: true,
    pontos: true,
    testes: true,
    etiquetas: false,
    falhas: false,
  }))
  const [formato, setFormato] = useState('xlsx')
  const [de, setDe] = useState('')
  const [ate, setAte] = useState('')
  const [salaFiltro, setSalaFiltro] = useState('todos')

  function alternarAlvo(id) {
    setAlvos((atual) => ({ ...atual, [id]: !atual[id] }))
  }

  const salasFiltradas = useMemo(
    () =>
      salaFiltro === 'todos'
        ? salas
        : salas.filter((sala) => sala.id === salaFiltro),
    [salas, salaFiltro]
  )

  // O período vale para os conjuntos datados (testes e falhas)
  const testesFiltrados = useMemo(() => {
    return testes.filter((teste) => {
      const data = (teste.dataHora || '').slice(0, 10)
      if (de && data < de) return false
      if (ate && data > ate) return false
      if (salaFiltro !== 'todos') {
        const salaId = teste.snapshot?.salaId || null
        if (salaId !== salaFiltro) return false
      }
      return true
    })
  }, [testes, de, ate, salaFiltro])

  const datasets = useMemo(() => {
    const salasComFalhasFiltradas = salasFiltradas.map((sala) => ({
      ...sala,
      falhas: (sala.falhas || []).filter((falha) => {
        const data = falha.dataIdentificacao || ''
        if (de && data < de) return false
        if (ate && data > ate) return false
        return true
      }),
    }))
    return {
      salas: datasetSalas(salasFiltradas),
      equipamentos: datasetEquipamentos(salasFiltradas, statusConfig),
      pontos: datasetPontos(salasFiltradas, testes),
      testes: datasetTestes(testesFiltrados),
      etiquetas: datasetEtiquetas(),
      falhas: datasetFalhas(salasComFalhasFiltradas),
    }
  }, [salasFiltradas, testes, testesFiltrados, de, ate, statusConfig])

  const selecionados = ALVOS.filter((alvo) => alvos[alvo.id])
  const planilhas = selecionados.map((alvo) => ({
    id: alvo.id,
    label: alvo.label,
    ...datasets[alvo.id],
  }))
  const primeira = planilhas[0] || null

  function baixar() {
    if (planilhas.length === 0) return
    if (formato === 'pdf') {
      onImprimirDados(planilhas)
      return
    }
    if (formato === 'xlsx') {
      baixarXLSX(
        'nexredes-exportacao.xlsx',
        planilhas.map((planilha) => ({
          nome: planilha.nome,
          cabecalho: planilha.cabecalho,
          linhas: planilha.linhas,
        }))
      )
      onMostrarToast?.(
        `${planilhas.length} aba(s) exportada(s) para planilha Excel`
      )
      return
    }
    // CSV: um arquivo só, com uma seção por conjunto de dados
    const secoes = []
    for (const planilha of planilhas) {
      secoes.push([planilha.nome.toUpperCase()].map((c) => `"${c}"`).join(';'))
      secoes.push(planilha.cabecalho.map((c) => `"${c}"`).join(';'))
      for (const linha of planilha.linhas) {
        secoes.push(
          linha.map((c) => `"${String(c ?? '').replace(/"/g, '""')}"`).join(';')
        )
      }
      secoes.push('')
    }
    const conteudo = ['\ufeff' + secoes.join('\r\n')]
    const blob = new Blob(conteudo, { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'nexredes-exportacao.csv'
    document.body.appendChild(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(url)
    onMostrarToast?.(
      `${planilhas.reduce((soma, planilha) => soma + planilha.linhas.length, 0)} linha(s) exportada(s) para CSV`
    )
  }

  return (
    <div
      className="modal-overlay"
      onMouseDown={(evento) => {
        if (evento.target === evento.currentTarget) onFechar()
      }}
    >
      <div
        className="modal-sala modal-exportar"
        role="dialog"
        aria-modal="true"
        aria-labelledby="titulo-modal-exportar"
      >
        <header className="modal-cabecalho">
          <div>
            <h2 id="titulo-modal-exportar">Exportar dados</h2>
            <p>
              Escolha o que exportar, o formato e os filtros opcionais.
            </p>
          </div>
          <button
            type="button"
            className="btn-fechar"
            onClick={onFechar}
            aria-label="Fechar"
          >
            <XIcon size={20} />
          </button>
        </header>

        <div className="modal-corpo exportar-corpo">
          <section className="modal-secao">
            <h3 className="secao-titulo">O que exportar</h3>
            <div className="exportar-alvos">
              {ALVOS.map((alvo) => (
                <label key={alvo.id} className="redes-check">
                  <input
                    type="checkbox"
                    checked={alvos[alvo.id]}
                    onChange={() => alternarAlvo(alvo.id)}
                  />
                  {alvo.label}
                </label>
              ))}
              <label className="redes-check destaque">
                <input
                  type="checkbox"
                  checked={ALVOS.every((alvo) => alvos[alvo.id])}
                  onChange={(evento) => {
                    const marcado = evento.target.checked
                    setAlvos((atual) => {
                      const novo = { ...atual }
                      for (const alvo of ALVOS) novo[alvo.id] = marcado
                      return novo
                    })
                  }}
                />
                Tudo
              </label>
            </div>
          </section>

          <section className="modal-secao">
            <h3 className="secao-titulo">Formato</h3>
            <div className="etiquetas-orientacao" role="radiogroup" aria-label="Formato">
              {FORMATOS.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className={formato === item.id ? 'ativo' : ''}
                  aria-pressed={formato === item.id}
                  onClick={() => setFormato(item.id)}
                >
                  {item.label}
                </button>
              ))}
            </div>
            {formato === 'pdf' && (
              <p className="painel-nota">
                O PDF usa a impressão do navegador — escolha “Salvar como
                PDF” como destino na janela que abrir.
              </p>
            )}
          </section>

          <section className="modal-secao">
            <h3 className="secao-titulo">Período e sala (opcionais)</h3>
            <div className="secao-grade">
              <label className="campo">
                <span>De</span>
                <input
                  type="date"
                  className="campo-input"
                  value={de}
                  onChange={(evento) => setDe(evento.target.value)}
                  aria-label="Período a partir de"
                />
              </label>
              <label className="campo">
                <span>Até</span>
                <input
                  type="date"
                  className="campo-input"
                  value={ate}
                  onChange={(evento) => setAte(evento.target.value)}
                  aria-label="Período até"
                />
              </label>
              <label className="campo">
                <span>Sala</span>
                <select
                  className="campo-input"
                  value={salaFiltro}
                  onChange={(evento) => setSalaFiltro(evento.target.value)}
                  aria-label="Filtrar sala"
                >
                  <option value="todos">Todas as salas</option>
                  {salas.map((sala) => (
                    <option key={sala.id} value={sala.id}>
                      {sala.nome}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <p className="painel-nota">
              O período se aplica aos conjuntos datados (testes e falhas).
            </p>
          </section>

          <section className="modal-secao">
            <h3 className="secao-titulo">Pré-visualização</h3>
            {planilhas.length === 0 ? (
              <p className="lista-vazia">Selecione ao menos um item acima.</p>
            ) : (
              <>
                <ul className="exportar-previa-resumo">
                  {planilhas.map((planilha) => (
                    <li key={planilha.id}>
                      {planilha.label} — {planilha.linhas.length} linha(s)
                    </li>
                  ))}
                </ul>
                {primeira && primeira.linhas.length > 0 && (
                  <div className="redes-tabela-wrap exportar-previa-tabela">
                    <table className="redes-tabela">
                      <thead>
                        <tr>
                          {primeira.cabecalho.map((coluna) => (
                            <th key={coluna} scope="col">
                              {coluna}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {primeira.linhas.slice(0, 5).map((linha, indice) => (
                          <tr key={indice}>
                            {linha.map((celula, i) => (
                              <td key={i}>{celula === '' ? '—' : String(celula)}</td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            )}
          </section>

          <footer className="modal-rodape exportar-rodape">
            <div className="exportar-extras">
              <button
                type="button"
                className="redes-filtro-btn"
                onClick={() => {
                  onImprimirRelatorio()
                }}
              >
                <PrinterIcon size={15} />
                Exportar relatório do dashboard em PDF
              </button>
              <button
                type="button"
                className="redes-filtro-btn"
                onClick={() => {
                  onBackup()
                }}
              >
                <DatabaseIcon size={15} />
                Backup completo (JSON)
              </button>
            </div>
            <div className="exportar-botoes">
              <button
                type="button"
                className="btn-modal secundario"
                onClick={onFechar}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="btn-modal primario"
                onClick={baixar}
                disabled={planilhas.length === 0}
              >
                <DownloadIcon size={15} />
                Baixar
              </button>
            </div>
          </footer>
        </div>
      </div>
    </div>
  )
}
