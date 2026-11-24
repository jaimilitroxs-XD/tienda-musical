import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'

export function useNavigation() {
  const navigate = useNavigate()
  const location = useLocation()

  const [origenComprobante, setOrigenComprobante] = useState('checkout')
  const [origenHistorial, setOrigenHistorial] = useState('catalogo')
  const [pedidoActual, setPedidoActual] = useState(null)
  const [historialPedidos, setHistorialPedidos] = useState([])

  const irAlCatalogo = () => {
    navigate('/')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const verDetalleProducto = (prod) => {
    navigate(`/producto/${prod.id}`)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const irAlCarrito = () => {
    navigate('/carrito')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const irAlCheckout = () => {
    navigate('/pago')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const irAlHistorial = (origen = 'catalogo') => {
    setOrigenHistorial(origen)
    navigate('/mi-cuenta')
  }

  const irAlPerfil = () => {
    navigate('/mi-cuenta?seccion=perfil')
  }

  const irACategoria = (slug) => {
    if (!slug || slug === 'todas') {
      navigate('/')
    } else {
      navigate(`/categoria/${encodeURIComponent(slug.toLowerCase())}`)
    }
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const buscarProductos = (query) => {
    if (!query.trim()) {
      navigate('/')
    } else {
      navigate(`/buscar?q=${encodeURIComponent(query.trim())}`)
    }
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return {
    rutaActual: location.pathname,
    origenComprobante, setOrigenComprobante,
    origenHistorial,
    pedidoActual, setPedidoActual,
    historialPedidos, setHistorialPedidos,
    irAlCatalogo, verDetalleProducto, irAlCarrito, irAlCheckout, 
    irAlHistorial, irAlPerfil, irACategoria, buscarProductos
  }
}