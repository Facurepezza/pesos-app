import { useEffect, useState } from 'react'
import { supabase } from './supabaseClient'

const hoy = () => new Date().toISOString().split('T')[0]

const pesos = (n) =>
  new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 2 }).format(n || 0)

// Las suscripciones vencidas hace más de estos días se ocultan de la lista (no se borran)
const DIAS_PARA_OCULTAR = 30

function diasHasta(fechaISO) {
  const hoyDate = new Date(hoy() + 'T00:00:00')
  const fechaDate = new Date(fechaISO + 'T00:00:00')
  return Math.round((fechaDate - hoyDate) / (1000 * 60 * 60 * 24))
}

function estadoVencimiento(dias) {
  if (dias < 0) return { texto: `Vencido hace ${Math.abs(dias)} día${Math.abs(dias) === 1 ? '' : 's'}`, clase: 'venc-urgente', avisar: true }
  if (dias === 0) return { texto: 'Vence hoy', clase: 'venc-urgente', avisar: true }
  if (dias <= 7) return { texto: `Vence en ${dias} día${dias === 1 ? '' : 's'}`, clase: 'venc-proximo', avisar: true }
  return { texto: `Vence en ${dias} días`, clase: 'venc-normal', avisar: false }
}

function mensajeRecordatorio(s) {
  return `Recordatorio PESOS: la suscripción "${s.nombre}" (${pesos(s.monto_estimado)}) vence el ${s.proximo_vencimiento}.`
}

