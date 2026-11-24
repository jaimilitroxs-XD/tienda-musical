import React, { useCallback, useEffect, useState } from 'react'
import axios from 'axios'
import { useListaPaginada } from '../../hooks/useListaPaginada'
import { useDebounce } from '../../hooks/useDebounce'
import { Paginador } from '../Paginador'
import { diaEnChile, validarEvento } from '../../validarEvento'
import {
  CONDICIONES_OUTLET, ESTADOS_EVENTO, TIPOS_EVENTO, beneficioEvento, fechaHora, pesos,
} from '../../eventos'

const EVENTOS_POR_PAGINA = 10


const REQUIERE_PRODUCTOS = ['descuento', 'pack_arriendo', 'preventa', 'outlet']


const paraInput = (iso) => {
  if (!iso) return ''
  const d = new Date(iso)
  const dos = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${dos(d.getMonth() + 1)}-${dos(d.getDate())}T${dos(d.getHours())}:${dos(d.getMinutes())}`
}

function formularioVacio() {
  const inicio = new Date()
  inicio.setMinutes(0, 0, 0)
  inicio.setHours(inicio.getHours() + 1)
  const fin = new Date(inicio)
  fin.setDate(fin.getDate() + 7)
  return {
    id: null, titulo: '', descripcion: '', tipo_evento: 'descuento', activo: true,
    fecha_inicio: paraInput(inicio.toISOString()), fecha_fin: paraInput(fin.toISOString()),
    porcentaje_descuento: '', precio_pack_arriendo: '', artista_invitado: '', lugar_o_link: '',
    fecha_disponibilidad: '', permite_reserva: true, condicion_outlet: '', estado_verificado: false,
    productos: [], imagenArchivo: null, imagenActual: null,
  }
}

function desdeEvento(e) {
  return {
    ...formularioVacio(),
    ...e,
    porcentaje_descuento: Number(e.porcentaje_descuento) ? String(Number(e.porcentaje_descuento)) : '',
    precio_pack_arriendo: e.precio_pack_arriendo ? String(Number(e.precio_pack_arriendo)) : '',
    fecha_disponibilidad: e.fecha_disponibilidad || '',
    fecha_inicio: paraInput(e.fecha_inicio),
    fecha_fin: paraInput(e.fecha_fin),
    inicioOriginal: e.fecha_inicio,
    finOriginal: e.fecha_fin,
    productos: e.productos || [],
    imagenArchivo: null,
    imagenActual: e.imagen_banner,
  }
}


function cuerpoPeticion(f) {
  const datos = {
    titulo: f.titulo.trim(), descripcion: f.descripcion, tipo_evento: f.tipo_evento, activo: f.activo,
    fecha_inicio: f.inicioOriginal && f.fecha_inicio === paraInput(f.inicioOriginal) ? f.inicioOriginal : new Date(f.fecha_inicio).toISOString(),
    fecha_fin: f.finOriginal && f.fecha_fin === paraInput(f.finOriginal) ? f.finOriginal : new Date(f.fecha_fin).toISOString(),
    porcentaje_descuento: f.porcentaje_descuento || '0',
    precio_pack_arriendo: f.precio_pack_arriendo || null,
    artista_invitado: f.artista_invitado, lugar_o_link: f.lugar_o_link,
    fecha_disponibilidad: f.fecha_disponibilidad || null, permite_reserva: f.permite_reserva,
    condicion_outlet: f.condicion_outlet, estado_verificado: f.estado_verificado,
    productos_asociados: f.productos.map(p => p.id),
  }
  if (!(f.imagenArchivo instanceof File)) return datos
  const fd = new FormData()
  Object.entries(datos).forEach(([k, v]) => {
    if (k === 'productos_asociados') v.forEach(id => fd.append(k, id))
    else if (v !== null && v !== undefined) fd.append(k, typeof v === 'boolean' ? String(v) : v)
  })
  fd.append('imagen_banner', f.imagenArchivo)
  return fd
}

function TarjetaResumen({ titulo, valor, color, icono }) {
  return (
    <div className="col-xl-3 col-md-6 mb-4">
      <div className={`card border-left-${color} shadow h-100 py-2`}>
        <div className="card-body">
          <div className="row g-0 align-items-center">
            <div className="col me-2">
              <div className={`text-xs fw-bold text-${color} text-uppercase mb-1`}>{titulo}</div>
              <div className="h5 mb-0 fw-bold text-gray-800">{valor ?? '–'}</div>
            </div>
            <div className="col-auto"><i className={`fas ${icono} fa-2x text-gray-300`} aria-hidden="true"></i></div>
          </div>
        </div>
      </div>
    </div>
  )
}

function InsigniaTipo({ tipo }) {
  const t = TIPOS_EVENTO[tipo]
  if (!t) return null
  return (
    <span className="badge rounded-pill fw-semibold" style={{ background: `${t.color}26`, color: t.color, border: `1px solid ${t.color}66` }}>
      <i className={`fas ${t.icono} me-1`} aria-hidden="true"></i>{t.corta}
    </span>
  )
}


function SelectorProductos({ seleccionados, onCambiar, tipo, porcentaje, precioPack }) {
  const [busqueda, setBusqueda] = useState('')
  const [resultados, setResultados] = useState([])
  const [cargando, setCargando] = useState(false)
  const termino = useDebounce(busqueda.trim(), 300)

  useEffect(() => {
    let activo = true
    setCargando(true)
    axios.get('/api/productos/', { params: { admin: 'true', estado: 'activos', page: 1, page_size: 8, q: termino || undefined } })
      .then(({ data }) => { if (activo) setResultados(data.results || []) })
      .catch(() => { if (activo) setResultados([]) })
      .finally(() => { if (activo) setCargando(false) })
    return () => { activo = false }
  }, [termino])

  const estaSeleccionado = (id) => seleccionados.some(p => p.id === id)
  const alternar = (p) => onCambiar(estaSeleccionado(p.id) ? seleccionados.filter(s => s.id !== p.id) : [...seleccionados, p])
  const sumaArriendo = seleccionados.reduce((s, p) => s + Number(p.precioArriendoDia || 0), 0)
  const pct = Number(porcentaje) || 0

  return (
    <div>
      <input
        type="search"
        className="form-control form-control-sm mb-2"
        placeholder="Buscar producto por nombre o marca..."
        aria-label="Buscar productos para el evento"
        value={busqueda}
        onChange={(e) => setBusqueda(e.target.value)}
      />
      <div className="border rounded mb-2" style={{ maxHeight: 220, overflowY: 'auto' }}>
        {cargando && !resultados.length && <p className="small text-gray-500 p-2 mb-0">Buscando…</p>}
        {!cargando && !resultados.length && <p className="small text-gray-500 p-2 mb-0">Sin resultados.</p>}
        {resultados.map(p => (
          <label key={p.id} className="d-flex align-items-center gap-2 px-2 py-1 border-bottom small mb-0" style={{ cursor: 'pointer' }}>
            <input type="checkbox" className="form-check-input mt-0" checked={estaSeleccionado(p.id)} onChange={() => alternar(p)} />
            <span className="flex-grow-1 text-truncate"><span className="text-gray-500">{p.marca}</span> {p.nombre}</span>
            <span className="text-nowrap text-gray-600">
              {tipo === 'pack_arriendo' ? `${pesos(p.precioArriendoDia)}/día` : pesos(p.precioVenta)}
            </span>
          </label>
        ))}
      </div>

      {seleccionados.length > 0 && (
        <div className="d-flex flex-wrap gap-1 mb-2">
          {seleccionados.map(p => (
            <span key={p.id} className="badge rounded-pill text-bg-light border d-inline-flex align-items-center gap-1 fw-normal">
              {p.nombre}
              {(tipo === 'descuento' || tipo === 'outlet' || tipo === 'preventa') && pct > 0 && (
                <span className="text-success fw-semibold">→ {pesos(Number(p.precioVenta) * (100 - pct) / 100)}</span>
              )}
              <button type="button" className="btn-close" style={{ fontSize: '.55rem' }} aria-label={`Quitar ${p.nombre}`} onClick={() => alternar(p)} />
            </span>
          ))}
        </div>
      )}

      {tipo === 'pack_arriendo' && seleccionados.length >= 2 && (
        <p className="small mb-0">
          Por separado: <strong>{pesos(sumaArriendo)}/día</strong>
          {Number(precioPack) > 0 && (
            Number(precioPack) < sumaArriendo
              ? <> · Ahorro del cliente: <strong className="text-success">{pesos(sumaArriendo - Number(precioPack))}/día ({Math.round((1 - Number(precioPack) / sumaArriendo) * 100)}%)</strong></>
              : <span className="text-danger"> · El precio del pack debe ser menor.</span>
          )}
        </p>
      )}
    </div>
  )
}

function ModalEvento({ inicial, onCerrar, onGuardado }) {
  const [f, setF] = useState(inicial)
  const [errores, setErrores] = useState({})
  const [guardando, setGuardando] = useState(false)
  const [vistaPrevia, setVistaPrevia] = useState(inicial.imagenActual)
  const set = (campo) => (e) => setF(prev => ({ ...prev, [campo]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }))
  const tipo = f.tipo_evento
  const tieneDescuento = ['descuento', 'outlet', 'preventa'].includes(tipo)

  useEffect(() => {
    const alTecla = (e) => { if (e.key === 'Escape' && !guardando) onCerrar() }
    document.addEventListener('keydown', alTecla)
    return () => document.removeEventListener('keydown', alTecla)
  }, [guardando, onCerrar])

  const elegirImagen = (e) => {
    const archivo = e.target.files?.[0] || null
    setF(prev => ({ ...prev, imagenArchivo: archivo }))
    if (archivo) setVistaPrevia(URL.createObjectURL(archivo))
  }

  const guardar = async (e) => {
    e.preventDefault()
    if (guardando) return
    const validaciones = validarEvento(f, inicial)
    if (Object.keys(validaciones).length) {
      setErrores(validaciones)
      return
    }
    setGuardando(true)
    setErrores({})
    try {
      const cuerpo = cuerpoPeticion(f)
      if (f.id) await axios.patch(`/api/eventos/${f.id}/`, cuerpo)
      else await axios.post('/api/eventos/', cuerpo)
      onGuardado()
    } catch (err) {
      const datos = err.response?.data
      setErrores(datos && typeof datos === 'object' ? datos : { general: 'No se pudo guardar el evento.' })
    } finally {
      setGuardando(false)
    }
  }

  const error = (campo) => {
    const e = errores[campo]
    return e ? <div className="invalid-feedback d-block">{Array.isArray(e) ? e.join(' ') : String(e)}</div> : null
  }
  const clase = (campo, base = 'form-control') => `${base}${errores[campo] ? ' is-invalid' : ''}`

  return (
    <>
      <div className="modal show d-block" role="dialog" aria-modal="true" aria-labelledby="titulo-evento" tabIndex="-1">
        <div className="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable">
          <form className="modal-content" onSubmit={guardar} noValidate>
            <div className="modal-header">
              <h5 id="titulo-evento" className="modal-title fw-bold">{f.id ? 'Editar evento' : 'Nuevo evento'}</h5>
              <button type="button" className="btn-close" aria-label="Cerrar" disabled={guardando} onClick={onCerrar} />
            </div>
            <div className="modal-body">
              {(errores.general || errores.non_field_errors || errores.detail) && (
                <div role="alert" className="alert alert-danger">{errores.general || errores.non_field_errors || errores.detail}</div>
              )}

              
              <fieldset className="mb-3">
                <legend className="form-label small fw-bold">Tipo de evento</legend>
                <div className="d-flex flex-wrap gap-2">
                  {Object.entries(TIPOS_EVENTO).map(([id, t]) => (
                    <label key={id} className={`btn btn-sm ${tipo === id ? 'btn-primary' : 'btn-outline-secondary'} d-flex align-items-center gap-2`}>
                      <input type="radio" className="visually-hidden" name="tipo_evento" value={id} checked={tipo === id} onChange={set('tipo_evento')} />
                      <i className={`fas ${t.icono}`} aria-hidden="true"></i>{t.etiqueta}
                    </label>
                  ))}
                </div>
              </fieldset>

              <div className="row g-3">
                <div className="col-md-8">
                  <label htmlFor="ev-titulo" className="form-label small fw-bold">Título</label>
                  <input id="ev-titulo" className={clase('titulo')} value={f.titulo} onChange={set('titulo')} required maxLength={150} />
                  {error('titulo')}
                </div>
                <div className="col-md-4 d-flex align-items-end">
                  <div className="form-check form-switch mb-2">
                    <input id="ev-activo" className="form-check-input" type="checkbox" role="switch" checked={f.activo} disabled={f.finalizado_manualmente} onChange={set('activo')} />
                    <label htmlFor="ev-activo" className="form-check-label small">Publicado</label>
                    {f.finalizado_manualmente && <div className="small text-muted">Este evento ya fue finalizado.</div>}
                    {error('activo')}
                  </div>
                </div>
                <div className="col-12">
                  <label htmlFor="ev-descripcion" className="form-label small fw-bold">Descripción</label>
                  <textarea id="ev-descripcion" className={clase('descripcion')} rows={2} value={f.descripcion} onChange={set('descripcion')} />
                </div>
                <div className="col-sm-6">
                  <label htmlFor="ev-inicio" className="form-label small fw-bold">Inicio</label>
                  <input id="ev-inicio" type="datetime-local" min={f.id ? undefined : `${diaEnChile()}T00:00`} className={clase('fecha_inicio')} value={f.fecha_inicio} onChange={set('fecha_inicio')} required />
                  {error('fecha_inicio')}
                </div>
                <div className="col-sm-6">
                  <label htmlFor="ev-fin" className="form-label small fw-bold">Término</label>
                  <input id="ev-fin" type="datetime-local" min={f.fecha_inicio || undefined} className={clase('fecha_fin')} value={f.fecha_fin} onChange={set('fecha_fin')} required />
                  {error('fecha_fin')}
                </div>

                
                {tieneDescuento && (
                  <div className="col-sm-4">
                    <label htmlFor="ev-pct" className="form-label small fw-bold">
                      Descuento (%){tipo === 'preventa' && <span className="fw-normal text-gray-500"> opcional</span>}
                    </label>
                    <input id="ev-pct" type="number" min={tipo === 'preventa' ? '0' : '0.01'} max="90" step="0.01" className={clase('porcentaje_descuento')} value={f.porcentaje_descuento} onChange={set('porcentaje_descuento')} />
                    {error('porcentaje_descuento')}
                  </div>
                )}
                {tipo === 'pack_arriendo' && (
                  <div className="col-sm-5">
                    <label htmlFor="ev-pack" className="form-label small fw-bold">Precio del pack por día ($)</label>
                    <input id="ev-pack" type="number" min="0.01" max="99999999.99" step="0.01" className={clase('precio_pack_arriendo')} value={f.precio_pack_arriendo} onChange={set('precio_pack_arriendo')} />
                    {error('precio_pack_arriendo')}
                  </div>
                )}
                {tipo === 'preventa' && (
                  <>
                    <div className="col-sm-4">
                      <label htmlFor="ev-disp" className="form-label small fw-bold">Disponible desde</label>
                      <input id="ev-disp" type="date" min={f.id ? undefined : diaEnChile()} className={clase('fecha_disponibilidad')} value={f.fecha_disponibilidad} onChange={set('fecha_disponibilidad')} />
                      {error('fecha_disponibilidad')}
                    </div>
                    <div className="col-sm-4 d-flex align-items-end">
                      <div className="form-check form-switch mb-2">
                        <input id="ev-reserva" className="form-check-input" type="checkbox" role="switch" checked={f.permite_reserva} onChange={set('permite_reserva')} />
                        <label htmlFor="ev-reserva" className="form-check-label small">Permitir reserva anticipada</label>
                      </div>
                    </div>
                  </>
                )}
                {tipo === 'outlet' && (
                  <>
                    <div className="col-sm-4">
                      <label htmlFor="ev-cond" className="form-label small fw-bold">Condición</label>
                      <select id="ev-cond" className="form-select" value={f.condicion_outlet} onChange={set('condicion_outlet')}>
                        <option value="">Sin indicar</option>
                        {Object.entries(CONDICIONES_OUTLET).map(([v, t]) => <option key={v} value={v}>{t}</option>)}
                      </select>
                    </div>
                    <div className="col-sm-4 d-flex align-items-end">
                      <div className="form-check form-switch mb-2">
                        <input id="ev-verif" className="form-check-input" type="checkbox" role="switch" checked={f.estado_verificado} onChange={set('estado_verificado')} />
                        <label htmlFor="ev-verif" className="form-check-label small">Estado verificado por técnico</label>
                      </div>
                    </div>
                  </>
                )}
                {tipo === 'en_vivo' && (
                  <>
                    <div className="col-sm-6">
                      <label htmlFor="ev-artista" className="form-label small fw-bold">Artista / DJ invitado</label>
                      <input id="ev-artista" className={clase('artista_invitado')} value={f.artista_invitado} onChange={set('artista_invitado')} maxLength={150} />
                      {error('artista_invitado')}
                    </div>
                    <div className="col-sm-6">
                      <label htmlFor="ev-lugar" className="form-label small fw-bold">Lugar o link de transmisión</label>
                      <input id="ev-lugar" className={clase('lugar_o_link')} value={f.lugar_o_link} onChange={set('lugar_o_link')} maxLength={255} placeholder="Sala de la tienda o https://..." />
                      {error('lugar_o_link')}
                    </div>
                  </>
                )}

                <div className="col-12">
                  <label className="form-label small fw-bold mb-1">
                    {tipo === 'en_vivo' ? 'Equipos protagonistas' : 'Productos del evento'}
                    {!REQUIERE_PRODUCTOS.includes(tipo) && <span className="fw-normal text-gray-500"> (opcional)</span>}
                    {tipo === 'pack_arriendo' && <span className="fw-normal text-gray-500"> (mínimo 2)</span>}
                  </label>
                  <SelectorProductos
                    seleccionados={f.productos}
                    onCambiar={(productos) => setF(prev => ({ ...prev, productos }))}
                    tipo={tipo}
                    porcentaje={f.porcentaje_descuento}
                    precioPack={f.precio_pack_arriendo}
                  />
                  {error('productos_asociados')}
                </div>

                <div className="col-12">
                  <label htmlFor="ev-imagen" className="form-label small fw-bold">Imagen del banner <span className="fw-normal text-gray-500">(opcional, ideal 1600×600)</span></label>
                  <input id="ev-imagen" type="file" accept="image/*" className={clase('imagen_banner')} onChange={elegirImagen} />
                  {error('imagen_banner')}
                  {vistaPrevia && <img src={vistaPrevia} alt="Vista previa del banner" className="mt-2 rounded w-100" style={{ maxHeight: 140, objectFit: 'cover' }} />}
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-outline-secondary" disabled={guardando} onClick={onCerrar}>Cancelar</button>
              <button type="submit" className="btn btn-primary" disabled={guardando}>{guardando ? 'Guardando…' : 'Guardar evento'}</button>
            </div>
          </form>
        </div>
      </div>
      <div className="modal-backdrop fade show"></div>
    </>
  )
}

export function EventsManagement() {
  const [pagina, setPagina] = useState(1)
  const [tipo, setTipo] = useState('todos')
  const [estado, setEstado] = useState('todos')
  const [busqueda, setBusqueda] = useState('')
  const [formulario, setFormulario] = useState(null)
  const [resumen, setResumen] = useState(null)
  const [aviso, setAviso] = useState('')
  const [cambiando, setCambiando] = useState(null)
  const termino = useDebounce(busqueda.trim())

  useEffect(() => { setPagina(1) }, [tipo, estado, termino])

  const { items: eventos, total, paginas, cargando, error, recargar } = useListaPaginada('/api/eventos/', {
    pagina, tamano: EVENTOS_POR_PAGINA, filtros: { admin: 'true', tipo, estado, q: termino },
  })

  const cargarResumen = useCallback(() => {
    axios.get('/api/eventos/resumen/').then(({ data }) => setResumen(data)).catch(() => setResumen(null))
  }, [])
  useEffect(() => { cargarResumen() }, [cargarResumen])

  const refrescar = () => { recargar(); cargarResumen(); window.dispatchEvent(new Event('catalogo-actualizado')) }

  const alternarActivo = async (ev) => {
    setCambiando(ev.id)
    try {
      await axios.patch(`/api/eventos/${ev.id}/`, { activo: !ev.activo })
      setAviso('')
      refrescar()
    } catch (e) {
      const datos = e.response?.data
      setAviso(datos?.activo ? [].concat(datos.activo).join(' ') : datos?.detail || 'No se pudo cambiar el estado del evento.')
    } finally {
      setCambiando(null)
    }
  }

  const eliminar = async (ev) => {
    if (!window.confirm(`¿Eliminar el evento "${ev.titulo}"? Esta acción no se puede deshacer.`)) return
    try {
      await axios.delete(`/api/eventos/${ev.id}/`)
      refrescar()
    } catch {
      setAviso('No se pudo eliminar el evento.')
    }
  }

  const finalizar = async (ev) => {
    if (!window.confirm(`¿Finalizar "${ev.titulo}"? Dejará de aparecer en la tienda y se conservará en el historial.`)) return
    setCambiando(ev.id)
    try {
      await axios.post(`/api/eventos/${ev.id}/finalizar/`)
      setAviso('')
      refrescar()
    } catch (e) {
      setAviso(e.response?.data?.detail || 'No se pudo finalizar el evento.')
    } finally {
      setCambiando(null)
    }
  }

  return (
    <div>
      <div className="row">
        <TarjetaResumen titulo="Activos" valor={resumen?.activo} color="success" icono="fa-bolt" />
        <TarjetaResumen titulo="Programados" valor={resumen?.programado} color="info" icono="fa-calendar-days" />
        <TarjetaResumen titulo="Desactivados" valor={resumen?.desactivado} color="warning" icono="fa-pause" />
        <TarjetaResumen titulo="Finalizados" valor={resumen?.finalizado} color="primary" icono="fa-flag-checkered" />
      </div>

      <div className="card shadow mb-4">
        <div className="card-header py-3 d-flex flex-wrap align-items-center justify-content-between gap-2">
          <h6 className="m-0 fw-bold text-primary"><i className="fas fa-bullhorn me-2"></i>Eventos y promociones</h6>
          <button type="button" className="btn btn-primary btn-sm" onClick={() => setFormulario({ ...formularioVacio(), activo: !resumen || resumen.activo + resumen.programado < 6 })}>
            <i className="fas fa-plus me-1"></i>Nuevo evento
          </button>
        </div>
        <div className="card-body">
          <p className="small text-muted mb-3">
            Publicados: <strong>{resumen ? resumen.activo + resumen.programado : '…'}/6</strong>.
            {' '}El límite incluye eventos activos y programados. Puedes guardar otros sin publicar.
          </p>
          <div className="row g-2 mb-3">
            <div className="col-md-5">
              <input type="search" className="form-control form-control-sm" placeholder="Buscar por título o artista" aria-label="Buscar eventos" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} />
            </div>
            <div className="col-6 col-md-4">
              <select className="form-select form-select-sm" aria-label="Filtrar por tipo de evento" value={tipo} onChange={(e) => setTipo(e.target.value)}>
                <option value="todos">Todos los tipos</option>
                {Object.entries(TIPOS_EVENTO).map(([id, t]) => <option key={id} value={id}>{t.etiqueta}</option>)}
              </select>
            </div>
            <div className="col-6 col-md-3">
              <select className="form-select form-select-sm" aria-label="Filtrar por estado" value={estado} onChange={(e) => setEstado(e.target.value)}>
                <option value="todos">Todos los estados</option>
                {Object.entries(ESTADOS_EVENTO).map(([id, s]) => <option key={id} value={id}>{s.etiqueta}</option>)}
              </select>
            </div>
          </div>

          {(error || aviso) && <div role="alert" className="alert alert-danger">{error || aviso}</div>}

          {cargando && !eventos.length ? (
            <p role="status" className="text-gray-600 small">Cargando eventos…</p>
          ) : !eventos.length ? (
            <div className="text-center py-5 text-gray-500">
              <i className="fas fa-calendar-plus fa-2x mb-2 opacity-50"></i>
              <p className="mb-2">No hay eventos con estos filtros.</p>
              <button type="button" className="btn btn-outline-primary btn-sm" onClick={() => setFormulario(formularioVacio())}>Crear el primero</button>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover align-middle small mb-0">
                <thead>
                  <tr>
                    <th>Evento</th>
                    <th>Fechas</th>
                    <th>Beneficio</th>
                    <th className="text-center">Productos</th>
                    <th>Estado</th>
                    <th className="text-center">Publicado</th>
                    <th className="text-end">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {eventos.map(ev => {
                    const est = ESTADOS_EVENTO[ev.estado] || {}
                    return (
                      <tr key={ev.id}>
                        <td style={{ minWidth: 220 }}>
                          <div className="d-flex align-items-center gap-2">
                            {ev.imagen_banner
                              ? <img src={ev.imagen_banner} alt="" className="rounded" style={{ width: 56, height: 32, objectFit: 'cover' }} />
                              : <span className="rounded d-inline-grid" style={{ width: 56, height: 32, placeItems: 'center', background: `${TIPOS_EVENTO[ev.tipo_evento]?.color}26` }}><i className={`fas ${TIPOS_EVENTO[ev.tipo_evento]?.icono}`} style={{ color: TIPOS_EVENTO[ev.tipo_evento]?.color }}></i></span>}
                            <div className="min-w-0">
                              <div className="fw-semibold text-gray-800 text-truncate">{ev.titulo}</div>
                              <InsigniaTipo tipo={ev.tipo_evento} />
                            </div>
                          </div>
                        </td>
                        <td className="text-nowrap">{fechaHora(ev.fecha_inicio)}<br /><span className="text-gray-500">al {fechaHora(ev.fecha_fin)}</span></td>
                        <td>{beneficioEvento(ev)}</td>
                        <td className="text-center">{ev.productos_asociados.length}</td>
                        <td><span className="badge" style={{ background: est.fondo, color: est.texto }}>{est.etiqueta}</span></td>
                        <td className="text-center">
                          <div className="form-check form-switch d-inline-block mb-0">
                            <input
                              className="form-check-input"
                              type="checkbox"
                              role="switch"
                              checked={ev.activo}
                              disabled={cambiando === ev.id || ev.estado === 'finalizado'}
                              onChange={() => alternarActivo(ev)}
                              aria-label={`${ev.activo ? 'Desactivar' : 'Activar'} ${ev.titulo}`}
                              title={ev.estado === 'finalizado' ? 'El evento ya terminó' : undefined}
                            />
                          </div>
                        </td>
                        <td className="text-end text-nowrap">
                          {ev.estado !== 'finalizado' && <button type="button" className="btn btn-sm btn-outline-secondary me-1" disabled={cambiando === ev.id} onClick={() => finalizar(ev)} aria-label={`Finalizar ${ev.titulo}`}><i className="fas fa-flag-checkered me-1"></i>Finalizar</button>}
                          <button type="button" className="btn btn-sm btn-outline-dark me-1" onClick={() => setFormulario(desdeEvento(ev))}>Editar</button>
                          <button type="button" className="btn btn-sm btn-outline-danger" onClick={() => eliminar(ev)} aria-label={`Eliminar ${ev.titulo}`}><i className="fas fa-trash"></i></button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
          <Paginador pagina={Math.min(pagina, paginas)} paginas={paginas} total={total} tamano={EVENTOS_POR_PAGINA} onCambiar={setPagina} etiqueta="eventos" />
        </div>
      </div>

      {formulario && (
        <ModalEvento
          inicial={formulario}
          onCerrar={() => setFormulario(null)}
          onGuardado={() => { setFormulario(null); refrescar() }}
        />
      )}
    </div>
  )
}
