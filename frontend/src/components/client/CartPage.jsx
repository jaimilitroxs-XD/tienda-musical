import React, { useState, useEffect } from 'react'

export function CartPage({ 
  carrito, 
  cambiarCantidad, 
  eliminarDelCarrito, 
  vaciarCarrito, 
  onFinalizarCompra, 
  volverAlCatalogo 
}) {
  
  const subtotal = carrito.reduce((acc, item) => {
    const precioUnitario = item.tipoOperacion === 'arriendo' 
      ? Number(item.precioArriendoDia || 25000) * (item.diasArriendo || 1)
      : Number(item.precioVenta)
    return acc + (precioUnitario * item.cantidad)
  }, 0)

  const iva = subtotal * 0.19
  const totalGeneral = subtotal + iva

  return (
    <div className="container py-4" style={{ maxWidth: '1100px' }}>

      <div className="d-flex align-items-center justify-content-between mb-4 border-bottom pb-2">
        <h3 className="fw-bold text-dark mb-0 d-flex align-items-center gap-2">
          <i className="fa-solid fa-cart-shopping text-info"></i>
          Carrito de Compras
        </h3>
        <button 
          type="button" 
          onClick={volverAlCatalogo} 
          className="btn btn-outline-secondary btn-sm rounded-pill px-3"
        >
          <i className="fa-solid fa-arrow-left me-1"></i>Seguir comprando
        </button>
      </div>

      {carrito.length === 0 ? (
        <div className="text-center py-5 border rounded-3 bg-light shadow-sm">
          <i className="fa-solid fa-basket-shopping fa-4x text-muted mb-3"></i>
          <h5 className="fw-bold text-secondary">Tu carrito está vacío</h5>
          <p className="text-muted small mb-4">No has agregado ningún producto para venta o arriendo todavía.</p>
          <button 
            type="button" 
            onClick={volverAlCatalogo} 
            className="btn text-white rounded-pill px-4 fw-bold shadow-sm"
            style={{ backgroundColor: 'var(--store-primary)' }}
          >
            Explorar catálogo
          </button>
        </div>
      ) : (
        <div className="row g-4">

          <div className="col-lg-8">
            <div className="card border-0 shadow-sm rounded-3">
              <div className="table-responsive p-3">
                <table className="table align-middle mb-0">
                  <thead className="table-light">
                    <tr className="small text-muted text-uppercase">
                      <th scope="col">Producto</th>
                      <th scope="col" className="text-center">Tipo</th>
                      <th scope="col" className="text-center">Cantidad</th>
                      <th scope="col" className="text-end">Precio</th>
                      <th scope="col" className="text-end">Subtotal</th>
                      <th scope="col" className="text-center"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {carrito.map((item, index) => {
                      const esArriendo = item.tipoOperacion === 'arriendo'
                      const precioUnitario = esArriendo 
                        ? Number(item.precioArriendoDia || 25000) * (item.diasArriendo || 1)
                        : Number(item.precioVenta)
                      
                      const subtotalItem = precioUnitario * item.cantidad
                      const identificador = item.keyUnica !== undefined ? item.keyUnica : index

                      return (
                        <FilaProducto 
                          key={identificador}
                          item={item}
                          identificador={identificador}
                          precioUnitario={precioUnitario}
                          subtotalItem={subtotalItem}
                          esArriendo={esArriendo}
                          cambiarCantidad={cambiarCantidad}
                          eliminarDelCarrito={eliminarDelCarrito}
                        />
                      )
                    })}
                  </tbody>
                </table>
              </div>

              <div className="card-footer bg-white border-top-0 d-flex justify-content-between align-items-center p-3">
                <button 
                  type="button"
                  onClick={vaciarCarrito} 
                  className="btn btn-outline-danger btn-sm rounded-pill px-3"
                >
                  <i className="fa-solid fa-broom me-1"></i>Vaciar Carrito
                </button>
              </div>
            </div>
          </div>

          <div className="col-lg-4">
            <div className="card border-0 shadow-sm rounded-3 p-3">
              <h5 className="fw-bold text-dark mb-3 border-bottom pb-2">Resumen de Compra</h5>
              
              <div className="d-flex justify-content-between mb-2 text-muted small">
                <span>Subtotal:</span>
                <span className="fw-semibold text-dark">${subtotal.toLocaleString('es-CL')}</span>
              </div>
              
              <div className="d-flex justify-content-between mb-2 text-muted small">
                <span>IVA (19%):</span>
                <span className="fw-semibold text-dark">${iva.toLocaleString('es-CL')}</span>
              </div>

              <div className="d-flex justify-content-between mb-3 text-muted small">
                <span>Envío:</span>
                <span className="text-success fw-semibold">Gratis</span>
              </div>

              <hr className="text-muted" />

              <div className="d-flex justify-content-between mb-4 align-items-center">
                <span className="fs-5 fw-bold text-dark">Total:</span>
                <span className="fs-4 fw-bold" style={{ color: 'var(--store-primary)' }}>${totalGeneral.toLocaleString('es-CL')}</span>
              </div>

              <button 
                type="button"
                onClick={onFinalizarCompra} 
                className="btn text-white w-100 py-2 shadow-sm mb-2 rounded-pill fw-bold border-0"
                style={{ backgroundColor: 'var(--store-primary)' }}
              >
                <i className="fa-solid fa-credit-card me-2"></i>Proceder al Pago
              </button>
            </div>
          </div>

        </div>
      )}

    </div>
  )
}

