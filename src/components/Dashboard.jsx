import { useEffect, useMemo, useState } from 'react'
import {
  NetworkIcon,
  SearchIcon,
  BellIcon,
  ChevronDownIcon,
  HomeIcon,
  ServerIcon,
  ChartIcon,
  GearIcon,
  PlusIcon,
  SortIcon,
  LogoutIcon,
} from './icons'
import RoomCard from './RoomCard'
import Toast from './Toast'
import SalaModal from './sala/SalaModal'
import SalaDetalhe from './sala/SalaDetalhe'
import ConfirmDialog from './sala/ConfirmDialog'
import Redes from './redes/Redes'
import Configuracoes from './Configuracoes'
import './Dashboard.css'
import {
  listarSalas,
  criarSala,
  editarSala,
  excluirSala,
} from '../utils/salas'
import { analisarRota, navegar } from '../utils/rotas'

const NAV_ITEMS = [
  { id: 'projetos', label: 'Projetos', Icon: HomeIcon },
  { id: 'redes', label: 'Redes', Icon: NetworkIcon },
  { id: 'equipamentos', label: 'Equipamentos', Icon: ServerIcon },
  { id: 'relatorios', label: 'Relatórios', Icon: ChartIcon },
  { id: 'configuracoes', label: 'Configurações', Icon: GearIcon },
]

// Itens da sidebar com página própria (Equipamentos e Relatórios continuam
// sem página, como hoje)
const VISTAS_NAVEGAVEIS = {
  projetos: () => navegar('/'),
  redes: () => navegar('/redes/pontos'),
  configuracoes: () => navegar('/configuracoes'),
}

