import { useEffect, useState } from 'react'
import { supabase } from './supabaseClient'
import Avatar from './Avatar'
import Icono from './Iconos'
import Presupuestos from './Presupuestos'
import ErrorCarga from './ErrorCarga'
import Calendario from './Calendario'
import Metas from './Metas'
import MeDeben from './MeDeben'
import { plata, hoyISO, claveMes, diasHasta, DIAS, MESES_LARGO, COLORES_CAT, MEDIOS, MEDIOS_COBRO, traerCotizaciones, pesosSuscripcion } from './utils'

const pad = (n) => String(n).padStart(2, '0')
const CLAVE_VISTA = 'pesos_vista_moneda'

export default function Inicio({ usuarioId, email, refreshKey, oculto, setOculto, onSalir, irA }) {
  const [gastos, setGastos] = useState([])
  const [ingresos, setIngresos] = useState([])
  const [subs, setSubs] = useState([])
  const [cot, setCot] = useState(null)
  const [cargando, setCargando] = useState(true)
  const [fallo, setFallo] = useState(false)
  const [recarga, setRecarga] = useState(0)
  const [fijos, setFijos] = useState([])
  const [metas, setMetas] = useState([])
  const [deudas, setDeudas] = useState([])
  const [extras, setExtras] = useState(0)
  const [hoja, setHoja] = useState(null) // null | 'calendario' | 'metas' | 'deben'
  const [vista, setVista] = useState(() => {
    try { return localStorage.getItem(CLAVE_VISTA) || 'ARS' } catch { return 'ARS' }
  })

  const ahora = new Date()
  const mesClave = claveMes(ahora.getFullYear(), ahora.getMonth())
  const hoy = hoyISO()
  const nombre = (email || '').split('@')[0].split(/[._0-9]/)[0]
  const saludo = nombre ? nombre.charAt(0).toUpperCase() + nombre.slice(1) : ''

  useEffect(() => {
    traerCotizaciones().then(setCot)
  }, [])

  useEffect(() => {
    async function cargar() {
      setCargando(true)
      setFallo(false)
      const desde = `${mesClave}-01`
      const [g, i, s, f] = await Promise.all([
        supabase.from('gastos')
          .select('id, monto, fecha, descripcion, medio_pago, moneda, monto_original, categorias(nombre), tarjetas(alias)')
          .eq('usuario_id', usuarioId).gte('fecha', desde).order('fecha', { ascending: false }),
        supabase.from('ingresos')
          .select('id, monto, fecha, concepto, descripcion, medio_cobro')
          .eq('usuario_id', usuarioId).gte('fecha', desde).order('fecha', { ascending: false }),
        supabase.from('suscripciones')
          .select('id, nombre, monto_estimado, moneda, monto_original, frecuencia, debito_auto, proximo_vencimiento, tarjetas(alias)')
          .eq('usuario_id', usuarioId).eq('activa', true).order('proximo_vencimiento'),
        supabase.from('recurrentes').select('id, tipo, monto, dia, ultimo_mes').eq('usuario_id', usuarioId).eq('activo', true),
      ])
      if (g.error || i.error || s.error) setFallo(true)
      else {
        setGastos(g.data || [])
        setIngresos(i.data || [])
        setSubs(s.data || [])
        setFijos(f.data || [])
      }
      setCargando(false)
    }
    cargar()
  }, [usuarioId, refreshKey, mesClave, recarga])

  // Metas y "me deben": si todavía no existen las tablas, simplemente no se muestran números
  useEffect(() => {
    supabase.from('metas').select('objetivo, ahorrado').eq('usuario_id', usuarioId)
      .then(({ data, error }) => setMetas(error ? [] : data || []))
    supabase.from('deudas').select('monto').eq('usuario_id', usuarioId).eq('pagada', false)
      .then(({ data, error }) => setDeudas(error ? [] : data || []))
  }, [usuarioId, refreshKey, extras])

  function cambiarVista() {
    const nueva = vista === 'ARS' ? 'USD' : 'ARS'
    setVista(nueva)
    try { localStorage.setItem(CLAVE_VISTA, nueva) } catch { /* nada */ }
  }
  // Muestra un monto en pesos, o en dólares al blue si eligió verlo así
  const enDolares = vista === 'USD' && cot?.blue
  const m = (v) => (enDolares ? plata(v / cot.blue, oculto, 'USD') : plata(v, oculto))

  // Solo lo que ya pasó cuenta para el mes (las cuotas futuras quedan para su mes)
  const gastosMes = gastos.filter((g) => g.fecha.slice(0, 7) === mesClave && g.fecha <= hoy)
  const ingresosMes = ingresos.filter((i) => i.fecha.slice(0, 7) === mesClave)
  const totalGastos = gastosMes.reduce((a, g) => a + Number(g.monto), 0)
  const totalIngresos = ingresosMes.reduce((a, i) => a + Number(i.monto), 0)
  const balance = totalIngresos - totalGastos
  const pctAhorro = totalIngresos > 0 ? Math.round((balance / totalIngresos) * 100) : null
  const pctUsado = totalIngresos > 0 ? Math.min(100, (totalGastos / totalIngresos) * 100) : 0

  // ¿Cuánto puedo gastar por día? Lo que entró (y lo que falta cobrar) menos lo gastado
  // y lo que todavía falta pagar este mes, repartido en los días que quedan.
  const diasMes = new Date(ahora.getFullYear(), ahora.getMonth() + 1, 0).getDate()
  const finMes = `${mesClave}-${pad(diasMes)}`
  const fijoPendiente = (tipo) => fijos
    .filter((r) => r.tipo === tipo && (r.ultimo_mes || '') < mesClave && Math.min(r.dia, diasMes) > ahora.getDate())
    .reduce((a, r) => a + Number(r.monto), 0)
  const porCobrar = fijoPendiente('ingreso')
  const cuotasPendientes = gastos.filter((g) => g.fecha.slice(0, 7) === mesClave && g.fecha > hoy).reduce((a, g) => a + Number(g.monto), 0)
  const subsPendientes = subs.filter((s) => s.proximo_vencimiento >= `${mesClave}-01` && s.proximo_vencimiento <= finMes)
    .reduce((a, s) => a + pesosSuscripcion(s, cot), 0)
  const porPagar = fijoPendiente('gasto') + cuotasPendientes + subsPendientes
  const disponible = totalIngresos + porCobrar - totalGastos - porPagar
  const diasQuedan = diasMes - ahora.getDate() + 1
  const porDia = disponible / diasQuedan
  const gastadoHoy = gastosMes.filter((g) => g.fecha === hoy).reduce((a, g) => a + Number(g.monto), 0)
  const pctHoy = porDia > 0 ? Math.min(100, (gastadoHoy / porDia) * 100) : 100

  const metaTotal = metas.reduce((a, x) => a + Number(x.objetivo), 0)
  const metaAhorrado = metas.reduce((a, x) => a + Math.min(Number(x.ahorrado), Number(x.objetivo)), 0)
  const teDeben = deudas.reduce((a, d) => a + Number(d.monto), 0)

  // Próximo vencimiento (vencido hace poco o en los próximos 7 días)
  const proxima = subs.find((s) => diasHasta(s.proximo_vencimiento) <= 7 && diasHasta(s.proximo_vencimiento) >= -30)
  let textoVenc = ''
  if (proxima) {
    const d = diasHasta(proxima.proximo_vencimiento)
    const verbo = proxima.debito_auto ? 'se debita' : 'vence'
    textoVenc = d < 0 ? `venció hace ${-d} día${d === -1 ? '' : 's'}` : d === 0 ? `${verbo} hoy` : `${verbo} en ${d} día${d === 1 ? '' : 's'}`
  }
  const montoProxima = proxima ? pesosSuscripcion(proxima, cot) : 0
  const msjWsp = proxima
    ? `Recordatorio PESOS: ${proxima.nombre} (${plata(montoProxima)}) ${textoVenc}.`
    : ''

  // En qué se fue
  const porCat = {}
  gastosMes.forEach((g) => {
    const n = g.categorias?.nombre || 'Sin categoría'
    porCat[n] = (porCat[n] || 0) + Number(g.monto)
  })
  let cats = Object.entries(porCat).sort((a, b) => b[1] - a[1])
  if (cats.length > 5) {
    const resto = cats.slice(4).reduce((a, c) => a + c[1], 0)
    cats = [...cats.slice(0, 4), ['Otras', resto]]
  }

  // Últimos movimientos (gastos e ingresos juntos)
  const ultimos = [
    ...gastos.filter((g) => g.fecha <= hoy).map((g) => ({
      id: 'g' + g.id, fecha: g.fecha, nombre: g.descripcion || g.categorias?.nombre || 'Gasto',
      categoria: g.categorias?.nombre,
      detalle: [g.categorias?.nombre, g.tarjetas?.alias || (g.medio_pago !== 'tarjeta' ? MEDIOS[g.medio_pago] : null)].filter(Boolean).join(' · '),
      monto: -Number(g.monto), moneda: g.moneda, original: g.monto_original,
    })),
    ...ingresos.map((i) => ({
      id: 'i' + i.id, fecha: i.fecha, nombre: i.descripcion || i.concepto, categoria: i.concepto, monto: Number(i.monto),
      detalle: ['Ingreso', i.concepto, MEDIOS_COBRO[i.medio_cobro]].filter(Boolean).join(' · '),
    })),
  ].sort((a, b) => (a.fecha < b.fecha ? 1 : -1)).slice(0, 5)

  return (
    <div className="pz-screen">
      <header className="pz-top">
        <div>
          <div className="pz-sub">{DIAS[ahora.getDay()]} {ahora.getDate()} de {MESES_LARGO[ahora.getMonth()]}</div>
          <h1 className="pz-h1" style={{ fontSize: 24 }}>Hola{saludo ? `, ${saludo}` : ''}</h1>
        </div>
        <div className="pz-top-acciones">
          <button type="button" className="pz-icon-btn" onClick={() => setOculto(!oculto)} aria-label={oculto ? 'Mostrar montos' : 'Ocultar montos'}>
            <Icono nombre={oculto ? 'ojoNo' : 'ojo'} size={20} />
          </button>
          <button type="button" className="pz-icon-btn" onClick={onSalir} aria-label="Mi perfil">
            <span style={{ font: "800 18px 'Bricolage Grotesque', sans-serif", color: 'var(--acento)', lineHeight: 1 }}>
              {saludo ? saludo.charAt(0).toUpperCase() : '?'}
            </span>
          </button>
        </div>
      </header>

      {cot && (
        <div className="pz-cots">
          {cot.blue && <span className="pz-cot">Blue <b>{plata(cot.blue)}</b></span>}
          {cot.mep && <span className="pz-cot">MEP <b>{plata(cot.mep)}</b></span>}
          {cot.oficial && <span className="pz-cot">Oficial <b>{plata(cot.oficial)}</b></span>}
          {cot.tarjeta && <span className="pz-cot">Tarjeta <b>{plata(cot.tarjeta)}</b></span>}
          {cot.euro && <span className="pz-cot">Euro <b>{plata(cot.euro)}</b></span>}
        </div>
      )}

      {fallo ? <ErrorCarga onReintentar={() => setRecarga((r) => r + 1)} /> : (
      <>
      <section className="pz-hero">
        <div className="pz-hero-top">
          <span>Balance de {MESES_LARGO[ahora.getMonth()]}</span>
          {cot?.blue && (
            <button type="button" className="pz-vista" onClick={cambiarVista} aria-label={vista === 'ARS' ? 'Ver en dólares' : 'Ver en pesos'}>
              <span className={vista === 'ARS' ? 'on' : ''}>$</span>
              <span className={vista === 'USD' ? 'on' : ''}>US$</span>
            </button>
          )}
        </div>
        <div className="pz-hero-monto">{balance < 0 && !oculto ? '- ' : ''}{m(Math.abs(balance))}</div>
        {pctAhorro !== null && (
          <span className={`pz-hero-badge pz-hero-badge-sola ${balance < 0 ? 'mal' : ''}`}>
            {balance < 0 ? `Gastás ${-pctAhorro}% de más` : `Ahorrás el ${pctAhorro}%`}
          </span>
        )}
        <div className="pz-barra"><div style={{ width: `${pctUsado}%` }} /></div>
        <div className="pz-hero-grid">
          <div className="pz-hero-mini">
            <span>↓ Entró</span>
            <b>{m(totalIngresos)}</b>
          </div>
          <div className="pz-hero-mini">
            <span>↑ Salió</span>
            <b>{m(totalGastos)}</b>
          </div>
        </div>
        {enDolares && <span className="pz-hero-nota">Al dólar blue de hoy: {plata(cot.blue)}</span>}
      </section>

      {!cargando && (totalIngresos + porCobrar > 0 ? (
        <section className={`pz-card pz-diario ${porDia <= 0 ? 'mal' : ''}`}>
          {porDia > 0 ? (
            <>
              <div className="pz-diario-top">
                <div>
                  <span className="pz-sub">Podés gastar por día</span>
                  <strong>{m(porDia)}</strong>
                </div>
                <div className="pz-diario-hoy">
                  <span className="pz-sub">Hoy llevás</span>
                  <b className={gastadoHoy > porDia ? 'pz-sube' : ''}>{m(gastadoHoy)}</b>
                </div>
              </div>
              <div className="pz-progreso"><div className={gastadoHoy > porDia ? 'pasado' : ''} style={{ width: `${pctHoy}%` }} /></div>
              <span className="pz-sub">
                Te quedan {m(disponible)} para {diasQuedan === 1 ? 'hoy' : `los ${diasQuedan} días que faltan`}
                {porPagar > 0 ? `, ya descontando ${m(porPagar)} de fijos, suscripciones y cuotas de este mes.` : '.'}
              </span>
            </>
          ) : (
            <>
              <b className="pz-diario-alerta">Este mes no te queda margen</b>
              <span className="pz-sub">
                Con lo que todavía falta pagar ({m(porPagar)}), cerrarías {MESES_LARGO[ahora.getMonth()]} en {m(disponible)}. Ojo con los gastos de acá a fin de mes.
              </span>
            </>
          )}
        </section>
      ) : (
        <section className="pz-card pz-diario">
          <span className="pz-sub">Cargá lo que cobrás este mes (tocá el + y elegí Ingreso) y te decimos cuánto podés gastar por día.</span>
        </section>
      ))}

      {proxima && (
        <section className="pz-alerta">
          <Avatar nombre={proxima.nombre} />
          <div className="pz-alerta-txt">
            <b>{proxima.nombre} {textoVenc}</b>
            <span>{plata(montoProxima, oculto)}{proxima.tarjetas?.alias ? ` · ${proxima.tarjetas.alias}` : ''}{proxima.debito_auto ? ' · automático' : ''}</span>
          </div>
          <a className="pz-btn pz-btn-oscuro" href={`https://wa.me/?text=${encodeURIComponent(msjWsp)}`} target="_blank" rel="noopener noreferrer">
            <Icono nombre="mensaje" size={15} /> Avisarme
          </a>
        </section>
      )}

      <div className="pz-accesos">
        <button type="button" className="pz-acceso" onClick={() => setHoja('calendario')}>
          <span className="pz-acceso-ico"><Icono nombre="calendario" size={20} /></span>
          <b>Calendario</b>
          <small>Lo que vence</small>
        </button>
        <button type="button" className="pz-acceso" onClick={() => setHoja('metas')}>
          <span className="pz-acceso-ico"><Icono nombre="bandera" size={20} /></span>
          <b>Metas</b>
          <small>{metas.length ? `${Math.round((metaAhorrado / metaTotal) * 100)}% juntado` : 'Creá una'}</small>
        </button>
        <button type="button" className="pz-acceso" onClick={() => setHoja('deben')}>
          <span className="pz-acceso-ico"><Icono nombre="persona" size={20} /></span>
          <b>Me deben</b>
          <small>{teDeben > 0 ? plata(teDeben, oculto) : 'Nadie'}</small>
        </button>
      </div>

      <section className="pz-card">
        <div className="pz-top">
          <h2 className="pz-h2">En qué se fue</h2>
          <button type="button" className="pz-link" onClick={() => irA('resumen')}>Ver métricas</button>
        </div>
        {cargando ? (
          <p className="pz-vacio">Cargando...</p>
        ) : cats.length === 0 ? (
          <p className="pz-vacio">Todavía no cargaste gastos este mes. Tocá el + para empezar.</p>
        ) : (
          <>
            <div className="pz-stack">
              {cats.map(([n, m], i) => (
                <div key={n} style={{ width: `${(m / totalGastos) * 100}%`, background: COLORES_CAT[i % COLORES_CAT.length] }} />
              ))}
            </div>
            <div className="pz-leyenda">
              {cats.map(([n, m], i) => (
                <div key={n}>
                  <i style={{ background: COLORES_CAT[i % COLORES_CAT.length] }} />
                  <span>{n}</span>
                  <b>{plata(m, oculto)}</b>
                </div>
              ))}
            </div>
          </>
        )}
      </section>

      <Presupuestos usuarioId={usuarioId} porCategoria={porCat} oculto={oculto} refreshKey={refreshKey} />

      <section className="pz-card pz-card-lista">
        <div className="pz-card-head">
          <h2 className="pz-h2">Últimos movimientos</h2>
          <button type="button" className="pz-link" onClick={() => irA('movimientos')}>Ver todo</button>
        </div>
        {!cargando && ultimos.length === 0 && <p className="pz-vacio">Sin movimientos todavía.</p>}
        {ultimos.map((m) => (
          <div className="pz-fila" key={m.id}>
            <Avatar nombre={m.nombre} categoria={m.categoria} />
            <div className="pz-fila-txt">
              <b>{m.nombre}{m.moneda && m.moneda !== 'ARS' && <span className="pz-tag">{m.moneda}</span>}</b>
              <span>{m.detalle}</span>
            </div>
            <span className={`pz-monto ${m.monto > 0 ? 'pos' : ''}`}>
              {m.monto > 0 ? '+ ' : '- '}{plata(Math.abs(m.monto), oculto)}
            </span>
          </div>
        ))}
      </section>
      </>
      )}

      {hoja === 'calendario' && <Calendario usuarioId={usuarioId} oculto={oculto} onCerrar={() => setHoja(null)} />}
      {hoja === 'metas' && <Metas usuarioId={usuarioId} oculto={oculto} onCerrar={() => setHoja(null)} onCambio={() => setExtras((x) => x + 1)} />}
      {hoja === 'deben' && <MeDeben usuarioId={usuarioId} oculto={oculto} onCerrar={() => setHoja(null)} onCambio={() => setExtras((x) => x + 1)} />}
    </div>
  )
}