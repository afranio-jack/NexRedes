// Vista frontal do rack: régua de U's com os equipamentos empilhados
// na posição em U. Cada equipamento mostra uma amostra das portas coloridas.

import { SwitchIcon, PatchPanelIcon } from '../icons'
import {
  calcularEstadoPorta,
  piorEstado,
  portasComuns,
} from '../../utils/racks'
import { estadoPortaInfo } from './opcoes'

function AmostraPortas({ equipamento, falhas }) {
  const portas = portasComuns(equipamento).slice(0, 12)
  return (
    <span className="rack-u-equip-portas" aria-hidden="true">
      {portas.map((porta) => {
        const info = estadoPortaInfo(calcularEstadoPorta(porta, falhas))
        return (
          <span
            key={porta.id}
            className="rack-u-ponto"
            style={{ background: info.cor, borderColor: info.borda }}
          ></span>
        )
      })}
    </span>
  )
}

export default function RackVista({ rack, sala, onAbrirEquipamento }) {
  const falhas = sala?.falhas || []
  const us = []
  for (let u = rack.alturaU; u >= 1; u--) us.push(u)

  return (
    <div className="rack-vista-wrap">
      <div
        className="rack-vista"
        role="list"
        aria-label={`Vista frontal do rack ${rack.nome}, ${rack.alturaU} U`}
      >
        {us.map((u) => {
          const equipamento = (rack.equipamentos || []).find(
            (eq) => Number(eq.posicaoU) === u
          )
          if (!equipamento) {
            return (
              <div className="rack-u" key={u}>
                <span className="rack-u-num">U{u}</span>
                <span
                  className="rack-u-slot"
                  role="listitem"
                  aria-label={`Posição U${u} vazia`}
                ></span>
              </div>
            )
          }
          const pior = piorEstado(equipamento.portas || [], falhas)
          const eSwitch = equipamento.tipo === 'switch'
          const IconeTipo = eSwitch ? SwitchIcon : PatchPanelIcon
          return (
            <div className="rack-u" key={u}>
              <span className="rack-u-num">U{u}</span>
              <button
                type="button"
                className="rack-u-equip"
                data-estado={pior}
                onClick={() => onAbrirEquipamento(equipamento.id)}
                aria-label={`Abrir ${equipamento.nome}, ${
                  eSwitch ? 'switch' : 'patch panel'
                } na posição U${u}`}
              >
                <span className="rack-u-equip-icone" aria-hidden="true">
                  <IconeTipo size={16} />
                </span>
                <span className="rack-u-equip-info">
                  <strong>{equipamento.nome}</strong>
                  <span>
                    {eSwitch ? 'Switch' : 'Patch panel'} ·{' '}
                    {equipamento.quantidadePortas} portas
                    {eSwitch && equipamento.quantidadeUplink > 0
                      ? ` + ${equipamento.quantidadeUplink} SFP`
                      : ''}
                  </span>
                </span>
                <AmostraPortas equipamento={equipamento} falhas={falhas} />
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}
