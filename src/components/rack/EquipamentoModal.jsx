// Modal "Adicionar switch / Adicionar patch panel" e edição de equipamentos.
// Valida posição em U (dentro da altura do rack e não ocupada), quantidade
// de portas e IP de gerência (IPv4).

import { useEffect, useState } from 'react'
import { XIcon, SwitchIcon, PatchPanelIcon, ZapIcon } from '../icons'
import { CampoInput, CampoSelect, CampoTextarea } from '../sala/Campo'
import ConfirmDialog from '../sala/ConfirmDialog'
import {
  PORTAS_SWITCH,
  PORTAS_PATCH_PANEL,
  QTD_UPLINK,
  CATEGORIAS_CABO,
} from './opcoes'
import { validarEquipamento } from '../../utils/racks'
import '../sala/SalaModal.css'
import './rack.css'

// Presets de portas; devolve 'custom' quando a quantidade atual não é preset
function presetDePortas(quantidade, presets) {
  const valor = String(quantidade)
  return presets.some((p) => p.id === valor) ? valor : 'custom'
}

function estadoInicial(tipo, equipamento, rack) {
  const presets = tipo === 'switch' ? PORTAS_SWITCH : PORTAS_PATCH_PANEL
  if (!equipamento) {
    // Primeira posição livre do rack como sugestão
    const ocupadas = new Set(
      (rack.equipamentos || []).map((eq) => Number(eq.posicaoU))
    )
    let sugerida = 1
    while (ocupadas.has(sugerida) && sugerida <= rack.alturaU) sugerida++
    return {
      nome: '',
      modelo: '',
      presetPortas: presets[1].id, // 16 para switch, 24 para patch panel
      quantidadePortas: '',
      quantidadeUplink: '2',
      posicaoU: String(Math.min(sugerida, rack.alturaU)),
      ipGerencia: '',
      categoriaCaboPadrao: CATEGORIAS_CABO[1] || 'Cat6',
      observacoes: '',
    }
  }
  return {
    nome: equipamento.nome || '',
    modelo: equipamento.modelo || '',
    presetPortas: presetDePortas(equipamento.quantidadePortas, presets),
    quantidadePortas: String(equipamento.quantidadePortas || ''),
    quantidadeUplink: String(equipamento.quantidadeUplink || 0),
    posicaoU: String(equipamento.posicaoU || ''),
    ipGerencia: equipamento.ipGerencia || '',
    categoriaCaboPadrao: equipamento.categoriaCaboPadrao || 'Cat6',
    observacoes: equipamento.observacoes || '',
  }
}

