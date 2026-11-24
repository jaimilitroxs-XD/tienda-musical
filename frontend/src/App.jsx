import { lazy, Suspense, useEffect, useState } from 'react'
import { Routes, Route, Navigate, useParams, useNavigate, useLocation } from 'react-router-dom'
import axios from 'axios'
import { leerCompartido } from './consultas'


import { Navbar } from './components/Navbar'
import { Footer } from './components/Footer'


import { Catalog } from './components/client/Catalog'
import { ProductDetail } from './components/client/ProductDetail'
import { CartPage } from './components/client/CartPage'
import { CartDrawer } from './components/client/CartDrawer'
import { CheckoutPage } from './components/client/CheckoutPage'
import { OrderReceiptModal } from './components/client/OrderReceiptModal'
import { ClientArea } from './components/client/ClientArea'
import { EventoDetalle } from './components/client/EventoDetalle'
import { AuthModal } from './components/client/AuthModal'
import { RentalWarningBanner } from './components/client/RentalWarningBanner'


const PanelAdministrativo = lazy(() => import('./components/admin/AdminPanel').then(m => ({ default: m.AdminPanel })))

function AdminPanel(props) {
  return <Suspense fallback={<p role="status" className="text-center p-4">Cargando panel…</p>}>
    <PanelAdministrativo {...props} />
  </Suspense>
}


import { useCart } from './hooks/useCart'
import { useNavigation } from './hooks/useNavigation'
import { useAuth } from './hooks/useAuth'

// Carga el producto solicitado y algunos relacionados.
function DetalleProductoWrapper({ volverAlCatalogo, agregarAlCarrito, onIniciarSesion }) {
  const { id } = useParams()
  const [prod, setProd] = useState(null)
  const [relacionados, setRelacionados] = useState([])
  const [estado, setEstado] = useState('cargando')

  useEffect(() => {
    let activo = true
    setEstado('cargando')
    leerCompartido(`/api/productos/${id}/`)
      .then(async ({ data }) => {
        if (!activo) return
        if (data.estado === false) { setEstado('no-encontrado'); return }
        setProd(data)
        setEstado('listo')
        const res = await leerCompartido('/api/productos/', { categoria: data.categoria, page: 1, page_size: 5 })
        if (activo) setRelacionados(res.data.results || [])
      })
      .catch(() => { if (activo) setEstado('no-encontrado') })
    return () => { activo = false }
  }, [id])

  if (estado === 'cargando') {
    return <div className="text-center my-5"><div className="spinner-border" style={{ color: 'var(--store-primary)' }} role="status"></div></div>
  }
  if (estado === 'no-encontrado') {
    return (
      <div className="alert alert-light text-center border shadow-sm">
        El producto no existe o ya no está disponible.
        <button className="btn btn-link" onClick={volverAlCatalogo}>Volver al catálogo</button>
      </div>
    )
  }

  return (
    <ProductDetail
      key={prod.id}
      producto={prod}
      productos={relacionados}
      volverAlCatalogo={volverAlCatalogo}
      onAgregarAlCarrito={agregarAlCarrito}
      onIniciarSesion={onIniciarSesion}
    />
  )
}

