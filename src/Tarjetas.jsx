import { useEffect, useState } from 'react'
import { supabase } from './supabaseClient'
import Avatar from './Avatar'
import Icono from './Iconos'
import { plata, claveMes, mesDesplazado, MESES } from './utils'

const REDES = ['Visa', 'Mastercard', 'Amex', 'Otra']
const COLORES = ['#0B3626', '#1F2933', '#F26A1B', '#1E40AF', '#6D28D9', '#B91C1C']
const textoSobre = (color) => (color === '#F26A1B' ? '#1A0F08' : '#FFFFFF')

function colorPorDefecto(alias) {
  const a = (alias || '').toLowerCase()
  if (a.includes('naranja')) return '#F26A1B'
  if (a.includes('santander') || a.includes('macro')) return '#B91C1C'
  if (a.includes('bbva') || a.includes('nacion') || a.includes('nación')) return '#1E40AF'
  if (a.includes('brubank') || a.includes('uala') || a.includes('ualá')) return '#6D28D9'
  return '#0B3626'
}

export default function Tarjetas({ usuarioId, refreshKey, oculto, onCambio }) {
  const [tarjetas, setTarjetas] = useState([])
  const [gastos, setGastos] = useState([])
  const [cargando, setCargando] = useState(true)
  const [recarga, setRecarga] = useState(0)
  const [form, setForm] = useState(null)
  const [aviso, setAviso] = useState(null)

  const ahora = new Date()
  const mesKey = claveMes(ahora.getFullYear(), ahora.getMonth())

  useEffect(() => {
    async function cargar() {
      setCargando(true)
      const [t, g] = await Promise.all([
        supabase.from('tarjetas').select('id, alias, red, dia_cierre, dia_vencimiento, color').eq('usuario_id', usuarioId).order('alias'),
        supabase.from('gastos')
          .select('id, monto, fecha, descripcion, tarjeta_id, compra_id, cuota_num, cuotas_total, categorias(nombre)')
          .eq('usuario_id', usuarioId).not('tarjeta_id', 'is', null).gte('fecha', `${mesKey}-01`),
      ])
      setTarjetas(t.data || [])
      setGastos(g.data || [])
      setCargando(false)
    }
    cargar()
  }, [usuarioId, refreshKey, recarga, mesKey])

  const delMes = (tid) => gastos.filter((g) => g.tarjeta_id === tid && g.fecha.slice(0, 7) === mesKey)
    .reduce((a, g) => a + Number(g.monto), 0)

  // Cuotas: agrupar por compra
  const compras = {}
  gastos.filter((g) => g.compra_id).forEach((g) => {
    const c = compras[g.compra_id] || (compras[g.compra_id] = {
      id: g.compra_id, nombre: g.descripcion || g.categorias?.nombre || 'Compra en cuotas', total: g.cuotas_total,
      tarjeta: g.tarjeta_id, porCuota: Number(g.monto), falta: 0, pendientes: 0, primeraPendiente: null,
    })
    if (g.fecha.slice(0, 7) >= mesKey) {
      c.falta += Number(g.monto)
      c.pendientes += 1
      if (!c.primeraPendiente || g.cuota_num < c.primeraPendiente) c.primeraPendiente = g.cuota_num
    }
  })
  const listaCompras = Object.values(compras).filter((c) => c.pendientes > 0).sort((a, b) => b.falta - a.falta)
  const totalCuotas = listaCompras.reduce((a, c) => a + c.falta, 0)

  // Calendario: lo que suman las cuotas en los próximos 6 meses
  const meses = Array.from({ length: 6 }, (_, i) => {
    const m = mesDesplazado(ahora.getFullYear(), ahora.getMonth(), i)
    const k = claveMes(m.anio, m.mes)
    const monto = gastos.filter((g) => g.compra_id && g.fecha.slice(0, 7) === k).reduce((a, g) => a + Number(g.monto), 0)
    return { k, label: MESES[m.mes], monto }
  })
  const maxMes = Math.max(1, ...meses.map((m) => m.monto))

  async function borrar(t) {
    if (!window.confirm(`¿Borrar la tarjeta "${t.alias}"? Los gastos se conservan, pero quedan sin tarjeta asignada.`)) return
    await supabase.from('gastos').update({ tarjeta_id: null }).eq('tarjeta_id', t.id)
    await supabase.from('suscripciones').update({ tarjeta_id: null }).eq('tarjeta_id', t.id)
    const { data, error } = await supabase.from('tarjetas').delete().eq('id', t.id).select('id')
    if (error || !data || data.length === 0) return setAviso({ tipo: 'error', texto: error?.message || 'No se pudo borrar la tarjeta.' })
    setAviso({ tipo: 'ok', texto: `${t.alias} borrada.` })
    setForm(null)
    setRecarga((r) => r + 1)
    if (onCambio) onCambio()
  }

  return (
    <div className="pz-screen">
      <header className="pz-top">
        <h1 className="pz-h1">Tarjetas</h1>
        <button type="button" className="pz-btn pz-btn-primario" onClick={() => setForm({})}>
          <Icono nombre="mas" size={16} /> Agregar
        </button>
      </header>

      {aviso && <p className={aviso.tipo === 'error' ? 'pz-error' : 'pz-ok'}>{aviso.texto}</p>}

      {cargando ? (
        <p className="pz-vacio">Cargando...</p>
      ) : tarjetas.length === 0 ? (
        <section className="pz-card"><p className="pz-vacio">Todavía no agregaste tarjetas. Sumá tu Visa, Mastercard o Naranja X para ver cuánto llevás gastado y tus cuotas.</p></section>
      ) : (
        <div className="pz-tarjetas">
          {tarjetas.map((t) => {
            const color = t.color || colorPorDefecto(t.alias)
            return (
              <button key={t.id} type="button" className="pz-tarjeta" style={{ background: color, color: textoSobre(color) }}
                onClick={() => setForm(t)} aria-label={`Editar ${t.alias}`}>
                <span className="pz-tarjeta-top">
                  <b>{t.alias}</b>
                  <small>{(t.red || '').toUpperCase()}</small>
                </span>
                <span className="pz-tarjeta-mid">
                  <small>Gastado este mes</small>
                  <strong>{plata(delMes(t.id), oculto)}</strong>
                </span>
                <small className="pz-tarjeta-pie">
                  {t.dia_cierre ? `Cierra el ${t.dia_cierre}` : 'Tocá para cargar el cierre'}
                  {t.dia_vencimiento ? ` · Vence el ${t.dia_vencimiento}` : ''}
                </small>
              </button>
            )
          })}
        </div>
      )}

      <section className="pz-card">
        <div className="pz-top">
          <h2 className="pz-h2">Cuotas pendientes</h2>
          <span className="pz-sub">Total: <b style={{ color: 'var(--tinta)' }}>{plata(totalCuotas, oculto)}</b></span>
        </div>
        {listaCompras.length === 0 ? (
          <p className="pz-vacio">No tenés compras en cuotas. Cuando cargues un gasto con tarjeta, elegí 3, 6 o 12 cuotas.</p>
        ) : (
          <>
            <div className="pz-barras" aria-label="Cuotas por mes">
              {meses.map((m, i) => (
                <div key={m.k} className="pz-barra-col">
                  <span>{m.monto ? `${Math.round(m.monto / 1000)}k` : ''}</span>
                  <div style={{ height: `${Math.max(6, (m.monto / maxMes) * 90)}px`, background: i === 0 ? 'var(--verde)' : '#B9D4C6' }} />
                  <small>{m.label}</small>
                </div>
              ))}
            </div>
            {listaCompras.map((c) => {
              const pagadas = c.total - c.pendientes
              const t = tarjetas.find((x) => x.id === c.tarjeta)
              return (
                <div key={c.id} className="pz-cuota">
                  <div className="pz-fila" style={{ borderBottom: 0, padding: 0 }}>
                    <Avatar nombre={c.nombre} />
                    <span className="pz-fila-txt">
                      <b>{c.nombre}</b>
                      <span>Cuota {c.primeraPendiente} de {c.total} · {plata(c.porCuota, oculto)} por mes{t ? ` · ${t.alias}` : ''}</span>
                    </span>
                    <span className="pz-fila-der">
                      <span className="pz-monto">{plata(c.falta, oculto)}</span>
                      <span className="pz-sub" style={{ fontSize: 11.5 }}>falta</span>
                    </span>
                  </div>
                  <div className="pz-progreso"><div style={{ width: `${(pagadas / c.total) * 100}%` }} /></div>
                </div>
              )
            })}
          </>
        )}
      </section>

      {form && (
        <FormTarjeta usuarioId={usuarioId} tarjeta={form} onCerrar={() => setForm(null)} onBorrar={borrar}
          onGuardado={(texto) => { setForm(null); setAviso({ tipo: 'ok', texto }); setRecarga((r) => r + 1); if (onCambio) onCambio() }} />
      )}
    </div>
  )
}

