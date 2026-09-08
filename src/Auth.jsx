import { useState } from 'react'
import { supabase } from './supabaseClient'

export default function Auth() {
  const [modo, setModo] = useState('login') // 'login' o 'registro'
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
      // Si no hay error, App.jsx detecta la sesión automáticamente.
    }

    setCargando(false)
  }

  return (
    <div className="auth-container">
      <h1>PESOS</h1>
      <p className="subtitulo">Control de gastos, vencimientos y suscripciones</p>

      <div className="tabs">
        <button
          className={modo === 'login' ? 'tab activo' : 'tab'}
          onClick={() => setModo('login')}
        >
          Iniciar sesión
        </button>
        <button
          className={modo === 'registro' ? 'tab activo' : 'tab'}
          onClick={() => setModo('registro')}
        >
          Crear cuenta
        </button>
      </div>

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
  )
}
