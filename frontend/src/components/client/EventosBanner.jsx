import React, { useEffect, useRef, useState } from 'react'
import { leerCompartido } from '../../consultas'
import { useNavigate } from 'react-router-dom'
import { TIPOS_EVENTO, beneficioEvento, fechaCorta, fechaHora } from '../../eventos'

const INTERVALO_MS = 6000


function textoFecha(e) {
  if (e.tipo_evento === 'en_vivo') return fechaHora(e.fecha_inicio, { weekday: 'long' })
  if (e.estado === 'programado') return `Desde el ${fechaCorta(e.fecha_inicio)}`
  return `Hasta el ${fechaCorta(e.fecha_fin)}`
}


export function EventosBanner() {
  const [eventos, setEventos] = useState([])
  const [actual, setActual] = useState(0)
  const [pausado, setPausado] = useState(false)
  const navigate = useNavigate()
  const sinMovimiento = useRef(typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches)

  useEffect(() => {
    let activo = true
    const cargar = () => leerCompartido('/api/eventos/', { page: 1, page_size: 8 })
      .then(({ data }) => { if (activo) setEventos(data.results || []) })
      .catch(() => { if (activo) setEventos([]) })
    cargar()
    window.addEventListener('catalogo-actualizado', cargar)
    return () => { activo = false; window.removeEventListener('catalogo-actualizado', cargar) }
  }, [])

  
  useEffect(() => {
    if (eventos.length < 2 || pausado || sinMovimiento.current) return
    const t = setInterval(() => setActual(i => (i + 1) % eventos.length), INTERVALO_MS)
    return () => clearInterval(t)
  }, [eventos.length, pausado])

  if (!eventos.length) return null
  const indice = actual % eventos.length
  const ir = (n) => setActual((n + eventos.length) % eventos.length)

  return (
    <section
      className="tienda-eventos"
      aria-roledescription="carrusel"
      aria-label="Eventos y promociones"
      onMouseEnter={() => setPausado(true)}
      onMouseLeave={() => setPausado(false)}
      onFocus={() => setPausado(true)}
      onBlur={() => setPausado(false)}
    >
      <div className="tienda-eventos-pista" style={{ transform: `translateX(-${indice * 100}%)` }}>
        {eventos.map((e, i) => {
          const tipo = TIPOS_EVENTO[e.tipo_evento] || {}
          return (
            <article
              key={e.id}
              className="tienda-evento"
              aria-roledescription="diapositiva"
              aria-label={`${i + 1} de ${eventos.length}: ${e.titulo}`}
              aria-hidden={i !== indice}
              style={{
                '--evento-color': tipo.color,
                backgroundImage: e.imagen_banner
                  ? `linear-gradient(90deg, rgba(10,10,14,.92) 0%, rgba(10,10,14,.65) 45%, rgba(10,10,14,.15) 100%), url(${e.imagen_banner})`
                  : undefined,
              }}
            >
              <div className="tienda-evento-contenido">
                <span className="tienda-evento-tipo">
                  <i className={`fa-solid ${tipo.icono}`} aria-hidden="true"></i>{tipo.corta}
                  {e.estado === 'programado' && <span className="tienda-evento-pronto">Próximamente</span>}
                </span>
                <h2>{e.titulo}</h2>
                <p className="tienda-evento-beneficio">{beneficioEvento(e)}</p>
                <p className="tienda-evento-fecha"><i className="fa-regular fa-calendar me-2" aria-hidden="true"></i>{textoFecha(e)}</p>
                <button type="button" className="tienda-boton-primario" tabIndex={i === indice ? 0 : -1} onClick={() => navigate(`/eventos/${e.id}`)}>
                  {e.tipo_evento === 'en_vivo' ? 'Ver evento' : 'Ver productos'}
                  <i className="fa-solid fa-arrow-right ms-2" aria-hidden="true"></i>
                </button>
              </div>
              {!e.imagen_banner && <i className={`fa-solid ${tipo.icono} tienda-evento-icono`} aria-hidden="true"></i>}
            </article>
          )
        })}
      </div>

      {eventos.length > 1 && (
        <>
          <button type="button" className="tienda-eventos-flecha izquierda" onClick={() => ir(indice - 1)} aria-label="Evento anterior">
            <i className="fa-solid fa-chevron-left"></i>
          </button>
          <button type="button" className="tienda-eventos-flecha derecha" onClick={() => ir(indice + 1)} aria-label="Evento siguiente">
            <i className="fa-solid fa-chevron-right"></i>
          </button>
          <div className="tienda-eventos-puntos">
            {eventos.map((e, i) => (
              <button key={e.id} type="button" className={i === indice ? 'activo' : ''} onClick={() => ir(i)} aria-label={`Ir al evento ${i + 1}`} aria-current={i === indice} />
            ))}
          </div>
        </>
      )}
    </section>
  )
}
