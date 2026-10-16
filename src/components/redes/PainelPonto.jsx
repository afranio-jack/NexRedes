// Painel lateral do ponto de rede (abre ao clicar numa linha ou cartão da
// lista de pontos): todos os dados do ponto, cadeia de conexão clicável
// (Sala → Rack → Patch panel/porta → Porta do switch → Categoria), histórico
// de testes e atalhos para a página completa, a etiqueta, o teste e o patch
// panel/switch relacionados.

import { Fragment, useEffect, useMemo, useState } from 'react'
import {
  XIcon,
  PencilIcon,
  CheckCircleIcon,
  TagIcon,
  NetworkIcon,
  PatchPanelIcon,
  SwitchIcon,
  PlugIcon,
  ClipboardListIcon,
  TrashIcon,
  ArrowRightIcon,
} from '../icons'
import { obterPonto, editarPonto } from '../../utils/pontos'
import { corDaSala } from '../../utils/salas'
import { formatarDataHora } from '../../utils/datas'
import { navegar } from '../../utils/rotas'
import '../sala/SalaModal.css'

function itemCadeia(titulo, Icone, rotulo, aoClicar) {
  return { titulo, Icone, rotulo: rotulo || '', aoClicar: aoClicar || null }
}

function textoMedicoes(medicoes) {
  if (!medicoes) return ''
  const partes = []
  if (medicoes.comprimentoM) partes.push(`Comprimento ${medicoes.comprimentoM} m`)
  if (medicoes.mapaFios) partes.push(`Mapa de fios ${medicoes.mapaFios}`)
  if (medicoes.atenuacao) partes.push(`Atenuação ${medicoes.atenuacao} dB`)
  if (medicoes.next) partes.push(`NEXT ${medicoes.next} dB`)
  if (medicoes.perdaRetorno)
    partes.push(`Perda de retorno ${medicoes.perdaRetorno} dB`)
  return partes.join(' · ')
}

