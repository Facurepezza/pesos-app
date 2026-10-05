import { useEffect, useState } from 'react'
import Icono from './Iconos'

// Cartel para instalar PESOS en el celular (Android: botón; iPhone: instrucciones)
export default function InstalarApp() {
  const [evento, setEvento] = useState(null)
  const [cerrado, setCerrado] = useState(() => {
    try { return localStorage.getItem('pesos_instalar_cerrado') === 'si' } catch { return false }
  })

  const instalada = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true
  const esIphone = /iphone|ipad|ipod/i.test(navigator.userAgent)

  useEffect(() => {
    const guardar = (e) => { e.preventDefault(); setEvento(e) }
    window.addEventListener('beforeinstallprompt', guardar)
    return () => window.removeEventListener('beforeinstallprompt', guardar)
  }, [])

  function cerrar() {
    setCerrado(true)
    try { localStorage.setItem('pesos_instalar_cerrado', 'si') } catch { /* nada */ }
  }

  async function instalar() {
    evento.prompt()
    await evento.userChoice
    setEvento(null)
  }

  if (instalada || cerrado || (!evento && !esIphone)) return null

  return (
    <section className="pz-instalar">
      <span className="pz-marca-logo pz-instalar-logo">$</span>
      <div className="pz-instalar-txt">
        <b>Instalá PESOS en tu celu</b>
        <span>{esIphone ? 'Tocá Compartir y después "Agregar a inicio".' : 'Abrila como una app, sin el navegador.'}</span>
      </div>
      {!esIphone && <button type="button" className="pz-btn pz-btn-lima" onClick={instalar}>Instalar</button>}
      <button type="button" className="pz-icon-btn pz-instalar-x" onClick={cerrar} aria-label="Cerrar aviso">
        <Icono nombre="cerrar" size={16} />
      </button>
    </section>
  )
}