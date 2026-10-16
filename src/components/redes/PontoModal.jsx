// Modal de criação/edição de ponto de rede: identificação, sala, patch panel
// e porta, porta do switch e categoria do cabo. Patch panels e switches
// listados são apenas da sala escolhida; a porta é escolhida numa GRADE
// VISUAL (GradePortasVinculo) — livres clicáveis, ocupadas desabilitadas
// com tooltip explicando o motivo. O patch panel usa o lado VERSO (lado
// dos pontos de rede) e o switch as portas comuns.

import { useEffect, useMemo, useRef, useState } from 'react'
import { XIcon, NetworkIcon, PatchPanelIcon, SwitchIcon, PlugIcon } from '../icons'
import { CampoInput, CampoSelect, CampoTextarea } from '../sala/Campo'
import ConfirmDialog from '../sala/ConfirmDialog'
import '../sala/SalaModal.css'
import '../rack/rack.css'
import { CATEGORIAS_CABO } from '../sala/opcoes'
import {
  validarPonto,
  sugerirIdentificacao,
  portaDisponivelParaPonto,
} from '../../utils/pontos'
import {
  listarPatchPanels,
  listarSwitches,
  descricaoVinculo,
} from '../../utils/racks'
import { GradePortasVinculo } from '../rack/SeletorVinculo'
import { obterConfig } from '../../utils/etiquetas'

function estadoInicial(salas, ponto) {
  const base = {
    salaId: salas[0]?.id || '',
    identificacao: '',
    patchPanelId: '',
    portaPatchPanelId: '',
    switchId: '',
    portaSwitchId: '',
    categoriaCabo: CATEGORIAS_CABO[0],
    observacoes: '',
  }
  if (!ponto) return base
  return {
    ...base,
    salaId: ponto.salaId || base.salaId,
    identificacao: ponto.identificacao || '',
    patchPanelId: ponto.patchPanelId || '',
    portaPatchPanelId: ponto.portaPatchPanelId || '',
    switchId: ponto.switchId || '',
    portaSwitchId: ponto.portaSwitchId || '',
    categoriaCabo: ponto.categoriaCabo || base.categoriaCabo,
    observacoes: ponto.observacoes || '',
  }
}

