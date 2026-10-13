// Modal "Novo rack / Editar rack" — nome único na sala, altura em U,
// localização e observações.

import { useEffect, useState } from 'react'
import { XIcon, RackIcon } from '../icons'
import { CampoInput, CampoSelect, CampoTextarea } from '../sala/Campo'
import ConfirmDialog from '../sala/ConfirmDialog'
import { ALTURAS_RACK } from './opcoes'
import { validarRack } from '../../utils/racks'
import '../sala/SalaModal.css'
import './rack.css'

export default function RackModal({ rack, sala, onFechar, onSalvar }) {
  const editando = Boolean(rack)
  const [form, setForm] = useState(() => ({
    nome: rack?.nome || '',
    alturaU: String(rack?.alturaU || ALTURAS_RACK[0]),
    localizacao: rack?.localizacao || '',
    observacoes: rack?.observacoes || '',
  }))
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
    const validacao = validarRack(form, sala, rack?.id)
    setErros(validacao)
    if (Object.keys(validacao).length > 0) return
    onSalvar({
      ...form,
      alturaU: Number(form.alturaU),
    })
  }

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
        aria-labelledby="titulo-modal-rack"
      >
        <header className="modal-cabecalho">
          <div>
            <h2 id="titulo-modal-rack">
              {editando ? 'Editar rack' : 'Novo rack'}
            </h2>
            <p>
              {editando
                ? 'Revise as informações do rack.'
                : 'Organize switches e patch panels dentro da sala.'}
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
              <RackIcon size={18} />
              Identificação
            </h3>
            <div className="secao-grade">
              <CampoInput
                chave="nome"
                label="Nome do rack"
                obrigatorio
                placeholder="ex.: Rack Principal"
                erro={erros.nome}
                valor={form.nome}
                aoAlterar={(valor) => atualizar('nome', valor)}
              />
              <CampoSelect
                chave="alturaU"
                label="Altura do rack (U)"
                obrigatorio
                opcoes={ALTURAS_RACK.map((altura) => ({
                  valor: String(altura),
                  label: `${altura} U`,
                }))}
                erro={erros.alturaU}
                valor={form.alturaU}
                aoAlterar={(valor) => atualizar('alturaU', valor)}
              />
              <CampoInput
                chave="localizacao"
                label="Localização dentro da sala (opcional)"
                placeholder="ex.: parede norte, junto ao quadro"
                valor={form.localizacao}
                aoAlterar={(valor) => atualizar('localizacao', valor)}
              />
              <CampoTextarea
                chave="observacoes"
                label="Observações (opcional)"
                placeholder="Informações extras sobre o rack"
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
              {editando ? 'Salvar alterações' : 'Criar rack'}
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
