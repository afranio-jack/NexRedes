import { useState } from 'react'
import { EMAIL_REGEX, USERNAME_REGEX } from '../utils/validation'
import { userExists, createUser } from '../utils/storage'

const initialForm = {
  name: '',
  username: '',
  email: '',
  password: '',
  confirmPassword: '',
}

export default function Signup({ onCreated, onGoToLogin }) {
  const [form, setForm] = useState(initialForm)
  const [errors, setErrors] = useState({})

  function handleChange(e) {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
    setErrors((prev) => ({ ...prev, [name]: undefined }))
  }

  function validate() {
    const errs = {}
    const username = form.username.trim()
    const email = form.email.trim()

    if (!form.name.trim()) errs.name = 'Informe seu nome.'
    if (!username) errs.username = 'Informe um nome de usuário.'
    else if (!USERNAME_REGEX.test(username))
      errs.username =
        'Use 3 a 20 caracteres: letras, números ou underline (_), sem espaços.'
    if (!email) errs.email = 'Informe seu e-mail.'
    else if (!EMAIL_REGEX.test(email)) errs.email = 'E-mail em formato inválido.'
    if (!form.password) errs.password = 'Informe a senha.'
    if (!form.confirmPassword) errs.confirmPassword = 'Confirme a senha.'
    else if (form.password !== form.confirmPassword)
      errs.confirmPassword = 'As senhas não coincidem.'

    const conflict = userExists(
      errs.username ? null : username,
      errs.email ? null : email,
    )
    if (conflict === 'username')
      errs.username = 'Este nome de usuário já está em uso.'
    if (conflict === 'email') errs.email = 'Este e-mail já está cadastrado.'

    return errs
  }

  function handleSubmit(e) {
    e.preventDefault()
    const errs = validate()
    setErrors(errs)
    if (Object.keys(errs).length > 0) return
    createUser({
      name: form.name.trim(),
      username: form.username.trim(),
      email: form.email.trim(),
      password: form.password,
    })
    onCreated()
  }

  return (
    <form className="card" onSubmit={handleSubmit} noValidate>
      <h1>Criar conta</h1>
      <p className="subtitle">Preencha os dados para se cadastrar</p>

      <div className="field">
        <label htmlFor="name">Nome</label>
        <input
          id="name"
          name="name"
          type="text"
          placeholder="Seu nome completo"
          value={form.name}
          onChange={handleChange}
          className={errors.name ? 'invalid' : ''}
        />
        {errors.name && <span className="error">{errors.name}</span>}
      </div>

      <div className="field">
        <label htmlFor="username">Nome de usuário</label>
        <input
          id="username"
          name="username"
          type="text"
          placeholder="ex.: joao_silva"
          value={form.username}
          onChange={handleChange}
          className={errors.username ? 'invalid' : ''}
        />
        {errors.username && <span className="error">{errors.username}</span>}
      </div>

      <div className="field">
        <label htmlFor="email">E-mail</label>
        <input
          id="email"
          name="email"
          type="email"
          placeholder="voce@exemplo.com"
          value={form.email}
          onChange={handleChange}
          className={errors.email ? 'invalid' : ''}
        />
        {errors.email && <span className="error">{errors.email}</span>}
      </div>

      <div className="field">
        <label htmlFor="password">Senha</label>
        <input
          id="password"
          name="password"
          type="password"
          placeholder="Sua senha"
          value={form.password}
          onChange={handleChange}
          className={errors.password ? 'invalid' : ''}
        />
        {errors.password && <span className="error">{errors.password}</span>}
      </div>

      <div className="field">
        <label htmlFor="confirmPassword">Confirmar senha</label>
        <input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          placeholder="Repita a senha"
          value={form.confirmPassword}
          onChange={handleChange}
          className={errors.confirmPassword ? 'invalid' : ''}
        />
        {errors.confirmPassword && (
          <span className="error">{errors.confirmPassword}</span>
        )}
      </div>

      <button type="submit" className="btn-primary">
        Criar conta
      </button>

      <p className="switch-text">
        Já tenho uma conta —{' '}
        <button type="button" className="link" onClick={onGoToLogin}>
          Entrar
        </button>
      </p>
    </form>
  )
}
