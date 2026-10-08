import { useEffect, useState } from 'react'
import { supabase } from './supabaseClient'
import Avatar from './Avatar'
import Icono from './Iconos'
import { useToast } from './Toast'
import { useConfirmar } from './Confirmar'
import { plata, hoyISO, escribirMonto, aNumero, montoATexto } from './utils'

// Meses que faltan hasta una fecha (al menos 1)
function mesesHasta(fechaISO) {
  const h = new Date()
  const [a, m, d] = fechaISO.split('-').map(Number)
  let meses = (a - h.getFullYear()) * 12 + (m - 1 - h.getMonth())
  if (d < h.getDate()) meses -= 1
  return Math.max(1, meses)
}

// Metas de ahorro: "Viaje a Bariloche: $600.000"
export default function Metas({ usuarioId, oculto, onCerrar, onCambio }) {
  const avisar = useToast()
  const confirmar = useConfirmar()
  const [metas, setMetas] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState(null)
  const [recarga, setRecarga] = useState(0)
  const [form, setForm] = useState(null) // null | {} nueva | meta a editar
  const [aportando, setAportando] = useState(null)

  useEffect(() => {
    supabase.from('metas').select('id, nombre, objetivo, ahorrado, fecha_limite')
      .eq('usuario_id', usuarioId).order('created_at')
      .then(({ data, error: e }) => {
        if (e) setError(e.message)
        else setMetas(data || [])
        setCargando(false)
      })
  }, [usuarioId, recarga])

  const refrescar = () => { setRecarga((r) => r + 1); if (onCambio) onCambio() }

  async function borrar(m) {
    const ok = await confirmar({ titulo: `¿Borrar la meta ${m.nombre}?`, texto: 'Se borra la meta y lo que llevabas anotado.', boton: 'Borrar meta', peligro: true })
    if (!ok) return
    const { error: e } = await supabase.from('metas').delete().eq('id', m.id)
    if (e) return avisar(e.message, { tipo: 'error' })
    setForm(null)
    refrescar()
    avisar(`${m.nombre} borrada`)
  }

  return (
    <div className="pz-sheet-fondo" onClick={onCerrar}>
      <section className="pz-sheet" role="dialog" aria-modal="true" aria-label="Metas de ahorro" onClick={(e) => e.stopPropagation()}>
        <div className="pz-sheet-manija" />
        <div className="pz-top">
          <h2 className="pz-h2">Metas de ahorro</h2>
          <button type="button" className="pz-icon-btn" onClick={onCerrar} aria-label="Cerrar"><Icono nombre="cerrar" size={18} /></button>
        </div>

        {error && <p className="pz-error">No pudimos cargar tus metas: {error}</p>}
        {cargando && <p className="pz-vacio">Cargando...</p>}
        {!cargando && !error && metas.length === 0 && !form && (
          <p className="pz-vacio">Ponele nombre y monto a lo que querés lograr: un viaje, un celu nuevo, un fondo para emergencias...</p>
        )}

        {!form && metas.map((m) => {
          const pct = Math.min(100, (Number(m.ahorrado) / Number(m.objetivo)) * 100)
          const falta = Math.max(0, Number(m.objetivo) - Number(m.ahorrado))
          const lista = falta === 0
          const porMes = m.fecha_limite && !lista ? falta / mesesHasta(m.fecha_limite) : 0
          return (
            <div key={m.id} className="pz-card pz-card-gris pz-meta">
              <div className="pz-pres-top">
                <Avatar nombre={m.nombre} size={36} />
                <b>{m.nombre}</b>
                <button type="button" className="pz-icon-btn pz-icon-chico" onClick={() => setForm(m)} aria-label={`Editar ${m.nombre}`}>
                  <Icono nombre="editar" size={16} />
                </button>
              </div>
              <div className="pz-meta-num">
                <strong>{plata(m.ahorrado, oculto)}</strong>
                <span>de {plata(m.objetivo, oculto)}</span>
                <em>{Math.round(pct)}%</em>
              </div>
              <div className="pz-pres-barra"><div style={{ width: `${pct}%`, background: lista ? 'var(--positivo)' : undefined }} /></div>
              <span className="pz-pres-txt">
                {lista
                  ? '¡Meta cumplida! 🎉'
                  : `Te faltan ${plata(falta, oculto)}${porMes ? ` · ahorrando ${plata(porMes, oculto)} por mes llegás al ${m.fecha_limite.split('-').reverse().join('/')}` : ''}`}
              </span>
              {aportando === m.id ? (
                <Aporte meta={m} onListo={(texto) => { setAportando(null); refrescar(); if (texto) avisar(texto) }} onCancelar={() => setAportando(null)} />
              ) : (
                <button type="button" className="pz-btn pz-btn-primario" onClick={() => setAportando(m.id)}>
                  <Icono nombre="mas" size={16} /> Sumar o sacar plata
                </button>
              )}
            </div>
          )
        })}

        {form ? (
          <FormMeta usuarioId={usuarioId} meta={form} onCancelar={() => setForm(null)} onBorrar={borrar}
            onGuardada={(texto) => { setForm(null); refrescar(); avisar(texto) }} />
        ) : (
          <button type="button" className="pz-btn pz-btn-claro" onClick={() => setForm({})}>
            <Icono nombre="mas" size={16} /> Nueva meta
          </button>
        )}
      </section>
    </div>
  )
}

