import { useEffect, useState } from 'react'
import { supabase } from './supabaseClient'
import Avatar from './Avatar'
import Icono from './Iconos'
import Presupuestos from './Presupuestos'
import ErrorCarga from './ErrorCarga'
import { plata, hoyISO, claveMes, diasHasta, DIAS, MESES_LARGO, COLORES_CAT, MEDIOS, MEDIOS_COBRO, traerCotizaciones, pesosSuscripcion } from './utils'

export default function Inicio({ usuarioId, email, refreshKey, oculto, setOculto, onSalir, irA }) {
  const [gastos, setGastos] = useState([])
  const [ingresos, setIngresos] = useState([])
  const [subs, setSubs] = useState([])
  const [cot, setCot] = useState(null)
  const [cargando, setCargando] = useState(true)
  const [fallo, setFallo] = useState(false)
  const [recarga, setRecarga] = useState(0)

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
      const [g, i, s] = await Promise.all([
        supabase.from('gastos')
          .select('id, monto, fecha, descripcion, medio_pago, moneda, monto_original, categorias(nombre), tarjetas(alias)')
          .eq('usuario_id', usuarioId).gte('fecha', desde).order('fecha', { ascending: false }),
        supabase.from('ingresos')
          .select('id, monto, fecha, concepto, descripcion, medio_cobro')
          .eq('usuario_id', usuarioId).gte('fecha', desde).order('fecha', { ascending: false }),
        supabase.from('suscripciones')
          .select('id, nombre, monto_estimado, moneda, monto_original, frecuencia, debito_auto, proximo_vencimiento, tarjetas(alias)')
          .eq('usuario_id', usuarioId).eq('activa', true).order('proximo_vencimiento'),
      ])
      if (g.error || i.error || s.error) setFallo(true)
      else {
        setGastos(g.data || [])
        setIngresos(i.data || [])
        setSubs(s.data || [])
      }
      setCargando(false)
    }
    cargar()
  }, [usuarioId, refreshKey, mesClave, recarga])

  // Solo lo que ya pasó cuenta para el mes (las cuotas futuras quedan para su mes)
  const gastosMes = gastos.filter((g) => g.fecha.slice(0, 7) === mesClave && g.fecha <= hoy)
  const ingresosMes = ingresos.filter((i) => i.fecha.slice(0, 7) === mesClave)
  const totalGastos = gastosMes.reduce((a, g) => a + Number(g.monto), 0)
  const totalIngresos = ingresosMes.reduce((a, i) => a + Number(i.monto), 0)
  const balance = totalIngresos - totalGastos
  const pctAhorro = totalIngresos > 0 ? Math.round((balance / totalIngresos) * 100) : null
  const pctUsado = totalIngresos > 0 ? Math.min(100, (totalGastos / totalIngresos) * 100) : 0

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
            <span style={{ font: "800 18px 'Bricolage Grotesque', sans-serif", color: '#0F4D35', lineHeight: 1 }}>
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
          {pctAhorro !== null && (
            <span className={`pz-hero-badge ${balance < 0 ? 'mal' : ''}`}>
              {balance < 0 ? `Gastás ${-pctAhorro}% de más` : `Ahorrás el ${pctAhorro}%`}
            </span>
          )}
        </div>
        <div className="pz-hero-monto">{balance < 0 && !oculto ? '- ' : ''}{plata(Math.abs(balance), oculto)}</div>
        <div className="pz-barra"><div style={{ width: `${pctUsado}%` }} /></div>
        <div className="pz-hero-grid">
          <div className="pz-hero-mini">
            <span>↓ Entró</span>
            <b>{plata(totalIngresos, oculto)}</b>
          </div>
          <div className="pz-hero-mini">
            <span>↑ Salió</span>
            <b>{plata(totalGastos, oculto)}</b>
          </div>
        </div>
      </section>

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
    </div>
  )
}