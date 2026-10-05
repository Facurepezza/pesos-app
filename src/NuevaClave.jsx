import { useState } from 'react'
import { supabase } from './supabaseClient'

// Pantalla que aparece cuando la persona entra desde el mail de "recuperar contraseña"
export default function NuevaClave({ onListo }) {
  const [clave, setClave] = useState('')
  const [repetir, setRepetir] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [mensaje, setMensaje] = useState(null)

  async function guardar(e) {
    e.preventDefault()
    if (clave.length < 6) return setMensaje({ tipo: 'error', texto: 'La contraseña tiene que tener al menos 6 caracteres.' })
    if (clave !== repetir) return setMensaje({ tipo: 'error', texto: 'Las dos contraseñas no coinciden.' })
    setGuardando(true)
    const { error } = await supabase.auth.updateUser({ password: clave })
    setGuardando(false)
    if (error) return setMensaje({ tipo: 'error', texto: error.message })
    setMensaje({ tipo: 'ok', texto: 'Listo, tu contraseña quedó cambiada.' })
    setTimeout(onListo, 1500)
  }

  return (
    <div className="pz pz-bienv">
      <div className="pz-bienv-in">
        <div className="pz-marca">
          <span className="pz-marca-logo">$</span>
          <span className="pz-marca-nombre">PESOS</span>
        </div>
        <div className="pz-bienv-hero">
          <h1>Nueva contraseña</h1>
          <p>Elegí una contraseña nueva para entrar a tu cuenta.</p>
        </div>
        <form onSubmit={guardar} className="pz-bienv-form">
          <div className="pz-campo">
            <label className="pz-label" htmlFor="nc-1">Contraseña nueva</label>
            <input id="nc-1" className="pz-input" type="password" autoComplete="new-password" value={clave} onChange={(e) => setClave(e.target.value)} required />
          </div>
          <div className="pz-campo">
            <label className="pz-label" htmlFor="nc-2">Repetila</label>
            <input id="nc-2" className="pz-input" type="password" autoComplete="new-password" value={repetir} onChange={(e) => setRepetir(e.target.value)} required />
          </div>
          {mensaje && <p className={mensaje.tipo === 'error' ? 'pz-error' : 'pz-ok'}>{mensaje.texto}</p>}
          <button type="submit" className="pz-btn pz-btn-primario pz-btn-grande" disabled={guardando}>
            {guardando ? 'Guardando...' : 'Guardar contraseña'}
          </button>
        </form>
      </div>
    </div>
  )
}