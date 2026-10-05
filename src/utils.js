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