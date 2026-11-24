import React, { useState, useEffect, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'

export function Navbar({
  inputBusqueda,
  setInputBusqueda,
  manejarSubmitBusqueda,
  modoOscuro,
  setModoOscuro,
  totalProductosCarrito,
  setMostrarCarrito,
  onIrAlHistorial,
  onIrAlPerfil,
  usuario,
  onCerrarSesion,
  onAbrirAuth
}) {
  const [mostrarMenuUsuario, setMostrarMenuUsuario] = useState(false)
  const menuRef = useRef(null)
  const navigate = useNavigate()

  
  useEffect(() => {
    const handleClickFuera = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setMostrarMenuUsuario(false)
      }
    }
    const handleEscape = (event) => { if (event.key === 'Escape') setMostrarMenuUsuario(false) }
    document.addEventListener('mousedown', handleClickFuera)
    document.addEventListener('keydown', handleEscape)
    return () => {
      document.removeEventListener('mousedown', handleClickFuera)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [])

  
  const esAdmin = usuario?.es_admin || usuario?.rol === 'Admin'
  const esTecnico = usuario?.es_tecnico || usuario?.rol === 'Tecnico'
  const inicial = (usuario?.nombre || usuario?.email || '?').trim().charAt(0).toUpperCase()

  
  const manejarAccesoCuenta = () => {
    setMostrarMenuUsuario(false)
    if (esAdmin || esTecnico) {
      navigate('/admin-panel')
    } else {
      onIrAlPerfil()
    }
  }

  const accion = (fn) => () => { setMostrarMenuUsuario(false); fn() }

  const limpiarBusqueda = () => {
    setInputBusqueda('')
    navigate('/')
  }

  return (
    <header className="tienda-header">
      <div className="tienda-header-inner">

        <Link to="/" className="tienda-logo" onClick={() => setInputBusqueda('')} aria-label="Distortion House, ir al inicio">
          <span className="tienda-logo-icono" aria-hidden="true">
            <i className="fa-solid fa-guitar"></i>
          </span>
          <span className="tienda-logo-texto">DISTORTION <span>HOUSE</span></span>
        </Link>

        <form onSubmit={manejarSubmitBusqueda} className="tienda-buscador" role="search">
          <i className="fa-solid fa-magnifying-glass" aria-hidden="true"></i>
          <input
            type="text"
            placeholder="Busca tu próximo equipo musical..."
            aria-label="Buscar productos por nombre o marca"
            value={inputBusqueda}
            onChange={(e) => setInputBusqueda(e.target.value)}
          />
          {inputBusqueda && (
            <button type="button" className="tienda-buscador-limpiar" onClick={limpiarBusqueda} aria-label="Limpiar búsqueda">
              <i className="fa-solid fa-xmark"></i>
            </button>
          )}
        </form>

        <div className="tienda-acciones">

          <button
            type="button"
            onClick={() => setModoOscuro(!modoOscuro)}
            className="tienda-boton-icono"
            title={modoOscuro ? 'Modo claro' : 'Modo oscuro'}
            aria-label={modoOscuro ? 'Activar modo claro' : 'Activar modo oscuro'}
            aria-pressed={modoOscuro}
          >
            <i className={`fa-solid ${modoOscuro ? 'fa-sun' : 'fa-moon'}`}></i>
          </button>

          <button
            type="button"
            onClick={setMostrarCarrito}
            className="tienda-boton-icono"
            title="Ver carrito"
            aria-label={`Carrito de compras, ${totalProductosCarrito} productos`}
          >
            <i className="fa-solid fa-cart-shopping"></i>
            {totalProductosCarrito > 0 && (
              <span className="tienda-insignia">{totalProductosCarrito}</span>
            )}
          </button>

          <div className="position-relative" ref={menuRef}>
            <button
              type="button"
              onClick={() => setMostrarMenuUsuario(!mostrarMenuUsuario)}
              className="tienda-boton-cuenta"
              aria-haspopup="true"
              aria-expanded={mostrarMenuUsuario}
            >
              {usuario ? (
                <span className="tienda-avatar" aria-hidden="true">{inicial}</span>
              ) : (
                <i className="fa-solid fa-user" aria-hidden="true"></i>
              )}
              <span className="texto">{usuario ? 'Mi cuenta' : 'Ingresar'}</span>
              <i className={`fa-solid fa-chevron-down small text-secondary ${mostrarMenuUsuario ? 'rotate-180' : ''}`} aria-hidden="true"></i>
            </button>

            {mostrarMenuUsuario && (
              <div className="tienda-menu">
                {!usuario ? (
                  <>
                    <button type="button" className="tienda-menu-item" onClick={accion(() => onAbrirAuth('login'))}>
                      <i className="fa-solid fa-right-to-bracket"></i>
                      <span>Iniciar sesión</span>
                    </button>
                    <button type="button" className="tienda-menu-item" onClick={accion(() => onAbrirAuth('registro'))}>
                      <i className="fa-solid fa-user-plus"></i>
                      <span>Crear cuenta</span>
                    </button>
                    <hr />
                    <button type="button" className="tienda-menu-item" onClick={accion(onIrAlHistorial)}>
                      <i className="fa-solid fa-box"></i>
                      <span>Mis pedidos</span>
                    </button>
                  </>
                ) : (
                  <>
                    <div className="tienda-menu-cabecera">
                      <strong className="text-truncate">
                        {usuario.nombre}
                        {esAdmin && <span className="badge bg-danger ms-1" style={{ fontSize: '0.62rem' }}>{usuario.es_superadmin ? 'Superadmin' : 'Vendedor'}</span>}
                        {!esAdmin && esTecnico && <span className="badge bg-warning text-dark ms-1" style={{ fontSize: '0.62rem' }}>Técnico</span>}
                      </strong>
                      <small>{usuario.email}</small>
                    </div>

                    <button type="button" className="tienda-menu-item" onClick={manejarAccesoCuenta}>
                      <i className={`fa-solid ${(esAdmin || esTecnico) ? 'fa-sliders' : 'fa-user-gear'}`}></i>
                      <span>{(esAdmin || esTecnico) ? 'Panel de gestión' : 'Mi perfil'}</span>
                    </button>
                    <button type="button" className="tienda-menu-item" onClick={accion(onIrAlHistorial)}>
                      <i className="fa-solid fa-box"></i>
                      <span>Mis pedidos</span>
                    </button>
                    <hr />
                    <button type="button" className="tienda-menu-item peligro" onClick={accion(onCerrarSesion)}>
                      <i className="fa-solid fa-right-from-bracket"></i>
                      <span>Cerrar sesión</span>
                    </button>
                  </>
                )}
              </div>
            )}
          </div>

        </div>
      </div>
    </header>
  )
}
