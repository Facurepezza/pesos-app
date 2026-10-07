// Utilidades compartidas de PESOS: fechas, formato de plata, categorías y cotizaciones

export const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']
export const MESES_LARGO = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']
export const DIAS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']

const pad = (n) => String(n).padStart(2, '0')

// Fecha de hoy en formato AAAA-MM-DD (hora local, no UTC)
export const hoyISO = () => {
  const d = new Date()
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export const claveMes = (anio, mes) => `${anio}-${pad(mes + 1)}`

export function mesDesplazado(anio, mes, delta) {
  const d = new Date(anio, mes + delta, 1)
  return { anio: d.getFullYear(), mes: d.getMonth() }
}

// Suma N meses a una fecha AAAA-MM-DD (si el día no existe, usa el último del mes)
export function sumarMeses(fechaISO, n) {
  const [y, m, d] = fechaISO.split('-').map(Number)
  const base = new Date(y, m - 1 + n, 1)
  const ultimo = new Date(base.getFullYear(), base.getMonth() + 1, 0).getDate()
  return `${base.getFullYear()}-${pad(base.getMonth() + 1)}-${pad(Math.min(d, ultimo))}`
}

export function diasHasta(fechaISO) {
  const a = new Date(hoyISO() + 'T00:00:00')
  const b = new Date(fechaISO + 'T00:00:00')
  return Math.round((b - a) / 86400000)
}

export function fechaLinda(fechaISO) {
  const d = new Date(fechaISO + 'T00:00:00')
  return `${DIAS[d.getDay()]} ${d.getDate()} de ${MESES_LARGO[d.getMonth()]}`
}

// Formato de plata. Si "oculto" es true, tapa el número.
export function plata(n, oculto = false, moneda = 'ARS', decimales = false) {
  if (oculto) return moneda === 'ARS' ? '$ •••••' : `${moneda} •••`
  const conDecimales = decimales || moneda !== 'ARS'
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: moneda,
    minimumFractionDigits: conDecimales ? 2 : 0,
    maximumFractionDigits: conDecimales ? 2 : 0,
  }).format(Number(n) || 0)
}

export const CATEGORIAS = ['Súper', 'Comida', 'Transporte', 'Salidas', 'Suscripciones', 'Servicios', 'Salud', 'Seguros', 'Hogar', 'Ropa', 'Tecnología', 'Viajes', 'Educación', 'Otros']


export const COLORES_CAT = ['#0F4D35', '#3E8E68', '#E0A22B', '#6B7DD6', '#C2410C', '#8B5CF6', '#0E7490', '#9CA3AF']

export const CONCEPTOS_INGRESO = ['Sueldo', 'Freelance / changas', 'Ventas', 'Rendimientos', 'Regalo', 'Otro']

export const MEDIOS = { efectivo: 'Efectivo', mercado_pago: 'Mercado Pago', tarjeta: 'Tarjeta' }

// Cómo te pagaron un ingreso
export const MEDIOS_COBRO = { banco: 'Cuenta bancaria', mercado_pago: 'Mercado Pago', efectivo: 'Efectivo', otro: 'Otro' }

// ---------- Montos escritos a la argentina ----------
// Punto = separador de miles, coma = decimales. Ej: "20.000" son veinte mil, "9,99" son nueve con 99.

// Lo que se ve en el campo mientras escribís: pone los puntos de miles solo.
// Si puntoDecimal es true (montos en dólares o euros), un punto escrito a mano cuenta como coma.
export function escribirMonto(texto, puntoDecimal = false) {
  let t = String(texto ?? '')
  // Recién tipeaste un punto en un monto en dólares o euros: se toma como coma
  if (puntoDecimal && !t.includes(',') && t.endsWith('.')) t = t.slice(0, -1) + ','
  t = t.replace(/[^0-9,]/g, '')
  const coma = t.indexOf(',')
  let entero = coma === -1 ? t : t.slice(0, coma)
  const decimales = coma === -1 ? null : t.slice(coma + 1).replace(/,/g, '').slice(0, 2)
  entero = entero.replace(/^0+(?=\d)/, '')
  const conPuntos = entero.replace(/\B(?=(\d{3})+(?!\d))/g, '.')
  if (decimales === null) return conPuntos
  return `${conPuntos || '0'},${decimales}`
}

// Convierte lo escrito en un número para guardar
export function aNumero(texto) {
  const t = escribirMonto(texto).replace(/\./g, '').replace(',', '.')
  const n = parseFloat(t)
  return Number.isFinite(n) ? n : 0
}

// Un número guardado, listo para mostrarse en un campo (20000.5 -> "20.000,5")
export function montoATexto(n) {
  const v = Number(n)
  if (!Number.isFinite(v) || v === 0) return ''
  const [ent, dec] = String(Math.round(v * 100) / 100).split('.')
  return escribirMonto(dec ? `${ent},${dec}` : ent)
}

// ---------- Suscripciones ----------
// Lo que sale en pesos una suscripción hoy (si es en dólares, al dólar tarjeta del día)
export function pesosSuscripcion(s, cot) {
  if (s.moneda === 'USD' && Number(s.monto_original) > 0) {
    if (cot?.tarjeta) return Number(s.monto_original) * cot.tarjeta
  }
  return Number(s.monto_estimado) || 0
}

// Lo que pesa por mes (una anual se reparte en 12)
export function mensualSuscripcion(s, cot) {
  const p = pesosSuscripcion(s, cot)
  return s.frecuencia === 'anual' ? p / 12 : p
}

// Próximo vencimiento después de pagar (un mes o un año más)
export function siguienteVencimiento(s, desde) {
  return sumarMeses(desde, s.frecuencia === 'anual' ? 12 : 1)
}

// ---------- Cotizaciones (DolarAPI, gratis y sin clave) ----------
let cache = null

export async function traerCotizaciones() {
  if (cache && Date.now() - cache.t < 10 * 60 * 1000) return cache.data
  try {
    const [dolares, euro] = await Promise.all([
      fetch('https://dolarapi.com/v1/dolares').then((r) => r.json()),
      fetch('https://dolarapi.com/v1/cotizaciones/eur').then((r) => r.json()),
    ])
    const por = Object.fromEntries(dolares.map((x) => [x.casa, x]))
    const data = {
      blue: por.blue?.venta ?? null,
      oficial: por.oficial?.venta ?? null,
      mep: por.bolsa?.venta ?? null,
      tarjeta: por.tarjeta?.venta ?? null,
      euro: euro?.venta ?? null,
    }
    cache = { t: Date.now(), data }
    try { localStorage.setItem('pesos_cot', JSON.stringify(data)) } catch { /* nada */ }
    return data
  } catch {
    try {
      const guardada = localStorage.getItem('pesos_cot')
      return guardada ? JSON.parse(guardada) : null
    } catch {
      return null
    }
  }
}