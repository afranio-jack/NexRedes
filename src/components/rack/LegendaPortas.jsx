// Legenda de cores das portas: cor + ícone + explicação + contagem.
// Clicável — filtra a tabela pelo estado clicado.

import { ESTADOS_PORTA } from './opcoes'

export default function LegendaPortas({
  contagens = {},
  filtroEstado,
  onFiltrarEstado,
}) {
  return (
    <div
      className="legenda-portas"
      role="group"
      aria-label="Legenda de estados (clique em um estado para filtrar a tabela)"
    >
      {ESTADOS_PORTA.map((estado) => {
        const filtroId = `est-${estado.id}`
        const ativo = filtroEstado === filtroId
        return (
          <button
            key={estado.id}
            type="button"
            className={`legenda-item${ativo ? ' ativo' : ''}`}
            aria-pressed={ativo}
            title={`${estado.descricao} — clique para filtrar`}
            onClick={() => onFiltrarEstado(ativo ? null : filtroId)}
          >
            <span
              className="legenda-quadro"
              style={{
                background: estado.cor,
                borderColor: estado.borda,
                color: estado.iconeFundo,
              }}
              aria-hidden="true"
            >
              <estado.Icone size={10} />
            </span>
            <span className="legenda-texto">{estado.descricao}</span>
            <strong className="legenda-contagem">
              {contagens[estado.id] || 0}
            </strong>
          </button>
        )
      })}
    </div>
  )
}
