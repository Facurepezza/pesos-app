import { useState } from 'react'
import { supabase } from './supabaseClient'
import Logo from './Logo'

function IconRecibo() {
  return (
    <svg width="30" height="30" viewBox="0 0 30 30" fill="none">
      <path d="M7 3h16v22l-3-2-3 2-3-2-3 2-3-2-1 2V3z" fill="#EAF0E7" stroke="#14532D" strokeWidth="1.6" strokeLinejoin="round" />
      <line x1="11" y1="10" x2="20" y2="10" stroke="#C9971F" strokeWidth="1.6" strokeLinecap="round" />
      <line x1="11" y1="14" x2="20" y2="14" stroke="#C9971F" strokeWidth="1.6" strokeLinecap="round" />
      <line x1="11" y1="18" x2="16" y2="18" stroke="#C9971F" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  )
}

function IconVencimiento() {
  return (
    <svg width="30" height="30" viewBox="0 0 30 30" fill="none">
      <circle cx="15" cy="16" r="10.5" fill="#EAF0E7" stroke="#14532D" strokeWidth="1.6" />
      <line x1="15" y1="16" x2="15" y2="10" stroke="#C9971F" strokeWidth="1.8" strokeLinecap="round" />
      <line x1="15" y1="16" x2="19" y2="18" stroke="#C9971F" strokeWidth="1.8" strokeLinecap="round" />
      <line x1="10" y1="4" x2="10" y2="7" stroke="#14532D" strokeWidth="1.6" strokeLinecap="round" />
      <line x1="20" y1="4" x2="20" y2="7" stroke="#14532D" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  )
}

function IconFiltro() {
  return (
    <svg width="30" height="30" viewBox="0 0 30 30" fill="none">
      <rect x="6" y="17" width="4.5" height="8" rx="1" fill="#EAF0E7" stroke="#14532D" strokeWidth="1.6" />
      <rect x="13" y="11" width="4.5" height="14" rx="1" fill="#EAF0E7" stroke="#14532D" strokeWidth="1.6" />
      <rect x="20" y="6" width="4.5" height="19" rx="1" fill="#EAF0E7" stroke="#C9971F" strokeWidth="1.6" />
    </svg>
  )
}

function IconUsuarios() {
  return (
    <svg width="30" height="30" viewBox="0 0 30 30" fill="none">
      <circle cx="12" cy="11" r="4.5" fill="#EAF0E7" stroke="#14532D" strokeWidth="1.6" />
      <circle cx="20" cy="14" r="3.6" fill="#EAF0E7" stroke="#C9971F" strokeWidth="1.6" />
      <path d="M5 25c0-4.5 3-7 7-7s7 2.5 7 7" fill="none" stroke="#14532D" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M18 25c0-3 1.8-5 4.5-5" fill="none" stroke="#C9971F" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  )
}

const FEATURES = [
  { Icon: IconRecibo, titulo: 'Cargá tus gastos', texto: 'Cada gasto con su fecha, categoría y medio de pago.' },
  { Icon: IconVencimiento, titulo: 'Vencimientos automáticos', texto: 'El sistema detecta solo cuándo vence cada suscripción.' },
  { Icon: IconFiltro, titulo: 'Filtros y métricas', texto: 'Mirá cuánto gastaste por categoría, tarjeta o mes.' },
  { Icon: IconUsuarios, titulo: 'Multiusuario', texto: 'Cada persona tiene su cuenta y sus propios datos.' },
]

export default function Auth() {
  const [modo, setModo] = useState('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [cargando, setCargando] = useState(false)
  const [mensaje, setMensaje] = useState(null)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setCargando(true)
    setMensaje(null)

    if (modo === 'registro') {
      const { error } = await supabase.auth.signUp({ email, password })
      if (error) {
        setMensaje({ tipo: 'error', texto: error.message })
      } else {
        setMensaje({
          tipo: 'ok',
          texto: 'Cuenta creada. Revisá tu mail para confirmar (si Supabase lo pide) o iniciá sesión.',
        })
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) {
        setMensaje({ tipo: 'error', texto: error.message })
      }
    }

    setCargando(false)
  }

  return (
    <div className="landing">
      <section className="landing-hero">
        <Logo size={64} />
        <h1>PESOS</h1>
        <p className="landing-tagline">
          La forma más simple de llevar el control de lo que gastás, debés y pagás cada mes.
        </p>
      </section>

      <div className="ticket-tear"></div>

      <section className="landing-features">
        {FEATURES.map(({ Icon, titulo, texto }) => (
          <div className="feature-card" key={titulo}>
            <Icon />
            <h3>{titulo}</h3>
            <p>{texto}</p>
          </div>
        ))}
      </section>

      <section className="auth-ticket-wrap">
        <nav className="tab-nav">
          <button
            className={modo === 'login' ? 'tab-btn activo' : 'tab-btn'}
            onClick={() => setModo('login')}
          >
            Iniciar sesión
          </button>
          <button
            className={modo === 'registro' ? 'tab-btn activo' : 'tab-btn'}
            onClick={() => setModo('registro')}
          >
            Crear cuenta
          </button>
        </nav>

        <div className="ticket">
          <form onSubmit={handleSubmit} className="auth-form">
            <label>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />

            <label>Contraseña</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={6}
              required
            />

            <button type="submit" disabled={cargando}>
              {cargando ? 'Un segundo...' : modo === 'registro' ? 'Crear cuenta' : 'Entrar'}
            </button>
          </form>

          {mensaje && (
            <p className={mensaje.tipo === 'error' ? 'msg-error' : 'msg-ok'}>{mensaje.texto}</p>
          )}
        </div>
      </section>
    </div>
  )
}