import { useMemo, useState } from 'react'
import {
  NetworkIcon,
  SearchIcon,
  BellIcon,
  ChevronDownIcon,
  HomeIcon,
  ServerIcon,
  ChartIcon,
  GearIcon,
  BuildingIcon,
  DollarSignIcon,
  UsersIcon,
  UsersRoundIcon,
  PlusIcon,
  SortIcon,
  LogoutIcon,
} from './icons'
import RoomCard from './RoomCard'
import './Dashboard.css'

const NAV_ITEMS = [
  { id: 'projetos', label: 'Projetos', Icon: HomeIcon, active: true },
  { id: 'redes', label: 'Redes', Icon: NetworkIcon },
  { id: 'equipamentos', label: 'Equipamentos', Icon: ServerIcon },
  { id: 'relatorios', label: 'Relatórios', Icon: ChartIcon },
  { id: 'configuracoes', label: 'Configurações', Icon: GearIcon },
]

const ROOMS = [
  {
    id: 'lei-1',
    name: 'Lei 1',
    color: '#2563EB',
    Icon: BuildingIcon,
    status: 'operacional',
    machines: 45,
    failures: 3,
    lastCheck: 'Hoje, 14:32',
  },
  {
    id: 'lei-2',
    name: 'Lei 2',
    color: '#7C3AED',
    Icon: BuildingIcon,
    status: 'operacional',
    machines: 28,
    failures: 0,
    lastCheck: 'Ontem, 09:15',
  },
  {
    id: 'sala-hardware',
    name: 'Sala de hardware',
    color: '#F59E0B',
    Icon: ServerIcon,
    status: 'atencao',
    machines: 62,
    failures: 7,
    lastCheck: 'Hoje, 11:05',
  },
  {
    id: 'secretaria',
    name: 'Secretaria',
    color: '#EF4444',
    Icon: UsersIcon,
    status: 'critico',
    machines: 15,
    failures: 12,
    lastCheck: 'Há 3 dias',
  },
  {
    id: 'financeiro',
    name: 'Financeiro',
    color: '#16A34A',
    Icon: DollarSignIcon,
    status: 'operacional',
    machines: 45,
    failures: 3,
    lastCheck: 'Hoje, 14:32',
  },
  {
    id: 'coordenacao',
    name: 'Coordenação',
    color: '#7C3AED',
    Icon: UsersRoundIcon,
    status: 'operacional',
    machines: 28,
    failures: 0,
    lastCheck: 'Ontem, 09:15',
  },
]

export default function Dashboard({ user, onLogout }) {
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState('az')
  const [menuOpen, setMenuOpen] = useState(false)

  const rooms = useMemo(() => {
    const query = search.trim().toLowerCase()
    const filtered = query
      ? ROOMS.filter((room) => room.name.toLowerCase().includes(query))
      : ROOMS
    const sorted = [...filtered]
    if (sort === 'machines') {
      sorted.sort((a, b) => b.machines - a.machines)
    } else {
      const direction = sort === 'za' ? -1 : 1
      sorted.sort(
        (a, b) => direction * a.name.localeCompare(b.name, 'pt-BR')
      )
    }
    return sorted
  }, [search, sort])

  const query = search.trim()

  return (
    <div className="dash">
      <header className="dash-topbar">
        <div className="topbar-brand">
          <NetworkIcon size={26} />
          <span className="topbar-brand-name">NexRedes</span>
        </div>

        <div className="topbar-search">
          <SearchIcon size={18} />
          <input
            type="text"
            placeholder="Pesquisar sala, equipamento, setor..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Pesquisar sala, equipamento ou setor"
          />
        </div>

        <div className="topbar-actions">
          <button type="button" className="btn-new">
            <PlusIcon size={16} />
            Novo projeto
          </button>
          <button type="button" className="bell-btn" aria-label="Notificações">
            <BellIcon size={20} />
            <span className="bell-dot" aria-hidden="true"></span>
          </button>
          <div className="avatar-wrap">
            <button
              type="button"
              className="avatar-btn"
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen((open) => !open)}
            >
              <span className="avatar-circle" aria-hidden="true">
                A
              </span>
              <ChevronDownIcon size={16} />
            </button>
            {menuOpen && (
              <>
                <div
                  className="menu-backdrop"
                  onClick={() => setMenuOpen(false)}
                ></div>
                <div className="avatar-menu" role="menu">
                  <div className="menu-user">
                    <span className="avatar-circle" aria-hidden="true">
                      A
                    </span>
                    <span className="menu-user-info">
                      <span className="menu-user-name">{user.name}</span>
                      <span className="menu-user-handle">@{user.username}</span>
                    </span>
                  </div>
                  <div className="menu-divider"></div>
                  <button
                    type="button"
                    className="menu-item danger"
                    role="menuitem"
                    onClick={onLogout}
                  >
                    <LogoutIcon size={16} />
                    Sair
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </header>

      <aside className="dash-sidebar">
        <nav className="dash-nav" aria-label="Menu principal">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.id}
              type="button"
              className={`nav-item${item.active ? ' active' : ''}`}
              aria-current={item.active ? 'page' : undefined}
            >
              <item.Icon size={20} />
              {item.label}
            </button>
          ))}
        </nav>
      </aside>

      <main className="dash-main">
        <div className="main-header">
          <div>
            <h1>Projetos</h1>
            <p>Gerencie seus ambientes de rede e mantenha tudo organizado.</p>
          </div>
          <div className="sort-select">
            <SortIcon size={16} />
            <select
              aria-label="Ordenar projetos"
              value={sort}
              onChange={(e) => setSort(e.target.value)}
            >
              <option value="az">Nome (A → Z)</option>
              <option value="za">Nome (Z → A)</option>
              <option value="machines">Mais máquinas</option>
            </select>
            <ChevronDownIcon size={16} className="sort-chevron" />
          </div>
        </div>

        <div className="room-grid">
          {rooms.map((room) => (
            <RoomCard key={room.id} room={room} />
          ))}
          {query === '' && (
            <button type="button" className="card-create">
              <span className="create-circle" aria-hidden="true">
                <PlusIcon size={26} />
              </span>
              <h3>Criar mais uma sala</h3>
              <p>Adicione um novo ambiente para gerenciar sua rede.</p>
            </button>
          )}
          {rooms.length === 0 && (
            <div className="empty-state">
              <SearchIcon size={28} />
              <p>Nenhuma sala encontrada para “{query}”.</p>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
