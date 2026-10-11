import {
  MonitorIcon,
  AlertTriangleIcon,
  ClockIcon,
  ArrowRightIcon,
  MoreVerticalIcon,
} from './icons'

const STATUS = {
  operacional: { label: 'Operacional', className: 'st-ok' },
  atencao: { label: 'Atenção', className: 'st-warn' },
  critico: { label: 'Crítico', className: 'st-crit' },
}

export default function RoomCard({ room }) {
  const status = STATUS[room.status]
  const Icon = room.Icon

  return (
    <article className="room-card" style={{ '--room-color': room.color }}>
      <span className="room-strip" aria-hidden="true"></span>
      <button
        type="button"
        className="room-menu"
        aria-label={`Mais opções de ${room.name}`}
      >
        <MoreVerticalIcon size={18} />
      </button>
      <div className="room-head">
        <span className="room-icon" aria-hidden="true">
          <Icon size={22} />
        </span>
        <h3 className="room-name">{room.name}</h3>
      </div>
      <span className={`room-badge ${status.className}`}>
        <span className="badge-dot" aria-hidden="true"></span>
        {status.label}
      </span>
      <ul className="room-info">
        <li>
          <MonitorIcon size={16} />
          <span>{room.machines} máquinas</span>
        </li>
        <li>
          <AlertTriangleIcon size={16} />
          <span>{room.failures} falhas</span>
        </li>
        <li>
          <ClockIcon size={16} />
          <span>{room.lastCheck}</span>
        </li>
      </ul>
      <button type="button" className="room-access">
        Acessar
        <ArrowRightIcon size={16} />
      </button>
    </article>
  )
}
