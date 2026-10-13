// Painel lateral de edição de porta (drawer):
// - individual: todos os campos (identificação, dispositivo, ponto de rede,
//   vínculos, cablagem, VLAN, PoE, uplink, teste, observação) + botão
//   "Registrar falha nesta porta";
// - lote: apenas os campos comuns; campos vazios mantêm os valores atuais.
// Rodapé: "Cancelar" e "Aplicar alterações" (roxo).

import { useEffect, useRef, useState } from 'react'
import { XIcon, AlertTriangleIcon } from '../icons'
import { CampoInput, CampoSelect, CampoTextarea } from '../sala/Campo'
import {
  ESTADOS_CAMPO,
  TIPOS_DISPOSITIVO,
  CATEGORIAS_CABO,
  VELOCIDADES,
  MODOS_POE,
  ULTIMOS_TESTES,
  ROTULO_LADO,
} from './opcoes'
import { GRAVIDADES } from '../sala/opcoes'
import {
  falhaAtivaDaPorta,
  listarSwitches,
  listarPatchPanels,
  portasComuns,
} from '../../utils/racks'
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

function Secao({ titulo, children }) {
  return (
    <section className="painel-secao">
      <h4>{titulo}</h4>
      {children}
    </section>
  )
}

// ---------- Formulário individual (uma porta) ----------

function FormIndividual({
  sala,
  equipamento,
  porta,
  onAplicar,
  onCancelar,
  onRegistrarFalha,
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
  const [mostrarFalha, setMostrarFalha] = useState(false)
  const [gravidade, setGravidade] = useState('baixa')
  const [descricaoFalha, setDescricaoFalha] = useState('')
  const [erroFalha, setErroFalha] = useState('')

  const falhaAtiva = falhaAtivaDaPorta(porta, sala.falhas || [])
  const grupos = eSwitch
    ? gruposVinculo(sala, porta, 'patch_panel')
    : porta.lado === 'frente'
      ? gruposVinculo(sala, porta, 'switch')
      : []

  function atualizar(chave, valor) {
    setForm((atual) => ({ ...atual, [chave]: valor }))
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

  function aoRegistrarFalha() {
    if (!descricaoFalha.trim()) {
      setErroFalha('Descreva a falha.')
      return
    }
    onRegistrarFalha(porta, {
      gravidade,
      descricao: descricaoFalha,
    })
    setMostrarFalha(false)
    setDescricaoFalha('')
    setErroFalha('')
  }

  return (
    <form className="painel-form" onSubmit={aoAplicar}>
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

      <Secao titulo="Dispositivo conectado">
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
          Campo manual por enquanto — será substituído pelo módulo de testes
          de certificação.
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

      <Secao titulo="Falha">
        {falhaAtiva ? (
          <p className="painel-falha-ativa">
            <AlertTriangleIcon size={16} />
            <span>
              Falha <strong>({falhaAtiva.gravidade})</strong> registrada em{' '}
              {falhaAtiva.descricao ? `“${falhaAtiva.descricao}”` : 'andamento'}.
              Resolva a falha na aba “Falhas e manutenção” da sala para a porta
              voltar ao normal.
            </span>
          </p>
        ) : mostrarFalha ? (
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
                onClick={() => setMostrarFalha(false)}
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
        ) : (
          <button
            type="button"
            className="btn-registrar-falha"
            onClick={() => setMostrarFalha(true)}
          >
            <AlertTriangleIcon size={16} />
            Registrar falha nesta porta
          </button>
        )}
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

function FormLote({ quantidade, onAplicar, onCancelar }) {
  const [campos, setCampos] = useState({
    estado: '',
    categoriaCabo: '',
    velocidade: '',
    poe: '',
    vlanNativa: '',
    ultimoTeste: '',
    observacao: '',
  })

  function atualizar(chave, valor) {
    setCampos((atual) => ({ ...atual, [chave]: valor }))
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
      <p className="painel-nota">
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
  equipamento,
  portas,
  lote = false,
  ladoInicial = null,
  onFechar,
  onSalvarIndividual,
  onSalvarLote,
  onRegistrarFalha,
}) {
  const painelRef = useRef(null)
  const [ladoAtivo, setLadoAtivo] = useState(
    ladoInicial || portas[0]?.lado || null
  )

  const portasFrente = portas.filter((p) => p.lado === 'frente')
  const portasVerso = portas.filter((p) => p.lado === 'verso')
  const temDoisLados =
    !lote &&
    equipamento.tipo === 'patch_panel' &&
    portasFrente.length > 0 &&
    portasVerso.length > 0

  const portaAtiva = temDoisLados
    ? portas.find((p) => p.lado === ladoAtivo) || portas[0]
    : portas[0]

  // Esc fecha; Tab fica preso dentro do painel; fundo não rola
  useEffect(() => {
    const scrollAnterior = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const primeiroFoco = painelRef.current?.querySelector(
      'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled])'
    )
    primeiroFoco?.focus()
    function aoTeclar(event) {
      if (event.key === 'Escape') {
        event.preventDefault()
        onFechar()
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
    return () => {
      document.body.style.overflow = scrollAnterior
      window.removeEventListener('keydown', aoTeclar)
    }
  }, [onFechar])

  const titulo = lote
    ? `Editar ${portas.length} ${portas.length === 1 ? 'porta' : 'portas'}`
    : `Porta ${portaAtiva?.numero ?? ''}${
        portaAtiva?.lado ? ` (${ROTULO_LADO[portaAtiva.lado]})` : ''
      } — ${equipamento.nome}`

  return (
    <div
      className="painel-overlay"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onFechar()
      }}
    >
      <aside
        ref={painelRef}
        className="porta-painel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="porta-painel-titulo"
      >
        <header className="porta-painel-cabecalho">
          <div>
            <h3 id="porta-painel-titulo">{titulo}</h3>
            <p>
              {equipamento.tipo === 'switch' ? 'Switch' : 'Patch panel'} ·{' '}
              {equipamento.nome}
            </p>
          </div>
          <button
            type="button"
            className="btn-fechar"
            onClick={onFechar}
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
                className={`painel-lado-btn${ladoAtivo === lado ? ' ativo' : ''}`}
                aria-selected={ladoAtivo === lado}
                onClick={() => setLadoAtivo(lado)}
              >
                {ROTULO_LADO[lado]}
              </button>
            ))}
          </div>
        )}

        {lote ? (
          <FormLote
            quantidade={portas.length}
            onAplicar={(campos) => onSalvarLote(portas.map((p) => p.id), campos)}
            onCancelar={onFechar}
          />
        ) : (
          <FormIndividual
            key={portaAtiva?.id}
            sala={sala}
            equipamento={equipamento}
            porta={portaAtiva}
            onAplicar={(dados) => onSalvarIndividual(portaAtiva, dados)}
            onCancelar={onFechar}
            onRegistrarFalha={onRegistrarFalha}
          />
        )}
      </aside>
    </div>
  )
}
