import { useEffect, useState } from 'react'
import { supabase } from './supabaseClient'
import Auth from './Auth'
import GastoForm from './GastoForm'
import GastoList from './GastoList'
import Suscripciones from './Suscripciones'
import AlertaBanner from './AlertaBanner'
import Logo from './Logo'
import './App.css'

const TABS = [
  { id: 'cargar', label: 'Cargar' },
  { id: 'gastos', label: 'Mis gastos' },
  { id: 'suscripciones', label: 'Suscripciones' },
]

function App() {
  const [session, setSession] = useState(null)
  const [cargandoSesion, setCargandoSesion] = useState(true)
  const [refreshKey, setRefreshKey] = useState(0)
  const [tab, setTab] = useState('cargar')

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setCargandoSesion(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })

    return () => subscription.unsubscribe()
  }, [])

  const handleLogout = async () => {
    await supabase.auth.signOut()
  }

  if (cargandoSesion) {
    return <p className="cargando">Cargando...</p>
  }

  if (!session) {
    return <Auth />
  }

  return (
    <div className="app-shell">
      <header className="app-header">
        <Logo size={40} />
        <div className="app-header-text">
          <h1>PESOS</h1>
          <p>{session.user.email}</p>
        </div>
        <button className="btn-logout" onClick={handleLogout}>Salir</button>
      </header>
      <div className="ticket-tear"></div>

      <AlertaBanner
        usuarioId={session.user.id}
        refreshKey={refreshKey}
        onVerDetalle={() => setTab('suscripciones')}
      />

      <nav className="tab-nav">
        {TABS.map((t) => (
          <button
            key={t.id}
            className={tab === t.id ? 'tab-btn activo' : 'tab-btn'}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </nav>

      <main className="ticket">
        {tab === 'cargar' && (
          <GastoForm
            usuarioId={session.user.id}
            onGuardado={() => {
              setRefreshKey((k) => k + 1)
              setTab('gastos')
            }}
          />
        )}
        {tab === 'gastos' && <GastoList usuarioId={session.user.id} refreshKey={refreshKey} />}
        {tab === 'suscripciones' && (
          <Suscripciones
            usuarioId={session.user.id}
            refreshKey={refreshKey}
            onCambio={() => setRefreshKey((k) => k + 1)}
          />
        )}
      </main>
    </div>
  )
}

export default App