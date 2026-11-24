import { useState } from 'react'


function conPromocion(item) {
  if (item.tipoOperacion === 'venta' && item.precioVentaPromo != null && item.precioVentaOriginal === undefined) {
    return { ...item, precioVentaOriginal: item.precioVenta, precioVenta: item.precioVentaPromo }
  }
  return item
}


function sinPack(item) {
  if (!item.packId) return item
  const { packId, precioArriendoDiaOriginal, ...resto } = item
  return { ...resto, precioArriendoDia: precioArriendoDiaOriginal ?? item.precioArriendoDia }
}


const romperPack = (carrito, packId) => carrito.map(i => (packId && i.packId === packId ? sinPack(i) : i))

export function useCart() {
  const [carrito, setCarrito] = useState([])
  const [mostrarCarritoDrawer, setMostrarCarritoDrawer] = useState(false)

  
  const agregarAlCarrito = (itemOriginal) => {
    const itemNuevo = conPromocion(itemOriginal)
    setCarrito(carritoActual => {
      
      const existente = carritoActual.find(i => i.id === itemNuevo.id && i.tipoOperacion === itemNuevo.tipoOperacion)
      const prevCarrito = existente?.packId && existente.packId !== itemNuevo.packId
        ? romperPack(carritoActual, existente.packId)
        : carritoActual
      const indiceExistente = prevCarrito.findIndex(item => 
        item.id === itemNuevo.id && item.tipoOperacion === itemNuevo.tipoOperacion
      )

      if (indiceExistente !== -1) {
        const nuevoCarrito = [...prevCarrito]
        let itemExistente = { ...nuevoCarrito[indiceExistente] }

        if (itemNuevo.tipoOperacion === 'arriendo') {
          
          itemExistente = {
            ...sinPack(itemExistente),
            cantidad: 1,
            diasArriendo: itemNuevo.diasArriendo,
            fechaInicio: itemNuevo.fechaInicio,
            fechaTermino: itemNuevo.fechaTermino,
            ...(itemNuevo.packId ? {
              packId: itemNuevo.packId,
              precioArriendoDia: itemNuevo.precioArriendoDia,
              precioArriendoDiaOriginal: itemNuevo.precioArriendoDiaOriginal,
            } : {}),
          }
        } else {
          const stockMaximo = Number(itemExistente.stockDisponibleVenta ?? itemExistente.stockVenta ?? 10)
          const cantidadSumada = itemExistente.cantidad + itemNuevo.cantidad
          itemExistente.cantidad = Math.min(cantidadSumada, stockMaximo)
        }

        nuevoCarrito[indiceExistente] = itemExistente
        return nuevoCarrito
      }

      const keyUnica = itemNuevo.keyUnica || `${itemNuevo.id}-${itemNuevo.tipoOperacion}-${Date.now()}`
      return [...prevCarrito, { ...itemNuevo, keyUnica }]
    })

    setMostrarCarritoDrawer(true)
  }

  
  const eliminarDelCarrito = (identificador) => {
    setCarrito(prev => {
      const quitado = prev.find((item, idx) => (item.keyUnica !== undefined ? item.keyUnica : idx) === identificador)
      const resto = prev.filter((item, idx) => {
        const idActual = item.keyUnica !== undefined ? item.keyUnica : idx
        return idActual !== identificador
      })
      return quitado?.packId ? romperPack(resto, quitado.packId) : resto
    })
  }

  
  const vaciarCarrito = () => setCarrito([])

  
  const cambiarCantidad = (identificador, nuevaCantidad) => {
    setCarrito(prev => prev.map((item, idx) => {
      const idActual = item.keyUnica !== undefined ? item.keyUnica : idx
      if (idActual === identificador) {
        return { ...item, cantidad: nuevaCantidad }
      }
      return item
    }))
  }

  const totalProductosCarrito = carrito.reduce((acc, item) => acc + item.cantidad, 0)

  return {
    carrito,
    setCarrito,
    mostrarCarritoDrawer,
    setMostrarCarritoDrawer,
    agregarAlCarrito,
    eliminarDelCarrito,
    vaciarCarrito,
    cambiarCantidad,
    totalProductosCarrito
  }
}