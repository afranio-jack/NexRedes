import { useState } from 'react'
import Signup from './components/Signup'
import Login from './components/Login'
import ForgotPassword from './components/ForgotPassword'
import Success from './components/Success'
import Logo from './components/Logo'
import NaoEncontrada from './components/NaoEncontrada'
import Dashboard from './components/Dashboard'

export default function App() {
  const [rotaInexistente, setRotaInexistente] = useState(
    () => window.location.pathname.replace(/\/+$/, '') !== ''
  )
  const [view, setView] = useState('login')
  const [loggedUser, setLoggedUser] = useState(null)
  const [notice, setNotice] = useState('')

  function handleLogout() {
    setLoggedUser(null)
    setNotice('')
    setView('login')
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
