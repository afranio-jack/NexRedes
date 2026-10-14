// Página do ponto de rede (/redes/pontos/:id): cabeçalho com ações (Editar,
// Registrar teste e Gerar etiqueta), cartão "Cadeia de conexão" clicável
// (Ponto → Patch panel/porta → Porta do switch → Categoria do cabo) e o
// histórico de testes de certificação do ponto, mais recente primeiro.

import { Fragment, useMemo, useState } from 'react'
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  PencilIcon,
  CheckCircleIcon,
  TagIcon,
  NetworkIcon,
  PatchPanelIcon,
  SwitchIcon,
  PlugIcon,
  ClipboardListIcon,
  TrashIcon,
} from '../icons'
import PontoModal from './PontoModal'
import ConfirmDialog from '../sala/ConfirmDialog'
import { obterPonto, editarPonto } from '../../utils/pontos'
import { corDaSala } from '../../utils/salas'
import { formatarDataHora } from '../../utils/datas'
import { navegar } from '../../utils/rotas'

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

export default function PontoDetalhe({
  salas,
  pontoId,
  testes,
  onAbrirSalaFoco,
  onGerarEtiquetas,
  onRegistrarTeste,
  onEditarTeste,
  onExcluirTeste,
  onMostrarToast,
  onDadosAlterados,
}) {
  const [modalEdicao, setModalEdicao] = useState(false)
  const [testeParaExcluir, setTesteParaExcluir] = useState(null)

  const achado = useMemo(
    () => obterPonto(salas, pontoId),
    [salas, pontoId]
  )
  const testesDoPonto = useMemo(
    () =>
      testes
        .filter((teste) => teste.pontoId === pontoId)
        .sort((a, b) => (a.dataHora < b.dataHora ? 1 : -1)),
    [testes, pontoId]
  )

  if (!achado) {
    return (
      <div className="empty-state">
        <NetworkIcon size={28} />
        <p>Ponto não encontrado. Ele pode ter sido excluído.</p>
        <button
          type="button"
          className="btn-new"
          onClick={() => navegar('/redes/pontos')}
        >
          Voltar aos pontos
        </button>
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

  const cadeia = [
    itemCadeia('Ponto de rede', NetworkIcon, ponto.identificacao),
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
    <div className="redes-conteudo ponto-detalhe">
      <button
        type="button"
        className="detalhe-voltar"
        onClick={() => navegar('/redes/pontos')}
      >
        <ArrowLeftIcon size={16} />
        Voltar aos pontos
      </button>

      <header
        className="detalhe-cabecalho ponto-cabecalho"
        style={{ '--room-color': corDaSala(sala.cor) }}
      >
        <span className="detalhe-icone" aria-hidden="true">
          <NetworkIcon size={30} />
        </span>
        <div className="detalhe-titulos">
          <h1>{ponto.identificacao}</h1>
          <p>
            <button
              type="button"
              className="ponto-link-sala"
              onClick={() => onAbrirSalaFoco(sala.id)}
            >
              {sala.nome}
            </button>
            {' · '}
            {sala.codigo}
            {ponto.categoriaCabo ? ` · ${ponto.categoriaCabo}` : ''}
          </p>
        </div>
        <span
          className={`selo-teste ${(ultimo?.resultado || 'SEM_TESTE').toLowerCase()}`}
        >
          {ultimo ? ultimo.resultado : 'Sem teste'}
        </span>
        <div className="ponto-acoes">
          <button
            type="button"
            className="ponto-btn-neutro"
            onClick={() => setModalEdicao(true)}
          >
            <PencilIcon size={15} />
            Editar
          </button>
          <button
            type="button"
            className="btn-new"
            onClick={() => onRegistrarTeste(ponto.id)}
          >
            <CheckCircleIcon size={16} />
            Registrar teste
          </button>
          <button
            type="button"
            className="ponto-btn-neutro"
            onClick={() => onGerarEtiquetas(ponto.id)}
          >
            <TagIcon size={15} />
            Gerar etiqueta
          </button>
        </div>
      </header>

      <section className="detalhe-bloco">
        <h2>
          <NetworkIcon size={18} />
          Cadeia de conexão
        </h2>
        <div className="cadeia">
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

      {ponto.observacoes && (
        <section className="detalhe-bloco">
          <h2>
            <ClipboardListIcon size={18} />
            Observações
          </h2>
          <p className="ponto-observacoes">{ponto.observacoes}</p>
        </section>
      )}

      <section className="detalhe-bloco">
        <h2>
          <CheckCircleIcon size={18} />
          Testes de certificação ({testesDoPonto.length})
        </h2>
        {testesDoPonto.length === 0 ? (
          <div className="ponto-testes-vazio">
            <p>Nenhum teste de certificação registrado para este ponto.</p>
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
                    {teste.norma && (
                      <span className="detalhe-chip neutro">{teste.norma}</span>
                    )}
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
                {teste.observacoes && (
                  <p className="ponto-teste-linha">{teste.observacoes}</p>
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
