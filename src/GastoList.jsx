import { useEffect, useState } from 'react'
import { supabase } from './supabaseClient'

const MEDIOS = {
  efectivo: 'Efectivo',
  mercado_pago: 'Mercado Pago',
  tarjeta: 'Tarjeta',
}

const pesos = (n) =>
  new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 2 }).format(n || 0)

export default function GastoList({ usuarioId, refreshKey }) {
  const [gastos, setGastos] = useState([])
  const [categorias, setCategorias] = useState([])
  const [tarjetas, setTarjetas] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState(null)

  const [desde, setDesde] = useState('')
  const [hasta, setHasta] = useState('')
  const [categoriaId, setCategoriaId] = useState('')
  const [medioPago, setMedioPago] = useState('')
  const [tarjetaId, setTarjetaId] = useState('')

  // Edición y borrado
  const [recarga, setRecarga] = useState(0)
  const [editandoId, setEditandoId] = useState(null)
  const [edicion, setEdicion] = useState({})
  const [guardando, setGuardando] = useState(false)
  const [aviso, setAviso] = useState(null)

  useEffect(() => {
    async function cargarFiltros() {
      const [{ data: cats }, { data: tarjs }] = await Promise.all([
        supabase.from('categorias').select('id, nombre').eq('usuario_id', usuarioId).order('nombre'),
        supabase.from('tarjetas').select('id, alias').eq('usuario_id', usuarioId).order('alias'),
      ])
      setCategorias(cats || [])
      setTarjetas(tarjs || [])
    }
    cargarFiltros()
  }, [usuarioId, refreshKey])

  useEffect(() => {
    async function cargarGastos() {
      setCargando(true)
      setError(null)

      let query = supabase
        .from('gastos')
        .select('id, monto, fecha, medio_pago, categoria_id, tarjeta_id, categorias(nombre), tarjetas(alias)')
        .eq('usuario_id', usuarioId)
        .order('fecha', { ascending: false })

      if (desde) query = query.gte('fecha', desde)
      if (hasta) query = query.lte('fecha', hasta)
      if (categoriaId) query = query.eq('categoria_id', categoriaId)
      if (medioPago) query = query.eq('medio_pago', medioPago)
      if (tarjetaId) query = query.eq('tarjeta_id', tarjetaId)

      const { data, error } = await query

      if (error) {
        setError(error.message)
      } else {
        setGastos(data || [])
      }
      setCargando(false)
    }
    cargarGastos()
  }, [usuarioId, refreshKey, recarga, desde, hasta, categoriaId, medioPago, tarjetaId])

  const total = gastos.reduce((acc, g) => acc + Number(g.monto), 0)

  const limpiarFiltros = () => {
    setDesde('')
    setHasta('')
    setCategoriaId('')
    setMedioPago('')
    setTarjetaId('')
  }

  const empezarEdicion = (g) => {
    setAviso(null)
    setEditandoId(g.id)
    setEdicion({
      monto: g.monto,
      fecha: g.fecha,
      categoria_id: g.categoria_id || '',
      medio_pago: g.medio_pago,
      tarjeta_id: g.tarjeta_id || '',
    })
  }

  const cancelarEdicion = () => {
    setEditandoId(null)
    setEdicion({})
  }

  const guardarEdicion = async () => {
    const monto = parseFloat(edicion.monto)
    if (!monto || monto <= 0) {
      setAviso({ tipo: 'error', texto: 'El monto tiene que ser mayor a 0.' })
      return
    }
    setGuardando(true)
    const cambios = {
      monto,
      fecha: edicion.fecha,
      categoria_id: edicion.categoria_id || null,
      medio_pago: edicion.medio_pago,
      tarjeta_id: edicion.medio_pago === 'tarjeta' ? (edicion.tarjeta_id || null) : null,
    }
    const { data, error } = await supabase.from('gastos').update(cambios).eq('id', editandoId).select('id')
    setGuardando(false)

    if (error) {
      setAviso({ tipo: 'error', texto: error.message })
    } else if (!data || data.length === 0) {
      setAviso({ tipo: 'error', texto: 'No se pudo guardar el cambio. Revisá los permisos de la tabla en Supabase.' })
    } else {
      setAviso({ tipo: 'ok', texto: 'Gasto actualizado.' })
      cancelarEdicion()
      setRecarga((r) => r + 1)
    }
  }

  const eliminarGasto = async (g) => {
    const ok = window.confirm(`¿Eliminar el gasto de ${pesos(g.monto)} del ${g.fecha}? Esta acción no se puede deshacer.`)
    if (!ok) return

    const { data, error } = await supabase.from('gastos').delete().eq('id', g.id).select('id')
    if (error) {
      setAviso({ tipo: 'error', texto: error.message })
    } else if (!data || data.length === 0) {
      setAviso({ tipo: 'error', texto: 'No se pudo eliminar. Revisá los permisos de la tabla en Supabase.' })
    } else {
      setAviso({ tipo: 'ok', texto: 'Gasto eliminado.' })
      setRecarga((r) => r + 1)
    }
  }

  return (
    <div className="gasto-list">
      <h2>Mis gastos</h2>

      <div className="filtros">
        <div className="filtro-fila">
          <div>
            <label>Desde</label>
            <input type="date" value={desde} onChange={(e) => setDesde(e.target.value)} />
          </div>
          <div>
            <label>Hasta</label>
            <input type="date" value={hasta} onChange={(e) => setHasta(e.target.value)} />
          </div>
        </div>

        <label>Categoría</label>
        <select value={categoriaId} onChange={(e) => setCategoriaId(e.target.value)}>
          <option value="">Todas</option>
          {categorias.map((c) => (
            <option key={c.id} value={c.id}>{c.nombre}</option>
          ))}
        </select>

        <label>Medio de pago</label>
        <select value={medioPago} onChange={(e) => setMedioPago(e.target.value)}>
          <option value="">Todos</option>
          <option value="efectivo">Efectivo</option>
          <option value="mercado_pago">Mercado Pago</option>
          <option value="tarjeta">Tarjeta</option>
        </select>

        <label>Tarjeta</label>
        <select value={tarjetaId} onChange={(e) => setTarjetaId(e.target.value)}>
          <option value="">Todas</option>
          {tarjetas.map((t) => (
            <option key={t.id} value={t.id}>{t.alias}</option>
          ))}
        </select>

        <button type="button" className="btn-secundario" onClick={limpiarFiltros}>
          Limpiar filtros
        </button>
      </div>

      {error && <p className="msg-error">{error}</p>}
      {aviso && <p className={aviso.tipo === 'error' ? 'msg-error' : 'msg-ok'}>{aviso.texto}</p>}

      {cargando ? (
        <p className="cargando-lista">Cargando...</p>
      ) : gastos.length === 0 ? (
        <p className="cargando-lista">No hay gastos que coincidan con estos filtros.</p>
      ) : (
        <>
          <div className="tabla-scroll">
            <table className="tabla-gastos">
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Categoría</th>
                  <th>Medio de pago</th>
                  <th>Tarjeta</th>
                  <th>Monto</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {gastos.map((g) =>
                  editandoId === g.id ? (
                    <tr key={g.id} className="fila-editando">
                      <td>
                        <input className="input-tabla" type="date" value={edicion.fecha}
                          onChange={(e) => setEdicion({ ...edicion, fecha: e.target.value })} />
                      </td>
                      <td>
                        <select className="input-tabla" value={edicion.categoria_id}
                          onChange={(e) => setEdicion({ ...edicion, categoria_id: e.target.value })}>
                          <option value="">Sin categoría</option>
                          {categorias.map((c) => (
                            <option key={c.id} value={c.id}>{c.nombre}</option>
                          ))}
                        </select>
                      </td>
                      <td>
                        <select className="input-tabla" value={edicion.medio_pago}
                          onChange={(e) => setEdicion({ ...edicion, medio_pago: e.target.value })}>
                          <option value="efectivo">Efectivo</option>
                          <option value="mercado_pago">Mercado Pago</option>
                          <option value="tarjeta">Tarjeta</option>
                        </select>
                      </td>
                      <td>
                        {edicion.medio_pago === 'tarjeta' ? (
                          <select className="input-tabla" value={edicion.tarjeta_id}
                            onChange={(e) => setEdicion({ ...edicion, tarjeta_id: e.target.value })}>
                            <option value="">Elegí una</option>
                            {tarjetas.map((t) => (
                              <option key={t.id} value={t.id}>{t.alias}</option>
                            ))}
                          </select>
                        ) : '—'}
                      </td>
                      <td>
                        <input className="input-tabla" type="number" step="0.01" value={edicion.monto}
                          onChange={(e) => setEdicion({ ...edicion, monto: e.target.value })} />
                      </td>
                      <td>
                        <div className="acciones-fila">
                          <button type="button" className="btn-accion guardar" onClick={guardarEdicion} disabled={guardando}>
                            {guardando ? 'Guardando...' : 'Guardar'}
                          </button>
                          <button type="button" className="btn-accion" onClick={cancelarEdicion}>Cancelar</button>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    <tr key={g.id}>
                      <td>{g.fecha}</td>
                      <td>{g.categorias?.nombre || '—'}</td>
                      <td>{MEDIOS[g.medio_pago]}</td>
                      <td>{g.tarjetas?.alias || '—'}</td>
                      <td>{pesos(g.monto)}</td>
                      <td>
                        <div className="acciones-fila">
                          <button type="button" className="btn-accion" onClick={() => empezarEdicion(g)}>Editar</button>
                          <button type="button" className="btn-accion peligro" onClick={() => eliminarGasto(g)}>Eliminar</button>
                        </div>
                      </td>
                    </tr>
                  )
                )}
              </tbody>
            </table>
          </div>
          <p className="total-gastos">Total: {pesos(total)}</p>
        </>
      )}
    </div>
  )
}