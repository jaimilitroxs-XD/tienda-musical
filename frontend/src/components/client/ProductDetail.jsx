import React, { useState } from 'react'
import { Estrellas } from '../Estrellas'
import { ResenasProducto } from './ResenasProducto'

export function ProductDetail({ producto, productos = [], volverAlCatalogo, onAgregarAlCarrito, onIniciarSesion }) {
  
  const [resumenResenas, setResumenResenas] = useState(null)
  const [tipoOperacion, setTipoOperacion] = useState('venta')
  const [cantidadInput, setCantidadInput] = useState(1)
  const [fechaInicio, setFechaInicio] = useState('')
  const [fechaTermino, setFechaTermino] = useState('')
  const [pestanaActiva, setPestanaActiva] = useState('descripcion')
  const [iconoDetalleActivo, setIconoDetalleActivo] = useState('fa-guitar')

  if (!producto) return null

  const fechaHoy = new Date().toISOString().split('T')[0]

  const stockVentaActual = Number(producto.stockDisponibleVenta ?? producto.stockVenta ?? 0)
  const stockArriendoActual = Number(producto.stockDisponibleArriendo ?? producto.stockArriendo ?? 0)
  const precioArriendoActual = Number(producto.precioArriendoDia ?? 0)
  
  const arriendoHabilitado = stockArriendoActual > 0 && precioArriendoActual > 0
  const promedioResenas = resumenResenas ? resumenResenas.promedio : producto.calificacionPromedio
  const totalResenas = resumenResenas ? resumenResenas.total : (producto.totalResenas || 0)
  const ventaHabilitada = stockVentaActual > 0

  const getImagenUrl = (prod) => {
    if (!prod) return null
    const imgPath = prod.foto || prod.imagen || prod.fotoUrl || prod.imagen_url
    if (!imgPath) return null
    if (typeof imgPath === 'string' && imgPath.startsWith('http')) return imgPath
    return imgPath
  }

  const imgSrc = getImagenUrl(producto)

  const manejarSubmit = (e) => {
    e.preventDefault()
    const cantidadFinal = Math.max(1, parseInt(cantidadInput) || 1)

    if (tipoOperacion === 'venta') {
      if (stockVentaActual <= 0 || cantidadFinal > stockVentaActual) {
        alert("Stock insuficiente para la venta.")
        return
      }
    }

    if (tipoOperacion === 'arriendo') {
      if (!arriendoHabilitado || cantidadFinal > stockArriendoActual) {
        alert("Producto no disponible para arriendo.")
        return
      }
      if (!fechaInicio || !fechaTermino) {
        alert("Por favor selecciona las fechas de inicio y término para el arriendo.")
        return
      }
      if (fechaInicio < fechaHoy || fechaTermino < fechaInicio) {
        alert("La fecha de término no puede ser anterior a la fecha de inicio.")
        return
      }
    }

    let diasArriendo = 1
    if (tipoOperacion === 'arriendo' && fechaInicio && fechaTermino) {
      const diff = new Date(fechaTermino) - new Date(fechaInicio)
      diasArriendo = Math.max(1, Math.ceil(diff / (1000 * 60 * 60 * 24)))
    }

    const itemNuevo = {
      ...producto,
      keyUnico: `item-${producto.id}-${tipoOperacion}-${Date.now()}-${Math.random()}`,
      tipoOperacion,
      cantidad: tipoOperacion === 'arriendo' ? 1 : cantidadFinal,
      fechaInicio,
      fechaTermino,
      diasArriendo
    }

    onAgregarAlCarrito(itemNuevo)
  }

  return (
    <div className="container py-2 text-dark" style={{ maxWidth: '1050px' }}>
      <div className="mb-3">
        <button onClick={volverAlCatalogo} className="btn btn-outline-secondary btn-sm rounded-pill px-3">
          <i className="fa-solid fa-arrow-left me-1"></i>Volver al catálogo
        </button>
      </div>

      <div className="row g-4 align-items-center mb-5">
        <div className="col-md-6">
          <div className="card border shadow-sm p-4 text-center rounded-3 mb-3 tienda-escenario">
            <div className="d-flex align-items-center justify-content-center" style={{ height: '320px' }}>
              {imgSrc ? (
                <img
                  src={imgSrc}
                  alt={producto.nombre}
                  className="tienda-foto"
                  style={{ maxHeight: '300px' }}
                />
              ) : (
                <i className={`fa-solid ${iconoDetalleActivo} fa-8x text-secondary opacity-75`}></i>
              )}
            </div>
          </div>
          <div className="d-flex justify-content-center gap-2">
            <button type="button" className={`btn btn-outline-secondary p-2 ${iconoDetalleActivo === 'fa-guitar' ? 'active' : ''}`} onClick={() => setIconoDetalleActivo('fa-guitar')}>
              <i className="fa-solid fa-guitar fa-lg"></i>
            </button>
            <button type="button" className={`btn btn-outline-secondary p-2 ${iconoDetalleActivo === 'fa-sliders' ? 'active' : ''}`} onClick={() => setIconoDetalleActivo('fa-sliders')}>
              <i className="fa-solid fa-sliders fa-lg"></i>
            </button>
            <button type="button" className={`btn btn-outline-secondary p-2 ${iconoDetalleActivo === 'fa-compact-disc' ? 'active' : ''}`} onClick={() => setIconoDetalleActivo('fa-compact-disc')}>
              <i className="fa-solid fa-compact-disc fa-lg"></i>
            </button>
          </div>
        </div>

        <div className="col-md-6">
          <div className="p-2">
            <div className="d-flex align-items-center gap-2 mb-2">
              <span className="badge text-white" style={{ backgroundColor: 'var(--store-primary)' }}>{producto.marca}</span>
              <span className="badge bg-success">Disponible</span>
            </div>

            <h3 className="fw-bold mb-1 text-dark">{producto.nombre}</h3>
            <p className="text-muted small mb-2">SKU: INSTR-2026-00{producto.id}</p>
            <button
              type="button"
              className="btn btn-link p-0 mb-3 d-inline-flex align-items-center gap-2 text-decoration-none"
              onClick={() => { setPestanaActiva('resenas'); document.getElementById('pestanas-producto')?.scrollIntoView({ behavior: 'smooth' }) }}
            >
              <Estrellas valor={promedioResenas || 0} tamano=".9rem" />
              <span className="small text-muted">
                {totalResenas ? `${promedioResenas.toLocaleString('es-CL', { minimumFractionDigits: 1 })} · ${totalResenas} ${totalResenas === 1 ? 'reseña' : 'reseñas'}` : 'Sin reseñas aún · Sé el primero'}
              </span>
            </button>

            <div className="p-3 bg-light rounded-3 mb-3 border">
              <div className="row align-items-center text-center">
                <div className="col-6 border-end">
                  <span className="text-muted small d-block">Precio de Venta</span>
                  {producto.precioVentaPromo != null ? (
                    <>
                      <span className="badge rounded-pill me-1" style={{ background: 'var(--t-promo)' }}>-{Number(producto.promocion?.porcentaje)}%</span>
                      <span className="fs-5 fw-bold" style={{ color: 'var(--t-promo)' }}>
                        ${Number(producto.precioVentaPromo).toLocaleString('es-CL')}
                      </span>
                      <small className="d-block text-muted"><s>${Number(producto.precioVenta ?? 0).toLocaleString('es-CL')}</s> · {producto.promocion?.titulo}</small>
                    </>
                  ) : (
                    <span className="fs-5 fw-bold" style={{ color: 'var(--store-price)' }}>
                      ${Number(producto.precioVenta ?? 0).toLocaleString('es-CL')}
                    </span>
                  )}
                  <small className="d-block text-muted" style={{ fontSize: '0.75rem' }}>
                    Stock venta: <strong className={stockVentaActual > 0 ? 'text-success' : 'text-danger'}>{stockVentaActual}</strong>
                  </small>
                </div>
                <div className="col-6">
                  <span className="text-muted small d-block">Arriendo Diario</span>
                  <span className="fs-5 fw-bold" style={{ color: 'var(--store-primary)' }}>
                    ${precioArriendoActual.toLocaleString('es-CL')}
                  </span>
                  <small className="d-block text-muted" style={{ fontSize: '0.75rem' }}>
                    Stock arriendo: <strong className={stockArriendoActual > 0 ? 'text-info' : 'text-danger'}>{stockArriendoActual}</strong>
                  </small>
                </div>
              </div>
            </div>

            <form onSubmit={manejarSubmit} className="mt-3">
              <div className="mb-3">
                <label className="form-label fw-bold small text-dark">Modalidad:</label>
                <div className="d-flex gap-3">
                  <div className="form-check">
                    <input 
                      className="form-check-input" 
                      type="radio" 
                      name="modalidad" 
                      id="optVenta" 
                      value="venta"
                      checked={tipoOperacion === 'venta'} 
                      disabled={!ventaHabilitada}
                      onChange={() => setTipoOperacion('venta')} 
                    />
                    <label className={`form-check-label small text-dark ${!ventaHabilitada ? 'text-muted text-decoration-line-through' : ''}`} htmlFor="optVenta">
                      Comprar
                    </label>
                  </div>

                  <div className="form-check">
                    <input 
                      className="form-check-input" 
                      type="radio" 
                      name="modalidad" 
                      id="optArriendo" 
                      value="arriendo"
                      checked={tipoOperacion === 'arriendo'} 
                      disabled={!arriendoHabilitado}
                      onChange={() => setTipoOperacion('arriendo')} 
                    />
                    <label className={`form-check-label small text-dark ${!arriendoHabilitado ? 'text-muted text-decoration-line-through' : ''}`} htmlFor="optArriendo">
                      Arrendar {!arriendoHabilitado && '(No disponible)'}
                    </label>
                  </div>
                </div>
              </div>

              {tipoOperacion === 'arriendo' && arriendoHabilitado && (
                <div className="row g-2 mb-3 bg-white p-2 border rounded">
                  <div className="col-6">
                    <label className="form-label extra-small fw-bold mb-1 text-dark">Fecha Inicio:</label>
                    <input 
                      type="date" 
                      className="form-control form-control-sm" 
                      min={fechaHoy} 
                      value={fechaInicio} 
                      onChange={(e) => setFechaInicio(e.target.value)} 
                      required 
                    />
                  </div>
                  <div className="col-6">
                    <label className="form-label extra-small fw-bold mb-1 text-dark">Fecha Término:</label>
                    <input 
                      type="date" 
                      className="form-control form-control-sm" 
                      min={fechaInicio || fechaHoy} 
                      value={fechaTermino} 
                      onChange={(e) => setFechaTermino(e.target.value)} 
                      required 
                    />
                  </div>
                </div>
              )}

              <div className="mb-2">
                <label className="form-label extra-small fw-bold mb-1 text-dark d-block">Cantidad:</label>
                <div className="d-flex align-items-center gap-3">
                  <div style={{ width: '130px' }}>
                    <input 
                      type="number" 
                      className={`form-control form-control-sm text-center fw-bold ${tipoOperacion === 'arriendo' ? 'bg-light' : ''}`}
                      min="1" 
                      max={tipoOperacion === 'arriendo' ? "1" : undefined}
                      value={tipoOperacion === 'arriendo' ? 1 : cantidadInput} 
                      disabled={tipoOperacion === 'arriendo'}
                      onChange={(e) => setCantidadInput(e.target.value)}
                    />
                  </div>
                  <button 
                    type="submit" 
                    className="btn text-white flex-grow-1 py-2 shadow-sm rounded-pill fw-bold border-0" 
                    style={{ backgroundColor: 'var(--store-primary)', fontSize: '0.85rem' }}
                  >
                    <i className="fa-solid fa-cart-plus me-2"></i>Añadir al carrito
                  </button>
                </div>
                {tipoOperacion === 'arriendo' && (
                  <small className="text-muted d-block mt-1" style={{ fontSize: '0.7rem' }}>Máx. 1</small>
                )}
              </div>
            </form>
          </div>
        </div>
      </div>

      <div className="card border shadow-sm rounded-3 mb-5" id="pestanas-producto">
        <div className="card-header bg-white border-bottom-0 pt-3 px-4">
          <ul className="nav nav-tabs card-header-tabs">
            <li className="nav-item">
              <button 
                className={`nav-link fw-bold ${pestanaActiva === 'descripcion' ? 'active text-dark' : 'text-muted'}`}
                onClick={() => setPestanaActiva('descripcion')}
              >
                Descripción
              </button>
            </li>
            <li className="nav-item">
              <button 
                className={`nav-link fw-bold ${pestanaActiva === 'info' ? 'active text-dark' : 'text-muted'}`}
                onClick={() => setPestanaActiva('info')}
              >
                Información Adicional
              </button>
            </li>
            <li className="nav-item">
              <button
                className={`nav-link fw-bold ${pestanaActiva === 'resenas' ? 'active text-dark' : 'text-muted'}`}
                onClick={() => setPestanaActiva('resenas')}
              >
                Reseñas ({totalResenas})
              </button>
            </li>
          </ul>
        </div>

        <div className="card-body p-4">
          {pestanaActiva === 'resenas' ? (
            <ResenasProducto productoId={producto.id} onIniciarSesion={onIniciarSesion} onCambioResumen={setResumenResenas} />
          ) : pestanaActiva === 'descripcion' ? (
            <p className="text-muted mb-0 small">
              {producto.descripcion || "Guitarra de alta fidelidad con acabados profesionales, ideal para estudio y presentaciones en vivo."}
            </p>
          ) : (
            <table className="table table-sm table-striped text-muted mb-0 small">
              <tbody>
                <tr><th>Modelo</th><td>{producto.nombre}</td></tr>
                <tr><th>Marca</th><td>{producto.marca}</td></tr>
                <tr><th>Categoría</th><td>{producto.categoria || 'Guitarras'}</td></tr>
                <tr><th>Stock Venta</th><td>{stockVentaActual} unidades</td></tr>
                <tr><th>Stock Arriendo</th><td>{stockArriendoActual} unidades</td></tr>
              </tbody>
            </table>
          )}
        </div>
      </div>

      <div className="mt-5 mb-5">
        <h4 className="fw-bold mb-4 border-bottom pb-2 text-dark">Productos Relacionados</h4>
        {(() => {
          const relacionados = productos.filter(p => 
            p.categoria?.toLowerCase() === producto.categoria?.toLowerCase() && 
            p.id !== producto.id
          ).slice(0, 4)

          if (relacionados.length === 0) {
            return <p className="text-muted small">No hay más productos en esta categoría.</p>
          }

          return (
            <div className="row row-cols-1 row-cols-sm-2 row-cols-md-4 g-3">
              {relacionados.map(prod => {
                const imgRel = getImagenUrl(prod)
                return (
                  <div key={prod.id} className="col">
                    <div 
                      className="card h-100 border shadow-sm rounded-3 p-2 text-center bg-white" 
                      style={{ cursor: 'pointer', borderColor: '#dcdcdc' }}
                    >
                      <div className="rounded-2 d-flex align-items-center justify-content-center overflow-hidden mb-2 border p-2" style={{ height: '140px', background: 'var(--t-stage)' }}>
                        {imgRel ? (
                          <img src={imgRel} alt={prod.nombre} className="tienda-foto" loading="lazy" />
                        ) : (
                          <i className="fa-solid fa-guitar fs-3 text-secondary opacity-50"></i>
                        )}
                      </div>
                      <div className="card-body p-1 d-flex flex-column justify-content-between">
                        <div>
                          <h6 className="card-title fw-bold mb-1 text-truncate" style={{ fontSize: '0.85rem', color: 'var(--store-text)' }}>
                            {prod.marca} - {prod.nombre}
                          </h6>
                          <p className="fw-bold my-1" style={{ color: 'var(--store-price)', fontSize: '0.95rem' }}>
                            ${Number(prod.precioVenta ?? 0).toLocaleString('es-CL')}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )
        })()}
      </div>
    </div>
  )
}
