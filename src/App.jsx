import { useEffect, useState } from 'react'
import { supabase } from './supabaseClient'
import Auth from './Auth'
import GastoForm from './GastoForm'
import GastoList from './GastoList'
import './App.css'

function App() {
  const [session, setSession] = useState(null)
  const [cargandoSesion, setCargandoSesion] = useState(true)
  const [refreshKey, setRefreshKey] = useState(0)

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
    <div className="panel">
      <h1>PESOS</h1>
      <p className="email-usuario">{session.user.email}</p>

      <GastoForm usuarioId={session.user.id} onGuardado={() => setRefreshKey((k) => k + 1)} />

      <GastoList usuarioId={session.user.id} refreshKey={refreshKey} />

      <button className="btn-logout" onClick={handleLogout}>Cerrar sesión</button>
    </div>
  )
}

export default App