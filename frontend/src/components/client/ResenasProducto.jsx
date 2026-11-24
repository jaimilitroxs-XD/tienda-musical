import React, { useCallback, useEffect, useRef, useState } from 'react'
import axios from 'axios'
import { Estrellas, SelectorEstrellas } from '../Estrellas'
import { Paginador } from '../Paginador'

const fecha = (iso) => new Date(iso).toLocaleDateString('es-CL', { day: 'numeric', month: 'long', year: 'numeric' })
const vacio = { calificacion: 0, titulo: '', comentario: '' }
const mensajeError = (e, porDefecto) => {
  const d = e.response?.data
  if (!d) return porDefecto
  if (d.error || d.detail) return d.error || d.detail
  return Object.values(d).flat().join(' ') || porDefecto
}


export function ResenasProducto({ productoId, onIniciarSesion, onCambioResumen }) {
  const [datos, setDatos] = useState(null)
  const [pagina, setPagina] = useState(1)
  const [orden, setOrden] = useState('recientes')
  const [error, setError] = useState('')
  const [form, setForm] = useState(vacio)
  const [editando, setEditando] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [errorForm, setErrorForm] = useState('')
  // El ref evita recargas repetidas.
  const avisarResumen = useRef(onCambioResumen)
  avisarResumen.current = onCambioResumen

  const cargar = useCallback(async () => {
    try {
      const { data } = await axios.get(`/api/productos/${productoId}/resenas/`, { params: { page: pagina, orden } })
      setDatos(data)
      setError('')
      avisarResumen.current?.(data.resumen)
    } catch {
      setError('No se pudieron cargar las reseñas.')
    }
  }, [productoId, pagina, orden])

  useEffect(() => { cargar() }, [cargar])
  useEffect(() => { setPagina(1) }, [orden, productoId])

  const enviar = async (e) => {
    e.preventDefault()
    if (!form.calificacion) return setErrorForm('Elige de 1 a 5 estrellas.')
    setGuardando(true)
    setErrorForm('')
    try {
      if (editando && datos?.mi_resena) await axios.patch(`/api/resenas/${datos.mi_resena.id}/`, form)
      else await axios.post(`/api/productos/${productoId}/resenas/`, form)
      setForm(vacio)
      setEditando(false)
      setPagina(1)
      await cargar()
    } catch (err) {
      setErrorForm(mensajeError(err, 'No se pudo guardar tu reseña.'))
    } finally {
      setGuardando(false)
    }
  }

  const eliminarMia = async () => {
    if (!window.confirm('¿Eliminar tu reseña?')) return
    try {
      await axios.delete(`/api/resenas/${datos.mi_resena.id}/`)
      await cargar()
    } catch (err) {
      setError(mensajeError(err, 'No se pudo eliminar la reseña.'))
    }
  }

  const moderar = async (r) => {
    try {
      await axios.patch(`/api/resenas/${r.id}/`, { visible: !r.visible })
      await cargar()
    } catch (err) {
      setError(mensajeError(err, 'No se pudo moderar la reseña.'))
    }
  }

  if (!datos) {
    return error
      ? <p role="alert" className="text-danger small mb-0">{error}</p>
      : <p role="status" className="text-muted small mb-0">Cargando reseñas…</p>
  }

  const { resumen, mi_resena: mia } = datos
  const mostrarFormulario = datos.puede_resenar && (!mia || editando)

  return (
    <div className="resenas">
      {error && <p role="alert" className="alert alert-danger py-2 small">{error}</p>}

      <div className="row g-4 mb-4">
        
        <div className="col-md-4">
          <div className="d-flex align-items-center gap-3 mb-2">
            <span className="display-6 fw-bold text-body">{resumen.promedio != null ? resumen.promedio.toLocaleString('es-CL', { minimumFractionDigits: 1 }) : '–'}</span>
            <div>
              <Estrellas valor={resumen.promedio || 0} tamano="1.1rem" />
              <div className="small text-muted">{resumen.total} {resumen.total === 1 ? 'reseña' : 'reseñas'}</div>
            </div>
          </div>
          {/* Muestra las calificaciones de 5 a 1. */}
          {[5, 4, 3, 2, 1].map(estrellas => [estrellas, resumen.distribucion[estrellas] || 0]).map(([estrellas, n]) => (
            <div key={estrellas} className="d-flex align-items-center gap-2 small mb-1">
              <span className="text-nowrap text-muted" style={{ width: '2.2rem' }}>{estrellas} <i className="fa-solid fa-star" style={{ color: '#f6c23e', fontSize: '.7rem' }}></i></span>
              <div className="progress flex-grow-1" style={{ height: '.45rem' }} role="progressbar" aria-label={`${n} reseñas de ${estrellas} estrellas`} aria-valuenow={n} aria-valuemin="0" aria-valuemax={resumen.total}>
                <div className="progress-bar" style={{ width: `${resumen.total ? (n / resumen.total) * 100 : 0}%`, background: '#f6c23e' }} />
              </div>
              <span className="text-muted text-end" style={{ width: '1.5rem' }}>{n}</span>
            </div>
          ))}
        </div>

        
        <div className="col-md-8">
          {mostrarFormulario ? (
            <form onSubmit={enviar} className="resenas-form" noValidate>
              <h3 className="h6 fw-bold mb-2">{editando ? 'Editar tu reseña' : 'Escribe tu reseña'}</h3>
              <SelectorEstrellas valor={form.calificacion} onCambiar={(c) => setForm(f => ({ ...f, calificacion: c }))} />
              <input
                className="form-control form-control-sm mt-2"
                placeholder="Título (opcional), ej: Excelente sonido"
                aria-label="Título de la reseña"
                maxLength={100}
                value={form.titulo}
                onChange={(e) => setForm(f => ({ ...f, titulo: e.target.value }))}
              />
              <textarea
                className="form-control form-control-sm mt-2"
                rows={3}
                placeholder="Cuéntanos qué te pareció (opcional)"
                aria-label="Comentario"
                maxLength={1000}
                value={form.comentario}
                onChange={(e) => setForm(f => ({ ...f, comentario: e.target.value }))}
              />
              <div className="d-flex align-items-center justify-content-between mt-1">
                <small className="text-muted">{form.comentario.length}/1000</small>
                <div className="d-flex gap-2">
                  {editando && <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => { setEditando(false); setForm(vacio); setErrorForm('') }}>Cancelar</button>}
                  <button type="submit" className="tienda-boton-primario px-3 py-2" style={{ flex: 'none' }} disabled={guardando}>
                    {guardando ? 'Publicando…' : editando ? 'Guardar cambios' : 'Publicar reseña'}
                  </button>
                </div>
              </div>
              {errorForm && <p role="alert" className="small text-danger mt-1 mb-0">{errorForm}</p>}
            </form>
          ) : mia ? (
            <div className="resenas-mia">
              <div className="d-flex justify-content-between align-items-start gap-2">
                <div>
                  <span className="badge text-bg-secondary mb-1">Tu reseña</span>
                  <div><Estrellas valor={mia.calificacion} /></div>
                  {mia.titulo && <strong className="d-block mt-1">{mia.titulo}</strong>}
                  {mia.comentario && <p className="small mb-0 mt-1">{mia.comentario}</p>}
                  {!mia.visible && <p className="small text-warning mt-1 mb-0">La tienda ocultó esta reseña.</p>}
                </div>
                <div className="d-flex gap-2 flex-shrink-0">
                  <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => { setEditando(true); setForm({ calificacion: mia.calificacion, titulo: mia.titulo, comentario: mia.comentario }) }}>Editar</button>
                  <button type="button" className="btn btn-sm btn-outline-danger" onClick={eliminarMia} aria-label="Eliminar mi reseña"><i className="fa-solid fa-trash"></i></button>
                </div>
              </div>
            </div>
          ) : !datos.autenticado ? (
            <div className="resenas-invitacion">
              <p className="mb-2">¿Tienes este instrumento? Cuéntale a otros músicos qué te pareció.</p>
              <button type="button" className="tienda-boton-primario px-3 py-2" style={{ flex: 'none' }} onClick={onIniciarSesion}>Inicia sesión para opinar</button>
            </div>
          ) : (
            <div className="resenas-invitacion small text-muted">
              {datos.es_moderador
                ? <><i className="fa-solid fa-shield-halved me-1"></i>Las cuentas del personal no publican reseñas, pero pueden ocultar las inapropiadas.</>
                : 'Las cuentas del personal no publican reseñas de los productos de la tienda.'}
            </div>
          )}
        </div>
      </div>

      
      <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 border-bottom pb-2 mb-3">
        <h3 className="h6 fw-bold mb-0">Opiniones de clientes</h3>
        {datos.count > 1 && (
          <select className="form-select form-select-sm w-auto" aria-label="Ordenar reseñas" value={orden} onChange={(e) => setOrden(e.target.value)}>
            <option value="recientes">Más recientes</option>
            <option value="mejores">Mejor calificadas</option>
            <option value="peores">Peor calificadas</option>
          </select>
        )}
      </div>

      {datos.results.length === 0 ? (
        <p className="text-muted small mb-0">Aún no hay reseñas de este producto.{datos.puede_resenar && !mia ? ' ¡Sé el primero en opinar!' : ''}</p>
      ) : (
        <ul className="list-unstyled mb-0">
          {datos.results.map(r => (
            <li key={r.id} className={`resena-item${r.visible ? '' : ' oculta'}`}>
              <div className="d-flex flex-wrap align-items-center gap-2 mb-1">
                <Estrellas valor={r.calificacion} tamano=".85rem" />
                {r.titulo && <strong className="small">{r.titulo}</strong>}
                {!r.visible && <span className="badge text-bg-warning">Oculta</span>}
              </div>
              <div className="small text-muted mb-1">
                {r.autor} · {fecha(r.creado)}{r.editada ? ' · editada' : ''}
                {r.compra_verificada && <span className="text-success ms-2"><i className="fa-solid fa-circle-check me-1"></i>Compra verificada</span>}
                {r.es_mia && <span className="ms-2">· Tú</span>}
              </div>
              {r.comentario && <p className="small mb-0" style={{ whiteSpace: 'pre-line' }}>{r.comentario}</p>}
              {datos.es_moderador && !r.es_mia && (
                <button type="button" className="btn btn-link btn-sm px-0 mt-1" onClick={() => moderar(r)}>
                  {r.visible ? 'Ocultar reseña' : 'Volver a mostrar'}
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      <Paginador pagina={datos.page} paginas={datos.pages} total={datos.count} tamano={datos.page_size} onCambiar={setPagina} etiqueta="reseñas" />
    </div>
  )
}