function FormTarjeta({ usuarioId, tarjeta, onCerrar, onGuardado, onBorrar }) {
  const editando = Boolean(tarjeta.id)
  const [alias, setAlias] = useState(tarjeta.alias || '')
  const [red, setRed] = useState(tarjeta.red || 'Visa')
  const [cierre, setCierre] = useState(tarjeta.dia_cierre || '')
  const [vence, setVence] = useState(tarjeta.dia_vencimiento || '')
  const [color, setColor] = useState(tarjeta.color || colorPorDefecto(tarjeta.alias))
  const [error, setError] = useState(null)
  const [guardando, setGuardando] = useState(false)

  async function guardar() {
    if (!alias.trim()) return setError('Poné un nombre, por ejemplo "Visa Galicia".')
    const c = cierre ? parseInt(cierre, 10) : null
    const v = vence ? parseInt(vence, 10) : null
    if ((c && (c < 1 || c > 31)) || (v && (v < 1 || v > 31))) return setError('Los días tienen que estar entre 1 y 31.')
    setGuardando(true)
    const datos = { alias: alias.trim(), red, dia_cierre: c, dia_vencimiento: v, color }
    const consulta = editando
      ? supabase.from('tarjetas').update(datos).eq('id', tarjeta.id).select('id')
      : supabase.from('tarjetas').insert({ ...datos, usuario_id: usuarioId, tipo: 'credito' }).select('id')
    const { data, error: e } = await consulta
    if (e || !data || data.length === 0) {
      setError(e?.message || 'No se pudo guardar.')
      setGuardando(false)
      return
    }
    onGuardado(editando ? 'Tarjeta actualizada.' : `${alias.trim()} agregada.`)
  }

  return (
    <div className="pz-sheet-fondo" onClick={onCerrar}>
      <section className="pz-sheet" role="dialog" aria-modal="true" aria-label="Tarjeta" onClick={(e) => e.stopPropagation()}>
        <div className="pz-sheet-manija" />
        <div className="pz-top">
          <h2 className="pz-h2">{editando ? 'Editar tarjeta' : 'Nueva tarjeta'}</h2>
          <button type="button" className="pz-icon-btn" onClick={onCerrar} aria-label="Cerrar"><Icono nombre="cerrar" size={18} /></button>
        </div>
        <div className="pz-campo">
          <label className="pz-label" htmlFor="t-alias">Nombre</label>
          <div className="pz-input-logo">
            <Avatar nombre={alias || '?'} size={34} />
            <input id="t-alias" value={alias} onChange={(e) => setAlias(e.target.value)} placeholder="Visa Galicia, Naranja X..." />
          </div>
        </div>
        <div className="pz-campo">
          <span className="pz-label">Red</span>
          <div className="pz-chips">
            {REDES.map((r) => (
              <button key={r} type="button" className={`pz-chip ${red === r ? 'on' : ''}`} onClick={() => setRed(r)}>{r}</button>
            ))}
          </div>
        </div>
        <div className="pz-dos">
          <div className="pz-campo">
            <label className="pz-label" htmlFor="t-cierre">Día de cierre</label>
            <input id="t-cierre" className="pz-input" type="number" min="1" max="31" value={cierre} onChange={(e) => setCierre(e.target.value)} placeholder="28" />
          </div>
          <div className="pz-campo">
            <label className="pz-label" htmlFor="t-vence">Día de vencimiento</label>
            <input id="t-vence" className="pz-input" type="number" min="1" max="31" value={vence} onChange={(e) => setVence(e.target.value)} placeholder="7" />
          </div>
        </div>
        <div className="pz-campo">
          <span className="pz-label">Color</span>
          <div className="pz-colores">
            {COLORES.map((c) => (
              <button key={c} type="button" className={`pz-color ${color === c ? 'on' : ''}`} style={{ background: c }}
                onClick={() => setColor(c)} aria-label={`Color ${c}`} aria-pressed={color === c} />
            ))}
          </div>
        </div>
        {error && <p className="pz-error">{error}</p>}
        <button type="button" className="pz-btn pz-btn-primario pz-btn-grande" onClick={guardar} disabled={guardando}>
          {guardando ? 'Guardando...' : editando ? 'Guardar cambios' : 'Agregar tarjeta'}
        </button>
        {editando && (
          <button type="button" className="pz-btn pz-btn-peligro" onClick={() => onBorrar(tarjeta)}>Borrar tarjeta</button>
        )}
      </section>
    </div>
  )
}