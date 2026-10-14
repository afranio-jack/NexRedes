// Página da sala: abas "Visão geral" e "Racks". A navegação para dentro dos
// racks e equipamentos é controlada por estado interno (sem router), no mesmo
// padrão do Dashboard (salaAbertaId).

import { useEffect, useState } from 'react'
import { ArrowLeftIcon, PencilIcon } from '../icons'
import './SalaDetalhe.css'
import {
  calcularStatus,
  contarFalhasAtivas,
  corDaSala,
  iconeSala,
} from '../../utils/salas'
import { STATUS_SALA } from './opcoes'
import SalaVisaoGeral from './SalaVisaoGeral'
import ListaRacks from '../rack/ListaRacks'
import RackDetalhe from '../rack/RackDetalhe'
import PaginaSwitch from '../rack/PaginaSwitch'
import PaginaPatchPanel from '../rack/PaginaPatchPanel'
import { obterRack, listarEquipamentos } from '../../utils/racks'
import Toast from '../Toast'

const ABAS = [
  { id: 'visao_geral', label: 'Visão geral' },
  { id: 'racks', label: 'Racks' },
]

export default function SalaDetalhe({
  sala,
  focoInicial = null,
  onFocoConsumido,
  onVoltar,
  onEditar,
  onDadosAlterados,
  onVerPonto,
  onGerarEtiquetas,
}) {
  const [aba, setAba] = useState('visao_geral')
  const [rackAbertoId, setRackAbertoId] = useState(null)
  const [equipamentoAbertoId, setEquipamentoAbertoId] = useState(null)
  const [portaDestaqueId, setPortaDestaqueId] = useState(null)
  const [toast, setToast] = useState(null)

  const Icone = iconeSala(sala.icone)
  const status = calcularStatus(sala.falhas)
  const statusInfo = STATUS_SALA.find((item) => item.id === status)
  const falhasAtivas = contarFalhasAtivas(sala.falhas)
  const totalRacks = (sala.racks || []).length

  const rackAberto = rackAbertoId ? obterRack(sala, rackAbertoId) : null
  const equipamentoAberto =
    equipamentoAbertoId && rackAberto
      ? (rackAberto.equipamentos || []).find(
          (item) => item.id === equipamentoAbertoId
        ) || null
      : null

  // Abertura com foco vinda de fora (cadeia de conexão da página do ponto):
  // já entra na página do equipamento, destacando a porta informada.
  useEffect(() => {
    if (!focoInicial) return
    const { rackId, equipamentoId, portaId } = focoInicial
    const equipamento = listarEquipamentos(sala).find(
      (item) => item.id === equipamentoId && item.rackId === rackId
    )
    if (equipamento) {
      setRackAbertoId(rackId)
      setEquipamentoAbertoId(equipamentoId)
      if (portaId) setPortaDestaqueId(portaId)
    }
    onFocoConsumido?.()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function aoDadosAlterados() {
    onDadosAlterados?.()
  }

  function mostrarToast(mensagem) {
    setToast(mensagem)
  }

  function voltarParaSala() {
    setEquipamentoAbertoId(null)
    setRackAbertoId(null)
    setPortaDestaqueId(null)
  }

  function voltarParaRack() {
    setEquipamentoAbertoId(null)
    setPortaDestaqueId(null)
  }

  // Abre a página de um equipamento qualquer da sala (usado pelos links da
  // cadeia do cabo no painel da porta), podendo já destacar uma porta dele.
  function abrirEquipamento(equipamentoId, portaId) {
    const equipamento = listarEquipamentos(sala).find(
      (item) => item.id === equipamentoId
    )
    if (!equipamento) return
    setRackAbertoId(equipamento.rackId)
    setEquipamentoAbertoId(equipamentoId)
    setPortaDestaqueId(portaId || null)
  }

  return (
    <main className="dash-main detalhe">
      <button
        type="button"
        className="detalhe-voltar"
        onClick={onVoltar}
      >
        <ArrowLeftIcon size={16} />
        Voltar aos projetos
      </button>

      <header
        className="detalhe-cabecalho"
        style={{ '--room-color': corDaSala(sala.cor) }}
      >
        <span className="detalhe-icone" aria-hidden="true">
          <Icone size={30} />
        </span>
        <div className="detalhe-titulos">
          <h1>{sala.nome}</h1>
          <p>
            {sala.codigo} · {sala.tipo}
            {sala.responsavel ? ` · Responsável: ${sala.responsavel}` : ''}
          </p>
        </div>
        <span className={`room-badge ${statusInfo.className}`}>
          <span className="badge-dot" aria-hidden="true"></span>
          {statusInfo.label}
        </span>
        <button type="button" className="detalhe-editar" onClick={onEditar}>
          <PencilIcon size={16} />
          Editar sala
        </button>
      </header>

      {equipamentoAberto ? (
        equipamentoAberto.tipo === 'switch' ? (
          <PaginaSwitch
            sala={sala}
            rack={rackAberto}
            equipamento={equipamentoAberto}
            onVoltarProjetos={onVoltar}
            onVoltarSala={voltarParaSala}
            onVoltarRack={voltarParaRack}
            onDadosAlterados={aoDadosAlterados}
            onMostrarToast={mostrarToast}
            onAbrirEquipamento={abrirEquipamento}
            portaDestaqueId={portaDestaqueId}
            onDestaqueConsumido={() => setPortaDestaqueId(null)}
            onVerPonto={onVerPonto}
            onGerarEtiquetas={onGerarEtiquetas}
          />
        ) : (
          <PaginaPatchPanel
            sala={sala}
            rack={rackAberto}
            equipamento={equipamentoAberto}
            onVoltarProjetos={onVoltar}
            onVoltarSala={voltarParaSala}
            onVoltarRack={voltarParaRack}
            onDadosAlterados={aoDadosAlterados}
            onMostrarToast={mostrarToast}
            onAbrirEquipamento={abrirEquipamento}
            portaDestaqueId={portaDestaqueId}
            onDestaqueConsumido={() => setPortaDestaqueId(null)}
            onVerPonto={onVerPonto}
            onGerarEtiquetas={onGerarEtiquetas}
          />
        )
      ) : rackAberto ? (
        <RackDetalhe
          sala={sala}
          rack={rackAberto}
          onVoltarProjetos={onVoltar}
          onVoltarSala={voltarParaSala}
          onAbrirEquipamento={setEquipamentoAbertoId}
          onDadosAlterados={aoDadosAlterados}
          onMostrarToast={mostrarToast}
        />
      ) : (
        <>
          <div className="detalhe-abas" role="tablist" aria-label="Abas da sala">
            {ABAS.map((item) => (
              <button
                key={item.id}
                type="button"
                role="tab"
                className={`detalhe-aba${aba === item.id ? ' ativa' : ''}`}
                aria-selected={aba === item.id}
                aria-controls={`painel-${item.id}`}
                id={`aba-${item.id}`}
                onClick={() => setAba(item.id)}
              >
                {item.label}
                {item.id === 'racks' && totalRacks > 0 ? ` (${totalRacks})` : ''}
              </button>
            ))}
          </div>

          <div
            role="tabpanel"
            id="painel-visao_geral"
            aria-labelledby="aba-visao_geral"
            hidden={aba !== 'visao_geral'}
          >
            {aba === 'visao_geral' && <SalaVisaoGeral sala={sala} />}
          </div>

          <div
            role="tabpanel"
            id="painel-racks"
            aria-labelledby="aba-racks"
            hidden={aba !== 'racks'}
          >
            {aba === 'racks' && (
              <ListaRacks
                sala={sala}
                onAbrirRack={setRackAbertoId}
                onDadosAlterados={aoDadosAlterados}
                onMostrarToast={mostrarToast}
              />
            )}
          </div>
        </>
      )}

      <Toast mensagem={toast} onFechar={() => setToast(null)} />
    </main>
  )
}
