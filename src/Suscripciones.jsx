import { useEffect, useState } from 'react'
import { supabase } from './supabaseClient'
import Avatar from './Avatar'
import Icono from './Iconos'
import ErrorCarga from './ErrorCarga'
import { useConfirmar } from './Confirmar'
import {
  plata, hoyISO, diasHasta, escribirMonto, aNumero, montoATexto, traerCotizaciones,
  pesosSuscripcion, mensualSuscripcion, siguienteVencimiento,
} from './utils'

const DIAS_PARA_OCULTAR = 30

function estado(dias, fecha, auto) {
  const verbo = auto ? 'Se debita' : 'Vence'
  if (dias < 0) return { texto: `Vencida hace ${-dias} día${dias === -1 ? '' : 's'}`, clase: 'urg' }
  if (dias === 0) return { texto: `${verbo} hoy`, clase: 'urg' }
  if (dias <= 3) return { texto: `${verbo} en ${dias} día${dias === 1 ? '' : 's'}`, clase: auto ? 'prox' : 'urg' }
  if (dias <= 7) return { texto: `${verbo} en ${dias} días`, clase: 'prox' }
  const [, m, d] = fecha.split('-')
  return { texto: `${verbo} el ${d}/${m}`, clase: 'ok' }
}

export default function Suscripciones({ usuarioId, refreshKey, oculto, onCambio }) {
  const [subs, setSubs] = useState([])
  const [tarjetas, setTarjetas] = useState([])
  const [cot, setCot] = useState(null)
  const [cargando, setCargando] = useState(true)
  const [fallo, setFallo] = useState(false)
  const [recarga, setRecarga] = useState(0)
  const [abierta, setAbierta] = useState(null)
  const [form, setForm] = useState(null) // null | {} (nueva) | suscripción a editar
  const [mostrarViejas, setMostrarViejas] = useState(false)
  const [aviso, setAviso] = useState(null)
  const confirmar = useConfirmar()

  useEffect(() => {
    traerCotizaciones().then(setCot)
  }, [])

  useEffect(() => {
    async function cargar() {
      setCargando(true)
      setFallo(false)
      const [s, t] = await Promise.all([
        supabase.from('suscripciones')
          .select('id, nombre, monto_estimado, moneda, monto_original, frecuencia, debito_auto, proximo_vencimiento, tarjeta_id, tarjetas(alias)')
          .eq('usuario_id', usuarioId).eq('activa', true).order('proximo_vencimiento'),
        supabase.from('tarjetas').select('id, alias').eq('usuario_id', usuarioId).order('alias'),
      ])
      if (s.error || t.error) setFallo(true)
      else {
        setSubs(s.data || [])
        setTarjetas(t.data || [])
      }
      setCargando(false)
    }
    cargar()
  }, [usuarioId, refreshKey, recarga])

  const refrescar = (texto) => {
    if (texto) setAviso({ tipo: 'ok', texto })
    setAbierta(null)
    setRecarga((r) => r + 1)
    if (onCambio) onCambio()
  }

  const totalMes = subs.reduce((a, s) => a + mensualSuscripcion(s, cot), 0)
  const anuales = subs.filter((s) => s.frecuencia === 'anual').length
  const automaticas = subs.filter((s) => s.debito_auto).length
  const viejas = subs.filter((s) => diasHasta(s.proximo_vencimiento) < -DIAS_PARA_OCULTAR)
  const visibles = mostrarViejas ? subs : subs.filter((s) => diasHasta(s.proximo_vencimiento) >= -DIAS_PARA_OCULTAR)
  const urgentes = visibles.filter((s) => diasHasta(s.proximo_vencimiento) <= 7)

  async function yaPague(s) {
    // Registra el pago como gasto y pasa el vencimiento al período siguiente
    let categoriaId = null
    const { data: cat } = await supabase.from('categorias').select('id').eq('usuario_id', usuarioId).ilike('nombre', 'Suscripciones').maybeSingle()
    if (cat) categoriaId = cat.id
    else {
      const { data: nueva } = await supabase.from('categorias').insert({ usuario_id: usuarioId, nombre: 'Suscripciones' }).select('id').single()
      categoriaId = nueva?.id || null
    }
    const enDolares = s.moneda === 'USD' && Number(s.monto_original) > 0
    const pesos = Math.round(pesosSuscripcion(s, cot) * 100) / 100
    const { error: e1 } = await supabase.from('gastos').insert({
      usuario_id: usuarioId, monto: pesos, fecha: hoyISO(), descripcion: s.nombre,
      categoria_id: categoriaId, tarjeta_id: s.tarjeta_id, medio_pago: s.tarjeta_id ? 'tarjeta' : 'efectivo',
      moneda: enDolares ? 'USD' : 'ARS', monto_original: enDolares ? Number(s.monto_original) : null,
      cotizacion: enDolares ? Math.round((pesos / Number(s.monto_original)) * 100) / 100 : null,
    })
    if (e1) return setAviso({ tipo: 'error', texto: e1.message })
    let proximo = s.proximo_vencimiento
    while (proximo <= hoyISO()) proximo = siguienteVencimiento(s, proximo)
    const { error: e2 } = await supabase.from('suscripciones').update({ proximo_vencimiento: proximo }).eq('id', s.id)
    if (e2) return setAviso({ tipo: 'error', texto: e2.message })
    refrescar(`Listo: anotamos el pago de ${s.nombre} y el próximo vence el ${proximo.split('-').reverse().join('/')}.`)
  }

  async function darDeBaja(s) {
    const ok = await confirmar({
      titulo: `¿Dar de baja ${s.nombre}?`,
      texto: 'Deja de aparecer y no te avisamos más. Los pagos que ya anotaste se conservan.',
      boton: 'Dar de baja', peligro: true,
    })
    if (!ok) return
    const { data, error } = await supabase.from('suscripciones').update({ activa: false }).eq('id', s.id).select('id')
    if (error || !data || data.length === 0) return setAviso({ tipo: 'error', texto: error?.message || 'No se pudo dar de baja.' })
    refrescar(`${s.nombre} dada de baja.`)
  }

  const detalles = [
    `${subs.length} activa${subs.length === 1 ? '' : 's'}`,
    automaticas ? `${automaticas} con débito automático` : null,
    urgentes.length ? `${urgentes.length} vence${urgentes.length === 1 ? '' : 'n'} esta semana` : null,
  ].filter(Boolean).join(' · ')

  return (
    <div className="pz-screen">
      <header className="pz-top">
        <h1 className="pz-h1">Suscripciones</h1>
        <button type="button" className="pz-btn pz-btn-primario" onClick={() => setForm({})}>
          <Icono nombre="mas" size={16} /> Agregar
        </button>
      </header>

      {fallo ? <ErrorCarga onReintentar={() => setRecarga((r) => r + 1)} /> : (
        <>
          <section className="pz-hero" style={{ gap: 6 }}>
            <span className="pz-hero-top">Pagás fijo por mes</span>
            <span className="pz-hero-monto" style={{ fontSize: 38 }}>{plata(totalMes, oculto)}</span>
            <span style={{ fontSize: 12.5, color: 'var(--lima)', fontWeight: 700 }}>{detalles}</span>
            {anuales > 0 && (
              <span style={{ fontSize: 12, color: '#CFE3D8' }}>
                Incluye {anuales === 1 ? 'una anual repartida' : `${anuales} anuales repartidas`} en 12 meses.
              </span>
            )}
          </section>

          {aviso && <p className={aviso.tipo === 'error' ? 'pz-error' : 'pz-ok'}>{aviso.texto}</p>}

          {viejas.length > 0 && (
            <p className="pz-sub" style={{ margin: 0 }}>
              {mostrarViejas ? 'Estás viendo' : 'Hay'} {viejas.length} vencida{viejas.length === 1 ? '' : 's'} hace más de {DIAS_PARA_OCULTAR} días{mostrarViejas ? '' : ' ocultas'}.{' '}
              <button type="button" className="pz-link" onClick={() => setMostrarViejas(!mostrarViejas)}>{mostrarViejas ? 'Ocultar' : 'Mostrar'}</button>
            </p>
          )}

          <section className="pz-card pz-card-lista">
            {cargando && <p className="pz-vacio">Cargando...</p>}
            {!cargando && visibles.length === 0 && <p className="pz-vacio">Todavía no cargaste suscripciones. Netflix, Spotify, el gimnasio, el celular...</p>}
            {visibles.map((s) => {
              const dias = diasHasta(s.proximo_vencimiento)
              const est = estado(dias, s.proximo_vencimiento, s.debito_auto)
              const enDolares = s.moneda === 'USD' && Number(s.monto_original) > 0
              const pesos = pesosSuscripcion(s, cot)
              const msj = `Recordatorio PESOS: ${s.nombre} (${enDolares ? plata(s.monto_original, false, 'USD') : plata(pesos)}) ${est.texto.toLowerCase()}.`
              return (
                <div key={s.id}>
                  <button type="button" className="pz-fila pz-fila-btn" onClick={() => setAbierta(abierta === s.id ? null : s.id)} aria-expanded={abierta === s.id}>
                    <Avatar nombre={s.nombre} categoria="Suscripciones" />
                    <span className="pz-fila-txt">
                      <b>
                        {s.nombre}
                        {s.frecuencia === 'anual' && <span className="pz-tag pz-tag-anual">Anual</span>}
                      </b>
                      <span className="pz-sus-badges">
                        <span className={`pz-badge ${est.clase}`}>{est.texto}</span>
                        {s.debito_auto && <span className="pz-badge pz-badge-auto">Automático</span>}
                      </span>
                    </span>
                    <span className="pz-fila-der">
                      <span className="pz-monto">{enDolares ? plata(s.monto_original, oculto, 'USD') : plata(pesos, oculto)}</span>
                      <span className="pz-sub" style={{ fontSize: 11.5 }}>
                        {enDolares ? `≈ ${plata(pesos, oculto)}` : s.tarjetas?.alias || 'Sin tarjeta'}
                      </span>
                    </span>
                  </button>
                  {abierta === s.id && (
                    <div className="pz-acciones pz-acciones-wrap">
                      <button type="button" className="pz-btn pz-btn-primario" onClick={() => yaPague(s)}>Ya la pagué</button>
                      <a className="pz-btn pz-btn-claro" href={`https://wa.me/?text=${encodeURIComponent(msj)}`} target="_blank" rel="noopener noreferrer"><Icono nombre="mensaje" size={16} /> WhatsApp</a>
                      <a className="pz-btn pz-btn-claro" href={`mailto:?subject=${encodeURIComponent('Recordatorio: ' + s.nombre)}&body=${encodeURIComponent(msj)}`}>Mail</a>
                      <button type="button" className="pz-btn pz-btn-claro" onClick={() => setForm(s)}><Icono nombre="editar" size={16} /> Editar</button>
                      <button type="button" className="pz-btn pz-btn-peligro" onClick={() => darDeBaja(s)}>Dar de baja</button>
                    </div>
                  )}
                </div>
              )
            })}
          </section>
        </>
      )}

      {form && (
        <FormSuscripcion usuarioId={usuarioId} sub={form} tarjetas={tarjetas} cot={cot} onCerrar={() => setForm(null)}
          onGuardado={(texto) => { setForm(null); refrescar(texto) }} />
      )}
    </div>
  )
}