function FilaProducto({ item, identificador, precioUnitario, subtotalItem, esArriendo, cambiarCantidad, eliminarDelCarrito }) {
  const [cantidadLocal, setCantidadLocal] = useState(item.cantidad)

  
  const stockMaximoVenta = Number(item.stockDisponibleVenta ?? item.stockVenta ?? 10)

  useEffect(() => {
    if (esArriendo) {
      setCantidadLocal(1)
    } else {
      setCantidadLocal(item.cantidad)
    }
  }, [item.cantidad, esArriendo])

  return (
    <tr>
      <td>
        <div className="d-flex align-items-center">
          <div className="border rounded me-3 d-flex align-items-center justify-content-center bg-light" style={{ width: '50px', height: '50px', flexShrink: 0 }}>
            {item.foto ? (
              <img src={item.foto.startsWith('http') ? item.foto : `http://127.0.0.1:8000${item.foto}`} alt={item.nombre} className="w-100 h-100 object-fit-contain" />
            ) : (
              <i className="fa-solid fa-guitar text-secondary"></i>
            )}
          </div>
          <div>
            <h6 className="fw-semibold mb-0 text-dark small">{item.marca} - {item.nombre}</h6>
            <small className="text-muted d-block" style={{ fontSize: '0.75rem' }}>
              {esArriendo ? `Arriendo: ${item.fechaInicio} al ${item.fechaTermino} (${item.diasArriendo} días)` : `Stock disponible: ${stockMaximoVenta}`}
            </small>
          </div>
        </div>
      </td>

      <td className="text-center">
        {esArriendo ? (
          <span className="badge bg-info-subtle text-info border border-info" style={{ fontSize: '0.7rem' }}>Arriendo</span>
        ) : (
          <span className="badge bg-success-subtle text-success border border-success" style={{ fontSize: '0.7rem' }}>Venta</span>
        )}
      </td>

      <td className="text-center" style={{ width: '130px' }}>
        <input 
          type="number" 
          className="form-control form-control-sm text-center rounded-pill fw-bold" 
          value={esArriendo ? 1 : cantidadLocal} 
          min="1"
          max={esArriendo ? 1 : stockMaximoVenta}
          disabled={esArriendo}
          onChange={(e) => {
            if (esArriendo) return
            const val = e.target.value
            setCantidadLocal(val) 
            
            if (val !== '') {
              const num = parseInt(val, 10)
              if (!isNaN(num)) {
                if (num > stockMaximoVenta) {
                  alert(`No puedes superar el stock disponible de venta (${stockMaximoVenta} unidades).`)
                  setCantidadLocal(stockMaximoVenta)
                  cambiarCantidad(identificador, stockMaximoVenta)
                } else if (num >= 1) {
                  cambiarCantidad(identificador, num)
                }
              }
            }
          }}
        />
        {esArriendo ? (
          <small className="text-muted" style={{ fontSize: '0.65rem' }}>Máx. 1 por arriendo</small>
        ) : (
          <small className="text-muted" style={{ fontSize: '0.65rem' }}>Máx: {stockMaximoVenta}</small>
        )}
      </td>

      <td className="text-end fw-semibold small">
        ${precioUnitario.toLocaleString('es-CL')}
      </td>

      <td className="text-end fw-bold text-dark small">
        ${subtotalItem.toLocaleString('es-CL')}
      </td>

      <td className="text-center">
        <button 
          type="button"
          onClick={() => eliminarDelCarrito(identificador)} 
          className="btn btn-link text-danger p-0 border-0" 
          title="Eliminar"
        >
          <i className="fa-solid fa-trash-can"></i>
        </button>
      </td>
    </tr>
  )
}