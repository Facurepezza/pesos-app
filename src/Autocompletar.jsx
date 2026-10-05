import { useState } from 'react'
import Avatar from './Avatar'
import { sugerencias } from './comercios'

// Campo de texto con logo y menú desplegable de comercios sugeridos
export default function Autocompletar({ id, value, onChange, onElegir, placeholder, categoria, filtro }) {
  const [abierto, setAbierto] = useState(false)
  const [activo, setActivo] = useState(0)

  let lista = sugerencias(value, 8)
  if (filtro) lista = lista.filter(filtro)
  lista = lista.slice(0, 6)
  const exacto = lista.length === 1 && lista[0].n.toLowerCase() === (value || '').trim().toLowerCase()
  const mostrar = abierto && lista.length > 0 && !exacto

  function elegir(c) {
    onChange(c.n)
    if (onElegir) onElegir(c)
    setAbierto(false)
  }

  function teclas(e) {
    if (!mostrar) return
    if (e.key === 'ArrowDown') { e.preventDefault(); setActivo((a) => Math.min(a + 1, lista.length - 1)) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActivo((a) => Math.max(a - 1, 0)) }
    else if (e.key === 'Enter') { e.preventDefault(); elegir(lista[activo]) }
    else if (e.key === 'Escape') setAbierto(false)
  }

  return (
    <div className="pz-auto">
      <div className="pz-input-logo">
        <Avatar nombre={value || '?'} categoria={categoria} size={34} />
        <input
          id={id}
          value={value}
          placeholder={placeholder}
          autoComplete="off"
          role="combobox"
          aria-expanded={mostrar}
          aria-controls={`${id}-lista`}
          onChange={(e) => { onChange(e.target.value); setAbierto(true); setActivo(0) }}
          onFocus={() => setAbierto(true)}
          onBlur={() => setTimeout(() => setAbierto(false), 120)}
          onKeyDown={teclas}
        />
      </div>
      {mostrar && (
        <ul className="pz-auto-lista" id={`${id}-lista`} role="listbox">
          {lista.map((c, i) => (
            <li key={c.n} role="option" aria-selected={i === activo}>
              <button type="button" className={i === activo ? 'activo' : ''}
                onMouseDown={(e) => e.preventDefault()} onClick={() => elegir(c)}>
                <Avatar nombre={c.n} size={30} />
                <span>{c.n}</span>
                {c.c && <small>{c.c}</small>}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}