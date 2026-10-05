import { useState } from 'react'
import Icono from './Iconos'
import { comercioDe } from './comercios'

// Ícono y color para cada categoría (cuando no hay logo de marca)
const POR_CATEGORIA = {
  'súper': ['carrito', '#0F4D35'], comida: ['cubiertos', '#C2410C'], transporte: ['auto', '#0E7490'],
  salidas: ['copa', '#7C3AED'], suscripciones: ['repetir', '#6B7DD6'], servicios: ['rayo', '#B7791F'],
  salud: ['salud', '#BE185D'], seguros: ['escudo', '#334155'], hogar: ['inicio', '#3E8E68'],
  ropa: ['remera', '#9333EA'], 'tecnología': ['celu', '#1E40AF'], viajes: ['avion', '#0369A1'],
  'educación': ['libro', '#4D7C0F'], otros: ['puntos', '#64748B'], 'sin categoría': ['puntos', '#64748B'],
  sueldo: ['billete', '#15803D'], 'freelance / changas': ['maletin', '#15803D'], ventas: ['etiqueta', '#15803D'],
  rendimientos: ['grafico', '#15803D'], regalo: ['regalo', '#15803D'], otro: ['puntos', '#15803D'],
}

const COLORES = ['#0F4D35', '#3E8E68', '#C2410C', '#6B7DD6', '#B7791F', '#0E7490', '#7C3AED', '#334155']

export default function Avatar({ nombre, categoria, size = 42 }) {
  const [fallo, setFallo] = useState(null)
  const comercio = comercioDe(nombre)
  const dominio = comercio?.d

  // 1) Logo de la marca
  if (dominio && fallo !== dominio) {
    return (
      <span className="pz-avatar pz-avatar-logo" style={{ width: size, height: size }}>
        <img
          src={`https://www.google.com/s2/favicons?domain=${dominio}&sz=128`}
          alt=""
          width={Math.round(size * 0.62)}
          height={Math.round(size * 0.62)}
          onError={() => setFallo(dominio)}
          onLoad={(e) => { if (e.currentTarget.naturalWidth <= 16) setFallo(dominio) }}
        />
      </span>
    )
  }

  // 2) Ícono de la categoría
  const clave = (categoria || nombre || '').trim().toLowerCase()
  const cat = POR_CATEGORIA[clave] || (comercio?.c ? POR_CATEGORIA[comercio.c.toLowerCase()] : null)
  if (cat) {
    return (
      <span className="pz-avatar" style={{ width: size, height: size, background: cat[1] }}>
        <Icono nombre={cat[0]} size={Math.round(size * 0.5)} color="#FFFFFF" />
      </span>
    )
  }

  // 3) Inicial con color
  const limpio = (nombre || '?').trim()
  const letra = limpio.charAt(0).toUpperCase() || '?'
  return (
    <span className="pz-avatar" style={{ width: size, height: size, background: COLORES[limpio.length % COLORES.length], fontSize: size * 0.42 }}>
      {letra}
    </span>
  )
}