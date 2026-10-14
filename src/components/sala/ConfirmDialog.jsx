import { useEffect, useRef } from 'react'
import './ConfirmDialog.css'

// Diálogo pequeno de confirmação (descartar alterações, excluir sala etc.)
// `extraLabel`/`onExtra` adicionam um terceiro botão opcional (ex.: excluir
// um ponto mantendo o histórico de testes).
export default function ConfirmDialog({
  titulo,
  texto,
  confirmarLabel = 'Confirmar',
  cancelarLabel = 'Cancelar',
  extraLabel,
  onExtra,
  perigo = false,
  onConfirmar,
  onCancelar,
}) {
  const cancelarRef = useRef(null)

  // Foco no botão seguro ao abrir
  useEffect(() => {
    cancelarRef.current?.focus()
  }, [])

  // Esc equivale a cancelar
  useEffect(() => {
    function aoTeclar(event) {
      if (event.key === 'Escape') onCancelar()
    }
    window.addEventListener('keydown', aoTeclar)
    return () => window.removeEventListener('keydown', aoTeclar)
  }, [onCancelar])

  return (
    <div
      className="confirm-overlay"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onCancelar()
      }}
    >
      <div
        className="confirm-card"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-titulo"
        aria-describedby="confirm-texto"
      >
        <h3 id="confirm-titulo">{titulo}</h3>
        <p id="confirm-texto">{texto}</p>
        <div className="confirm-botoes">
          <button
            ref={cancelarRef}
            type="button"
            className="confirm-btn cancelar"
            onClick={onCancelar}
          >
            {cancelarLabel}
          </button>
          {extraLabel && (
            <button type="button" className="confirm-btn extra" onClick={onExtra}>
              {extraLabel}
            </button>
          )}
          <button
            type="button"
            className={`confirm-btn ${perigo ? 'perigo' : 'primario'}`}
            onClick={onConfirmar}
          >
            {confirmarLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
