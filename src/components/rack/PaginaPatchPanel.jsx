// Página do patch panel: resumo, legenda clicável (acima do painel), duas
// faixas visuais (frente = lado do switch, verso = lado dos pontos de
// rede) com largura responsiva, filtros e tabela agregada por número de
// porta com a cadeia do inventário:
// ponto de rede → porta do patch panel → porta do switch → categoria do cabo.

import { useEffect, useMemo, useRef, useState } from 'react'
import {
  ArrowLeftIcon,
  PatchPanelIcon,
  SwitchIcon,
  NetworkIcon,
  TagIcon,
} from '../icons'
import Trilha from './Trilha'
import ResumoPortas from './ResumoPortas'
import FaixaPortas from './FaixaPortas'
import LegendaPortas from './LegendaPortas'
import FiltrosPortas from './FiltrosPortas'
import TabelaPortasPP from './TabelaPortasPP'
import PainelPorta from './PainelPorta'
import { corDaSala } from '../../utils/salas'
import { sincronizarPontoDaPorta } from '../../utils/pontos'
import {
  calcularEstadoPorta,
  contarEstados,
  portaCombinaBusca,
  portaCombinaFiltro,
  portaEmUso,
  portasComuns,
  portasVerso,
  resumoPortasLinha,
  piorEstadoEntre,
  salvarPorta,
  salvarPortasLote,
  registrarFalhaPorta,
  registrarTestePorta,
  liberarPorta,
  buscarPortaVinculada,
  descricaoVinculo,
} from '../../utils/racks'
import { estadoPortaInfo } from './opcoes'
import './rack.css'

