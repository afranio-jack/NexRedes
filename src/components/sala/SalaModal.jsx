import { useEffect, useMemo, useRef, useState } from 'react'
import {
  XIcon,
  MapPinIcon,
  MonitorIcon,
  NetworkIcon,
  ServerIcon,
  AlertTriangleIcon,
  UsersIcon,
} from '../icons'
import './SalaModal.css'
import { CampoInput, CampoSelect, CampoTextarea } from './Campo'
import ListaPontosRede from './ListaPontosRede'
import ListaEquipamentos from './ListaEquipamentos'
import ListaFalhas from './ListaFalhas'
import ConfirmDialog from './ConfirmDialog'
import { CORES_SALA, ICONES_SALA, TIPOS_SALA } from './opcoes'
import { gerarCodigoSalas } from '../../utils/salas'
import { IPV4_REGEX } from '../../utils/validation'
import { hojeISO } from '../../utils/datas'

// Estado inicial do formulário: vazio na criação, preenchido na edição
function estadoInicial(sala) {
  const base = {
    nome: '',
    codigo: '',
    tipo: TIPOS_SALA[0],
    cor: CORES_SALA[0].id,
    icone: ICONES_SALA[0].id,
    responsavel: '',
    observacoes: '',
    predio: '',
    andar: '',
    descricaoLocalizacao: '',
    quantidadeMaquinas: '0',
    tiposMaquinas: '',
    pontosRede: [],
    equipamentos: [],
    falhas: [],
  }
  if (!sala) return { ...base, codigo: gerarCodigoSalas() }
  return {
    ...base,
    nome: sala.nome || '',
    codigo: sala.codigo || '',
    tipo: sala.tipo || base.tipo,
    cor: sala.cor || base.cor,
    icone: sala.icone || base.icone,
    responsavel: sala.responsavel || '',
    observacoes: sala.observacoes || '',
    predio: sala.predio || '',
    andar: sala.andar || '',
    descricaoLocalizacao: sala.descricaoLocalizacao || '',
    quantidadeMaquinas: String(sala.quantidadeMaquinas ?? 0),
    tiposMaquinas: sala.tiposMaquinas || '',
    pontosRede: sala.pontosRede || [],
    equipamentos: sala.equipamentos || [],
    falhas: sala.falhas || [],
  }
}

// Validação completa do formulário; devolve mapa de erros por chave
function validarFormulario(form, salasExistentes, idAtual) {
  const erros = {}
  const nome = form.nome.trim()
  const codigo = form.codigo.trim()

  if (!nome) erros.nome = 'Informe o nome da sala ou setor.'
  else if (
    salasExistentes.some(
      (outra) =>
        outra.id !== idAtual &&
        outra.nome.trim().toLowerCase() === nome.toLowerCase()
    )
  )
    erros.nome = 'Já existe uma sala com esse nome.'

  if (!codigo) erros.codigo = 'Informe a identificação/código da sala.'
  else if (
    salasExistentes.some(
      (outra) =>
        outra.id !== idAtual &&
        (outra.codigo || '').trim().toLowerCase() === codigo.toLowerCase()
    )
  )
    erros.codigo = 'Já existe uma sala com esse código.'

  if (!form.predio.trim()) erros.predio = 'Informe o prédio ou bloco.'
  if (!form.andar.trim()) erros.andar = 'Informe o andar.'

  const maquinas = Number(form.quantidadeMaquinas)
  if (
    form.quantidadeMaquinas === '' ||
    !Number.isInteger(maquinas) ||
    maquinas < 0
  )
    erros.quantidadeMaquinas =
      'Informe um número inteiro maior ou igual a 0.'

  const identificacoes = new Set()
  form.pontosRede.forEach((ponto, index) => {
    const chave = `pontosRede.${index}.identificacao`
    const ident = (ponto.identificacao || '').trim()
    const normalizada = ident.toLowerCase()
    if (!ident) erros[chave] = 'Informe a identificação do ponto.'
    else if (identificacoes.has(normalizada))
      erros[chave] = 'Identificação repetida nesta sala.'
    else identificacoes.add(normalizada)
  })

  form.equipamentos.forEach((equipamento, index) => {
    if (!(equipamento.nome || '').trim())
      erros[`equipamentos.${index}.nome`] = 'Informe o nome do equipamento.'
    const ip = (equipamento.ip || '').trim()
    if (ip && !IPV4_REGEX.test(ip))
      erros[`equipamentos.${index}.ip`] =
        'Informe um IPv4 válido (ex.: 192.168.10.24).'
  })

  const hoje = hojeISO()
  form.falhas.forEach((falha, index) => {
    if (!(falha.descricao || '').trim())
      erros[`falhas.${index}.descricao`] = 'Descreva a falha.'
    if (!falha.dataIdentificacao)
      erros[`falhas.${index}.dataIdentificacao`] =
        'Informe a data de identificação.'
    else if (falha.dataIdentificacao > hoje)
      erros[`falhas.${index}.dataIdentificacao`] =
        'A data não pode ser futura.'
  })

  return erros
}

