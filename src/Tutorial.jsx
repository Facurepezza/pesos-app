import { useEffect, useState } from 'react'
import './Tutorial.css'

const PASOS = [
  { titulo: 'Bienvenido a PESOS', texto: 'Te mostramos en 5 pasos cómo usarlo. Podés volver a ver esta guía cuando quieras con el botón de ayuda (?).' },
  { titulo: 'Cargá con el +', texto: 'Tocá el botón verde del medio para anotar un gasto o un ingreso. Elegí la moneda (pesos, dólares o euros), la categoría y cómo pagaste. Si es con tarjeta, podés elegir cuotas.' },
  { titulo: 'Tu inicio', texto: 'En "Inicio" ves tu balance del mes: lo que entró, lo que salió y cuánto te queda. También la cotización del dólar del día y tu próximo vencimiento.' },
  { titulo: 'Revisá y corregí', texto: 'En "Movimientos" está todo lo que cargaste. Tocá cualquier movimiento para editarlo o eliminarlo.' },
  { titulo: 'Suscripciones', texto: 'Anotá lo que pagás todos los meses. PESOS te avisa antes del vencimiento, y cuando pagás tocás "Ya la pagué" y pasa solo al mes siguiente.' },
  { titulo: 'Tarjetas y cuotas', texto: 'En "Tarjetas" ves cuánto llevás gastado con cada una y cuánto te falta pagar de cuotas en los próximos meses. Listo, ya podés empezar.' },
]

const CLAVE = 'pesos_tutorial_v2'

export default function Tutorial() {
  const [abierto, setAbierto] = useState(false)
  const [paso, setPaso] = useState(0)

  useEffect(() => {
    try {
      if (!localStorage.getItem(CLAVE)) setAbierto(true)
    } catch { /* si el navegador bloquea el guardado, simplemente no se abre solo */ }
  }, [])

  function cerrar() {
    try { localStorage.setItem(CLAVE, 'si') } catch { /* nada */ }
    setAbierto(false)
    setPaso(0)
  }

  const ultimo = paso === PASOS.length - 1

  return (
    <>
      <button className="tuto-ayuda" onClick={() => setAbierto(true)} aria-label="Ver cómo usar PESOS">?</button>

      {abierto && (
        <div className="tuto-fondo" onClick={cerrar}>
          <div className="tuto-caja" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
            <p className="tuto-contador">Paso {paso + 1} de {PASOS.length}</p>
            <h2>{PASOS[paso].titulo}</h2>
            <p className="tuto-texto">{PASOS[paso].texto}</p>

            <div className="tuto-puntos">
              {PASOS.map((_, i) => <span key={i} className={i === paso ? 'activo' : ''} />)}
            </div>

            <div className="tuto-botones">
              <button className="tuto-sec" onClick={cerrar}>Saltar</button>
              <div>
                {paso > 0 && <button className="tuto-sec" onClick={() => setPaso(paso - 1)}>Anterior</button>}
                <button className="tuto-pri" onClick={() => (ultimo ? cerrar() : setPaso(paso + 1))}>
                  {ultimo ? 'Empezar' : 'Siguiente'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}