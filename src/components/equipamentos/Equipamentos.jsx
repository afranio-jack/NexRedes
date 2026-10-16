// Página "Equipamentos" (/equipamentos): inventário unificado de switches,
// patch panels e racks das salas + máquinas/dispositivos associados.
// Sub-abas Todos | Switches | Patch panels | Racks | Máquinas | Outros,
// cartões-resumo (total, em operação, em manutenção, com falha), busca e
// filtros (sala, tipo, status), tabela com menu "⋮" (editar, duplicar,
// excluir) e cadastro/edição em painel lateral. Clicar num switch ou patch
// panel abre a página já existente dele dentro da sala; clicar num rack
// abre a página do rack.

import { useEffect, useMemo, useState } from 'react'
import {
  SearchIcon,
  PlusIcon,
  MoreVerticalIcon,
  PencilIcon,
  CopyIcon,
  TrashIcon,
  ServerIcon,
  RackIcon,
  SwitchIcon,
  PatchPanelIcon,
  MonitorIcon,
  BoxIcon,
  CheckCircleIcon,
  WrenchIcon,
  XCircleIcon,
} from '../icons'
import ConfirmDialog from '../sala/ConfirmDialog'
import EquipamentoForm from './EquipamentoForm'
import './equipamentos.css'
import '../redes/redes.css'
import {
  montarInventario,
  abaDaLinha,
  infoStatus,
  duplicarEquipamentoRack,
  duplicarEquipamentoAssociado,
  excluirEquipamentoAssociado,
} from '../../utils/equipamentos'
import {
  excluirEquipamento,
  excluirRack,
  criarRack,
  impactosExclusaoEquipamento,
} from '../../utils/racks'
import { obterConfig } from '../../utils/etiquetas'
import { formatarDataRelativa } from '../../utils/datas'

const SUBABAS = [
  { id: 'todos', label: 'Todos' },
  { id: 'switches', label: 'Switches' },
  { id: 'patch_panels', label: 'Patch panels' },
  { id: 'racks', label: 'Racks' },
  { id: 'maquinas', label: 'Máquinas' },
  { id: 'outros', label: 'Outros' },
]

const TIPO_ICONE = {
  Switch: SwitchIcon,
  'Patch panel': PatchPanelIcon,
  Rack: RackIcon,
  Máquina: MonitorIcon,
  Roteador: BoxIcon,
  'Access point': BoxIcon,
  Servidor: ServerIcon,
  Outro: BoxIcon,
}

function SeloStatus({ status, statusConfig }) {
  if (!status) return <span className="equip-status neutro">—</span>
  const info = infoStatus(status, statusConfig)
  return (
    <span className="equip-status" style={{ '--status-cor': info.cor }}>
      <span className="equip-status-dot" aria-hidden="true"></span>
      {info.nome}
    </span>
  )
}