// Monta o objeto Sala a partir do formulário (trim + tipos convertidos)
function montarDados(form) {
  const texto = (valor) => (valor || '').trim()
  return {
    nome: texto(form.nome),
    codigo: texto(form.codigo),
    tipo: form.tipo,
    cor: form.cor,
    icone: form.icone,
    responsavel: texto(form.responsavel),
    observacoes: texto(form.observacoes),
    predio: texto(form.predio),
    andar: texto(form.andar),
    descricaoLocalizacao: texto(form.descricaoLocalizacao),
    quantidadeMaquinas: Number(form.quantidadeMaquinas),
    tiposMaquinas: texto(form.tiposMaquinas),
    pontosRede: form.pontosRede.map((ponto) => ({
      ...ponto,
      identificacao: texto(ponto.identificacao),
      patchPanelPorta: texto(ponto.patchPanelPorta),
      portaSwitch: texto(ponto.portaSwitch),
      observacao: texto(ponto.observacao),
    })),
    equipamentos: form.equipamentos.map((equipamento) => ({
      ...equipamento,
      nome: texto(equipamento.nome),
      modelo: texto(equipamento.modelo),
      ip: texto(equipamento.ip),
      vlan: texto(equipamento.vlan),
      observacao: texto(equipamento.observacao),
    })),
    falhas: form.falhas.map((falha) => ({
      ...falha,
      descricao: texto(falha.descricao),
      historicoManutencao: (falha.historicoManutencao || []).map((registro) => ({
        ...registro,
        texto: texto(registro.texto),
      })),
    })),
  }
}

// Seletor visual de cor (círculos coloridos)
function SeletorCor({ valor, aoAlterar }) {
  return (
    <div className="seletor-swatches" role="radiogroup" aria-label="Cor da sala">
      {CORES_SALA.map((cor) => (
        <button
          key={cor.id}
          type="button"
          role="radio"
          aria-checked={valor === cor.id}
          aria-label={`Cor ${cor.label}`}
          title={cor.label}
          className={`swatch${valor === cor.id ? ' ativo' : ''}`}
          style={{ '--swatch-cor': cor.valor }}
          onClick={() => aoAlterar(cor.id)}
        >
          <span className="swatch-dot" aria-hidden="true"></span>
        </button>
      ))}
    </div>
  )
}

// Seletor visual de ícone (ícones existentes do app)
function SeletorIcone({ valor, aoAlterar }) {
  return (
    <div className="seletor-swatches" role="radiogroup" aria-label="Ícone da sala">
      {ICONES_SALA.map((opcao) => (
        <button
          key={opcao.id}
          type="button"
          role="radio"
          aria-checked={valor === opcao.id}
          aria-label={`Ícone ${opcao.label}`}
          title={opcao.label}
          className={`swatch swatch-icone${valor === opcao.id ? ' ativo' : ''}`}
          onClick={() => aoAlterar(opcao.id)}
        >
          <opcao.Icon size={20} />
        </button>
      ))}
    </div>
  )
}

