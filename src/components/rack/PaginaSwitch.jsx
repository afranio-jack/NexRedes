// Página do switch: resumo, painel visual de portas (duas fileiras + SFP),
// legenda clicável, filtros/busca, tabela completa com ordenação e seleção
// em lote, painel lateral de edição e registro de falha por porta.

import { useMemo, useState } from 'react'
import {
  ArrowLeftIcon,
  SwitchIcon,
  LinkArrowsIcon,
  PatchPanelIcon,
  BoxIcon,
} from '../icons'
import Trilha from './Trilha'
import ResumoPortas from './ResumoPortas'
import FaixaPortas from './FaixaPortas'
import LegendaPortas from './LegendaPortas'
import FiltrosPortas from './FiltrosPortas'
import TabelaPortas from './TabelaPortas'
import PainelPorta from './PainelPorta'
import { corDaSala } from '../../utils/salas'
import {
  calcularEstadoPorta,
  contarEstados,
  portaCombinaBusca,
  portaCombinaFiltro,
  portaEmUso,
  resumoPortas,
  salvarPorta,
  salvarPortasLote,
  registrarFalhaPorta,
  buscarPortaVinculada,
  descricaoVinculo,
} from '../../utils/racks'
import {
  estadoPortaInfo,
  dispositivoInfo,
  rotuloDispositivo,
  rotuloVelocidade,
  rotuloPoe,
} from './opcoes'
import './rack.css'

