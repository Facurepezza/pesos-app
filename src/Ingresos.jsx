import { useEffect, useState } from 'react'
import { supabase } from './supabaseClient'

const CONCEPTOS = ['Sueldo', 'Freelance / changas', 'Ventas', 'Rendimientos', 'Regalo', 'Otro']
const MESES_LARGO = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']

const hoy = () => new Date().toISOString().split('T')[0]

const pesos = (n) =>
  new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 2 }).format(n || 0)

const claveMes = (anio, mes) => `${anio}-${String(mes + 1).padStart(2, '0')}`

function mesDesplazado(anio, mes, delta) {
  const d = new Date(anio, mes + delta, 1)
  return { anio: d.getFullYear(), mes: d.getMonth() }
}

export default function Ingresos({ usuarioId, refreshKey, onCambio }) {
  const ahora = new Date()
  const [sel, setSel] = useState({ anio: ahora.getFullYear(), mes: ahora.getMonth() })
  const [ingresos, setIngresos] = useState([])
  const [cargando, setCargando] = useState(true)
  const [recarga, setRecarga] = useState(0)

  // Formulario de alta
  const [monto, setMonto] = useState('')
  const [fecha, setFecha] = useState(hoy())
  const [concepto, setConcepto] = useState(CONCEPTOS[0])
  const [descripcion, setDescripcion] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [mensaje, setMensaje] = useState(null)

  // Edición
  const [editandoId, setEditandoId] = useState(null)
  const [edicion, setEdicion] = useState({})
  const [guardandoEdicion, setGuardandoEdicion] = useState(false)
  const [aviso, setAviso] = useState(null)

  useEffect(() => {
    async function cargar() {
      setCargando(true)
      const desde = `${claveMes(sel.anio, sel.mes)}-01`
      const sig = mesDesplazado(sel.anio, sel.mes, 1)
      const hasta = `${claveMes(sig.anio, sig.mes)}-01`
      const { data, error } = await supabase
        .from('ingresos')
        .select('id, monto, fecha, concepto, descripcion')
        .eq('usuario_id', usuarioId)
        .gte('fecha', desde)
        .lt('fecha', hasta)
        .order('fecha', { ascending: false })
      if (error) setAviso({ tipo: 'error', texto: error.message })
      setIngresos(data || [])
      setCargando(false)
    }
    cargar()
  }, [usuarioId, refreshKey, recarga, sel])

  const total = ingresos.reduce((a, x) => a + Number(x.monto), 0)
  const esFuturo = claveMes(sel.anio, sel.mes) >= claveMes(ahora.getFullYear(), ahora.getMonth())

  const handleSubmit = async (e) => {
    e.preventDefault()
    const valor = parseFloat(monto)
    if (!valor || valor <= 0) {
      setMensaje({ tipo: 'error', texto: 'El monto tiene que ser mayor a 0.' })
      return
    }
    setGuardando(true)
    setMensaje(null)
    const { error } = await supabase.from('ingresos').insert({
      usuario_id: usuarioId,
      monto: valor,
      fecha,
      concepto,
      descripcion: descripcion.trim() || null,
    })
    setGuardando(false)
    if (error) {
      setMensaje({ tipo: 'error', texto: error.message })
    } else {
      setMensaje({ tipo: 'ok', texto: `Ingreso de ${pesos(valor)} guardado.` })
      setMonto('')
      setDescripcion('')
      setFecha(hoy())
      setRecarga((r) => r + 1)
      if (onCambio) onCambio()
    }
  }

  const empezarEdicion = (i) => {
    setAviso(null)
    setEditandoId(i.id)
    setEdicion({ monto: i.monto, fecha: i.fecha, concepto: i.concepto, descripcion: i.descripcion || '' })
  }

  const cancelarEdicion = () => {
    setEditandoId(null)
    setEdicion({})
  }

  const guardarEdicion = async () => {
    const valor = parseFloat(edicion.monto)
    if (!valor || valor <= 0) {
      setAviso({ tipo: 'error', texto: 'El monto tiene que ser mayor a 0.' })
      return
    }
    setGuardandoEdicion(true)
    const { data, error } = await supabase
      .from('ingresos')
      .update({
        monto: valor,
        fecha: edicion.fecha,
        concepto: edicion.concepto,
        descripcion: edicion.descripcion.trim() || null,
      })
      .eq('id', editandoId)
      .select('id')
    setGuardandoEdicion(false)
    if (error) {
      setAviso({ tipo: 'error', texto: error.message })
    } else if (!data || data.length === 0) {
      setAviso({ tipo: 'error', texto: 'No se pudo guardar el cambio. Revisá los permisos de la tabla en Supabase.' })
    } else {
      setAviso({ tipo: 'ok', texto: 'Ingreso actualizado.' })
      cancelarEdicion()
      setRecarga((r) => r + 1)
      if (onCambio) onCambio()
    }
  }

  const eliminar = async (i) => {
    const ok = window.confirm(`¿Eliminar el ingreso de ${pesos(i.monto)} del ${i.fecha}? Esta acción no se puede deshacer.`)
    if (!ok) return
    const { data, error } = await supabase.from('ingresos').delete().eq('id', i.id).select('id')
    if (error) {
      setAviso({ tipo: 'error', texto: error.message })
    } else if (!data || data.length === 0) {
      setAviso({ tipo: 'error', texto: 'No se pudo eliminar. Revisá los permisos de la tabla en Supabase.' })
    } else {
      setAviso({ tipo: 'ok', texto: 'Ingreso eliminado.' })
      setRecarga((r) => r + 1)
      if (onCambio) onCambio()
    }
  }

  return (
    <div className="ingresos">
      <h2>Ingresos</h2>

      <form onSubmit={handleSubmit} className="suscripcion-form">
        <label>Monto</label>
        <input type="number" step="0.01" value={monto} onChange={(e) => setMonto(e.target.value)} placeholder="0.00" required />

        <label>Concepto</label>
        <select value={concepto} onChange={(e) => setConcepto(e.target.value)}>
          {CONCEPTOS.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>

        <label>Descripción (opcional)</label>
        <input type="text" value={descripcion} onChange={(e) => setDescripcion(e.target.value)} placeholder="Sueldo de octubre, venta de la bici..." />

        <label>Fecha</label>
        <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} required />

        <button type="submit" disabled={guardando}>
          {guardando ? 'Guardando...' : 'Agregar ingreso'}
        </button>

        {mensaje && <p className={mensaje.tipo === 'error' ? 'msg-error' : 'msg-ok'}>{mensaje.texto}</p>}
      </form>

      <div className="ing-mes">
        <button type="button" onClick={() => setSel(mesDesplazado(sel.anio, sel.mes, -1))} aria-label="Mes anterior">‹</button>
        <span>{MESES_LARGO[sel.mes]} {sel.anio}</span>
        <button type="button" onClick={() => setSel(mesDesplazado(sel.anio, sel.mes, 1))} disabled={esFuturo} aria-label="Mes siguiente">›</button>
      </div>

      {aviso && <p className={aviso.tipo === 'error' ? 'msg-error' : 'msg-ok'}>{aviso.texto}</p>}

      {cargando ? (
        <p className="cargando-lista">Cargando...</p>
      ) : ingresos.length === 0 ? (
        <p className="cargando-lista">No cargaste ingresos en {MESES_LARGO[sel.mes]}.</p>
      ) : (
        <>
          <div className="tabla-scroll">
            <table className="tabla-gastos">
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Concepto</th>
                  <th>Descripción</th>
                  <th>Monto</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {ingresos.map((i) =>
                  editandoId === i.id ? (
                    <tr key={i.id} className="fila-editando">
                      <td>
                        <input className="input-tabla" type="date" value={edicion.fecha}
                          onChange={(e) => setEdicion({ ...edicion, fecha: e.target.value })} />
                      </td>
                      <td>
                        <select className="input-tabla" value={edicion.concepto}
                          onChange={(e) => setEdicion({ ...edicion, concepto: e.target.value })}>
                          {CONCEPTOS.map((c) => (
                            <option key={c} value={c}>{c}</option>
                          ))}
                        </select>
                      </td>
                      <td>
                        <input className="input-tabla" type="text" value={edicion.descripcion}
                          onChange={(e) => setEdicion({ ...edicion, descripcion: e.target.value })} />
                      </td>
                      <td>
                        <input className="input-tabla" type="number" step="0.01" value={edicion.monto}
                          onChange={(e) => setEdicion({ ...edicion, monto: e.target.value })} />
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
                  ) : (
                    <tr key={i.id}>
                      <td>{i.fecha}</td>
                      <td>{i.concepto}</td>
                      <td>{i.descripcion || '-'}</td>
                      <td className="monto-ingreso">+ {pesos(i.monto)}</td>
                      <td>
                        <div className="acciones-fila">
                          <button type="button" className="btn-accion" onClick={() => empezarEdicion(i)}>Editar</button>
                          <button type="button" className="btn-accion peligro" onClick={() => eliminar(i)}>Eliminar</button>
                        </div>
                      </td>
                    </tr>
                  )
                )}
              </tbody>
            </table>
          </div>
          <p className="total-gastos">Total ingresado en {MESES_LARGO[sel.mes]}: {pesos(total)}</p>
        </>
      )}
    </div>
  )
}