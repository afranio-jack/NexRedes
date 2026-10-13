// Página do rack: trilha, cabeçalho, vista frontal em U, lista de
// equipamentos, adicionar/editar/excluir switch e patch panel.

import { useState } from 'react'
import {
  RackIcon,
  SwitchIcon,
  PatchPanelIcon,
  MoreVerticalIcon,
  PencilIcon,
  TrashIcon,
  MapPinIcon,
} from '../icons'
import Trilha from './Trilha'
import RackVista from './RackVista'
import EquipamentoModal from './EquipamentoModal'
import ConfirmDialog from '../sala/ConfirmDialog'
import { corDaSala } from '../../utils/salas'
import {
  resumoRack,
  portaEmUso,
  criarEquipamento,
  editarEquipamento,
  excluirEquipamento,
  impactosExclusaoEquipamento,
} from '../../utils/racks'
import './rack.css'

function EquipamentoItem({
  equipamento,
  sala,
  onAbrir,
  onEditar,
  onExcluir,
}) {
  const [menuAberto, setMenuAberto] = useState(false)
  const eSwitch = equipamento.tipo === 'switch'
  const IconeTipo = eSwitch ? SwitchIcon : PatchPanelIcon
  let emUso = 0
  let total = 0
  for (const porta of equipamento.portas || []) {
    total++
    if (portaEmUso(porta)) emUso++
  }

  function editar() {
    setMenuAberto(false)
    onEditar(equipamento)
  }

  function excluir() {
    setMenuAberto(false)
    onExcluir(equipamento)
  }

  return (
    <li className="rack-equip-item">
      <button
        type="button"
        className="rack-equip-btn"
        onClick={() => onAbrir(equipamento)}
        aria-label={`Abrir página de ${equipamento.nome}`}
      >
        <span className="rack-equip-icone" aria-hidden="true">
          <IconeTipo size={20} />
        </span>
        <span className="rack-equip-info">
          <strong>
            {equipamento.nome}{' '}
            <span className="detalhe-registro-tipo">
              ({eSwitch ? 'switch' : 'patch panel'} · U{equipamento.posicaoU})
            </span>
          </strong>
          <p>
            {eSwitch
              ? `${equipamento.quantidadePortas} portas` +
                (equipamento.quantidadeUplink > 0
                  ? ` + ${equipamento.quantidadeUplink} SFP`
                  : '') +
                (equipamento.modelo ? ` · ${equipamento.modelo}` : '') +
                (equipamento.ipGerencia ? ` · ${equipamento.ipGerencia}` : '')
              : `${equipamento.quantidadePortas} portas · ${
                  equipamento.categoriaCaboPadrao || '—'
                }`}
          </p>
        </span>
        <span className="rack-equip-chips">
          <span className="detalhe-chip neutro">
            {emUso} / {total} em uso
          </span>
        </span>
      </button>

      <button
        type="button"
        className="rack-equip-menu"
        aria-label={`Mais opções de ${equipamento.nome}`}
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
    </li>
  )
}

