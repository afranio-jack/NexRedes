// Painel lateral da porta (drawer) — componente único usado pelas páginas
// de switch e de patch panel:
// - aba "Resumo" (abre primeiro, somente leitura): localização, conexão,
//   cadeia do cabo, cabo, rede, certificação (teste rápido), falhas,
//   histórico e observações;
// - aba "Editar": formulário com todos os campos da porta;
// - lote: apenas os campos comuns (campos vazios mantêm os valores atuais).
// Setas ‹ › navegam entre as portas; alterações não aplicadas pedem
// confirmação antes de fechar ou trocar de porta.

import { Fragment, useEffect, useMemo, useRef, useState } from 'react'
import {
  XIcon,
  AlertTriangleIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ArrowRightIcon,
  PlugIcon,
  NetworkIcon,
  SwitchIcon,
  PatchPanelIcon,
  BoxIcon,
  PencilIcon,
  CheckCircleIcon,
} from '../icons'
import { CampoInput, CampoSelect, CampoTextarea } from '../sala/Campo'
import ConfirmDialog from '../sala/ConfirmDialog'
import {
  ESTADOS_CAMPO,
  TIPOS_DISPOSITIVO,
  CATEGORIAS_CABO,
  VELOCIDADES,
  MODOS_POE,
  ULTIMOS_TESTES,
  ROTULO_LADO,
  estadoPortaInfo,
  dispositivoInfo,
  rotuloDispositivo,
  rotuloVelocidade,
  rotuloPoe,
  rotuloTeste,
} from './opcoes'
import { GRAVIDADES, STATUS_FALHA } from '../sala/opcoes'
import {
  calcularEstadoPorta,
  falhaAtivaDaPorta,
  buscarPortaVinculada,
  portaEmUso,
  listarSwitches,
  listarPatchPanels,
  portasComuns,
} from '../../utils/racks'
import { formatarDataRelativa, formatarDataHora } from '../../utils/datas'
import '../sala/SalaModal.css'
import './rack.css'

const OPCOES_ESTADO = ESTADOS_CAMPO.map((item) => ({
  valor: item.id,
  label: item.label,
}))

const OPCOES_DISPOSITIVO = [{ valor: '', label: 'Nenhum' }].concat(
  TIPOS_DISPOSITIVO.map((item) => ({ valor: item.id, label: item.label }))
)

function opcioneTeste() {
  return ULTIMOS_TESTES.map((item) => ({ valor: item.id, label: item.label }))
}

function rotuloGravidade(id) {
  return GRAVIDADES.find((item) => item.id === id)?.label || id || 'Baixa'
}

function rotuloStatusFalha(id) {
  return STATUS_FALHA.find((item) => item.id === id)?.label || id || 'Aberta'
}

// Grupos de vínculo: equipamentos da sala + portas livres (ou a própria)
function gruposVinculo(sala, porta, tipoAlvo) {
  const equipamentos =
    tipoAlvo === 'patch_panel' ? listarPatchPanels(sala) : listarSwitches(sala)
  return equipamentos
    .map((equipamento) => {
      const candidatas =
        equipamento.tipo === 'patch_panel'
          ? portasComuns(equipamento)
          : equipamento.portas || []
      return {
        equipamento,
        portas: candidatas.filter(
          (p) => !p.vinculo || p.vinculo.portaId === porta.id
        ),
      }
    })
    .filter((grupo) => grupo.portas.length > 0)
}

function Secao({ titulo, id, children }) {
  return (
    <section className="painel-secao" id={id}>
      <h4>{titulo}</h4>
      {children}
    </section>
  )
}

// ---------- Cadeia do cabo (Resumo) ----------

function itemPontoRede(pontoRede) {
  const identificacao = (pontoRede?.identificacao || '').trim()
  return {
    titulo: 'Ponto de rede',
    icone: NetworkIcon,
    rotulo: identificacao
      ? `${identificacao}${pontoRede.local ? ` — ${pontoRede.local}` : ''}`
      : '',
  }
}

function itemPortaVinculada(achado, titulo) {
  if (achado?.porta) {
    const lado = achado.porta.lado ? ` (${ROTULO_LADO[achado.porta.lado]})` : ''
    return {
      titulo,
      icone:
        achado.equipamento.tipo === 'switch' ? SwitchIcon : PatchPanelIcon,
      rotulo: `${achado.equipamento.nome} / porta ${achado.porta.numero}${lado}`,
      clicavel: {
        equipamentoId: achado.equipamento.id,
        portaId: achado.porta.id,
      },
    }
  }
  return {
    titulo,
    icone: titulo === 'Porta do switch' ? SwitchIcon : PatchPanelIcon,
    rotulo: '',
  }
}

// Ponto de rede → Patch panel/porta → Porta do switch → Categoria do cabo
function itensDaCadeia(sala, equipamento, porta) {
  const vinculado = porta.vinculo ? buscarPortaVinculada(sala, porta) : null
  const irmao = (lado) =>
    (equipamento.portas || []).find(
      (p) => p.numero === porta.numero && p.lado === lado
    ) || null
  const itemCategoria = {
    titulo: 'Categoria do cabo',
    icone: PlugIcon,
    rotulo: porta.categoriaCabo || '',
  }

  if (equipamento.tipo === 'switch') {
    const versoDoPP = vinculado?.porta
      ? (vinculado.equipamento.portas || []).find(
          (p) => p.numero === vinculado.porta.numero && p.lado === 'verso'
        )
      : null
    return [
      itemPontoRede(versoDoPP?.pontoRede),
      itemPortaVinculada(vinculado, 'Patch panel'),
      {
        titulo: 'Porta do switch',
        icone: SwitchIcon,
        rotulo: `${equipamento.nome} / porta ${porta.numero}`,
      },
      itemCategoria,
    ]
  }
  if (porta.lado === 'verso') {
    const frente = irmao('frente')
    return [
      itemPontoRede(porta.pontoRede),
      {
        titulo: 'Patch panel',
        icone: PatchPanelIcon,
        rotulo: `${equipamento.nome} / porta ${porta.numero} (verso)`,
      },
      itemPortaVinculada(
        frente?.vinculo ? buscarPortaVinculada(sala, frente) : null,
        'Porta do switch'
      ),
      itemCategoria,
    ]
  }
  return [
    itemPontoRede(irmao('verso')?.pontoRede),
    {
      titulo: 'Patch panel',
      icone: PatchPanelIcon,
      rotulo: `${equipamento.nome} / porta ${porta.numero} (frente)`,
    },
    itemPortaVinculada(vinculado, 'Porta do switch'),
    itemCategoria,
  ]
}

