// Catálogo de comercios y servicios de Argentina: nombre, dominio (para el logo),
// categoría sugerida y palabras clave para encontrarlos al escribir.
// Para sumar uno nuevo: copiá una línea y cambiá los datos.

export const COMERCIOS = [
  // ---------- Supermercados ----------
  { n: 'Carrefour', d: 'carrefour.com.ar', c: 'Súper' },
  { n: 'Coto', d: 'coto.com.ar', c: 'Súper' },
  { n: 'Jumbo', d: 'jumbo.com.ar', c: 'Súper' },
  { n: 'Disco', d: 'disco.com.ar', c: 'Súper' },
  { n: 'Vea', d: 'vea.com.ar', c: 'Súper' },
  { n: 'Día', d: 'supermercadosdia.com.ar', c: 'Súper', k: 'dia supermercado' },
  { n: 'ChangoMás', d: 'masonline.com.ar', c: 'Súper', k: 'chango mas walmart' },
  { n: 'La Anónima', d: 'laanonima.com.ar', c: 'Súper', k: 'anonima' },
  { n: 'Makro', d: 'makro.com.ar', c: 'Súper' },
  { n: 'Vital', d: 'vital.com.ar', c: 'Súper', k: 'mayorista vital' },
  { n: 'Maxiconsumo', d: 'maxiconsumo.com', c: 'Súper' },
  { n: 'Farmacity', d: 'farmacity.com', c: 'Salud' },

  // ---------- Combustible y auto ----------
  { n: 'YPF', d: 'ypf.com', c: 'Transporte', k: 'nafta combustible' },
  { n: 'Shell', d: 'shell.com.ar', c: 'Transporte', k: 'nafta combustible' },
  { n: 'Axion', d: 'axionenergy.com', c: 'Transporte', k: 'nafta combustible' },
  { n: 'Puma Energy', d: 'pumaenergy.com', c: 'Transporte', k: 'puma nafta combustible' },
  { n: 'Gulf', d: 'gulfoil.com', c: 'Transporte', k: 'nafta' },
  { n: 'AutoPistas / Peaje', d: 'ausa.com.ar', c: 'Transporte', k: 'peaje telepeaje ausa' },

  // ---------- Transporte y viajes ----------
  { n: 'SUBE', d: 'argentina.gob.ar', c: 'Transporte', k: 'colectivo subte tren carga sube' },
  { n: 'Uber', d: 'uber.com', c: 'Transporte' },
  { n: 'Cabify', d: 'cabify.com', c: 'Transporte' },
  { n: 'DiDi', d: 'didiglobal.com', c: 'Transporte', k: 'didi' },
  { n: 'Aerolíneas Argentinas', d: 'aerolineas.com.ar', c: 'Viajes', k: 'aerolineas vuelo pasaje' },
  { n: 'Flybondi', d: 'flybondi.com', c: 'Viajes', k: 'vuelo pasaje' },
  { n: 'JetSMART', d: 'jetsmart.com', c: 'Viajes', k: 'jet smart vuelo pasaje' },
  { n: 'Despegar', d: 'despegar.com.ar', c: 'Viajes' },
  { n: 'Booking', d: 'booking.com', c: 'Viajes', k: 'hotel' },
  { n: 'Airbnb', d: 'airbnb.com', c: 'Viajes' },
  { n: 'Almundo', d: 'almundo.com.ar', c: 'Viajes' },

  // ---------- Comida y cafés ----------
  { n: "McDonald's", d: 'mcdonalds.com', c: 'Comida', k: 'mc mcdonald mcdonalds donalds mac' },
  { n: 'Burger King', d: 'burgerking.com.ar', c: 'Comida', k: 'bk' },
  { n: 'Mostaza', d: 'mostazaweb.com.ar', c: 'Comida' },
  { n: 'KFC', d: 'kfc.com.ar', c: 'Comida', k: 'kentucky' },
  { n: "Wendy's", d: 'wendys.com', c: 'Comida', k: 'wendys' },
  { n: 'Subway', d: 'subway.com', c: 'Comida' },
  { n: 'Starbucks', d: 'starbucks.com.ar', c: 'Comida', k: 'cafe' },
  { n: 'Havanna', d: 'havanna.com.ar', c: 'Comida', k: 'cafe alfajor' },
  { n: 'Café Martínez', d: 'cafemartinez.com', c: 'Comida', k: 'cafe martinez' },
  { n: 'Kansas', d: 'kansas.com.ar', c: 'Salidas', k: 'kansas grill restaurante' },
  { n: 'Freddo', d: 'freddo.com.ar', c: 'Comida', k: 'helado' },
  { n: 'Grido', d: 'grido.com.ar', c: 'Comida', k: 'helado' },
  { n: 'Rapanui', d: 'rapanui.com.ar', c: 'Comida', k: 'chocolate helado' },
  { n: 'Pizza Hut', d: 'pizzahut.com.ar', c: 'Comida', k: 'pizza' },
  { n: 'Dominos', d: 'dominos.com.ar', c: 'Comida', k: 'pizza domino' },
  { n: 'PedidosYa', d: 'pedidosya.com.ar', c: 'Comida', k: 'pedidos ya delivery' },
  { n: 'Rappi', d: 'rappi.com.ar', c: 'Comida', k: 'delivery' },

  // ---------- Suscripciones y streaming ----------
  { n: 'Netflix', d: 'netflix.com', c: 'Suscripciones' },
  { n: 'Spotify', d: 'spotify.com', c: 'Suscripciones' },
  { n: 'Disney+', d: 'disneyplus.com', c: 'Suscripciones', k: 'disney plus star' },
  { n: 'Max', d: 'max.com', c: 'Suscripciones', k: 'hbo max' },
  { n: 'Prime Video', d: 'primevideo.com', c: 'Suscripciones', k: 'amazon prime' },
  { n: 'Paramount+', d: 'paramountplus.com', c: 'Suscripciones', k: 'paramount plus' },
  { n: 'YouTube Premium', d: 'youtube.com', c: 'Suscripciones', k: 'youtube' },
  { n: 'Apple', d: 'apple.com', c: 'Suscripciones', k: 'icloud apple music apple tv' },
  { n: 'Crunchyroll', d: 'crunchyroll.com', c: 'Suscripciones' },
  { n: 'Flow', d: 'flow.com.ar', c: 'Suscripciones' },
  { n: 'DirecTV', d: 'directvla.com', c: 'Suscripciones', k: 'directv' },
  { n: 'ChatGPT Plus', d: 'openai.com', c: 'Suscripciones', k: 'chatgpt openai' },
  { n: 'Claude', d: 'claude.ai', c: 'Suscripciones', k: 'anthropic' },
  { n: 'Google One', d: 'one.google.com', c: 'Suscripciones', k: 'google drive' },
  { n: 'Microsoft 365', d: 'microsoft.com', c: 'Suscripciones', k: 'office' },
  { n: 'Adobe', d: 'adobe.com', c: 'Suscripciones', k: 'photoshop' },
  { n: 'Canva', d: 'canva.com', c: 'Suscripciones' },
  { n: 'Notion', d: 'notion.so', c: 'Suscripciones' },
  { n: 'Duolingo', d: 'duolingo.com', c: 'Educación' },

  // ---------- Juegos y tecnología ----------
  { n: 'Steam', d: 'steampowered.com', c: 'Tecnología' },
  { n: 'PlayStation', d: 'playstation.com', c: 'Tecnología', k: 'ps plus psn' },
  { n: 'Xbox', d: 'xbox.com', c: 'Tecnología', k: 'game pass' },
  { n: 'Nintendo', d: 'nintendo.com', c: 'Tecnología' },

  // ---------- Telefonía e internet ----------
  { n: 'Personal', d: 'personal.com.ar', c: 'Servicios', k: 'personal flow fibertel celular' },
  { n: 'Movistar', d: 'movistar.com.ar', c: 'Servicios', k: 'celular' },
  { n: 'Claro', d: 'claro.com.ar', c: 'Servicios', k: 'celular' },
  { n: 'Telecentro', d: 'telecentro.com.ar', c: 'Servicios', k: 'internet' },

  // ---------- Luz, gas, agua e impuestos ----------
  { n: 'Edenor', d: 'edenor.com', c: 'Servicios', k: 'luz electricidad' },
  { n: 'Edesur', d: 'edesur.com.ar', c: 'Servicios', k: 'luz electricidad' },
  { n: 'Edelap', d: 'edelap.com.ar', c: 'Servicios', k: 'luz' },
  { n: 'Metrogas', d: 'metrogas.com.ar', c: 'Servicios', k: 'gas' },
  { n: 'Naturgy', d: 'naturgy.com.ar', c: 'Servicios', k: 'gas natural ban' },
  { n: 'AySA', d: 'aysa.com.ar', c: 'Servicios', k: 'agua aysa' },
  { n: 'ARBA', d: 'arba.gov.ar', c: 'Servicios', k: 'impuesto patente inmobiliario' },
  { n: 'AGIP / ABL', d: 'agip.gob.ar', c: 'Servicios', k: 'abl agip impuesto' },
  { n: 'ARCA (ex AFIP)', d: 'arca.gob.ar', c: 'Servicios', k: 'afip arca monotributo' },

  // ---------- Salud y prepagas ----------
  { n: 'OSDE', d: 'osde.com.ar', c: 'Salud', k: 'prepaga' },
  { n: 'Swiss Medical', d: 'swissmedical.com.ar', c: 'Salud', k: 'prepaga swiss' },
  { n: 'Galeno', d: 'galeno.com.ar', c: 'Salud', k: 'prepaga' },
  { n: 'Medifé', d: 'medife.com.ar', c: 'Salud', k: 'medife prepaga' },
  { n: 'Omint', d: 'omint.com.ar', c: 'Salud', k: 'prepaga' },
  { n: 'Sancor Salud', d: 'sancorsalud.com.ar', c: 'Salud', k: 'prepaga sancor' },
  { n: 'Hospital Italiano', d: 'hospitalitaliano.org.ar', c: 'Salud', k: 'italiano plan de salud' },
  { n: 'Hospital Alemán', d: 'hospitalaleman.org.ar', c: 'Salud', k: 'aleman' },

  // ---------- Seguros y asistencia ----------
  { n: 'La Segunda', d: 'lasegunda.com.ar', c: 'Seguros', k: 'seguro' },
  { n: 'Sancor Seguros', d: 'sancorseguros.com.ar', c: 'Seguros', k: 'seguro sancor' },
  { n: 'Mapfre', d: 'mapfre.com.ar', c: 'Seguros', k: 'seguro' },
  { n: 'Zurich', d: 'zurich.com.ar', c: 'Seguros', k: 'seguro' },
  { n: 'Allianz', d: 'allianz.com.ar', c: 'Seguros', k: 'seguro' },
  { n: 'Federación Patronal', d: 'fedpat.com.ar', c: 'Seguros', k: 'federacion patronal seguro' },
  { n: 'Rivadavia Seguros', d: 'segurosrivadavia.com', c: 'Seguros', k: 'rivadavia seguro' },
  { n: 'La Caja', d: 'lacaja.com.ar', c: 'Seguros', k: 'seguro' },
  { n: 'Pax Assistance', d: 'paxassistance.com', c: 'Seguros', k: 'pax asistencia viajero' },
  { n: 'Assist Card', d: 'assistcard.com', c: 'Seguros', k: 'asistencia viajero' },

  // ---------- Gimnasios ----------
  { n: 'Megatlon', d: 'megatlon.com', c: 'Salud', k: 'gimnasio gym' },
  { n: 'SmartFit', d: 'smartfit.com.ar', c: 'Salud', k: 'smart fit gimnasio gym' },
  { n: 'SportClub', d: 'sportclub.com.ar', c: 'Salud', k: 'sport club gimnasio gym' },

  // ---------- Compras y ropa ----------
  { n: 'Mercado Libre', d: 'mercadolibre.com.ar', c: 'Otros', k: 'mercadolibre meli' },
  { n: 'Amazon', d: 'amazon.com', c: 'Otros' },
  { n: 'Temu', d: 'temu.com', c: 'Otros' },
  { n: 'Shein', d: 'shein.com', c: 'Ropa' },
  { n: 'Frávega', d: 'fravega.com', c: 'Tecnología', k: 'fravega' },
  { n: 'Musimundo', d: 'musimundo.com', c: 'Tecnología' },
  { n: 'Easy', d: 'easy.com.ar', c: 'Hogar' },
  { n: 'Sodimac', d: 'sodimac.com.ar', c: 'Hogar' },
  { n: 'IKEA', d: 'ikea.com', c: 'Hogar' },
  { n: 'Zara', d: 'zara.com', c: 'Ropa' },
  { n: 'Nike', d: 'nike.com', c: 'Ropa' },
  { n: 'Adidas', d: 'adidas.com.ar', c: 'Ropa' },
  { n: 'Puma', d: 'puma.com', c: 'Ropa', k: 'zapatillas' },
  { n: 'Dexter', d: 'dexter.com.ar', c: 'Ropa', k: 'zapatillas' },
  { n: 'Grimoldi', d: 'grimoldi.com', c: 'Ropa', k: 'zapatos' },
  { n: 'Open Sports', d: 'opensports.com.ar', c: 'Ropa' },
  { n: 'Lacoste', d: 'lacoste.com', c: 'Ropa' },
  { n: 'Levi’s', d: 'levi.com', c: 'Ropa', k: 'levis' },

  // ---------- Bancos, billeteras y tarjetas ----------
  { n: 'Mercado Pago', d: 'mercadopago.com.ar', c: null, k: 'mercadopago mp' },
  { n: 'Banco Galicia', d: 'bancogalicia.com', c: null, k: 'galicia' },
  { n: 'Santander', d: 'santander.com.ar', c: null },
  { n: 'BBVA', d: 'bbva.com.ar', c: null, k: 'frances' },
  { n: 'Banco Macro', d: 'macro.com.ar', c: null, k: 'macro' },
  { n: 'Banco Nación', d: 'bna.com.ar', c: null, k: 'nacion bna' },
  { n: 'Banco Provincia', d: 'bancoprovincia.com.ar', c: null, k: 'provincia cuenta dni' },
  { n: 'Banco Ciudad', d: 'bancociudad.com.ar', c: null, k: 'ciudad' },
  { n: 'ICBC', d: 'icbc.com.ar', c: null },
  { n: 'Banco Patagonia', d: 'bancopatagonia.com.ar', c: null, k: 'patagonia' },
  { n: 'Supervielle', d: 'supervielle.com.ar', c: null },
  { n: 'Credicoop', d: 'bancocredicoop.coop', c: null },
  { n: 'Banco Comafi', d: 'comafi.com.ar', c: null, k: 'comafi' },
  { n: 'Banco Hipotecario', d: 'hipotecario.com.ar', c: null, k: 'hipotecario' },
  { n: 'Naranja X', d: 'naranjax.com', c: null, k: 'naranja' },
  { n: 'Brubank', d: 'brubank.com', c: null },
  { n: 'Ualá', d: 'uala.com.ar', c: null, k: 'uala' },
  { n: 'Lemon', d: 'lemon.me', c: null },
  { n: 'Personal Pay', d: 'personalpay.com.ar', c: null },
  { n: 'Prex', d: 'prexcard.com.ar', c: null },
  { n: 'Visa', d: 'visa.com.ar', c: null },
  { n: 'Mastercard', d: 'mastercard.com.ar', c: null, k: 'master' },
  { n: 'American Express', d: 'americanexpress.com', c: null, k: 'amex' },
  { n: 'Cabal', d: 'cabal.coop', c: null },
]

