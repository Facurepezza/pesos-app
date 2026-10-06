import { useEffect, useState } from 'react'
import { supabase } from './supabaseClient'
import Avatar from './Avatar'
import Icono from './Iconos'
import { useToast } from './Toast'
import Fijos from './Fijos'
import { plata, claveMes, mesDesplazado, fechaLinda, hoyISO, MESES_LARGO, CATEGORIAS, CONCEPTOS_INGRESO, MEDIOS, MEDIOS_COBRO, escribirMonto, aNumero, montoATexto } from './utils'

export default function Movimientos({ usuarioId, refreshKey, oculto, onCambio }) {
  const ahora = new Date()
  const [sel, setSel] = useState({ anio: ahora.getFullYear(), mes: ahora.getMonth() })
  const [vista, setVista] = useState('todo') // todo | gastos | ingresos
  const [filtroMedio, setFiltroMedio] = useState('')
  const [busqueda, setBusqueda] = useState('')
  const [gastos, setGastos] = useState([])
  const [ingresos, setIngresos] = useState([])
  const [cargando, setCargando] = useState(true)
  const [recarga, setRecarga] = useState(0)
  const [abierto, setAbierto] = useState(null) // id de la fila con acciones abiertas
  const [editando, setEditando] = useState(null)
  const [verFijos, setVerFijos] = useState(false)
  const avisar = useToast()

  const mesKey = claveMes(sel.anio, sel.mes)
  const esActual = mesKey === claveMes(ahora.getFullYear(), ahora.getMonth())

  useEffect(() => {
    async function cargar() {
      setCargando(true)
      const desde = `${mesKey}-01`
      const sig = mesDesplazado(sel.anio, sel.mes, 1)
      const hasta = `${claveMes(sig.anio, sig.mes)}-01`
      const [g, i] = await Promise.all([
        supabase.from('gastos')
          .select('id, monto, fecha, descripcion, medio_pago, moneda, monto_original, categoria_id, tarjeta_id, compra_id, cuota_num, cuotas_total, recurrente_id, categorias(nombre), tarjetas(alias)')
          .eq('usuario_id', usuarioId).gte('fecha', desde).lt('fecha', hasta).order('fecha', { ascending: false }),
        supabase.from('ingresos')
          .select('id, monto, fecha, concepto, descripcion, recurrente_id, medio_cobro')
          .eq('usuario_id', usuarioId).gte('fecha', desde).lt('fecha', hasta).order('fecha', { ascending: false }),
      ])
      setGastos(g.data || [])
      setIngresos(i.data || [])
      setCargando(false)
    }
    cargar()
  }, [usuarioId, refreshKey, recarga, mesKey, sel.anio, sel.mes])

  const lista = [
    ...(vista === 'ingresos' ? [] : gastos.map((g) => ({
      tipo: 'gasto', id: g.id, key: 'g' + g.id, fecha: g.fecha, raw: g, categoria: g.categorias?.nombre,
      nombre: g.descripcion || g.categorias?.nombre || 'Gasto',
      detalle: [
        g.categorias?.nombre,
        g.tarjetas?.alias || MEDIOS[g.medio_pago],
        g.cuotas_total > 1 ? `cuota ${g.cuota_num} de ${g.cuotas_total}` : null,
        g.recurrente_id ? 'fijo' : null,
        g.moneda !== 'ARS' && g.monto_original ? plata(g.monto_original, oculto, g.moneda) : null,
      ].filter(Boolean).join(' · '),
      monto: -Number(g.monto), moneda: g.moneda, medio: g.tarjeta_id ? 't:' + g.tarjeta_id : g.medio_pago,
    }))),
    ...(vista === 'gastos' ? [] : ingresos.map((i) => ({
      tipo: 'ingreso', id: i.id, key: 'i' + i.id, fecha: i.fecha, raw: i, categoria: i.concepto,
      nombre: i.descripcion || i.concepto, detalle: ['Ingreso', i.concepto, MEDIOS_COBRO[i.medio_cobro], i.recurrente_id ? 'fijo' : null].filter(Boolean).join(' · '), monto: Number(i.monto), medio: 'ingreso',
    }))),
  ]
    .filter((m) => !filtroMedio || (filtroMedio === 'tarjeta' ? m.medio.startsWith('t:') || m.medio === 'tarjeta' : m.medio === filtroMedio))
    .filter((m) => !busqueda.trim() || `${m.nombre} ${m.detalle}`.toLowerCase().includes(busqueda.trim().toLowerCase()))
    .sort((a, b) => (a.fecha < b.fecha ? 1 : -1))

  // Agrupar por día
  const grupos = []
  lista.forEach((m) => {
    const ultimo = grupos[grupos.length - 1]
    if (ultimo && ultimo.fecha === m.fecha) ultimo.items.push(m)
    else grupos.push({ fecha: m.fecha, items: [m] })
  })

  const totalGastos = lista.filter((m) => m.monto < 0).reduce((a, m) => a - m.monto, 0)
  const totalIngresos = lista.filter((m) => m.monto > 0).reduce((a, m) => a + m.monto, 0)
  const hoy = hoyISO()

  // Descarga lo que se ve en pantalla como archivo que abre Excel
  function exportar() {
    const sep = ';'
    const celda = (v) => {
      const t = String(v ?? '')
      return /[;"\n]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t
    }
    const numero = (n) => Number(n).toFixed(2).replace('.', ',')
    const filas = [['Fecha', 'Tipo', 'Detalle', 'Categoría', 'Medio de pago o cobro', 'Cuota', 'Moneda original', 'Monto original', 'Monto en pesos']]
    lista.forEach((m) => {
      const g = m.raw
      filas.push([
        m.fecha.split('-').reverse().join('/'),
        m.tipo === 'gasto' ? 'Gasto' : 'Ingreso',
        m.nombre,
        m.tipo === 'gasto' ? g.categorias?.nombre || '' : g.concepto,
        m.tipo === 'gasto' ? g.tarjetas?.alias || MEDIOS[g.medio_pago] || '' : MEDIOS_COBRO[g.medio_cobro] || '',
        m.tipo === 'gasto' && g.cuotas_total > 1 ? `${g.cuota_num}/${g.cuotas_total}` : '',
        m.tipo === 'gasto' ? g.moneda || 'ARS' : 'ARS',
        m.tipo === 'gasto' && g.monto_original ? numero(g.monto_original) : '',
        numero(m.monto),
      ])
    })
    const csv = '\uFEFF' + filas.map((f) => f.map(celda).join(sep)).join('\r\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `PESOS_movimientos_${MESES_LARGO[sel.mes]}_${sel.anio}.csv`
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  }

  // Borra al toque y deja 6 segundos para "Deshacer" (vuelve a cargar lo borrado)
  async function eliminar(m) {
    const tabla = m.tipo === 'gasto' ? 'gastos' : 'ingresos'
    const esCompra = m.tipo === 'gasto' && m.raw.compra_id
    const consulta = esCompra
      ? supabase.from('gastos').delete().eq('compra_id', m.raw.compra_id)
      : supabase.from(tabla).delete().eq('id', m.id)
    const { data, error } = await consulta.select('*')
    if (error || !data || data.length === 0) {
      avisar(error?.message || 'No se pudo eliminar. Revisá los permisos en Supabase.', { tipo: 'error' })
      return
    }
    setAbierto(null)
    setRecarga((r) => r + 1)
    if (onCambio) onCambio()
    avisar(esCompra ? `Borraste las ${data.length} cuotas de "${m.nombre}"` : `Borraste "${m.nombre}"`, {
      accion: {
        label: 'Deshacer',
        fn: async () => {
          const filas = data.map(({ id, created_at, ...resto }) => resto)
          const { error: e } = await supabase.from(tabla).insert(filas)
          if (e) return avisar('No se pudo deshacer: ' + e.message, { tipo: 'error' })
          setRecarga((r) => r + 1)
          if (onCambio) onCambio()
          avisar('Listo, volvió a su lugar ✓')
        },
      },
    })
  }

  return (
    <div className="pz-screen">
      <header className="pz-top">
        <h1 className="pz-h1">Movimientos</h1>
        <div className="pz-mes">
          <button type="button" className="pz-icon-btn pz-icon-chico" onClick={() => setSel(mesDesplazado(sel.anio, sel.mes, -1))} aria-label="Mes anterior">
            <Icono nombre="izq" size={18} />
          </button>
          <span>{MESES_LARGO[sel.mes]}</span>
          <button type="button" className="pz-icon-btn pz-icon-chico" onClick={() => setSel(mesDesplazado(sel.anio, sel.mes, 1))} disabled={esActual} aria-label="Mes siguiente">
            <Icono nombre="der" size={18} />
          </button>
        </div>
      </header>

      <div className="pz-seg pz-seg-3">
        {[['todo', 'Todo'], ['gastos', 'Gastos'], ['ingresos', 'Ingresos']].map(([k, l]) => (
          <button key={k} type="button" className={vista === k ? 'on' : ''} onClick={() => setVista(k)}>{l}</button>
        ))}
      </div>

      <label className="pz-buscar">
        <Icono nombre="buscar" size={18} />
        <input type="search" placeholder="Buscar un gasto o comercio" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} aria-label="Buscar" />
      </label>

      {vista !== 'ingresos' && (
        <div className="pz-chips pz-chips-scroll">
          {[['', 'Todos'], ['tarjeta', 'Tarjeta'], ['mercado_pago', 'Mercado Pago'], ['efectivo', 'Efectivo']].map(([k, l]) => (
            <button key={k} type="button" className={`pz-chip ${filtroMedio === k ? 'on' : ''}`} onClick={() => setFiltroMedio(k)}>{l}</button>
          ))}
        </div>
      )}

      <div className="pz-dos">
        <button type="button" className="pz-btn pz-btn-claro" onClick={() => setVerFijos(true)}>
          <Icono nombre="repetir" size={16} /> Fijos del mes
        </button>
        <button type="button" className="pz-btn pz-btn-claro" onClick={exportar} disabled={lista.length === 0}>
          <Icono nombre="descargar" size={16} /> Excel
        </button>
      </div>

      <div className="pz-totales">
        {vista !== 'gastos' && <div><span>Entró</span><b className="pos">+ {plata(totalIngresos, oculto)}</b></div>}
        {vista !== 'ingresos' && <div><span>Salió</span><b>- {plata(totalGastos, oculto)}</b></div>}
      </div>

      <section className="pz-card pz-card-lista">
        {cargando && <p className="pz-vacio">Cargando...</p>}
        {!cargando && grupos.length === 0 && <p className="pz-vacio">No hay movimientos en {MESES_LARGO[sel.mes]}.</p>}
        {grupos.map((gr) => (
          <div key={gr.fecha}>
            <div className="pz-dia">{gr.fecha === hoy ? 'Hoy' : fechaLinda(gr.fecha)}{gr.fecha > hoy ? ' · programado' : ''}</div>
            {gr.items.map((m) => (
              <div key={m.key}>
                <button type="button" className="pz-fila pz-fila-btn" onClick={() => setAbierto(abierto === m.key ? null : m.key)} aria-expanded={abierto === m.key}>
                  <Avatar nombre={m.nombre} categoria={m.categoria} />
                  <span className="pz-fila-txt">
                    <b>{m.nombre}{m.moneda && m.moneda !== 'ARS' && <span className="pz-tag">{m.moneda}</span>}</b>
                    <span>{m.detalle}</span>
                  </span>
                  <span className={`pz-monto ${m.monto > 0 ? 'pos' : ''}`}>{m.monto > 0 ? '+ ' : '- '}{plata(Math.abs(m.monto), oculto)}</span>
                </button>
                {abierto === m.key && (
                  <div className="pz-acciones">
                    <button type="button" className="pz-btn pz-btn-claro" onClick={() => setEditando(m)}><Icono nombre="editar" size={16} /> Editar</button>
                    <button type="button" className="pz-btn pz-btn-peligro" onClick={() => eliminar(m)}><Icono nombre="basura" size={16} /> Eliminar</button>
                  </div>
                )}
              </div>
            ))}
          </div>
        ))}
      </section>

      {verFijos && (
        <Fijos usuarioId={usuarioId} oculto={oculto} onCerrar={() => setVerFijos(false)} onCambio={onCambio} />
      )}

      {editando && (
        <EditarMovimiento usuarioId={usuarioId} mov={editando} onCerrar={() => setEditando(null)}
          onGuardado={() => { setEditando(null); setAbierto(null); avisar('Cambios guardados ✓'); setRecarga((r) => r + 1); if (onCambio) onCambio() }} />
      )}
    </div>
  )
}

function EditarMovimiento({ usuarioId, mov, onCerrar, onGuardado }) {
  const esGasto = mov.tipo === 'gasto'
  const r = mov.raw
  const [monto, setMonto] = useState(montoATexto(r.monto))
  const [descripcion, setDescripcion] = useState(r.descripcion || '')
  const [fecha, setFecha] = useState(r.fecha)
  const [categoria, setCategoria] = useState(esGasto ? r.categorias?.nombre || '' : '')
  const [concepto, setConcepto] = useState(esGasto ? '' : r.concepto)
  const [medioCobro, setMedioCobro] = useState(esGasto ? '' : r.medio_cobro || '')
  const [error, setError] = useState(null)
  const [guardando, setGuardando] = useState(false)

  async function guardar() {
    const valor = aNumero(monto)
    if (!valor || valor <= 0) return setError('El monto tiene que ser mayor a 0.')
    setGuardando(true)
    setError(null)
    try {
      let cambios
      if (esGasto) {
        let categoriaId = null
        if (categoria) {
          const { data: ex } = await supabase.from('categorias').select('id').eq('usuario_id', usuarioId).ilike('nombre', categoria).maybeSingle()
          if (ex) categoriaId = ex.id
          else {
            const { data: nueva, error: e } = await supabase.from('categorias').insert({ usuario_id: usuarioId, nombre: categoria }).select('id').single()
            if (e) throw e
            categoriaId = nueva.id
          }
        }
        cambios = { monto: valor, fecha, descripcion: descripcion.trim() || null, categoria_id: categoriaId }
      } else {
        cambios = { monto: valor, fecha, descripcion: descripcion.trim() || null, concepto, medio_cobro: medioCobro || null }
      }
      const { data, error: e } = await supabase.from(esGasto ? 'gastos' : 'ingresos').update(cambios).eq('id', mov.id).select('id')
      if (e) throw e
      if (!data || data.length === 0) throw new Error('No se pudo guardar. Revisá los permisos en Supabase.')
      onGuardado()
    } catch (e) {
      setError(e.message)
      setGuardando(false)
    }
  }

  return (
    <div className="pz-sheet-fondo" onClick={onCerrar}>
      <section className="pz-sheet" role="dialog" aria-modal="true" aria-label="Editar movimiento" onClick={(e) => e.stopPropagation()}>
        <div className="pz-sheet-manija" />
        <div className="pz-top">
          <h2 className="pz-h2">Editar {esGasto ? 'gasto' : 'ingreso'}</h2>
          <button type="button" className="pz-icon-btn" onClick={onCerrar} aria-label="Cerrar"><Icono nombre="cerrar" size={18} /></button>
        </div>
        {esGasto && r.cuotas_total > 1 && (
          <p className="pz-sub">Estás editando solo la cuota {r.cuota_num} de {r.cuotas_total}.</p>
        )}
        <div className="pz-campo">
          <label className="pz-label" htmlFor="ed-monto">Monto en pesos</label>
          <input id="ed-monto" className="pz-input" type="text" inputMode="decimal" value={monto} onChange={(e) => setMonto(escribirMonto(e.target.value))} />
        </div>
        <div className="pz-campo">
          <label className="pz-label" htmlFor="ed-desc">{esGasto ? '¿En qué?' : '¿De dónde?'}</label>
          <div className="pz-input-logo">
            <Avatar nombre={descripcion || categoria || concepto || '?'} size={34} />
            <input id="ed-desc" value={descripcion} onChange={(e) => setDescripcion(e.target.value)} />
          </div>
        </div>
        <div className="pz-campo">
          <span className="pz-label">{esGasto ? 'Categoría' : 'Concepto'}</span>
          <div className="pz-chips">
            {(esGasto ? CATEGORIAS : CONCEPTOS_INGRESO).map((c) => (
              <button key={c} type="button" className={`pz-chip ${(esGasto ? categoria : concepto) === c ? 'on' : ''}`}
                onClick={() => (esGasto ? setCategoria(categoria === c ? '' : c) : setConcepto(c))}>{c}</button>
            ))}
          </div>
        </div>
        {!esGasto && (
          <div className="pz-campo">
            <span className="pz-label">Cómo te pagaron</span>
            <div className="pz-chips">
              {Object.entries(MEDIOS_COBRO).map(([k, l]) => (
                <button key={k} type="button" className={`pz-chip ${medioCobro === k ? 'on' : ''}`} onClick={() => setMedioCobro(k)}>{l}</button>
              ))}
            </div>
          </div>
        )}
        <div className="pz-campo">
          <label className="pz-label" htmlFor="ed-fecha">Fecha</label>
          <input id="ed-fecha" className="pz-input" type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} />
        </div>
        {error && <p className="pz-error">{error}</p>}
        <button type="button" className="pz-btn pz-btn-primario pz-btn-grande" onClick={guardar} disabled={guardando}>
          {guardando ? 'Guardando...' : 'Guardar cambios'}
        </button>
      </section>
    </div>
  )
}