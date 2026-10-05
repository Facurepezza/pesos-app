import { useEffect, useState } from 'react'
import { supabase } from './supabaseClient'
import Avatar from './Avatar'
import Icono from './Iconos'
import { useToast } from './Toast'
import { plata } from './utils'

// Lista de gastos e ingresos que se cargan solos todos los meses
export default function Fijos({ usuarioId, oculto, onCerrar, onCambio }) {
  const avisar = useToast()
  const [fijos, setFijos] = useState([])
  const [cargando, setCargando] = useState(true)
  const [recarga, setRecarga] = useState(0)

  useEffect(() => {
    supabase.from('recurrentes')
      .select('id, tipo, descripcion, monto, dia, activo, concepto, categorias(nombre), tarjetas(alias), medio_pago')
      .eq('usuario_id', usuarioId).order('dia')
      .then(({ data }) => { setFijos(data || []); setCargando(false) })
  }, [usuarioId, recarga])

  async function pausar(f) {
    const { error } = await supabase.from('recurrentes').update({ activo: !f.activo }).eq('id', f.id)
    if (error) return avisar(error.message, { tipo: 'error' })
    avisar(f.activo ? `${f.descripcion} quedó en pausa` : `${f.descripcion} se vuelve a cargar solo ✓`)
    setRecarga((r) => r + 1)
    if (onCambio) onCambio()
  }

  async function borrar(f) {
    if (!window.confirm(`¿Dejar de cargar "${f.descripcion}" todos los meses? Lo que ya se cargó no se borra.`)) return
    await supabase.from('gastos').update({ recurrente_id: null }).eq('recurrente_id', f.id)
    await supabase.from('ingresos').update({ recurrente_id: null }).eq('recurrente_id', f.id)
    const { error } = await supabase.from('recurrentes').delete().eq('id', f.id)
    if (error) return avisar(error.message, { tipo: 'error' })
    avisar(`${f.descripcion} ya no se carga solo`)
    setRecarga((r) => r + 1)
    if (onCambio) onCambio()
  }

  const ingresos = fijos.filter((f) => f.tipo === 'ingreso' && f.activo).reduce((a, f) => a + Number(f.monto), 0)
  const gastos = fijos.filter((f) => f.tipo === 'gasto' && f.activo).reduce((a, f) => a + Number(f.monto), 0)

  return (
    <div className="pz-sheet-fondo" onClick={onCerrar}>
      <section className="pz-sheet" role="dialog" aria-modal="true" aria-label="Fijos automáticos" onClick={(e) => e.stopPropagation()}>
        <div className="pz-sheet-manija" />
        <div className="pz-top">
          <h2 className="pz-h2">Se cargan solos cada mes</h2>
          <button type="button" className="pz-icon-btn" onClick={onCerrar} aria-label="Cerrar"><Icono nombre="cerrar" size={18} /></button>
        </div>
        <p className="pz-sub" style={{ margin: 0 }}>
          Para agregar uno, cargá el gasto o ingreso con el + y activá "Se repite todos los meses".
        </p>

        {fijos.length > 0 && (
          <div className="pz-totales">
            <div><span>Entra fijo</span><b className="pos">+ {plata(ingresos, oculto)}</b></div>
            <div><span>Sale fijo</span><b>- {plata(gastos, oculto)}</b></div>
          </div>
        )}

        <div className="pz-card pz-card-lista" style={{ background: '#F7F9F5' }}>
          {cargando && <p className="pz-vacio">Cargando...</p>}
          {!cargando && fijos.length === 0 && <p className="pz-vacio">Todavía no tenés nada fijo. Probá con tu sueldo o el alquiler.</p>}
          {fijos.map((f) => (
            <div key={f.id} className={`pz-fijo ${f.activo ? '' : 'pausado'}`}>
              <div className="pz-fila" style={{ borderBottom: 0 }}>
                <Avatar nombre={f.descripcion} categoria={f.tipo === 'ingreso' ? f.concepto : f.categorias?.nombre} />
                <span className="pz-fila-txt">
                  <b>{f.descripcion}</b>
                  <span>Todos los {f.dia} · {f.tipo === 'ingreso' ? 'Ingreso' : f.tarjetas?.alias || f.categorias?.nombre || 'Gasto'}{f.activo ? '' : ' · en pausa'}</span>
                </span>
                <span className={`pz-monto ${f.tipo === 'ingreso' ? 'pos' : ''}`}>
                  {f.tipo === 'ingreso' ? '+ ' : '- '}{plata(f.monto, oculto)}
                </span>
              </div>
              <div className="pz-acciones" style={{ borderBottom: 0, paddingTop: 0 }}>
                <button type="button" className="pz-btn pz-btn-claro" onClick={() => pausar(f)}>{f.activo ? 'Pausar' : 'Reactivar'}</button>
                <button type="button" className="pz-btn pz-btn-peligro" onClick={() => borrar(f)}>Dejar de repetir</button>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}