export default function EquipamentoModal({
  tipo,
  equipamento,
  rack,
  sala,
  onFechar,
  onSalvar,
}) {
  const editando = Boolean(equipamento)
  const eSwitch = tipo === 'switch'
  const IconeTitulo = eSwitch ? SwitchIcon : PatchPanelIcon
  const presets = eSwitch ? PORTAS_SWITCH : PORTAS_PATCH_PANEL

  const [form, setForm] = useState(() => estadoInicial(tipo, equipamento, rack))
  const [erros, setErros] = useState({})
  const [sujo, setSujo] = useState(false)
  const [confirmarDescarte, setConfirmarDescarte] = useState(false)

  function atualizar(chave, valor) {
    setSujo(true)
    setForm((atual) => ({ ...atual, [chave]: valor }))
    setErros((atual) => (atual[chave] ? { ...atual, [chave]: undefined } : atual))
  }

  function pedirParaFechar() {
    if (sujo) setConfirmarDescarte(true)
    else onFechar()
  }

  useEffect(() => {
    document.getElementById('campo-nome')?.focus()
    const scrollAnterior = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    function aoTeclar(event) {
      if (event.key === 'Escape' && !confirmarDescarte) {
        event.preventDefault()
        pedirParaFechar()
      }
    }
    window.addEventListener('keydown', aoTeclar)
    return () => {
      document.body.style.overflow = scrollAnterior
      window.removeEventListener('keydown', aoTeclar)
    }
  })

  function aoSubmeter(event) {
    event.preventDefault()
    const dados = {
      tipo,
      nome: form.nome,
      modelo: form.modelo,
      quantidadePortas:
        form.presetPortas === 'custom'
          ? Number(form.quantidadePortas)
          : Number(form.presetPortas),
      quantidadeUplink: eSwitch ? Number(form.quantidadeUplink) : 0,
      posicaoU: Number(form.posicaoU),
      ipGerencia: form.ipGerencia,
      categoriaCaboPadrao: eSwitch ? '' : form.categoriaCaboPadrao,
      observacoes: form.observacoes,
    }
    const validacao = validarEquipamento(dados, rack, equipamento?.id)
    const validacaoForm = {
      ...validacao,
      ...(form.presetPortas === 'custom' && validacao.quantidadePortas
        ? { quantidadePortas: validacao.quantidadePortas }
        : {}),
    }
    if (form.presetPortas !== 'custom') delete validacaoForm.quantidadePortas
    setErros(validacaoForm)
    if (Object.keys(validacaoForm).length > 0) return
    onSalvar(dados)
  }

  const posicoesOcupadas = new Set(
    (rack.equipamentos || [])
      .filter((eq) => eq.id !== equipamento?.id)
      .map((eq) => Number(eq.posicaoU))
  )

  return (
    <div
      className="modal-overlay"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) pedirParaFechar()
      }}
    >
      <div
        className="modal-sala rack-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="titulo-modal-equipamento"
      >
        <header className="modal-cabecalho">
          <div>
            <h2 id="titulo-modal-equipamento">
              {editando
                ? `Editar ${eSwitch ? 'switch' : 'patch panel'}`
                : `Adicionar ${eSwitch ? 'switch' : 'patch panel'}`}
            </h2>
            <p>
              {editando
                ? 'Revise as informações do equipamento.'
                : `O equipamento será posicionado no rack ${rack.nome}.`}
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
              <IconeTitulo size={18} />
              Identificação
            </h3>
            <div className="secao-grade">
              <CampoInput
                chave="nome"
                label={eSwitch ? 'Nome do switch' : 'Nome do patch panel'}
                obrigatorio
                placeholder={eSwitch ? 'ex.: SW-01' : 'ex.: PP-A'}
                erro={erros.nome}
                valor={form.nome}
                aoAlterar={(valor) => atualizar('nome', valor)}
              />
              {eSwitch && (
                <CampoInput
                  chave="modelo"
                  label="Modelo (opcional)"
                  placeholder="ex.: USW-24-POE"
                  valor={form.modelo}
                  aoAlterar={(valor) => atualizar('modelo', valor)}
                />
              )}
              <CampoSelect
                chave="posicaoU"
                label="Posição no rack (U)"
                obrigatorio
                erro={erros.posicaoU}
                valor={form.posicaoU}
                opcoes={Array.from({ length: rack.alturaU }, (_, i) => ({
                  valor: String(i + 1),
                  label: `U${i + 1}`,
                  desabilitada: posicoesOcupadas.has(i + 1),
                }))}
                aoAlterar={(valor) => atualizar('posicaoU', valor)}
              />
              {!eSwitch && (
                <CampoInput
                  chave="modelo"
                  label="Modelo (opcional)"
                  placeholder="ex.: PP-CAT6-24"
                  valor={form.modelo}
                  aoAlterar={(valor) => atualizar('modelo', valor)}
                />
              )}
            </div>
          </section>

          <section className="modal-secao">
            <h3 className="secao-titulo">
              <ZapIcon size={18} />
              Portas
            </h3>
            <div className="secao-grade">
              <CampoSelect
                chave="presetPortas"
                label="Quantidade de portas"
                obrigatorio
                valor={form.presetPortas}
                opcoes={presets}
                aoAlterar={(valor) => atualizar('presetPortas', valor)}
              />
              {form.presetPortas === 'custom' && (
                <CampoInput
                  chave="quantidadePortas"
                  label="Quantidade personalizada"
                  obrigatorio
                  tipo="number"
                  min="1"
                  max="96"
                  step="1"
                  placeholder="ex.: 32"
                  erro={erros.quantidadePortas}
                  valor={form.quantidadePortas}
                  aoAlterar={(valor) => atualizar('quantidadePortas', valor)}
                />
              )}
              {eSwitch && (
                <CampoSelect
                  chave="quantidadeUplink"
                  label="Portas de uplink/SFP"
                  valor={form.quantidadeUplink}
                  opcoes={QTD_UPLINK.map((qtd) => ({
                    valor: String(qtd),
                    label: `${qtd} ${qtd === 1 ? 'porta' : 'portas'}`,
                  }))}
                  erro={erros.quantidadeUplink}
                  aoAlterar={(valor) => atualizar('quantidadeUplink', valor)}
                />
              )}
              {!eSwitch && (
                <CampoSelect
                  chave="categoriaCaboPadrao"
                  label="Categoria do cabo"
                  valor={form.categoriaCaboPadrao}
                  opcoes={CATEGORIAS_CABO}
                  aoAlterar={(valor) => atualizar('categoriaCaboPadrao', valor)}
                />
              )}
            </div>
          </section>

          {eSwitch && (
            <section className="modal-secao">
              <h3 className="secao-titulo">
                <IconeTitulo size={18} />
                Gerência
              </h3>
              <div className="secao-grade">
                <CampoInput
                  chave="ipGerencia"
                  label="IP de gerência (opcional)"
                  placeholder="ex.: 192.168.10.24"
                  erro={erros.ipGerencia}
                  valor={form.ipGerencia}
                  aoAlterar={(valor) => atualizar('ipGerencia', valor)}
                />
              </div>
            </section>
          )}

          <section className="modal-secao">
            <h3 className="secao-titulo">
              <IconeTitulo size={18} />
              Observações
            </h3>
            <div className="secao-grade">
              <CampoTextarea
                chave="observacoes"
                label="Observações (opcional)"
                placeholder="Informações extras sobre o equipamento"
                valor={form.observacoes}
                aoAlterar={(valor) => atualizar('observacoes', valor)}
                className="campo-linha-toda"
              />
            </div>
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
              {editando
                ? 'Salvar alterações'
                : eSwitch
                  ? 'Adicionar switch'
                  : 'Adicionar patch panel'}
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