const norm = (t) => (t || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9+ ]/g, ' ').replace(/\s+/g, ' ').trim()

const INDICE = COMERCIOS.map((c) => ({ ...c, _n: norm(c.n), _k: norm(`${c.n} ${c.k || ''}`).split(' ') }))

// Palabras muy generales que no alcanzan para elegir un logo
const GENERICAS = new Set(['nafta', 'combustible', 'cafe', 'helado', 'pizza', 'delivery', 'seguro', 'prepaga', 'gimnasio', 'gym',
  'luz', 'gas', 'agua', 'internet', 'celular', 'impuesto', 'vuelo', 'pasaje', 'hotel', 'zapatillas', 'zapatos', 'chocolate',
  'alfajor', 'restaurante', 'asistencia', 'viajero', 'supermercado', 'electricidad', 'colectivo', 'subte', 'tren', 'carga',
  'peaje', 'plus', 'music', 'natural', 'plan', 'salud', 'mayorista', 'banco', 'express', 'seguros', 'hospital', 'medical',
  'energy', 'premium', 'video', 'one', 'pay', 'cuenta', 'grill', 'sport', 'club', 'smart', 'game', 'pass', 'drive', 'office'])
const REDES = new Set(['Visa', 'Mastercard', 'American Express', 'Cabal'])