// ---------- Aba Resumo (somente leitura) ----------

function ResumoPorta({
  sala,
  rack,
  equipamento,
  porta,
  falhas,
  hidden,
  onEditar,
  onConectar,
  onPedirLiberar,
  onRegistrarFalha,
  onRegistrarTeste,
  onAbrirEquipamento,
  onVoltarSala,
  onVoltarRack,
  onFechar,
  ...rest
}) {
  const [mostrarFalha, setMostrarFalha] = useState(false)
  const [gravidade, setGravidade] = useState('baixa')
  const [descricaoFalha, setDescricaoFalha] = useState('')
  const [erroFalha, setErroFalha] = useState('')
  const [mostrarTeste, setMostrarTeste] = useState(false)

  const falhaAtiva = falhaAtivaDaPorta(porta, falhas)
  const disp = porta.dispositivoConectado
  const temDispositivo = Boolean(
    disp?.tipo || (disp?.nome || '').trim()
  )
  const vinculado = porta.vinculo ? buscarPortaVinculada(sala, porta) : null
  const cadeia = itensDaCadeia(sala, equipamento, porta)
  const teste = porta.ultimoTeste || 'SEM_TESTE'

  function aoRegistrarFalha() {
    if (!descricaoFalha.trim()) {
      setErroFalha('Descreva a falha.')
      return
    }
    onRegistrarFalha(porta, { gravidade, descricao: descricaoFalha })
    setMostrarFalha(false)
    setDescricaoFalha('')
    setErroFalha('')
  }

  const rotuloPorta = `Porta ${porta.numero}${
    porta.sfp ? ' (SFP)' : ''
  }${porta.lado ? ` (${ROTULO_LADO[porta.lado]})` : ''}`

  return (
    <div className="painel-resumo" hidden={hidden} {...rest}>
      <div className="painel-acoes">
        <button
          type="button"
          className="btn-modal primario painel-acao-editar"
          onClick={onEditar}
        >
          <PencilIcon size={15} />
          Editar
        </button>
        <button
          type="button"
          className="btn-registrar-falha"
          onClick={() => {
            setMostrarFalha(true)
            document
              .getElementById(`p-${porta.id}-secao-falhas`)
              ?.scrollIntoView({ behavior: 'smooth', block: 'center' })
          }}
        >
          <AlertTriangleIcon size={15} />
          Registrar falha
        </button>
        {portaEmUso(porta) && (
          <button
            type="button"
            className="btn-liberar-porta"
            onClick={onPedirLiberar}
          >
            <PlugIcon size={15} />
            Liberar porta
          </button>
        )}
      </div>

      <Secao titulo="Localização">
        <nav className="painel-localizacao" aria-label="Localização da porta">
          <button type="button" onClick={onVoltarSala}>
            {sala.nome}
          </button>
          <ChevronRightIcon size={12} />
          <button type="button" onClick={onVoltarRack}>
            {rack?.nome}
          </button>
          <ChevronRightIcon size={12} />
          <button type="button" onClick={onVoltarRack}>
            {equipamento.nome}
          </button>
          <ChevronRightIcon size={12} />
          <button type="button" onClick={onFechar}>
            {rotuloPorta}
          </button>
        </nav>
      </Secao>

      <Secao titulo="Conexão">
        {temDispositivo ? (
          <div className="conexao-card">
            <span className="conexao-icone" aria-hidden="true">
              {(() => {
                const Icone = dispositivoInfo(disp.tipo)?.Icone || BoxIcon
                return <Icone size={20} />
              })()}
            </span>
            <div>
              <strong className="conexao-nome">
                {disp.nome || rotuloDispositivo(disp.tipo)}
              </strong>
              <p className="conexao-detalhe">
                {rotuloDispositivo(disp.tipo)}
                {disp.mac ? ` · MAC ${disp.mac}` : ''}
                {disp.ip ? ` · IP ${disp.ip}` : ''}
              </p>
            </div>
          </div>
        ) : vinculado?.porta ? (
          <div className="conexao-card">
            <span className="conexao-icone" aria-hidden="true">
              {vinculado.equipamento.tipo === 'switch' ? (
                <SwitchIcon size={20} />
              ) : (
                <PatchPanelIcon size={20} />
              )}
            </span>
            <div>
              <strong className="conexao-nome">
                {vinculado.equipamento.nome} · porta {vinculado.porta.numero}
              </strong>
              <p className="conexao-detalhe">Ligada por patch cord</p>
            </div>
          </div>
        ) : porta.uplink?.ativo ? (
          <div className="conexao-card">
            <span className="conexao-icone" aria-hidden="true">
              <NetworkIcon size={20} />
            </span>
            <div>
              <strong className="conexao-nome">Uplink</strong>
              <p className="conexao-detalhe">
                {porta.uplink.destino || 'Destino não informado'}
              </p>
            </div>
          </div>
        ) : (
          <div className="conexao-vazia">
            <span className="conexao-vazia-icone" aria-hidden="true">
              <PlugIcon size={22} />
            </span>
            <p>Nada conectado nesta porta</p>
            <button
              type="button"
              className="btn-modal primario"
              onClick={onConectar}
            >
              Conectar dispositivo
            </button>
          </div>
        )}
      </Secao>

      <Secao titulo="Cadeia do cabo">
        <div className="cadeia">
          {cadeia.map((item, index) => (
            <Fragment key={item.titulo}>
              {index > 0 && (
                <span className="cadeia-seta" aria-hidden="true">
                  <ArrowRightIcon size={14} />
                </span>
              )}
              {item.clicavel ? (
                <button
                  type="button"
                  className="cadeia-item clicavel"
                  title={`Abrir ${item.rotulo}`}
                  onClick={() =>
                    onAbrirEquipamento(
                      item.clicavel.equipamentoId,
                      item.clicavel.portaId
                    )
                  }
                >
                  <span className="cadeia-tipo">
                    <item.icone size={12} /> {item.titulo}
                  </span>
                  <span className="cadeia-rotulo">{item.rotulo}</span>
                </button>
              ) : (
                <div className={`cadeia-item${item.rotulo ? '' : ' vazio'}`}>
                  <span className="cadeia-tipo">
                    <item.icone size={12} /> {item.titulo}
                  </span>
                  <span className="cadeia-rotulo">
                    {item.rotulo || 'não definido'}
                  </span>
                </div>
              )}
            </Fragment>
          ))}
        </div>
      </Secao>

      <Secao titulo="Cabo">
        <dl className="painel-fatos">
          <div className="fato">
            <dt>Categoria</dt>
            <dd>{porta.categoriaCabo || '—'}</dd>
          </div>
          <div className="fato">
            <dt>Comprimento aprox.</dt>
            <dd>{porta.comprimentoM ? `~${porta.comprimentoM} m` : '—'}</dd>
          </div>
        </dl>
      </Secao>

      <Secao titulo="Rede">
        <dl className="painel-fatos">
          <div className="fato">
            <dt>Velocidade</dt>
            <dd>{rotuloVelocidade(porta.velocidade)}</dd>
          </div>
          <div className="fato">
            <dt>PoE</dt>
            <dd>{rotuloPoe(porta.poe)}</dd>
          </div>
          <div className="fato">
            <dt>VLAN nativa</dt>
            <dd>{porta.vlanNativa || '—'}</dd>
          </div>
          <div className="fato">
            <dt>VLANs permitidas</dt>
            <dd>{porta.vlansPermitidas || '—'}</dd>
          </div>
        </dl>
      </Secao>

      <Secao titulo="Certificação">
        <div className="certificacao-linha">
          <span className={`selo-teste ${String(teste).toLowerCase()}`}>
            {rotuloTeste(teste)}
          </span>
          {porta.dataUltimoTeste && (
            <span className="certificacao-data">
              Testado em {formatarDataHora(porta.dataUltimoTeste)}
            </span>
          )}
        </div>
        {Array.isArray(porta.medicoesTeste) && porta.medicoesTeste.length > 0 && (
          <ul className="medicoes">
            {porta.medicoesTeste.map((medicao, index) => (
              <li key={index}>
                {medicao.nome}:{' '}
                <strong>{medicao.valor}</strong>
                {medicao.dentro !== undefined && (
                  <span
                    className={
                      medicao.dentro ? 'medicao-ok' : 'medicao-fora'
                    }
                  >
                    {medicao.dentro ? 'dentro do limite' : 'fora do limite'}
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
        {mostrarTeste ? (
          <div className="teste-form">
            <p className="painel-nota">
              Registrar resultado do teste de certificação (data e hora
              automáticas):
            </p>
            <div className="teste-botoes">
              <button
                type="button"
                className="btn-teste pass"
                onClick={() => {
                  onRegistrarTeste(porta, 'PASS')
                  setMostrarTeste(false)
                }}
              >
                Teste PASS
              </button>
              <button
                type="button"
                className="btn-teste fail"
                onClick={() => {
                  onRegistrarTeste(porta, 'FAIL')
                  setMostrarTeste(false)
                }}
              >
                Teste FAIL
              </button>
              <button
                type="button"
                className="btn-modal secundario"
                onClick={() => setMostrarTeste(false)}
              >
                Cancelar
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            className="btn-registrar-teste"
            onClick={() => setMostrarTeste(true)}
          >
            <CheckCircleIcon size={15} />
            Registrar teste
          </button>
        )}
      </Secao>

      <Secao
        titulo="Falhas e manutenção"
        id={`p-${porta.id}-secao-falhas`}
      >
        {falhaAtiva ? (
          <div
            className={`falha-item${
              falhaAtiva.gravidade === 'critica' ? ' critica' : ''
            }`}
          >
            <div className="falha-item-topo">
              <strong>{falhaAtiva.descricao || 'Falha em andamento'}</strong>
              <span className="falha-badge">
                {rotuloGravidade(falhaAtiva.gravidade)}
              </span>
            </div>
            <p>
              {falhaAtiva.alvo} ·{' '}
              {formatarDataRelativa(falhaAtiva.dataIdentificacao)} ·{' '}
              {rotuloStatusFalha(falhaAtiva.status)}
            </p>
          </div>
        ) : (
          !mostrarFalha && <p className="painel-nota">Nenhuma falha registrada.</p>
        )}
        {mostrarFalha && (
          <div className="painel-falha-form">
            <CampoSelect
              chave={`p-${porta.id}-grav`}
              label="Gravidade"
              valor={gravidade}
              opcoes={GRAVIDADES.map((g) => ({ valor: g.id, label: g.label }))}
              aoAlterar={setGravidade}
            />
            <CampoTextarea
              chave={`p-${porta.id}-descfalha`}
              label="Descrição da falha"
              obrigatorio
              linhas={2}
              placeholder="ex.: Sem link na porta, cabo rompido..."
              erro={erroFalha}
              valor={descricaoFalha}
              aoAlterar={(valor) => {
                setDescricaoFalha(valor)
                setErroFalha('')
              }}
            />
            <div className="painel-falha-botoes">
              <button
                type="button"
                className="btn-modal secundario"
                onClick={() => {
                  setMostrarFalha(false)
                  setErroFalha('')
                }}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="btn-falha"
                onClick={aoRegistrarFalha}
              >
                <AlertTriangleIcon size={15} />
                Registrar falha
              </button>
            </div>
          </div>
        )}
      </Secao>

      <Secao titulo="Histórico">
        {(porta.historico || []).length > 0 ? (
          <ul className="historico">
            {porta.historico.map((registro) => (
              <li key={registro.id} className="historico-item">
                <span className="historico-data">
                  {formatarDataHora(registro.data)}
                </span>
                <span className="historico-texto">{registro.texto}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="painel-nota">Sem registros feitos no app ainda.</p>
        )}
      </Secao>

      <Secao titulo="Observações">
        {porta.observacao ? (
          <p className="painel-observacao">{porta.observacao}</p>
        ) : (
          <p className="painel-nota">Sem observações.</p>
        )}
      </Secao>
    </div>
  )
}

// ---------- Formulário individual (aba Editar) ----------

function FormIndividual({
  sala,
  equipamento,
  porta,
  hidden,
  focoSecao,
  onFocoConsumido,
  onDirty,
  onAplicar,
  onCancelar,
  ...rest
}) {
  const eSwitch = equipamento.tipo === 'switch'
  const eVerso = porta.lado === 'verso'
  const vinculoAtual = porta.vinculo
    ? `${porta.vinculo.equipamentoId}::${porta.vinculo.portaId}`
    : ''

  const [form, setForm] = useState(() => ({
    nome: porta.nome || '',
    estado: porta.estado || 'ativa',
    tipoDispositivo: porta.dispositivoConectado?.tipo || '',
    nomeDispositivo: porta.dispositivoConectado?.nome || '',
    macDispositivo: porta.dispositivoConectado?.mac || '',
    ipDispositivo: porta.dispositivoConectado?.ip || '',
    pontoIdentificacao: porta.pontoRede?.identificacao || '',
    pontoLocal: porta.pontoRede?.local || '',
    vinculo: vinculoAtual,
    categoriaCabo: porta.categoriaCabo || '',
    comprimentoM: porta.comprimentoM ?? '',
    velocidade: porta.velocidade || 'auto',
    poe: porta.poe || 'desligado',
    vlanNativa: porta.vlanNativa || '',
    vlansPermitidas: porta.vlansPermitidas || '',
    uplinkAtivo: porta.uplink?.ativo ? 'sim' : 'nao',
    uplinkDestino: porta.uplink?.destino || '',
    ultimoTeste: porta.ultimoTeste || 'SEM_TESTE',
    observacao: porta.observacao || '',
  }))

  const grupos = eSwitch
    ? gruposVinculo(sala, porta, 'patch_panel')
    : porta.lado === 'frente'
      ? gruposVinculo(sala, porta, 'switch')
      : []

  useEffect(() => {
    onDirty?.(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // "Conectar dispositivo" (Resumo) salta para a seção do dispositivo
  useEffect(() => {
    if (!focoSecao) return
    const secao = document.getElementById(`p-${porta.id}-secao-${focoSecao}`)
    if (secao) {
      secao.scrollIntoView({ behavior: 'smooth', block: 'center' })
      secao.querySelector('select, input, textarea')?.focus()
    }
    onFocoConsumido?.()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focoSecao])

  function atualizar(chave, valor) {
    setForm((atual) => ({ ...atual, [chave]: valor }))
    onDirty?.(true)
  }

  function aoAplicar(event) {
    event.preventDefault()
    const [equipamentoId, portaId] = form.vinculo
      ? form.vinculo.split('::')
      : [null, null]
    onAplicar({
      nome: form.nome,
      estado: form.estado,
      dispositivoConectado: {
        tipo: form.tipoDispositivo,
        nome: form.nomeDispositivo,
        mac: form.macDispositivo,
        ip: form.ipDispositivo,
      },
      pontoRede: {
        identificacao: form.pontoIdentificacao,
        local: form.pontoLocal,
      },
      vinculo: equipamentoId
        ? { equipamentoId, portaId }
        : null,
      categoriaCabo: form.categoriaCabo,
      comprimentoM: form.comprimentoM,
      velocidade: form.velocidade,
      poe: form.poe,
      vlanNativa: form.vlanNativa,
      vlansPermitidas: form.vlansPermitidas,
      uplink: {
        ativo: form.uplinkAtivo === 'sim',
        destino: form.uplinkDestino,
      },
      ultimoTeste: form.ultimoTeste,
      observacao: form.observacao,
    })
  }

  return (
    <form className="painel-form" hidden={hidden} onSubmit={aoAplicar}>
      <Secao titulo="Identificação">
        <CampoInput
          chave={`p-${porta.id}-nome`}
          label="Nome / identificação da porta"
          placeholder="ex.: Impressora da secretaria"
          valor={form.nome}
          aoAlterar={(valor) => atualizar('nome', valor)}
        />
        <CampoSelect
          chave={`p-${porta.id}-estado`}
          label="Estado da porta"
          valor={form.estado}
          opcoes={OPCOES_ESTADO}
          aoAlterar={(valor) => atualizar('estado', valor)}
        />
      </Secao>

      <Secao
        titulo="Dispositivo conectado"
        id={`p-${porta.id}-secao-dispositivo`}
      >
        <CampoSelect
          chave={`p-${porta.id}-tipo`}
          label="Tipo de dispositivo"
          valor={form.tipoDispositivo}
          opcoes={OPCOES_DISPOSITIVO}
          aoAlterar={(valor) => atualizar('tipoDispositivo', valor)}
        />
        <CampoInput
          chave={`p-${porta.id}-dispn`}
          label="Nome do dispositivo"
          placeholder="ex.: SEC-IMP-01"
          valor={form.nomeDispositivo}
          aoAlterar={(valor) => atualizar('nomeDispositivo', valor)}
        />
        <div className="painel-grid-2">
          <CampoInput
            chave={`p-${porta.id}-mac`}
            label="MAC (opcional)"
            placeholder="ex.: AA:BB:CC:11:22:33"
            valor={form.macDispositivo}
            aoAlterar={(valor) => atualizar('macDispositivo', valor)}
          />
          <CampoInput
            chave={`p-${porta.id}-ip`}
            label="IP (opcional)"
            placeholder="ex.: 10.0.5.21"
            valor={form.ipDispositivo}
            aoAlterar={(valor) => atualizar('ipDispositivo', valor)}
          />
        </div>
      </Secao>

      <Secao titulo="Ponto de rede vinculado">
        <div className="painel-grid-2">
          <CampoInput
            chave={`p-${porta.id}-ponto`}
            label="Identificação do ponto"
            placeholder="ex.: PR-03-07"
            valor={form.pontoIdentificacao}
            aoAlterar={(valor) => atualizar('pontoIdentificacao', valor)}
          />
          <CampoInput
            chave={`p-${porta.id}-pontol`}
            label="Local do ponto"
            placeholder="ex.: Secretaria, parede 2"
            valor={form.pontoLocal}
            aoAlterar={(valor) => atualizar('pontoLocal', valor)}
          />
        </div>
      </Secao>

      <Secao titulo="Vínculos">
        {eSwitch && (
          <div className="campo">
            <label htmlFor={`p-${porta.id}-vinculo`}>
              Patch panel e porta vinculados
            </label>
            <select
              id={`p-${porta.id}-vinculo`}
              className="campo-input"
              value={form.vinculo}
              onChange={(event) => atualizar('vinculo', event.target.value)}
            >
              <option value="">Sem vínculo</option>
              {grupos.map((grupo) => (
                <optgroup
                  key={grupo.equipamento.id}
                  label={grupo.equipamento.nome}
                >
                  {grupo.portas.map((p) => (
                    <option
                      key={p.id}
                      value={`${grupo.equipamento.id}::${p.id}`}
                    >
                      porta {p.numero}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>
        )}
        {equipamento.tipo === 'patch_panel' && porta.lado === 'frente' && (
          <div className="campo">
            <label htmlFor={`p-${porta.id}-vinculo`}>
              Porta de switch vinculada
            </label>
            <select
              id={`p-${porta.id}-vinculo`}
              className="campo-input"
              value={form.vinculo}
              onChange={(event) => atualizar('vinculo', event.target.value)}
            >
              <option value="">Sem vínculo</option>
              {grupos.map((grupo) => (
                <optgroup
                  key={grupo.equipamento.id}
                  label={grupo.equipamento.nome}
                >
                  {grupo.portas.map((p) => (
                    <option
                      key={p.id}
                      value={`${grupo.equipamento.id}::${p.id}`}
                    >
                      porta {p.numero}
                      {p.sfp ? ' (SFP)' : ''}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>
        )}
        {eVerso && (
          <p className="painel-nota">
            O verso do patch panel conecta ao ponto de rede na parede — use os
            campos “Ponto de rede vinculado” acima.
          </p>
        )}
      </Secao>

      <Secao titulo="Cablagem">
        <CampoSelect
          chave={`p-${porta.id}-cab`}
          label="Categoria do cabo"
          valor={form.categoriaCabo}
          opcoes={[{ valor: '', label: '—' }].concat(
            CATEGORIAS_CABO.map((c) => ({ valor: c, label: c }))
          )}
          aoAlterar={(valor) => atualizar('categoriaCabo', valor)}
        />
        <CampoInput
          chave={`p-${porta.id}-comp`}
          label="Comprimento aproximado do cabo (m)"
          tipo="number"
          min="0"
          step="0.5"
          placeholder="ex.: 15"
          valor={form.comprimentoM}
          aoAlterar={(valor) => atualizar('comprimentoM', valor)}
        />
      </Secao>

      <Secao titulo="Rede">
        <div className="painel-grid-2">
          <CampoSelect
            chave={`p-${porta.id}-vel`}
            label="Velocidade"
            valor={form.velocidade}
            opcoes={VELOCIDADES.map((v) => ({ valor: v.id, label: v.label }))}
            aoAlterar={(valor) => atualizar('velocidade', valor)}
          />
          <CampoSelect
            chave={`p-${porta.id}-poe`}
            label="PoE"
            valor={form.poe}
            opcoes={MODOS_POE.map((m) => ({ valor: m.id, label: m.label }))}
            aoAlterar={(valor) => atualizar('poe', valor)}
          />
        </div>
        <div className="painel-grid-2">
          <CampoInput
            chave={`p-${porta.id}-vlan`}
            label="VLAN nativa"
            tipo="number"
            min="1"
            max="4094"
            placeholder="ex.: 10"
            valor={form.vlanNativa}
            aoAlterar={(valor) => atualizar('vlanNativa', valor)}
          />
          <CampoInput
            chave={`p-${porta.id}-vlans`}
            label="VLANs permitidas (opcional)"
            placeholder="ex.: 10, 20, 30"
            valor={form.vlansPermitidas}
            aoAlterar={(valor) => atualizar('vlansPermitidas', valor)}
          />
        </div>
      </Secao>

      <Secao titulo="Uplink">
        <div className="painel-grid-2">
          <CampoSelect
            chave={`p-${porta.id}-uplink`}
            label="Uplink / tronco"
            valor={form.uplinkAtivo}
            opcoes={[
              { valor: 'nao', label: 'Não' },
              { valor: 'sim', label: 'Sim' },
            ]}
            aoAlterar={(valor) => atualizar('uplinkAtivo', valor)}
          />
          <CampoInput
            chave={`p-${porta.id}-dest`}
            label="Para onde"
            placeholder="ex.: SW-Core-02 / porta 48"
            valor={form.uplinkDestino}
            aoAlterar={(valor) => atualizar('uplinkDestino', valor)}
          />
        </div>
      </Secao>

      <Secao titulo="Certificação">
        <CampoSelect
          chave={`p-${porta.id}-teste`}
          label="Resultado do último teste"
          valor={form.ultimoTeste}
          opcoes={opicioneTeste()}
          aoAlterar={(valor) => atualizar('ultimoTeste', valor)}
        />
        <p className="painel-nota">
          Para registrar um teste com data e hora, use o botão “Registrar
          teste” na aba Resumo.
        </p>
      </Secao>

      <Secao titulo="Observação">
        <CampoTextarea
          chave={`p-${porta.id}-obs`}
          label="Observação"
          linhas={2}
          placeholder="Informações extras sobre a porta"
          valor={form.observacao}
          aoAlterar={(valor) => atualizar('observacao', valor)}
        />
      </Secao>

      <footer className="painel-rodape">
        <button
          type="button"
          className="btn-modal secundario"
          onClick={onCancelar}
        >
          Cancelar
        </button>
        <button type="submit" className="btn-modal primario">
          Aplicar alterações
        </button>
      </footer>
    </form>
  )
}

// ---------- Formulário em lote (várias portas) ----------

function FormLote({ quantidade, onDirty, onAplicar, onCancelar }) {
  const [campos, setCampos] = useState({
    estado: '',
    categoriaCabo: '',
    velocidade: '',
    poe: '',
    vlanNativa: '',
    ultimoTeste: '',
    observacao: '',
  })

  useEffect(() => {
    onDirty?.(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function atualizar(chave, valor) {
    setCampos((atual) => ({ ...atual, [chave]: valor }))
    onDirty?.(true)
  }

  function aoAplicar(event) {
    event.preventDefault()
    const aplicar = {}
    Object.entries(campos).forEach(([chave, valor]) => {
      if (valor !== '') aplicar[chave] = valor
    })
    onAplicar(aplicar)
  }

  return (
    <form className="painel-form" onSubmit={aoAplicar}>
      <p className="painel-nota painel-nota-lote">
        {quantidade} porta(s) selecionada(s). Campos vazios mantêm os valores
        atuais de cada porta.
      </p>

      <Secao titulo="Estado">
        <CampoSelect
          chave="lote-estado"
          label="Estado"
          valor={campos.estado}
          opcoes={[
            { valor: '', label: 'Manter atual' },
            ...ESTADOS_CAMPO.map((e) => ({ valor: e.id, label: e.label })),
          ]}
          aoAlterar={(valor) => atualizar('estado', valor)}
        />
      </Secao>

      <Secao titulo="Cablagem">
        <CampoSelect
          chave="lote-cabo"
          label="Categoria do cabo"
          valor={campos.categoriaCabo}
          opcoes={[
            { valor: '', label: 'Manter atual' },
            ...CATEGORIAS_CABO.map((c) => ({ valor: c, label: c })),
          ]}
          aoAlterar={(valor) => atualizar('categoriaCabo', valor)}
        />
      </Secao>

      <Secao titulo="Rede">
        <div className="painel-grid-2">
          <CampoSelect
            chave="lote-vel"
            label="Velocidade"
            valor={campos.velocidade}
            opcoes={[
              { valor: '', label: 'Manter atual' },
              ...VELOCIDADES.map((v) => ({ valor: v.id, label: v.label })),
            ]}
            aoAlterar={(valor) => atualizar('velocidade', valor)}
          />
          <CampoSelect
            chave="lote-poe"
            label="PoE"
            valor={campos.poe}
            opcoes={[
              { valor: '', label: 'Manter atual' },
              ...MODOS_POE.map((m) => ({ valor: m.id, label: m.label })),
            ]}
            aoAlterar={(valor) => atualizar('poe', valor)}
          />
        </div>
        <CampoInput
          chave="lote-vlan"
          label="VLAN nativa (vazio mantém)"
          tipo="number"
          min="1"
          max="4094"
          placeholder="ex.: 10"
          valor={campos.vlanNativa}
          aoAlterar={(valor) => atualizar('vlanNativa', valor)}
        />
      </Secao>

      <Secao titulo="Certificação">
        <CampoSelect
          chave="lote-teste"
          label="Último teste"
          valor={campos.ultimoTeste}
          opcoes={[
            { valor: '', label: 'Manter atual' },
            ...ULTIMOS_TESTES.map((t) => ({ valor: t.id, label: t.label })),
          ]}
          aoAlterar={(valor) => atualizar('ultimoTeste', valor)}
        />
      </Secao>

      <Secao titulo="Observação">
        <CampoTextarea
          chave="lote-obs"
          label="Observação (vazio mantém)"
          linhas={2}
          placeholder="Substitui a observação de todas as selecionadas"
          valor={campos.observacao}
          aoAlterar={(valor) => atualizar('observacao', valor)}
        />
      </Secao>

      <footer className="painel-rodape">
        <button
          type="button"
          className="btn-modal secundario"
          onClick={onCancelar}
        >
          Cancelar
        </button>
        <button type="submit" className="btn-modal primario">
          Aplicar a {quantidade} porta(s)
        </button>
      </footer>
    </form>
  )
}

// ---------- Painel (drawer) ----------

export default function PainelPorta({
  sala,
  rack,
  equipamento,
  portas,
  passos,
  lote = false,
  ladoInicial = null,
  onFechar,
  onTrocarPasso,
  onSalvarIndividual,
  onSalvarLote,
  onRegistrarFalha,
  onRegistrarTeste,
  onLiberar,
  onAbrirEquipamento,
  onVoltarSala,
  onVoltarRack,
}) {
  const painelRef = useRef(null)
  const [exibindo, setExibindo] = useState(portas)
  const [sujo, setSujo] = useState(false)
  const [confirmar, setConfirmar] = useState(null) // { tipo: 'fechar' | 'passo' | 'liberar', portas? }
  const [aba, setAba] = useState('resumo')
  const [focoSecao, setFocoSecao] = useState(null)
  const [versaoForm, setVersaoForm] = useState(0)
  const [ladoAtivo, setLadoAtivo] = useState(ladoInicial || null)

  const falhas = sala.falhas || []
  const portasFrente = exibindo.filter((p) => p.lado === 'frente')
  const portasVerso = exibindo.filter((p) => p.lado === 'verso')
  const temDoisLados =
    !lote &&
    equipamento.tipo === 'patch_panel' &&
    portasFrente.length > 0 &&
    portasVerso.length > 0
  const ladoValido = exibindo.some((p) => p.lado === ladoAtivo)
  const ladoEfetivo = temDoisLados
    ? ladoValido
      ? ladoAtivo
      : portasFrente.length > 0
        ? 'frente'
        : 'verso'
    : null
  const portaAtiva = temDoisLados
    ? exibindo.find((p) => p.lado === ladoEfetivo) || exibindo[0]
    : exibindo[0]

  const indicePasso = useMemo(() => {
    if (lote || !Array.isArray(passos)) return -1
    return passos.findIndex((passo) =>
      passo.some((id) => exibindo.some((p) => p.id === id))
    )
  }, [passos, exibindo, lote])

  // Sincroniza a seleção vinda da página (clique no desenho/tabela ou setas):
  // mesmas portas = apenas atualiza dados; portas diferentes com alterações
  // pendentes = pede confirmação antes de trocar.
  useEffect(() => {
    const idsProp = portas.map((p) => p.id).sort().join('|')
    const idsExib = exibindo.map((p) => p.id).sort().join('|')
    if (idsProp === idsExib) {
      if (portas.some((p, i) => p !== exibindo[i])) setExibindo(portas)
      setConfirmar((atual) => (atual?.tipo === 'passo' ? null : atual))
      return
    }
    if (sujo) {
      setConfirmar({ tipo: 'passo', portas })
    } else {
      setExibindo(portas)
    }
    // sujo/confirmar lidos na hora da mudança, de propósito
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [portas])

  // Mantém o lado (frente/verso) que o usuário estava vendo ao navegar
  useEffect(() => {
    if (ladoInicial && exibindo.some((p) => p.lado === ladoInicial)) {
      setLadoAtivo(ladoInicial)
    }
  }, [ladoInicial, exibindo])

  // Foco no painel ao abrir; fundo não rola
  useEffect(() => {
    const scrollAnterior = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    painelRef.current?.focus()
    return () => {
      document.body.style.overflow = scrollAnterior
    }
  }, [])

  function pedirParaFechar() {
    if (sujo) setConfirmar({ tipo: 'fechar' })
    else onFechar()
  }

  // Esc fecha (com confirmação se houver alterações); Tab fica preso dentro
  useEffect(() => {
    function aoTeclar(event) {
      if (confirmar) return
      if (event.key === 'Escape') {
        event.preventDefault()
        pedirParaFechar()
        return
      }
      if (event.key === 'Tab' && painelRef.current) {
        const focos = Array.from(
          painelRef.current.querySelectorAll(
            'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled])'
          )
        ).filter((elemento) => elemento.offsetParent !== null)
        if (focos.length === 0) return
        const primeiro = focos[0]
        const ultimo = focos[focos.length - 1]
        if (event.shiftKey && document.activeElement === primeiro) {
          event.preventDefault()
          ultimo.focus()
        } else if (!event.shiftKey && document.activeElement === ultimo) {
          event.preventDefault()
          primeiro.focus()
        }
      }
    }
    window.addEventListener('keydown', aoTeclar)
    return () => window.removeEventListener('keydown', aoTeclar)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [confirmar, sujo])

  function irParaPasso(direcao) {
    if (indicePasso < 0 || !Array.isArray(passos) || passos.length < 2) return
    const novo = (indicePasso + direcao + passos.length) % passos.length
    const lado = temDoisLados
      ? ladoEfetivo
      : exibindo[0]?.lado || null
    onTrocarPasso(novo, lado)
  }

  if (!portaAtiva) return null

  const infoStatus = estadoPortaInfo(calcularEstadoPorta(portaAtiva, falhas))
  const podeNavegar = !lote && Array.isArray(passos) && passos.length > 1

  return (
    <div
      className="painel-overlay"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) pedirParaFechar()
      }}
    >
      <aside
        ref={painelRef}
        className="porta-painel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="porta-painel-titulo"
        tabIndex={-1}
      >
        <header className="porta-painel-cabecalho">
          {lote ? (
            <div>
              <h3 id="porta-painel-titulo">
                Editar {exibindo.length}{' '}
                {exibindo.length === 1 ? 'porta' : 'portas'}
              </h3>
              <p>
                {equipamento.tipo === 'switch' ? 'Switch' : 'Patch panel'} ·{' '}
                {equipamento.nome}
              </p>
            </div>
          ) : (
            <div className="painel-cabecalho-porta">
              <div className="painel-cabecalho-linha">
                <h3 id="porta-painel-titulo">
                  Porta {portaAtiva.numero}
                  {portaAtiva.sfp ? ' (SFP)' : ''}
                  {portaAtiva.lado ? ` · ${ROTULO_LADO[portaAtiva.lado]}` : ''}
                </h3>
                {podeNavegar && (
                  <div className="painel-nav">
                    <button
                      type="button"
                      className="painel-nav-seta"
                      onClick={() => irParaPasso(-1)}
                      aria-label="Porta anterior"
                      title="Porta anterior"
                    >
                      <ChevronLeftIcon size={16} />
                    </button>
                    <button
                      type="button"
                      className="painel-nav-seta"
                      onClick={() => irParaPasso(1)}
                      aria-label="Próxima porta"
                      title="Próxima porta"
                    >
                      <ChevronRightIcon size={16} />
                    </button>
                  </div>
                )}
              </div>
              <div className="painel-cabecalho-linha">
                <span
                  className="painel-status"
                  style={{
                    background: infoStatus.cor,
                    borderColor: infoStatus.borda,
                    color: infoStatus.id === 'livre' ? '#1f2937' : '#fff',
                  }}
                >
                  <infoStatus.Icone size={12} />
                  {infoStatus.selo}
                </span>
                <span className="painel-nome-porta">
                  {portaAtiva.nome || equipamento.nome}
                </span>
              </div>
            </div>
          )}
          <button
            type="button"
            className="btn-fechar"
            onClick={pedirParaFechar}
            aria-label="Fechar painel"
          >
            <XIcon size={20} />
          </button>
        </header>

        {temDoisLados && (
          <div className="painel-lados" role="tablist" aria-label="Lado do patch panel">
            {['frente', 'verso'].map((lado) => (
              <button
                key={lado}
                type="button"
                role="tab"
                className={`painel-lado-btn${ladoEfetivo === lado ? ' ativo' : ''}`}
                aria-selected={ladoEfetivo === lado}
                onClick={() => setLadoAtivo(lado)}
              >
                {ROTULO_LADO[lado]}
              </button>
            ))}
          </div>
        )}

        {!lote && (
          <div
            className="painel-abas"
            role="tablist"
            aria-label="Modo de exibição da porta"
          >
            <button
              type="button"
              role="tab"
              id="painel-aba-resumo"
              aria-selected={aba === 'resumo'}
              aria-controls="painel-conteudo-resumo"
              className={`painel-aba-btn${aba === 'resumo' ? ' ativo' : ''}`}
              onClick={() => setAba('resumo')}
            >
              Resumo
            </button>
            <button
              type="button"
              role="tab"
              id="painel-aba-editar"
              aria-selected={aba === 'editar'}
              aria-controls="painel-conteudo-editar"
              className={`painel-aba-btn${aba === 'editar' ? ' ativo' : ''}`}
              onClick={() => setAba('editar')}
            >
              Editar
            </button>
          </div>
        )}

        {!lote && portaAtiva && (
          <ResumoPorta
            key={portaAtiva.id}
            id="painel-conteudo-resumo"
            role="tabpanel"
            aria-labelledby="painel-aba-resumo"
            sala={sala}
            rack={rack}
            equipamento={equipamento}
            porta={portaAtiva}
            falhas={falhas}
            hidden={aba !== 'resumo'}
            onEditar={() => setAba('editar')}
            onConectar={() => {
              setAba('editar')
              setFocoSecao('dispositivo')
            }}
            onPedirLiberar={() => setConfirmar({ tipo: 'liberar' })}
            onRegistrarFalha={(porta, dadosFalha) => {
              onRegistrarFalha?.(porta, dadosFalha)
              setVersaoForm((v) => v + 1)
            }}
            onRegistrarTeste={(porta, resultado) => {
              onRegistrarTeste?.(porta, resultado)
              setVersaoForm((v) => v + 1)
            }}
            onAbrirEquipamento={onAbrirEquipamento}
            onVoltarSala={onVoltarSala}
            onVoltarRack={onVoltarRack}
            onFechar={pedirParaFechar}
          />
        )}

        {lote ? (
          <FormLote
            quantidade={exibindo.length}
            onDirty={setSujo}
            onAplicar={(campos) =>
              onSalvarLote(exibindo.map((p) => p.id), campos)
            }
            onCancelar={pedirParaFechar}
          />
        ) : (
          <FormIndividual
            key={`${portaAtiva.id}-${versaoForm}`}
            id="painel-conteudo-editar"
            role="tabpanel"
            aria-labelledby="painel-aba-editar"
            sala={sala}
            equipamento={equipamento}
            porta={portaAtiva}
            hidden={aba !== 'editar'}
            focoSecao={focoSecao}
            onFocoConsumido={() => setFocoSecao(null)}
            onDirty={setSujo}
            onAplicar={(dados) => onSalvarIndividual(portaAtiva, dados)}
            onCancelar={pedirParaFechar}
          />
        )}
      </aside>

      {confirmar?.tipo === 'fechar' && (
        <ConfirmDialog
          titulo="Descartar alterações?"
          texto="Há alterações não aplicadas nesta porta. Fechar o painel vai perdê-las."
          confirmarLabel="Descartar e fechar"
          cancelarLabel="Continuar editando"
          onConfirmar={() => {
            setConfirmar(null)
            setSujo(false)
            onFechar()
          }}
          onCancelar={() => setConfirmar(null)}
        />
      )}

      {confirmar?.tipo === 'passo' && (
        <ConfirmDialog
          titulo="Trocar de porta?"
          texto="Há alterações não aplicadas nesta porta. Ao trocar de porta, elas serão perdidas."
          confirmarLabel="Descartar e trocar"
          cancelarLabel="Ficar nesta porta"
          onConfirmar={() => {
            setExibindo(confirmar.portas)
            setSujo(false)
            setConfirmar(null)
          }}
          onCancelar={() => {
            const alvo = indicePasso
            setConfirmar(null)
            if (alvo >= 0) {
              onTrocarPasso(
                alvo,
                temDoisLados ? ladoEfetivo : exibindo[0]?.lado || null
              )
            }
          }}
        />
      )}

      {confirmar?.tipo === 'liberar' && (
        <ConfirmDialog
          titulo="Liberar porta?"
          texto="Isso desfaz a conexão e os vínculos desta porta (dispositivo, ponto de rede, vínculo e uplink). Nome, estado, categoria do cabo, teste e observação são mantidos."
          confirmarLabel="Liberar porta"
          cancelarLabel="Cancelar"
          perigo
          onConfirmar={() => {
            setConfirmar(null)
            setSujo(false)
            onLiberar?.(portaAtiva)
            setVersaoForm((v) => v + 1)
            setAba('resumo')
          }}
          onCancelar={() => setConfirmar(null)}
        />
      )}
    </div>
  )
}