export default function Equipamentos({
  salas,
  onDadosAlterados,
  onMostrarToast,
  onAbrirSalaFoco,
}) {
  const [subaba, setSubaba] = useState('todos')
  const [busca, setBusca] = useState('')
  const [salaFiltro, setSalaFiltro] = useState('todos')
  const [tipoFiltro, setTipoFiltro] = useState('todos')
  const [statusFiltro, setStatusFiltro] = useState('todos')
  const [form, setForm] = useState(null) // null | { linha: Linha | null }
  // Menu "⋮": posição fixa (escapa do overflow-x da tabela)
  const [menu, setMenu] = useState(null) // null | { chave, top, right }
  const [paraExcluir, setParaExcluir] = useState(null)

  // Fecha o menu "⋮" ao rolar a página ou a tabela
  useEffect(() => {
    if (!menu) return
    function aoRolar() {
      setMenu(null)
    }
    window.addEventListener('scroll', aoRolar, true)
    return () => window.removeEventListener('scroll', aoRolar, true)
  }, [menu])

  function abrirMenu(evento, chave) {
    evento.stopPropagation()
    const ret = evento.currentTarget.getBoundingClientRect()
    setMenu((atual) =>
      atual && atual.chave === chave
        ? null
        : {
            chave,
            top: ret.bottom + 6,
            right: Math.max(8, window.innerWidth - ret.right),
          }
    )
  }

  const config = useMemo(() => obterConfig(), [salas])
  const statusConfig = config.rede.statusEquipamento || []

  const inventario = useMemo(() => montarInventario(salas), [salas])

  const daAba = useMemo(
    () =>
      inventario.filter(
        (linha) => subaba === 'todos' || abaDaLinha(linha) === subaba
      ),
    [inventario, subaba]
  )

  const resumo = useMemo(() => {
    const contagem = { operacao: 0, manutencao: 0, falha: 0 }
    for (const linha of daAba) {
      if (linha.status) contagem[linha.status]++
    }
    return {
      total: daAba.length,
      operacao: contagem.operacao,
      manutencao: contagem.manutencao,
      falha: contagem.falha,
    }
  }, [daAba])

  const tiposExistentes = useMemo(
    () =>
      [...new Set(inventario.map((linha) => linha.tipoExibicao))].sort((a, b) =>
        a.localeCompare(b, 'pt-BR')
      ),
    [inventario]
  )

  const visiveis = useMemo(() => {
    const termo = busca.trim().toLowerCase()
    return daAba.filter((linha) => {
      if (termo) {
        const alvo = [
          linha.nome,
          linha.tipoExibicao,
          linha.sala ? linha.sala.nome : '',
          linha.rack ? linha.rack.nome : '',
          linha.modelo,
          linha.numeroSerie,
          linha.ip,
          linha.fabricante,
        ]
          .join(' ')
          .toLowerCase()
        if (!alvo.includes(termo)) return false
      }
      if (salaFiltro !== 'todos' && linha.salaId !== salaFiltro) return false
      if (tipoFiltro !== 'todos' && linha.tipoExibicao !== tipoFiltro) {
        return false
      }
      if (statusFiltro !== 'todos') {
        if (statusFiltro === 'sem_status') {
          if (linha.status) return false
        } else if (linha.status !== statusFiltro) return false
      }
      return true
    })
  }, [daAba, busca, salaFiltro, tipoFiltro, statusFiltro])

  function limparFiltros() {
    setBusca('')
    setSalaFiltro('todos')
    setTipoFiltro('todos')
    setStatusFiltro('todos')
  }

  function abrirLinha(linha) {
    // Switch/patch panel: abre a página do equipamento dentro da sala;
    // rack: abre a página do rack. Demais itens não têm página própria.
    if (linha.kind === 'rack_equipment') {
      onAbrirSalaFoco?.(linha.salaId, {
        rackId: linha.rackId,
        equipamentoId: linha.id,
      })
    } else if (linha.kind === 'rack') {
      onAbrirSalaFoco?.(linha.salaId, { rackId: linha.id })
    }
  }

  function aoDuplicar(linha) {
    if (linha.kind === 'rack_equipment') {
      const copia = duplicarEquipamentoRack(linha.salaId, linha.rackId, linha.id)
      if (copia) onMostrarToast?.(`“${linha.nome}” duplicado em U${copia.posicaoU}`)
      else onMostrarToast?.('Rack cheio — não há posição U livre para a cópia')
    } else if (linha.kind === 'associado') {
      duplicarEquipamentoAssociado(linha.salaId, linha.id)
      onMostrarToast?.(`“${linha.nome}” duplicado`)
    } else {
      // rack: duplica só a estrutura (sem equipamentos)
      const sala = salas.find((item) => item.id === linha.salaId)
      const rack = sala?.racks?.find((item) => item.id === linha.id)
      if (sala && rack) {
        criarRack(linha.salaId, {
          nome: `${rack.nome} (cópia)`,
          alturaU: rack.alturaU,
          localizacao: rack.localizacao,
          observacoes: rack.observacoes,
        })
        onMostrarToast?.(`Rack “${rack.nome}” duplicado (sem equipamentos)`)
      }
    }
    setMenu(null)
    onDadosAlterados?.()
  }

  function aoExcluir() {
    if (!paraExcluir) return
    const linha = paraExcluir
    if (linha.kind === 'rack_equipment') {
      excluirEquipamento(linha.salaId, linha.rackId, linha.id)
      onMostrarToast?.('Equipamento excluído')
    } else if (linha.kind === 'rack') {
      excluirRack(linha.salaId, linha.id)
      onMostrarToast?.('Rack excluído')
    } else {
      excluirEquipamentoAssociado(linha.salaId, linha.id)
      onMostrarToast?.('Equipamento excluído')
    }
    setParaExcluir(null)
    onDadosAlterados?.()
  }

  const temFiltroAtivo =
    busca.trim() !== '' ||
    salaFiltro !== 'todos' ||
    tipoFiltro !== 'todos' ||
    statusFiltro !== 'todos'

  const textoExcluir = (() => {
    if (!paraExcluir) return ''
    if (paraExcluir.kind === 'rack_equipment') {
      const { vinculos, falhas } = impactosExclusaoEquipamento(
        paraExcluir.sala,
        paraExcluir.equipamento
      )
      const extras = []
      if (vinculos > 0) extras.push(`${vinculos} vínculo(s) de porta`)
      if (falhas > 0) extras.push(`${falhas} falha(s) ativa(s)`)
      return `Tem certeza que deseja excluir “${paraExcluir.nome}”?${
        extras.length > 0 ? ` Serão perdidos: ${extras.join(' e ')}.` : ''
      }`
    }
    if (paraExcluir.kind === 'rack') {
      const total = (paraExcluir.rackObj?.equipamentos || []).length
      return `Tem certeza que deseja excluir o rack “${paraExcluir.nome}”?${
        total > 0 ? ` Ele contém ${total} equipamento(s), que serão excluídos junto.` : ''
      }`
    }
    return `Tem certeza que deseja excluir “${paraExcluir.nome}” da sala?`
  })()

  return (
    <main className="dash-main equipamentos">
      <div className="main-header">
        <div>
          <h1>Equipamentos</h1>
          <p>
            Inventário de switches, patch panels, racks e máquinas das suas
            salas.
          </p>
        </div>
      </div>

      <div className="redes-subabas" role="tablist" aria-label="Seções de Equipamentos">
        {SUBABAS.map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            className={`redes-subaba${subaba === item.id ? ' ativa' : ''}`}
            aria-selected={subaba === item.id}
            onClick={() => setSubaba(item.id)}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="redes-conteudo">
        {/* Cartões-resumo */}
        <div className="redes-resumo-grid">
          <div className="redes-resumo-card azul">
            <span className="redes-resumo-icone" aria-hidden="true">
              <ServerIcon size={20} />
            </span>
            <div>
              <strong>{resumo.total}</strong>
              <span>Total de equipamentos</span>
            </div>
          </div>
          <div className="redes-resumo-card verde">
            <span className="redes-resumo-icone" aria-hidden="true">
              <CheckCircleIcon size={20} />
            </span>
            <div>
              <strong>{resumo.operacao}</strong>
              <span>Em operação</span>
            </div>
          </div>
          <div className="redes-resumo-card ambar">
            <span className="redes-resumo-icone" aria-hidden="true">
              <WrenchIcon size={20} />
            </span>
            <div>
              <strong>{resumo.manutencao}</strong>
              <span>Em manutenção</span>
            </div>
          </div>
          <div className="redes-resumo-card vermelho">
            <span className="redes-resumo-icone" aria-hidden="true">
              <XCircleIcon size={20} />
            </span>
            <div>
              <strong>{resumo.falha}</strong>
              <span>Com falha</span>
            </div>
          </div>
        </div>

        {/* Busca + filtros + novo */}
        <div className="redes-filtros">
          <div className="redes-busca">
            <SearchIcon size={16} />
            <input
              type="text"
              placeholder="Buscar por nome, modelo, nº de série, IP..."
              value={busca}
              onChange={(evento) => setBusca(evento.target.value)}
              aria-label="Buscar equipamento"
            />
          </div>
          <select
            className="redes-select"
            aria-label="Filtrar por sala"
            value={salaFiltro}
            onChange={(evento) => setSalaFiltro(evento.target.value)}
          >
            <option value="todos">Todas as salas</option>
            {salas.map((sala) => (
              <option key={sala.id} value={sala.id}>
                {sala.nome}
              </option>
            ))}
          </select>
          <select
            className="redes-select"
            aria-label="Filtrar por tipo"
            value={tipoFiltro}
            onChange={(evento) => setTipoFiltro(evento.target.value)}
          >
            <option value="todos">Todos os tipos</option>
            {tiposExistentes.map((tipo) => (
              <option key={tipo} value={tipo}>
                {tipo}
              </option>
            ))}
          </select>
          <select
            className="redes-select"
            aria-label="Filtrar por status"
            value={statusFiltro}
            onChange={(evento) => setStatusFiltro(evento.target.value)}
          >
            <option value="todos">Todos os status</option>
            {statusConfig.map((status) => (
              <option key={status.id} value={status.id}>
                {status.nome}
              </option>
            ))}
            <option value="sem_status">Sem status</option>
          </select>
          <button
            type="button"
            className="btn-new"
            onClick={() => setForm({ linha: null })}
          >
            <PlusIcon size={16} />
            Novo equipamento
          </button>
        </div>

        {salas.length === 0 ? (
          <div className="empty-state">
            <ServerIcon size={28} />
            <p>
              Nenhuma sala cadastrada ainda. Crie uma sala em Salas para
              começar a registrar equipamentos.
            </p>
          </div>
        ) : daAba.length === 0 ? (
          <div className="empty-state">
            <ServerIcon size={28} />
            <p>Nenhum item nesta seção ainda.</p>
            <button
              type="button"
              className="btn-new"
              onClick={() => setForm({ linha: null })}
            >
              <PlusIcon size={16} />
              Novo equipamento
            </button>
          </div>
        ) : visiveis.length === 0 ? (
          <div className="empty-state">
            <SearchIcon size={28} />
            <p>Nenhum equipamento encontrado com os filtros atuais.</p>
            <button type="button" className="redes-filtro-btn" onClick={limparFiltros}>
              Limpar filtros
            </button>
          </div>
        ) : (
          <div className="redes-tabela-wrap">
            <table className="redes-tabela">
              <thead>
                <tr>
                  <th scope="col">Nome</th>
                  <th scope="col">Tipo</th>
                  <th scope="col">Sala</th>
                  <th scope="col">Rack</th>
                  <th scope="col">Modelo</th>
                  <th scope="col">Nº de série</th>
                  <th scope="col">IP</th>
                  <th scope="col">Status</th>
                  <th scope="col">Última atualização</th>
                  <th scope="col" className="redes-th-acoes">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody>
                {visiveis.map((linha) => {
                  const Icone = TIPO_ICONE[linha.tipoExibicao] || BoxIcon
                  const clicavel =
                    linha.kind === 'rack_equipment' || linha.kind === 'rack'
                  return (
                    <tr
                      key={linha.chave}
                      className={`redes-tr${clicavel ? '' : ' nao-clicavel'}`}
                      tabIndex={clicavel ? 0 : undefined}
                      onClick={() => abrirLinha(linha)}
                      onKeyDown={(evento) => {
                        if (evento.key === 'Enter' && clicavel) abrirLinha(linha)
                      }}
                      title={
                        clicavel
                          ? 'Abrir a página deste item dentro da sala'
                          : undefined
                      }
                    >
                      <td>
                        <span className="redes-td-identificacao">
                          <Icone size={15} />
                          {linha.nome}
                        </span>
                      </td>
                      <td>{linha.tipoExibicao}</td>
                      <td>{linha.sala ? linha.sala.nome : '—'}</td>
                      <td>
                        {linha.rack
                          ? `${linha.rack.nome}${linha.posicaoU ? ` · U${linha.posicaoU}` : ''}`
                          : '—'}
                      </td>
                      <td>{linha.modelo || '—'}</td>
                      <td>{linha.numeroSerie || '—'}</td>
                      <td>{linha.ip || '—'}</td>
                      <td>
                        <SeloStatus status={linha.status} statusConfig={statusConfig} />
                      </td>
                      <td className="redes-td-data">
                        {linha.atualizadoEm
                          ? formatarDataRelativa(linha.atualizadoEm)
                          : '—'}
                      </td>
                      <td className="redes-td-acoes">
                        <button
                          type="button"
                          className="redes-btn-acao equip-menu-btn"
                          aria-label={`Ações de ${linha.nome}`}
                          aria-expanded={menu?.chave === linha.chave}
                          title="Mais ações"
                          onClick={(evento) => abrirMenu(evento, linha.chave)}
                        >
                          <MoreVerticalIcon size={15} />
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Menu "⋮" da última linha aberta — fixo, fora da tabela */}
        {menu && (
          <>
            <div
              className="equip-menu-backdrop"
              onClick={() => setMenu(null)}
            ></div>
            <div
              className="equip-menu equip-menu-fixo"
              role="menu"
              style={{ top: `${menu.top}px`, right: `${menu.right}px` }}
            >
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  const linha = visiveis.find((item) => item.chave === menu.chave)
                  setMenu(null)
                  if (linha) setForm({ linha })
                }}
              >
                <PencilIcon size={14} />
                Editar
              </button>
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  const linha = visiveis.find((item) => item.chave === menu.chave)
                  setMenu(null)
                  if (linha) aoDuplicar(linha)
                }}
              >
                <CopyIcon size={14} />
                Duplicar
              </button>
              <button
                type="button"
                role="menuitem"
                className="perigo"
                onClick={() => {
                  const linha = visiveis.find((item) => item.chave === menu.chave)
                  setMenu(null)
                  if (linha) setParaExcluir(linha)
                }}
              >
                <TrashIcon size={14} />
                Excluir
              </button>
            </div>
          </>
        )}

        {temFiltroAtivo && visiveis.length > 0 && (
          <p className="redes-contagem" aria-live="polite">
            {visiveis.length} de {daAba.length} equipamento(s)
          </p>
        )}
      </div>

      {form && (
        <EquipamentoForm
          salas={salas}
          linha={form.linha}
          onFechar={() => setForm(null)}
          onSalvo={() => {
            setForm(null)
            onDadosAlterados?.()
          }}
          onMostrarToast={onMostrarToast}
        />
      )}

      {paraExcluir && (
        <ConfirmDialog
          titulo="Excluir equipamento"
          texto={textoExcluir}
          confirmarLabel="Excluir"
          perigo
          onConfirmar={aoExcluir}
          onCancelar={() => setParaExcluir(null)}
        />
      )}
    </main>
  )
}