export default function PaginaSwitch({
  sala,
  rack,
  equipamento,
  onVoltarProjetos,
  onVoltarSala,
  onVoltarRack,
  onDadosAlterados,
  onMostrarToast,
}) {
  const [filtro, setFiltro] = useState('todas')
  const [busca, setBusca] = useState('')
  const [ordenacao, setOrdenacao] = useState({ chave: 'numero', direcao: 1 })
  const [selecionadas, setSelecionadas] = useState(() => new Set())
  // painel = { portaIds: [...], lote: bool, ladoInicial }
  const [painel, setPainel] = useState(null)

  const falhas = sala.falhas || []
  const portas = equipamento.portas || []

  const contagensEstado = useMemo(
    () => contarEstados(portas, falhas),
    [portas, falhas]
  )
  const contagensFiltro = useMemo(
    () => ({
      todas: portas.length,
      em_uso: portas.filter((p) => portaEmUso(p)).length,
      livres: contagensEstado.livre || 0,
      com_falha: (contagensEstado.critica || 0) + (contagensEstado.atencao || 0),
      reservadas: contagensEstado.bloqueada || 0,
      uplink: portas.filter((p) => p.uplink?.ativo || p.sfp).length,
    }),
    [portas, contagensEstado]
  )
  const visiveis = useMemo(
    () =>
      portas.filter(
        (porta) =>
          portaCombinaFiltro(porta, calcularEstadoPorta(porta, falhas), filtro) &&
          portaCombinaBusca(porta, busca)
      ),
    [portas, falhas, filtro, busca]
  )
  const resumo = useMemo(
    () => resumoPortas(equipamento, falhas),
    [equipamento, falhas]
  )
  const portasPainel = useMemo(
    () =>
      painel
        ? painel.portaIds
            .map((id) => portas.find((p) => p.id === id))
            .filter(Boolean)
        : [],
    [painel, portas]
  )

  function aoOrdenar(chave) {
    setOrdenacao((atual) =>
      atual.chave === chave
        ? { chave, direcao: -atual.direcao }
        : { chave, direcao: 1 }
    )
  }

  function abrirPainelPorta(porta) {
    setPainel({ portaIds: [porta.id], lote: false, ladoInicial: porta.lado })
  }

  function abrirPainelLote() {
    if (selecionadas.size === 0) return
    setPainel({ portaIds: [...selecionadas], lote: true, ladoInicial: null })
  }

  function toggleSelecao(portaId) {
    setSelecionadas((atual) => {
      const novo = new Set(atual)
      if (novo.has(portaId)) novo.delete(portaId)
      else novo.add(portaId)
      return novo
    })
  }

  function selecionarTodasVisiveis() {
    setSelecionadas((atual) => {
      const novo = new Set(atual)
      visiveis.forEach((porta) => novo.add(porta.id))
      return novo
    })
  }

  function desmarcarTodas() {
    setSelecionadas(new Set())
  }

  function aoSalvarIndividual(porta, dados) {
    salvarPorta(sala.id, equipamento.id, porta.id, dados)
    onDadosAlterados()
    setPainel(null)
    onMostrarToast('Porta atualizada com sucesso')
  }

  function aoSalvarLote(portaIds, campos) {
    salvarPortasLote(sala.id, equipamento.id, portaIds, campos)
    onDadosAlterados()
    setPainel(null)
    setSelecionadas(new Set())
    onMostrarToast(`${portaIds.length} porta(s) atualizada(s)`)
  }

  function aoRegistrarFalha(porta, dadosFalha) {
    registrarFalhaPorta(sala.id, equipamento.id, porta.id, dadosFalha)
    onDadosAlterados()
    onMostrarToast('Falha registrada na porta')
  }

  function rotuloDaPorta(porta) {
    const disp = porta.dispositivoConectado
    if (disp?.tipo || (disp?.nome || '').trim()) {
      const info = dispositivoInfo(disp.tipo)
      return {
        Icone: info?.Icone || BoxIcon,
        nome: disp.nome || info?.label || 'Dispositivo',
        title: `${info?.label || 'Dispositivo'}: ${disp.nome || '—'}`,
      }
    }
    if (porta.vinculo) {
      const achado = buscarPortaVinculada(sala, porta)
      if (achado?.porta) {
        return {
          Icone: PatchPanelIcon,
          nome: achado.equipamento.nome,
          title: `Vinculada a ${achado.equipamento.nome} / porta ${achado.porta.numero}`,
        }
      }
    }
    if (porta.uplink?.ativo) {
      return {
        Icone: LinkArrowsIcon,
        nome: porta.uplink.destino || 'Uplink',
        title: `Uplink: ${porta.uplink.destino || '—'}`,
      }
    }
    return null
  }

  function linhasTooltip(porta) {
    const info = estadoPortaInfo(calcularEstadoPorta(porta, falhas))
    const linhas = [`Porta ${porta.numero}${porta.sfp ? ' (SFP)' : ''}`]
    if (porta.nome) linhas.push(porta.nome)
    const disp = porta.dispositivoConectado
    if (disp?.tipo || (disp?.nome || '').trim()) {
      linhas.push(
        `Dispositivo: ${disp.nome || rotuloDispositivo(disp.tipo)}`
      )
    }
    const vinculo = descricaoVinculo(sala, porta)
    if (vinculo) linhas.push(`Vínculo: ${vinculo}`)
    if (porta.velocidade && porta.velocidade !== 'auto') {
      linhas.push(`Velocidade: ${rotuloVelocidade(porta.velocidade)}`)
    }
    if (porta.vlanNativa) linhas.push(`VLAN: ${porta.vlanNativa}`)
    if (porta.poe && porta.poe !== 'desligado') {
      linhas.push(`PoE: ${rotuloPoe(porta.poe)}`)
    }
    linhas.push(`Status: ${info.descricao}`)
    return linhas
  }

  return (
    <div className="equip-pagina">
      <div className="equip-topo">
        <button
          type="button"
          className="detalhe-voltar"
          onClick={onVoltarRack}
        >
          <ArrowLeftIcon size={16} />
          Voltar ao rack
        </button>
        <Trilha
          itens={[
            { label: 'Projetos', onClick: onVoltarProjetos },
            { label: sala.nome, onClick: onVoltarSala },
            { label: rack.nome, onClick: onVoltarRack },
            { label: equipamento.nome },
          ]}
        />
      </div>

      <header
        className="rack-cabecalho"
        style={{ '--room-color': corDaSala(sala.cor) }}
      >
        <span className="rack-cabecalho-icone" aria-hidden="true">
          <SwitchIcon size={28} />
        </span>
        <div className="rack-cabecalho-titulos">
          <h2>{equipamento.nome}</h2>
          <p>
            Switch · {equipamento.quantidadePortas} portas
            {equipamento.quantidadeUplink > 0
              ? ` + ${equipamento.quantidadeUplink} SFP`
              : ''}
            {equipamento.modelo ? ` · ${equipamento.modelo}` : ''}
            {equipamento.ipGerencia ? ` · IP ${equipamento.ipGerencia}` : ''} ·
            U{equipamento.posicaoU}
          </p>
        </div>
      </header>

      <ResumoPortas resumo={resumo} />

      <section className="rack-vista-bloco">
        <h2>
          <SwitchIcon size={18} />
          Painel de portas
        </h2>
        <FaixaPortas
          portas={portas}
          modo="switch"
          falhas={falhas}
          selecionadaId={
            painel && !painel.lote ? painel.portaIds[0] : null
          }
          onClicarPorta={abrirPainelPorta}
          rotuloDaPorta={rotuloDaPorta}
          linhasDaPorta={linhasTooltip}
          titulo={`Portas do switch ${equipamento.nome}`}
        />
      </section>

      <LegendaPortas
        contagens={contagensEstado}
        filtroEstado={filtro.startsWith('est-') ? filtro : null}
        onFiltrarEstado={(id) => setFiltro(id || 'todas')}
      />

      <section className="rack-vista-bloco">
        <div className="tabela-topo">
          <h2>
            <SwitchIcon size={18} />
            Portas ({visiveis.length}/{portas.length})
          </h2>
          {selecionadas.size > 0 && (
            <div className="lote-barra">
              <span>
                {selecionadas.size}{' '}
                {selecionadas.size === 1
                  ? 'porta selecionada'
                  : 'portas selecionadas'}
              </span>
              <button type="button" className="btn-adicionar" onClick={abrirPainelLote}>
                Editar em lote
              </button>
              <button
                type="button"
                className="btn-adicionar"
                onClick={desmarcarTodas}
              >
                Limpar seleção
              </button>
            </div>
          )}
        </div>

        <FiltrosPortas
          contagens={contagensFiltro}
          filtro={filtro}
          onFiltro={setFiltro}
          busca={busca}
          onBusca={setBusca}
          onLimpar={() => {
            setFiltro('todas')
            setBusca('')
          }}
        />

        <TabelaPortas
          sala={sala}
          falhas={falhas}
          portas={visiveis}
          ordenacao={ordenacao}
          onOrdenar={aoOrdenar}
          selecionadas={selecionadas}
          onToggleSelecao={toggleSelecao}
          onSelecionarTodas={selecionarTodasVisiveis}
          onDesmarcarTodas={desmarcarTodas}
          portaPainelId={painel && !painel.lote ? painel.portaIds[0] : null}
          onAbrirPorta={abrirPainelPorta}
        />
      </section>

      {painel && portasPainel.length > 0 && (
        <PainelPorta
          sala={sala}
          equipamento={equipamento}
          portas={portasPainel}
          lote={painel.lote}
          ladoInicial={painel.ladoInicial}
          onFechar={() => setPainel(null)}
          onSalvarIndividual={aoSalvarIndividual}
          onSalvarLote={aoSalvarLote}
          onRegistrarFalha={aoRegistrarFalha}
        />
      )}
    </div>
  )
}