export default function Dashboard({ user, onLogout }) {
  const [salas, setSalas] = useState(() => listarSalas())
  const [busca, setBusca] = useState('')
  const [ordem, setOrdem] = useState('az')
  const [menuAberto, setMenuAberto] = useState(false)
  const [modal, setModal] = useState(null) // null | { sala: Sala | null }
  const [salaAbertaId, setSalaAbertaId] = useState(null)
  const [salaParaExcluir, setSalaParaExcluir] = useState(null)
  const [toast, setToast] = useState(null)
  const [destaqueId, setDestaqueId] = useState(null)
  // Roteamento mínimo: a vista vem da URL e o botão voltar/avançar funciona
  const [rota, setRota] = useState(() => analisarRota() || { vista: 'projetos' })
  // Foco transitório ao abrir a sala vindo da cadeia de um ponto
  const [focoSala, setFocoSala] = useState(null) // { rackId, equipamentoId, portaId }
  // Pré-seleção do gerador de etiquetas (vinda das páginas de equipamento)
  const [presetEtiquetas, setPresetEtiquetas] = useState(null)

  useEffect(() => {
    function aoNavegar() {
      setRota(analisarRota() || { vista: 'projetos' })
    }
    window.addEventListener('popstate', aoNavegar)
    return () => window.removeEventListener('popstate', aoNavegar)
  }, [])

  const vista = rota.vista

  // A página da sala é derivada do id, então ela se atualiza após editar
  const salaAberta = salas.find((sala) => sala.id === salaAbertaId) || null

  // Busca por nome, código, prédio ou equipamento + ordenação pt-BR
  const salasVisiveis = useMemo(() => {
    const termo = busca.trim().toLowerCase()
    const filtradas = termo
      ? salas.filter(
          (sala) =>
            sala.nome.toLowerCase().includes(termo) ||
            (sala.codigo || '').toLowerCase().includes(termo) ||
            (sala.predio || '').toLowerCase().includes(termo) ||
            (sala.equipamentos || []).some((equipamento) =>
              (equipamento.nome || '').toLowerCase().includes(termo)
            )
        )
      : salas
    const ordenadas = [...filtradas]
    if (ordem === 'machines') {
      ordenadas.sort(
        (a, b) => (b.quantidadeMaquinas || 0) - (a.quantidadeMaquinas || 0)
      )
    } else {
      const direcao = ordem === 'za' ? -1 : 1
      ordenadas.sort(
        (a, b) => direcao * a.nome.localeCompare(b.nome, 'pt-BR')
      )
    }
    return ordenadas
  }, [salas, busca, ordem])

  function abrirNovaSala() {
    setModal({ sala: null })
  }

  function abrirEdicao(sala) {
    setModal({ sala })
  }

  function salvarSala(dados) {
    if (modal?.sala) {
      editarSala(modal.sala.id, dados)
      setToast('Sala atualizada com sucesso')
    } else {
      const nova = criarSala(dados)
      setToast('Sala criada com sucesso')
      setDestaqueId(nova.id)
      window.setTimeout(() => setDestaqueId(null), 2500)
    }
    setSalas(listarSalas())
    setModal(null)
  }

  function confirmarExclusao() {
    if (!salaParaExcluir) return
    excluirSala(salaParaExcluir.id)
    setSalas(listarSalas())
    if (salaAbertaId === salaParaExcluir.id) setSalaAbertaId(null)
    setSalaParaExcluir(null)
  }

  function recarregar() {
    setSalas(listarSalas())
  }

  function irParaVista(idVista) {
    // "Projetos" na sidebar sempre volta para a grade de salas
    if (idVista === 'projetos') setSalaAbertaId(null)
    VISTAS_NAVEGAVEIS[idVista]?.()
  }

  // Abre a página da sala, podendo já destacar um equipamento/porta
  // (usado pelos links da cadeia de conexão do ponto)
  function abrirSalaComFoco(salaId, { rackId, equipamentoId, portaId } = {}) {
    setSalaAbertaId(salaId)
    setFocoSala(
      equipamentoId
        ? { rackId, equipamentoId, portaId: portaId || null }
        : null
    )
    navegar('/')
  }

  function abrirPonto(pontoId) {
    navegar(`/redes/pontos/${encodeURIComponent(pontoId)}`)
  }

  // Botão "Gerar etiqueta" das páginas de switch/patch panel: abre a sub-aba
  // Etiquetas já com o tipo e o equipamento pré-selecionados
  function gerarEtiquetasDeEquipamento(sala, equipamento) {
    setPresetEtiquetas({
      tipo:
        equipamento.tipo === 'switch'
          ? 'portas_switch'
          : 'portas_patch_panel',
      salaId: sala.id,
      equipamentoId: equipamento.id,
    })
    navegar('/redes/etiquetas')
  }

  // Botão "Gerar etiqueta" da página do ponto
  function gerarEtiquetasDoPonto(pontoId) {
    setPresetEtiquetas({ tipo: 'pontos', pontoId })
    navegar('/redes/etiquetas')
  }

  const termoBusca = busca.trim()

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
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            aria-label="Pesquisar sala, equipamento ou setor"
          />
        </div>

        <div className="topbar-actions">
          {vista === 'projetos' && (
            <button type="button" className="btn-new" onClick={abrirNovaSala}>
              <PlusIcon size={16} />
              Nova sala
            </button>
          )}
          <button type="button" className="bell-btn" aria-label="Notificações">
            <BellIcon size={20} />
            <span className="bell-dot" aria-hidden="true"></span>
          </button>
          <div className="avatar-wrap">
            <button
              type="button"
              className="avatar-btn"
              aria-haspopup="menu"
              aria-expanded={menuAberto}
              onClick={() => setMenuAberto((open) => !open)}
            >
              <span className="avatar-circle" aria-hidden="true">
                A
              </span>
              <ChevronDownIcon size={16} />
            </button>
            {menuAberto && (
              <>
                <div
                  className="menu-backdrop"
                  onClick={() => setMenuAberto(false)}
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
              className={`nav-item${vista === item.id ? ' active' : ''}`}
              aria-current={vista === item.id ? 'page' : undefined}
              onClick={() => irParaVista(item.id)}
            >
              <item.Icon size={20} />
              {item.label}
            </button>
          ))}
        </nav>
      </aside>

      {vista === 'redes' && (
        <Redes
          salas={salas}
          subaba={rota.subaba || 'pontos'}
          pontoId={rota.pontoId || null}
          onDadosAlterados={recarregar}
          onMostrarToast={setToast}
          onAbrirSalaFoco={abrirSalaComFoco}
          onGerarEtiquetasDoPonto={gerarEtiquetasDoPonto}
          presetEtiquetas={presetEtiquetas}
          onPresetConsumido={() => setPresetEtiquetas(null)}
        />
      )}

      {vista === 'configuracoes' && (
        <Configuracoes onMostrarToast={setToast} />
      )}

      {vista === 'projetos' &&
        (salaAberta ? (
          <SalaDetalhe
            sala={salaAberta}
            focoInicial={focoSala}
            onFocoConsumido={() => setFocoSala(null)}
            onVoltar={() => setSalaAbertaId(null)}
            onEditar={() => setModal({ sala: salaAberta })}
            onDadosAlterados={recarregar}
            onVerPonto={abrirPonto}
            onGerarEtiquetas={(equipamento) =>
              gerarEtiquetasDeEquipamento(salaAberta, equipamento)
            }
          />
        ) : (
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
                  value={ordem}
                  onChange={(e) => setOrdem(e.target.value)}
                >
                  <option value="az">Nome (A → Z)</option>
                  <option value="za">Nome (Z → A)</option>
                  <option value="machines">Mais máquinas</option>
                </select>
                <ChevronDownIcon size={16} className="sort-chevron" />
              </div>
            </div>

            <div className="room-grid">
              {salasVisiveis.map((sala) => (
                <RoomCard
                  key={sala.id}
                  sala={sala}
                  destaque={destaqueId === sala.id}
                  onAcessar={(s) => setSalaAbertaId(s.id)}
                  onEditar={abrirEdicao}
                  onExcluir={setSalaParaExcluir}
                />
              ))}

              {/* Cartão tracejado sempre como último item */}
              <button type="button" className="card-create" onClick={abrirNovaSala}>
                <span className="create-circle" aria-hidden="true">
                  <PlusIcon size={26} />
                </span>
                <h3>
                  {salas.length === 0
                    ? 'Criar sua primeira sala'
                    : 'Criar mais uma sala'}
                </h3>
                <p>
                  {salas.length === 0
                    ? 'Cadastre um ambiente para começar a organizar sua rede.'
                    : 'Adicione um novo ambiente para gerenciar sua rede.'}
                </p>
              </button>

              {termoBusca !== '' && salasVisiveis.length === 0 && (
                <div className="empty-state">
                  <SearchIcon size={28} />
                  <p>Nenhuma sala encontrada para “{termoBusca}”.</p>
                </div>
              )}
            </div>
          </main>
        ))}

      {modal && (
        <SalaModal
          sala={modal.sala}
          salasExistentes={salas}
          onFechar={() => setModal(null)}
          onSalvar={salvarSala}
        />
      )}

      {salaParaExcluir && (
        <ConfirmDialog
          titulo="Excluir sala"
          texto={`Tem certeza que deseja excluir “${salaParaExcluir.nome}”? Esta ação não pode ser desfeita.`}
          confirmarLabel="Excluir"
          perigo
          onConfirmar={confirmarExclusao}
          onCancelar={() => setSalaParaExcluir(null)}
        />
      )}

      <Toast mensagem={toast} onFechar={() => setToast(null)} />
    </div>
  )
}