export default function PontoModal({ salas, ponto, onFechar, onSalvar }) {
  const editando = Boolean(ponto)
  const [form, setForm] = useState(() => estadoInicial(salas, ponto))
  const [erros, setErros] = useState({})
  const [sujo, setSujo] = useState(false)
  const [confirmarDescarte, setConfirmarDescarte] = useState(false)
  const modalRef = useRef(null)
  // Não sobrescreve a identificação digitada pelo usuário ao trocar de sala
  const identificacaoManual = useRef(false)

  const salaAtual = useMemo(
    () => salas.find((sala) => sala.id === form.salaId) || null,
    [salas, form.salaId]
  )
  const falhas = salaAtual?.falhas || []
  const patchPanels = useMemo(
    () => (salaAtual ? listarPatchPanels(salaAtual) : []),
    [salaAtual]
  )
  const switches = useMemo(
    () => (salaAtual ? listarSwitches(salaAtual) : []),
    [salaAtual]
  )
  const patchPanelAtual =
    patchPanels.find((item) => item.id === form.patchPanelId) || null
  const switchAtual =
    switches.find((item) => item.id === form.switchId) || null

  const portasPP = useMemo(
    () =>
      patchPanelAtual
        ? (patchPanelAtual.portas || [])
            .filter((porta) => porta.lado === 'verso')
            .sort((a, b) => a.numero - b.numero)
        : [],
    [patchPanelAtual]
  )

  const portasSwitch = useMemo(
    () =>
      switchAtual
        ? (switchAtual.portas || [])
            .filter((porta) => !porta.sfp)
            .sort((a, b) => a.numero - b.numero)
        : [],
    [switchAtual]
  )

  const pontoIdAtual = ponto?.id || null
  const livreParaPonto = (porta) =>
    portaDisponivelParaPonto(porta, falhas, pontoIdAtual)

  // Motivo pelo qual a porta está ocupada (tooltip da grade)
  function motivoOcupada(porta) {
    if (porta.pontoRede?.identificacao) {
      return `ponto de rede ${porta.pontoRede.identificacao}`
    }
    const vinculo = porta.vinculo ? descricaoVinculo(salaAtual, porta) : ''
    if (vinculo) return `ligada a ${vinculo}`
    if (porta.uplink?.ativo) {
      return `uplink${porta.uplink.destino ? ` para ${porta.uplink.destino}` : ''}`
    }
    if (porta.dispositivoConectado?.tipo || porta.dispositivoConectado?.nome) {
      return 'dispositivo conectado'
    }
    if (porta.estado === 'desativada' || porta.estado === 'reservada') {
      return 'desativada ou reservada'
    }
    if (porta.falhaId) return 'porta com falha'
    if (porta.ultimoTeste === 'FAIL') return 'último teste FAIL'
    return 'em uso'
  }

  // Sugestão automática de identificação na criação (prefixo + próximo nº);
  // trocar de sala só atualiza se o usuário ainda não digitou nada
  useEffect(() => {
    if (editando || !salaAtual || identificacaoManual.current) return
    setForm((atual) => ({
      ...atual,
      identificacao: sugerirIdentificacao(
        salaAtual,
        obterConfig().prefixoPadrao
      ),
    }))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.salaId])

  // Foco no primeiro campo + trava o scroll do fundo
  useEffect(() => {
    document.getElementById('campo-identificacao')?.focus()
    const scrollAnterior = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = scrollAnterior
    }
  }, [])

  // Esc fecha (com confirmação se houver alterações); Tab fica preso no modal
  useEffect(() => {
    function aoTeclar(evento) {
      if (confirmarDescarte) return
      if (evento.key === 'Escape') {
        evento.preventDefault()
        pedirParaFechar()
        return
      }
      if (evento.key === 'Tab' && modalRef.current) {
        const focos = Array.from(
          modalRef.current.querySelectorAll(
            'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled])'
          )
        ).filter((elemento) => elemento.offsetParent !== null)
        if (focos.length === 0) return
        const primeiro = focos[0]
        const ultimo = focos[focos.length - 1]
        if (evento.shiftKey && document.activeElement === primeiro) {
          evento.preventDefault()
          ultimo.focus()
        } else if (!evento.shiftKey && document.activeElement === ultimo) {
          evento.preventDefault()
          primeiro.focus()
        }
      }
    }
    window.addEventListener('keydown', aoTeclar)
    return () => window.removeEventListener('keydown', aoTeclar)
  })

  function limparErro(chave) {
    setErros((atual) =>
      atual[chave] ? { ...atual, [chave]: undefined } : atual
    )
  }

  function atualizar(chave, valor) {
    setSujo(true)
    setForm((atual) => ({ ...atual, [chave]: valor }))
    limparErro(chave)
  }

  function trocarSala(salaId) {
    setSujo(true)
    setForm((atual) => ({
      ...atual,
      salaId,
      patchPanelId: '',
      portaPatchPanelId: '',
      switchId: '',
      portaSwitchId: '',
    }))
  }

  function trocarPatchPanel(valor) {
    setSujo(true)
    setForm((atual) => ({
      ...atual,
      patchPanelId: valor,
      portaPatchPanelId: '',
    }))
    limparErro('patchPanelId')
    limparErro('portaPatchPanelId')
  }

  function trocarSwitch(valor) {
    setSujo(true)
    setForm((atual) => ({
      ...atual,
      switchId: valor,
      portaSwitchId: '',
    }))
    limparErro('switchId')
    limparErro('portaSwitchId')
  }

  function pedirParaFechar() {
    if (sujo) setConfirmarDescarte(true)
    else onFechar()
  }

  function aoSubmeter(evento) {
    evento.preventDefault()
    const validacao = validarPonto(salaAtual, form, ponto?.id || null)
    setErros(validacao)
    const chavesErro = Object.keys(validacao).filter(
      (chave) => validacao[chave]
    )
    if (chavesErro.length > 0) {
      const primeiro = modalRef.current.querySelector(
        `[data-erro-chave="${chavesErro[0]}"]`
      )
      primeiro?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      primeiro?.querySelector('input, select, textarea')?.focus({
        preventScroll: true,
      })
      return
    }
    onSalvar(
      {
        salaId: form.salaId,
        identificacao: form.identificacao,
        patchPanelId: form.patchPanelId,
        portaPatchPanelId: form.portaPatchPanelId,
        switchId: form.switchId,
        portaSwitchId: form.portaSwitchId,
        categoriaCabo: form.categoriaCabo,
        observacoes: form.observacoes,
      },
      ponto
    )
  }

  const semSalas = salas.length === 0

  return (
    <div
      className="modal-overlay"
      onMouseDown={(evento) => {
        if (evento.target === evento.currentTarget) pedirParaFechar()
      }}
    >
      <div
        ref={modalRef}
        className="modal-sala modal-ponto"
        role="dialog"
        aria-modal="true"
        aria-labelledby="titulo-modal-ponto"
      >
        <header className="modal-cabecalho">
          <div>
            <h2 id="titulo-modal-ponto">
              {editando ? 'Editar ponto de rede' : 'Novo ponto de rede'}
            </h2>
            <p>
              {editando
                ? 'Ajuste os dados do ponto. As portas antigas serão liberadas se trocadas.'
                : 'Escolha as portas livres do patch panel e do switch que formarão a cadeia do ponto.'}
            </p>
          </div>
          <button
            type="button"
            className="btn-fechar"
            onClick={pedirParaFechar}
            aria-label="Fechar"
          >
            <XIcon size={20} />
          </button>
        </header>

        <form onSubmit={aoSubmeter} className="modal-corpo">
          {semSalas ? (
            <p className="lista-vazia">
              Cadastre uma sala em Projetos antes de criar pontos de rede.
            </p>
          ) : (
            <>
              <section className="modal-secao">
                <h3 className="secao-titulo">
                  <NetworkIcon size={18} />
                  Identificação
                </h3>
                <div className="secao-grade">
                  <CampoInput
                    chave="identificacao"
                    label="Identificação do ponto"
                    obrigatorio
                    placeholder="ex.: CO-P01"
                    erro={erros.identificacao}
                    valor={form.identificacao}
                    aoAlterar={(valor) => {
                      identificacaoManual.current = true
                      atualizar('identificacao', valor)
                    }}
                  />
                  <CampoSelect
                    chave="salaId"
                    label="Sala"
                    obrigatorio
                    valor={form.salaId}
                    opcoes={salas.map((sala) => ({
                      valor: sala.id,
                      label: sala.nome,
                    }))}
                    erro={erros.salaId}
                    aoAlterar={trocarSala}
                  />
                </div>
              </section>

              <section className="modal-secao">
                <h3 className="secao-titulo">
                  <PatchPanelIcon size={18} />
                  Patch panel
                </h3>
                <div className="secao-grade">
                  <CampoSelect
                    chave="patchPanelId"
                    label="Patch panel da sala"
                    obrigatorio
                    valor={form.patchPanelId}
                    opcoes={[{ valor: '', label: '—' }].concat(
                      patchPanels.map((item) => ({
                        valor: item.id,
                        label: `${item.nome} (${item.quantidadePortas} portas)`,
                      }))
                    )}
                    erro={erros.patchPanelId}
                    aoAlterar={trocarPatchPanel}
                  />
                </div>
                {patchPanelAtual && (
                  <div data-erro-chave="portaPatchPanelId">
                    <GradePortasVinculo
                      titulo={`Portas do patch panel ${patchPanelAtual.nome} (verso)`}
                      rotulo="Escolha a porta do verso (lado dos pontos de rede)"
                      portas={portasPP}
                      selecaoId={form.portaPatchPanelId}
                      estaLivre={livreParaPonto}
                      rotuloOcupada={motivoOcupada}
                      aoSelecionar={(porta) =>
                        atualizar('portaPatchPanelId', porta.id)
                      }
                    />
                    {erros.portaPatchPanelId && (
                      <p className="vinculo-erro">{erros.portaPatchPanelId}</p>
                    )}
                  </div>
                )}
                {patchPanels.length === 0 && (
                  <p className="painel-nota">
                    Nenhum patch panel nesta sala. Cadastre um na aba Racks da
                    sala (Projetos).
                  </p>
                )}
              </section>

              <section className="modal-secao">
                <h3 className="secao-titulo">
                  <SwitchIcon size={18} />
                  Switch
                </h3>
                <div className="secao-grade">
                  <CampoSelect
                    chave="switchId"
                    label="Switch da sala"
                    obrigatorio
                    valor={form.switchId}
                    opcoes={[{ valor: '', label: '—' }].concat(
                      switches.map((item) => ({
                        valor: item.id,
                        label: `${item.nome} (${item.quantidadePortas} portas)`,
                      }))
                    )}
                    erro={erros.switchId}
                    aoAlterar={trocarSwitch}
                  />
                </div>
                {switchAtual && (
                  <div data-erro-chave="portaSwitchId">
                    <GradePortasVinculo
                      titulo={`Portas do switch ${switchAtual.nome}`}
                      rotulo="Escolha a porta do switch"
                      portas={portasSwitch}
                      selecaoId={form.portaSwitchId}
                      estaLivre={livreParaPonto}
                      rotuloOcupada={motivoOcupada}
                      aoSelecionar={(porta) =>
                        atualizar('portaSwitchId', porta.id)
                      }
                    />
                    {erros.portaSwitchId && (
                      <p className="vinculo-erro">{erros.portaSwitchId}</p>
                    )}
                  </div>
                )}
                {switches.length === 0 && (
                  <p className="painel-nota">
                    Nenhum switch nesta sala. Cadastre um na aba Racks da sala
                    (Projetos).
                  </p>
                )}
              </section>

              <section className="modal-secao">
                <h3 className="secao-titulo">
                  <PlugIcon size={18} />
                  Cabo e observações
                </h3>
                <div className="secao-grade">
                  <CampoSelect
                    chave="categoriaCabo"
                    label="Categoria do cabo"
                    obrigatorio
                    valor={form.categoriaCabo}
                    opcoes={CATEGORIAS_CABO.map((categoria) => ({
                      valor: categoria,
                      label: categoria,
                    }))}
                    erro={erros.categoriaCabo}
                    aoAlterar={(valor) => atualizar('categoriaCabo', valor)}
                  />
                  <CampoTextarea
                    chave="observacoes"
                    label="Observações"
                    placeholder="Informações extras sobre o ponto"
                    valor={form.observacoes}
                    aoAlterar={(valor) => atualizar('observacoes', valor)}
                    className="campo-linha-toda"
                  />
                </div>
              </section>
            </>
          )}

          <footer className="modal-rodape">
            <button
              type="button"
              className="btn-modal secundario"
              onClick={pedirParaFechar}
            >
              Cancelar
            </button>
            <button type="submit" className="btn-modal primario" disabled={semSalas}>
              {editando ? 'Salvar alterações' : 'Criar ponto'}
            </button>
          </footer>
        </form>
      </div>

      {confirmarDescarte && (
        <ConfirmDialog
          titulo="Descartar alterações?"
          texto="Existem informações preenchidas que serão perdidas se você fechar agora."
          confirmarLabel="Descartar"
          cancelarLabel="Continuar editando"
          perigo
          onConfirmar={onFechar}
          onCancelar={() => setConfirmarDescarte(false)}
        />
      )}
    </div>
  )
}
