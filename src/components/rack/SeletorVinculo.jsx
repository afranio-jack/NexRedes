// Seletor de vínculo em duas etapas — substitui o antigo <select> gigante
// da seção "Vínculos" do painel da porta:
// - Etapa 1: escolher o equipamento alvo (patch panel ao editar uma porta
//   de switch; switch ao editar a frente de um patch panel), com campo de
//   busca quando há mais de um candidato;
// - Etapa 2: escolher a porta numa GRADE VISUAL numerada (como a faixa da
//   página): livres clicáveis, ocupadas desabilitadas com tooltip mostrando
//   a que estão vinculadas e a selecionada em destaque forte.
// Atalhos: "Usar próxima porta livre" e digitação rápida por número.
// O lado (frente/verso) é sempre determinado pelo contexto — porta de
// switch vincula pela FRENTE do patch panel; frente do patch panel vincula
// a uma porta de switch — por isso o alternador fica oculto e um rótulo
// explica a conexão.
// GradePortasVinculo é exportada à parte para o PontoModal reutilizar.

import { useMemo, useRef, useState } from 'react'
import {
  SearchIcon,
  SwitchIcon,
  PatchPanelIcon,
  ZapIcon,
} from '../icons'
import {
  listarPatchPanels,
  listarSwitches,
  portasComuns,
  buscarPortaVinculada,
  descricaoVinculo,
} from '../../utils/racks'
import { ROTULO_LADO } from './opcoes'

// ---------- Grade visual de portas (reutilizável) ----------

export function GradePortasVinculo({
  titulo,
  rotulo,
  portas,
  selecaoId,
  estaLivre,
  rotuloOcupada,
  aoSelecionar,
}) {
  const refs = useRef({})
  const [focoId, setFocoId] = useState(null)
  const [numero, setNumero] = useState('')
  const [erro, setErro] = useState('')

  const livres = useMemo(
    () => portas.filter((porta) => estaLivre(porta)),
    [portas, estaLivre]
  )

  function sufixoDaPorta(porta) {
    if (porta.sfp) return ' (SFP)'
    if (porta.lado) return ` (${ROTULO_LADO[porta.lado]})`
    return ''
  }

  function focarBotao(porta) {
    const botao = refs.current[porta.id]
    if (!botao) return
    botao.focus()
    botao.scrollIntoView({ block: 'nearest', inline: 'nearest' })
  }

  // Setas navegam entre as portas livres (roving tabindex); Enter/Espaço
  // selecionam (comportamento nativo do botão)
  function aoTeclar(event, porta) {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return
    event.preventDefault()
    if (livres.length === 0) return
    let alvo = null
    if (event.key === 'Home') alvo = livres[0]
    else if (event.key === 'End') alvo = livres[livres.length - 1]
    else {
      const indice = livres.findIndex((p) => p.id === porta.id)
      const novo =
        event.key === 'ArrowRight' ? indice + 1 : indice - 1
      alvo = livres[(novo + livres.length) % livres.length]
    }
    if (alvo) focarBotao(alvo)
  }

  // Digitação rápida: número + Enter seleciona a porta quando livre
  function irParaPortaDigitada(event) {
    if (event.key !== 'Enter') return
    event.preventDefault()
    const n = Number(numero)
    if (!n) {
      setErro('Digite o número de uma porta.')
      return
    }
    const alvo = portas.find((porta) => porta.numero === n)
    if (!alvo) {
      setErro(`Não existe porta ${n} neste equipamento.`)
      return
    }
    if (!estaLivre(alvo)) {
      setErro(`Porta ${n} está ocupada — ${rotuloOcupada(alvo)}.`)
      return
    }
    setErro('')
    aoSelecionar(alvo)
    focarBotao(alvo)
  }

  // Primeira porta livre diferente da atual (avança a cada clique)
  function usarProximaLivre() {
    const alvo = livres.find((p) => p.id !== selecaoId) || livres[0]
    if (!alvo) return
    setErro('')
    aoSelecionar(alvo)
    focarBotao(alvo)
  }

  const idTabInicial =
    selecaoId && portas.some((p) => p.id === selecaoId && estaLivre(p))
      ? selecaoId
      : livres[0]?.id || null
  const idTab = focoId || idTabInicial

  return (
    <div className="vinculo-grade">
      {rotulo && <p className="vinculo-rotulo">{rotulo}</p>}
      <div className="vinculo-atalhos">
        <input
          type="number"
          className="campo-input vinculo-input-numero"
          aria-label={`Número da porta — digite e pressione Enter (${titulo})`}
          placeholder="Nº + Enter"
          min="1"
          value={numero}
          onChange={(event) => {
            setNumero(event.target.value)
            setErro('')
          }}
          onKeyDown={irParaPortaDigitada}
        />
        <button
          type="button"
          className="vinculo-btn"
          onClick={usarProximaLivre}
          disabled={livres.length === 0}
        >
          <ZapIcon size={14} />
          Usar próxima porta livre
        </button>
      </div>
      {livres.length === 0 && (
        <p className="painel-nota">Nenhuma porta livre neste equipamento.</p>
      )}
      <div className="vinculo-portas" role="group" aria-label={titulo}>
        {portas.map((porta) => {
          const livre = estaLivre(porta)
          const selecionada = porta.id === selecaoId
          const sufixo = sufixoDaPorta(porta)
          const motivo = livre ? '' : rotuloOcupada(porta)
          return (
            <button
              key={porta.id}
              type="button"
              ref={(el) => {
                if (el) refs.current[porta.id] = el
                else delete refs.current[porta.id]
              }}
              className={`vinculo-porta${selecionada ? ' selecionada' : ''}${
                livre ? '' : ' ocupada'
              }${porta.sfp ? ' sfp' : ''}`}
              disabled={!livre}
              title={
                livre
                  ? undefined
                  : `Porta ${porta.numero}${sufixo} — ${motivo}`
              }
              aria-label={
                selecionada
                  ? `Porta ${porta.numero}${sufixo} (selecionada)`
                  : livre
                    ? `Porta ${porta.numero}${sufixo}`
                    : `Porta ${porta.numero}${sufixo} — ${motivo}`
              }
              aria-pressed={selecionada}
              tabIndex={porta.id === idTab ? 0 : -1}
              onClick={() => {
                setErro('')
                aoSelecionar(porta)
              }}
              onFocus={() => setFocoId(porta.id)}
              onKeyDown={(event) => aoTeclar(event, porta)}
            >
              {porta.numero}
            </button>
          )
        })}
      </div>
      {erro && (
        <p className="vinculo-erro" role="alert">
          {erro}
        </p>
      )}
    </div>
  )
}

