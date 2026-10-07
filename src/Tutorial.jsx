import { useEffect, useState } from 'react'
import Icono from './Iconos'

// Recorrido corto por la app (se abre solo la primera vez y desde "Mi perfil")
const PASOS = [
  { icono: 'mas', titulo: 'Cargá con el +', texto: 'El botón verde del medio sirve para anotar un gasto o un ingreso. Elegí la moneda, la categoría y cómo pagaste. Si es con tarjeta, también las cuotas.' },
  { icono: 'inicio', titulo: 'Tu mes de un vistazo', texto: 'En Inicio ves cuánto entró, cuánto salió y cuánto te queda, el dólar del día y lo próximo que vence. Tocá "Ver métricas" para el detalle.' },
  { icono: 'repetir', titulo: 'Suscripciones sin sorpresas', texto: 'Anotá lo que pagás todos los meses o una vez por año, en pesos o en dólares. Te avisamos antes de que te cobren, y si se debita solo lo anotamos por vos.' },
  { icono: 'tarjeta', titulo: 'Tarjetas y cuotas', texto: 'Mirá cuánto te va a venir en el próximo resumen, cuándo cierra y cuándo vence, y cuánto te falta pagar de cada compra en cuotas. ¡Listo, a usarlo!' },
]

const CLAVE = 'pesos_tutorial_v2'

export default function Tutorial({ abrir = 0 }) {
  const [abierto, setAbierto] = useState(() => {
    try { return !localStorage.getItem(CLAVE) } catch { return false }
  })
  const [paso, setPaso] = useState(0)
  const [ultimoPedido, setUltimoPedido] = useState(abrir)

  // Cuando se pide desde "Mi perfil", se abre desde el principio
  if (abrir !== ultimoPedido) {
    setUltimoPedido(abrir)
    if (abrir) { setPaso(0); setAbierto(true) }
  }

  useEffect(() => {
    if (!abierto) return
    const alApretar = (e) => { if (e.key === 'Escape') cerrar() }
    window.addEventListener('keydown', alApretar)
    return () => window.removeEventListener('keydown', alApretar)
  }, [abierto])

  function cerrar() {
    try { localStorage.setItem(CLAVE, 'si') } catch { /* nada */ }
    setAbierto(false)
    setPaso(0)
  }

  if (!abierto) return null
  const p = PASOS[paso]
  const ultimo = paso === PASOS.length - 1

  return (
    <div className="pz-sheet-fondo pz-tuto-fondo" onClick={cerrar}>
      <section className="pz-sheet pz-tuto" role="dialog" aria-modal="true" aria-labelledby="pz-tuto-titulo" onClick={(e) => e.stopPropagation()}>
        <div className="pz-sheet-manija" />
        <div className="pz-tuto-top">
          <div className="pz-pasos-puntos" aria-label={`Paso ${paso + 1} de ${PASOS.length}`}>
            {PASOS.map((_, i) => <span key={i} className={i <= paso ? 'on' : ''} />)}
          </div>
          <button type="button" className="pz-link" onClick={cerrar}>Saltar</button>
        </div>
        <span className="pz-pasos-ico"><Icono nombre={p.icono} size={26} /></span>
        <h2 id="pz-tuto-titulo" className="pz-tuto-titulo">{p.titulo}</h2>
        <p className="pz-tuto-txt">{p.texto}</p>
        <div className="pz-tuto-botones">
          {paso > 0 && (
            <button type="button" className="pz-btn pz-btn-claro pz-btn-grande" onClick={() => setPaso(paso - 1)} aria-label="Anterior">
              <Icono nombre="izq" size={18} />
            </button>
          )}
          <button type="button" className="pz-btn pz-btn-primario pz-btn-grande" onClick={() => (ultimo ? cerrar() : setPaso(paso + 1))}>
            {ultimo ? 'Empezar' : 'Siguiente'}
          </button>
        </div>
      </section>
    </div>
  )
}