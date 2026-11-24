import React from 'react'

export function CartDrawer({ 
  mostrar, 
  onClose, 
  carrito, 
  eliminarDelCarrito, 
  cambiarCantidad, 
  onFinalizarCompra, 
  onIrAlCarritoCompleto 
}) {
  
  if (!mostrar) return null

  const calcularSubtotalItem = (item) => {
    const precioUnitario = item.tipoOperacion === 'arriendo' 
      ? Number(item.precioArriendoDia || 25000) * (item.diasArriendo || 1)
      : Number(item.precioVenta || 0)
    return precioUnitario * item.cantidad
  }

  
  const totalGeneral = carrito.reduce((acc, item) => acc + calcularSubtotalItem(item), 0)

  return (
    <div 
      className="offcanvas offcanvas-end show border-0 shadow-lg" 
      tabIndex="-1" 
      style={{ visibility: 'visible', backgroundColor: '#fff', zIndex: 1065 }}
    >

      <div className="offcanvas-header bg-dark text-white py-3 px-4">
        <h5 className="offcanvas-title fw-bold d-flex align-items-center gap-2 fs-6 mb-0">
          <i className="fa-solid fa-cart-shopping text-info"></i>
          MI CARRITO ({carrito.reduce((acc, item) => acc + item.cantidad, 0)})
        </h5>
        <button 
          type="button" 
          className="btn-close btn-close-white" 
          onClick={onClose}
          aria-label="Cerrar"
        ></button>
      </div>

      <div className="offcanvas-body p-4 d-flex flex-column">
        {carrito.length === 0 ? (

          <div className="text-center my-auto py-5 text-muted">
            <i className="fa-solid fa-cart-flatbed-suitcases fa-3x mb-3 text-secondary opacity-50"></i>
            <p className="fw-semibold mb-1">Tu carrito está vacío</p>
            <small>Agrega instrumentos o equipos para comenzar tu solicitud.</small>
          </div>
        ) : (
          <>

            <div className="flex-grow-1 overflow-y-auto pe-1">
              {carrito.map((item, index) => {
                
                const identificador = item.keyUnica !== undefined ? item.keyUnica : index

                

                const stockMaximo = item.tipoOperacion === 'arriendo' 
                  ? 1 
                  : Number(item.stockDisponibleVenta ?? item.stockVenta ?? item.stock ?? 1)

                
                const alcanzomaximo = item.cantidad >= stockMaximo

                return (
                  <div key={`${item.id}-${item.tipoOperacion}-${index}`} className="border-bottom pb-3 mb-3">
                    <div className="d-flex align-items-start gap-3">

                      <div 
                        className="bg-light rounded-3 d-flex align-items-center justify-content-center flex-shrink-0" 
                        style={{ width: '60px', height: '60px', border: '1px solid #e9ecef' }}
                      >
                        {item.foto ? (
                          <img 
                            src={item.foto.startsWith('http') ? item.foto : `http://127.0.0.1:8000${item.foto}`} 
                            alt={item.nombre} 
                            style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} 
                          />
                        ) : (
                          <i className="fa-solid fa-guitar text-secondary fs-4"></i>
                        )}
                      </div>

                      <div className="flex-grow-1">
                        <div className="d-flex justify-content-between align-items-start">
                          <h6 className="fw-bold mb-1 text-dark" style={{ fontSize: '0.95rem' }}>
                            {item.marca} - {item.nombre}
                          </h6>

                          <button 
                            type="button" 
                            className="btn btn-link text-danger p-0 border-0 ms-2 text-decoration-none"
                            onClick={(e) => {
                              e.preventDefault()
                              e.stopPropagation()
                              if (eliminarDelCarrito) {
                                eliminarDelCarrito(identificador)
                              }
                            }}
                            title="Eliminar ítem"
                            style={{ cursor: 'pointer', zIndex: 5 }}
                          >
                            <i className="fa-solid fa-trash-can"></i>
                          </button>
                        </div>

                        <span className={`badge mb-2 ${item.tipoOperacion === 'arriendo' ? 'bg-warning text-dark' : 'bg-success'}`}>
                          {item.tipoOperacion === 'arriendo' ? `Arriendo (${item.diasArriendo || 1} días)` : 'Venta'}
                        </span>

                        <div className="d-flex align-items-center justify-content-between mt-1">
                          <div className="d-flex align-items-center border rounded-pill bg-light px-2 py-1">

                            <button 
                              type="button" 
                              className="btn btn-sm cart-quantity-button fw-bold"
                              aria-label="Disminuir cantidad"
                              onClick={(e) => {
                                e.preventDefault()
                                e.stopPropagation()
                                if (cambiarCantidad && item.cantidad > 1) {
                                  cambiarCantidad(identificador, item.cantidad - 1)
                                }
                              }}
                              disabled={item.cantidad <= 1}
                              style={{ cursor: item.cantidad <= 1 ? 'not-allowed' : 'pointer' }}
                            >
                              −
                            </button>
                            
                            <span className="fw-semibold px-2" style={{ fontSize: '0.85rem' }}>
                              {item.cantidad}
                            </span>

                            <button 
                              type="button" 
                              className="btn btn-sm cart-quantity-button fw-bold"
                              aria-label="Aumentar cantidad"
                              onClick={(e) => {
                                e.preventDefault()
                                e.stopPropagation()
                                if (cambiarCantidad && !alcanzomaximo) {
                                  cambiarCantidad(identificador, item.cantidad + 1)
                                }
                              }}
                              disabled={alcanzomaximo}
                              style={{ cursor: alcanzomaximo ? 'not-allowed' : 'pointer' }}
                              title={alcanzomaximo ? `Stock máximo alcanzado (${stockMaximo})` : 'Sumar unidad'}
                            >
                              +
                            </button>
                          </div>

                          <span className="fw-bold text-danger fs-6 ms-2">
                            ${calcularSubtotalItem(item).toLocaleString('es-CL')}
                          </span>
                        </div>

                        {alcanzomaximo && (
                          <small className="text-warning-emphasis d-block mt-1" style={{ fontSize: '0.72rem' }}>
                            <i className="fa-solid fa-circle-info me-1"></i>Stock máximo alcanzado ({stockMaximo})
                          </small>
                        )}
                      </div>

                    </div>
                  </div>
                )
              })}
            </div>

            <div className="pt-3 border-top mt-auto">
              <div className="d-flex justify-content-between align-items-center mb-3">
                <span className="text-secondary fw-bold" style={{ fontSize: '0.9rem' }}>SUBTOTAL:</span>
                <span className="fw-bold fs-4 text-danger">
                  ${totalGeneral.toLocaleString('es-CL')}
                </span>
              </div>

              <div className="d-grid gap-2">
                <button 
                  type="button" 
                  className="btn btn-outline-secondary rounded-pill py-2 small fw-semibold d-flex align-items-center justify-content-center gap-2"
                  onClick={() => {
                    onClose()
                    onIrAlCarritoCompleto()
                  }}
                >
                  <i className="fa-solid fa-eye"></i>
                  <span>Ver carrito completo</span>
                </button>

                <button 
                  type="button" 
                  className="btn rounded-pill py-2 fw-bold text-white text-uppercase"
                  style={{ backgroundColor: 'var(--store-primary)' }}
                  onClick={() => {
                    onClose()
                    onFinalizarCompra()
                  }}
                >
                  <i className="fa-solid fa-credit-card me-2"></i>
                  FINALIZAR COMPRA
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
