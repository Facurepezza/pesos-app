import { useState } from 'react'
import { supabase } from './supabaseClient'
import Icono from './Iconos'
import { useToast } from './Toast'

export default function Perfil({ usuario, onCerrar, onVerTutorial }) {
  const avisar = useToast()
  const [nombre, setNombre] = useState(usuario.user_metadata?.nombre || '')
  const [clave, setClave] = useState('')
  const [confirmarBorrado, setConfirmarBorrado] = useState('')
  const [ocupado, setOcupado] = useState(false)
  const [error, setError] = useState(null)

  const inicial = (nombre || usuario.email || '?').trim().charAt(0).toUpperCase()

  async function guardarNombre() {
    if (!nombre.trim()) return setError('Escribí tu nombre.')
    setOcupado(true)
    setError(null)
    const { error: e } = await supabase.auth.updateUser({ data: { nombre: nombre.trim() } })
    setOcupado(false)
    if (e) return setError(e.message)
    avisar('Nombre guardado ✓')
  }

  async function cambiarClave() {
    if (clave.length < 6) return setError('La contraseña nueva tiene que tener al menos 6 caracteres.')
    setOcupado(true)
    setError(null)
    const { error: e } = await supabase.auth.updateUser({ password: clave })
    setOcupado(false)
    if (e) return setError(e.message)
    setClave('')
    avisar('Contraseña cambiada ✓')
  }

  async function borrarCuenta() {
    setOcupado(true)
    setError(null)
    const { error: e } = await supabase.rpc('borrar_mi_cuenta')
    if (e) {
      setOcupado(false)
      return setError(e.message)
    }
    await supabase.auth.signOut()
  }

  return (
    <div className="pz-sheet-fondo" onClick={onCerrar}>
      <section className="pz-sheet" role="dialog" aria-modal="true" aria-label="Mi perfil" onClick={(e) => e.stopPropagation()}>
        <div className="pz-sheet-manija" />
        <div className="pz-top">
          <h2 className="pz-h2">Mi perfil</h2>
          <button type="button" className="pz-icon-btn" onClick={onCerrar} aria-label="Cerrar"><Icono nombre="cerrar" size={18} /></button>
        </div>

        <div className="pz-perfil-cabeza">
          <span className="pz-perfil-avatar">{inicial}</span>
          <div>
            <b>{nombre || 'Sin nombre'}</b>
            <span>{usuario.email}</span>
          </div>
        </div>

        <div className="pz-campo">
          <label className="pz-label" htmlFor="p-nombre">Tu nombre</label>
          <div className="pz-fila-form">
            <input id="p-nombre" className="pz-input" value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Ej: Facundo" autoComplete="given-name" />
            <button type="button" className="pz-btn pz-btn-primario" onClick={guardarNombre} disabled={ocupado}>Guardar</button>
          </div>
        </div>

        <div className="pz-campo">
          <label className="pz-label" htmlFor="p-clave">Cambiar contraseña</label>
          <div className="pz-fila-form">
            <input id="p-clave" className="pz-input" type="password" value={clave} onChange={(e) => setClave(e.target.value)} placeholder="Contraseña nueva" autoComplete="new-password" />
            <button type="button" className="pz-btn pz-btn-claro" onClick={cambiarClave} disabled={ocupado || !clave}>Cambiar</button>
          </div>
        </div>

        {error && <p className="pz-error">{error}</p>}

        <div className="pz-perfil-opciones">
          <button type="button" className="pz-btn pz-btn-claro" onClick={onVerTutorial}>Ver el tutorial de nuevo</button>
          <button type="button" className="pz-btn pz-btn-claro" onClick={() => supabase.auth.signOut()}>
            <Icono nombre="salir" size={16} /> Cerrar sesión
          </button>
        </div>

        <details className="pz-peligro">
          <summary>Borrar mi cuenta</summary>
          <p>Se borran tu cuenta y todos tus datos (gastos, ingresos, tarjetas, suscripciones y presupuestos). No se puede deshacer.</p>
          <label className="pz-label" htmlFor="p-borrar">Para confirmar, escribí BORRAR</label>
          <input id="p-borrar" className="pz-input" value={confirmarBorrado} onChange={(e) => setConfirmarBorrado(e.target.value)} />
          <button type="button" className="pz-btn pz-btn-peligro" onClick={borrarCuenta}
            disabled={ocupado || confirmarBorrado.trim().toUpperCase() !== 'BORRAR'}>
            Borrar mi cuenta para siempre
          </button>
        </details>
      </section>
    </div>
  )
}