function App() {
  const { pathname } = useLocation()
  const [inputBusqueda, setInputBusqueda] = useState('')
  const [modoOscuro, setModoOscuro] = useState(() => {
    try { return localStorage.getItem('tienda-tema') === 'dark' }
    catch { return false }
  })
  useEffect(() => {
    const tema = modoOscuro ? 'dark' : 'light'
    document.documentElement.dataset.bsTheme = tema
    try { localStorage.setItem('tienda-tema', tema) } catch {}
  }, [modoOscuro])
  const navigate = useNavigate()

  
  const {
    usuario, cargandoAuth, estaLogueado, mostrarModalAuth, setMostrarModalAuth, pestanaInicial, destinoLogin,
    abrirAuthModal, iniciarSesion, registrarUsuario, actualizarPerfil, cambiarPassword,
    cerrarSesion, desactivarCuenta, avisoVencimiento, cerrarAvisoVencimiento
  } = useAuth()

  
  const {
    carrito, setCarrito, mostrarCarritoDrawer, setMostrarCarritoDrawer,
    agregarAlCarrito, eliminarDelCarrito, vaciarCarrito, cambiarCantidad, totalProductosCarrito
  } = useCart()

  
  const {
    origenComprobante, setOrigenComprobante,
    pedidoActual, setPedidoActual, historialPedidos, setHistorialPedidos,
    irAlCatalogo, verDetalleProducto, irAlCarrito, irAlCheckout, irAlHistorial, irAlPerfil,
    buscarProductos
  } = useNavigation()

  useEffect(() => {
    if (!usuario) { setHistorialPedidos([]); return }
    
    axios.get('/api/pedidos/', { params: { mios: 1 } }).then(res => setHistorialPedidos(res.data)).catch(() => setHistorialPedidos([]))
  }, [usuario, setHistorialPedidos])

  
  const manejarAccesoHistorial = () => {
    if (!estaLogueado) {
      abrirAuthModal('login', 'historial')
    } else {
      irAlHistorial('catalogo')
    }
  }

  
  const manejarAccesoCheckout = () => {
    if (!estaLogueado) {
      abrirAuthModal('login', 'checkout')
    } else {
      irAlCheckout()
    }
  }

  
  const manejarPostLogin = (usuarioLogueado) => {
    const user = usuarioLogueado || usuario
    const esAdmin = user?.es_admin || user?.rol === 'Admin'
    const esTecnico = user?.es_tecnico || user?.rol === 'Tecnico'

    if (esAdmin || esTecnico) {
      navigate('/admin-panel')
    } else if (destinoLogin === 'historial') {
      irAlHistorial('catalogo')
    } else if (destinoLogin === 'checkout') {
      irAlCheckout()
    }
  }

  
  const manejarCerrarSesionYRedirigir = async () => {
    await cerrarSesion()
    irAlCatalogo()
  }

  
  const manejarSubmitBusqueda = (e) => {
    e.preventDefault()
    buscarProductos(inputBusqueda)
  }

  
  const esRutaPanel = pathname.startsWith('/admin-panel') || pathname.startsWith('/mi-cuenta')

  const desactivarYSalir = async () => {
    const res = await desactivarCuenta()
    if (res.exito) irAlCatalogo()
    else alert(res.error)
  }

  const avisoArriendo = (
    <RentalWarningBanner
      aviso={avisoVencimiento}
      onClose={cerrarAvisoVencimiento}
    />
  )

  const esRutaPublica = pathname === '/' || pathname === '/buscar' || /^\/(categoria|producto|eventos)\/[^/]+\/?$/.test(pathname)
  const rutas = cargandoAuth && !esRutaPublica ? (
    <div className="text-center py-5">
      <p className="text-muted small">Verificando sesión...</p>
    </div>
  ) : (
    <Routes>
      <Route path="/" element={
        <Catalog
          onSeleccionarProducto={verDetalleProducto}
          onAgregarAlCarrito={agregarAlCarrito}
        />
      } />

      <Route path="/categoria/:slug" element={
        <Catalog
          onSeleccionarProducto={verDetalleProducto}
          onAgregarAlCarrito={agregarAlCarrito}
        />
      } />

      <Route path="/buscar" element={
        <Catalog
          onSeleccionarProducto={verDetalleProducto}
          onAgregarAlCarrito={agregarAlCarrito}
        />
      } />

      <Route path="/producto/:id" element={
        <DetalleProductoWrapper
          volverAlCatalogo={irAlCatalogo}
          agregarAlCarrito={agregarAlCarrito}
          onIniciarSesion={() => abrirAuthModal('login', null)}
        />
      } />

      
      <Route path="/mi-cuenta" element={
        <ClientArea
          usuario={usuario}
          pedidos={historialPedidos}
          verComprobante={(ped) => {
            setPedidoActual(ped);
            setOrigenComprobante('historial');
            navigate('/comprobante');
          }}
          volverAlCatalogo={irAlCatalogo}
          onIniciarSesion={() => abrirAuthModal('login', 'historial')}
          onActualizarPerfil={actualizarPerfil}
          onCambiarPassword={cambiarPassword}
          onDesactivarCuenta={desactivarYSalir}
          onCerrarSesion={manejarCerrarSesionYRedirigir}
          modoOscuro={modoOscuro}
          setModoOscuro={setModoOscuro}
          aviso={avisoArriendo}
        />
      } />
      {/* Conserva las rutas antiguas. */}
      <Route path="/perfil" element={<Navigate to="/mi-cuenta?seccion=perfil" replace />} />
      <Route path="/historial" element={<Navigate to="/mi-cuenta" replace />} />

      <Route path="/admin-panel" element={
        <AdminPanel
          usuario={usuario}
          volverAlCatalogo={irAlCatalogo}
          onActualizarPerfil={actualizarPerfil}
          onCambiarPassword={cambiarPassword}
          onDesactivarCuenta={desactivarYSalir}
          onCerrarSesion={manejarCerrarSesionYRedirigir}
          modoOscuro={modoOscuro}
          setModoOscuro={setModoOscuro}
          aviso={avisoArriendo}
        />
      } />

      
      <Route path="/eventos/:id" element={
        <EventoDetalle onAgregarAlCarrito={agregarAlCarrito} />
      } />

      <Route path="/carrito" element={
        <CartPage
          carrito={carrito}
          cambiarCantidad={cambiarCantidad}
          eliminarDelCarrito={eliminarDelCarrito}
          vaciarCarrito={vaciarCarrito}
          onFinalizarCompra={manejarAccesoCheckout}
          volverAlCatalogo={irAlCatalogo}
        />
      } />

      <Route path="/pago" element={
        <CheckoutPage
          carrito={carrito}
          volverAlCarrito={irAlCarrito}
          onPedidoExitoso={(datosOObjetoPedido) => {
            let nuevoPedido

            if (datosOObjetoPedido && datosOObjetoPedido.items) {
              nuevoPedido = datosOObjetoPedido
            } else {
              const subtotalCalc = carrito.reduce((acc, i) => {
                const precio = i.tipoOperacion === 'arriendo'
                  ? Number(i.precioArriendoDia || 25000) * (i.diasArriendo || 1)
                  : Number(i.precioVenta || 0)
                return acc + (precio * i.cantidad)
              }, 0)
              const ivaCalc = subtotalCalc * 0.19
              nuevoPedido = {
                id: Math.floor(100000 + Math.random() * 900000).toString(),
                fecha: new Date().toLocaleDateString('es-CL'),
                cliente: datosOObjetoPedido,
                items: [...carrito],
                subtotal: subtotalCalc,
                iva: ivaCalc,
                total: subtotalCalc + ivaCalc,
                estado: 'Completado'
              }
            }

            setHistorialPedidos(prev => [nuevoPedido, ...prev])
            setPedidoActual(nuevoPedido)
            setOrigenComprobante('checkout')
            setCarrito([])
            navigate('/comprobante')
          }}
        />
      } />

      <Route path="/comprobante" element={
        pedidoActual ? (
          <OrderReceiptModal
            pedido={pedidoActual}
            onClose={() => {
              if (origenComprobante === 'historial') {
                irAlHistorial()
              } else {
                irAlCatalogo()
              }
            }}
          />
        ) : null
      } />
    </Routes>
  )

  const modales = (
    <>
      <CartDrawer
        mostrar={mostrarCarritoDrawer}
        onClose={() => setMostrarCarritoDrawer(false)}
        carrito={carrito}
        eliminarDelCarrito={eliminarDelCarrito}
        cambiarCantidad={cambiarCantidad}
        onFinalizarCompra={manejarAccesoCheckout}
        onIrAlCarritoCompleto={irAlCarrito}
      />

      <AuthModal
        mostrar={mostrarModalAuth}
        onClose={() => setMostrarModalAuth(false)}
        modoInicial={pestanaInicial}
        onLogin={async (email, pass) => {
          const res = await iniciarSesion(email, pass)
          if (res?.exito) {
            manejarPostLogin(res.usuario)
          }
          return res
        }}
        onRegistro={async (datos) => {
          const res = await registrarUsuario(datos)
          if (res?.exito) {
            manejarPostLogin(res.usuario)
          }
          return res
        }}
      />
    </>
  )

  
  if (esRutaPanel) {
    return (
      <>
        {rutas}
        {modales}
      </>
    )
  }

  return (
    <div className="store-app d-flex flex-column min-vh-100">

      <Navbar
        inputBusqueda={inputBusqueda}
        setInputBusqueda={setInputBusqueda}
        manejarSubmitBusqueda={manejarSubmitBusqueda}
        modoOscuro={modoOscuro}
        setModoOscuro={setModoOscuro}
        totalProductosCarrito={totalProductosCarrito}
        setMostrarCarrito={() => setMostrarCarritoDrawer(true)}
        usuario={usuario}
        onCerrarSesion={manejarCerrarSesionYRedirigir}
        onAbrirAuth={(modo) => abrirAuthModal(modo, null)}
        onIrAlHistorial={manejarAccesoHistorial}
        onIrAlPerfil={irAlPerfil}
      />

      {avisoArriendo}

      <main className="container-fluid my-4 flex-grow-1 px-4 mx-auto" style={{ maxWidth: '1440px' }}>
        {rutas}
      </main>

      {modales}

      <Footer />
    </div>
  )
}

export default App
