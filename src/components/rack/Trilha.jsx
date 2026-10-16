// Trilha de navegação (Salas › Sala › Rack › Equipamento)

import { ChevronRightIcon } from '../icons'

export default function Trilha({ itens }) {
  return (
    <nav className="trilha" aria-label="Trilha de navegação">
      {itens.map((item, index) => {
        const atual = index === itens.length - 1
        return (
          <span key={`${item.label}-${index}`} className="trilha-parte">
            {index > 0 && (
              <ChevronRightIcon size={14} className="trilha-seta" />
            )}
            {item.onClick ? (
              <button
                type="button"
                className="trilha-link"
                onClick={item.onClick}
              >
                {item.Icone && <item.Icone size={14} />}
                {item.label}
              </button>
            ) : (
              <span
                className={atual ? 'trilha-atual' : 'trilha-texto'}
                aria-current={atual ? 'page' : undefined}
              >
                {item.label}
              </span>
            )}
          </span>
        )
      })}
    </nav>
  )
}
