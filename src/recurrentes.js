import { supabase } from './supabaseClient'
import { hoyISO, claveMes, mesDesplazado } from './utils'

const pad = (n) => String(n).padStart(2, '0')

// Fecha del "día X" en un mes dado (si el mes no tiene ese día, usa el último)
function fechaDelMes(anio, mes, dia) {
  const ultimo = new Date(anio, mes + 1, 0).getDate()
  return `${anio}-${pad(mes + 1)}-${pad(Math.min(dia, ultimo))}`
}

// Evita que se ejecute dos veces al mismo tiempo (y cargue duplicados)
let enCurso = null

// Revisa los gastos e ingresos fijos y carga los que ya tocaron y faltan.
// Devuelve cuántos movimientos cargó.
export function generarRecurrentes(usuarioId) {
  if (!enCurso) enCurso = generar(usuarioId).finally(() => { setTimeout(() => { enCurso = null }, 2000) })
  return enCurso
}

async function generar(usuarioId) {
  const { data: fijos, error } = await supabase.from('recurrentes')
    .select('*').eq('usuario_id', usuarioId).eq('activo', true)
  if (error || !fijos || fijos.length === 0) return 0

  const hoy = hoyISO()
  const ahora = new Date()
  const mesActual = claveMes(ahora.getFullYear(), ahora.getMonth())
  let cargados = 0

  for (const f of fijos) {
    let [anio, mes] = (f.ultimo_mes || mesActual).split('-').map(Number)
    let cursor = { anio, mes: mes - 1 }
    let ultimoHecho = f.ultimo_mes
    // Recorre los meses que faltan, hasta el actual
    for (let vuelta = 0; vuelta < 24; vuelta++) {
      cursor = mesDesplazado(cursor.anio, cursor.mes, 1)
      const clave = claveMes(cursor.anio, cursor.mes)
      if (clave > mesActual) break
      const fecha = fechaDelMes(cursor.anio, cursor.mes, f.dia)
      if (fecha > hoy) break
      const comun = { usuario_id: usuarioId, monto: f.monto, fecha, descripcion: f.descripcion, recurrente_id: f.id }
      const { error: e } = f.tipo === 'ingreso'
        ? await supabase.from('ingresos').insert({ ...comun, concepto: f.concepto || 'Otro', medio_cobro: f.medio_cobro || null })
        : await supabase.from('gastos').insert({
          ...comun, categoria_id: f.categoria_id, tarjeta_id: f.tarjeta_id, medio_pago: f.medio_pago || 'efectivo',
        })
      if (e) break
      cargados += 1
      ultimoHecho = clave
    }
    if (ultimoHecho !== f.ultimo_mes) {
      await supabase.from('recurrentes').update({ ultimo_mes: ultimoHecho }).eq('id', f.id)
    }
  }
  return cargados
}