import { useState } from 'react'
import { EMAIL_REGEX } from '../utils/validation'

export default function ForgotPassword({ onBackToLogin }) {
  const [email, setEmail] = useState('')
  const [errors, setErrors] = useState({})
  const [sent, setSent] = useState(false)

  function handleEmailChange(e) {
    setEmail(e.target.value)
    setErrors((prev) => ({ ...prev, email: undefined }))
    setSent(false)
  }

  function handleSubmit(e) {
    e.preventDefault()
    const value = email.trim()
    const errs = {}

    if (!value) errs.email = 'Informe seu e-mail.'
    else if (!EMAIL_REGEX.test(value))
      errs.email = 'E-mail em formato inválido.'

    if (Object.keys(errs).length > 0) {
      setErrors(errs)
      return
    }

    // TODO: conectar ao endpoint de recuperação de senha no back-end.
    // Ele deve buscar o usuário pelo e-mail, gerar um token seguro com
    // validade de 30 minutos e enviar o link de redefinição por e-mail
    // (ex.: POST /api/auth/forgot-password com { email }).
    setSent(true)
  }

  return (
    <form className="card" onSubmit={handleSubmit} noValidate>
      <h1>Esqueci minha senha</h1>
      <p className="subtitle">
        Informe o e-mail da sua conta e enviaremos um link para você criar uma
        nova senha
      </p>

      <div className="field">
        <label htmlFor="email">E-mail</label>
        <input
          id="email"
          type="email"
          placeholder="voce@exemplo.com"
          value={email}
          onChange={handleEmailChange}
          className={errors.email ? 'invalid' : ''}
        />
        {errors.email && <span className="error">{errors.email}</span>}
      </div>

      <button type="submit" className="btn-primary">
        Enviar link de redefinição
      </button>

      {sent && (
        <p className="info">
          Se esse e-mail estiver cadastrado, você receberá um link para
          redefinir a senha.
        </p>
      )}

      <p className="switch-text">
        <button type="button" className="link" onClick={onBackToLogin}>
          Voltar para entrar
        </button>
      </p>
    </form>
  )
}
