import { useEffect } from 'react'
import './Toast.css'

// Aviso discreto temporário (ex.: "Sala criada com sucesso")
export default function Toast({ mensagem, onFechar }) {
  useEffect(() => {
    if (!mensagem) return
    const timer = setTimeout(onFechar, 3000)
    return () => clearTimeout(timer)
  }, [mensagem, onFechar])

  if (!mensagem) return null

  return (
    <div className="toast" role="status" aria-live="polite">
      {mensagem}
    </div>
  )
}
