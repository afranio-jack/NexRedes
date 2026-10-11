import { useEffect, useRef } from 'react'

export default function Success({ user, onFinish }) {
  const onFinishRef = useRef(onFinish)

  useEffect(() => {
    onFinishRef.current = onFinish
  })

  useEffect(() => {
    const timer = setTimeout(() => onFinishRef.current(), 3000)
    return () => clearTimeout(timer)
  }, [])

  return (
    <div className="card success-card">
      <div className="success-icon" aria-hidden="true">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M20 6L9 17l-5-5" />
        </svg>
      </div>
      <h1>Login realizado com sucesso!</h1>
      <p className="welcome">
        Bem-vindo, {user.name} (@{user.username})
      </p>
      <div className="success-loading" role="status">
        <span className="spinner" aria-hidden="true"></span>
        <span>Carregando...</span>
      </div>
    </div>
  )
}
