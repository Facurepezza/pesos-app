import { useEffect, useState } from 'react'
import { supabase } from './supabaseClient'

const MEDIOS = {
  efectivo: 'Efectivo',
  mercado_pago: 'Mercado Pago',
  tarjeta: 'Tarjeta',
}

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
        .select('id, monto, fecha, medio_pago, debito_automatico, proximo_vencimiento, categorias(nombre), tarjetas(alias)')
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
  }, [usuarioId, refreshKey, desde, hasta, categoriaId, medioPago, tarjetaId])

  const total = gastos.reduce((acc, g) => acc + Number(g.monto), 0)

  const limpiarFiltros = () => {
    setDesde('')
    setHasta('')
    setCategoriaId('')
    setMedioPago('')
    setTarjetaId('')
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
      {cargando ? (
        <p className="cargando-lista">Cargando...</p>
      ) : gastos.length === 0 ? (
        <p className="cargando-lista">No hay gastos que coincidan con estos filtros.</p>
      ) : (
        <>
          <table className="tabla-gastos">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Categoría</th>
                <th>Medio de pago</th>
                <th>Tarjeta</th>
                <th>Monto</th>
              </tr>
            </thead>
            <tbody>
              {gastos.map((g) => (
                <tr key={g.id}>
                  <td>{g.fecha}</td>
                  <td>{g.categorias?.nombre || '—'}</td>
                  <td>
                    {MEDIOS[g.medio_pago]}
                    {g.debito_automatico && <span className="badge-db">DB</span>}
                  </td>
                  <td>{g.tarjetas?.alias || '—'}</td>
                  <td>${Number(g.monto).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="total-gastos">Total: ${total.toFixed(2)}</p>
        </>
      )}
    </div>
  )
}