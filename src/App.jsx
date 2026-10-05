import { useEffect, useState } from 'react'
import { supabase } from './supabaseClient'
import Auth from './Auth'
import Movimientos from './Movimientos'
import Suscripciones from './Suscripciones'
import Dashboard from './Dashboard'
import Tutorial from './Tutorial'
import Inicio from './Inicio'
import CargarSheet from './CargarSheet'
import Icono from './Iconos'
import './App.css'
import './theme.css'

const NAV = [
  { id: 'inicio', label: 'Inicio', icono: 'inicio' },
  { id: 'movimientos', label: 'Movimientos', icono: 'lista' },
  null,
  { id: 'suscripciones', label: 'Suscripciones', icono: 'repetir' },
  { id: 'tarjetas', label: 'Tarjetas', icono: 'tarjeta' },
]

function App() {
  const [session, setSession] = useState(null)
  const [cargandoSesion, setCargandoSesion] = useState(true)
  const [refreshKey, setRefreshKey] = useState(0)
  const [tab, setTab] = useState('inicio')
  const [hoja, setHoja] = useState(null) // null | 'gasto' | 'ingreso'
  const [oculto, setOculto] = useState(false)

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

  const refrescar = () => setRefreshKey((k) => k + 1)

  if (cargandoSesion) return <p className="cargando">Cargando...</p>
  if (!session) return <Auth />

  const uid = session.user.id

  return (
    <div className="pz">
      {tab === 'inicio' && (
        <Inicio usuarioId={uid} email={session.user.email} refreshKey={refreshKey}
          oculto={oculto} setOculto={setOculto} onSalir={() => supabase.auth.signOut()} irA={setTab} />
      )}

      {tab === 'movimientos' && (
        <Movimientos usuarioId={uid} refreshKey={refreshKey} oculto={oculto} onCambio={refrescar} />
      )}

      {tab === 'suscripciones' && (
        <Suscripciones usuarioId={uid} refreshKey={refreshKey} oculto={oculto} onCambio={refrescar} />
      )}

      {tab === 'tarjetas' && (
        <div className="pz-screen">
          <h1 className="pz-h1">Tarjetas</h1>
          <div className="pz-card"><p className="pz-vacio">Esta pantalla la armamos en la parte 3.</p></div>
        </div>
      )}

      {tab === 'resumen' && (
        <div className="pz-screen">
          <div className="pz-top">
            <button type="button" className="pz-icon-btn" onClick={() => setTab('inicio')} aria-label="Volver">
              <Icono nombre="izq" size={20} />
            </button>
          </div>
          <div className="pz-legacy"><Dashboard key={refreshKey} /></div>
        </div>
      )}

      <nav className="pz-nav" aria-label="Navegación principal">
        <div className="pz-nav-in">
          {NAV.map((n) =>
            n === null ? (
              <button key="fab" type="button" className="pz-fab" onClick={() => setHoja('gasto')} aria-label="Cargar gasto o ingreso">
                <Icono nombre="mas" size={26} grosor={2.4} />
              </button>
            ) : (
              <button key={n.id} type="button" className={`pz-nav-btn ${tab === n.id ? 'on' : ''}`} onClick={() => setTab(n.id)}>
                <Icono nombre={n.icono} size={22} />
                <span>{n.label}</span>
              </button>
            )
          )}
        </div>
      </nav>

      {hoja && (
        <CargarSheet usuarioId={uid} tipoInicial={hoja} onCerrar={() => setHoja(null)}
          onGuardado={() => { setHoja(null); refrescar() }} />
      )}

      <Tutorial />
    </div>
  )
}

export default App