function FormSuscripcion({ usuarioId, sub, tarjetas, cot, onCerrar, onGuardado }) {
  const editando = Boolean(sub.id)
  const [nombre, setNombre] = useState(sub.nombre || '')
  const [moneda, setMoneda] = useState(sub.moneda === 'USD' ? 'USD' : 'ARS')
  const [monto, setMonto] = useState(montoATexto(sub.moneda === 'USD' ? sub.monto_original : sub.monto_estimado))
  const [frecuencia, setFrecuencia] = useState(sub.frecuencia === 'anual' ? 'anual' : 'mensual')
  const [auto, setAuto] = useState(Boolean(sub.debito_auto))
  const [tarjetaId, setTarjetaId] = useState(sub.tarjeta_id || '')
  const [vence, setVence] = useState(sub.proximo_vencimiento || hoyISO())
  const [error, setError] = useState(null)
  const [guardando, setGuardando] = useState(false)

  const valor = aNumero(monto)
  const enPesos = moneda === 'USD' ? valor * (cot?.tarjeta || 0) : valor

  async function guardar() {
    if (!nombre.trim()) return setError('Poné el nombre de la suscripción.')
    if (!valor || valor <= 0) return setError('El monto tiene que ser mayor a 0.')
    if (moneda === 'USD' && !cot?.tarjeta) return setError('No pudimos traer el dólar tarjeta. Revisá tu conexión y probá de nuevo.')
    setGuardando(true)
    const datos = {
      nombre: nombre.trim(), tarjeta_id: tarjetaId || null, proximo_vencimiento: vence,
      moneda, monto_original: moneda === 'USD' ? valor : null, monto_estimado: Math.round(enPesos * 100) / 100,
      frecuencia, debito_auto: auto,
    }
    const consulta = editando
      ? supabase.from('suscripciones').update(datos).eq('id', sub.id).select('id')
      : supabase.from('suscripciones').insert({ ...datos, usuario_id: usuarioId }).select('id')
    const { data, error: e } = await consulta
    if (e || !data || data.length === 0) {
      setError(e?.message || 'No se pudo guardar.')
      setGuardando(false)
      return
    }
    onGuardado(editando ? 'Suscripción actualizada.' : `${nombre.trim()} agregada.`)
  }

  return (
    <div className="pz-sheet-fondo" onClick={onCerrar}>
      <section className="pz-sheet" role="dialog" aria-modal="true" aria-label="Suscripción" onClick={(e) => e.stopPropagation()}>
        <div className="pz-sheet-manija" />
        <div className="pz-top">
          <h2 className="pz-h2">{editando ? 'Editar suscripción' : 'Nueva suscripción'}</h2>
          <button type="button" className="pz-icon-btn" onClick={onCerrar} aria-label="Cerrar"><Icono nombre="cerrar" size={18} /></button>
        </div>
        <div className="pz-campo">
          <label className="pz-label" htmlFor="s-nombre">Nombre</label>
          <div className="pz-input-logo">
            <Avatar nombre={nombre || '?'} categoria="Suscripciones" size={34} />
            <input id="s-nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Netflix, Spotify, gimnasio..." />
          </div>
        </div>

        <div className="pz-campo">
          <span className="pz-label">Se cobra en</span>
          <div className="pz-chips">
            <button type="button" className={`pz-chip ${moneda === 'ARS' ? 'on' : ''}`} onClick={() => setMoneda('ARS')}>Pesos</button>
            <button type="button" className={`pz-chip ${moneda === 'USD' ? 'on' : ''}`} onClick={() => setMoneda('USD')}>Dólares</button>
          </div>
        </div>

        <div className="pz-campo">
          <label className="pz-label" htmlFor="s-monto">
            {moneda === 'USD' ? 'Monto en dólares' : 'Monto en pesos'}{frecuencia === 'anual' ? ' (por año)' : ' (por mes)'}
          </label>
          <input id="s-monto" className="pz-input" type="text" inputMode="decimal" value={monto}
            onChange={(e) => setMonto(escribirMonto(e.target.value, moneda === 'USD'))} placeholder={moneda === 'USD' ? '0,00' : '0'} />
          {moneda === 'USD' && valor > 0 && (
            <span className="pz-sub">
              {cot?.tarjeta ? `≈ ${plata(enPesos)} al dólar tarjeta de hoy (${plata(cot.tarjeta)}). Se recalcula solo cada día.` : 'Cargando la cotización del dólar tarjeta...'}
            </span>
          )}
        </div>

        <div className="pz-campo">
          <span className="pz-label">¿Cada cuánto se paga?</span>
          <div className="pz-chips">
            <button type="button" className={`pz-chip ${frecuencia === 'mensual' ? 'on' : ''}`} onClick={() => setFrecuencia('mensual')}>Todos los meses</button>
            <button type="button" className={`pz-chip ${frecuencia === 'anual' ? 'on' : ''}`} onClick={() => setFrecuencia('anual')}>Una vez por año</button>
          </div>
        </div>

        <div className="pz-campo">
          <span className="pz-label">Se paga con</span>
          <div className="pz-chips">
            <button type="button" className={`pz-chip ${!tarjetaId ? 'on' : ''}`} onClick={() => setTarjetaId('')}>Sin tarjeta</button>
            {tarjetas.map((t) => (
              <button key={t.id} type="button" className={`pz-chip ${tarjetaId === t.id ? 'on' : ''}`} onClick={() => setTarjetaId(t.id)}>{t.alias}</button>
            ))}
          </div>
        </div>

        <div className="pz-campo">
          <label className="pz-label" htmlFor="s-vence">Próximo vencimiento</label>
          <input id="s-vence" className="pz-input" type="date" value={vence} onChange={(e) => setVence(e.target.value)} />
        </div>

        <label className="pz-switch">
          <input type="checkbox" checked={auto} onChange={(e) => setAuto(e.target.checked)} />
          <span className="pz-switch-pista" aria-hidden="true"><span /></span>
          <span className="pz-switch-txt">
            <b>Se debita automáticamente</b>
            <small>{auto
              ? 'El día del vencimiento PESOS anota el gasto solo y pasa al próximo. No tenés que tocar nada.'
              : 'Activalo si te lo cobran solo (débito o tarjeta). Si no, te avisamos y vos tocás "Ya la pagué".'}</small>
          </span>
        </label>

        {error && <p className="pz-error">{error}</p>}
        <button type="button" className="pz-btn pz-btn-primario pz-btn-grande" onClick={guardar} disabled={guardando}>
          {guardando ? 'Guardando...' : editando ? 'Guardar cambios' : 'Agregar suscripción'}
        </button>
      </section>
    </div>
  )
}