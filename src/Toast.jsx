import { createContext, useCallback, useContext, useRef, useState } from 'react'

// Avisos cortos que aparecen abajo y se van solos (con botón "Deshacer" opcional)
const ToastCtx = createContext(() => {})

export function useToast() {
  return useContext(ToastCtx)
}

export function ToastProvider({ children }) {
  const [toast, setToast] = useState(null)
  const timer = useRef(null)

  const avisar = useCallback((texto, opciones = {}) => {
    clearTimeout(timer.current)
    setToast({ texto, tipo: opciones.tipo || 'ok', accion: opciones.accion || null, id: Date.now() })
    timer.current = setTimeout(() => setToast(null), opciones.accion ? 6000 : 3000)
  }, [])

  async function usarAccion() {
    const fn = toast?.accion?.fn
    clearTimeout(timer.current)
    setToast(null)
    if (fn) await fn()
  }

  return (
    <ToastCtx.Provider value={avisar}>
      {children}
      <div className="pz-toast-zona" aria-live="polite">
        {toast && (
          <div key={toast.id} className={`pz-toast ${toast.tipo}`} role="status">
            <span>{toast.texto}</span>
            {toast.accion && (
              <button type="button" onClick={usarAccion}>{toast.accion.label}</button>
            )}
          </div>
        )}
      </div>
    </ToastCtx.Provider>
  )
}