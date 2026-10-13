// Filtros rápidos da tabela de portas: chips com contagem + busca + limpar.

import { SearchIcon, XIcon } from '../icons'
import { FILTROS_RAPIDOS } from './opcoes'

export default function FiltrosPortas({
  contagens = {},
  filtro,
  onFiltro,
  busca,
  onBusca,
  onLimpar,
}) {
  const algoAtivo = filtro !== 'todas' || busca.trim() !== ''

  return (
    <div className="filtros-portas">
      <div className="filtros-chips" role="group" aria-label="Filtros rápidos">
        {FILTROS_RAPIDOS.map((item) => (
          <button
            key={item.id}
            type="button"
            className={`filtro-chip${filtro === item.id ? ' ativo' : ''}`}
            aria-pressed={filtro === item.id}
            onClick={() => onFiltro(item.id)}
          >
            {item.label}
            <strong>{contagens[item.id] || 0}</strong>
          </button>
        ))}
      </div>

      <div className="filtros-acoes">
        <div className="filtros-busca">
          <SearchIcon size={15} />
          <input
            type="text"
            placeholder="Buscar por nome, ponto, dispositivo ou VLAN"
            aria-label="Buscar portas por nome, ponto de rede, dispositivo ou VLAN"
            value={busca}
            onChange={(event) => onBusca(event.target.value)}
          />
          {busca && (
            <button
              type="button"
              className="filtros-limpar-busca"
              aria-label="Limpar busca"
              onClick={() => onBusca('')}
            >
              <XIcon size={14} />
            </button>
          )}
        </div>
        {algoAtivo && (
          <button
            type="button"
            className="filtros-limpar"
            onClick={onLimpar}
          >
            Limpar filtros
          </button>
        )}
      </div>
    </div>
  )
}
