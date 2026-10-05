import { useState } from 'react'
import { supabase } from './supabaseClient'
import Icono from './Iconos'
import './theme.css'

const VENTAJAS = [
  { icono: 'campana', titulo: 'Te avisa antes de cada vencimiento', texto: 'Suscripciones y tarjetas, con recordatorio por WhatsApp o mail.' },
  { icono: 'mundo', titulo: 'Pesos, dólares y euros', texto: 'Cargá en cualquier moneda y la convertimos con la cotización del día.' },
  { icono: 'nube', titulo: 'Tus datos en todos lados', texto: 'Entrás desde el celu o la compu y está todo, con tu cuenta.' },
]

export default function Auth() {
  const [modo, setModo] = useState(null) // null | 'login' | 'registro'
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
      if (error) setMensaje({ tipo: 'error', texto: error.message })
      else setMensaje({ tipo: 'ok', texto: 'Cuenta creada. Revisá tu mail para confirmarla y después iniciá sesión.' })
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) setMensaje({ tipo: 'error', texto: error.message === 'Invalid login credentials' ? 'Mail o contraseña incorrectos.' : error.message })
    }
    setCargando(false)
  }

  return (
    <div className="pz pz-bienv">
      <div className="pz-bienv-in">
        <div className="pz-marca">
          <span className="pz-marca-logo">$</span>
          <span className="pz-marca-nombre">PESOS</span>
        </div>

        <div className="pz-bienv-hero">
          <h1>Tu plata, clara y al día.</h1>
          <p>Anotá lo que entra y lo que sale, y dejá que PESOS te avise antes de que te cobren.</p>
        </div>

        {modo === null ? (
          <>
            <div className="pz-ventajas">
              {VENTAJAS.map((v) => (
                <div key={v.titulo} className="pz-ventaja">
                  <span className="pz-ventaja-ico"><Icono nombre={v.icono} size={22} /></span>
                  <div>
                    <b>{v.titulo}</b>
                    <span>{v.texto}</span>
                  </div>
                </div>
              ))}
            </div>
            <div className="pz-bienv-botones">
              <button type="button" className="pz-btn pz-btn-lima pz-btn-grande" onClick={() => setModo('registro')}>Crear cuenta gratis</button>
              <button type="button" className="pz-btn pz-btn-borde pz-btn-grande" onClick={() => setModo('login')}>Ya tengo cuenta</button>
            </div>
          </>
        ) : (
          <form onSubmit={handleSubmit} className="pz-bienv-form">
            <div className="pz-seg">
              <button type="button" className={modo === 'login' ? 'on' : ''} onClick={() => { setModo('login'); setMensaje(null) }}>Iniciar sesión</button>
              <button type="button" className={modo === 'registro' ? 'on' : ''} onClick={() => { setModo('registro'); setMensaje(null) }}>Crear cuenta</button>
            </div>
            <div className="pz-campo">
              <label className="pz-label" htmlFor="a-mail">Mail</label>
              <input id="a-mail" className="pz-input" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <div className="pz-campo">
              <label className="pz-label" htmlFor="a-pass">Contraseña</label>
              <input id="a-pass" className="pz-input" type="password" autoComplete={modo === 'registro' ? 'new-password' : 'current-password'}
                value={password} onChange={(e) => setPassword(e.target.value)} minLength={6} required />
            </div>
            {mensaje && <p className={mensaje.tipo === 'error' ? 'pz-error' : 'pz-ok'}>{mensaje.texto}</p>}
            <button type="submit" className="pz-btn pz-btn-primario pz-btn-grande" disabled={cargando}>
              {cargando ? 'Un segundo...' : modo === 'registro' ? 'Crear cuenta' : 'Entrar'}
            </button>
            <button type="button" className="pz-link" onClick={() => { setModo(null); setMensaje(null) }}>Volver</button>
          </form>
        )}
      </div>
    </div>
  )
}