import { SearchIcon } from './icons'

export default function NaoEncontrada({ onVoltar }) {
  const caminho = window.location.pathname || '/'

  return (
    <div className="card notfound">
      <span className="notfound-icon" aria-hidden="true">
        <SearchIcon size={28} />
      </span>
      <h1>Página não encontrada</h1>
      <p className="subtitle">
        O endereço <code className="notfound-caminho">{caminho}</code> não
        existe neste aplicativo.
      </p>
      <button type="button" className="btn-primary" onClick={onVoltar}>
        Voltar
      </button>
    </div>
  )
}
