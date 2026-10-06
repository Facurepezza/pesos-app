import { createContext, useCallback, useContext, useRef, useState } from 'react'

// Ventana de confirmación con el diseño de PESOS (reemplaza el cartel gris del navegador).
// Uso: const confirmar = useConfirmar()
//      if (!(await confirmar({ titulo, texto, boton: 'Borrar', peligro: true }))) return
const ConfirmarCtx = createContext(async () => false)

export function useConfirmar() {
  return useContext(ConfirmarCtx)
}

export function ConfirmarProvider({ children }) {
  const [pedido, setPedido] = useState(null)
  const resolver = useRef(null)

  const confirmar = useCallback((opciones) => new Promise((resolve) => {
    resolver.current = resolve
    setPedido(opciones)
  }), [])

  function responder(si) {
    if (resolver.current) resolver.current(si)
    resolver.current = null
    setPedido(null)
  }

  return (
    <ConfirmarCtx.Provider value={confirmar}>
      {children}
      {pedido && (
        <div className="pz pz-capa">
          <div className="pz-sheet-fondo pz-confirmar-fondo" onClick={() => responder(false)}>
            <section className="pz-sheet pz-confirmar" role="alertdialog" aria-modal="true" aria-labelledby="pz-conf-titulo"
              onClick={(e) => e.stopPropagation()}>
              <div className="pz-sheet-manija" />
              <h2 id="pz-conf-titulo" className="pz-h2">{pedido.titulo}</h2>
              {pedido.texto && <p className="pz-confirmar-txt">{pedido.texto}</p>}
              <div className="pz-confirmar-botones">
                <button type="button" className="pz-btn pz-btn-claro pz-btn-grande" onClick={() => responder(false)} autoFocus>
                  {pedido.cancelar || 'Cancelar'}
                </button>
                <button type="button" className={`pz-btn pz-btn-grande ${pedido.peligro ? 'pz-btn-peligro-lleno' : 'pz-btn-primario'}`}
                  onClick={() => responder(true)}>
                  {pedido.boton || 'Confirmar'}
                </button>
              </div>
            </section>
          </div>
        </div>
      )}
    </ConfirmarCtx.Provider>
  )
}