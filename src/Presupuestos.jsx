import { useEffect, useState } from 'react'
import { supabase } from './supabaseClient'
import Avatar from './Avatar'
import Icono from './Iconos'
import { plata, CATEGORIAS, escribirMonto, aNumero, montoATexto } from './utils'

// Topes mensuales por categoría, con barra de avance
export default function Presupuestos({ usuarioId, porCategoria, oculto, refreshKey }) {
  const [topes, setTopes] = useState([])
  const [editando, setEditando] = useState(false)
  const [recarga, setRecarga] = useState(0)

  useEffect(() => {
    supabase.from('presupuestos').select('id, categoria, monto').eq('usuario_id', usuarioId)
      .then(({ data }) => setTopes(data || []))
  }, [usuarioId, refreshKey, recarga])

  const filas = topes
    .map((t) => {
      const gastado = porCategoria[t.categoria] || 0
      const pct = t.monto > 0 ? (gastado / t.monto) * 100 : 0
      return { ...t, gastado, pct, estado: pct >= 100 ? 'pasado' : pct >= 80 ? 'cerca' : 'ok' }
    })
    .sort((a, b) => b.pct - a.pct)

  return (
    <section className="pz-card">
      <div className="pz-top">
        <h2 className="pz-h2">Presupuesto del mes</h2>
        <button type="button" className="pz-link" onClick={() => setEditando(true)}>{topes.length ? 'Editar topes' : 'Armar presupuesto'}</button>
      </div>
      {filas.length === 0 ? (
        <p className="pz-vacio">Ponele un tope mensual a cada categoría y PESOS te avisa cuando te estás por pasar.</p>
      ) : (
        filas.map((f) => (
          <div key={f.id} className="pz-pres">
            <div className="pz-pres-top">
              <Avatar nombre={f.categoria} categoria={f.categoria} size={32} />
              <b>{f.categoria}</b>
              <span className={`pz-pres-num ${f.estado}`}>{plata(f.gastado, oculto)} <small>de {plata(f.monto, oculto)}</small></span>
            </div>
            <div className="pz-pres-barra"><div className={f.estado} style={{ width: `${Math.min(100, f.pct)}%` }} /></div>
            <span className={`pz-pres-txt ${f.estado}`}>
              {f.estado === 'pasado'
                ? `Te pasaste ${plata(f.gastado - f.monto, oculto)}`
                : `Te quedan ${plata(f.monto - f.gastado, oculto)}${f.estado === 'cerca' ? ' · ojo, ya usaste el ' + Math.round(f.pct) + '%' : ''}`}
            </span>
          </div>
        ))
      )}
      {editando && (
        <EditarTopes usuarioId={usuarioId} topes={topes} onCerrar={() => setEditando(false)}
          onGuardado={() => { setEditando(false); setRecarga((r) => r + 1) }} />
      )}
    </section>
  )
}

function EditarTopes({ usuarioId, topes, onCerrar, onGuardado }) {
  const inicial = Object.fromEntries(topes.map((t) => [t.categoria, montoATexto(t.monto)]))
  const [valores, setValores] = useState(inicial)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState(null)

  async function guardar() {
    setGuardando(true)
    setError(null)
    try {
      for (const cat of CATEGORIAS) {
        const v = aNumero(valores[cat])
        const existe = topes.find((t) => t.categoria === cat)
        if (v > 0) {
          const { error: e } = existe
            ? await supabase.from('presupuestos').update({ monto: v }).eq('id', existe.id)
            : await supabase.from('presupuestos').insert({ usuario_id: usuarioId, categoria: cat, monto: v })
          if (e) throw e
        } else if (existe) {
          const { error: e } = await supabase.from('presupuestos').delete().eq('id', existe.id)
          if (e) throw e
        }
      }
      onGuardado()
    } catch (e) {
      setError(e.message)
      setGuardando(false)
    }
  }

  return (
    <div className="pz-sheet-fondo" onClick={onCerrar}>
      <section className="pz-sheet" role="dialog" aria-modal="true" aria-label="Presupuesto" onClick={(e) => e.stopPropagation()}>
        <div className="pz-sheet-manija" />
        <div className="pz-top">
          <h2 className="pz-h2">Tope mensual por categoría</h2>
          <button type="button" className="pz-icon-btn" onClick={onCerrar} aria-label="Cerrar"><Icono nombre="cerrar" size={18} /></button>
        </div>
        <p className="pz-sub" style={{ margin: 0 }}>Completá solo las que quieras controlar. Dejá vacío para no ponerle tope.</p>
        {CATEGORIAS.map((cat) => (
          <label key={cat} className="pz-tope">
            <Avatar nombre={cat} categoria={cat} size={34} />
            <span>{cat}</span>
            <input className="pz-input" type="text" inputMode="numeric" placeholder="Sin tope" value={valores[cat] || ''}
              onChange={(e) => setValores({ ...valores, [cat]: escribirMonto(e.target.value) })} aria-label={`Tope para ${cat}`} />
          </label>
        ))}
        {error && <p className="pz-error">{error}</p>}
        <button type="button" className="pz-btn pz-btn-primario pz-btn-grande" onClick={guardar} disabled={guardando}>
          {guardando ? 'Guardando...' : 'Guardar presupuesto'}
        </button>
      </section>
    </div>
  )
}