const ICON_PATH =
  'M24 3 L42 13 L42 35 L24 45 L6 35 L6 13 Z ' +
  'M29.5 16.5 A5.5 5.5 0 1 0 18.5 16.5 A5.5 5.5 0 1 0 29.5 16.5 Z ' +
  'M22.3 29.5 A5.5 5.5 0 1 0 11.3 29.5 A5.5 5.5 0 1 0 22.3 29.5 Z ' +
  'M36.7 29.5 A5.5 5.5 0 1 0 25.7 29.5 A5.5 5.5 0 1 0 36.7 29.5 Z'

export default function Logo() {
  return (
    <a className="logo" href="/" aria-label="NexRedes — Página inicial">
      <svg
        className="logo-icon"
        viewBox="0 0 48 48"
        aria-hidden="true"
        focusable="false"
      >
        <defs>
          <linearGradient
            id="nexredes-icon-gradient"
            x1="0"
            y1="0"
            x2="1"
            y2="1"
          >
            <stop offset="0" stopColor="#00A8FF" />
            <stop offset="0.35" stopColor="#2979FF" />
            <stop offset="0.65" stopColor="#1565D8" />
            <stop offset="1" stopColor="#1A3FCC" />
          </linearGradient>
          <linearGradient
            id="nexredes-icon-shine"
            x1="0"
            y1="0"
            x2="0.9"
            y2="1"
          >
            <stop offset="0" stopColor="#ffffff" stopOpacity="0.38" />
            <stop offset="0.35" stopColor="#ffffff" stopOpacity="0.12" />
            <stop offset="0.6" stopColor="#ffffff" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path
          fill="url(#nexredes-icon-gradient)"
          fillRule="evenodd"
          d={ICON_PATH}
        />
        <path
          fill="url(#nexredes-icon-shine)"
          fillRule="evenodd"
          d={ICON_PATH}
        />
      </svg>
      <span className="logo-text">
        <span className="logo-nex">Nex</span>
        <span className="logo-redes">Redes</span>
      </span>
    </a>
  )
}
