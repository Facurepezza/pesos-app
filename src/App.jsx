import { useEffect, useState } from 'react'
import { supabase } from './supabaseClient'
import Auth from './Auth'
import Movimientos from './Movimientos'
import Suscripciones from './Suscripciones'
import Tarjetas from './Tarjetas'
import Dashboard from './Dashboard'
import Tutorial from './Tutorial'
import Inicio from './Inicio'
import CargarSheet from './CargarSheet'
import Icono from './Iconos'
import { ordenarDatos } from './ordenarDatos'
import { generarRecurrentes } from './recurrentes'
import NuevaClave from './NuevaClave'
import InstalarApp from './InstalarApp'
import Perfil from './Perfil'
import { ToastProvider, useToast } from './Toast'
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
  return (
    <ToastProvider>
      <PesosApp />
    </ToastProvider>
  )
}

function PesosApp() {
  const avisar = useToast()
  const [session, setSession] = useState(null)
  const [cargandoSesion, setCargandoSesion] = useState(true)
  const [refreshKey, setRefreshKey] = useState(0)
  const [tab, setTab] = useState('inicio')
  const [hoja, setHoja] = useState(null) // null | 'gasto' | 'ingreso'
  const [oculto, setOculto] = useState(false)
  const [recuperando, setRecuperando] = useState(false)
  const [perfil, setPerfil] = useState(false)
  const [verTutorial, setVerTutorial] = useState(0)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setCargandoSesion(false)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((evento, session) => {
      setSession(session)
      if (evento === 'PASSWORD_RECOVERY') setRecuperando(true)
    })
    return () => subscription.unsubscribe()
  }, [])

  const refrescar = () => setRefreshKey((k) => k + 1)

  // Una sola vez: acomoda los comercios que estaban cargados como categoría
  const uidSesion = session?.user?.id
  useEffect(() => {
    if (!uidSesion) return
    ordenarDatos(uidSesion).then((cambio) => { if (cambio) setRefreshKey((k) => k + 1) })
    // Carga solos los gastos e ingresos fijos que ya tocaron este mes
    generarRecurrentes(uidSesion).then((n) => {
      if (n > 0) {
        setRefreshKey((k) => k + 1)
        avisar(`Se cargaron solos ${n} movimiento${n === 1 ? '' : 's'} fijo${n === 1 ? '' : 's'} ✓`)
      }
    })
  }, [uidSesion, avisar])

  if (cargandoSesion) return <p className="cargando">Cargando...</p>
  if (recuperando) return <NuevaClave onListo={() => setRecuperando(false)} />
  if (!session) return <Auth />

  const uid = session.user.id
  const nombrePila = (session.user.user_metadata?.nombre || '').trim().split(' ')[0]

  return (
    <div className="pz">
      {tab === 'inicio' && <InstalarApp />}
      {tab === 'inicio' && (
        <Inicio usuarioId={uid} email={nombrePila || session.user.email} refreshKey={refreshKey}
          oculto={oculto} setOculto={setOculto} onSalir={() => setPerfil(true)} irA={setTab} />
      )}

      {tab === 'movimientos' && (
        <Movimientos usuarioId={uid} refreshKey={refreshKey} oculto={oculto} onCambio={refrescar} />
      )}

      {tab === 'suscripciones' && (
        <Suscripciones usuarioId={uid} refreshKey={refreshKey} oculto={oculto} onCambio={refrescar} />
      )}

      {tab === 'tarjetas' && (
        <Tarjetas usuarioId={uid} refreshKey={refreshKey} oculto={oculto} onCambio={refrescar} />
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
          onGuardado={(texto, tipo) => { setHoja(null); refrescar(); avisar(texto || 'Listo, quedó guardado ✓', { tipo }) }} />
      )}

      {perfil && (
        <Perfil usuario={session.user} onCerrar={() => setPerfil(false)}
          onVerTutorial={() => { setPerfil(false); setVerTutorial((n) => n + 1) }} />
      )}

      <Tutorial abrir={verTutorial} />
    </div>
  )
}

export default App