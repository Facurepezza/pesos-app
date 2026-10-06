import { useEffect, useState } from 'react'
import { supabase } from './supabaseClient'
import Avatar from './Avatar'
import Icono from './Iconos'
import { useConfirmar } from './Confirmar'
import { plata, hoyISO, diasHasta, sumarMeses, escribirMonto, aNumero, montoATexto } from './utils'

const DIAS_PARA_OCULTAR = 30

function estado(dias, fecha) {
  if (dias < 0) return { texto: `Vencida hace ${-dias} día${dias === -1 ? '' : 's'}`, clase: 'urg' }
  if (dias === 0) return { texto: 'Vence hoy', clase: 'urg' }
  if (dias <= 3) return { texto: `Vence en ${dias} día${dias === 1 ? '' : 's'}`, clase: 'urg' }
  if (dias <= 7) return { texto: `Vence en ${dias} días`, clase: 'prox' }
  const [, m, d] = fecha.split('-')
  return { texto: `Vence el ${d}/${m}`, clase: 'ok' }
}

export default function Suscripciones({ usuarioId, refreshKey, oculto, onCambio }) {
  const [subs, setSubs] = useState([])
  const [tarjetas, setTarjetas] = useState([])
  const [cargando, setCargando] = useState(true)
  const [recarga, setRecarga] = useState(0)
  const [abierta, setAbierta] = useState(null)
  const [form, setForm] = useState(null) // null | {} (nueva) | suscripción a editar
  const [mostrarViejas, setMostrarViejas] = useState(false)
  const [aviso, setAviso] = useState(null)
  const confirmar = useConfirmar()

  useEffect(() => {
    async function cargar() {
      setCargando(true)
      const [s, t] = await Promise.all([
        supabase.from('suscripciones')
          .select('id, nombre, monto_estimado, proximo_vencimiento, tarjeta_id, tarjetas(alias)')
          .eq('usuario_id', usuarioId).eq('activa', true).order('proximo_vencimiento'),
        supabase.from('tarjetas').select('id, alias').eq('usuario_id', usuarioId).order('alias'),
      ])
      setSubs(s.data || [])
      setTarjetas(t.data || [])
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

  const total = subs.reduce((a, s) => a + Number(s.monto_estimado), 0)
  const viejas = subs.filter((s) => diasHasta(s.proximo_vencimiento) < -DIAS_PARA_OCULTAR)
  const visibles = mostrarViejas ? subs : subs.filter((s) => diasHasta(s.proximo_vencimiento) >= -DIAS_PARA_OCULTAR)
  const urgentes = visibles.filter((s) => diasHasta(s.proximo_vencimiento) <= 7)

  async function yaPague(s) {
    // Registra el pago como gasto y pasa el vencimiento al mes siguiente
    let categoriaId = null
    const { data: cat } = await supabase.from('categorias').select('id').eq('usuario_id', usuarioId).ilike('nombre', 'Suscripciones').maybeSingle()
    if (cat) categoriaId = cat.id
    else {
      const { data: nueva } = await supabase.from('categorias').insert({ usuario_id: usuarioId, nombre: 'Suscripciones' }).select('id').single()
      categoriaId = nueva?.id || null
    }
    const { error: e1 } = await supabase.from('gastos').insert({
      usuario_id: usuarioId, monto: s.monto_estimado, fecha: hoyISO(), descripcion: s.nombre,
      categoria_id: categoriaId, tarjeta_id: s.tarjeta_id, medio_pago: s.tarjeta_id ? 'tarjeta' : 'efectivo',
    })
    if (e1) return setAviso({ tipo: 'error', texto: e1.message })
    let proximo = s.proximo_vencimiento
    while (proximo <= hoyISO()) proximo = sumarMeses(proximo, 1)
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

  return (
    <div className="pz-screen">
      <header className="pz-top">
        <h1 className="pz-h1">Suscripciones</h1>
        <button type="button" className="pz-btn pz-btn-primario" onClick={() => setForm({})}>
          <Icono nombre="mas" size={16} /> Agregar
        </button>
      </header>

      <section className="pz-hero" style={{ gap: 6 }}>
        <span className="pz-hero-top">Pagás fijo todos los meses</span>
        <span className="pz-hero-monto" style={{ fontSize: 38 }}>{plata(total, oculto)}</span>
        <span style={{ fontSize: 12.5, color: 'var(--lima)', fontWeight: 700 }}>
          {subs.length} activa{subs.length === 1 ? '' : 's'}{urgentes.length > 0 ? ` · ${urgentes.length} vence${urgentes.length === 1 ? '' : 'n'} esta semana` : ''}
        </span>
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
          const est = estado(dias, s.proximo_vencimiento)
          const msj = `Recordatorio PESOS: ${s.nombre} (${plata(s.monto_estimado)}) ${est.texto.toLowerCase()}.`
          return (
            <div key={s.id}>
              <button type="button" className="pz-fila pz-fila-btn" onClick={() => setAbierta(abierta === s.id ? null : s.id)} aria-expanded={abierta === s.id}>
                <Avatar nombre={s.nombre} />
                <span className="pz-fila-txt">
                  <b>{s.nombre}</b>
                  <span className={`pz-badge ${est.clase}`}>{est.texto}</span>
                </span>
                <span className="pz-fila-der">
                  <span className="pz-monto">{plata(s.monto_estimado, oculto)}</span>
                  <span className="pz-sub" style={{ fontSize: 11.5 }}>{s.tarjetas?.alias || 'Sin tarjeta'}</span>
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

      {form && (
        <FormSuscripcion usuarioId={usuarioId} sub={form} tarjetas={tarjetas} onCerrar={() => setForm(null)}
          onGuardado={(texto) => { setForm(null); refrescar(texto) }} />
      )}
    </div>
  )
}

function FormSuscripcion({ usuarioId, sub, tarjetas, onCerrar, onGuardado }) {
  const editando = Boolean(sub.id)
  const [nombre, setNombre] = useState(sub.nombre || '')
  const [monto, setMonto] = useState(montoATexto(sub.monto_estimado))
  const [tarjetaId, setTarjetaId] = useState(sub.tarjeta_id || '')
  const [vence, setVence] = useState(sub.proximo_vencimiento || hoyISO())
  const [error, setError] = useState(null)
  const [guardando, setGuardando] = useState(false)

  async function guardar() {
    const valor = aNumero(monto)
    if (!nombre.trim()) return setError('Poné el nombre de la suscripción.')
    if (!valor || valor <= 0) return setError('El monto tiene que ser mayor a 0.')
    setGuardando(true)
    const datos = { nombre: nombre.trim(), monto_estimado: valor, tarjeta_id: tarjetaId || null, proximo_vencimiento: vence }
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
            <Avatar nombre={nombre || '?'} size={34} />
            <input id="s-nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Netflix, Spotify, gimnasio..." />
          </div>
        </div>
        <div className="pz-campo">
          <label className="pz-label" htmlFor="s-monto">Monto por mes (en pesos)</label>
          <input id="s-monto" className="pz-input" type="text" inputMode="decimal" value={monto} onChange={(e) => setMonto(escribirMonto(e.target.value))} placeholder="0" />
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
        {error && <p className="pz-error">{error}</p>}
        <button type="button" className="pz-btn pz-btn-primario pz-btn-grande" onClick={guardar} disabled={guardando}>
          {guardando ? 'Guardando...' : editando ? 'Guardar cambios' : 'Agregar suscripción'}
        </button>
      </section>
    </div>
  )
}