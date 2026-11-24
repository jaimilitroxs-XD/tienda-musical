import React, { useState, useEffect } from 'react'

export function UserProfile({ 
  usuario, 
  onActualizarPerfil, 
  onCambiarPassword, 
  onDesactivarCuenta, 
  onCerrarSesion,
  volverAlCatalogo, 
  onIrAlHistorial 
}) {
  const nombre = usuario?.nombre || 'Cliente'
  const [email, setEmail] = useState(usuario?.email || '')
  const [telefono, setTelefono] = useState(usuario?.telefono || '')
  const [msgDatos, setMsgDatos] = useState({ tipo: '', texto: '' })

  const [mostrarModalPass, setMostrarModalPass] = useState(false)
  const [passActual, setPassActual] = useState('')
  const [passNueva, setPassNueva] = useState('')
  const [passConfirm, setPassConfirm] = useState('')
  
  const [verPassActual, setVerPassActual] = useState(false)
  const [verPassNueva, setVerPassNueva] = useState(false)
  const [verPassConfirm, setVerPassConfirm] = useState(false)
  
  const [msgPass, setMsgPass] = useState('')
  const [enviandoPass, setEnviandoPass] = useState(false)

  const [errorDesactivar, setErrorDesactivar] = useState('')
  const [mostrarModalConfirmacion, setMostrarModalConfirmacion] = useState(false)

  const tieneArriendosActivos = usuario?.arriendosActivos && usuario.arriendosActivos.length > 0

  const inputIntermediateStyle = {
    paddingTop: '0.3rem',
    paddingBottom: '0.3rem',
    fontSize: '0.9rem'
  }

  useEffect(() => {
    if (usuario) {
      setEmail(usuario.email || '')
      setTelefono(usuario.telefono || '')
    }
  }, [usuario])

  const abrirModalPassword = () => {
    setPassActual('')
    setPassNueva('')
    setPassConfirm('')
    setMsgPass('')
    setVerPassActual(false)
    setVerPassNueva(false)
    setVerPassConfirm(false)
    setMostrarModalPass(true)
  }

  const cerrarModalPassword = () => {
    setPassActual('')
    setPassNueva('')
    setPassConfirm('')
    setMsgPass('')
    setMostrarModalPass(false)
  }

  
  const handleGuardarDatos = async (e) => {
    e.preventDefault()
    setMsgDatos({ tipo: '', texto: '' })

    const emailLimpio = email.trim().toLowerCase()
    if (!emailLimpio) {
      setMsgDatos({ tipo: 'danger', texto: 'El campo "Correo Electrónico" es obligatorio.' })
      return
    }

    const res = await onActualizarPerfil({ 
      user_id: usuario?.id,
      nombre, 
      email: emailLimpio,
      telefono: telefono.trim()
    })

    if (res?.exito) {
      setMsgDatos({ tipo: 'success', texto: '¡Datos de contacto actualizados correctamente!' })
    } else {
      setMsgDatos({ tipo: 'danger', texto: res?.error || 'Error al actualizar los datos en el servidor.' })
    }
  }

  const handleCambiarPassword = async (e) => {
    e.preventDefault()
    setMsgPass('')

    if (!passActual.trim()) {
      setMsgPass('El campo "Contraseña Actual" es obligatorio.')
      return
    }

    if (passNueva.length < 6) {
      setMsgPass('La nueva contraseña debe tener al menos 6 caracteres.')
      return
    }

    if (passNueva !== passConfirm) {
      setMsgPass('Las contraseñas no coinciden.')
      return
    }

    setEnviandoPass(true)

    try {
      const res = await onCambiarPassword(passActual, passNueva)
      if (res?.exito) {
        cerrarModalPassword()
        if (onCerrarSesion) {
          await onCerrarSesion()
        }
      } else {
        setMsgPass(res?.error || 'El campo "Contraseña Actual" ingresada es incorrecta.')
      }
    } catch (err) {
      setMsgPass('Error de conexión con el servidor.')
    } finally {
      setEnviandoPass(false)
    }
  }

  const handleIntentarDesactivar = () => {
    if (tieneArriendosActivos) {
      setErrorDesactivar('No puedes desactivar tu cuenta mientras tengas arriendos activos sin devolver.')
      return
    }
    setErrorDesactivar('')
    setMostrarModalConfirmacion(true)
  }

  return (
    <div className="container py-4" style={{ maxWidth: '850px' }}>

      <div className="d-flex align-items-center justify-content-between mb-4 border-bottom pb-2">
        <div>
          <h4 className="fw-bold text-dark mb-1 d-flex align-items-center gap-2">
            <i className="fa-solid fa-user-gear text-primary"></i>
            Mi Perfil
          </h4>
          <p className="text-muted small mb-0">Gestión de credenciales y correo de contacto institucional.</p>
        </div>
        <button 
          type="button" 
          onClick={volverAlCatalogo} 
          className="btn btn-outline-secondary btn-sm rounded-pill px-3 fw-semibold"
        >
          <i className="fa-solid fa-arrow-left me-1"></i>Volver
        </button>
      </div>

      {msgDatos.texto && (
        <div className={`alert alert-${msgDatos.tipo} p-3 mb-4 rounded-3 d-flex align-items-center justify-content-between shadow-sm border`}>
          <div className="d-flex align-items-center gap-2">
            <i className={`fa-solid ${msgDatos.tipo === 'success' ? 'fa-circle-check text-success' : 'fa-circle-exclamation text-danger'} fs-5`}></i>
            <span className="small fw-semibold">{msgDatos.texto}</span>
          </div>
          <button 
            type="button" 
            className="btn-close ms-3" 
            onClick={() => setMsgDatos({ tipo: '', texto: '' })}
            aria-label="Cerrar aviso"
            style={{ fontSize: '0.8rem' }}
          ></button>
        </div>
      )}

      <div className="card border-0 shadow-sm rounded-4 p-4 mb-4">
        <h6 className="fw-bold text-dark mb-3 border-bottom pb-2">
          <i className="fa-solid fa-user me-2 text-primary"></i>Datos de Cuenta
        </h6>

        <form onSubmit={handleGuardarDatos} autoComplete="off">
          <div className="row g-3">

            <div className="col-md-4">
              <label className="form-label small text-muted mb-1 fw-semibold">Nombre Completo</label>
              <input 
                type="text" 
                className="form-control rounded-pill px-3 bg-light text-muted"
                style={inputIntermediateStyle}
                value={nombre} 
                disabled
                readOnly
              />
            </div>

            <div className="col-md-4">
              <label className="form-label small text-muted mb-1 fw-semibold">Correo Electrónico</label>
              <input 
                type="email" 
                className="form-control rounded-pill px-3"
                style={inputIntermediateStyle}
                value={email} 
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="col-md-4">
              <label className="form-label small text-muted mb-1 fw-semibold">Teléfono de Contacto</label>
              <input 
                type="text" 
                className="form-control rounded-pill px-3"
                style={inputIntermediateStyle}
                placeholder="+56 9 1234 5678"
                value={telefono} 
                onChange={(e) => setTelefono(e.target.value)}
              />
            </div>
          </div>

          <div className="d-flex justify-content-end mt-3">
            <button type="submit" className="btn btn-dark btn-sm rounded-pill px-4 fw-medium">
              Guardar Datos
            </button>
          </div>
        </form>

        <hr className="my-4 text-muted opacity-25" />

        <div className="d-flex align-items-center justify-content-between">
          <div>
            <h6 className="fw-bold mb-1 text-dark">Seguridad de la Cuenta</h6>
            <small className="text-muted">Cambia tu contraseña para mantener la seguridad del sistema.</small>
          </div>
          <button 
            type="button" 
            onClick={abrirModalPassword} 
            className="btn btn-outline-dark btn-sm rounded-pill px-3 fw-bold"
          >
            <i className="fa-solid fa-key me-1"></i>Cambiar Contraseña
          </button>
        </div>

        {onIrAlHistorial && (
          <>
            <hr className="my-4 text-muted opacity-25" />
            <div className="d-flex align-items-center justify-content-between">
              <div>
                <h6 className="fw-bold mb-1 text-dark">Historial de Pedidos</h6>
                <small className="text-muted">Revisa tus compras y solicitudes anteriores.</small>
              </div>
              <button 
                type="button" 
                onClick={onIrAlHistorial} 
                className="btn btn-outline-dark btn-sm rounded-pill px-3 fw-bold"
              >
                Ver Pedidos
              </button>
            </div>
          </>
        )}
      </div>

      {onDesactivarCuenta && (
        <div className="card border-danger border-opacity-25 bg-danger-subtle rounded-4 p-4">
          <h6 className="fw-bold text-danger mb-2">Desactivar Cuenta</h6>
          <p className="small text-muted mb-3">
            Al desactivar tu cuenta, la sesión se cerrará e inhabilitará el acceso al sistema.
          </p>

          {errorDesactivar && (
            <div className="alert alert-danger py-2 px-3 small mb-3 rounded-3 d-flex align-items-center justify-content-between">
              <div>
                <i className="fa-solid fa-circle-exclamation me-1"></i>
                {errorDesactivar}
              </div>
              <button 
                type="button" 
                className="btn-close" 
                onClick={() => setErrorDesactivar('')}
                style={{ fontSize: '0.75rem' }}
              ></button>
            </div>
          )}

          <div>
            <button 
              type="button" 
              onClick={handleIntentarDesactivar}
              className="btn btn-danger rounded-pill px-4 fw-bold small"
            >
              <i className="fa-solid fa-user-slash me-2"></i>
              Desactivar mi cuenta
            </button>
          </div>
        </div>
      )}

      {mostrarModalPass && (
        <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.55)', zIndex: 1080 }}>
          <div className="modal-dialog modal-dialog-centered" style={{ maxWidth: '440px' }}>
            <div className="modal-content rounded-4 border-0 shadow-lg">
              <div className="modal-header border-bottom px-4 py-3">
                <h5 className="fw-bold text-dark mb-0">Cambiar Contraseña</h5>
                <button type="button" className="btn-close" onClick={cerrarModalPassword} disabled={enviandoPass}></button>
              </div>

              <form onSubmit={handleCambiarPassword} autoComplete="off">
                <div className="modal-body p-4">
                  {msgPass && (
                    <div className="alert alert-danger p-2 small mb-3 rounded-3 d-flex align-items-center justify-content-between">
                      <div className="d-flex align-items-center gap-1">
                        <i className="fa-solid fa-triangle-exclamation me-1"></i>
                        <span>{msgPass}</span>
                      </div>
                      <button 
                        type="button" 
                        className="btn-close" 
                        onClick={() => setMsgPass('')}
                        style={{ fontSize: '0.75rem' }}
                      ></button>
                    </div>
                  )}

                  <div className="mb-3">
                    <label className="form-label small fw-semibold text-secondary">Contraseña Actual *</label>
                    <div className="position-relative">
                      <input 
                        type={verPassActual ? "text" : "password"} 
                        className="form-control rounded-pill ps-3 pe-5"
                        style={inputIntermediateStyle}
                        placeholder="Ingresa tu contraseña actual"
                        value={passActual}
                        onChange={(e) => setPassActual(e.target.value)}
                        disabled={enviandoPass}
                        required 
                      />
                      <button 
                        type="button"
                        onClick={() => setVerPassActual(!verPassActual)}
                        className="btn btn-link position-absolute end-0 top-50 translate-middle-y text-secondary p-0 me-3 border-0 shadow-none"
                      >
                        <i className={`fa-solid ${verPassActual ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                      </button>
                    </div>
                  </div>

                  <div className="mb-3">
                    <label className="form-label small fw-semibold text-secondary">Nueva Contraseña *</label>
                    <div className="position-relative">
                      <input 
                        type={verPassNueva ? "text" : "password"} 
                        className="form-control rounded-pill ps-3 pe-5" 
                        style={inputIntermediateStyle}
                        placeholder="Mínimo 6 caracteres"
                        value={passNueva}
                        onChange={(e) => setPassNueva(e.target.value)}
                        disabled={enviandoPass}
                        required 
                      />
                      <button 
                        type="button"
                        onClick={() => setVerPassNueva(!verPassNueva)}
                        className="btn btn-link position-absolute end-0 top-50 translate-middle-y text-secondary p-0 me-3 border-0 shadow-none"
                      >
                        <i className={`fa-solid ${verPassNueva ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                      </button>
                    </div>
                  </div>

                  <div className="mb-3">
                    <label className="form-label small fw-semibold text-secondary">Confirmar Nueva Contraseña *</label>
                    <div className="position-relative">
                      <input 
                        type={verPassConfirm ? "text" : "password"} 
                        className="form-control rounded-pill ps-3 pe-5" 
                        style={inputIntermediateStyle}
                        placeholder="Repite la nueva contraseña"
                        value={passConfirm}
                        onChange={(e) => setPassConfirm(e.target.value)}
                        disabled={enviandoPass}
                        required 
                      />
                      <button 
                        type="button"
                        onClick={() => setVerPassConfirm(!verPassConfirm)}
                        className="btn btn-link position-absolute end-0 top-50 translate-middle-y text-secondary p-0 me-3 border-0 shadow-none"
                      >
                        <i className={`fa-solid ${verPassConfirm ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                      </button>
                    </div>
                  </div>
                </div>

                <div className="modal-footer border-top p-3 justify-content-end">
                  <button 
                    type="button" 
                    className="btn btn-light rounded-pill px-3 fw-semibold small" 
                    onClick={cerrarModalPassword}
                    disabled={enviandoPass}
                  >
                    Cancelar
                  </button>
                  <button 
                    type="submit" 
                    disabled={enviandoPass}
                    className="btn btn-dark rounded-pill px-4 fw-medium small"
                  >
                    {enviandoPass ? 'Actualizando...' : 'Actualizar Contraseña'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {mostrarModalConfirmacion && (
        <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1080 }}>
          <div className="modal-dialog modal-dialog-centered" style={{ maxWidth: '400px' }}>
            <div className="modal-content rounded-4 border-0 shadow-lg">
              <div className="modal-body p-4 text-center">
                <i className="fa-solid fa-triangle-exclamation text-danger fa-3x mb-3"></i>
                <h5 className="fw-bold text-dark mb-2">¿Confirmas la desactivación?</h5>
                <p className="small text-muted mb-4">Tu cuenta quedará inhabilitada en el sistema.</p>
                <div className="d-flex gap-2 justify-content-center">
                  <button 
                    type="button" 
                    className="btn btn-light rounded-pill px-4 fw-semibold"
                    onClick={() => setMostrarModalConfirmacion(false)}
                  >
                    Cancelar
                  </button>
                  <button 
                    type="button" 
                    className="btn btn-danger rounded-pill px-4 fw-bold"
                    onClick={() => {
                      setMostrarModalConfirmacion(false)
                      onDesactivarCuenta()
                    }}
                  >
                    Sí, desactivar
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}