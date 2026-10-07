import { useEffect, useMemo, useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import { supabase } from './supabaseClient'
import Avatar from './Avatar'
import Icono from './Iconos'
import { plata, claveMes, mesDesplazado, hoyISO, MESES, MESES_LARGO, MEDIOS, COLORES_CAT, traerCotizaciones, pesosSuscripcion, mensualSuscripcion } from './utils'

// Pantalla de métricas con el diseño nuevo de PESOS
const VERDE = '#0F4D35'
const ROJO = '#B4400C'
const COLOR_MEDIO = { Efectivo: '#3E8E68', 'Mercado Pago': '#0E7490', Tarjeta: '#0F4D35' }

const sumar = (lista) => lista.reduce((a, x) => a + Number(x.monto || 0), 0)
const delMesDe = (lista, k) => lista.filter((x) => String(x.fecha).slice(0, 7) === k)

export default function Dashboard({ usuarioId, refreshKey, oculto = false, onVolver }) {
  const hoy = new Date()
  const [sel, setSel] = useState({ anio: hoy.getFullYear(), mes: hoy.getMonth() })
  const [gastos, setGastos] = useState([])
  const [ingresos, setIngresos] = useState([])
  const [subs, setSubs] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')
  const [cot, setCot] = useState(null)

  useEffect(() => {
    traerCotizaciones().then(setCot)
  }, [])

  useEffect(() => {
    async function cargar() {
      setCargando(true)
      setError('')
      const inicio = mesDesplazado(sel.anio, sel.mes, -5)
      const fin = mesDesplazado(sel.anio, sel.mes, 1)
      const desde = `${claveMes(inicio.anio, inicio.mes)}-01`
      const hasta = `${claveMes(fin.anio, fin.mes)}-01`
      const [g, ing, s] = await Promise.all([
        supabase.from('gastos').select('id, monto, fecha, medio_pago, descripcion, categorias(nombre)')
          .eq('usuario_id', usuarioId).gte('fecha', desde).lt('fecha', hasta),
        supabase.from('ingresos').select('monto, fecha').eq('usuario_id', usuarioId).gte('fecha', desde).lt('fecha', hasta),
        supabase.from('suscripciones').select('nombre, monto_estimado, moneda, monto_original, frecuencia, proximo_vencimiento').eq('usuario_id', usuarioId).eq('activa', true),
      ])
      const falla = g.error || ing.error || s.error
      if (falla) setError(falla.message)
      else {
        setGastos(g.data || [])
        setIngresos(ing.data || [])
        setSubs(s.data || [])
      }
      setCargando(false)
    }
    cargar()
  }, [usuarioId, sel, refreshKey])

  const d = useMemo(() => {
    const k = claveMes(sel.anio, sel.mes)
    const a = mesDesplazado(sel.anio, sel.mes, -1)
    const kAnt = claveMes(a.anio, a.mes)
    const esMesActual = k === claveMes(hoy.getFullYear(), hoy.getMonth())

    const gMes = delMesDe(gastos, k)
    const total = sumar(gMes)
    const totalAnt = sumar(delMesDe(gastos, kAnt))
    const ingMes = sumar(delMesDe(ingresos, k))
    const balance = ingMes - total
    const pctAhorro = ingMes > 0 ? (balance / ingMes) * 100 : null
    const variacion = totalAnt > 0 ? ((total - totalAnt) / totalAnt) * 100 : null

    const diasMes = new Date(sel.anio, sel.mes + 1, 0).getDate()
    const diasPasados = esMesActual ? hoy.getDate() : diasMes
    const porDia = diasPasados ? total / diasPasados : 0
    const aEsteRitmo = porDia * diasMes

    const hoyTxt = hoyISO()
    const pendientes = subs.filter((x) => String(x.proximo_vencimiento || '').slice(0, 7) === k && x.proximo_vencimiento >= hoyTxt)
    const fijoMensual = subs.reduce((s, x) => s + mensualSuscripcion(x, cot), 0)

    // Por categoría, con comparación contra el mes anterior
    const cats = {}
    const catsAnt = {}
    gMes.forEach((x) => { const n = x.categorias?.nombre || 'Sin categoría'; cats[n] = (cats[n] || 0) + Number(x.monto) })
    delMesDe(gastos, kAnt).forEach((x) => { const n = x.categorias?.nombre || 'Sin categoría'; catsAnt[n] = (catsAnt[n] || 0) + Number(x.monto) })
    const categorias = Object.entries(cats).map(([nombre, monto]) => ({
      nombre, monto, pct: total ? (monto / total) * 100 : 0,
      vsAnt: catsAnt[nombre] ? ((monto - catsAnt[nombre]) / catsAnt[nombre]) * 100 : null,
    })).sort((x, y) => y.monto - x.monto).map((c, i) => ({ ...c, color: COLORES_CAT[i % COLORES_CAT.length] }))

    const medios = {}
    gMes.forEach((x) => { const n = MEDIOS[x.medio_pago] || 'Otro'; medios[n] = (medios[n] || 0) + Number(x.monto) })
    const mediosArr = Object.entries(medios).map(([nombre, monto]) => ({ nombre, monto, pct: total ? (monto / total) * 100 : 0 }))
      .sort((x, y) => y.monto - x.monto)

    const evolucion = Array.from({ length: 6 }, (_, i) => {
      const m = mesDesplazado(sel.anio, sel.mes, i - 5)
      const km = claveMes(m.anio, m.mes)
      return { mes: MESES[m.mes], Ingresos: sumar(delMesDe(ingresos, km)), Gastos: sumar(delMesDe(gastos, km)) }
    })

    const grandes = [...gMes].sort((x, y) => Number(y.monto) - Number(x.monto)).slice(0, 5)

    return {
      esMesActual, total, ingMes, balance, pctAhorro, variacion, porDia, aEsteRitmo, diasMes,
      pendientes: sumar(pendientes.map((x) => ({ monto: pesosSuscripcion(x, cot) }))), cantPendientes: pendientes.length,
      fijoMensual, cantSubs: subs.length, categorias, mediosArr, evolucion, grandes, cantidad: gMes.length,
    }
  }, [gastos, ingresos, subs, sel, cot]) // eslint-disable-line react-hooks/exhaustive-deps

  const esFuturo = claveMes(sel.anio, sel.mes) >= claveMes(hoy.getFullYear(), hoy.getMonth())
  const gastadoPct = d.ingMes > 0 ? Math.min(100, (d.total / d.ingMes) * 100) : 0
  const p = (n) => plata(n, oculto)

  return (
    <div className="pz-screen">
      <div className="pz-top">
        <button type="button" className="pz-icon-btn" onClick={onVolver} aria-label="Volver"><Icono nombre="izq" size={20} /></button>
        <div className="pz-mes">
          <button type="button" className="pz-icon-btn pz-icon-chico" onClick={() => setSel(mesDesplazado(sel.anio, sel.mes, -1))} aria-label="Mes anterior">
            <Icono nombre="izq" size={18} />
          </button>
          <span>{MESES_LARGO[sel.mes]} {sel.anio}</span>
          <button type="button" className="pz-icon-btn pz-icon-chico" onClick={() => setSel(mesDesplazado(sel.anio, sel.mes, 1))} disabled={esFuturo} aria-label="Mes siguiente">
            <Icono nombre="der" size={18} />
          </button>
        </div>
      </div>

      <h1 className="pz-h1">Métricas</h1>

      {error && <p className="pz-error">No se pudieron leer los datos: {error}</p>}

      {cargando ? <p className="pz-vacio">Cargando métricas...</p> : (
        <>
          {/* Balance */}
          <section className="pz-hero">
            <div className="pz-hero-top">
              <span>Balance de {MESES_LARGO[sel.mes]}</span>
              {d.pctAhorro !== null && (
                <span className={`pz-hero-badge ${d.balance < 0 ? 'mal' : ''}`}>
                  {d.balance < 0 ? `Gastaste ${Math.abs(d.pctAhorro).toFixed(0)}% de más` : `Ahorrás el ${d.pctAhorro.toFixed(0)}%`}
                </span>
              )}
            </div>
            <div className="pz-hero-monto">{d.balance < 0 && !oculto ? '- ' : ''}{p(Math.abs(d.balance))}</div>
            {d.ingMes > 0 && <div className="pz-barra"><div style={{ width: `${gastadoPct}%` }} /></div>}
            <div className="pz-hero-grid">
              <div className="pz-hero-mini"><span>Entró</span><b>{p(d.ingMes)}</b></div>
              <div className="pz-hero-mini"><span>Salió</span><b>{p(d.total)}</b></div>
            </div>
          </section>

          {/* Números rápidos */}
          <div className="pz-totales">
            <div><span>Por día</span><b>{p(d.porDia)}</b></div>
            <div>
              <span>Vs mes anterior</span>
              <b className={d.variacion === null ? '' : d.variacion > 0 ? 'pz-sube' : 'pos'}>
                {d.variacion === null ? '-' : `${d.variacion > 0 ? '▲' : '▼'} ${Math.abs(d.variacion).toFixed(0)}%`}
              </b>
            </div>
            <div><span>Gastos</span><b>{d.cantidad}</b></div>
          </div>

          {/* Proyección del mes */}
          {d.esMesActual && d.total > 0 && (
            <section className="pz-card pz-metrica-proy">
              <Icono nombre="grafico" size={22} />
              <div>
                <b>A este ritmo cerrás {MESES_LARGO[sel.mes]} en {p(d.aEsteRitmo)}</b>
                <span>
                  {d.cantPendientes > 0
                    ? `Todavía te faltan vencer ${d.cantPendientes} suscripcion${d.cantPendientes === 1 ? '' : 'es'} por ${p(d.pendientes)}.`
                    : 'No te quedan suscripciones por vencer este mes.'}
                </span>
              </div>
            </section>
          )}

          {d.cantidad === 0 ? (
            <p className="pz-vacio">No hay gastos cargados en {MESES_LARGO[sel.mes]}. Cuando cargues, acá vas a ver en qué se te va la plata.</p>
          ) : (
            <>
              {/* Categorías */}
              <section className="pz-card">
                <h2 className="pz-h2">En qué se fue</h2>
                <div className="pz-stack">
                  {d.categorias.map((c) => <div key={c.nombre} style={{ width: `${c.pct}%`, background: c.color }} title={c.nombre} />)}
                </div>
                <div className="pz-cat-lista">
                  {d.categorias.map((c) => (
                    <div key={c.nombre} className="pz-fila">
                      <Avatar nombre={c.nombre} categoria={c.nombre} size={38} />
                      <div className="pz-fila-txt">
                        <b>{c.nombre}</b>
                        <span>
                          {c.pct.toFixed(0)}% del total
                          {c.vsAnt !== null && (
                            <em className={c.vsAnt > 0 ? 'pz-sube' : 'pz-baja'}> · {c.vsAnt > 0 ? '▲' : '▼'} {Math.abs(c.vsAnt).toFixed(0)}%</em>
                          )}
                        </span>
                      </div>
                      <span className="pz-monto">{p(c.monto)}</span>
                    </div>
                  ))}
                </div>
              </section>

              {/* Medios de pago */}
              <section className="pz-card">
                <h2 className="pz-h2">Cómo pagaste</h2>
                {d.mediosArr.map((m) => (
                  <div key={m.nombre} className="pz-pres">
                    <div className="pz-pres-top">
                      <b>{m.nombre}</b>
                      <span className="pz-pres-num">{p(m.monto)} <small>{m.pct.toFixed(0)}%</small></span>
                    </div>
                    <div className="pz-pres-barra"><div style={{ width: `${m.pct}%`, background: COLOR_MEDIO[m.nombre] || VERDE }} /></div>
                  </div>
                ))}
              </section>

              {/* Gastos más grandes */}
              <section className="pz-card pz-card-lista">
                <div className="pz-card-head"><h2 className="pz-h2">Tus gastos más grandes</h2></div>
                {d.grandes.map((g) => (
                  <div key={g.id} className="pz-fila">
                    <Avatar nombre={g.descripcion || g.categorias?.nombre} categoria={g.categorias?.nombre} size={38} />
                    <div className="pz-fila-txt">
                      <b>{g.descripcion || g.categorias?.nombre || 'Gasto'}</b>
                      <span>{Number(g.fecha.slice(8, 10))} de {MESES_LARGO[Number(g.fecha.slice(5, 7)) - 1]}{g.categorias?.nombre ? ` · ${g.categorias.nombre}` : ''}</span>
                    </div>
                    <span className="pz-monto">{p(g.monto)}</span>
                  </div>
                ))}
              </section>
            </>
          )}

          {/* Evolución */}
          <section className="pz-card">
            <h2 className="pz-h2">Últimos 6 meses</h2>
            <div className="pz-leyenda pz-leyenda-fila">
              <div><i style={{ background: VERDE }} /><span>Ingresos</span></div>
              <div><i style={{ background: ROJO }} /><span>Gastos</span></div>
            </div>
            <ResponsiveContainer width="100%" height={210}>
              <BarChart data={d.evolucion} margin={{ top: 6, right: 0, left: 0, bottom: 0 }} barGap={3}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E1E6DE" />
                <XAxis dataKey="mes" tickLine={false} axisLine={false} tick={{ fontSize: 12, fontFamily: 'Manrope', fill: '#4B5A51' }} />
                <YAxis hide={oculto} width={44} tickLine={false} axisLine={false}
                  tickFormatter={(v) => (v >= 1000000 ? `${(v / 1000000).toFixed(1)}M` : `${Math.round(v / 1000)}k`)}
                  tick={{ fontSize: 11, fontFamily: 'Manrope', fill: '#4B5A51' }} />
                <Tooltip formatter={(v) => p(v)} cursor={{ fill: 'rgba(15,77,53,.06)' }}
                  contentStyle={{ borderRadius: 12, border: '1px solid #E1E6DE', fontFamily: 'Manrope', fontSize: 13 }} />
                <Bar dataKey="Ingresos" fill={VERDE} radius={[6, 6, 0, 0]} />
                <Bar dataKey="Gastos" fill={ROJO} radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </section>

          {/* Fijos */}
          <section className="pz-card pz-metrica-proy">
            <Icono nombre="repetir" size={22} />
            <div>
              <b>Gasto fijo mensual: {p(d.fijoMensual)}</b>
              <span>{d.cantSubs === 0 ? 'No tenés suscripciones activas.' : `Son ${d.cantSubs} suscripcion${d.cantSubs === 1 ? '' : 'es'} activa${d.cantSubs === 1 ? '' : 's'}${d.ingMes > 0 ? `, el ${((d.fijoMensual / d.ingMes) * 100).toFixed(0)}% de lo que entró` : ''}.`}</span>
            </div>
          </section>
        </>
      )}
    </div>
  )
}