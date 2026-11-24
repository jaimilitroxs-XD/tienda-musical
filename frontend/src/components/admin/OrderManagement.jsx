import React, { useRef } from 'react'
import { useOrders } from '../../hooks/useOrders'
import { TablaGestion } from '../TablaGestion'

export function OrderManagement() {
  const tabla = useRef(null)
  const {
    filterType,
    setFilterType,
    filterStatus,
    setFilterStatus,
    getOrderType,
    updateOrderStatus,
  } = useOrders(() => tabla.current?.dt()?.ajax.reload(null, false))

  const celdasPedido = (order) => {

                const orderType = getOrderType(order)
                const clientName = order.cliente?.nombre 
                  ? `${order.cliente.nombre} ${order.cliente.apellidos || order.cliente.apellido || ''}`
                  : order.cliente?.email || 'Cliente General'

                const currentStatus = order.estado || 'Pagado'
                const statusLower = currentStatus.toLowerCase()

                const esPagado = statusLower === 'pagado'
                const esCompletado = statusLower === 'completado'
                const tieneArriendo = orderType === 'arriendo' || orderType === 'mixto'

    return [
      <>
#{order.id}
      </>,
      <>
<div className="fw-medium text-dark">{clientName}</div>
                      {order.cliente?.correo && (
                        <div className="text-muted" style={{ fontSize: '0.75rem' }}>
                          {order.cliente.correo}
                        </div>
                      )}
      </>,
      <>
{orderType === 'arriendo' && (
                        <span className="badge bg-info-subtle text-info border border-info-subtle px-2 py-1">
                          Arriendo
                        </span>
                      )}
                      {orderType === 'venta' && (
                        <span className="badge bg-success-subtle text-success border border-success-subtle px-2 py-1">
                          Compra
                        </span>
                      )}
                      {orderType === 'mixto' && (
                        <span className="badge bg-warning-subtle text-warning border border-warning-subtle px-2 py-1">
                          Compra y Arriendo
                        </span>
                      )}
      </>,
      <>
${Number(order.total || 0).toLocaleString('es-CL')}
      </>,
      <>
<span
                        className={`badge ${
                          statusLower === 'devuelto'
                            ? 'bg-secondary-subtle text-dark border border-secondary-subtle'
                            : statusLower === 'completado'
                            ? 'bg-success-subtle text-success border border-success-subtle'
                            : 'bg-primary-subtle text-primary border border-primary-subtle'
                        } px-2 py-1`}
                      >
                        {currentStatus}
                      </span>
      </>,
      <>
{statusLower === 'pendiente' && <button className="btn btn-outline-primary btn-sm" onClick={() => updateOrderStatus(order.id, 'Pagado')}>Confirmar pago presencial</button>}

                      {esPagado && (
                        <button
                          type="button"
                          onClick={() => updateOrderStatus(order.id, 'Completado')}
                          className="btn btn-outline-success btn-sm rounded-pill px-3"
                          style={{ minWidth: '160px', fontWeight: '500' }}
                          title="Marcar pedido como retirado por el cliente"
                        >
                          Completar
                        </button>
                      )}

                      {esCompletado && tieneArriendo && (
                        <button
                          type="button"
                          onClick={() => updateOrderStatus(order.id, 'Devuelto')}
                          className="btn btn-outline-info btn-sm rounded-pill px-3"
                          style={{ minWidth: '160px', fontWeight: '500' }}
                          title="Confirmar retorno del producto y liberar stock de arriendo"
                        >
                          Confirmar devolución
                        </button>
                      )}

                      
                      {(statusLower !== 'pendiente' && !esPagado && !(esCompletado && tieneArriendo)) && (
                        <span className="text-muted small italic" style={{ fontSize: '0.8rem' }}>
                          Sin acciones
                        </span>
                      )}
      </>
    ]
  }

  const columnas = [
    { titulo: 'N° Orden', campo: 'id', mostrar: order => celdasPedido(order)[0] },
    { titulo: 'Cliente', campo: 'cliente', mostrar: order => celdasPedido(order)[1] },
    { titulo: 'Tipo', campo: 'tipo', ordenable: false, mostrar: order => celdasPedido(order)[2] },
    { titulo: 'Monto Total', campo: 'total', mostrar: order => celdasPedido(order)[3] },
    { titulo: 'Estado', campo: 'estado', mostrar: order => celdasPedido(order)[4] },
    { titulo: 'Acciones', campo: 'acciones', ordenable: false, mostrar: order => celdasPedido(order)[5] }
  ]

  return (
    <div>

      <div className="d-flex justify-content-between align-items-center border-bottom pb-3 mb-3">
        <div>
          <h5 className="fw-bold text-dark mb-1">Sección Pedidos</h5>
          <p className="text-muted small mb-0">
            Seguimiento, retiro y recepción de devoluciones de productos en arriendo.
          </p>
        </div>
      </div>

      <div className="row g-3 mb-4 align-items-center">

        <div className="col-md-7 d-flex align-items-center gap-2">
          <span className="fw-semibold text-muted small me-1">Tipo:</span>
          
          <button
            type="button"
            onClick={() => setFilterType('todos')}
            className={`btn btn-sm rounded-pill px-3 fw-medium ${
              filterType === 'todos' ? 'btn-dark' : 'btn-outline-secondary'
            }`}
          >
            Todos
          </button>

          <button
            type="button"
            onClick={() => setFilterType('venta')}
            className={`btn btn-sm rounded-pill px-3 fw-medium ${
              filterType === 'venta' ? 'btn-success text-white' : 'btn-outline-success'
            }`}
          >
            <i className="fa-solid fa-bag-shopping me-1"></i>Compras
          </button>

          <button
            type="button"
            onClick={() => setFilterType('arriendo')}
            className={`btn btn-sm rounded-pill px-3 fw-medium ${
              filterType === 'arriendo' ? 'btn-info text-white' : 'btn-outline-info'
            }`}
          >
            <i className="fa-solid fa-key me-1"></i>Arriendos
          </button>
        </div>

        <div className="col-md-5 d-flex align-items-center justify-content-md-end gap-2">
          <label className="fw-semibold text-muted small me-1 text-nowrap">Estado:</label>
          <select
            className="form-select form-select-sm rounded-pill ps-3 pe-4 w-auto"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            style={{ minWidth: '160px' }}
          >
            <option value="todos">Todos los Estados</option>
            <option value="Pendiente">Pendiente</option>
            <option value="Pagado">Pagado</option>
            <option value="Completado">Completado</option>
            <option value="Devuelto">Devuelto</option>
          </select>
        </div>
      </div>

      <TablaGestion ref={tabla} url="/api/pedidos/" columnas={columnas}
        filtros={{ tipo: filterType, estado: filterStatus }} />

    </div>
  )
}
