import { useEffect, useState } from 'react'
import { supabase } from './supabaseClient'

const hoy = () => new Date().toISOString().split('T')[0]

function diasHasta(fechaISO) {
  const hoyDate = new Date(hoy() + 'T00:00:00')
  const fechaDate = new Date(fechaISO + 'T00:00:00')
  return Math.round((fechaDate - hoyDate) / (1000 * 60 * 60 * 24))
}

export default function AlertaBanner({ usuarioId, refreshKey, onVerDetalle }) {
  const [urgentes, setUrgentes] = useState([])

  useEffect(() => {
    async function cargar() {
      const { data } = await supabase
        .from('suscripciones')
        .select('nombre, proximo_vencimiento')
        .eq('usuario_id', usuarioId)
        .eq('activa', true)

      const conUrgencia = (data || []).filter((s) => diasHasta(s.proximo_vencimiento) <= 3)
      setUrgentes(conUrgencia)
    }
    cargar()
  }, [usuarioId, refreshKey])

  if (urgentes.length === 0) return null

  const primera = urgentes[0]
  const texto =
    urgentes.length === 1
      ? `"${primera.nombre}" vence muy pronto.`
      : `Tenés ${urgentes.length} suscripciones por vencer.`

  return (
    <button className="alerta-banner" onClick={onVerDetalle}>
      ⚠ {texto} Tocá para ver el detalle.
    </button>
  )
}