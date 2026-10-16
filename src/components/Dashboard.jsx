import { useEffect, useMemo, useState } from 'react'
import {
  NetworkIcon,
  SearchIcon,
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
import Equipamentos from './equipamentos/Equipamentos'
import Relatorios from './relatorios/Relatorios'
import Configuracoes from './Configuracoes'
import Notificacoes from './Notificacoes'
import './Dashboard.css'
import './Notificacoes.css'
import './aparencia.css'
import {
  listarSalas,
  criarSala,
  editarSala,
  excluirSala,
} from '../utils/salas'
import { analisarRota, navegar } from '../utils/rotas'
import { obterConfig, salvarConfig } from '../utils/etiquetas'
import { listarTestes } from '../utils/testes'

const NAV_ITEMS = [
  { id: 'projetos', label: 'Salas', Icon: HomeIcon },
  { id: 'redes', label: 'Redes', Icon: NetworkIcon },
  { id: 'equipamentos', label: 'Equipamentos', Icon: ServerIcon },
  { id: 'relatorios', label: 'Relatórios', Icon: ChartIcon },
  { id: 'configuracoes', label: 'Configurações', Icon: GearIcon },
]

// Itens da sidebar com página própria
const VISTAS_NAVEGAVEIS = {
  projetos: () => navegar('/'),
  redes: () => navegar('/redes/pontos'),
  equipamentos: () => navegar('/equipamentos'),
  relatorios: () => navegar('/relatorios'),
  configuracoes: () => navegar('/configuracoes'),
}

export default function Dashboard({ user, onLogout, onUsuarioAlterado }) {
  const [salas, setSalas] = useState(() => listarSalas())
  const [config, setConfig] = useState(() => obterConfig())
  const [testes, setTestes] = useState(() => listarTestes())
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
  // Foco transitório ao abrir a sala vindo da cadeia de um ponto ou da tela
  // Equipamentos ({ rackId } abre o rack; + equipamentoId/portaId vai além)
  const [focoSala, setFocoSala] = useState(null) // { rackId, equipamentoId, portaId }
  // Pré-seleção do gerador de etiquetas (vinda das páginas de equipamento,
  // da página/lote de pontos)
  const [presetEtiquetas, setPresetEtiquetas] = useState(null)

  useEffect(() => {
    function aoNavegar() {
      setRota(analisarRota() || { vista: 'projetos' })
    }
    window.addEventListener('popstate', aoNavegar)
    return () => window.removeEventListener('popstate', aoNavegar)
  }, [])

  const vista = rota.vista

  // Tela inicial ao entrar (Configurações → Aparência): aplicada quando o
  // app abre na raiz; depois a URL é soberana (voltar/avançar funcionam).
  useEffect(() => {
    if (window.location.pathname !== '/') return
    const destino = {
      redes: '/redes/pontos',
      relatorios: '/relatorios',
    }[config.aparencia.telaInicial]
    if (destino) navegar(destino)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Aparência (tema claro/escuro/automático, cor de destaque, tamanho da
  // fonte e densidade) aplicada no <html> conforme a configuração salva
  useEffect(() => {
    const { tema, corDestaque, tamanhoFonte, densidade } = config.aparencia
    const escuroPreferido = window.matchMedia(
      '(prefers-color-scheme: dark)'
    ).matches
    const escuro = tema === 'escuro' || (tema === 'auto' && escuroPreferido)
    const raiz = document.documentElement
    raiz.classList.toggle('tema-escuro', escuro)
    raiz.style.setProperty('--acento', corDestaque || '')
    raiz.classList.toggle('fonte-pequena', tamanhoFonte === 'pequena')
    raiz.classList.toggle('fonte-grande', tamanhoFonte === 'grande')
    raiz.classList.toggle('densidade-compacta', densidade === 'compacta')
  }, [config.aparencia])

  // "Automático" reage à mudança de tema do sistema
  useEffect(() => {
    const consulta = window.matchMedia('(prefers-color-scheme: dark)')
    function aoMudarTema() {
      if (obterConfig().aparencia.tema === 'auto') {
        document.documentElement.classList.toggle(
          'tema-escuro',
          consulta.matches
        )
      }
    }
    consulta.addEventListener('change', aoMudarTema)
    return () => consulta.removeEventListener('change', aoMudarTema)
  }, [])

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
    recarregar()
    if (salaAbertaId === salaParaExcluir.id) setSalaAbertaId(null)
    setSalaParaExcluir(null)
  }

  function recarregar() {
    setSalas(listarSalas())
    setConfig(obterConfig())
    setTestes(listarTestes())
  }

  function irParaVista(idVista) {
    // "Salas" na sidebar sempre volta para a grade de salas
    if (idVista === 'projetos') setSalaAbertaId(null)
    VISTAS_NAVEGAVEIS[idVista]?.()
  }

  // Abre a página da sala, podendo já destacar um rack, equipamento ou porta
  // (usado pelos links da cadeia de conexão do ponto e pela tela Equipamentos)
  function abrirSalaComFoco(salaId, { rackId, equipamentoId, portaId } = {}) {
    setSalaAbertaId(salaId)
    setFocoSala(
      equipamentoId
        ? { rackId, equipamentoId, portaId: portaId || null }
        : rackId
          ? { rackId, equipamentoId: null, portaId: null }
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

  // Botão "Gerar etiqueta" da página do ponto (um) e da seleção em lote
  function gerarEtiquetasDoPonto(pontoId) {
    setPresetEtiquetas({ tipo: 'pontos', pontoId })
    navegar('/redes/etiquetas')
  }

  function gerarEtiquetasDePontos(pontoIds) {
    setPresetEtiquetas({ tipo: 'pontos', pontoIds })
    navegar('/redes/etiquetas')
  }

  // Clique numa notificação do sino → navega até o alvo
  function abrirDestinoNotificacao(destino) {
    if (!destino) return
    if (destino.tipo === 'sala') {
      abrirSalaComFoco(destino.salaId)
    } else if (destino.tipo === 'ponto') {
      abrirPonto(destino.pontoId)
    } else if (destino.tipo === 'equipamentos') {
      navegar('/equipamentos')
    }
  }

  // Alternância rápida do "silenciar" do sino (Configurações → Notificações)
  function alternarSilenciarNotificacoes() {
    const atual = obterConfig()
    salvarConfig({
      ...atual,
      notificacoes: {
        ...atual.notificacoes,
        silenciar: !atual.notificacoes.silenciar,
      },
    })
    setConfig(obterConfig())
  }

  const termoBusca = busca.trim()
  const inicial = (user.name || user.username || 'U').charAt(0).toUpperCase()
  const fotoPerfil = config.conta.foto || ''

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
          <Notificacoes
            salas={salas}
            testes={testes}
            config={config}
            onAbrirDestino={abrirDestinoNotificacao}
            onSilenciar={alternarSilenciarNotificacoes}
          />
          <div className="avatar-wrap">
            <button
              type="button"
              className="avatar-btn"
              aria-haspopup="menu"
              aria-expanded={menuAberto}
              onClick={() => setMenuAberto((open) => !open)}
            >
              <span className="avatar-circle" aria-hidden="true">
                {fotoPerfil ? (
                  <img src={fotoPerfil} alt="" />
                ) : (
                  inicial
                )}
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
                      {fotoPerfil ? (
                        <img src={fotoPerfil} alt="" />
                      ) : (
                        inicial
                      )}
                    </span>
                    <span className="menu-user-info">
                      <span className="menu-user-name">{user.name}</span>
                      <span className="menu-user-handle">@{user.username}</span>
                    </span>
                  </div>
                  <div className="menu-divider"></div>
                  <button
                    type="button"
                    className="menu-item"
                    role="menuitem"
                    onClick={() => {
                      setMenuAberto(false)
                      navegar('/configuracoes')
                    }}
                  >
                    <GearIcon size={16} />
                    Configurações
                  </button>
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
          onGerarEtiquetasLote={gerarEtiquetasDePontos}
          presetEtiquetas={presetEtiquetas}
          onPresetConsumido={() => setPresetEtiquetas(null)}
        />
      )}

      {vista === 'equipamentos' && (
        <Equipamentos
          salas={salas}
          onDadosAlterados={recarregar}
          onMostrarToast={setToast}
          onAbrirSalaFoco={abrirSalaComFoco}
        />
      )}

      {vista === 'relatorios' && (
        <Relatorios salas={salas} onMostrarToast={setToast} />
      )}

      {vista === 'configuracoes' && (
        <Configuracoes
          user={user}
          salas={salas}
          onLogout={onLogout}
          onMostrarToast={setToast}
          onUsuarioAlterado={onUsuarioAlterado}
          onDadosAlterados={recarregar}
          onConfigAlterado={() => setConfig(obterConfig())}
        />
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
                <h1>Gerenciamento de Salas</h1>
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
