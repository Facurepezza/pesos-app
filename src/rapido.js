import { comercioDe, sugerencias } from './comercios'
import { aNumero, CATEGORIAS } from './utils'

// Carga rápida: entiende cosas como "mc 8500 mp", "netflix 20 usd galicia" o "zapatillas 90.000 3c"

const norm = (t) => (t || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim()

const MEDIOS = {
  mp: 'mercado_pago', mercadopago: 'mercado_pago', 'mercado pago': 'mercado_pago',
  ef: 'efectivo', efe: 'efectivo', efectivo: 'efectivo', cash: 'efectivo', billete: 'efectivo',
}
const MONEDAS = { usd: 'USD', 'us$': 'USD', 'u$s': 'USD', 'u$d': 'USD', dolar: 'USD', dolares: 'USD', dls: 'USD', eur: 'EUR', euro: 'EUR', euros: 'EUR', '€': 'EUR' }
const PALABRA_TARJETA = ['tarjeta', 'tj', 'credito', 'tc']
const PALABRAS_INGRESO = ['cobre', 'ingreso', 'ingresos', 'me pagaron', 'me pagaron']

// Palabras sueltas -> categoría (cuando no es un comercio conocido)
const CATEGORIA_POR_PALABRA = [
  [['nafta', 'combustible', 'peaje', 'estacionamiento', 'colectivo', 'taxi', 'remis', 'subte', 'tren', 'uber', 'sube'], 'Transporte'],
  [['luz', 'gas', 'agua', 'internet', 'celular', 'telefono', 'cable', 'impuesto', 'abl', 'patente', 'expensas'], 'Servicios'],
  [['super', 'supermercado', 'almacen', 'verduleria', 'carniceria', 'chino', 'kiosco', 'panaderia'], 'Súper'],
  [['comida', 'delivery', 'almuerzo', 'cena', 'desayuno', 'cafe', 'helado', 'pizza', 'hamburguesa', 'empanadas', 'sushi', 'birra', 'cerveza'], 'Comida'],
  [['salida', 'bar', 'boliche', 'cine', 'teatro', 'recital', 'cumple', 'entrada', 'previa', 'fernet'], 'Salidas'],
  [['farmacia', 'medico', 'remedio', 'remedios', 'dentista', 'gimnasio', 'gym', 'turno'], 'Salud'],
  [['ropa', 'zapatillas', 'zapatos', 'remera', 'pantalon', 'campera', 'buzo', 'jean'], 'Ropa'],
  [['alquiler', 'hogar', 'muebles', 'limpieza', 'ferreteria'], 'Hogar'],
  [['viaje', 'vuelo', 'hotel', 'pasaje', 'vacaciones', 'hostel'], 'Viajes'],
  [['curso', 'facultad', 'facu', 'colegio', 'libro', 'libros', 'apuntes', 'fotocopias'], 'Educación'],
  [['seguro'], 'Seguros'],
  [['suscripcion', 'netflix', 'spotify'], 'Suscripciones'],
  [['celu', 'tele', 'tv', 'televisor', 'computadora', 'notebook', 'auriculares', 'cargador'], 'Tecnología'],
  [['regalo', 'regalos'], 'Otros'],
]

const CONCEPTO_POR_PALABRA = [
  [['sueldo', 'salario', 'aguinaldo'], 'Sueldo'],
  [['freelance', 'changa', 'changas', 'trabajo', 'proyecto'], 'Freelance / changas'],
  [['venta', 'ventas', 'vendi'], 'Ventas'],
  [['plazo', 'intereses', 'rendimiento', 'rendimientos', 'dividendos'], 'Rendimientos'],
  [['regalo', 'regalaron'], 'Regalo'],
]

// "8500", "8.500", "8,5k", "8k", "1,2m", "20usd", "9.99"
function leerNumero(tok) {
  const m = tok.match(/^\$?(\d[\d.,]*)(k|mil|m|lucas?|palos?)?(usd|us\$|u\$s|eur)?$/)
  if (!m) return null
  let [, num, mult, mon] = m
  let valor
  if (mult) {
    // con "k" o "lucas" el punto y la coma son decimales: 8.5k = 8500
    valor = parseFloat(num.replace(',', '.'))
    if (mult === 'k' || mult === 'mil' || mult.startsWith('luca')) valor *= 1000
    else valor *= 1000000
  } else if (/^\d+[.,]\d{1,2}$/.test(num) && !/^\d+\.\d{3}$/.test(num)) {
    // 9.99 o 9,5 -> decimales
    valor = parseFloat(num.replace(',', '.'))
  } else {
    valor = aNumero(num)
  }
  if (!Number.isFinite(valor) || valor <= 0) return null
  return { valor, moneda: mon ? MONEDAS[mon] : null }
}

function categoriaDe(texto) {
  const n = norm(texto)
  const palabras = n.split(/\s+/)
  for (const [lista, cat] of CATEGORIA_POR_PALABRA) {
    if (lista.some((p) => palabras.includes(p))) return cat
  }
  return null
}

function conceptoDe(texto) {
  const palabras = norm(texto).split(/\s+/)
  for (const [lista, c] of CONCEPTO_POR_PALABRA) {
    if (lista.some((p) => palabras.includes(p))) return c
  }
  return null
}

const capitalizar = (t) => (t ? t.charAt(0).toUpperCase() + t.slice(1) : t)

// Devuelve lo que entendió. Solo trae los campos que pudo descifrar.
export function interpretar(texto, tarjetas = []) {
  let t = ` ${norm(texto)} `
  const r = {}
  if (!t.trim()) return r

  // Ingreso: arranca con "+" o dice "cobré"
  if (/^\s*\+/.test(t) || PALABRAS_INGRESO.some((p) => t.includes(` ${p} `))) {
    r.tipo = 'ingreso'
    t = t.replace(/^\s*\+\s*/, ' ')
    for (const p of PALABRAS_INGRESO) t = t.replaceAll(` ${p} `, ' ')
  }

  // "25 lucas", "8 mil", "1,5 palos": se juntan con el número
  t = t.replace(/(\d[\d.,]*) (k|mil|lucas?|palos?) /g, '$1$2 ')

  // "mercado pago" en dos palabras
  if (t.includes(' mercado pago ')) { r.medio = 'mercado_pago'; t = t.replace(' mercado pago ', ' ') }

  // "entre 4" o "/4": dividir el gasto
  const entre = t.match(/ (?:entre|div|dividido) (\d{1,2}) | \/(\d{1,2}) /)
  if (entre) {
    const n = Number(entre[1] || entre[2])
    if (n >= 2 && n <= 20) r.entre = n
    t = t.replace(entre[0], ' ')
  }

  // "3 cuotas"
  const cuotasLargo = t.match(/ (\d{1,2}) cuotas? /)
  if (cuotasLargo) { r.cuotas = Number(cuotasLargo[1]); t = t.replace(cuotasLargo[0], ' ') }

  const resto = []
  for (const tok of t.split(/\s+/).filter(Boolean)) {
    // cuotas: 3c, x3, 12cuotas
    const c = tok.match(/^(?:(\d{1,2})c(?:uotas?)?|x(\d{1,2}))$/)
    if (c) { r.cuotas = Number(c[1] || c[2]); continue }
    if (MONEDAS[tok]) { r.moneda = MONEDAS[tok]; continue }
    if (MEDIOS[tok]) { r.medio = MEDIOS[tok]; continue }
    if (r.monto === undefined) {
      const n = leerNumero(tok)
      if (n) { r.monto = n.valor; r._crudo = tok; if (n.moneda) r.moneda = n.moneda; continue }
    }
    // tarjeta por nombre: "galicia", "naranja", "visa"
    if (tok.length >= 3) {
      const tj = tarjetas.find((x) => norm(x.alias).split(/\s+/).some((p) => p.length >= 3 && p.startsWith(tok)))
      if (tj) { r.medio = 't:' + tj.id; continue }
    }
    if (PALABRA_TARJETA.includes(tok)) {
      if (tarjetas[0]) r.medio = 't:' + tarjetas[0].id
      continue
    }
    resto.push(tok)
  }

  // Si era "9.99" y resultó ser en dólares, lo leemos con decimales
  if (r._crudo && r.moneda && r.moneda !== 'ARS' && /^\d+\.\d{3}$/.test(r._crudo) === false) {
    const n = parseFloat(r._crudo.replace(/[^\d.,]/g, '').replace(',', '.'))
    if (Number.isFinite(n) && n > 0 && /^\d+[.,]\d{1,2}$/.test(r._crudo)) r.monto = n
  }
  delete r._crudo

  const texto2 = resto.join(' ')
  if (texto2) {
    if (r.tipo === 'ingreso') {
      r.concepto = conceptoDe(texto2) || 'Otro'
      r.descripcion = capitalizar(texto2)
    } else {
      let comercio = comercioDe(texto2)
      // Abreviaturas conocidas: "mc" -> McDonald's, "ml" -> Mercado Libre
      if (!comercio && resto.length === 1) {
        const s = sugerencias(texto2, 1)[0]
        if (s && (s._n === texto2 || (s._k || []).includes(texto2))) comercio = s
      }
      if (comercio) {
        r.descripcion = comercio.n
        if (comercio.c && CATEGORIAS.includes(comercio.c)) r.categoria = comercio.c
      } else {
        r.descripcion = capitalizar(texto2)
      }
      if (!r.categoria) {
        const cat = categoriaDe(texto2)
        if (cat) r.categoria = cat
      }
    }
  }
  if (r.cuotas && (r.cuotas < 2 || r.cuotas > 24)) delete r.cuotas
  return r
}