function Aporte({ meta, onListo, onCancelar }) {
  const [monto, setMonto] = useState('')
  const [error, setError] = useState(null)

  async function mover(signo) {
    const valor = aNumero(monto)
    if (!valor) return setError('Poné un monto.')
    const nuevo = Math.max(0, Number(meta.ahorrado) + signo * valor)
    const { error: e } = await supabase.from('metas').update({ ahorrado: nuevo }).eq('id', meta.id)
    if (e) return setError(e.message)
    onListo(signo > 0 ? `Sumaste ${plata(valor)} a ${meta.nombre} ✓` : `Sacaste ${plata(valor)} de ${meta.nombre}`)
  }

  return (
    <div className="pz-campo">
      <input className="pz-input pz-input-grande" inputMode="decimal" value={monto} autoFocus
        onChange={(e) => setMonto(escribirMonto(e.target.value))} placeholder="$ 0" aria-label="Monto" />
      {error && <p className="pz-error">{error}</p>}
      <div className="pz-meta-botones">
        <button type="button" className="pz-btn pz-btn-claro" onClick={onCancelar}>Cancelar</button>
        <button type="button" className="pz-btn pz-btn-peligro" onClick={() => mover(-1)}>Sacar</button>
        <button type="button" className="pz-btn pz-btn-primario" onClick={() => mover(1)}>Sumar</button>
      </div>
    </div>
  )
}

function FormMeta({ usuarioId, meta, onCancelar, onGuardada, onBorrar }) {
  const editando = Boolean(meta.id)
  const [nombre, setNombre] = useState(meta.nombre || '')
  const [objetivo, setObjetivo] = useState(montoATexto(meta.objetivo))
  const [ahorrado, setAhorrado] = useState(montoATexto(meta.ahorrado))
  const [limite, setLimite] = useState(meta.fecha_limite || '')
  const [error, setError] = useState(null)
  const [guardando, setGuardando] = useState(false)

  async function guardar() {
    const obj = aNumero(objetivo)
    if (!nombre.trim()) return setError('Ponele un nombre a la meta.')
    if (!obj) return setError('¿Cuánto querés juntar?')
    if (limite && limite <= hoyISO()) return setError('La fecha tiene que ser más adelante.')
    setGuardando(true)
    const datos = { nombre: nombre.trim(), objetivo: obj, ahorrado: aNumero(ahorrado), fecha_limite: limite || null }
    const { error: e } = editando
      ? await supabase.from('metas').update(datos).eq('id', meta.id)
      : await supabase.from('metas').insert({ ...datos, usuario_id: usuarioId })
    if (e) { setError(e.message); setGuardando(false); return }
    onGuardada(editando ? 'Meta actualizada ✓' : `¡A juntar para ${nombre.trim()}! ✓`)
  }

  return (
    <div className="pz-card pz-card-gris">
      <h3 className="pz-h2">{editando ? 'Editar meta' : 'Nueva meta'}</h3>
      <div className="pz-campo">
        <label className="pz-label" htmlFor="m-nombre">¿Para qué ahorrás?</label>
        <input id="m-nombre" className="pz-input" value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Viaje a Bariloche, celu nuevo..." />
      </div>
      <div className="pz-dos">
        <div className="pz-campo">
          <label className="pz-label" htmlFor="m-obj">Meta</label>
          <input id="m-obj" className="pz-input" inputMode="decimal" value={objetivo} onChange={(e) => setObjetivo(escribirMonto(e.target.value))} placeholder="$ 600.000" />
        </div>
        <div className="pz-campo">
          <label className="pz-label" htmlFor="m-aho">Ya tengo</label>
          <input id="m-aho" className="pz-input" inputMode="decimal" value={ahorrado} onChange={(e) => setAhorrado(escribirMonto(e.target.value))} placeholder="$ 0" />
        </div>
      </div>
      <div className="pz-campo">
        <label className="pz-label" htmlFor="m-lim">¿Para cuándo? (opcional)</label>
        <input id="m-lim" className="pz-input" type="date" value={limite} onChange={(e) => setLimite(e.target.value)} />
      </div>
      {error && <p className="pz-error">{error}</p>}
      <div className="pz-dos">
        <button type="button" className="pz-btn pz-btn-claro" onClick={onCancelar}>Cancelar</button>
        <button type="button" className="pz-btn pz-btn-primario" onClick={guardar} disabled={guardando}>{guardando ? 'Guardando...' : 'Guardar'}</button>
      </div>
      {editando && <button type="button" className="pz-btn pz-btn-peligro" onClick={() => onBorrar(meta)}>Borrar meta</button>}
    </div>
  )
}