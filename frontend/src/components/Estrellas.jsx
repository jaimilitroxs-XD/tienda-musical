import React, { useState } from 'react'

const COLOR = '#f6c23e'


export function Estrellas({ valor = 0, tamano = '1rem', className = '' }) {
  const v = Number(valor) || 0
  return (
    <span className={`d-inline-flex gap-1 ${className}`} style={{ color: COLOR, fontSize: tamano }} role="img" aria-label={`${v.toLocaleString('es-CL')} de 5 estrellas`}>
      {[1, 2, 3, 4, 5].map(i => (
        <i
          key={i}
          aria-hidden="true"
          className={v >= i ? 'fa-solid fa-star' : v >= i - 0.5 ? 'fa-solid fa-star-half-stroke' : 'fa-regular fa-star'}
          style={v < i - 0.5 ? { opacity: 0.55 } : undefined}
        ></i>
      ))}
    </span>
  )
}

const TEXTOS = ['', 'Muy malo', 'Malo', 'Regular', 'Bueno', 'Excelente']


export function SelectorEstrellas({ valor, onCambiar, nombre = 'calificacion' }) {
  const [hover, setHover] = useState(0)
  const mostrado = hover || valor
  return (
    <div className="d-flex align-items-center gap-2">
      <div role="radiogroup" aria-label="Calificación" className="selector-estrellas" onMouseLeave={() => setHover(0)}>
        {[1, 2, 3, 4, 5].map(i => (
          <label key={i} onMouseEnter={() => setHover(i)} title={TEXTOS[i]}>
            <input type="radio" name={nombre} value={i} checked={valor === i} onChange={() => onCambiar(i)} className="visually-hidden" />
            <i className={`${mostrado >= i ? 'fa-solid' : 'fa-regular'} fa-star`} style={{ color: COLOR }} aria-hidden="true"></i>
            <span className="visually-hidden">{i} {i === 1 ? 'estrella' : 'estrellas'} ({TEXTOS[i]})</span>
          </label>
        ))}
      </div>
      <span className="small text-secondary" aria-live="polite">{TEXTOS[mostrado] || 'Elige una calificación'}</span>
    </div>
  )
}