export default function PaginaPatchPanel({
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
  const [selecionados, setSelecionados] = useState(() => new Set()) // números
  const faixaFrenteRef = useRef(null)
  const faixaVersoRef = useRef(null)
  // painel = { portaIds: [...], lote, ladoInicial }
  const [painel, setPainel] = useState(null)
  // Porta ativa dentro do painel (o destaque do painel visual a acompanha)
  const [portaAtivaPainelId, setPortaAtivaPainelId] = useState(null)

  const falhas = sala.falhas || []
  const todasPortas = equipamento.portas || []
  const frente = useMemo(
    () => portasComuns(equipamento),
    [equipamento]
  )
  const verso = useMemo(() => portasVerso(equipamento), [equipamento])

  const linhas = useMemo(() => {
    const numeros = new Set([
      ...frente.map((p) => p.numero),
      ...verso.map((p) => p.numero),
    ])
    return [...numeros]
      .sort((a, b) => a - b)
      .map((numero) => {
        const portaFrente = frente.find((p) => p.numero === numero)
        const portaVerso = verso.find((p) => p.numero === numero)
        const estadoF = calcularEstadoPorta(portaFrente, falhas)
        const estadoV = calcularEstadoPorta(portaVerso, falhas)
        return {
          numero,
          frente: portaFrente,
          verso: portaVerso,
          estadoF,
          estadoV,
          estadoLinha: piorEstadoEntre(estadoF, estadoV),
        }
      })
  }, [frente, verso, falhas])

  const contagensEstado = useMemo(
    () => contarEstados(todasPortas, falhas),
    [todasPortas, falhas]
  )
  const contagensFiltro = useMemo(
    () => ({
      todas: todasPortas.length,
      em_uso: todasPortas.filter((p) => portaEmUso(p)).length,
      livres: contagensEstado.livre || 0,
      com_falha: (contagensEstado.critica || 0) + (contagensEstado.atencao || 0),
      reservadas: contagensEstado.bloqueada || 0,
      uplink: todasPortas.filter((p) => p.uplink?.ativo || p.sfp).length,
    }),
    [todasPortas, contagensEstado]
  )
  const visiveis = useMemo(
    () =>
      linhas.filter(
        (linha) =>
          (portaCombinaFiltro(linha.frente, linha.estadoF, filtro) ||
            portaCombinaFiltro(linha.verso, linha.estadoV, filtro)) &&
          (portaCombinaBusca(linha.frente, busca) ||
            portaCombinaBusca(linha.verso, busca))
      ),
    [linhas, filtro, busca]
  )
  const resumo = useMemo(
    () => resumoPortasLinha(equipamento, falhas),
    [equipamento, falhas]
  )
  const portasPainel = useMemo(
    () =>
      painel
        ? painel.portaIds
            .map((id) => todasPortas.find((p) => p.id === id))
            .filter(Boolean)
        : [],
    [painel, todasPortas]
  )
  // Passos de navegação do painel (‹ ›): um passo por número de porta
  // (frente + verso juntas, como na tabela)
  const passos = useMemo(
    () =>
      linhas.map((linha) =>
        [linha.frente, linha.verso].filter(Boolean).map((p) => p.id)
      ),
    [linhas]
  )

  // Porta destacada vinda da cadeia do cabo de outro equipamento:
  // abre a página já com o painel da porta vinculada
  useEffect(() => {
    if (!portaDestaqueId) return
    const porta = todasPortas.find((p) => p.id === portaDestaqueId)
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

  function portasDoNumero(numero) {
    const saida = []
    const pf = frente.find((p) => p.numero === numero)
    const pv = verso.find((p) => p.numero === numero)
    if (pf) saida.push(pf)
    if (pv) saida.push(pv)
    return saida
  }

  function focarPorta(portaId) {
    return (
      faixaFrenteRef.current?.focarPorta(portaId) ||
      faixaVersoRef.current?.focarPorta(portaId) ||
      false
    )
  }

  function abrirPainelPorta(porta) {
    setPortaAtivaPainelId(porta.id)
    setPainel({ portaIds: [porta.id], lote: false, ladoInicial: porta.lado })
  }

  function abrirPainelLinha(linha) {
    const portasDaLinha = portasDoNumero(linha.numero)
    setPortaAtivaPainelId(portasDaLinha[0]?.id ?? null)
    setPainel({
      portaIds: portasDaLinha.map((p) => p.id),
      lote: false,
      ladoInicial: 'frente',
    })
  }

  function abrirPainelLote() {
    if (selecionados.size === 0) return
    const ids = []
    selecionados.forEach((numero) => {
      ids.push(...portasDoNumero(numero).map((p) => p.id))
    })
    setPainel({ portaIds: ids, lote: true, ladoInicial: null })
  }

  function fecharPainel(focoPortaId) {
    setPainel(null)
    if (focoPortaId) {
      requestAnimationFrame(() => focarPorta(focoPortaId))
    }
  }

  function aoTrocarPasso(indice, lado) {
    const ids = passos[indice] || []
    setPainel((atual) =>
      atual
        ? {
            ...atual,
            portaIds: ids,
            lote: false,
            ladoInicial: lado || atual.ladoInicial || 'frente',
          }
        : atual
    )
    // Destaque imediato da porta ativa do novo passo (o painel confirma
    // logo depois via onPortaAtivaChange)
    const ladoAlvo = lado || painel?.ladoInicial || 'frente'
    const novaAtiva = ids
      .map((id) => todasPortas.find((p) => p.id === id))
      .find((p) => p && p.lado === ladoAlvo)
    setPortaAtivaPainelId(novaAtiva?.id || ids[0] || null)
  }

  function toggleNumero(numero) {
    setSelecionados((atual) => {
      const novo = new Set(atual)
      if (novo.has(numero)) novo.delete(numero)
      else novo.add(numero)
      return novo
    })
  }

  function selecionarTodosVisiveis() {
    setSelecionados((atual) => {
      const novo = new Set(atual)
      visiveis.forEach((linha) => novo.add(linha.numero))
      return novo
    })
  }

  function desmarcarTodos() {
    setSelecionados(new Set())
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
    setSelecionados(new Set())
    onMostrarToast('Portas atualizadas com sucesso')
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

  // Rótulos acima das portas conectadas (nome abreviado + ícone)
  function rotuloFrente(porta) {
    if (porta.vinculo) {
      const achado = buscarPortaVinculada(sala, porta)
      if (achado?.porta) {
        return {
          Icone: SwitchIcon,
          nome: achado.equipamento.nome,
          title: `Ligada a ${achado.equipamento.nome} / porta ${achado.porta.numero}`,
        }
      }
    }
    if (porta.uplink?.ativo) {
      return {
        Icone: SwitchIcon,
        nome: porta.uplink.destino || 'Uplink',
        title: `Uplink: ${porta.uplink.destino || '—'}`,
      }
    }
    return null
  }

  function rotuloVerso(porta) {
    const identificacao = (porta.pontoRede?.identificacao || '').trim()
    if (identificacao) {
      return {
        Icone: NetworkIcon,
        nome: identificacao,
        title: `Ponto de rede ${identificacao}${
          porta.pontoRede?.local ? ` — ${porta.pontoRede.local}` : ''
        }`,
      }
    }
    return null
  }

  function linhasTooltipFrente(porta) {
    const info = estadoPortaInfo(calcularEstadoPorta(porta, falhas))
    const linhas = [`Porta ${porta.numero} (frente)`]
    if (porta.nome) linhas.push(porta.nome)
    const vinculo = descricaoVinculo(sala, porta)
    if (vinculo) linhas.push(`Switch: ${vinculo}`)
    if (porta.categoriaCabo) linhas.push(`Cabo: ${porta.categoriaCabo}`)
    linhas.push(`Status: ${info.descricao}`)
    return linhas
  }

  function linhasTooltipVerso(porta) {
    const info = estadoPortaInfo(calcularEstadoPorta(porta, falhas))
    const linhas = [`Porta ${porta.numero} (verso)`]
    if (porta.nome) linhas.push(porta.nome)
    if (porta.pontoRede?.identificacao) {
      linhas.push(`Ponto de rede: ${porta.pontoRede.identificacao}`)
    }
    if (porta.pontoRede?.local) linhas.push(`Local: ${porta.pontoRede.local}`)
    if (porta.comprimentoM) linhas.push(`Cabo: ~${porta.comprimentoM} m`)
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
          <PatchPanelIcon size={28} />
        </span>
        <div className="rack-cabecalho-titulos">
          <h2>{equipamento.nome}</h2>
          <p>
            Patch panel · {equipamento.quantidadePortas} portas ·{' '}
            {equipamento.categoriaCaboPadrao || '—'} · U{equipamento.posicaoU}
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
          Frente (lado do switch)
        </h2>
        <p className="faixa-subtitulo">
          Onde o patch cord liga o patch panel às portas do switch.
        </p>
        <FaixaPortas
          ref={faixaFrenteRef}
          portas={frente}
          modo="patch_panel"
          falhas={falhas}
          selecionadaId={
            painel && !painel.lote
              ? portaAtivaPainelId || painel.portaIds[0]
              : null
          }
          estadoFiltro={estadoFiltro}
          onClicarPorta={abrirPainelPorta}
          rotuloDaPorta={rotuloFrente}
          linhasDaPorta={linhasTooltipFrente}
          titulo={`Frente do patch panel ${equipamento.nome}`}
        />
      </section>

      <section className="rack-vista-bloco">
        <h2>
          <NetworkIcon size={18} />
          Verso (lado dos pontos de rede)
        </h2>
        <p className="faixa-subtitulo">
          Onde o cabo horizontal sai até a tomada/ponto de rede na parede.
        </p>
        <FaixaPortas
          ref={faixaVersoRef}
          portas={verso}
          modo="patch_panel"
          falhas={falhas}
          selecionadaId={
            painel && !painel.lote
              ? portaAtivaPainelId || painel.portaIds[0]
              : null
          }
          estadoFiltro={estadoFiltro}
          onClicarPorta={abrirPainelPorta}
          rotuloDaPorta={rotuloVerso}
          linhasDaPorta={linhasTooltipVerso}
          titulo={`Verso do patch panel ${equipamento.nome}`}
        />
      </section>

      <section className="rack-vista-bloco">
        <div className="tabela-topo">
          <h2>
            <PatchPanelIcon size={18} />
            Portas ({visiveis.length}/{linhas.length})
          </h2>
          {selecionados.size > 0 && (
            <div className="lote-barra">
              <span>
                {selecionados.size}{' '}
                {selecionados.size === 1 ? 'porta' : 'portas'} selecionada(s)
              </span>
              <button type="button" className="btn-adicionar" onClick={abrirPainelLote}>
                Editar em lote
              </button>
              <button
                type="button"
                className="btn-adicionar"
                onClick={desmarcarTodos}
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

        <TabelaPortasPP
          sala={sala}
          linhas={visiveis}
          ordenacao={ordenacao}
          onOrdenar={aoOrdenar}
          numerosSelecionados={selecionados}
          onToggleNumero={toggleNumero}
          onSelecionarTodos={selecionarTodosVisiveis}
          onDesmarcarTodos={desmarcarTodos}
          linhaPainelNumero={
            painel && !painel.lote && portasPainel.length > 0
              ? portasPainel[0].numero
              : null
          }
          onAbrirLinha={abrirPainelLinha}
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
