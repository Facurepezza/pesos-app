import { useState } from 'react'

// Palabra clave -> dominio de la marca, para traer su logo automáticamente
const DOMINIOS = {
  spotify: 'spotify.com', netflix: 'netflix.com', 'disney': 'disneyplus.com', 'hbo': 'max.com', 'max ': 'max.com',
  'prime video': 'primevideo.com', amazon: 'amazon.com', youtube: 'youtube.com', 'apple': 'apple.com', icloud: 'apple.com',
  google: 'google.com', chatgpt: 'openai.com', openai: 'openai.com', claude: 'claude.ai', canva: 'canva.com',
  mcdonald: 'mcdonalds.com', 'burger king': 'burgerking.com.ar', starbucks: 'starbucks.com', 'mostaza': 'mostazaweb.com.ar',
  pedidosya: 'pedidosya.com.ar', rappi: 'rappi.com.ar', uber: 'uber.com', cabify: 'cabify.com', didi: 'didiglobal.com',
  carrefour: 'carrefour.com.ar', coto: 'coto.com.ar', jumbo: 'jumbo.com.ar', disco: 'disco.com.ar', 'dia ': 'diaonline.supermercadosdia.com.ar',
  ypf: 'ypf.com', shell: 'shell.com', axion: 'axionenergy.com',
  'mercado pago': 'mercadopago.com.ar', 'mercadopago': 'mercadopago.com.ar', 'mercado libre': 'mercadolibre.com.ar', mercadolibre: 'mercadolibre.com.ar',
  galicia: 'bancogalicia.com', santander: 'santander.com.ar', bbva: 'bbva.com.ar', macro: 'macro.com.ar', nacion: 'bna.com.ar',
  provincia: 'bancoprovincia.com.ar', 'naranja': 'naranjax.com', brubank: 'brubank.com', 'uala': 'uala.com.ar', 'icbc': 'icbc.com.ar',
  hsbc: 'hsbc.com.ar', patagonia: 'bancopatagonia.com.ar', supervielle: 'supervielle.com.ar', 'american express': 'americanexpress.com', amex: 'americanexpress.com',
  personal: 'personal.com.ar', movistar: 'movistar.com.ar', claro: 'claro.com.ar', telecentro: 'telecentro.com.ar', fibertel: 'personal.com.ar',
  edenor: 'edenor.com', edesur: 'edesur.com.ar', metrogas: 'metrogas.com.ar', naturgy: 'naturgy.com.ar', aysa: 'aysa.com.ar',
  steam: 'steampowered.com', playstation: 'playstation.com', xbox: 'xbox.com', nike: 'nike.com', adidas: 'adidas.com', zara: 'zara.com',
  smart: 'smartfit.com.ar', megatlon: 'megatlon.com', sube: 'argentina.gob.ar', despegar: 'despegar.com.ar', airbnb: 'airbnb.com',
}

const COLORES = ['#0F4D35', '#3E8E68', '#C2410C', '#6B7DD6', '#B7791F', '#0E7490', '#7C3AED', '#334155']

const normalizar = (t) =>
  (t || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '') + ' '

export function dominioDe(texto) {
  const t = normalizar(texto)
  for (const clave of Object.keys(DOMINIOS)) {
    if (t.includes(clave)) return DOMINIOS[clave]
  }
  return null
}

export default function Avatar({ nombre, size = 42, color }) {
  const [fallo, setFallo] = useState(false)
  const dominio = dominioDe(nombre)
  const limpio = (nombre || '?').trim()
  const letra = limpio.charAt(0).toUpperCase() || '?'
  const fondo = color || COLORES[limpio.length % COLORES.length]

  if (dominio && !fallo) {
    return (
      <span className="pz-avatar pz-avatar-logo" style={{ width: size, height: size }}>
        <img
          src={`https://www.google.com/s2/favicons?domain=${dominio}&sz=128`}
          alt=""
          width={size * 0.62}
          height={size * 0.62}
          onError={() => setFallo(true)}
        />
      </span>
    )
  }

  return (
    <span className="pz-avatar" style={{ width: size, height: size, background: fondo, fontSize: size * 0.42 }}>
      {letra}
    </span>
  )
}