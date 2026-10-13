// Aba "Racks" da página da sala: cartões no estilo dos cartões de salas,
// botão "Novo rack", menu "⋮" (Editar/Excluir com confirmação).

import { useState } from 'react'
import {
  RackIcon,
  PlusIcon,
  MoreVerticalIcon,
  PencilIcon,
  TrashIcon,
  MapPinIcon,
  ArrowRightIcon,
} from '../icons'
import RackModal from './RackModal'
import ConfirmDialog from '../sala/ConfirmDialog'
import {
  criarRack,
  editarRack,
  excluirRack,
  resumoRack,
} from '../../utils/racks'
import './rack.css'

function RackCard({ rack, destaque, onAbrir, onEditar, onExcluir }) {
  const [menuAberto, setMenuAberto] = useState(false)
  const resumo = resumoRack(rack)

  function editar() {
    setMenuAberto(false)
    onEditar(rack)
  }

  function excluir() {
    setMenuAberto(false)
    onExcluir(rack)
  }

  return (
    <article className={`room-card rack-card${destaque ? ' destaque' : ''}`}>
      <span className="room-strip" aria-hidden="true"></span>

      <button
        type="button"
        className="room-menu"
        aria-label={`Mais opções de ${rack.nome}`}
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
          <RackIcon size={22} />
        </span>
        <h3 className="room-name">{rack.nome}</h3>
      </div>

      <ul className="room-info">
        <li>
          <MapPinIcon size={16} />
          <span>{rack.localizacao || 'Sem localização definida'}</span>
        </li>
        <li>
          <RackIcon size={16} />
          <span>
            {rack.alturaU} U · {resumo.switches}{' '}
            {resumo.switches === 1 ? 'switch' : 'switches'} ·{' '}
            {resumo.patchPanels}{' '}
            {resumo.patchPanels === 1 ? 'patch panel' : 'patch panels'}
          </span>
        </li>
      </ul>

      <div className="rack-ocupacao">
        <div className="rack-barra" role="img" aria-label={`Ocupação de portas: ${resumo.emUso} de ${resumo.total}`}>
          <div
            className="rack-barra-fill"
            style={{ width: `${resumo.ocupacao}%` }}
          ></div>
        </div>
        <span className="rack-ocupacao-texto">
          {resumo.emUso} / {resumo.total} portas · {resumo.ocupacao}%
        </span>
      </div>

      <button
        type="button"
        className="room-access"
        onClick={() => onAbrir(rack)}
      >
        Acessar
        <ArrowRightIcon size={16} />
      </button>
    </article>
  )
}

export default function ListaRacks({
  sala,
  onAbrirRack,
  onDadosAlterados,
  onMostrarToast,
}) {
  const [modal, setModal] = useState(null) // null | { rack: Rack | null }
  const [rackParaExcluir, setRackParaExcluir] = useState(null)
  const racks = sala.racks || []

  function abrirNovoRack() {
    setModal({ rack: null })
  }

  function salvarRack(dados) {
    if (modal?.rack) {
      editarRack(sala.id, modal.rack.id, dados)
      onMostrarToast('Rack atualizado com sucesso')
    } else {
      criarRack(sala.id, dados)
      onMostrarToast('Rack criado com sucesso')
    }
    onDadosAlterados()
    setModal(null)
  }

  function confirmarExclusao() {
    if (!rackParaExcluir) return
    excluirRack(sala.id, rackParaExcluir.id)
    onDadosAlterados()
    onMostrarToast('Rack excluído')
    setRackParaExcluir(null)
  }

  return (
    <>
      <div className="main-header">
        <div>
          <h1>Racks</h1>
          <p>
            Organize os racks da sala com switches, patch panels e a cablagem
            de portas.
          </p>
        </div>
        <button
          type="button"
          className="btn-new"
          onClick={abrirNovoRack}
        >
          <PlusIcon size={16} />
          Novo rack
        </button>
      </div>

      {racks.length === 0 ? (
        <div className="empty-state">
          <RackIcon size={28} />
          <p>Nenhum rack nesta sala.</p>
          <button
            type="button"
            className="btn-new"
            onClick={abrirNovoRack}
          >
            <PlusIcon size={16} />
            Criar rack
          </button>
        </div>
      ) : (
        <div className="rack-grid">
          {racks.map((rack) => (
            <RackCard
              key={rack.id}
              rack={rack}
              onAbrir={(item) => onAbrirRack(item.id)}
              onEditar={(item) => setModal({ rack: item })}
              onExcluir={setRackParaExcluir}
            />
          ))}
        </div>
      )}

      {modal && (
        <RackModal
          rack={modal.rack}
          sala={sala}
          onFechar={() => setModal(null)}
          onSalvar={salvarRack}
        />
      )}

      {rackParaExcluir && (
        <ConfirmDialog
          titulo="Excluir rack"
          texto={`Tem certeza que deseja excluir o rack “${rackParaExcluir.nome}”? Ele possui ${(
            rackParaExcluir.equipamentos || []
          ).length} equipamento(s); todos os equipamentos, vínculos e falhas de porta serão apagados. Esta ação não pode ser desfeita.`}
          confirmarLabel="Excluir"
          perigo
          onConfirmar={confirmarExclusao}
          onCancelar={() => setRackParaExcluir(null)}
        />
      )}
    </>
  )
}