export default function SalaModal({
  sala,
  salasExistentes,
  onFechar,
  onSalvar,
}) {
  const editando = Boolean(sala)
  const [form, setForm] = useState(() => estadoInicial(sala))
  const [erros, setErros] = useState({})
  const [sujo, setSujo] = useState(false)
  const [confirmarDescarte, setConfirmarDescarte] = useState(false)
  const modalRef = useRef(null)

  // Alvos possíveis para falhas: pontos + equipamentos da própria tela + "Outro"
  const alvosFalha = useMemo(() => {
    const nomesPontos = form.pontosRede
      .map((ponto) => (ponto.identificacao || '').trim())
      .filter(Boolean)
    const nomesEquipamentos = form.equipamentos
      .map((equipamento) => (equipamento.nome || '').trim())
      .filter(Boolean)
    return [...new Set([...nomesPontos, ...nomesEquipamentos]), 'Outro']
  }, [form.pontosRede, form.equipamentos])

  // Foco no primeiro campo + trava o scroll do fundo
  useEffect(() => {
    document.getElementById('campo-nome')?.focus()
    const scrollAnterior = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = scrollAnterior
    }
  }, [])

  // Esc fecha (com confirmação se houver alterações); Tab fica preso no modal
  useEffect(() => {
    function aoTeclar(event) {
      if (confirmarDescarte) return
      if (event.key === 'Escape') {
        event.preventDefault()
        pedirParaFechar()
        return
      }
      if (event.key === 'Tab') {
        const focos = Array.from(
          modalRef.current.querySelectorAll(
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
  })

  function limparErro(chave) {
    setErros((atual) =>
      atual[chave] ? { ...atual, [chave]: undefined } : atual
    )
  }

  function atualizar(chave, valor) {
    setSujo(true)
    setForm((atual) => ({ ...atual, [chave]: valor }))
    limparErro(chave)
  }

  function atualizarLista(chave, lista) {
    setSujo(true)
    setForm((atual) => ({ ...atual, [chave]: lista }))
  }

  function pedirParaFechar() {
    if (sujo) setConfirmarDescarte(true)
    else onFechar()
  }

  function aoSubmeter(event) {
    event.preventDefault()
    const validacao = validarFormulario(form, salasExistentes, sala?.id)
    setErros(validacao)

    const chavesErro = Object.keys(validacao).filter((chave) => validacao[chave])
    if (chavesErro.length > 0) {
      // Rola até o primeiro erro e foca o campo correspondente
      const primeiro = modalRef.current.querySelector(
        `[data-erro-chave="${chavesErro[0]}"]`
      )
      primeiro?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      primeiro?.querySelector('input, select, textarea')?.focus({
        preventScroll: true,
      })
      return
    }
    onSalvar(montarDados(form))
  }

  return (
    <div
      className="modal-overlay"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) pedirParaFechar()
      }}
    >
      <div
        ref={modalRef}
        className="modal-sala"
        role="dialog"
        aria-modal="true"
        aria-labelledby="titulo-modal-sala"
      >
        <header className="modal-cabecalho">
          <div>
            <h2 id="titulo-modal-sala">
              {editando ? 'Editar sala' : 'Nova sala'}
            </h2>
            <p>
              {editando
                ? 'Revise e ajuste as informações da sala.'
                : 'Preencha as informações do ambiente. Você poderá editar tudo depois.'}
            </p>
          </div>
          <button
            type="button"
            className="btn-fechar"
            onClick={pedirParaFechar}
            aria-label="Fechar"
          >
            <XIcon size={20} />
          </button>
        </header>

        <form onSubmit={aoSubmeter} className="modal-corpo">
          <section className="modal-secao">
            <h3 className="secao-titulo">
              <UsersIcon size={18} />
              Identificação
            </h3>
            <div className="secao-grade">
              <CampoInput
                chave="nome"
                label="Nome da sala ou setor"
                obrigatorio
                placeholder="ex.: Secretaria"
                erro={erros.nome}
                valor={form.nome}
                aoAlterar={(valor) => atualizar('nome', valor)}
              />
              <CampoInput
                chave="codigo"
                label="Identificação / código"
                obrigatorio
                placeholder="ex.: SALA-01"
                erro={erros.codigo}
                valor={form.codigo}
                aoAlterar={(valor) => atualizar('codigo', valor)}
              />
              <CampoSelect
                chave="tipo"
                label="Tipo / finalidade"
                obrigatorio
                valor={form.tipo}
                opcoes={TIPOS_SALA}
                aoAlterar={(valor) => atualizar('tipo', valor)}
              />
              <CampoInput
                chave="responsavel"
                label="Responsável pela sala"
                placeholder="ex.: Ana Souza"
                valor={form.responsavel}
                aoAlterar={(valor) => atualizar('responsavel', valor)}
              />
              <div className="campo" data-erro-chave="cor">
                <span className="campo-rotulo-solto">Cor da sala</span>
                <SeletorCor
                  valor={form.cor}
                  aoAlterar={(valor) => atualizar('cor', valor)}
                />
              </div>
              <div className="campo" data-erro-chave="icone">
                <span className="campo-rotulo-solto">Ícone</span>
                <SeletorIcone
                  valor={form.icone}
                  aoAlterar={(valor) => atualizar('icone', valor)}
                />
              </div>
              <CampoTextarea
                chave="observacoes"
                label="Observações"
                placeholder="Informações extras sobre a sala"
                valor={form.observacoes}
                aoAlterar={(valor) => atualizar('observacoes', valor)}
                className="campo-linha-toda"
              />
            </div>
          </section>

          <section className="modal-secao">
            <h3 className="secao-titulo">
              <MapPinIcon size={18} />
              Localização
            </h3>
            <div className="secao-grade">
              <CampoInput
                chave="predio"
                label="Prédio ou bloco"
                obrigatorio
                placeholder="ex.: Bloco A"
                erro={erros.predio}
                valor={form.predio}
                aoAlterar={(valor) => atualizar('predio', valor)}
              />
              <CampoInput
                chave="andar"
                label="Andar"
                obrigatorio
                placeholder="ex.: 2º andar"
                erro={erros.andar}
                valor={form.andar}
                aoAlterar={(valor) => atualizar('andar', valor)}
              />
              <CampoInput
                chave="descricaoLocalizacao"
                label="Descrição da localização"
                placeholder="ex.: ao lado da sala 12"
                valor={form.descricaoLocalizacao}
                aoAlterar={(valor) => atualizar('descricaoLocalizacao', valor)}
                className="campo-linha-toda"
              />
            </div>
          </section>

          <section className="modal-secao">
            <h3 className="secao-titulo">
              <MonitorIcon size={18} />
              Máquinas
            </h3>
            <div className="secao-grade">
              <CampoInput
                chave="quantidadeMaquinas"
                label="Quantidade de máquinas"
                obrigatorio
                tipo="number"
                min="0"
                step="1"
                erro={erros.quantidadeMaquinas}
                valor={form.quantidadeMaquinas}
                aoAlterar={(valor) => atualizar('quantidadeMaquinas', valor)}
              />
              <CampoInput
                chave="tiposMaquinas"
                label="Tipos de máquinas (opcional)"
                placeholder="ex.: 40 desktops, 5 notebooks, 2 impressoras"
                valor={form.tiposMaquinas}
                aoAlterar={(valor) => atualizar('tiposMaquinas', valor)}
              />
            </div>
          </section>

          <section className="modal-secao">
            <h3 className="secao-titulo">
              <NetworkIcon size={18} />
              Pontos de rede
            </h3>
            <ListaPontosRede
              itens={form.pontosRede}
              aoAlterar={(lista) => atualizarLista('pontosRede', lista)}
              erros={erros}
              aoLimparErro={limparErro}
            />
          </section>

          <section className="modal-secao">
            <h3 className="secao-titulo">
              <ServerIcon size={18} />
              Equipamentos associados
            </h3>
            <ListaEquipamentos
              itens={form.equipamentos}
              aoAlterar={(lista) => atualizarLista('equipamentos', lista)}
              erros={erros}
              aoLimparErro={limparErro}
            />
          </section>

          <section className="modal-secao">
            <h3 className="secao-titulo">
              <AlertTriangleIcon size={18} />
              Falhas e manutenção
            </h3>
            <ListaFalhas
              itens={form.falhas}
              aoAlterar={(lista) => atualizarLista('falhas', lista)}
              erros={erros}
              aoLimparErro={limparErro}
              alvos={alvosFalha}
            />
          </section>

          <footer className="modal-rodape">
            <button
              type="button"
              className="btn-modal secundario"
              onClick={pedirParaFechar}
            >
              Cancelar
            </button>
            <button type="submit" className="btn-modal primario">
              {editando ? 'Salvar alterações' : 'Criar sala'}
            </button>
          </footer>
        </form>
      </div>

      {confirmarDescarte && (
        <ConfirmDialog
          titulo="Descartar alterações?"
          texto="Existem informações preenchidas que serão perdidas se você fechar agora."
          confirmarLabel="Descartar"
          cancelarLabel="Continuar editando"
          perigo
          onConfirmar={onFechar}
          onCancelar={() => setConfirmarDescarte(false)}
        />
      )}
    </div>
  )
}
