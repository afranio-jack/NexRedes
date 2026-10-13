// Faixa visual de portas:
// - modo "switch": duas fileiras (ímpares em cima, pares embaixo), portas
//   SFP/uplink separadas à direita pela divisória tracejada, rótulos de
//   dispositivo acima e abaixo, ligados à porta por uma linha fina.
// - modo "patch_panel": uma única fileira horizontal (quebra em duas quando
//   há mais de 26 portas), rótulos acima das portas conectadas.
//
// O tamanho de cada porta é calculado a partir da largura disponível do card
// (ResizeObserver): quadrado entre 40 e 72 px, centralizado quando sobra
// espaço; se o mínimo não couber, o conjunto rola na horizontal.

import { Fragment, forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react'
import Porta from './Porta'
import { calcularEstadoPorta } from '../../utils/racks'
import { estadoPortaInfo } from './opcoes'

const LIMITE_UNICA_FILEIRA = 26
const TAM_MINIMO = 40
const TAM_MAXIMO = 72
const GAP_COLUNA = 6
const LARGURA_SEPARADOR = 22 // divisória + margens

function RotuloCelula({ rotulo, baixo }) {
  if (!rotulo) return <span className="faixa-celula"></span>
  return (
    <span className="faixa-celula faixa-celula-rotulo">
      {baixo && <span className="rotulo-linha" aria-hidden="true"></span>}
      <span className="rotulo-corpo">
        {rotulo.Icone && <rotulo.Icone size={11} />}
        <span className="rotulo-nome" title={rotulo.title || rotulo.nome}>
          {rotulo.nome}
        </span>
      </span>
      {!baixo && <span className="rotulo-linha" aria-hidden="true"></span>}
    </span>
  )
}

const FaixaPortas = forwardRef(function FaixaPortas(
  {
    portas,
    modo,
    falhas = [],
    selecionadaId,
    estadoFiltro,
    onClicarPorta,
    rotuloDaPorta,
    linhasDaPorta,
    titulo = 'Portas',
  },
  ref
) {
  const refs = useRef({})
  const wrapRef = useRef(null)
  const [focoId, setFocoId] = useState(null)
  const [portaTam, setPortaTam] = useState(46)

  const estrutura = useMemo(() => {
    if (modo === 'switch') {
      const comuns = portas.filter((p) => !p.sfp)
      const sfps = portas.filter((p) => p.sfp)
      const impares = comuns.filter((p) => p.numero % 2 === 1)
      const pares = comuns.filter((p) => p.numero % 2 === 0)
      const sfpCima = sfps.filter((_, i) => i % 2 === 0)
      const sfpBaixo = sfps.filter((_, i) => i % 2 === 1)
      return {
        fileiras: [
          {
            portas: [...impares, ...sfpCima],
            sepIndex: sfpCima.length > 0 ? impares.length : -1,
            rotulosBaixo: false,
          },
          {
            portas: [...pares, ...sfpBaixo],
            sepIndex: sfpBaixo.length > 0 ? pares.length : -1,
            rotulosBaixo: true,
          },
        ],
      }
    }
    const ordenadas = [...portas].sort((a, b) => a.numero - b.numero)
    if (ordenadas.length > LIMITE_UNICA_FILEIRA) {
      const metade = Math.ceil(ordenadas.length / 2)
      return {
        fileiras: [
          { portas: ordenadas.slice(0, metade), sepIndex: -1, rotulosBaixo: false },
          { portas: ordenadas.slice(metade), sepIndex: -1, rotulosBaixo: false },
        ],
      }
    }
    return {
      fileiras: [{ portas: ordenadas, sepIndex: -1, rotulosBaixo: false }],
    }
  }, [portas, modo])

  // Medidas para o cálculo do tamanho da porta
  const medidas = useMemo(() => {
    let colunas = 0
    let separadores = 0
    for (const fileira of estrutura.fileiras) {
      colunas = Math.max(colunas, fileira.portas.length)
      if (fileira.sepIndex >= 0) separadores = 1
    }
    return { colunas, separadores }
  }, [estrutura])

  // Porta quadrada que cresce com o card (mín. 40, máx. 72)
  useEffect(() => {
    const alvo = wrapRef.current
    if (!alvo) return
    function medir() {
      const { colunas, separadores } = medidas
      if (colunas <= 0) return
      const util = alvo.clientWidth - 16 // padding horizontal do wrap
      const fixos = separadores * LARGURA_SEPARADOR
      const lacunas = GAP_COLUNA * (colunas + separadores - 1)
      const calculado = Math.floor((util - fixos - lacunas) / colunas)
      setPortaTam(Math.min(TAM_MAXIMO, Math.max(TAM_MINIMO, calculado)))
    }
    medir()
    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', medir)
      return () => window.removeEventListener('resize', medir)
    }
    const observador = new ResizeObserver(medir)
    observador.observe(alvo)
    return () => observador.disconnect()
  }, [medidas])

  // Devolve o foco para a porta (usado ao fechar o painel lateral)
  useImperativeHandle(ref, () => ({
    focarPorta(portaId) {
      const botao = refs.current[portaId]?.querySelector('button')
      if (!botao) return false
      botao.focus()
      botao.scrollIntoView({
        block: 'nearest',
        inline: 'center',
        behavior: 'smooth',
      })
      return true
    },
  }))

  function aoTeclar(porta, event) {
    const { fileiras } = estrutura
    if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key))
      return
    event.preventDefault()
    let fileiraIdx = -1
    let coluna = -1
    fileiras.forEach((fileira, fi) => {
      const ci = fileira.portas.findIndex((p) => p.id === porta.id)
      if (ci !== -1) {
        fileiraIdx = fi
        coluna = ci
      }
    })
    if (fileiraIdx === -1) return
    let alvoFi = fileiraIdx
    let alvoCol = coluna
    if (event.key === 'ArrowLeft') alvoCol = Math.max(0, coluna - 1)
    else if (event.key === 'ArrowRight')
      alvoCol = Math.min(fileiras[fileiraIdx].portas.length - 1, coluna + 1)
    else if (event.key === 'ArrowUp') alvoFi = Math.max(0, fileiraIdx - 1)
    else
      alvoFi = Math.min(fileiras.length - 1, fileiraIdx + 1)
    const fileiraAlvo = fileiras[alvoFi]
    const alvo = fileiraAlvo.portas[
      Math.min(alvoCol, fileiraAlvo.portas.length - 1)
    ]
    if (alvo && alvo.id !== porta.id) {
      refs.current[alvo.id]?.querySelector('button')?.focus()
    }
  }

  function renderCelulas(fileira, comRotulo, baixo) {
    return fileira.portas.map((porta, ci) => {
      const estado = calcularEstadoPorta(porta, falhas)
      const info = estadoPortaInfo(estado)
      const primeira =
        estrutura.fileiras[0].portas[0]?.id === porta.id
      const apagada = estadoFiltro ? estado !== estadoFiltro : false
      return (
        <Fragment key={porta.id}>
          {fileira.sepIndex === ci && (
            <span className="faixa-sep" aria-hidden="true"></span>
          )}
          {comRotulo ? (
            <RotuloCelula
              rotulo={rotuloDaPorta ? rotuloDaPorta(porta) : null}
              baixo={baixo}
            />
          ) : (
            <span
              className="faixa-celula"
              data-porta-id={porta.id}
              ref={(el) => {
                if (el) refs.current[porta.id] = el
                else delete refs.current[porta.id]
              }}
            >
              <Porta
                porta={porta}
                numero={porta.numero}
                estadoInfo={info}
                selecionada={porta.id === selecionadaId}
                apagada={apagada}
                linhasTooltip={linhasDaPorta ? linhasDaPorta(porta) : undefined}
                tabIndex={
                  porta.id === focoId || (!focoId && primeira) ? 0 : -1
                }
                aoClicar={onClicarPorta}
                aoFocar={(p) => setFocoId(p.id)}
                aoTeclar={aoTeclar}
              />
            </span>
          )}
        </Fragment>
      )
    })
  }

  return (
    <div className="faixa-wrap" ref={wrapRef}>
      <div
        className="faixa-portas"
        role="group"
        aria-label={titulo}
        style={{ '--porta-tam': `${portaTam}px` }}
      >
        {estrutura.fileiras.map((fileira, fi) => (
          <Fragment key={fi}>
            {!fileira.rotulosBaixo && (
              <div className="faixa-fileira">
                {renderCelulas(fileira, true, false)}
              </div>
            )}
            <div className="faixa-fileira faixa-fileira-portas">
              {renderCelulas(fileira, false)}
            </div>
            {fileira.rotulosBaixo && (
              <div className="faixa-fileira">
                {renderCelulas(fileira, true, true)}
              </div>
            )}
          </Fragment>
        ))}
      </div>
    </div>
  )
})

export default FaixaPortas