// ---------- Seletor em duas etapas (equipamento → porta) ----------

function contarLivres(equipamento, estaLivre) {
  const lista =
    equipamento.tipo === 'patch_panel'
      ? portasComuns(equipamento)
      : equipamento.portas || []
  return lista.filter((porta) => estaLivre(porta)).length
}

function totalPortas(equipamento) {
  const lista =
    equipamento.tipo === 'patch_panel'
      ? portasComuns(equipamento)
      : equipamento.portas || []
  return lista.length
}

export default function SeletorVinculo({
  sala,
  equipamento,
  porta,
  valor,
  aoAlterar,
}) {
  const alvoPatchPanel = equipamento.tipo === 'switch'
  const candidatos = alvoPatchPanel
    ? listarPatchPanels(sala)
    : listarSwitches(sala)
  const [trocando, setTrocando] = useState(false)
  const [equipamentoId, setEquipamentoId] = useState(
    () => valor?.equipamentoId || ''
  )
  const [busca, setBusca] = useState('')

  // Livre = sem vínculo, exceto o espelho da própria porta em edição
  // (regra "uma mesma porta/lado não pode ter dois vínculos")
  function estaLivre(candidata) {
    return !candidata.vinculo || candidata.vinculo.portaId === porta.id
  }

  function motivoOcupada(candidata) {
    const vinculo = descricaoVinculo(sala, candidata)
    return vinculo ? `ligada a ${vinculo}` : 'em uso'
  }

  const unico = candidatos.length === 1
  const equipamentoAlvo = unico
    ? candidatos[0]
    : candidatos.find((item) => item.id === equipamentoId) || null

  const filtrados = useMemo(() => {
    const termo = busca.trim().toLowerCase()
    if (!termo) return candidatos
    return candidatos.filter((item) =>
      `${item.nome} ${item.modelo || ''}`
        .toLowerCase()
        .includes(termo)
    )
  }, [candidatos, busca])

  const portasAlvo = useMemo(() => {
    if (!equipamentoAlvo) return []
    const lista =
      equipamentoAlvo.tipo === 'patch_panel'
        ? portasComuns(equipamentoAlvo)
        : [...(equipamentoAlvo.portas || [])].sort(
            (a, b) => a.numero - b.numero
          )
    return lista
  }, [equipamentoAlvo])

  const achado = valor
    ? buscarPortaVinculada(sala, { vinculo: valor })
    : null
  const mostraResumo = Boolean(valor) && !trocando

  function selecionarPortaAlvo(portaEscolhida) {
    setTrocando(false)
    aoAlterar({
      equipamentoId: equipamentoAlvo.id,
      portaId: portaEscolhida.id,
    })
  }

  if (candidatos.length === 0) {
    return (
      <p className="painel-nota">
        {alvoPatchPanel
          ? 'Nenhum patch panel nesta sala. Cadastre um na aba Racks da sala.'
          : 'Nenhum switch nesta sala. Cadastre um na aba Racks da sala.'}
      </p>
    )
  }

  if (mostraResumo) {
    return (
      <div className="vinculo-resumo">
        <span className="vinculo-resumo-icone" aria-hidden="true">
          {achado?.equipamento?.tipo === 'switch' ? (
            <SwitchIcon size={16} />
          ) : (
            <PatchPanelIcon size={16} />
          )}
        </span>
        <div className="vinculo-resumo-texto">
          {achado?.porta ? (
            <>
              <strong>{achado.equipamento.nome}</strong>
              <span>
                Porta {achado.porta.numero}
                {achado.porta.lado
                  ? ` (${ROTULO_LADO[achado.porta.lado]})`
                  : ''}
              </span>
            </>
          ) : (
            <>
              <strong>Vínculo indisponível</strong>
              <span>O equipamento ou a porta vinculada não existe mais.</span>
            </>
          )}
        </div>
        <div className="vinculo-resumo-acoes">
          {achado?.porta && (
            <button
              type="button"
              className="vinculo-btn"
              onClick={() => setTrocando(true)}
            >
              Trocar
            </button>
          )}
          <button
            type="button"
            className="vinculo-btn perigo"
            onClick={() => {
              setTrocando(false)
              aoAlterar(null)
            }}
          >
            Remover vínculo
          </button>
        </div>
      </div>
    )
  }

  const notaLado = alvoPatchPanel
    ? 'A porta do switch conecta pela FRENTE do patch panel (lado do switch), por patch cord.'
    : 'A frente do patch panel conecta a uma porta do switch por patch cord.'

  return (
    <div className="vinculo-seletor">
      <p className="painel-nota">{notaLado}</p>

      {candidatos.length > 1 && !equipamentoAlvo && (
        <div className="vinculo-equip">
          <div className="vinculo-equip-busca">
            <SearchIcon size={14} />
            <input
              type="text"
              className="campo-input"
              aria-label="Buscar equipamento por nome ou modelo"
              placeholder="Buscar por nome ou modelo"
              value={busca}
              onChange={(event) => setBusca(event.target.value)}
            />
          </div>
          {filtrados.length === 0 && (
            <p className="painel-nota">Nenhum equipamento encontrado.</p>
          )}
          <ul className="vinculo-equip-lista">
            {filtrados.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  className="vinculo-equip-card"
                  onClick={() => setEquipamentoId(item.id)}
                >
                  <span className="vinculo-equip-icone" aria-hidden="true">
                    {item.tipo === 'patch_panel' ? (
                      <PatchPanelIcon size={15} />
                    ) : (
                      <SwitchIcon size={15} />
                    )}
                  </span>
                  <span className="vinculo-equip-info">
                    <strong>{item.nome}</strong>
                    <span>
                      {contarLivres(item, estaLivre)} de {totalPortas(item)}{' '}
                      portas livres
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {equipamentoAlvo && (
        <>
          <div className="vinculo-cabecalho">
            <strong>
              <span className="vinculo-cabecalho-icone" aria-hidden="true">
                {equipamentoAlvo.tipo === 'patch_panel' ? (
                  <PatchPanelIcon size={15} />
                ) : (
                  <SwitchIcon size={15} />
                )}
              </span>
              {equipamentoAlvo.nome}
            </strong>
            <span className="vinculo-cabecalho-acoes">
              {candidatos.length > 1 && (
                <button
                  type="button"
                  className="vinculo-btn"
                  onClick={() => setEquipamentoId('')}
                >
                  Trocar equipamento
                </button>
              )}
              {valor && (
                <button
                  type="button"
                  className="vinculo-btn"
                  onClick={() => setTrocando(false)}
                >
                  Cancelar
                </button>
              )}
            </span>
          </div>
          <GradePortasVinculo
            titulo={`Portas de ${equipamentoAlvo.nome}`}
            rotulo={
              alvoPatchPanel
                ? 'Escolha a porta da frente do patch panel'
                : 'Escolha a porta do switch'
            }
            portas={portasAlvo}
            selecaoId={valor?.portaId || null}
            estaLivre={estaLivre}
            rotuloOcupada={motivoOcupada}
            aoSelecionar={selecionarPortaAlvo}
          />
        </>
      )}
    </div>
  )
}
