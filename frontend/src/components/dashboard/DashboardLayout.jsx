import React, { Fragment, useEffect, useLayoutEffect, useRef, useState } from 'react'
import sbAdminCss from '../../vendor/sb-admin-2/sb-admin-2.css?inline'
import puenteCss from './sb-admin-bridge.css?inline'

// Aplica los estilos solo dentro del panel.

function useEstilosSbAdmin() {
  useLayoutEffect(() => {
    const estilo = document.createElement('style')
    estilo.dataset.origen = 'sb-admin-2'
    estilo.textContent = `${sbAdminCss}\n${puenteCss}`
    document.head.appendChild(estilo)
    return () => estilo.remove()
  }, [])
}


export function DashboardLayout({
  usuario,
  marca = 'Distortion House',
  rolEtiqueta,
  titulo,
  opciones,
  activa,
  onSeleccionar,
  seccionPerfil = 'perfil',
  onVolverAlCatalogo,
  onCerrarSesion,
  modoOscuro,
  setModoOscuro,
  aviso,
  children,
}) {
  useEstilosSbAdmin()

  
  const [sidebarColapsado, setSidebarColapsado] = useState(false)
  const [menuUsuarioAbierto, setMenuUsuarioAbierto] = useState(false)
  const [confirmarSalida, setConfirmarSalida] = useState(false)
  const [mostrarSubir, setMostrarSubir] = useState(false)
  const menuUsuarioRef = useRef(null)

  
  useEffect(() => {
    document.body.classList.toggle('sidebar-toggled', sidebarColapsado)
    return () => document.body.classList.remove('sidebar-toggled')
  }, [sidebarColapsado])

  
  useEffect(() => {
    if (!menuUsuarioAbierto) return
    const alClic = (e) => { if (!menuUsuarioRef.current?.contains(e.target)) setMenuUsuarioAbierto(false) }
    const alTecla = (e) => { if (e.key === 'Escape') setMenuUsuarioAbierto(false) }
    document.addEventListener('mousedown', alClic)
    document.addEventListener('keydown', alTecla)
    return () => {
      document.removeEventListener('mousedown', alClic)
      document.removeEventListener('keydown', alTecla)
    }
  }, [menuUsuarioAbierto])

  
  useEffect(() => {
    const alDesplazar = () => setMostrarSubir(window.scrollY > 100)
    alDesplazar()
    window.addEventListener('scroll', alDesplazar, { passive: true })
    return () => window.removeEventListener('scroll', alDesplazar)
  }, [])

  const seleccionar = (id) => {
    onSeleccionar(id)
    setMenuUsuarioAbierto(false)
    window.scrollTo({ top: 0 })
  }

  const nombreUsuario = usuario?.nombre || usuario?.first_name || usuario?.email || 'Usuario'

  return (
    <div id="wrapper">
      
      <ul
        className={`navbar-nav bg-gradient-primary sidebar sidebar-dark accordion${sidebarColapsado ? ' toggled' : ''}`}
        id="accordionSidebar"
        aria-label="Menú del panel"
      >
        <li>
          <button type="button" className="sidebar-brand d-flex align-items-center justify-content-center" onClick={onVolverAlCatalogo} title="Ir al catálogo público">
            <div className="sidebar-brand-icon rotate-n-15">
              <i className="fas fa-guitar"></i>
            </div>
            <div className="sidebar-brand-text mx-3">{marca}</div>
          </button>
        </li>

        <hr className="sidebar-divider my-0" />

        {opciones.map((op, i) => {
          const nuevoGrupo = op.grupo && op.grupo !== opciones[i - 1]?.grupo
          return (
            <Fragment key={op.id}>
              {nuevoGrupo && i > 0 && <hr className="sidebar-divider" />}
              {nuevoGrupo && <div className="sidebar-heading">{op.grupo}</div>}
              <li className={`nav-item${activa === op.id ? ' active' : ''}`}>
                <button
                  type="button"
                  className="nav-link"
                  onClick={() => seleccionar(op.id)}
                  aria-current={activa === op.id ? 'page' : undefined}
                >
                  <i className={`fas fa-fw ${op.icono}`}></i>
                  <span>{op.titulo}</span>
                </button>
              </li>
            </Fragment>
          )
        })}

        <hr className="sidebar-divider" />

        <li className="nav-item">
          <button type="button" className="nav-link" onClick={onVolverAlCatalogo}>
            <i className="fas fa-fw fa-store"></i>
            <span>Ver catálogo público</span>
          </button>
        </li>

        <hr className="sidebar-divider d-none d-md-block" />

        <li className="text-center d-none d-md-inline">
          <button
            type="button"
            className="rounded-circle border-0"
            id="sidebarToggle"
            onClick={() => setSidebarColapsado(c => !c)}
            aria-label={sidebarColapsado ? 'Expandir menú lateral' : 'Colapsar menú lateral'}
          ></button>
        </li>
      </ul>

      
      <div id="content-wrapper" className="d-flex flex-column">
        <div id="content">
          
          <nav className="navbar navbar-expand navbar-light bg-white topbar mb-4 static-top shadow">
            <button
              type="button"
              id="sidebarToggleTop"
              className="btn btn-link d-md-none rounded-circle me-3"
              onClick={() => setSidebarColapsado(c => !c)}
              aria-label="Mostrar u ocultar menú lateral"
            >
              <i className="fa fa-bars"></i>
            </button>

            {rolEtiqueta && (
              <span className="badge rounded-pill bg-primary d-none d-sm-inline-block">{rolEtiqueta}</span>
            )}

            <ul className="navbar-nav ms-auto">
              {setModoOscuro && (
                <li className="nav-item mx-1">
                  <button
                    type="button"
                    className="nav-link btn btn-link"
                    onClick={() => setModoOscuro(m => !m)}
                    aria-label={modoOscuro ? 'Activar modo claro' : 'Activar modo oscuro'}
                    title={modoOscuro ? 'Modo claro' : 'Modo oscuro'}
                  >
                    <i className={`fas fa-fw ${modoOscuro ? 'fa-sun' : 'fa-moon'}`}></i>
                  </button>
                </li>
              )}

              <li className="topbar-divider d-none d-sm-block" aria-hidden="true"></li>

              <li className={`nav-item dropdown no-arrow${menuUsuarioAbierto ? ' show' : ''}`} ref={menuUsuarioRef}>
                <button
                  type="button"
                  className="nav-link dropdown-toggle btn btn-link"
                  id="userDropdown"
                  aria-haspopup="true"
                  aria-expanded={menuUsuarioAbierto}
                  onClick={() => setMenuUsuarioAbierto(a => !a)}
                >
                  <span className="me-2 d-none d-lg-inline text-gray-600 small">{nombreUsuario}</span>
                  <i className="fas fa-user-circle fa-2x text-gray-400"></i>
                </button>
                <div
                  className={`dropdown-menu dropdown-menu-end shadow animated--grow-in${menuUsuarioAbierto ? ' show' : ''}`}
                  data-bs-popper="static"
                  aria-labelledby="userDropdown"
                >
                  <div className="dropdown-header">{usuario?.email}</div>
                  <button type="button" className="dropdown-item" onClick={() => seleccionar(seccionPerfil)}>
                    <i className="fas fa-user fa-sm fa-fw me-2 text-gray-400"></i>
                    Mi perfil
                  </button>
                  <button type="button" className="dropdown-item" onClick={onVolverAlCatalogo}>
                    <i className="fas fa-store fa-sm fa-fw me-2 text-gray-400"></i>
                    Ver catálogo
                  </button>
                  <div className="dropdown-divider"></div>
                  <button type="button" className="dropdown-item" onClick={() => { setMenuUsuarioAbierto(false); setConfirmarSalida(true) }}>
                    <i className="fas fa-sign-out-alt fa-sm fa-fw me-2 text-gray-400"></i>
                    Cerrar sesión
                  </button>
                </div>
              </li>
            </ul>
          </nav>

          
          <div className="container-fluid">
            {aviso}
            {titulo && (
              <div className="d-sm-flex align-items-center justify-content-between mb-4">
                <h1 className="h3 mb-0 text-gray-800">{titulo}</h1>
              </div>
            )}
            {children}
          </div>
        </div>

        <footer className="sticky-footer bg-white">
          <div className="container my-auto">
            <div className="copyright text-center my-auto">
              <span>Copyright &copy; {marca} {new Date().getFullYear()}</span>
            </div>
          </div>
        </footer>
      </div>

      {mostrarSubir && (
        <button type="button" className="scroll-to-top rounded border-0" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} aria-label="Volver arriba">
          <i className="fas fa-angle-up"></i>
        </button>
      )}

      
      {confirmarSalida && (
        <>
          <div className="modal fade show d-block" tabIndex="-1" role="dialog" aria-modal="true" aria-labelledby="tituloSalida" onClick={() => setConfirmarSalida(false)}>
            <div className="modal-dialog" role="document" onClick={e => e.stopPropagation()}>
              <div className="modal-content">
                <div className="modal-header">
                  <h5 className="modal-title" id="tituloSalida">¿Listo para salir?</h5>
                  <button type="button" className="btn-close" aria-label="Cerrar" onClick={() => setConfirmarSalida(false)}></button>
                </div>
                <div className="modal-body">Selecciona "Cerrar sesión" si quieres terminar tu sesión actual.</div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={() => setConfirmarSalida(false)}>Cancelar</button>
                  <button type="button" className="btn btn-primary" onClick={() => { setConfirmarSalida(false); onCerrarSesion() }}>Cerrar sesión</button>
                </div>
              </div>
            </div>
          </div>
          <div className="modal-backdrop fade show"></div>
        </>
      )}
    </div>
  )
}
