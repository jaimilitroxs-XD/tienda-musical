import { useState } from 'react'

export function useOrders(onActualizado) {
  const [filterType, setFilterType] = useState('todos')
  const [filterStatus, setFilterStatus] = useState('todos')

  const getOrderType = order => {
    const arriendo = order.items?.some(item => item.tipoOperacion === 'arriendo')
    const venta = order.items?.some(item => item.tipoOperacion !== 'arriendo')
    if (arriendo && venta) return 'mixto'
    return arriendo ? 'arriendo' : 'venta'
  }

  const updateOrderStatus = async (orderId, newStatus) => {
    try {
      const res = await fetch(`/api/pedidos/${orderId}/`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ estado: newStatus }),
      })
      if (!res.ok) throw new Error((await res.json()).error || 'No se pudo actualizar el pedido.')
      onActualizado?.()
    } catch (error) {
      alert(error.message || 'No se pudo conectar con el servidor.')
    }
  }

  return { filterType, setFilterType, filterStatus, setFilterStatus, getOrderType, updateOrderStatus }
}
