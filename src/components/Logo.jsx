import { NetworkIcon } from './icons'

export default function Logo() {
  return (
    <a className="logo" href="/" aria-label="NexRedes — Página inicial">
      <NetworkIcon size={26} />
      <span className="logo-text">NexRedes</span>
    </a>
  )
}
