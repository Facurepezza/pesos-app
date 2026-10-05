import { useRef, useState } from 'react'
import { supabase } from './supabaseClient'
import Avatar from './Avatar'
import Icono from './Iconos'
import { CONCEPTOS_INGRESO, hoyISO, plata } from './utils'

// Primeros pasos guiados la primera vez que alguien entra a PESOS:
// nombre, cuánto cobra y qué día, tarjetas y suscripciones.

const BANCOS = ['Banco Galicia', 'Santander', 'BBVA', 'Banco Macro', 'Banco Nación', 'Banco Provincia', 'Banco Ciudad',
  'ICBC', 'Supervielle', 'Banco Patagonia', 'Naranja X', 'Brubank', 'Ualá', 'Mercado Pago']

const SERVICIOS = ['Netflix', 'Spotify', 'Disney+', 'Max', 'Prime Video', 'YouTube Premium', 'Paramount+', 'Crunchyroll',
  'ChatGPT Plus', 'Claude', 'Google One', 'Apple', 'Microsoft 365', 'Canva', 'Flow', 'DirecTV']

const REDES = ['Visa', 'Mastercard', 'Amex', 'Otra']
const DIAS_RAPIDOS = [1, 5, 10, 15, 20, 25, 30]
const TOTAL_PASOS = 4

function colorPorDefecto(alias) {
  const a = (alias || '').toLowerCase()
  if (a.includes('naranja')) return '#F26A1B'
  if (a.includes('santander') || a.includes('macro')) return '#B91C1C'
  if (a.includes('bbva') || a.includes('nacion') || a.includes('nación')) return '#1E40AF'
  if (a.includes('brubank') || a.includes('uala') || a.includes('ualá')) return '#6D28D9'
  return '#0B3626'
}

// Convierte "350.000" o "350000,50" en número
function numero(txt) {
  const limpio = String(txt || '').replace(/\./g, '').replace(',', '.').replace(/[^0-9.]/g, '')
  const n = parseFloat(limpio)
  return Number.isFinite(n) ? n : 0
}

// Día válido entre 1 y 31, si no null
function diaValido(txt) {
  const n = parseInt(txt, 10)
  return n >= 1 && n <= 31 ? n : null
}

const pad = (n) => String(n).padStart(2, '0')

// Fecha del día X en un mes (si el mes no tiene ese día, usa el último)
function fechaDelMes(anio, mes, dia) {
  const ultimo = new Date(anio, mes + 1, 0).getDate()
  return `${anio}-${pad(mes + 1)}-${pad(Math.min(dia, ultimo))}`
}

// Próxima vez que cae el día X (hoy incluido)
function proximaFecha(dia) {
  const h = new Date()
  const esteMes = fechaDelMes(h.getFullYear(), h.getMonth(), dia)
  if (esteMes >= hoyISO()) return esteMes
  const sig = new Date(h.getFullYear(), h.getMonth() + 1, 1)
  return fechaDelMes(sig.getFullYear(), sig.getMonth(), dia)
}