export default function Suscripciones({ usuarioId, refreshKey, onCambio }) {
  const [suscripciones, setSuscripciones] = useState([])
  const [cargando, setCargando] = useState(true)

  const [nombre, setNombre] = useState('')
  const [montoEstimado, setMontoEstimado] = useState('')
  const [tarjetaAlias, setTarjetaAlias] = useState('')
  const [proximoVencimiento, setProximoVencimiento] = useState(hoy())
  const [guardando, setGuardando] = useState(false)
  const [mensaje, setMensaje] = useState(null)

  // Edición, baja y vencidas viejas
  const [editandoId, setEditandoId] = useState(null)
  const [edicion, setEdicion] = useState({})
  const [guardandoEdicion, setGuardandoEdicion] = useState(false)
  const [aviso, setAviso] = useState(null)
  const [mostrarViejas, setMostrarViejas] = useState(false)

  useEffect(() => {
    cargarSuscripciones()
  }, [usuarioId, refreshKey])

  async function cargarSuscripciones() {
    setCargando(true)
    const { data } = await supabase
      .from('suscripciones')
      .select('id, nombre, monto_estimado, proximo_vencimiento, activa, tarjetas(alias)')
      .eq('usuario_id', usuarioId)
      .eq('activa', true)
      .order('proximo_vencimiento', { ascending: true })
    setSuscripciones(data || [])
    setCargando(false)
  }

  async function obtenerOCrearTarjeta(alias) {
    const aliasLimpio = alias.trim()
    if (!aliasLimpio) return null

    const { data: existente } = await supabase
      .from('tarjetas')
      .select('id')
      .eq('usuario_id', usuarioId)
      .ilike('alias', aliasLimpio)
      .maybeSingle()

    if (existente) return existente.id

    const { data: nueva, error } = await supabase
      .from('tarjetas')
      .insert({ usuario_id: usuarioId, alias: aliasLimpio, tipo: 'credito' })
      .select('id')
      .single()

    if (error) throw error
    return nueva.id
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setGuardando(true)
    setMensaje(null)

    try {
      const tarjetaId = await obtenerOCrearTarjeta(tarjetaAlias)

      const { error } = await supabase.from('suscripciones').insert({
        usuario_id: usuarioId,
        nombre: nombre.trim(),
        monto_estimado: parseFloat(montoEstimado),
        tarjeta_id: tarjetaId,
        proximo_vencimiento: proximoVencimiento,
      })

      if (error) throw error

      setMensaje({ tipo: 'ok', texto: `Suscripción "${nombre}" agregada.` })
      setNombre('')
      setMontoEstimado('')
      setTarjetaAlias('')
      setProximoVencimiento(hoy())
      cargarSuscripciones()
      if (onCambio) onCambio()
    } catch (err) {
      setMensaje({ tipo: 'error', texto: err.message })
    }

    setGuardando(false)
  }

  const empezarEdicion = (s) => {
    setAviso(null)
    setEditandoId(s.id)
    setEdicion({
      nombre: s.nombre,
      monto_estimado: s.monto_estimado,
      proximo_vencimiento: s.proximo_vencimiento,
    })
  }

  const cancelarEdicion = () => {
    setEditandoId(null)
    setEdicion({})
  }

  const guardarEdicion = async () => {
    const monto = parseFloat(edicion.monto_estimado)
    if (!edicion.nombre.trim() || !monto || monto <= 0) {
      setAviso({ tipo: 'error', texto: 'Completá el nombre y un monto mayor a 0.' })
      return
    }
    setGuardandoEdicion(true)
    const { data, error } = await supabase
      .from('suscripciones')
      .update({
        nombre: edicion.nombre.trim(),
        monto_estimado: monto,
        proximo_vencimiento: edicion.proximo_vencimiento,
      })
      .eq('id', editandoId)
      .select('id')
    setGuardandoEdicion(false)

    if (error) {
      setAviso({ tipo: 'error', texto: error.message })
    } else if (!data || data.length === 0) {
      setAviso({ tipo: 'error', texto: 'No se pudo guardar el cambio. Revisá los permisos de la tabla en Supabase.' })
    } else {
      setAviso({ tipo: 'ok', texto: 'Suscripción actualizada.' })
      cancelarEdicion()
      cargarSuscripciones()
      if (onCambio) onCambio()
    }
  }

  // Dar de baja NO borra: la marca como inactiva, así el dato sigue sirviendo para el Resumen
  const darDeBaja = async (s) => {
    const ok = window.confirm(`¿Dar de baja "${s.nombre}"? Deja de aparecer en la lista y no te vamos a avisar más de sus vencimientos.`)
    if (!ok) return

    const { data, error } = await supabase
      .from('suscripciones')
      .update({ activa: false })
      .eq('id', s.id)
      .select('id')

    if (error) {
      setAviso({ tipo: 'error', texto: error.message })
    } else if (!data || data.length === 0) {
      setAviso({ tipo: 'error', texto: 'No se pudo dar de baja. Revisá los permisos de la tabla en Supabase.' })
    } else {
      setAviso({ tipo: 'ok', texto: `"${s.nombre}" dada de baja.` })
      cargarSuscripciones()
      if (onCambio) onCambio()
    }
  }

  const viejas = suscripciones.filter((s) => diasHasta(s.proximo_vencimiento) < -DIAS_PARA_OCULTAR)
  const visibles = mostrarViejas
    ? suscripciones
    : suscripciones.filter((s) => diasHasta(s.proximo_vencimiento) >= -DIAS_PARA_OCULTAR)

  return (
    <div className="suscripciones">
      <h2>Suscripciones y débitos automáticos</h2>

      <form onSubmit={handleSubmit} className="suscripcion-form">
        <label>Nombre</label>
        <input type="text" value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Netflix, Spotify, gimnasio..." required />

        <label>Monto estimado</label>
        <input type="number" step="0.01" value={montoEstimado} onChange={(e) => setMontoEstimado(e.target.value)} placeholder="0.00" required />

        <label>Tarjeta (opcional)</label>
        <input type="text" value={tarjetaAlias} onChange={(e) => setTarjetaAlias(e.target.value)} placeholder="Visa Santander, Naranja X..." />

        <label>Próximo vencimiento</label>
        <input type="date" value={proximoVencimiento} onChange={(e) => setProximoVencimiento(e.target.value)} required />

        <button type="submit" disabled={guardando}>
          {guardando ? 'Guardando...' : 'Agregar suscripción'}
        </button>

        {mensaje && <p className={mensaje.tipo === 'error' ? 'msg-error' : 'msg-ok'}>{mensaje.texto}</p>}
      </form>

      {aviso && <p className={aviso.tipo === 'error' ? 'msg-error' : 'msg-ok'}>{aviso.texto}</p>}

      {cargando ? (
        <p className="cargando-lista">Cargando...</p>
      ) : suscripciones.length === 0 ? (
        <p className="cargando-lista">Todavía no cargaste ninguna suscripción.</p>
      ) : (
        <>
          {(() => {
            const proximos = visibles.filter((s) => diasHasta(s.proximo_vencimiento) <= 7)
            return proximos.length > 0 ? (
              <p className="resumen-vencimientos">
                Tenés {proximos.length} vencimiento{proximos.length === 1 ? '' : 's'} en los próximos 7 días.
              </p>
            ) : (
              <p className="resumen-vencimientos ok">No tenés vencimientos próximos en los próximos 7 días.</p>
            )
          })()}

          {viejas.length > 0 && (
            <p className="nota-ocultas">
              {mostrarViejas
                ? `Estás viendo ${viejas.length} suscripción${viejas.length === 1 ? '' : 'es'} vencida${viejas.length === 1 ? '' : 's'} hace más de ${DIAS_PARA_OCULTAR} días.`
                : `Hay ${viejas.length} suscripción${viejas.length === 1 ? '' : 'es'} vencida${viejas.length === 1 ? '' : 's'} hace más de ${DIAS_PARA_OCULTAR} días oculta${viejas.length === 1 ? '' : 's'}.`}
              <button type="button" className="btn-link" onClick={() => setMostrarViejas(!mostrarViejas)}>
                {mostrarViejas ? 'Ocultar' : 'Mostrar'}
              </button>
            </p>
          )}

          <div className="tabla-scroll">
            <table className="tabla-gastos">
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>Monto estimado</th>
                  <th>Tarjeta</th>
                  <th>Próximo vencimiento</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {visibles.map((s) => {
                  if (editandoId === s.id) {
                    return (
                      <tr key={s.id} className="fila-editando">
                        <td>
                          <input className="input-tabla" type="text" value={edicion.nombre}
                            onChange={(e) => setEdicion({ ...edicion, nombre: e.target.value })} />
                        </td>
                        <td>
                          <input className="input-tabla" type="number" step="0.01" value={edicion.monto_estimado}
                            onChange={(e) => setEdicion({ ...edicion, monto_estimado: e.target.value })} />
                        </td>
                        <td>{s.tarjetas?.alias || '—'}</td>
                        <td>
                          <input className="input-tabla" type="date" value={edicion.proximo_vencimiento}
                            onChange={(e) => setEdicion({ ...edicion, proximo_vencimiento: e.target.value })} />
                        </td>
                        <td>
                          <div className="acciones-fila">
                            <button type="button" className="btn-accion guardar" onClick={guardarEdicion} disabled={guardandoEdicion}>
                              {guardandoEdicion ? 'Guardando...' : 'Guardar'}
                            </button>
                            <button type="button" className="btn-accion" onClick={cancelarEdicion}>Cancelar</button>
                          </div>
                        </td>
                      </tr>
                    )
                  }

                  const estado = estadoVencimiento(diasHasta(s.proximo_vencimiento))
                  const mensajeAviso = mensajeRecordatorio(s)
                  return (
                    <tr key={s.id}>
                      <td>{s.nombre}</td>
                      <td>{pesos(s.monto_estimado)}</td>
                      <td>{s.tarjetas?.alias || '—'}</td>
                      <td>
                        {s.proximo_vencimiento}
                        <span className={`badge-venc ${estado.clase}`}>{estado.texto}</span>
                        {estado.avisar && (
                          <div className="acciones-aviso">
                            <a className="btn-aviso btn-aviso-wsp" target="_blank" rel="noopener noreferrer" href={`https://wa.me/?text=${encodeURIComponent(mensajeAviso)}`}>WhatsApp</a>
                            <a className="btn-aviso btn-aviso-mail" href={`mailto:?subject=${encodeURIComponent('Recordatorio: ' + s.nombre)}&body=${encodeURIComponent(mensajeAviso)}`}>Mail</a>
                          </div>
                        )}
                      </td>
                      <td>
                        <div className="acciones-fila">
                          <button type="button" className="btn-accion" onClick={() => empezarEdicion(s)}>Editar</button>
                          <button type="button" className="btn-accion peligro" onClick={() => darDeBaja(s)}>Dar de baja</button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}