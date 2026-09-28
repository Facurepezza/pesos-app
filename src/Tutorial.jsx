import { useEffect, useState } from 'react'
import './Tutorial.css'

const PASOS = [
  { titulo: 'Bienvenido a PESOS', texto: 'Te mostramos en 4 pasos cómo usarlo. Podés volver a ver esta guía cuando quieras con el botón de ayuda (?) abajo a la derecha.' },
  { titulo: 'Cargá tus gastos', texto: 'En la solapa "Cargar" anotás cada gasto: cuánto fue, qué día, en qué categoría y cómo lo pagaste (efectivo, Mercado Pago o tarjeta). Tocá "Guardar" y listo.' },
  { titulo: 'Revisá y corregí', texto: 'En "Mis gastos" ves todo lo que cargaste. Podés filtrar por fecha, categoría o medio de pago. Si te equivocaste en un monto, usá el botón "Editar". Si lo cargaste de más, "Eliminar".' },
  { titulo: 'Tus suscripciones', texto: 'En "Suscripciones" anotás lo que pagás todos los meses (Netflix, el gimnasio, el celular). PESOS te avisa cuando se acerca el vencimiento y podés mandarte el recordatorio por WhatsApp o mail. Si cancelaste una, tocá "Dar de baja".' },
  { titulo: 'Mirá el resumen', texto: 'En "Resumen" ves cuánto gastaste en el mes, en qué se te fue la plata y cómo vienen los últimos meses. Listo, ya podés empezar.' }
]

const CLAVE = 'pesos_tutorial_visto'

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