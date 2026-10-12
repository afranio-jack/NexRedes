import { useState } from 'react'
import {
  MonitorIcon,
  AlertTriangleIcon,
  ClockIcon,
  ArrowRightIcon,
  MoreVerticalIcon,
  PencilIcon,
  TrashIcon,
} from './icons'
import {
  calcularStatus,
  contarFalhasAtivas,
  corDaSala,
  iconeSala,
} from '../utils/salas'
import { formatarDataRelativa } from '../utils/datas'
import { STATUS_SALA } from './sala/opcoes'

export default function RoomCard({
  sala,
  destaque,
  onAcessar,
  onEditar,
  onExcluir,
}) {
  const [menuAberto, setMenuAberto] = useState(false)

  const Icone = iconeSala(sala.icone)
  const status = calcularStatus(sala.falhas)
  const statusInfo = STATUS_SALA.find((item) => item.id === status)
  const falhasAtivas = contarFalhasAtivas(sala.falhas)
  const maquinas = sala.quantidadeMaquinas || 0

  function editar() {
    setMenuAberto(false)
    onEditar(sala)
  }

  function excluir() {
    setMenuAberto(false)
    onExcluir(sala)
  }

  return (
    <article
      className={`room-card${destaque ? ' destaque' : ''}`}
      style={{ '--room-color': corDaSala(sala.cor) }}
    >
      <span className="room-strip" aria-hidden="true"></span>

      <button
        type="button"
        className="room-menu"
        aria-label={`Mais opções de ${sala.nome}`}
        aria-haspopup="menu"
        aria-expanded={menuAberto}
        onClick={() => setMenuAberto((aberto) => !aberto)}
      >
        <MoreVerticalIcon size={18} />
      </button>

      {menuAberto && (
        <>
          <div
            className="menu-backdrop"
            onClick={() => setMenuAberto(false)}
          ></div>
          <div className="room-menu-drop" role="menu">
            <button
              type="button"
              role="menuitem"
              className="menu-item"
              onClick={editar}
            >
              <PencilIcon size={15} />
              Editar
            </button>
            <button
              type="button"
              role="menuitem"
              className="menu-item danger"
              onClick={excluir}
            >
              <TrashIcon size={15} />
              Excluir
            </button>
          </div>
        </>
      )}

      <div className="room-head">
        <span className="room-icon" aria-hidden="true">
          <Icone size={22} />
        </span>
        <h3 className="room-name">{sala.nome}</h3>
      </div>

      <span className={`room-badge ${statusInfo.className}`}>
        <span className="badge-dot" aria-hidden="true"></span>
        {statusInfo.label}
      </span>

      <ul className="room-info">
        <li>
          <MonitorIcon size={16} />
          <span>
            {maquinas} {maquinas === 1 ? 'máquina' : 'máquinas'}
          </span>
        </li>
        <li>
          <AlertTriangleIcon size={16} />
          <span>
            {falhasAtivas} {falhasAtivas === 1 ? 'falha' : 'falhas'}
          </span>
        </li>
        <li>
          <ClockIcon size={16} />
          <span>{formatarDataRelativa(sala.atualizadoEm)}</span>
        </li>
      </ul>

      <button
        type="button"
        className="room-access"
        onClick={() => onAcessar(sala)}
      >
        Acessar
        <ArrowRightIcon size={16} />
      </button>
    </article>
  )
}
