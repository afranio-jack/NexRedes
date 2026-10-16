import { useState } from 'react'
import Signup from './components/Signup'
import Login from './components/Login'
import ForgotPassword from './components/ForgotPassword'
import Success from './components/Success'
import Logo from './components/Logo'
import NaoEncontrada from './components/NaoEncontrada'
import Dashboard from './components/Dashboard'
import { rotaConhecida } from './utils/rotas'
import { iniciarSessao, encerrarSessao } from './utils/sessao'

export default function App() {
  const [rotaInexistente, setRotaInexistente] = useState(
    () => !rotaConhecida(window.location.pathname)
  )
  const [view, setView] = useState('login')
  const [loggedUser, setLoggedUser] = useState(null)
  const [notice, setNotice] = useState('')

  function handleLogout() {
    // Encerra a sessão: a camada de dados volta a bloquear leituras e gravações
    // e o próximo login só enxerga as chaves do próprio usuário
    encerrarSessao()
    setLoggedUser(null)
    setNotice('')
    setView('login')
    // Ao encerrar a sessão, volta para a home (a rota da sessão não persiste)
    window.history.replaceState(null, '', '/')
  }

  function voltarDaRotaInexistente() {
    window.history.replaceState(null, '', '/')
    setRotaInexistente(false)
  }

  if (rotaInexistente) {
    return (
      <div className="app">
        <header className="app-header">
          <Logo />
        </header>
        <div className="app-inner">
          <NaoEncontrada onVoltar={voltarDaRotaInexistente} />
        </div>
      </div>
    )
  }

  if (view === 'dashboard' && loggedUser) {
    return <Dashboard user={loggedUser} onLogout={handleLogout} />
  }

  return (
    <div className="app">
      <header className="app-header">
        <Logo />
      </header>
      <div className="app-inner">
        {view === 'login' && (
          <Login
            notice={notice}
            onSuccess={(user) => {
              // Sessão validada no "servidor" local: a partir daqui a camada
              // de dados deriva SEMPRE o dono da sessão, nunca do front
              iniciarSessao(user.username)
              setLoggedUser(user)
              setView('success')
            }}
            onGoToSignup={() => {
              setNotice('')
              setView('signup')
            }}
            onGoToForgot={() => {
              setNotice('')
              setView('forgot')
            }}
          />
        )}
        {view === 'signup' && (
          <Signup
            onCreated={() => {
              setNotice('Conta criada com sucesso! Faça login.')
              setView('login')
            }}
            onGoToLogin={() => setView('login')}
          />
        )}
        {view === 'forgot' && (
          <ForgotPassword onBackToLogin={() => setView('login')} />
        )}
        {view === 'success' && loggedUser && (
          <Success
            user={loggedUser}
            onFinish={() => setView('dashboard')}
          />
        )}
      </div>
    </div>
  )
}
