import React, { useState } from 'react'

export function OrderHistory({ pedidos = [], verComprobante, volverAlCatalogo }) {
  const [filtroTipo, setFiltroTipo] = useState('todos') 

  
  const obtenerTipoPedido = (pedido) => {
    const tieneArriendo = pedido.items?.some(i => i.tipoOperacion === 'arriendo')
    const tieneVenta = pedido.items?.some(i => i.tipoOperacion !== 'arriendo')

    if (tieneArriendo && tieneVenta) return 'mixto'
    if (tieneArriendo) return 'arriendo'
    return 'venta'
  }

  
  const pedidosFiltrados = pedidos.filter(ped => {
    if (filtroTipo === 'todos') return true
    const tipo = obtenerTipoPedido(ped)
    if (filtroTipo === 'arriendo') return tipo === 'arriendo' || tipo === 'mixto'
    if (filtroTipo === 'venta') return tipo === 'venta' || tipo === 'mixto'
    return true
  })

  return (
    <div className="container py-4" style={{ maxWidth: '1000px' }}>

      <div className="d-flex align-items-center justify-content-between mb-4 border-bottom pb-2">
        <h3 className="fw-bold text-dark mb-0 d-flex align-items-center gap-2">
          <i className="fa-solid fa-clock-rotate-left text-primary"></i>
          Historial de Mis Pedidos
        </h3>
        <button 
          type="button" 
          onClick={volverAlCatalogo} 
          className="btn btn-outline-secondary btn-sm rounded-pill px-3"
        >
          <i className="fa-solid fa-arrow-left me-1"></i> Volver
        </button>
      </div>

      <div className="d-flex align-items-center gap-2 mb-4">
        <span className="fw-semibold text-muted small me-2">Filtrar por tipo:</span>
        
        <button
          type="button"
          onClick={() => setFiltroTipo('todos')}
          className={`btn btn-sm rounded-pill px-3 ${filtroTipo === 'todos' ? 'btn-dark' : 'btn-outline-secondary'}`}
        >
          Todos ({pedidos.length})
        </button>

        <button
          type="button"
          onClick={() => setFiltroTipo('venta')}
          className={`btn btn-sm rounded-pill px-3 ${filtroTipo === 'venta' ? 'btn-success text-white' : 'btn-outline-success'}`}
        >
          <i className="fa-solid fa-bag-shopping me-1"></i>Compras / Ventas
        </button>

        <button
          type="button"
          onClick={() => setFiltroTipo('arriendo')}
          className={`btn btn-sm rounded-pill px-3 ${filtroTipo === 'arriendo' ? 'btn-info text-white' : 'btn-outline-info'}`}
        >
          <i className="fa-solid fa-key me-1"></i>Arriendos
        </button>
      </div>

      {pedidosFiltrados.length === 0 ? (
        <div className="alert alert-light text-center border p-5 shadow-sm rounded-3">
          <i className="fa-solid fa-receipt fa-3x text-muted mb-3 d-block"></i>
          <h5 className="fw-bold text-secondary">No hay pedidos en el historial</h5>
          <p className="text-muted small mb-0">
            {filtroTipo === 'todos' 
              ? 'Aún no has realizado ninguna compra o arriendo.' 
              : `No se encontraron registros de tipo "${filtroTipo}".`}
          </p>
        </div>
      ) : (
        <div className="card border-0 shadow-sm rounded-3 overflow-hidden">
          <div className="table-responsive">
            <table className="table align-middle mb-0">
              <thead className="table-light">
                <tr className="small text-muted text-uppercase">
                  <th>N° Pedido</th>
                  <th>Fecha</th>
                  <th className="text-center">Tipo</th>
                  <th className="text-center">Estado</th>
                  <th className="text-end">Monto Total</th>
                  <th className="text-center">Acción</th>
                </tr>
              </thead>
              <tbody>
                {pedidosFiltrados.map((ped) => {
                  const tipoPedido = obtenerTipoPedido(ped)
                  const estado = ped.estado || 'Completado'

                  return (
                    <tr key={ped.id}>
                      <td>
                        <strong className="text-dark">#{ped.id}</strong>
                      </td>
                      
                      <td className="text-muted small">
                        {ped.fecha}
                      </td>

                      <td className="text-center">
                        {tipoPedido === 'arriendo' && (
                          <span className="badge bg-info-subtle text-info border border-info px-2 py-1 small">
                            Arriendo
                          </span>
                        )}
                        {tipoPedido === 'venta' && (
                          <span className="badge bg-success-subtle text-success border border-success px-2 py-1 small">
                            Compra
                          </span>
                        )}
                        {tipoPedido === 'mixto' && (
                          <span className="badge bg-warning-subtle text-warning border border-warning px-2 py-1 small">
                            Compra y Arriendo
                          </span>
                        )}
                      </td>

                      <td className="text-center">
                        <span className="badge bg-secondary-subtle text-dark border px-2 py-1 small">
                          <i className="fa-solid fa-circle-check text-success me-1"></i>
                          {estado}
                        </span>
                      </td>

                      <td className="text-end fw-bold text-dark">
                        ${Number(ped.total || 0).toLocaleString('es-CL')}
                      </td>

                      <td className="text-center">
                        <button
                          type="button"
                          onClick={() => verComprobante(ped)}
                          className="btn btn-outline-primary btn-sm rounded-pill px-3"
                        >
                          <i className="fa-solid fa-file-invoice me-1"></i>Ver Comprobante
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

    </div>
  )
}