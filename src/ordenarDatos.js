import { supabase } from './supabaseClient'
import { comercioDe } from './comercios'
import { CATEGORIAS } from './utils'

// Palabras sueltas que la gente usaba como "categoría" -> categoría correcta
const PALABRAS = [
  [['nafta', 'combustible', 'peaje', 'estacionamiento', 'colectivo', 'taxi', 'remis', 'subte', 'tren', 'auto'], 'Transporte'],
  [['luz', 'gas', 'agua', 'internet', 'celular', 'telefono', 'cable', 'impuesto', 'abl', 'patente', 'servicio'], 'Servicios'],
  [['super', 'supermercado', 'almacen', 'verduleria', 'carniceria', 'chino', 'mercado'], 'Súper'],
  [['comida', 'delivery', 'resto', 'restaurante', 'almuerzo', 'cena', 'cafe', 'helado', 'pizza', 'hamburguesa'], 'Comida'],
  [['salida', 'salidas', 'bar', 'boliche', 'cine', 'teatro', 'recital', 'cumple', 'cumpleaños', 'joda'], 'Salidas'],
  [['farmacia', 'medico', 'prepaga', 'obra social', 'dentista', 'gimnasio', 'gym', 'salud'], 'Salud'],
  [['ropa', 'zapatillas', 'zapatos', 'remera', 'pantalon'], 'Ropa'],
  [['alquiler', 'expensas', 'hogar', 'casa', 'muebles', 'limpieza'], 'Hogar'],
  [['viaje', 'vuelo', 'hotel', 'pasaje', 'vacaciones'], 'Viajes'],
  [['curso', 'facultad', 'colegio', 'libro', 'educacion'], 'Educación'],
  [['seguro', 'seguros'], 'Seguros'],
  [['suscripcion', 'suscripciones', 'netflix', 'spotify'], 'Suscripciones'],
  [['tecnologia', 'celu', 'computadora', 'notebook'], 'Tecnología'],
]

const norm = (t) => (t || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim()

function destinoDe(nombre) {
  const n = norm(nombre)
  const estandar = CATEGORIAS.find((c) => norm(c) === n)
  if (estandar) return { categoria: estandar, descripcion: null }
  const comercio = comercioDe(nombre)
  if (comercio && comercio.c) return { categoria: comercio.c, descripcion: comercio.n }
  for (const [palabras, cat] of PALABRAS) {
    if (palabras.some((p) => n.includes(p))) return { categoria: cat, descripcion: nombre }
  }
  return { categoria: 'Otros', descripcion: nombre }
}

// Se ejecuta una sola vez por usuario: pasa los comercios que estaban cargados
// como "categoría" (por ejemplo McDonald's) a la descripción, y les pone la categoría correcta (Comida).
export async function ordenarDatos(usuarioId) {
  const clave = `pesos_orden_v1_${usuarioId}`
  try { if (localStorage.getItem(clave)) return false } catch { /* sigue */ }

  const { data: cats, error } = await supabase.from('categorias').select('id, nombre').eq('usuario_id', usuarioId)
  if (error || !cats) return false

  const idPorNombre = Object.fromEntries(cats.map((c) => [c.nombre, c.id]))
  let cambios = false

  async function idDe(nombre) {
    if (idPorNombre[nombre]) return idPorNombre[nombre]
    const { data } = await supabase.from('categorias').insert({ usuario_id: usuarioId, nombre }).select('id').single()
    if (data) idPorNombre[nombre] = data.id
    return data?.id || null
  }

  for (const c of cats) {
    if (CATEGORIAS.includes(c.nombre)) continue
    const destino = destinoDe(c.nombre)
    const nuevoId = await idDe(destino.categoria)
    if (!nuevoId || nuevoId === c.id) continue
    if (destino.descripcion) {
      await supabase.from('gastos').update({ descripcion: destino.descripcion })
        .eq('usuario_id', usuarioId).eq('categoria_id', c.id).is('descripcion', null)
    }
    await supabase.from('gastos').update({ categoria_id: nuevoId }).eq('usuario_id', usuarioId).eq('categoria_id', c.id)
    await supabase.from('suscripciones').update({ categoria_id: nuevoId }).eq('usuario_id', usuarioId).eq('categoria_id', c.id)
    await supabase.from('categorias').delete().eq('id', c.id)
    cambios = true
  }

  try { localStorage.setItem(clave, 'si') } catch { /* nada */ }
  return cambios
}