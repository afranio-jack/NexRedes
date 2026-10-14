// Página do switch: resumo, legenda clicável (acima do painel), painel
// visual de portas em duas fileiras + SFP (largura responsiva),
// filtros/busca, tabela completa com ordenação e seleção em lote e painel
// lateral da porta (resumo, edição, falha, teste e liberação).

import { useEffect, useMemo, useRef, useState } from 'react'
import {
  ArrowLeftIcon,
  SwitchIcon,
  LinkArrowsIcon,
  PatchPanelIcon,
  BoxIcon,
  TagIcon,
} from '../icons'
import Trilha from './Trilha'
import ResumoPortas from './ResumoPortas'
import FaixaPortas from './FaixaPortas'
import LegendaPortas from './LegendaPortas'
import FiltrosPortas from './FiltrosPortas'
import TabelaPortas from './TabelaPortas'
import PainelPorta from './PainelPorta'
import { corDaSala } from '../../utils/salas'
import { sincronizarPontoDaPorta } from '../../utils/pontos'
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
  registrarTestePorta,
  liberarPorta,
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
  onAbrirEquipamento,
  portaDestaqueId,
  onDestaqueConsumido,
  onVerPonto,
  onGerarEtiquetas,
}) {
  const [filtro, setFiltro] = useState('todas')
  const [busca, setBusca] = useState('')
  const [ordenacao, setOrdenacao] = useState({ chave: 'numero', direcao: 1 })
  const [selecionadas, setSelecionadas] = useState(() => new Set())
  const faixaRef = useRef(null)
  // painel = { portaIds: [...], lote: bool, ladoInicial }
  const [painel, setPainel] = useState(null)
  // Porta ativa dentro do painel (o destaque do painel visual a acompanha)
  const [portaAtivaPainelId, setPortaAtivaPainelId] = useState(null)

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
  // Passos de navegação do painel (‹ ›): uma porta por passo
  const passos = useMemo(
    () =>
      [...portas]
        .sort((a, b) => a.numero - b.numero)
        .map((porta) => [porta.id]),
    [portas]
  )

  // Porta destacada vinda da cadeia do cabo de outro equipamento:
  // abre a página já com o painel da porta vinculado
  useEffect(() => {
    if (!portaDestaqueId) return
    const porta = portas.find((p) => p.id === portaDestaqueId)
    if (porta) {
      setPainel({ portaIds: [porta.id], lote: false, ladoInicial: porta.lado })
      setPortaAtivaPainelId(porta.id)
    }
    onDestaqueConsumido?.()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [portaDestaqueId])

  function aoOrdenar(chave) {
    setOrdenacao((atual) =>
      atual.chave === chave
        ? { chave, direcao: -atual.direcao }
        : { chave, direcao: 1 }
    )
  }

  function abrirPainelPorta(porta) {
    setPortaAtivaPainelId(porta.id)
    setPainel({ portaIds: [porta.id], lote: false, ladoInicial: porta.lado })
  }

  function abrirPainelLote() {
    if (selecionadas.size === 0) return
    setPainel({ portaIds: [...selecionadas], lote: true, ladoInicial: null })
  }

  function fecharPainel(focoPortaId) {
    setPainel(null)
    if (focoPortaId) {
      requestAnimationFrame(() => faixaRef.current?.focarPorta(focoPortaId))
    }
  }

  function aoTrocarPasso(indice) {
    setPainel((atual) =>
      atual
        ? { ...atual, portaIds: passos[indice], lote: false, ladoInicial: null }
        : atual
    )
    // Destaque imediato da porta ativa do novo passo (o painel confirma
    // logo depois via onPortaAtivaChange)
    setPortaAtivaPainelId(passos[indice]?.[0] ?? null)
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
    // Se a porta perdeu o vínculo com um ponto estruturado, o ponto é
    // atualizado (o lado correspondente fica "não definido")
    sincronizarPontoDaPorta(sala.id, equipamento.id, porta.id)
    onDadosAlterados()
    fecharPainel(porta.id)
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

  function aoRegistrarTeste(porta, resultado) {
    registrarTestePorta(sala.id, equipamento.id, porta.id, resultado)
    onDadosAlterados()
    onMostrarToast(
      resultado === 'PASS' ? 'Teste PASS registrado' : 'Teste FAIL registrado'
    )
  }

  function aoLiberar(porta) {
    liberarPorta(sala.id, equipamento.id, porta.id)
    sincronizarPontoDaPorta(sala.id, equipamento.id, porta.id)
    onDadosAlterados()
    onMostrarToast('Porta liberada')
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

  const estadoFiltro = filtro.startsWith('est-') ? filtro.slice(4) : null

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
        <div className="rack-toolbar-acoes">
          <button
            type="button"
            className="btn-equip btn-gerar-etiqueta"
            onClick={() => onGerarEtiquetas?.(equipamento)}
          >
            <TagIcon size={16} />
            Gerar etiqueta
          </button>
        </div>
      </header>

      <ResumoPortas resumo={resumo} />

      <LegendaPortas
        contagens={contagensEstado}
        filtroEstado={estadoFiltro ? filtro : null}
        onFiltrarEstado={(id) => setFiltro(id || 'todas')}
      />

      <section className="rack-vista-bloco">
        <h2>
          <SwitchIcon size={18} />
          Painel de portas
        </h2>
        <FaixaPortas
          ref={faixaRef}
          portas={portas}
          modo="switch"
          falhas={falhas}
          selecionadaId={
            painel && !painel.lote
              ? portaAtivaPainelId || painel.portaIds[0]
              : null
          }
          estadoFiltro={estadoFiltro}
          onClicarPorta={abrirPainelPorta}
          rotuloDaPorta={rotuloDaPorta}
          linhasDaPorta={linhasTooltip}
          titulo={`Portas do switch ${equipamento.nome}`}
        />
      </section>

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
          rack={rack}
          equipamento={equipamento}
          portas={portasPainel}
          passos={passos}
          lote={painel.lote}
          ladoInicial={painel.ladoInicial}
          onFechar={() => fecharPainel(painel.portaIds[0])}
          onTrocarPasso={aoTrocarPasso}
          onPortaAtivaChange={setPortaAtivaPainelId}
          onSalvarIndividual={aoSalvarIndividual}
          onSalvarLote={aoSalvarLote}
          onRegistrarFalha={aoRegistrarFalha}
          onRegistrarTeste={aoRegistrarTeste}
          onLiberar={aoLiberar}
          onAbrirEquipamento={onAbrirEquipamento}
          onVoltarSala={onVoltarSala}
          onVoltarRack={onVoltarRack}
          onVerPonto={onVerPonto}
        />
      )}
    </div>
  )
}
