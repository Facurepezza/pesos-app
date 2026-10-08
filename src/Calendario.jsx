import { useEffect, useMemo, useState } from 'react'
import { supabase } from './supabaseClient'
import Avatar from './Avatar'
import Icono from './Iconos'
import {
  plata, hoyISO, claveMes, mesDesplazado, fechaLinda, MESES_LARGO, traerCotizaciones,
  pesosSuscripcion, siguienteVencimiento,
} from './utils'

const pad = (n) => String(n).padStart(2, '0')
const SEMANA = ['L', 'M', 'M', 'J', 'V', 'S', 'D']

// Fecha del día X de un mes (si el mes no tiene ese día, usa el último)
function fechaDia(anio, mes, dia) {
  const ultimo = new Date(anio, mes + 1, 0).getDate()
  return `${anio}-${pad(mes + 1)}-${pad(Math.min(dia, ultimo))}`
}

// Todo lo que vence, se cobra o se paga en el mes, día por día
export default function Calendario({ usuarioId, oculto, onCerrar }) {
  const h = new Date()
  const [sel, setSel] = useState({ anio: h.getFullYear(), mes: h.getMonth() })
  const [dia, setDia] = useState(hoyISO())
  const [datos, setDatos] = useState({ subs: [], tarjetas: [], fijos: [], cuotas: [] })
  const [cot, setCot] = useState(null)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState(null)

  const k = claveMes(sel.anio, sel.mes)
  const esActual = k === claveMes(h.getFullYear(), h.getMonth())

  useEffect(() => {
    traerCotizaciones().then(setCot)
  }, [])

  useEffect(() => {
    async function cargar() {
      setCargando(true)
      setError(null)
      const sig = mesDesplazado(sel.anio, sel.mes, 1)
      const [s, t, f, c] = await Promise.all([
        supabase.from('suscripciones').select('id, nombre, monto_estimado, moneda, monto_original, frecuencia, debito_auto, proximo_vencimiento')
          .eq('usuario_id', usuarioId).eq('activa', true),
        supabase.from('tarjetas').select('id, alias, dia_cierre, dia_vencimiento').eq('usuario_id', usuarioId),
        supabase.from('recurrentes').select('id, tipo, descripcion, monto, dia, concepto, categorias(nombre)')
          .eq('usuario_id', usuarioId).eq('activo', true),
        supabase.from('gastos').select('id, monto, fecha, descripcion, compra_id, cuota_num, cuotas_total, categorias(nombre)')
          .eq('usuario_id', usuarioId).not('compra_id', 'is', null).gte('fecha', `${k}-01`).lt('fecha', `${claveMes(sig.anio, sig.mes)}-01`),
      ])
      const falla = s.error || t.error || f.error || c.error
      if (falla) setError(falla.message)
      else setDatos({ subs: s.data || [], tarjetas: t.data || [], fijos: f.data || [], cuotas: c.data || [] })
      setCargando(false)
    }
    cargar()
  }, [usuarioId, k]) // eslint-disable-line react-hooks/exhaustive-deps

  // Arma la lista de eventos del mes
  const eventos = useMemo(() => {
    const lista = []
    datos.subs.forEach((s) => {
      let f = s.proximo_vencimiento
      for (let i = 0; i < 40 && f && f.slice(0, 7) <= k; i++) {
        if (f.slice(0, 7) === k) {
          lista.push({ fecha: f, tipo: 'sale', nombre: s.nombre, monto: pesosSuscripcion(s, cot), detalle: s.debito_auto ? 'Suscripción · se debita sola' : 'Suscripción', categoria: 'Suscripciones' })
          break
        }
        f = siguienteVencimiento(s, f)
      }
    })
    datos.fijos.forEach((r) => {
      const ingreso = r.tipo === 'ingreso'
      lista.push({
        fecha: fechaDia(sel.anio, sel.mes, r.dia), tipo: ingreso ? 'entra' : 'sale', nombre: r.descripcion, monto: Number(r.monto),
        detalle: ingreso ? 'Ingreso fijo' : 'Gasto fijo', categoria: ingreso ? r.concepto : r.categorias?.nombre,
      })
    })
    datos.cuotas.filter((g) => g.compra_id && g.cuotas_total > 1).forEach((g) => {
      lista.push({ fecha: g.fecha, tipo: 'sale', nombre: g.descripcion || 'Compra en cuotas', monto: Number(g.monto), detalle: `Cuota ${g.cuota_num} de ${g.cuotas_total}`, categoria: g.categorias?.nombre })
    })
    datos.tarjetas.forEach((t) => {
      if (t.dia_vencimiento) lista.push({ fecha: fechaDia(sel.anio, sel.mes, t.dia_vencimiento), tipo: 'aviso', nombre: `Vence ${t.alias}`, detalle: 'Pagá el resumen de la tarjeta', logo: t.alias })
      if (t.dia_cierre) lista.push({ fecha: fechaDia(sel.anio, sel.mes, t.dia_cierre), tipo: 'info', nombre: `Cierra ${t.alias}`, detalle: 'Lo que compres después va al resumen siguiente', logo: t.alias })
    })
    return lista
  }, [datos, cot, k, sel.anio, sel.mes])

  const porDia = {}
  eventos.forEach((e) => { (porDia[e.fecha] = porDia[e.fecha] || []).push(e) })
  const sale = eventos.filter((e) => e.tipo === 'sale').reduce((a, e) => a + e.monto, 0)
  const entra = eventos.filter((e) => e.tipo === 'entra').reduce((a, e) => a + e.monto, 0)

  // Grilla: arranca el lunes
  const primero = new Date(sel.anio, sel.mes, 1)
  const vacios = (primero.getDay() + 6) % 7
  const diasMes = new Date(sel.anio, sel.mes + 1, 0).getDate()
  const hoy = hoyISO()
  const celdas = [...Array(vacios).fill(null), ...Array.from({ length: diasMes }, (_, i) => `${k}-${pad(i + 1)}`)]
  const delDia = (porDia[dia] || []).sort((a, b) => (a.tipo === 'entra' ? -1 : 1) - (b.tipo === 'entra' ? -1 : 1))

  function cambiarMes(delta) {
    const m = mesDesplazado(sel.anio, sel.mes, delta)
    setSel(m)
    const nuevoK = claveMes(m.anio, m.mes)
    setDia(nuevoK === claveMes(h.getFullYear(), h.getMonth()) ? hoyISO() : `${nuevoK}-01`)
  }

  return (
    <div className="pz-sheet-fondo" onClick={onCerrar}>
      <section className="pz-sheet" role="dialog" aria-modal="true" aria-label="Calendario" onClick={(e) => e.stopPropagation()}>
        <div className="pz-sheet-manija" />
        <div className="pz-top">
          <h2 className="pz-h2">Calendario</h2>
          <button type="button" className="pz-icon-btn" onClick={onCerrar} aria-label="Cerrar"><Icono nombre="cerrar" size={18} /></button>
        </div>

        <div className="pz-top">
          <button type="button" className="pz-icon-btn pz-icon-chico" onClick={() => cambiarMes(-1)} disabled={esActual} aria-label="Mes anterior">
            <Icono nombre="izq" size={18} />
          </button>
          <b className="pz-cal-mes">{MESES_LARGO[sel.mes]} {sel.anio}</b>
          <button type="button" className="pz-icon-btn pz-icon-chico" onClick={() => cambiarMes(1)} aria-label="Mes siguiente">
            <Icono nombre="der" size={18} />
          </button>
        </div>

        <div className="pz-totales">
          <div><span>Entra fijo</span><b className="pos">+ {plata(entra, oculto)}</b></div>
          <div><span>Sale fijo</span><b>- {plata(sale, oculto)}</b></div>
        </div>

        {error && <p className="pz-error">No pudimos cargar el calendario: {error}</p>}

        <div className={`pz-cal ${cargando ? 'cargando' : ''}`} role="grid" aria-label={`${MESES_LARGO[sel.mes]} ${sel.anio}`}>
          {SEMANA.map((s, i) => <span key={i} className="pz-cal-cab">{s}</span>)}
          {celdas.map((f, i) => {
            if (!f) return <span key={'v' + i} />
            const ev = porDia[f] || []
            const tipos = [...new Set(ev.map((e) => e.tipo))]
            return (
              <button key={f} type="button" onClick={() => setDia(f)}
                className={`pz-cal-dia ${f === dia ? 'on' : ''} ${f === hoy ? 'hoy' : ''} ${f < hoy ? 'pasado' : ''}`}
                aria-label={`${Number(f.slice(8))}${ev.length ? `, ${ev.length} movimiento${ev.length === 1 ? '' : 's'}` : ''}`}>
                <span>{Number(f.slice(8))}</span>
                <i>{tipos.map((t) => <em key={t} className={t} />)}</i>
              </button>
            )
          })}
        </div>

        <div className="pz-cal-leyenda">
          <span><em className="sale" /> Sale</span>
          <span><em className="entra" /> Entra</span>
          <span><em className="aviso" /> Vence tarjeta</span>
          <span><em className="info" /> Cierre</span>
        </div>

        <div className="pz-card pz-card-lista pz-card-gris">
          <div className="pz-card-head"><h3 className="pz-h2" style={{ fontSize: 15 }}>{fechaLinda(dia)}</h3></div>
          {delDia.length === 0 && <p className="pz-vacio">No hay nada programado para este día.</p>}
          {delDia.map((e, i) => (
            <div key={i} className="pz-fila">
              <Avatar nombre={e.logo || e.nombre} categoria={e.categoria} size={38} />
              <span className="pz-fila-txt">
                <b>{e.nombre}</b>
                <span>{e.detalle}</span>
              </span>
              {e.monto !== undefined && (
                <span className={`pz-monto ${e.tipo === 'entra' ? 'pos' : ''}`}>{e.tipo === 'entra' ? '+ ' : '- '}{plata(e.monto, oculto)}</span>
              )}
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}