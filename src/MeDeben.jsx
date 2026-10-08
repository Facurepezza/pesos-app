import { useEffect, useState } from 'react'
import { supabase } from './supabaseClient'
import Avatar from './Avatar'
import Icono from './Iconos'
import { useToast } from './Toast'
import { plata, hoyISO, escribirMonto, aNumero } from './utils'

// Lo que te deben de gastos que dividiste (o que anotaste a mano)
export default function MeDeben({ usuarioId, oculto, onCerrar, onCambio }) {
  const avisar = useToast()
  const [deudas, setDeudas] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState(null)
  const [recarga, setRecarga] = useState(0)
  const [nueva, setNueva] = useState(false)

  useEffect(() => {
    supabase.from('deudas').select('id, persona, monto, descripcion, fecha')
      .eq('usuario_id', usuarioId).eq('pagada', false).order('fecha', { ascending: false })
      .then(({ data, error: e }) => {
        if (e) setError(e.message)
        else setDeudas(data || [])
        setCargando(false)
      })
  }, [usuarioId, recarga])

  const total = deudas.reduce((a, d) => a + Number(d.monto), 0)

  async function pago(d) {
    const { error: e } = await supabase.from('deudas').update({ pagada: true, pagada_el: hoyISO() }).eq('id', d.id)
    if (e) return avisar(e.message, { tipo: 'error' })
    setRecarga((r) => r + 1)
    if (onCambio) onCambio()
    avisar(`${d.persona} ya te devolvió ${plata(d.monto)} ✓`, {
      accion: {
        label: 'Deshacer',
        fn: async () => {
          await supabase.from('deudas').update({ pagada: false, pagada_el: null }).eq('id', d.id)
          setRecarga((r) => r + 1)
          if (onCambio) onCambio()
        },
      },
    })
  }

  return (
    <div className="pz-sheet-fondo" onClick={onCerrar}>
      <section className="pz-sheet" role="dialog" aria-modal="true" aria-label="Me deben" onClick={(e) => e.stopPropagation()}>
        <div className="pz-sheet-manija" />
        <div className="pz-top">
          <h2 className="pz-h2">Me deben</h2>
          <button type="button" className="pz-icon-btn" onClick={onCerrar} aria-label="Cerrar"><Icono nombre="cerrar" size={18} /></button>
        </div>

        <div className="pz-mini-hero">
          <span>Te tienen que devolver</span>
          <b>{plata(total, oculto)}</b>
          <small>{deudas.length === 0 ? 'Nadie te debe nada.' : `${deudas.length} pendiente${deudas.length === 1 ? '' : 's'}`}</small>
        </div>

        {error && <p className="pz-error">No pudimos cargar la lista: {error}</p>}

        <div className="pz-card pz-card-lista pz-card-gris">
          {cargando && <p className="pz-vacio">Cargando...</p>}
          {!cargando && !error && deudas.length === 0 && (
            <p className="pz-vacio">Cuando cargues un gasto y actives "Lo dividí con otros", acá te queda quién te debe.</p>
          )}
          {deudas.map((d) => {
            const msj = `Hola ${d.persona}! Te paso lo de ${d.descripcion || 'lo que pagué'}: son ${plata(d.monto)}. ¡Gracias!`
            return (
              <div key={d.id} className="pz-fijo">
                <div className="pz-fila" style={{ borderBottom: 0 }}>
                  <Avatar nombre={d.persona} />
                  <span className="pz-fila-txt">
                    <b>{d.persona}</b>
                    <span>{d.descripcion || 'Gasto compartido'} · {Number(d.fecha.slice(8, 10))}/{Number(d.fecha.slice(5, 7))}</span>
                  </span>
                  <span className="pz-monto pos">{plata(d.monto, oculto)}</span>
                </div>
                <div className="pz-acciones" style={{ borderBottom: 0, paddingTop: 0 }}>
                  <a className="pz-btn pz-btn-claro" href={`https://wa.me/?text=${encodeURIComponent(msj)}`} target="_blank" rel="noopener noreferrer">
                    <Icono nombre="mensaje" size={16} /> Recordarle
                  </a>
                  <button type="button" className="pz-btn pz-btn-primario" onClick={() => pago(d)}>Ya me pagó</button>
                </div>
              </div>
            )
          })}
        </div>

        {nueva ? (
          <NuevaDeuda usuarioId={usuarioId} onCancelar={() => setNueva(false)}
            onGuardada={() => { setNueva(false); setRecarga((r) => r + 1); if (onCambio) onCambio(); avisar('Anotado ✓') }} />
        ) : (
          <button type="button" className="pz-btn pz-btn-claro" onClick={() => setNueva(true)}>
            <Icono nombre="mas" size={16} /> Anotar a mano
          </button>
        )}
      </section>
    </div>
  )
}

function NuevaDeuda({ usuarioId, onCancelar, onGuardada }) {
  const [persona, setPersona] = useState('')
  const [monto, setMonto] = useState('')
  const [que, setQue] = useState('')
  const [error, setError] = useState(null)
  const [guardando, setGuardando] = useState(false)

  async function guardar() {
    const valor = aNumero(monto)
    if (!persona.trim()) return setError('¿Quién te debe?')
    if (!valor) return setError('Poné cuánto te debe.')
    setGuardando(true)
    const { error: e } = await supabase.from('deudas').insert({
      usuario_id: usuarioId, persona: persona.trim(), monto: valor, descripcion: que.trim() || null, fecha: hoyISO(), pagada: false,
    })
    if (e) { setError(e.message); setGuardando(false); return }
    onGuardada()
  }

  return (
    <div className="pz-card pz-card-gris">
      <div className="pz-dos">
        <input className="pz-input" value={persona} onChange={(e) => setPersona(e.target.value)} placeholder="¿Quién?" aria-label="Quién te debe" />
        <input className="pz-input" inputMode="decimal" value={monto} onChange={(e) => setMonto(escribirMonto(e.target.value))} placeholder="$ 0" aria-label="Cuánto" />
      </div>
      <input className="pz-input" value={que} onChange={(e) => setQue(e.target.value)} placeholder="¿De qué? Ej: entradas del recital" aria-label="De qué" />
      {error && <p className="pz-error">{error}</p>}
      <div className="pz-dos">
        <button type="button" className="pz-btn pz-btn-claro" onClick={onCancelar}>Cancelar</button>
        <button type="button" className="pz-btn pz-btn-primario" onClick={guardar} disabled={guardando}>{guardando ? 'Guardando...' : 'Anotar'}</button>
      </div>
    </div>
  )
}