export default function PrimerosPasos({ usuario, onListo }) {
  const [paso, setPaso] = useState(0)
  const [nombre, setNombre] = useState(usuario.user_metadata?.nombre || '')
  const [ingreso, setIngreso] = useState({ monto: '', concepto: 'Sueldo', dia: '' })
  const [tarjetas, setTarjetas] = useState([])
  const [subs, setSubs] = useState([])
  const [otroBanco, setOtroBanco] = useState('')
  const [otroServicio, setOtroServicio] = useState('')
  const [error, setError] = useState(null)
  const [guardando, setGuardando] = useState(false)
  const [resumen, setResumen] = useState(null)
  // Para no guardar dos veces si algo falla y se reintenta
  const hecho = useRef({ ingreso: false, tarjetas: null, subs: false })

  // ---------- Tarjetas ----------
  const tieneTarjeta = (b) => tarjetas.some((t) => t.banco === b)
  function alternarTarjeta(b) {
    setTarjetas((ts) => (ts.some((t) => t.banco === b) ? ts.filter((t) => t.banco !== b) : [...ts, { banco: b, red: 'Visa', cierre: '', vence: '' }]))
  }
  function cambiarTarjeta(b, campo, valor) {
    setTarjetas((ts) => ts.map((t) => (t.banco === b ? { ...t, [campo]: valor } : t)))
  }
  function agregarOtroBanco() {
    const b = otroBanco.trim()
    if (!b) return
    if (!tieneTarjeta(b)) alternarTarjeta(b)
    setOtroBanco('')
  }

  // ---------- Suscripciones ----------
  const tieneSub = (s) => subs.some((x) => x.nombre === s)
  function alternarSub(s) {
    setSubs((xs) => (xs.some((x) => x.nombre === s) ? xs.filter((x) => x.nombre !== s) : [...xs, { nombre: s, monto: '', dia: '', tarjeta: '' }]))
  }
  function cambiarSub(s, campo, valor) {
    setSubs((xs) => xs.map((x) => (x.nombre === s ? { ...x, [campo]: valor } : x)))
  }
  function agregarOtroServicio() {
    const s = otroServicio.trim()
    if (!s) return
    if (!tieneSub(s)) alternarSub(s)
    setOtroServicio('')
  }

  // ---------- Validaciones por paso ----------
  function siguiente() {
    setError(null)
    if (paso === 0 && !nombre.trim()) return setError('Escribí tu nombre para seguir.')
    if (paso === 1) {
      const m = numero(ingreso.monto)
      if (m > 0 && !diaValido(ingreso.dia)) return setError('Elegí qué día cobrás (del 1 al 31).')
      if (!m && ingreso.monto.trim()) return setError('El monto no es válido.')
    }
    if (paso === 2) {
      const mal = tarjetas.find((t) => (t.cierre && !diaValido(t.cierre)) || (t.vence && !diaValido(t.vence)))
      if (mal) return setError(`Revisá los días de ${mal.banco}: tienen que estar entre 1 y 31.`)
    }
    if (paso === 3) return guardarTodo()
    setPaso(paso + 1)
  }

  // ---------- Guardado final ----------
  async function guardarTodo() {
    const sinMonto = subs.find((s) => numero(s.monto) <= 0)
    if (sinMonto) return setError(`Poné cuánto pagás de ${sinMonto.nombre} (o sacala de la lista).`)
    const sinDia = subs.find((s) => !diaValido(s.dia))
    if (sinDia) return setError(`Poné qué día te cobran ${sinDia.nombre} (del 1 al 31).`)

    setGuardando(true)
    setError(null)
    const uid = usuario.id
    try {
      // 1) Ingreso fijo
      const montoIng = numero(ingreso.monto)
      const diaIng = diaValido(ingreso.dia)
      if (montoIng > 0 && diaIng && !hecho.current.ingreso) {
        const h = new Date()
        const fechaEsteMes = fechaDelMes(h.getFullYear(), h.getMonth(), diaIng)
        const yaCobro = fechaEsteMes <= hoyISO()
        const ant = new Date(h.getFullYear(), h.getMonth() - 1, 1)
        const mesActual = `${h.getFullYear()}-${pad(h.getMonth() + 1)}`
        const mesAnterior = `${ant.getFullYear()}-${pad(ant.getMonth() + 1)}`
        const { data: r, error: e1 } = await supabase.from('recurrentes').insert({
          usuario_id: uid, tipo: 'ingreso', descripcion: ingreso.concepto, monto: montoIng, dia: diaIng,
          concepto: ingreso.concepto, activo: true, ultimo_mes: yaCobro ? mesActual : mesAnterior,
        }).select('id').single()
        if (e1) throw e1
        if (yaCobro) {
          const { error: e2 } = await supabase.from('ingresos').insert({
            usuario_id: uid, monto: montoIng, fecha: fechaEsteMes, concepto: ingreso.concepto,
            descripcion: ingreso.concepto, recurrente_id: r.id,
          })
          if (e2) throw e2
        }
        hecho.current.ingreso = true
      }

      // 2) Tarjetas
      let idPorBanco = hecho.current.tarjetas || {}
      if (tarjetas.length > 0 && !hecho.current.tarjetas) {
        const filas = tarjetas.map((t) => ({
          usuario_id: uid, alias: t.banco, red: t.red, tipo: 'credito', color: colorPorDefecto(t.banco),
          dia_cierre: diaValido(t.cierre), dia_vencimiento: diaValido(t.vence), ultimos4: null,
        }))
        const { data, error: e3 } = await supabase.from('tarjetas').insert(filas).select('id, alias')
        if (e3) throw e3
        idPorBanco = Object.fromEntries((data || []).map((t) => [t.alias, t.id]))
        hecho.current.tarjetas = idPorBanco
      }

      // 3) Suscripciones
      if (subs.length > 0 && !hecho.current.subs) {
        const filas = subs.map((s) => ({
          usuario_id: uid, nombre: s.nombre, monto_estimado: numero(s.monto), activa: true,
          proximo_vencimiento: proximaFecha(diaValido(s.dia)), tarjeta_id: s.tarjeta ? idPorBanco[s.tarjeta] || null : null,
        }))
        const { error: e4 } = await supabase.from('suscripciones').insert(filas)
        if (e4) throw e4
        hecho.current.subs = true
      }

      // 4) Nombre y marca de "ya hizo los primeros pasos"
      const { error: e5 } = await supabase.auth.updateUser({ data: { nombre: nombre.trim(), primeros_pasos: true } })
      if (e5) throw e5

      setResumen({
        ingreso: montoIng > 0 ? montoIng : 0,
        tarjetas: tarjetas.length,
        subs: subs.length,
        fijo: subs.reduce((a, s) => a + numero(s.monto), 0),
      })
      setPaso(4)
    } catch (e) {
      setError(`No se pudo guardar: ${e.message || 'error desconocido'}. Probá de nuevo.`)
    }
    setGuardando(false)
  }

  async function saltarTodo() {
    setGuardando(true)
    const datos = { primeros_pasos: true }
    if (nombre.trim()) datos.nombre = nombre.trim()
    await supabase.auth.updateUser({ data: datos })
    setGuardando(false)
    onListo()
  }

  const nombrePila = nombre.trim().split(' ')[0]

  return (
    <div className="pz pz-pasos">
      <div className="pz-pasos-in">
        {paso < 4 && (
          <div className="pz-pasos-top">
            <div className="pz-pasos-puntos" aria-label={`Paso ${paso + 1} de ${TOTAL_PASOS}`}>
              {Array.from({ length: TOTAL_PASOS }, (_, i) => <span key={i} className={i <= paso ? 'on' : ''} />)}
            </div>
            <button type="button" className="pz-link" onClick={saltarTodo} disabled={guardando}>Saltar</button>
          </div>
        )}

        {/* ---------- Paso 1: nombre ---------- */}
        {paso === 0 && (
          <section className="pz-pasos-cuerpo">
            <div className="pz-marca-logo">$</div>
            <h1 className="pz-pasos-titulo">Bienvenido a PESOS</h1>
            <p className="pz-pasos-sub">En menos de un minuto dejamos tu cuenta lista. Todo se puede cambiar después.</p>
            <div className="pz-campo">
              <label className="pz-label" htmlFor="pp-nombre">¿Cómo te llamás?</label>
              <input id="pp-nombre" className="pz-input" value={nombre} onChange={(e) => setNombre(e.target.value)}
                placeholder="Ej: Facundo" autoComplete="given-name" autoFocus />
            </div>
          </section>
        )}

        {/* ---------- Paso 2: ingreso ---------- */}
        {paso === 1 && (
          <section className="pz-pasos-cuerpo">
            <span className="pz-pasos-ico"><Icono nombre="billete" size={26} /></span>
            <h1 className="pz-pasos-titulo">{nombrePila ? `${nombrePila}, ¿cuánto cobrás por mes?` : '¿Cuánto cobrás por mes?'}</h1>
            <p className="pz-pasos-sub">Lo cargamos solo todos los meses, así ves cuánto te queda. Si no querés, dejalo vacío.</p>

            <div className="pz-campo">
              <span className="pz-label">Concepto</span>
              <div className="pz-chips">
                {CONCEPTOS_INGRESO.slice(0, 4).map((c) => (
                  <button key={c} type="button" className={`pz-chip ${ingreso.concepto === c ? 'on' : ''}`}
                    onClick={() => setIngreso({ ...ingreso, concepto: c })}>{c}</button>
                ))}
              </div>
            </div>

            <div className="pz-campo">
              <label className="pz-label" htmlFor="pp-monto">Monto en pesos</label>
              <input id="pp-monto" className="pz-input pz-input-grande" inputMode="decimal" value={ingreso.monto}
                onChange={(e) => setIngreso({ ...ingreso, monto: e.target.value })} placeholder="$ 0" />
            </div>

            <div className="pz-campo">
              <span className="pz-label">¿Qué día cobrás?</span>
              <div className="pz-chips">
                {DIAS_RAPIDOS.map((d) => (
                  <button key={d} type="button" className={`pz-chip pz-chip-dia ${String(ingreso.dia) === String(d) ? 'on' : ''}`}
                    onClick={() => setIngreso({ ...ingreso, dia: String(d) })}>{d}</button>
                ))}
                <input className="pz-input pz-input-dia" inputMode="numeric" aria-label="Otro día" placeholder="Otro"
                  value={DIAS_RAPIDOS.includes(Number(ingreso.dia)) ? '' : ingreso.dia}
                  onChange={(e) => setIngreso({ ...ingreso, dia: e.target.value.replace(/\D/g, '').slice(0, 2) })} />
              </div>
            </div>
          </section>
        )}

        {/* ---------- Paso 3: tarjetas ---------- */}
        {paso === 2 && (
          <section className="pz-pasos-cuerpo">
            <span className="pz-pasos-ico"><Icono nombre="tarjeta" size={26} /></span>
            <h1 className="pz-pasos-titulo">¿Qué tarjetas de crédito usás?</h1>
            <p className="pz-pasos-sub">Tocá las tuyas. Con el día de cierre y vencimiento te avisamos a tiempo.</p>

            <div className="pz-chips">
              {[...BANCOS, ...tarjetas.map((t) => t.banco).filter((b) => !BANCOS.includes(b))].map((b) => (
                <button key={b} type="button" className={`pz-chip pz-chip-logo ${tieneTarjeta(b) ? 'on' : ''}`} onClick={() => alternarTarjeta(b)}>
                  <Avatar nombre={b} size={26} /> {b}
                </button>
              ))}
            </div>
            <div className="pz-fila-form">
              <input className="pz-input" value={otroBanco} onChange={(e) => setOtroBanco(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') agregarOtroBanco() }} placeholder="Otro banco o tarjeta" aria-label="Otro banco o tarjeta" />
              <button type="button" className="pz-btn pz-btn-claro" onClick={agregarOtroBanco}>Agregar</button>
            </div>

            {tarjetas.map((t) => (
              <div key={t.banco} className="pz-card pz-pasos-item">
                <div className="pz-pasos-item-top">
                  <Avatar nombre={t.banco} size={36} />
                  <b>{t.banco}</b>
                  <button type="button" className="pz-icon-btn pz-icon-chico" onClick={() => alternarTarjeta(t.banco)} aria-label={`Sacar ${t.banco}`}>
                    <Icono nombre="cerrar" size={16} />
                  </button>
                </div>
                <div className="pz-chips">
                  {REDES.map((r) => (
                    <button key={r} type="button" className={`pz-chip ${t.red === r ? 'on' : ''}`} onClick={() => cambiarTarjeta(t.banco, 'red', r)}>{r}</button>
                  ))}
                </div>
                <div className="pz-dos">
                  <div className="pz-campo">
                    <label className="pz-label" htmlFor={`pp-c-${t.banco}`}>Día de cierre</label>
                    <input id={`pp-c-${t.banco}`} className="pz-input" inputMode="numeric" placeholder="Opcional" value={t.cierre}
                      onChange={(e) => cambiarTarjeta(t.banco, 'cierre', e.target.value.replace(/\D/g, '').slice(0, 2))} />
                  </div>
                  <div className="pz-campo">
                    <label className="pz-label" htmlFor={`pp-v-${t.banco}`}>Día de vencimiento</label>
                    <input id={`pp-v-${t.banco}`} className="pz-input" inputMode="numeric" placeholder="Opcional" value={t.vence}
                      onChange={(e) => cambiarTarjeta(t.banco, 'vence', e.target.value.replace(/\D/g, '').slice(0, 2))} />
                  </div>
                </div>
              </div>
            ))}
          </section>
        )}

        {/* ---------- Paso 4: suscripciones ---------- */}
        {paso === 3 && (
          <section className="pz-pasos-cuerpo">
            <span className="pz-pasos-ico"><Icono nombre="repetir" size={26} /></span>
            <h1 className="pz-pasos-titulo">¿Qué servicios pagás todos los meses?</h1>
            <p className="pz-pasos-sub">Te avisamos antes de cada cobro para que no te agarre de sorpresa.</p>

            <div className="pz-chips">
              {[...SERVICIOS, ...subs.map((s) => s.nombre).filter((s) => !SERVICIOS.includes(s))].map((s) => (
                <button key={s} type="button" className={`pz-chip pz-chip-logo ${tieneSub(s) ? 'on' : ''}`} onClick={() => alternarSub(s)}>
                  <Avatar nombre={s} categoria="Suscripciones" size={26} /> {s}
                </button>
              ))}
            </div>
            <div className="pz-fila-form">
              <input className="pz-input" value={otroServicio} onChange={(e) => setOtroServicio(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') agregarOtroServicio() }} placeholder="Otro (gimnasio, prepaga...)" aria-label="Otro servicio" />
              <button type="button" className="pz-btn pz-btn-claro" onClick={agregarOtroServicio}>Agregar</button>
            </div>

            {subs.map((s) => (
              <div key={s.nombre} className="pz-card pz-pasos-item">
                <div className="pz-pasos-item-top">
                  <Avatar nombre={s.nombre} categoria="Suscripciones" size={36} />
                  <b>{s.nombre}</b>
                  <button type="button" className="pz-icon-btn pz-icon-chico" onClick={() => alternarSub(s.nombre)} aria-label={`Sacar ${s.nombre}`}>
                    <Icono nombre="cerrar" size={16} />
                  </button>
                </div>
                <div className="pz-dos">
                  <div className="pz-campo">
                    <label className="pz-label" htmlFor={`pp-m-${s.nombre}`}>¿Cuánto pagás?</label>
                    <input id={`pp-m-${s.nombre}`} className="pz-input" inputMode="decimal" placeholder="$ 0" value={s.monto}
                      onChange={(e) => cambiarSub(s.nombre, 'monto', e.target.value)} />
                  </div>
                  <div className="pz-campo">
                    <label className="pz-label" htmlFor={`pp-d-${s.nombre}`}>Día de cobro</label>
                    <input id={`pp-d-${s.nombre}`} className="pz-input" inputMode="numeric" placeholder="Ej: 10" value={s.dia}
                      onChange={(e) => cambiarSub(s.nombre, 'dia', e.target.value.replace(/\D/g, '').slice(0, 2))} />
                  </div>
                </div>
                {tarjetas.length > 0 && (
                  <div className="pz-campo">
                    <span className="pz-label">¿Con qué se paga?</span>
                    <div className="pz-chips">
                      <button type="button" className={`pz-chip ${!s.tarjeta ? 'on' : ''}`} onClick={() => cambiarSub(s.nombre, 'tarjeta', '')}>Sin tarjeta</button>
                      {tarjetas.map((t) => (
                        <button key={t.banco} type="button" className={`pz-chip ${s.tarjeta === t.banco ? 'on' : ''}`}
                          onClick={() => cambiarSub(s.nombre, 'tarjeta', t.banco)}>{t.banco}</button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </section>
        )}

        {/* ---------- Listo ---------- */}
        {paso === 4 && resumen && (
          <section className="pz-pasos-cuerpo pz-pasos-fin">
            <span className="pz-pasos-check">✓</span>
            <h1 className="pz-pasos-titulo">¡Listo{nombrePila ? `, ${nombrePila}` : ''}!</h1>
            <p className="pz-pasos-sub">Tu cuenta ya está armada y guardada en la nube. Entrá desde el celu o la compu y vas a ver lo mismo.</p>
            <div className="pz-pasos-resumen">
              <div><span>Ingreso mensual</span><b>{resumen.ingreso ? plata(resumen.ingreso) : 'Sin cargar'}</b></div>
              <div><span>Tarjetas</span><b>{resumen.tarjetas}</b></div>
              <div><span>Suscripciones</span><b>{resumen.subs}</b></div>
              <div><span>Gasto fijo por mes</span><b>{plata(resumen.fijo)}</b></div>
            </div>
          </section>
        )}

        {error && <p className="pz-error">{error}</p>}

        <div className="pz-pasos-botones">
          {paso === 4 ? (
            <button type="button" className="pz-btn pz-btn-primario pz-btn-grande" onClick={onListo}>Empezar a usar PESOS</button>
          ) : (
            <>
              {paso > 0 && (
                <button type="button" className="pz-btn pz-btn-claro" onClick={() => { setError(null); setPaso(paso - 1) }} disabled={guardando}>
                  <Icono nombre="izq" size={18} />
                </button>
              )}
              <button type="button" className="pz-btn pz-btn-primario pz-btn-grande" onClick={siguiente} disabled={guardando}>
                {guardando ? 'Guardando...' : paso === 3 ? 'Terminar' : (paso === 1 && !ingreso.monto.trim()) || (paso === 2 && !tarjetas.length) ? 'Saltar este paso' : 'Siguiente'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}