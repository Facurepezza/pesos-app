import { useEffect, useState } from 'react'
import { supabase } from './supabaseClient'
import Autocompletar from './Autocompletar'
import Avatar from './Avatar'
import Icono from './Iconos'
import { plata, hoyISO, sumarMeses, claveMes, CATEGORIAS, CONCEPTOS_INGRESO, MEDIOS_COBRO, traerCotizaciones } from './utils'

const CUOTAS = [1, 3, 6, 12]

export default function CargarSheet({ usuarioId, tipoInicial = 'gasto', onCerrar, onGuardado }) {
  const [tipo, setTipo] = useState(tipoInicial)
  const [moneda, setMoneda] = useState('ARS')
  const [monto, setMonto] = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [categoria, setCategoria] = useState('')
  const [medio, setMedio] = useState('efectivo') // efectivo | mercado_pago | t:<id> | nueva
  const [nuevaTarjeta, setNuevaTarjeta] = useState('')
  const [cuotas, setCuotas] = useState(1)
  const [concepto, setConcepto] = useState(CONCEPTOS_INGRESO[0])
  const [medioCobro, setMedioCobro] = useState('banco')
  const [fecha, setFecha] = useState(hoyISO())
  const [tarjetas, setTarjetas] = useState([])
  const [recientes, setRecientes] = useState([])
  const [cot, setCot] = useState(null)
  const [cotManual, setCotManual] = useState('')
  const [repetir, setRepetir] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    async function cargar() {
      const [t, r] = await Promise.all([
        supabase.from('tarjetas').select('id, alias, ultimos4').eq('usuario_id', usuarioId).order('alias'),
        supabase.from('gastos').select('descripcion, monto, moneda, monto_original, medio_pago, tarjeta_id, cuotas_total, categorias(nombre)')
          .eq('usuario_id', usuarioId).not('descripcion', 'is', null).order('fecha', { ascending: false }).limit(60),
      ])
      setTarjetas(t.data || [])
      // Comercios usados hace poco, sin repetir
      const vistos = new Set()
      const lista = []
      for (const g of r.data || []) {
        const k = g.descripcion.trim().toLowerCase()
        if (!vistos.has(k)) { vistos.add(k); lista.push(g) }
        if (lista.length === 8) break
      }
      setRecientes(lista)
    }
    cargar()
    traerCotizaciones().then(setCot)
  }, [usuarioId])

  const esTarjeta = medio.startsWith('t:') || medio === 'nueva'

  // Cotización que se usa para convertir a pesos
  let tasa = 1
  let nombreTasa = ''
  if (moneda === 'USD') {
    tasa = esTarjeta ? cot?.tarjeta : cot?.blue
    nombreTasa = esTarjeta ? 'dólar tarjeta' : 'dólar blue'
  } else if (moneda === 'EUR') {
    tasa = cot?.euro
    nombreTasa = 'euro oficial'
  }
  if (moneda !== 'ARS' && cotManual) tasa = parseFloat(cotManual)
  const faltaCot = moneda !== 'ARS' && !tasa
  const valor = parseFloat(String(monto).replace(',', '.')) || 0
  const enPesos = moneda === 'ARS' ? valor : valor * (tasa || 0)

  async function obtenerOCrear(tabla, campo, valorTexto, extra = {}) {
    const limpio = valorTexto.trim()
    const { data: existente } = await supabase.from(tabla).select('id')
      .eq('usuario_id', usuarioId).ilike(campo, limpio).maybeSingle()
    if (existente) return existente.id
    const { data: nueva, error: err } = await supabase.from(tabla)
      .insert({ usuario_id: usuarioId, [campo]: limpio, ...extra }).select('id').single()
    if (err) throw err
    return nueva.id
  }

  // Después de guardar un gasto: ¿se pasó del presupuesto de esa categoría?
  async function chequearPresupuesto(categoriaId) {
    const ahora = new Date()
    const mes = claveMes(ahora.getFullYear(), ahora.getMonth())
    if (!categoria || !categoriaId || fecha.slice(0, 7) !== mes) return null
    const { data: tope } = await supabase.from('presupuestos').select('monto')
      .eq('usuario_id', usuarioId).eq('categoria', categoria).maybeSingle()
    if (!tope) return null
    const { data: delMes } = await supabase.from('gastos').select('monto')
      .eq('usuario_id', usuarioId).eq('categoria_id', categoriaId).gte('fecha', `${mes}-01`).lte('fecha', hoyISO())
    const gastado = (delMes || []).reduce((a, g) => a + Number(g.monto), 0)
    const pct = (gastado / Number(tope.monto)) * 100
    if (pct >= 100) return { texto: `Guardado. Ojo: te pasaste del presupuesto de ${categoria} (${plata(gastado)} de ${plata(tope.monto)})`, tipo: 'error' }
    if (pct >= 80) return { texto: `Guardado. Ya usaste el ${Math.round(pct)}% de tu presupuesto de ${categoria}`, tipo: 'aviso' }
    return null
  }

  async function guardar() {
    setError(null)
    if (!valor || valor <= 0) return setError('Poné un monto mayor a 0.')
    if (faltaCot) return setError('Falta la cotización para convertir a pesos.')
    setGuardando(true)
    try {
      const montoPesos = Math.round(enPesos * 100) / 100
      const repite = repetir && !(esTarjeta && cuotas > 1)
      if (tipo === 'ingreso') {
        let recurrenteId = null
        if (repite) {
          const { data: r, error: er } = await supabase.from('recurrentes').insert({
            usuario_id: usuarioId, tipo: 'ingreso', descripcion: descripcion.trim() || concepto, monto: montoPesos,
            dia: Number(fecha.slice(8, 10)), ultimo_mes: fecha.slice(0, 7), concepto, medio_cobro: medioCobro,
          }).select('id').single()
          if (er) throw er
          recurrenteId = r.id
        }
        const { error: err } = await supabase.from('ingresos').insert({
          usuario_id: usuarioId, monto: montoPesos, fecha, concepto, medio_cobro: medioCobro,
          descripcion: descripcion.trim() || null, recurrente_id: recurrenteId,
        })
        if (err) throw err
        onGuardado(repite ? 'Listo. Se va a cargar solo todos los meses ✓' : null)
        return
      }

      const categoriaId = categoria ? await obtenerOCrear('categorias', 'nombre', categoria) : null
      let tarjetaId = null
      if (medio.startsWith('t:')) tarjetaId = medio.slice(2)
      if (medio === 'nueva') {
        if (!nuevaTarjeta.trim()) throw new Error('Escribí el nombre de la tarjeta nueva.')
        tarjetaId = await obtenerOCrear('tarjetas', 'alias', nuevaTarjeta, { tipo: 'credito' })
      }
      const medioPago = esTarjeta ? 'tarjeta' : medio
      const n = esTarjeta ? cuotas : 1

      let recurrenteId = null
      if (repite) {
        const { data: r, error: er } = await supabase.from('recurrentes').insert({
          usuario_id: usuarioId, tipo: 'gasto', descripcion: descripcion.trim() || categoria || 'Gasto fijo', monto: montoPesos,
          dia: Number(fecha.slice(8, 10)), ultimo_mes: fecha.slice(0, 7),
          categoria_id: categoriaId, tarjeta_id: tarjetaId, medio_pago: medioPago,
        }).select('id').single()
        if (er) throw er
        recurrenteId = r.id
      }

      const base = {
        usuario_id: usuarioId, categoria_id: categoriaId, tarjeta_id: tarjetaId, medio_pago: medioPago,
        descripcion: descripcion.trim() || null, moneda,
        monto_original: moneda === 'ARS' ? null : valor,
        cotizacion: moneda === 'ARS' ? null : tasa,
        recurrente_id: recurrenteId,
      }
      let filas
      if (n > 1) {
        const compraId = crypto.randomUUID()
        const porCuota = Math.round((enPesos / n) * 100) / 100
        filas = Array.from({ length: n }, (_, i) => ({
          ...base, monto: porCuota, fecha: sumarMeses(fecha, i),
          compra_id: compraId, cuota_num: i + 1, cuotas_total: n,
        }))
      } else {
        filas = [{ ...base, monto: montoPesos, fecha }]
      }
      const { error: err } = await supabase.from('gastos').insert(filas)
      if (err) throw err

      const alerta = await chequearPresupuesto(categoriaId)
      if (alerta) onGuardado(alerta.texto, alerta.tipo)
      else onGuardado(repite ? 'Listo. Se va a cargar solo todos los meses ✓' : null)
    } catch (e) {
      setError(e.message)
      setGuardando(false)
    }
  }

  function usarReciente(g) {
    setDescripcion(g.descripcion)
    setCategoria(g.categorias?.nombre && CATEGORIAS.includes(g.categorias.nombre) ? g.categorias.nombre : '')
    setMedio(g.tarjeta_id ? 't:' + g.tarjeta_id : g.medio_pago || 'efectivo')
    if (!monto) {
      if (g.moneda && g.moneda !== 'ARS' && g.monto_original) { setMoneda(g.moneda); setMonto(String(g.monto_original)) }
      else if (!g.cuotas_total || g.cuotas_total === 1) setMonto(String(g.monto))
    }
  }

  return (
    <div className="pz-sheet-fondo" onClick={onCerrar}>
      <section className="pz-sheet" role="dialog" aria-modal="true" aria-label="Cargar movimiento" onClick={(e) => e.stopPropagation()}>
        <div className="pz-sheet-manija" />
        <div className="pz-top">
          <div className="pz-seg" style={{ width: 210 }}>
            <button type="button" className={tipo === 'gasto' ? 'on' : ''} onClick={() => setTipo('gasto')}>Gasto</button>
            <button type="button" className={tipo === 'ingreso' ? 'on' : ''} onClick={() => setTipo('ingreso')}>Ingreso</button>
          </div>
          <button type="button" className="pz-icon-btn" onClick={onCerrar} aria-label="Cerrar">
            <Icono nombre="cerrar" size={18} />
          </button>
        </div>

        <div className="pz-monto-grande">
          <div className="pz-monedas">
            {['ARS', 'USD', 'EUR'].map((m) => (
              <button key={m} type="button" className={moneda === m ? 'on' : ''} onClick={() => setMoneda(m)}>{m}</button>
            ))}
          </div>
          <label className="pz-monto-fila">
            <span>{moneda === 'ARS' ? '$' : moneda === 'USD' ? 'US$' : '€'}</span>
            <input type="number" inputMode="decimal" step="0.01" placeholder="0" value={monto}
              onChange={(e) => setMonto(e.target.value)} aria-label="Monto" autoFocus />
          </label>
          {moneda !== 'ARS' && (
            faltaCot || cotManual !== '' ? (
              <div className="pz-campo" style={{ width: '100%' }}>
                <label className="pz-label" htmlFor="cotm">Cotización en pesos ({nombreTasa})</label>
                <input id="cotm" className="pz-input" type="number" inputMode="decimal" value={cotManual}
                  placeholder="Ej: 1560" onChange={(e) => setCotManual(e.target.value)} />
              </div>
            ) : (
              <div className="pz-conversion">
                ≈ {plata(enPesos)} al {nombreTasa} de hoy ({plata(tasa)}){' '}
                <button type="button" className="pz-link" onClick={() => setCotManual(String(tasa))}>cambiar</button>
              </div>
            )
          )}
        </div>

        {tipo === 'gasto' && recientes.length > 0 && (
          <div className="pz-campo">
            <span className="pz-label">Recientes</span>
            <div className="pz-chips pz-chips-scroll">
              {recientes.map((g) => (
                <button key={g.descripcion} type="button" className="pz-chip pz-chip-logo" onClick={() => usarReciente(g)}>
                  <Avatar nombre={g.descripcion} categoria={g.categorias?.nombre} size={24} />{g.descripcion}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="pz-campo">
          <label className="pz-label" htmlFor="desc">{tipo === 'gasto' ? '¿En qué?' : '¿De dónde?'}</label>
          <Autocompletar
            id="desc"
            value={descripcion}
            onChange={setDescripcion}
            categoria={tipo === 'gasto' ? categoria : concepto}
            onElegir={(c) => { if (tipo === 'gasto' && c.c) setCategoria(c.c) }}
            placeholder={tipo === 'gasto' ? 'Escribí: mc, jumbo, ypf, osde...' : 'Sueldo de octubre, venta...'}
          />
        </div>

        {tipo === 'gasto' ? (
          <>
            <div className="pz-campo">
              <span className="pz-label">Categoría</span>
              <div className="pz-chips">
                {CATEGORIAS.map((c) => (
                  <button key={c} type="button" className={`pz-chip ${categoria === c ? 'on' : ''}`}
                    onClick={() => setCategoria(categoria === c ? '' : c)}>{c}</button>
                ))}
              </div>
            </div>

            <div className="pz-campo">
              <span className="pz-label">Cómo pagaste</span>
              <div className="pz-chips">
                <button type="button" className={`pz-chip ${medio === 'efectivo' ? 'on' : ''}`} onClick={() => setMedio('efectivo')}>Efectivo</button>
                <button type="button" className={`pz-chip ${medio === 'mercado_pago' ? 'on' : ''}`} onClick={() => setMedio('mercado_pago')}>Mercado Pago</button>
                {tarjetas.map((t) => (
                  <button key={t.id} type="button" className={`pz-chip pz-chip-logo ${medio === 't:' + t.id ? 'on' : ''}`} onClick={() => setMedio('t:' + t.id)}>
                    <Avatar nombre={t.alias} size={24} />{t.alias}{t.ultimos4 ? ` ·${t.ultimos4}` : ''}
                  </button>
                ))}
                <button type="button" className={`pz-chip ${medio === 'nueva' ? 'on' : ''}`} onClick={() => setMedio('nueva')}>+ Tarjeta nueva</button>
              </div>
              {medio === 'nueva' && (
                <input className="pz-input" value={nuevaTarjeta} onChange={(e) => setNuevaTarjeta(e.target.value)}
                  placeholder="Ej: Visa Galicia, Naranja X" aria-label="Nombre de la tarjeta nueva" />
              )}
            </div>

            {esTarjeta && (
              <div className="pz-campo">
                <span className="pz-label">Cuotas</span>
                <div className="pz-chips">
                  {CUOTAS.map((c) => (
                    <button key={c} type="button" className={`pz-chip ${cuotas === c ? 'on' : ''}`} onClick={() => setCuotas(c)}>
                      {c === 1 ? '1 pago' : `${c} cuotas`}
                    </button>
                  ))}
                </div>
                {cuotas > 1 && valor > 0 && (
                  <span className="pz-sub">{cuotas} cuotas de {plata(enPesos / cuotas)}. Se reparten solas en los próximos meses.</span>
                )}
              </div>
            )}
          </>
        ) : (
          <>
            <div className="pz-campo">
              <span className="pz-label">Concepto</span>
              <div className="pz-chips">
                {CONCEPTOS_INGRESO.map((c) => (
                  <button key={c} type="button" className={`pz-chip ${concepto === c ? 'on' : ''}`} onClick={() => setConcepto(c)}>{c}</button>
                ))}
              </div>
            </div>
            <div className="pz-campo">
              <span className="pz-label">Cómo te pagaron</span>
              <div className="pz-chips">
                {Object.entries(MEDIOS_COBRO).map(([k, l]) => (
                  <button key={k} type="button" className={`pz-chip ${medioCobro === k ? 'on' : ''}`} onClick={() => setMedioCobro(k)}>{l}</button>
                ))}
              </div>
            </div>
          </>
        )}

        <div className="pz-campo">
          <label className="pz-label" htmlFor="fecha">Fecha</label>
          <input id="fecha" className="pz-input" type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} />
        </div>

        {!(esTarjeta && cuotas > 1) && (
          <label className="pz-switch">
            <input type="checkbox" checked={repetir} onChange={(e) => setRepetir(e.target.checked)} />
            <span className="pz-switch-pista" aria-hidden="true"><span /></span>
            <span className="pz-switch-txt">
              <b>Se repite todos los meses</b>
              <small>{repetir ? `Se va a cargar solo cada día ${Number(fecha.slice(8, 10))}.` : 'Ideal para sueldo, alquiler, expensas o la cuota del gimnasio.'}</small>
            </span>
          </label>
        )}

        {error && <p className="pz-error">{error}</p>}

        <button type="button" className="pz-btn pz-btn-primario pz-btn-grande" onClick={guardar} disabled={guardando}>
          {guardando ? 'Guardando...' : tipo === 'gasto' ? 'Guardar gasto' : 'Guardar ingreso'}
        </button>
      </section>
    </div>
  )
}