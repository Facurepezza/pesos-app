import { useEffect, useMemo, useState } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, CartesianGrid
} from 'recharts'
import { supabase } from './supabaseClient'
import './Dashboard.css'

// ⚠️ Si tus tablas o columnas se llaman distinto, cambialo SOLO acá arriba
const T_GASTOS = 'gastos'
const T_CATEGORIAS = 'categorias'
const T_SUSCRIPCIONES = 'suscripciones'
const C_VENCIMIENTO = 'proximo_vencimiento'

const VERDE = '#14532D'
const DORADO = '#C9971F'
const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']
const MESES_LARGO = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']
const MEDIOS = { efectivo: 'Efectivo', mercado_pago: 'Mercado Pago', tarjeta: 'Tarjeta' }

const pesos = (n) =>
  new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n || 0)

const claveMes = (anio, mes) => `${anio}-${String(mes + 1).padStart(2, '0')}`

function mesDesplazado(anio, mes, delta) {
  const d = new Date(anio, mes + delta, 1)
  return { anio: d.getFullYear(), mes: d.getMonth() }
}

export default function Dashboard() {
  const hoy = new Date()
  const [sel, setSel] = useState({ anio: hoy.getFullYear(), mes: hoy.getMonth() })
  const [gastos, setGastos] = useState([])
  const [categorias, setCategorias] = useState({})
  const [subs, setSubs] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    async function cargar() {
      setCargando(true)
      setError('')
      const inicio = mesDesplazado(sel.anio, sel.mes, -5)
      const desde = `${claveMes(inicio.anio, inicio.mes)}-01`

      const [g, c, s] = await Promise.all([
        supabase.from(T_GASTOS).select('monto, fecha, medio_pago, categoria_id').gte('fecha', desde),
        supabase.from(T_CATEGORIAS).select('id, nombre'),
        supabase.from(T_SUSCRIPCIONES).select(`monto_estimado, activa, ${C_VENCIMIENTO}`)
      ])

      const falla = g.error || c.error || s.error
      if (falla) {
        setError(falla.message)
      } else {
        setGastos(g.data || [])
        setCategorias(Object.fromEntries((c.data || []).map((x) => [x.id, x.nombre])))
        setSubs(s.data || [])
      }
      setCargando(false)
    }
    cargar()
  }, [sel])

  const datos = useMemo(() => {
    const actual = claveMes(sel.anio, sel.mes)
    const ant = mesDesplazado(sel.anio, sel.mes, -1)
    const anterior = claveMes(ant.anio, ant.mes)

    const delMes = gastos.filter((x) => String(x.fecha).slice(0, 7) === actual)
    const total = delMes.reduce((a, x) => a + Number(x.monto), 0)
    const totalAnt = gastos
      .filter((x) => String(x.fecha).slice(0, 7) === anterior)
      .reduce((a, x) => a + Number(x.monto), 0)
    const variacion = totalAnt > 0 ? ((total - totalAnt) / totalAnt) * 100 : null

    const activas = subs.filter((x) => x.activa)
    const fijo = activas.reduce((a, x) => a + Number(x.monto_estimado || 0), 0)

    // Proyección: solo tiene sentido para el mes en curso
    const esMesActual = actual === claveMes(hoy.getFullYear(), hoy.getMonth())
    const hoyTxt = hoy.toISOString().slice(0, 10)
    const pendientes = activas
      .filter((x) => {
        const v = String(x[C_VENCIMIENTO] || '')
        return v.slice(0, 7) === actual && v >= hoyTxt
      })
      .reduce((a, x) => a + Number(x.monto_estimado || 0), 0)

    const porCat = {}
    delMes.forEach((x) => {
      const n = categorias[x.categoria_id] || 'Sin categoría'
      porCat[n] = (porCat[n] || 0) + Number(x.monto)
    })
    const categoriasArr = Object.entries(porCat)
      .map(([nombre, monto]) => ({ nombre, monto }))
      .sort((a, b) => b.monto - a.monto)

    const porMedio = {}
    delMes.forEach((x) => {
      const n = MEDIOS[x.medio_pago] || x.medio_pago || 'Otro'
      porMedio[n] = (porMedio[n] || 0) + Number(x.monto)
    })
    const mediosArr = Object.entries(porMedio)
      .map(([nombre, monto]) => ({ nombre, monto, pct: total ? (monto / total) * 100 : 0 }))
      .sort((a, b) => b.monto - a.monto)

    const evolucion = []
    for (let i = -5; i <= 0; i++) {
      const m = mesDesplazado(sel.anio, sel.mes, i)
      const k = claveMes(m.anio, m.mes)
      evolucion.push({
        mes: MESES[m.mes],
        monto: gastos.filter((x) => String(x.fecha).slice(0, 7) === k).reduce((a, x) => a + Number(x.monto), 0),
        actual: i === 0
      })
    }

    return { total, variacion, fijo, cantidadSubs: activas.length, esMesActual, proyeccion: total + pendientes, pendientes, categoriasArr, mediosArr, evolucion, cantidad: delMes.length }
  }, [gastos, categorias, subs, sel])

  const esFuturo = claveMes(sel.anio, sel.mes) >= claveMes(hoy.getFullYear(), hoy.getMonth())
  const nombreMes = `${MESES_LARGO[sel.mes]} ${sel.anio}`

  return (
    <section className="dash">
      <header className="dash-top">
        <h2 className="dash-titulo">Resumen de {nombreMes}</h2>
        <div className="dash-nav">
          <button onClick={() => setSel(mesDesplazado(sel.anio, sel.mes, -1))} aria-label="Mes anterior">‹</button>
          <button onClick={() => setSel(mesDesplazado(sel.anio, sel.mes, 1))} disabled={esFuturo} aria-label="Mes siguiente">›</button>
        </div>
      </header>

      {error && (
        <p className="dash-error">
          No se pudieron leer los datos: {error}. Revisá que los nombres de las tablas al principio de Dashboard.jsx coincidan con los de Supabase.
        </p>
      )}

      {cargando ? (
        <p className="dash-vacio">Cargando resumen...</p>
      ) : (
        <>
          <div className="dash-ticket">
            <div className="dash-fila principal">
              <span>Gastaste en {MESES_LARGO[sel.mes]}</span>
              <strong>{pesos(datos.total)}</strong>
            </div>
            {datos.variacion !== null && (
              <p className={`dash-var ${datos.variacion > 0 ? 'sube' : 'baja'}`}>
                {datos.variacion > 0 ? '▲' : '▼'} {Math.abs(datos.variacion).toFixed(0)}% respecto del mes anterior
              </p>
            )}
            <div className="dash-fila">
              <span>Cantidad de gastos</span>
              <span>{datos.cantidad}</span>
            </div>
            <div className="dash-fila">
              <span>Gasto fijo mensual ({datos.cantidadSubs} suscripciones activas)</span>
              <span>{pesos(datos.fijo)}</span>
            </div>
            {datos.esMesActual && (
              <div className="dash-fila proyeccion">
                <span>Si pagás lo que falta vencer este mes, cerrás en</span>
                <strong>{pesos(datos.proyeccion)}</strong>
              </div>
            )}
          </div>

          {datos.cantidad === 0 ? (
            <p className="dash-vacio">No cargaste gastos en {MESES_LARGO[sel.mes]}. Cuando lo hagas, acá vas a ver en qué se te va la plata.</p>
          ) : (
            <div className="dash-grid">
              <div className="dash-bloque">
                <h3>Por categoría</h3>
                <ResponsiveContainer width="100%" height={Math.max(160, datos.categoriasArr.length * 42)}>
                  <BarChart data={datos.categoriasArr} layout="vertical" margin={{ left: 10, right: 20 }}>
                    <XAxis type="number" hide />
                    <YAxis type="category" dataKey="nombre" width={110} tick={{ fontSize: 12, fontFamily: 'IBM Plex Mono' }} />
                    <Tooltip formatter={(v) => pesos(v)} />
                    <Bar dataKey="monto" fill={VERDE} radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="dash-bloque">
                <h3>Por medio de pago</h3>
                {datos.mediosArr.map((m) => (
                  <div key={m.nombre} className="dash-medio">
                    <div className="dash-medio-txt">
                      <span>{m.nombre}</span>
                      <span>{pesos(m.monto)} ({m.pct.toFixed(0)}%)</span>
                    </div>
                    <div className="dash-barra"><div style={{ width: `${m.pct}%` }} /></div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="dash-bloque">
            <h3>Últimos 6 meses</h3>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={datos.evolucion} margin={{ top: 10, right: 10, left: 10 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="mes" tick={{ fontSize: 12, fontFamily: 'IBM Plex Mono' }} />
                <YAxis tickFormatter={(v) => `$${Math.round(v / 1000)}k`} tick={{ fontSize: 11, fontFamily: 'IBM Plex Mono' }} />
                <Tooltip formatter={(v) => pesos(v)} />
                <Bar dataKey="monto" radius={[4, 4, 0, 0]}>
                  {datos.evolucion.map((e, i) => (
                    <Cell key={i} fill={e.actual ? DORADO : VERDE} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </>
      )}
    </section>
  )
}