const tieneFrase = (texto, frase) => (' ' + texto + ' ').includes(' ' + frase + ' ')

// Busca el comercio que mejor coincide con un texto ya escrito (para el logo)
export function comercioDe(texto) {
  const t = norm(texto)
  if (!t) return null
  let mejor = null
  let mejorPuntos = 0
  for (const c of INDICE) {
    let puntos = 0
    if (t === c._n) puntos = 100
    else if (tieneFrase(t, c._n)) puntos = 50 + c._n.length
    else if (c._k.some((p) => p.length >= 3 && !GENERICAS.has(p) && tieneFrase(t, p))) puntos = 20
    if (puntos && REDES.has(c.n) && puntos < 100) puntos -= 40
    if (puntos > mejorPuntos) { mejor = c; mejorPuntos = puntos }
  }
  return mejor
}

// Sugerencias mientras se escribe (para el menú desplegable)
export function sugerencias(texto, max = 6) {
  const t = norm(texto)
  if (!t) return []
  const res = []
  for (const c of INDICE) {
    let puntos = 0
    if (c._n.startsWith(t)) puntos = 3
    else if (c._k.some((p) => p.startsWith(t))) puntos = 2
    else if (t.length >= 3 && c._n.includes(t)) puntos = 1
    if (puntos) res.push({ c, puntos })
  }
  return res.sort((a, b) => b.puntos - a.puntos || a.c.n.length - b.c.n.length).slice(0, max).map((r) => r.c)
}