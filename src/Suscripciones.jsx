import { useEffect, useState } from 'react'
import { supabase } from './supabaseClient'

const hoy = () => new Date().toISOString().split('T')[0]

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
  return `Recordatorio PESOS: la suscripción "${s.nombre}" ($${Number(s.monto_estimado).toFixed(2)}) vence el ${s.proximo_vencimiento}.`
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

      {cargando ? (
        <p className="cargando-lista">Cargando...</p>
      ) : suscripciones.length === 0 ? (
        <p className="cargando-lista">Todavía no cargaste ninguna suscripción.</p>
      ) : (
        <>
          {(() => {
            const proximos = suscripciones.filter((s) => diasHasta(s.proximo_vencimiento) <= 7)
            return proximos.length > 0 ? (
              <p className="resumen-vencimientos">
                Tenés {proximos.length} vencimiento{proximos.length === 1 ? '' : 's'} en los próximos 7 días.
              </p>
            ) : (
              <p className="resumen-vencimientos ok">No tenés vencimientos próximos en los próximos 7 días.</p>
            )
          })()}
          <table className="tabla-gastos">
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Monto estimado</th>
                <th>Tarjeta</th>
                <th>Próximo vencimiento</th>
              </tr>
            </thead>
            <tbody>
              {suscripciones.map((s) => {
                const estado = estadoVencimiento(diasHasta(s.proximo_vencimiento))
                const mensajeAviso = mensajeRecordatorio(s)
                return (
                  <tr key={s.id}>
                    <td>{s.nombre}</td>
                    <td>${Number(s.monto_estimado).toFixed(2)}</td>
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
                  </tr>
                )
              })}
            </tbody>
          </table>
        </>
      )}
    </div>
  )
}