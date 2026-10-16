// Sub-aba "Etiquetas" (gerador de etiquetas): duas colunas — configurações
// à esquerda, pré-visualização ao vivo à direita (folha A4 paginada, com as
// etiquetas nas dimensões reais do modelo em mm). "Imprimir" e "Baixar PDF"
// abrem a impressão do navegador com CSS dedicado (sem sidebar/topbar); o
// PDF usa o destino "Salvar como PDF" da própria janela de impressão.

import { useEffect, useMemo, useState } from 'react'
import {
  PrinterIcon,
  DownloadIcon,
  TagIcon,
  QrCodeIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from '../icons'
import {
  listarModelos,
  gradeDoModelo,
  obterConfig,
} from '../../utils/etiquetas'
import { listarTodosPontos } from '../../utils/pontos'
import { descricaoVinculo } from '../../utils/racks'

const TIPOS_ETIQUETA = [
  { id: 'pontos', label: 'Pontos de rede' },
  { id: 'portas_patch_panel', label: 'Portas de patch panel' },
  { id: 'portas_switch', label: 'Portas de switch' },
  { id: 'racks', label: 'Racks' },
]

const TAMANHOS_FONTE = [7, 8, 9, 10, 11, 12, 14]

// Uma folha A4 com as etiquetas da página recebida (usada na prévia e na
// impressão). A margem vem da configuração (Configurações → Etiquetas) e o
// logo da organização entra quando habilitado lá.
function FolhaEtiquetas({
  etiquetasDaPagina,
  modelo,
  orientacao,
  tamanhoFonte,
  margens = 1,
  logo = '',
}) {
  if (!modelo) return null
  return (
    <div className="etiquetas-folha">
      {etiquetasDaPagina.map((etiqueta, indice) => (
        <div
          key={indice}
          className={`etiqueta${
            orientacao === 'vertical' ? ' etiqueta-vertical' : ''
          }`}
          style={{
            width: `${modelo.largura}mm`,
            height: `${modelo.altura}mm`,
            fontSize: `${tamanhoFonte}px`,
            padding: `${margens}mm ${margens * 1.5}mm`,
          }}
        >
          {etiqueta.linhas.length === 0 ? (
            <span className="etiqueta-linha vazio-etiqueta">—</span>
          ) : (
            <>
              {logo && (
                <img src={logo} alt="" className="etiqueta-logo" />
              )}
              {etiqueta.linhas.map((linha, i) => (
                <span
                  key={i}
                  className={`etiqueta-linha${linha.destaque ? ' destaque' : ''}`}
                >
                  {linha.texto}
                </span>
              ))}
            </>
          )}
        </div>
      ))}
    </div>
  )
}

export default function Etiquetas({ salas, preset, onPresetConsumido }) {
  // Padrões vindos de Configurações (modelo padrão, conteúdo, fonte, margens
  // e logo da organização) — o usuário ainda ajusta tudo aqui na hora de gerar
  const [config] = useState(() => obterConfig())
  const [modelos] = useState(() => listarModelos())
  const [tipo, setTipo] = useState('pontos')
  const [salaId, setSalaId] = useState('')
  const [rackId, setRackId] = useState('')
  const [equipamentoId, setEquipamentoId] = useState('')
  const [intervaloDe, setIntervaloDe] = useState('')
  const [intervaloAte, setIntervaloAte] = useState('')
  const [selecionados, setSelecionados] = useState(() => new Set())
  const [modeloId, setModeloId] = useState(() => {
    const idPadrao = config.etiquetas.modeloPadraoId
    const lista = listarModelos()
    return idPadrao && lista.some((item) => item.id === idPadrao)
      ? idPadrao
      : lista[0]?.id || ''
  })
  const [conteudo, setConteudo] = useState(() => ({
    identificacao: config.etiquetas.conteudo.nomePonto,
    sala: true,
    destino: config.etiquetas.conteudo.switchPorta,
    patchPanel: config.etiquetas.conteudo.patchPanel,
    categoriaCabo: false,
    qr: false,
    logo: config.etiquetas.conteudo.logo,
  }))
  const [numeracao, setNumeracao] = useState(() => ({
    ativa: false,
    prefixo: config.prefixoPadrao || 'CO-P',
    inicial: '1',
    digitos: String(config.nomenclatura.digitos || 2),
  }))
  const [orientacao, setOrientacao] = useState('horizontal')
  const [tamanhoFonte, setTamanhoFonte] = useState(
    String(config.etiquetas.tamanhoFonte || 9)
  )
  const [pagina, setPagina] = useState(0)
  const margens = Number(config.etiquetas.margens) || 1
  const logoHabilitado = conteudo.logo
  const logo = logoHabilitado ? config.organizacao.logo || '' : ''

  const salaAtual = salas.find((sala) => sala.id === salaId) || null
  const racksDaSala = salaAtual?.racks || []
  const rackAtual = racksDaSala.find((rack) => rack.id === rackId) || null
  const equipamentosDoRack =
    (rackAtual?.equipamentos || []).filter(
      (equipamento) =>
        tipo === 'portas_patch_panel'
          ? equipamento.tipo === 'patch_panel'
          : equipamento.tipo === 'switch'
    ) || []
  const equipamentoAtual =
    equipamentosDoRack.find((item) => item.id === equipamentoId) || null

  // ---------- Candidatos (itens etiquetáveis conforme o tipo/filtros) ----------

  const candidatos = useMemo(() => {
    if (tipo === 'pontos') {
      return listarTodosPontos(salas)
        .filter((ponto) => !salaId || ponto.salaId === salaId)
        .map((ponto) => {
          const switchNome = (() => {
            for (const rack of ponto.sala.racks || []) {
              const achado = (rack.equipamentos || []).find(
                (equipamento) => equipamento.id === ponto.switchId
              )
              if (achado) return `${achado.nome} / porta ${ponto.portaSwitch}`
            }
            return ''
          })()
          const patchPanelTexto = (() => {
            for (const rack of ponto.sala.racks || []) {
              const achado = (rack.equipamentos || []).find(
                (equipamento) => equipamento.id === ponto.patchPanelId
              )
              if (achado) return `${achado.nome} / porta ${ponto.portaPatchPanel}`
            }
            return ''
          })()
          return {
            chave: ponto.id,
            titulo: ponto.identificacao,
            sala: ponto.sala.nome,
            destino: switchNome,
            patchPanelTexto,
            categoria: ponto.categoriaCabo || '',
          }
        })
    }
    if (tipo === 'racks') {
      const lista = []
      for (const sala of salas) {
        if (salaId && sala.id !== salaId) continue
        for (const rack of sala.racks || []) {
          lista.push({
            chave: rack.id,
            titulo: rack.nome,
            sala: sala.nome,
            destino: rack.localizacao || '',
            patchPanelTexto: '',
            categoria: '',
          })
        }
      }
      return lista
    }
    // Portas de patch panel / switch
    if (!equipamentoAtual || !salaAtual) return []
    const portas = (equipamentoAtual.portas || [])
      .filter((porta) =>
        tipo === 'portas_switch' ? !porta.sfp : porta.lado === 'frente'
      )
      .slice()
      .sort((a, b) => a.numero - b.numero)
    return portas.map((porta) => {
      let destino = ''
      let categoria = porta.categoriaCabo || ''
      if (tipo === 'portas_patch_panel') {
        const verso = (equipamentoAtual.portas || []).find(
          (item) => item.lado === 'verso' && item.numero === porta.numero
        )
        const pontoId = verso?.pontoRede?.pontoId
        const ponto = pontoId
          ? (salaAtual.pontos || []).find((item) => item.id === pontoId)
          : null
        if (ponto) destino = ponto.identificacao
        else if (porta.vinculo) destino = descricaoVinculo(salaAtual, porta)
        else if (verso?.pontoRede?.identificacao)
          destino = verso.pontoRede.identificacao
        if (verso?.categoriaCabo) categoria = verso.categoriaCabo
      } else {
        const pontoId = porta.pontoRede?.pontoId
        const ponto = pontoId
          ? (salaAtual.pontos || []).find((item) => item.id === pontoId)
          : null
        if (ponto) destino = ponto.identificacao
        else if (porta.vinculo) destino = descricaoVinculo(salaAtual, porta)
        else if (porta.uplink?.ativo) destino = 'Uplink'
      }
      return {
        chave: porta.id,
        titulo: `${equipamentoAtual.nome} / porta ${porta.numero}`,
        sala: salaAtual.nome,
        destino,
        patchPanelTexto: '',
        categoria,
      }
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tipo, salas, salaId, rackId, equipamentoId])

  const noIntervalo = useMemo(() => {
    const de = Math.max(1, Number(intervaloDe) || 1)
    const ate =
      intervaloAte === '' ? candidatos.length : Number(intervaloAte) || 0
    return candidatos.filter(
      (_, indice) => indice + 1 >= de && indice + 1 <= Math.max(ate, de - 1)
    )
  }, [candidatos, intervaloDe, intervaloAte])

  // Remove da seleção chaves que saíram da lista de candidatos
  useEffect(() => {
    setSelecionados((atual) => {
      const validos = new Set(
        [...atual].filter((chave) =>
          candidatos.some((candidato) => candidato.chave === chave)
        )
      )
      return validos.size === atual.size ? atual : validos
    })
  }, [candidatos])

  // Pré-seleção vinda das outras telas (botão "Gerar etiqueta" das páginas
  // de equipamento ou da página do ponto)
  useEffect(() => {
    if (!preset) return
    setPagina(0)
    setIntervaloDe('')
    setIntervaloAte('')
    if (preset.tipo === 'pontos') {
      setTipo('pontos')
      setSalaId('')
      setRackId('')
      setEquipamentoId('')
      // Pré-seleção de um ponto (página do ponto) ou de vários (lote da lista)
      const ids = preset.pontoIds || (preset.pontoId ? [preset.pontoId] : [])
      setSelecionados(new Set(ids))
    } else {
      setTipo(preset.tipo)
      const sala = salas.find((item) => item.id === preset.salaId) || null
      let equipamento = null
      if (sala) {
        for (const rack of sala.racks || []) {
          const achado = (rack.equipamentos || []).find(
            (item) => item.id === preset.equipamentoId
          )
          if (achado) {
            equipamento = achado
            break
          }
        }
      }
      setSalaId(preset.salaId || '')
      setRackId(equipamento?.rackId || '')
      setEquipamentoId(preset.equipamentoId || '')
      // Todas as portas do equipamento marcadas
      const chaves = new Set()
      if (equipamento) {
        for (const porta of equipamento.portas || []) {
          if (
            preset.tipo === 'portas_switch'
              ? !porta.sfp
              : porta.lado === 'frente'
          ) {
            chaves.add(porta.id)
          }
        }
      }
      setSelecionados(chaves)
    }
    onPresetConsumido?.()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preset])

  // ---------- Etiquetas finais ----------

  const modelo =
    modelos.find((item) => item.id === modeloId) || modelos[0] || null
  const grade = gradeDoModelo(modelo)

  const etiquetas = useMemo(() => {
    return candidatos
      .filter((candidato) => selecionados.has(candidato.chave))
      .map((item, indice) => {
        const linhas = []
        if (conteudo.identificacao) {
          const texto = numeracao.ativa
            ? `${numeracao.prefixo}${String(
                (Number(numeracao.inicial) || 1) + indice
              ).padStart(Number(numeracao.digitos) || 1, '0')}`
            : item.titulo
          linhas.push({ texto, destaque: true })
        }
        if (conteudo.patchPanel && item.patchPanelTexto) {
          linhas.push({ texto: item.patchPanelTexto })
        }
        if (conteudo.sala && item.sala) linhas.push({ texto: item.sala })
        if (conteudo.destino && item.destino) {
          linhas.push({ texto: item.destino })
        }
        if (conteudo.categoriaCabo && item.categoria) {
          linhas.push({ texto: item.categoria })
        }
        return { linhas }
      })
  }, [candidatos, selecionados, conteudo, numeracao])

  const paginas = useMemo(() => {
    const chunks = []
    for (let i = 0; i < etiquetas.length; i += grade.porPagina) {
      chunks.push(etiquetas.slice(i, i + grade.porPagina))
    }
    return chunks
  }, [etiquetas, grade.porPagina])

  useEffect(() => {
    setPagina((atual) => Math.min(atual, Math.max(0, paginas.length - 1)))
  }, [paginas.length])

  const paginaExibida = Math.min(
    Math.max(pagina, 0),
    Math.max(0, paginas.length - 1)
  )

  // ---------- Ações ----------

  function trocarTipo(novoTipo) {
    setTipo(novoTipo)
    setRackId('')
    setEquipamentoId('')
    setSelecionados(new Set())
    setIntervaloDe('')
    setIntervaloAte('')
  }

  function trocarSala(novaSala) {
    setSalaId(novaSala)
    setRackId('')
    setEquipamentoId('')
    setSelecionados(new Set())
  }

  function trocarRack(novoRack) {
    setRackId(novoRack)
    setEquipamentoId('')
    setSelecionados(new Set())
  }

  function alternarItem(chave) {
    setSelecionados((atual) => {
      const novo = new Set(atual)
      if (novo.has(chave)) novo.delete(chave)
      else novo.add(chave)
      return novo
    })
  }

  function selecionarTodos() {
    setSelecionados(new Set(noIntervalo.map((item) => item.chave)))
  }

  function limparSelecao() {
    setSelecionados(new Set())
  }

  function imprimir() {
    window.print()
  }

  const mostrarSelecaoPortas = tipo === 'portas_patch_panel' || tipo === 'portas_switch'
  const semEquipamento = mostrarSelecaoPortas && !equipamentoAtual

  return (
    <div className="etiquetas-gerador">
      <section className="etiquetas-config">
        <div className="etiquetas-bloco">
          <h3>
            <TagIcon size={16} />
            O que etiquetar
          </h3>
          <select
            className="redes-select etiquetas-select-tipo"
            aria-label="O que etiquetar"
            value={tipo}
            onChange={(evento) => trocarTipo(evento.target.value)}
          >
            {TIPOS_ETIQUETA.map((item) => (
              <option key={item.id} value={item.id}>
                {item.label}
              </option>
            ))}
          </select>
        </div>

        <div className="etiquetas-bloco">
          <h3>Filtros de seleção</h3>
          <label className="etiquetas-campo">
            <span>Sala</span>
            <select
              className="redes-select"
              aria-label="Filtrar sala"
              value={salaId}
              onChange={(evento) => trocarSala(evento.target.value)}
            >
              <option value="">Todas as salas</option>
              {salas.map((sala) => (
                <option key={sala.id} value={sala.id}>
                  {sala.nome}
                </option>
              ))}
            </select>
          </label>

          {mostrarSelecaoPortas && (
            <>
              <label className="etiquetas-campo">
                <span>Rack</span>
                <select
                  className="redes-select"
                  aria-label="Filtrar rack"
                  value={rackId}
                  onChange={(evento) => trocarRack(evento.target.value)}
                  disabled={!salaId}
                >
                  <option value="">Escolha o rack</option>
                  {racksDaSala.map((rack) => (
                    <option key={rack.id} value={rack.id}>
                      {rack.nome}
                    </option>
                  ))}
                </select>
              </label>
              <label className="etiquetas-campo">
                <span>
                  {tipo === 'portas_switch' ? 'Switch' : 'Patch panel'}
                </span>
                <select
                  className="redes-select"
                  aria-label="Filtrar equipamento"
                  value={equipamentoId}
                  onChange={(evento) => {
                    setEquipamentoId(evento.target.value)
                    setSelecionados(new Set())
                  }}
                  disabled={!rackId}
                >
                  <option value="">Escolha o equipamento</option>
                  {equipamentosDoRack.map((equipamento) => (
                    <option key={equipamento.id} value={equipamento.id}>
                      {equipamento.nome} ({equipamento.quantidadePortas} portas)
                    </option>
                  ))}
                </select>
              </label>
            </>
          )}

          <div className="etiquetas-intervalo">
            <label className="etiquetas-campo">
              <span>De</span>
              <input
                type="number"
                min="1"
                className="redes-select"
                value={intervaloDe}
                onChange={(evento) => setIntervaloDe(evento.target.value)}
                aria-label="Início do intervalo"
              />
            </label>
            <label className="etiquetas-campo">
              <span>a</span>
              <input
                type="number"
                min="1"
                className="redes-select"
                value={intervaloAte}
                onChange={(evento) => setIntervaloAte(evento.target.value)}
                aria-label="Fim do intervalo"
              />
            </label>
          </div>

          {semEquipamento ? (
            <p className="etiquetas-nota">
              Escolha a sala, o rack e o equipamento para listar as portas.
            </p>
          ) : noIntervalo.length === 0 ? (
            <p className="etiquetas-nota">
              Nenhum item para os filtros atuais.
            </p>
          ) : (
            <div className="etiquetas-selecao">
              <div className="etiquetas-selecao-topo">
                <button
                  type="button"
                  className="redes-filtro-btn"
                  onClick={selecionarTodos}
                >
                  Selecionar todos
                </button>
                <button
                  type="button"
                  className="redes-filtro-btn"
                  onClick={limparSelecao}
                >
                  Limpar seleção
                </button>
              </div>
              <ul className="etiquetas-selecao-lista">
                {noIntervalo.map((item) => (
                  <li key={item.chave}>
                    <label>
                      <input
                        type="checkbox"
                        checked={selecionados.has(item.chave)}
                        onChange={() => alternarItem(item.chave)}
                      />
                      <span className="etiquetas-item-titulo">{item.titulo}</span>
                      {item.destino && (
                        <span className="etiquetas-item-destino">
                          → {item.destino}
                        </span>
                      )}
                    </label>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div className="etiquetas-bloco">
          <h3>Modelo da etiqueta</h3>
          <select
            className="redes-select"
            aria-label="Modelo da etiqueta"
            value={modeloId}
            onChange={(evento) => setModeloId(evento.target.value)}
          >
            {modelos.map((item) => (
              <option key={item.id} value={item.id}>
                {item.nome}
                {item.largura ? ` (${item.largura} × ${item.altura} mm)` : ''}
              </option>
            ))}
          </select>
        </div>

        <div className="etiquetas-bloco">
          <h3>Conteúdo</h3>
          <label className="redes-check">
            <input
              type="checkbox"
              checked={conteudo.identificacao}
              onChange={(evento) =>
                setConteudo((atual) => ({
                  ...atual,
                  identificacao: evento.target.checked,
                }))
              }
            />
            Identificação
          </label>
          <label className="redes-check">
            <input
              type="checkbox"
              checked={conteudo.sala}
              onChange={(evento) =>
                setConteudo((atual) => ({ ...atual, sala: evento.target.checked }))
              }
            />
            Sala
          </label>
          <label className="redes-check">
            <input
              type="checkbox"
              checked={conteudo.patchPanel}
              onChange={(evento) =>
                setConteudo((atual) => ({
                  ...atual,
                  patchPanel: evento.target.checked,
                }))
              }
            />
            Patch panel / porta
          </label>
          <label className="redes-check">
            <input
              type="checkbox"
              checked={conteudo.destino}
              onChange={(evento) =>
                setConteudo((atual) => ({
                  ...atual,
                  destino: evento.target.checked,
                }))
              }
            />
            Destino (ex.: “SW1 / porta 12”)
          </label>
          <label className="redes-check">
            <input
              type="checkbox"
              checked={conteudo.categoriaCabo}
              onChange={(evento) =>
                setConteudo((atual) => ({
                  ...atual,
                  categoriaCabo: evento.target.checked,
                }))
              }
            />
            Categoria do cabo
          </label>
          <label className="redes-check desabilitado" title="Em breve">
            <input type="checkbox" checked={conteudo.qr} disabled />
            QR code <span className="etiquetas-em-breve">(em breve)</span>
          </label>
        </div>

        <div className="etiquetas-bloco">
          <h3>
            <QrCodeIcon size={14} className="etiquetas-icone-numeracao" />
            Texto padrão
          </h3>
          <label className="redes-check">
            <input
              type="checkbox"
              checked={numeracao.ativa}
              onChange={(evento) =>
                setNumeracao((atual) => ({
                  ...atual,
                  ativa: evento.target.checked,
                }))
              }
            />
            Usar numeração automática
          </label>
          {numeracao.ativa && (
            <div className="etiquetas-intervalo">
              <label className="etiquetas-campo">
                <span>Prefixo</span>
                <input
                  type="text"
                  className="redes-select"
                  value={numeracao.prefixo}
                  onChange={(evento) =>
                    setNumeracao((atual) => ({
                      ...atual,
                      prefixo: evento.target.value,
                    }))
                  }
                  aria-label="Prefixo da numeração"
                />
              </label>
              <label className="etiquetas-campo">
                <span>Nº inicial</span>
                <input
                  type="number"
                  min="1"
                  className="redes-select"
                  value={numeracao.inicial}
                  onChange={(evento) =>
                    setNumeracao((atual) => ({
                      ...atual,
                      inicial: evento.target.value,
                    }))
                  }
                  aria-label="Número inicial"
                />
              </label>
              <label className="etiquetas-campo">
                <span>Dígitos</span>
                <input
                  type="number"
                  min="1"
                  max="6"
                  className="redes-select"
                  value={numeracao.digitos}
                  onChange={(evento) =>
                    setNumeracao((atual) => ({
                      ...atual,
                      digitos: evento.target.value,
                    }))
                  }
                  aria-label="Quantidade de dígitos"
                />
              </label>
            </div>
          )}
          {numeracao.ativa && (
            <p className="etiquetas-nota">
              Ex.: {numeracao.prefixo}
              {String(Number(numeracao.inicial) || 1).padStart(
                Number(numeracao.digitos) || 1,
                '0'
              )}
            </p>
          )}
        </div>

        <div className="etiquetas-bloco">
          <h3>Aparência</h3>
          <div className="etiquetas-orientacao" role="radiogroup" aria-label="Orientação">
            <button
              type="button"
              className={orientacao === 'horizontal' ? 'ativo' : ''}
              aria-pressed={orientacao === 'horizontal'}
              onClick={() => setOrientacao('horizontal')}
            >
              Horizontal
            </button>
            <button
              type="button"
              className={orientacao === 'vertical' ? 'ativo' : ''}
              aria-pressed={orientacao === 'vertical'}
              onClick={() => setOrientacao('vertical')}
            >
              Vertical
            </button>
          </div>
          <label className="etiquetas-campo">
            <span>Tamanho da fonte</span>
            <select
              className="redes-select"
              aria-label="Tamanho da fonte"
              value={tamanhoFonte}
              onChange={(evento) => setTamanhoFonte(evento.target.value)}
            >
              {TAMANHOS_FONTE.map((tamanho) => (
                <option key={tamanho} value={tamanho}>
                  {tamanho} px
                </option>
              ))}
            </select>
          </label>
        </div>
      </section>

      <section className="etiquetas-preview">
        <div className="etiquetas-preview-acoes">
          <button
            type="button"
            className="btn-new"
            onClick={imprimir}
            disabled={etiquetas.length === 0}
          >
            <PrinterIcon size={16} />
            Imprimir
          </button>
          <button
            type="button"
            className="ponto-btn-neutro"
            onClick={imprimir}
            disabled={etiquetas.length === 0}
            title="Na janela de impressão, escolha “Salvar como PDF” como destino"
          >
            <DownloadIcon size={15} />
            Baixar PDF
          </button>
          {paginas.length > 1 && (
            <div className="etiquetas-paginacao">
              <button
                type="button"
                className="redes-filtro-btn"
                onClick={() => setPagina((atual) => Math.max(0, atual - 1))}
                disabled={paginaExibida === 0}
                aria-label="Página anterior"
              >
                <ChevronLeftIcon size={15} />
              </button>
              <span>
                Página {paginaExibida + 1} de {paginas.length}
              </span>
              <button
                type="button"
                className="redes-filtro-btn"
                onClick={() =>
                  setPagina((atual) =>
                    Math.min(paginas.length - 1, atual + 1)
                  )
                }
                disabled={paginaExibida >= paginas.length - 1}
                aria-label="Próxima página"
              >
                <ChevronRightIcon size={15} />
              </button>
            </div>
          )}
        </div>
        <p className="etiquetas-preview-dica">
          Para salvar em PDF, escolha “Salvar como PDF” como destino na
          janela de impressão.
        </p>
        {etiquetas.length === 0 ? (
          <div className="empty-state">
            <TagIcon size={28} />
            <p>Selecione itens para gerar etiquetas.</p>
          </div>
        ) : (
          <div className="etiquetas-folha-scroll">
            <FolhaEtiquetas
              etiquetasDaPagina={paginas[paginaExibida] || []}
              modelo={modelo}
              orientacao={orientacao}
              tamanhoFonte={tamanhoFonte}
              margens={margens}
              logo={logo}
            />
          </div>
        )}
      </section>

      {/* Folhas completas, visíveis apenas na impressão */}
      <div className="etiquetas-impressao" aria-hidden="true">
        {paginas.map((pag, indice) => (
          <FolhaEtiquetas
            key={indice}
            etiquetasDaPagina={pag}
            modelo={modelo}
            orientacao={orientacao}
            tamanhoFonte={tamanhoFonte}
            margens={margens}
            logo={logo}
          />
        ))}
      </div>
    </div>
  )
}
