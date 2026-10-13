// Porta visual: quadradinho colorido pelo estado calculado, com número
// dentro, mini ícone de estado (cor + ícone, nunca só cor) e tooltip.

import { useRef, useState } from 'react'

export default function Porta({
  porta,
  numero,
  estadoInfo,
  selecionada,
  apagada,
  tabIndex,
  linhasTooltip,
  aoClicar,
  aoFocar,
  aoTeclar,
}) {
  const refBotao = useRef(null)
  const [posicao, setPosicao] = useState(null)

  function abrirTooltip() {
    const alvo = refBotao.current
    if (!alvo) return
    const rect = alvo.getBoundingClientRect()
    const left = Math.min(
      Math.max(rect.left + rect.width / 2, 150),
      window.innerWidth - 150
    )
    // Perto do topo da janela mostra abaixo da porta, para não cortar
    const abaixo = rect.top < 130
    setPosicao({
      top: abaixo ? rect.bottom + 8 : rect.top - 8,
      left,
      abaixo,
    })
    aoFocar?.(porta)
  }

  function fecharTooltip() {
    setPosicao(null)
  }

  const linhas =
    linhasTooltip ||
    [
      `Porta ${numero}${porta.sfp ? ' (SFP)' : ''}${
        porta.lado ? ` — ${porta.lado}` : ''
      }`,
      porta.nome || null,
      estadoInfo.descricao,
    ].filter(Boolean)

  return (
    <span className="porta-wrap">
      <button
        ref={refBotao}
        type="button"
        className={`porta-visual porta-${estadoInfo.id}${
          selecionada ? ' selecionada' : ''
        }${apagada ? ' apagada' : ''}${porta.sfp ? ' porta-sfp' : ''}`}
        style={{ background: estadoInfo.cor, borderColor: estadoInfo.borda }}
        onClick={() => aoClicar?.(porta)}
        onMouseEnter={abrirTooltip}
        onMouseLeave={fecharTooltip}
        onFocus={abrirTooltip}
        onBlur={fecharTooltip}
        onKeyDown={(event) => aoTeclar?.(porta, event)}
        tabIndex={tabIndex}
        aria-label={linhas.join(' · ')}
        aria-pressed={selecionada || undefined}
      >
        <span className="porta-numero" aria-hidden="true">
          {numero}
        </span>
        <span
          className="porta-estado-icone"
          style={{
            background: estadoInfo.cor,
            borderColor: estadoInfo.id === 'livre' ? '#d1d5db' : '#fff',
            color: estadoInfo.iconeFundo,
          }}
          aria-hidden="true"
        >
          <estadoInfo.Icone size={9} />
        </span>
      </button>

      {posicao && (
        <span
          className={`porta-tooltip${posicao.abaixo ? ' abaixo' : ''}`}
          role="tooltip"
          style={{ top: posicao.top, left: posicao.left }}
        >
          {linhas.map((linha, index) => (
            <span key={index} className="porta-tooltip-linha">
              {linha}
            </span>
          ))}
        </span>
      )}
    </span>
  )
}
