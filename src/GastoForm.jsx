import { useState } from 'react'
import { supabase } from './supabaseClient'

const hoy = () => new Date().toISOString().split('T')[0]

export default function GastoForm({ usuarioId, onGuardado }) {
  const [monto, setMonto] = useState('')
  const [fecha, setFecha] = useState(hoy())
  const [categoria, setCategoria] = useState('')
  const [medioPago, setMedioPago] = useState('efectivo')
  const [tarjetaAlias, setTarjetaAlias] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [mensaje, setMensaje] = useState(null)

  async function obtenerOCrearCategoria(nombre) {
    const nombreLimpio = nombre.trim()
    const { data: existente } = await supabase
      .from('categorias')
      .select('id')
      .eq('usuario_id', usuarioId)
      .ilike('nombre', nombreLimpio)
      .maybeSingle()

    if (existente) return existente.id

    const { data: nueva, error } = await supabase
      .from('categorias')
      .insert({ usuario_id: usuarioId, nombre: nombreLimpio })
      .select('id')
      .single()

    if (error) throw error
    return nueva.id
  }

  async function obtenerOCrearTarjeta(alias) {
    const aliasLimpio = alias.trim()
    const { data: existente } = await supabase
      .from('tarjetas')
      .select('id')
      .eq('usuario_id', usuarioId)
      .ilike('alias', aliasLimpio)
      .maybeSingle()

    if (existente) return existente.id

    const { data: nueva, error } = await supabase
      .from('tarjetas')
      .insert({ usuario_id: usuarioId, alias: aliasLimpio, tipo: 'credito' })
      .select('id')
      .single()

    if (error) throw error
    return nueva.id
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setGuardando(true)
    setMensaje(null)

    try {
      const categoriaId = categoria.trim() ? await obtenerOCrearCategoria(categoria) : null
      const tarjetaId =
        medioPago === 'tarjeta' && tarjetaAlias.trim()
          ? await obtenerOCrearTarjeta(tarjetaAlias)
          : null

      const { error } = await supabase.from('gastos').insert({
        usuario_id: usuarioId,
        categoria_id: categoriaId,
        tarjeta_id: tarjetaId,
        monto: parseFloat(monto),
        fecha,
        medio_pago: medioPago,
      })

      if (error) throw error

      setMensaje({
        tipo: 'ok',
        texto: `Gasto guardado: $${monto} en "${categoria || 'sin categoría'}" (${medioPago}).`,
      })
      setMonto('')
      setCategoria('')
      setTarjetaAlias('')

      if (onGuardado) onGuardado()
    } catch (err) {
      setMensaje({ tipo: 'error', texto: err.message })
    }

    setGuardando(false)
  }

  return (
    <form onSubmit={handleSubmit} className="gasto-form">
      <h2>Cargar un gasto</h2>

      <label>Monto</label>
      <input type="number" step="0.01" value={monto} onChange={(e) => setMonto(e.target.value)} placeholder="0.00" required />

      <label>Fecha</label>
      <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} required />

      <label>Categoría</label>
      <input type="text" value={categoria} onChange={(e) => setCategoria(e.target.value)} placeholder="Comida, transporte, otros..." />

      <label>Medio de pago</label>
      <select value={medioPago} onChange={(e) => setMedioPago(e.target.value)}>
        <option value="efectivo">Efectivo</option>
        <option value="mercado_pago">Mercado Pago</option>
        <option value="tarjeta">Tarjeta</option>
      </select>

      {medioPago === 'tarjeta' && (
        <>
          <label>Tarjeta</label>
          <input type="text" value={tarjetaAlias} onChange={(e) => setTarjetaAlias(e.target.value)} placeholder="Visa Santander, Naranja X..." />
        </>
      )}

      <button type="submit" disabled={guardando}>
        {guardando ? 'Guardando...' : 'Guardar gasto'}
      </button>

      {mensaje && <p className={mensaje.tipo === 'error' ? 'msg-error' : 'msg-ok'}>{mensaje.texto}</p>}
    </form>
  )
}