export default function RackDetalhe({
  sala,
  rack,
  onVoltarProjetos,
  onVoltarSala,
  onAbrirEquipamento,
  onDadosAlterados,
  onMostrarToast,
}) {
  const [modal, setModal] = useState(null) // null | { tipo, equipamento }
  const [equipParaExcluir, setEquipParaExcluir] = useState(null)
  const equipamentos = rack.equipamentos || []
  const resumo = resumoRack(rack)

  function salvarEquipamento(dados) {
    if (modal?.equipamento) {
      editarEquipamento(sala.id, rack.id, modal.equipamento.id, dados)
      onMostrarToast('Equipamento atualizado com sucesso')
    } else {
      criarEquipamento(sala.id, rack.id, dados)
      onMostrarToast(
        dados.tipo === 'switch'
          ? 'Switch adicionado com sucesso'
          : 'Patch panel adicionado com sucesso'
      )
    }
    onDadosAlterados()
    setModal(null)
  }

  function confirmarExclusao() {
    if (!equipParaExcluir) return
    excluirEquipamento(sala.id, rack.id, equipParaExcluir.id)
    onDadosAlterados()
    onMostrarToast('Equipamento excluído')
    setEquipParaExcluir(null)
  }

  return (
    <div className="rack-pagina">
      <Trilha
        itens={[
          { label: 'Projetos', onClick: onVoltarProjetos },
          { label: sala.nome, onClick: onVoltarSala },
          { label: rack.nome },
        ]}
      />

      <header
        className="rack-cabecalho"
        style={{ '--room-color': corDaSala(sala.cor) }}
      >
        <span className="rack-cabecalho-icone" aria-hidden="true">
          <RackIcon size={28} />
        </span>
        <div className="rack-cabecalho-titulos">
          <h2>{rack.nome}</h2>
          <p>
            {rack.localizacao ? (
              <>
                <MapPinIcon
                  size={13}
                  style={{ verticalAlign: '-2px' }}
                />{' '}
                {rack.localizacao} ·{' '}
              </>
            ) : null}
            {rack.alturaU} U · {resumo.switches}{' '}
            {resumo.switches === 1 ? 'switch' : 'switches'} ·{' '}
            {resumo.patchPanels}{' '}
            {resumo.patchPanels === 1 ? 'patch panel' : 'patch panels'} ·{' '}
            {resumo.emUso}/{resumo.total} portas em uso
          </p>
        </div>
        <div className="rack-toolbar-acoes">
          <button
            type="button"
            className="btn-equip"
            onClick={() => setModal({ tipo: 'switch', equipamento: null })}
          >
            <SwitchIcon size={16} />
            Adicionar switch
          </button>
          <button
            type="button"
            className="btn-equip"
            onClick={() => setModal({ tipo: 'patch_panel', equipamento: null })}
          >
            <PatchPanelIcon size={16} />
            Adicionar patch panel
          </button>
        </div>
      </header>

      <section className="rack-vista-bloco">
        <h2>
          <RackIcon size={18} />
          Vista frontal
        </h2>
        <RackVista
          rack={rack}
          sala={sala}
          onAbrirEquipamento={onAbrirEquipamento}
        />
      </section>

      <section className="rack-vista-bloco">
        <h2>
          <SwitchIcon size={18} />
          Equipamentos ({equipamentos.length})
        </h2>
        {equipamentos.length === 0 ? (
          <p className="rack-equip-vazio">
            Nenhum equipamento neste rack. Use os botões acima para adicionar
            um switch ou um patch panel.
          </p>
        ) : (
          <ul className="rack-equip-lista">
            {equipamentos.map((equipamento) => (
              <EquipamentoItem
                key={equipamento.id}
                equipamento={equipamento}
                sala={sala}
                onAbrir={(item) => onAbrirEquipamento(item.id)}
                onEditar={(item) =>
                  setModal({ tipo: item.tipo, equipamento: item })
                }
                onExcluir={setEquipParaExcluir}
              />
            ))}
          </ul>
        )}
      </section>

      {modal && (
        <EquipamentoModal
          tipo={modal.tipo}
          equipamento={modal.equipamento}
          rack={rack}
          sala={sala}
          onFechar={() => setModal(null)}
          onSalvar={salvarEquipamento}
        />
      )}

      {equipParaExcluir && (
        <ConfirmDialog
          titulo={
            equipParaExcluir.tipo === 'switch'
              ? 'Excluir switch'
              : 'Excluir patch panel'
          }
          texto={(() => {
            const { vinculos, falhas } = impactosExclusaoEquipamento(
              sala,
              equipParaExcluir
            )
            const detalhes = []
            if (vinculos > 0)
              detalhes.push(
                `${vinculos} vínculo(s) de porta será(ão) desfeito(s) do outro lado`
              )
            if (falhas > 0)
              detalhes.push(
                `${falhas} falha(s) em andamento será(ão) removida(s) da sala`
              )
            const aviso =
              detalhes.length > 0 ? ` Atenção: ${detalhes.join(' e ')}.` : ''
            return `Tem certeza que deseja excluir “${equipParaExcluir.nome}”? Esta ação não pode ser desfeita.${aviso}`
          })()}
          confirmarLabel="Excluir"
          perigo
          onConfirmar={confirmarExclusao}
          onCancelar={() => setEquipParaExcluir(null)}
        />
      )}
    </div>
  )
}
