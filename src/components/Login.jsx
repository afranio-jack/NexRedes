import { useState } from 'react'
import { USERNAME_REGEX } from '../utils/validation'
import { findUser } from '../utils/storage'

export default function Login({ notice, onSuccess, onGoToSignup, onGoToForgot }) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [errors, setErrors] = useState({})

  function handleUsernameChange(e) {
    setUsername(e.target.value)
    setErrors((prev) => ({ ...prev, username: undefined, form: undefined }))
  }

  function handlePasswordChange(e) {
    setPassword(e.target.value)
    setErrors((prev) => ({ ...prev, password: undefined, form: undefined }))
  }

  function handleSubmit(e) {
    e.preventDefault()
    const id = username.trim()
    const errs = {}

    if (!id) errs.username = 'Informe seu nome de usuário.'
    else if (!USERNAME_REGEX.test(id))
      errs.username = 'Nome de usuário em formato inválido.'
    if (!password) errs.password = 'Informe a senha.'

    if (Object.keys(errs).length > 0) {
      setErrors(errs)
      return
    }

    const user = findUser(id, password)
    if (!user) {
      setErrors({ form: 'Nome de usuário ou senha incorretos.' })
      return
    }
    onSuccess(user)
  }

  return (
    <form className="card" onSubmit={handleSubmit} noValidate>
      <h1>Entrar</h1>
      <p className="subtitle">Acesse sua conta NexRedes</p>

      {notice && <p className="notice">{notice}</p>}
      {errors.form && <p className="form-error">{errors.form}</p>}

      <div className="field">
        <label htmlFor="username">Nome de usuário</label>
        <input
          id="username"
          type="text"
          placeholder="ex.: joao_silva"
          value={username}
          onChange={handleUsernameChange}
          className={errors.username ? 'invalid' : ''}
        />
        {errors.username && (
          <span className="error">{errors.username}</span>
        )}
      </div>

      <div className="field">
        <label htmlFor="password">Senha</label>
        <input
          id="password"
          type="password"
          placeholder="Sua senha"
          value={password}
          onChange={handlePasswordChange}
          className={errors.password ? 'invalid' : ''}
        />
        {errors.password && <span className="error">{errors.password}</span>}
      </div>

      <button type="submit" className="btn-primary">
        Entrar
      </button>

      <p className="forgot-text">
        <button type="button" className="link" onClick={onGoToForgot}>
          Esqueci minha senha
        </button>
      </p>

      <p className="switch-text">
        Ainda não tenho uma conta —{' '}
        <button type="button" className="link" onClick={onGoToSignup}>
          Criar conta
        </button>
      </p>
    </form>
  )
}
