import React from 'react'

export function OrderReceiptModal({ pedido, onClose }) {
  if (!pedido) return null

  const cliente = pedido.cliente || {}

  const nombreCliente = (cliente.nombre || cliente.apellidos)
    ? `${cliente.nombre || ''} ${cliente.apellidos || ''}`.trim()
    : 'Sin nombre'

  const rutCliente = cliente.rut || 'Sin RUT'

  
  const subtotalCalculado = pedido.subtotal || pedido.items?.reduce((acc, item) => {
    const esArriendo = item.tipoOperacion === 'arriendo'
    const precioUnitario = esArriendo 
      ? Number(item.precioArriendoDia || 25000) * (item.diasArriendo || 1)
      : Number(item.precioVenta || 0)
    return acc + (precioUnitario * item.cantidad)
  }, 0) || 0

  const ivaCalculado = pedido.iva || (subtotalCalculado * 0.19)
  const totalCalculado = pedido.total || (subtotalCalculado + ivaCalculado)

  return (
    <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}>
      <div className="modal-dialog modal-lg modal-dialog-centered">
        <div className="modal-content border-0 shadow-lg rounded-4">
          
          <div className="modal-header bg-light border-bottom-0 pb-0 pt-4 px-4">
            <div>
              <span className="badge bg-success mb-1">Resumen de pedido</span>
              <h4 className="fw-bold text-dark mb-0">Orden N° #{pedido.id}</h4>
            </div>
            <button type="button" className="btn-close" onClick={onClose}></button>
          </div>

          <div className="modal-body px-4 py-3">

            <div className="row g-3 p-3 bg-light rounded-3 mb-4 small border">
              <div className="col-sm-6">
                <span className="text-muted d-block">Cliente:</span>
                <strong className="text-dark fs-6">{nombreCliente}</strong>
              </div>
              <div className="col-sm-6">
                <span className="text-muted d-block">RUT:</span>
                <strong className="text-dark fs-6">{rutCliente}</strong>
              </div>
              <div className="col-sm-4">
                <span className="text-muted d-block">Fecha:</span>
                <strong className="text-dark">{pedido.fecha}</strong>
              </div>
              <div className="col-sm-4">
                <span className="text-muted d-block">Estado:</span>
                <span className="badge bg-primary-subtle text-primary border border-primary px-2">{pedido.estado}</span>
              </div>
              <div className="col-sm-4">
                <span className="text-muted d-block">Modalidad de entrega:</span>
                <strong className="text-dark">Retiro en tienda</strong>
              </div>
            </div>

            <h6 className="fw-bold text-dark mb-3">Detalle del Pedido</h6>
            <div className="table-responsive mb-4">
              <table className="table table-sm align-middle mb-0">
                <thead className="table-light small text-muted">
                  <tr>
                    <th>Producto</th>
                    <th className="text-center">Modalidad</th>
                    <th className="text-center">Cant. / Período</th>
                    <th className="text-end">Subtotal</th>
                  </tr>
                </thead>
                <tbody>
                  {pedido.items?.map((item, idx) => {
                    const esArriendo = item.tipoOperacion === 'arriendo'
                    const subItem = esArriendo 
                      ? Number(item.precioArriendoDia || 25000) * (item.diasArriendo || 1) * item.cantidad
                      : Number(item.precioVenta || 0) * item.cantidad

                    return (
                      <tr key={idx} className="small">
                        <td><strong className="text-dark">{item.marca} - {item.nombre}</strong></td>
                        <td className="text-center">
                          <span className={`badge ${esArriendo ? 'bg-info' : 'bg-success'} text-white`} style={{ fontSize: '0.65rem' }}>
                            {item.tipoOperacion || 'venta'}
                          </span>
                        </td>
                        <td className="text-center text-muted">
                          {esArriendo ? `${item.diasArriendo} días (${item.fechaInicio || 'Inicio'} a ${item.fechaTermino || 'Fin'})` : `${item.cantidad} un.`}
                        </td>
                        <td className="text-end fw-bold text-dark">${subItem.toLocaleString('es-CL')}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            <div className="border-top pt-3 text-end">
              <div className="text-muted small mb-1">Subtotal: <strong className="text-dark">${Number(subtotalCalculado).toLocaleString('es-CL')}</strong></div>
              <div className="text-muted small mb-2">IVA (19%): <strong className="text-dark">${Number(ivaCalculado).toLocaleString('es-CL')}</strong></div>
              <div className="fs-5 fw-bold text-dark">Total General: <span style={{ color: 'var(--store-primary)' }}>${Number(totalCalculado).toLocaleString('es-CL')}</span></div>
            </div>
          </div>

          <div className="modal-footer bg-light border-top-0 px-4 py-3">
            <button type="button" onClick={() => window.print()} className="btn btn-outline-secondary btn-sm rounded-pill px-3">
              <i className="fa-solid fa-print me-1"></i>Imprimir / PDF
            </button>
            <button type="button" onClick={onClose} className="btn text-white btn-sm rounded-pill px-4 fw-bold" style={{ backgroundColor: 'var(--store-primary)' }}>
              Cerrar Comprobante
            </button>
          </div>

        </div>
      </div>
    </div>
  )
}