export default function PainelPonto({
  salas,
  testes,
  pontoId,
  onFechar,
  onAbrirSalaFoco,
  onRegistrarTeste,
  onGerarEtiquetas,
  onEditarTeste,
  onExcluirTeste,
  onMostrarToast,
  onDadosAlterados,
}) {
  const [modalEdicao, setModalEdicao] = useState(false)
  const [testeParaExcluir, setTesteParaExcluir] = useState(null)

  const achado = useMemo(() => obterPonto(salas, pontoId), [salas, pontoId])
  const testesDoPonto = useMemo(
    () =>
      testes
        .filter((teste) => teste.pontoId === pontoId)
        .sort((a, b) => (a.dataHora < b.dataHora ? 1 : -1)),
    [testes, pontoId]
  )

  // Esc fecha o painel — mas se houver outro drawer aberto por cima (ex.:
  // o drawer de teste), o Esc fecha primeiro o de cima
  useEffect(() => {
    function aoTeclar(evento) {
      if (evento.key === 'Escape') {
        if (document.querySelectorAll('.redes-drawer-overlay').length > 1) {
          return
        }
        evento.preventDefault()
        onFechar()
      }
    }
    window.addEventListener('keydown', aoTeclar)
    return () => window.removeEventListener('keydown', aoTeclar)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (!achado) {
    return (
      <div
        className="redes-drawer-overlay"
        onMouseDown={(evento) => {
          if (evento.target === evento.currentTarget) onFechar()
        }}
      >
        <aside className="redes-drawer" role="dialog" aria-modal="true" tabIndex={-1}>
          <header className="redes-drawer-cabecalho">
            <div>
              <h3>Ponto não encontrado</h3>
              <p>Ele pode ter sido excluído enquanto o painel estava aberto.</p>
            </div>
            <button type="button" className="btn-fechar" onClick={onFechar} aria-label="Fechar">
              <XIcon size={20} />
            </button>
          </header>
          <div className="redes-drawer-corpo">
            <button
              type="button"
              className="btn-modal primario"
              onClick={onFechar}
            >
              Fechar painel
            </button>
          </div>
        </aside>
      </div>
    )
  }

  const ponto = achado
  const sala = achado.sala
  const ultimo = testesDoPonto[0] || null

  const equipamentos = []
  for (const rack of sala.racks || []) {
    for (const equipamento of rack.equipamentos || []) {
      equipamentos.push(equipamento)
    }
  }
  const patchPanel =
    equipamentos.find((item) => item.id === ponto.patchPanelId) || null
  const switchEquipamento =
    equipamentos.find((item) => item.id === ponto.switchId) || null
  const portaVerso = patchPanel
    ? (patchPanel.portas || []).find(
        (porta) => porta.id === ponto.portaPatchPanelId
      ) || null
    : null
  const portaSwitch = switchEquipamento
    ? (switchEquipamento.portas || []).find(
        (porta) => porta.id === ponto.portaSwitchId
      ) || null
    : null
  const rackDoPonto = patchPanel
    ? (sala.racks || []).find((rack) => rack.id === patchPanel.rackId) || null
    : null

  const cadeia = [
    itemCadeia('Sala', NetworkIcon, sala.nome, () =>
      onAbrirSalaFoco(sala.id)
    ),
    itemCadeia(
      'Rack',
      ClipboardListIcon,
      rackDoPonto ? rackDoPonto.nome : '',
      rackDoPonto
        ? () => onAbrirSalaFoco(sala.id, { rackId: rackDoPonto.id })
        : null
    ),
    itemCadeia(
      'Patch panel / porta',
      PatchPanelIcon,
      patchPanel && portaVerso
        ? `${patchPanel.nome} / porta ${portaVerso.numero} (verso)`
        : '',
      patchPanel
        ? () =>
            onAbrirSalaFoco(sala.id, {
              rackId: patchPanel.rackId,
              equipamentoId: patchPanel.id,
              portaId: portaVerso?.id || null,
            })
        : null
    ),
    itemCadeia(
      'Porta do switch',
      SwitchIcon,
      switchEquipamento && portaSwitch
        ? `${switchEquipamento.nome} / porta ${portaSwitch.numero}`
        : '',
      switchEquipamento
        ? () =>
            onAbrirSalaFoco(sala.id, {
              rackId: switchEquipamento.rackId,
              equipamentoId: switchEquipamento.id,
              portaId: portaSwitch?.id || null,
            })
        : null
    ),
    itemCadeia('Categoria do cabo', PlugIcon, ponto.categoriaCabo),
  ]

  function salvarEdicao(dados) {
    editarPonto(ponto.id, dados)
    onMostrarToast?.('Ponto atualizado com sucesso')
    onDadosAlterados?.()
    setModalEdicao(false)
  }

  return (
    <div
      className="redes-drawer-overlay"
      onMouseDown={(evento) => {
        if (evento.target === evento.currentTarget) onFechar()
      }}
    >
      <aside
        className="redes-drawer"
        role="dialog"
        aria-modal="true"
        aria-labelledby="painel-ponto-titulo"
        tabIndex={-1}
      >
        <header
          className="redes-drawer-cabecalho painel-ponto-cabecalho"
          style={{ '--room-color': corDaSala(sala.cor) }}
        >
          <div>
            <h3 id="painel-ponto-titulo" className="painel-ponto-titulo">
              <NetworkIcon size={18} />
              {ponto.identificacao}
            </h3>
            <p>
              {sala.nome} · {sala.codigo}
            </p>
          </div>
          <div className="painel-ponto-cabecalho-lado">
            <span
              className={`selo-teste ${(ultimo?.resultado || 'SEM_TESTE').toLowerCase()}`}
            >
              {ultimo ? ultimo.resultado : 'Sem teste'}
            </span>
            <button
              type="button"
              className="btn-fechar"
              onClick={onFechar}
              aria-label="Fechar"
            >
              <XIcon size={20} />
            </button>
          </div>
        </header>

        <div className="redes-drawer-corpo">
          <div className="painel-ponto-atalhos">
            <button
              type="button"
              className="btn-new"
              onClick={() => onRegistrarTeste(ponto.id)}
            >
              <CheckCircleIcon size={15} />
              Registrar teste
            </button>
            <button
              type="button"
              className="ponto-btn-neutro"
              onClick={() => setModalEdicao(true)}
            >
              <PencilIcon size={14} />
              Editar
            </button>
            <button
              type="button"
              className="ponto-btn-neutro"
              onClick={() => onGerarEtiquetas(ponto.id)}
            >
              <TagIcon size={14} />
              Gerar etiqueta
            </button>
            <button
              type="button"
              className="ponto-btn-neutro"
              onClick={() => {
                onFechar()
                navegar(`/redes/pontos/${encodeURIComponent(ponto.id)}`)
              }}
            >
              <ArrowRightIcon size={14} />
              Página completa
            </button>
          </div>

          <section className="redes-drawer-secao">
            <h4>Cadeia de conexão</h4>
            <div className="cadeia painel-ponto-cadeia">
              {cadeia.map((item, indice) => (
                <Fragment key={item.titulo}>
                  {indice > 0 && (
                    <span className="cadeia-seta" aria-hidden="true">
                      <ArrowRightIcon size={14} />
                    </span>
                  )}
                  {item.aoClicar ? (
                    <button
                      type="button"
                      className="cadeia-item clicavel"
                      title={`Abrir ${item.rotulo}`}
                      onClick={item.aoClicar}
                    >
                      <span className="cadeia-tipo">
                        <item.Icone size={12} /> {item.titulo}
                      </span>
                      <span className="cadeia-rotulo">{item.rotulo}</span>
                    </button>
                  ) : (
                    <div className={`cadeia-item${item.rotulo ? '' : ' vazio'}`}>
                      <span className="cadeia-tipo">
                        <item.Icone size={12} /> {item.titulo}
                      </span>
                      <span className="cadeia-rotulo">
                        {item.rotulo || 'não definido'}
                      </span>
                    </div>
                  )}
                </Fragment>
              ))}
            </div>
          </section>

          <section className="redes-drawer-secao">
            <h4>Dados do ponto</h4>
            <div className="painel-ponto-dados">
              <p>
                <span>Categoria do cabo</span>
                <strong>{ponto.categoriaCabo || '—'}</strong>
              </p>
              <p>
                <span>Cadastrado em</span>
                <strong>{formatarDataHora(ponto.criadoEm)}</strong>
              </p>
            </div>
            {ponto.observacoes ? (
              <div className="painel-ponto-obs">
                <span>Observações</span>
                <p className="ponto-observacoes">{ponto.observacoes}</p>
              </div>
            ) : null}
          </section>

          <section className="redes-drawer-secao">
            <h4>Testes de certificação ({testesDoPonto.length})</h4>
            {testesDoPonto.length === 0 ? (
              <div className="ponto-testes-vazio">
                <p>Nenhum teste registrado para este ponto.</p>
                <button
                  type="button"
                  className="btn-new"
                  onClick={() => onRegistrarTeste(ponto.id)}
                >
                  <CheckCircleIcon size={16} />
                  Registrar o primeiro teste
                </button>
              </div>
            ) : (
              <ul className="ponto-testes-lista">
                {testesDoPonto.map((teste) => (
                  <li key={teste.id} className="ponto-teste-item">
                    <div className="ponto-teste-topo">
                      <strong>{formatarDataHora(teste.dataHora)}</strong>
                      <span className="ponto-teste-badges">
                        <span
                          className={`selo-teste ${teste.resultado.toLowerCase()}`}
                        >
                          {teste.resultado}
                        </span>
                      </span>
                    </div>
                    <p className="ponto-teste-linha">
                      Técnico: {teste.tecnico || '—'}
                    </p>
                    {textoMedicoes(teste.medicoes) && (
                      <p className="ponto-teste-linha">
                        {textoMedicoes(teste.medicoes)}
                      </p>
                    )}
                    {teste.motivoFalha && (
                      <p className="ponto-teste-linha ponto-teste-motivo">
                        Motivo da falha: {teste.motivoFalha}
                      </p>
                    )}
                    <div className="ponto-teste-acoes">
                      <button
                        type="button"
                        className="redes-btn-acao"
                        onClick={() => onEditarTeste(teste)}
                      >
                        <PencilIcon size={14} />
                        Editar
                      </button>
                      <button
                        type="button"
                        className="redes-btn-acao perigo"
                        onClick={() => setTesteParaExcluir(teste)}
                      >
                        <TrashIcon size={14} />
                        Excluir
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </aside>

      {modalEdicao && (
        <PontoModal
          salas={salas}
          ponto={ponto}
          onFechar={() => setModalEdicao(false)}
          onSalvar={salvarEdicao}
        />
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
