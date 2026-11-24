import React, { useState, useEffect } from 'react'


export function AuthModal({ mostrar, onClose, modoInicial = 'login', onLogin, onRegistro }) {
  const [modo, setModo] = useState(modoInicial)

  const [verLoginPass, setVerLoginPass] = useState(false)
  const [verRegPass, setVerRegPass] = useState(false)
  const [verRegPassConfirm, setVerRegPassConfirm] = useState(false)

  const [loginEmail, setLoginEmail] = useState('')
  const [loginPass, setLoginPass] = useState('')

  const [regNombre, setRegNombre] = useState('')
  const [regEmail, setRegEmail] = useState('')
  const [regPass, setRegPass] = useState('')
  const [regPassConfirm, setRegPassConfirm] = useState('')

  const [errorMsg, setErrorMsg] = useState('')
  const [enviando, setEnviando] = useState(false)

  const limpiarCampos = () => {
    setLoginEmail('')
    setLoginPass('')
    setRegNombre('')
    setRegEmail('')
    setRegPass('')
    setRegPassConfirm('')
    setErrorMsg('')
    setEnviando(false)
    setVerLoginPass(false)
    setVerRegPass(false)
    setVerRegPassConfirm(false)
  }

  useEffect(() => {
    setModo(modoInicial)
    limpiarCampos()
  }, [modoInicial, mostrar])

  if (!mostrar) return null

  const handleCerrar = () => {
    limpiarCampos()
    onClose()
  }

  const validarPasswordRegistro = (pass) => {
    if (pass.length < 8) return 'La contraseña debe tener al menos 8 caracteres.'
    if (!/[A-Z]/.test(pass)) return 'La contraseña debe incluir al menos una letra mayúscula.'
    if (!/[0-9]/.test(pass)) return 'La contraseña debe incluir al menos un número.'
    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(pass)) return 'La contraseña debe incluir al menos un carácter especial.'
    return null
  }

  const handleLoginSubmit = async (e) => {
    e.preventDefault()
    setErrorMsg('')

    if (!loginEmail.trim() || !loginPass.trim()) {
      setErrorMsg('Por favor ingresa tu correo y contraseña.')
      return
    }

    setEnviando(true)
    const res = await onLogin(loginEmail, loginPass)
    setEnviando(false)

    if (!res?.exito) {
      setErrorMsg(res?.error || 'Correo o contraseña incorrectos.')
    }
  }

  const handleRegistroSubmit = async (e) => {
    e.preventDefault()
    setErrorMsg('')

    if (!regNombre.trim()) {
      setErrorMsg('El nombre completo es obligatorio.')
      return
    }

    const errorPass = validarPasswordRegistro(regPass)
    if (errorPass) {
      setErrorMsg(errorPass)
      return
    }

    if (regPass !== regPassConfirm) {
      setErrorMsg('Las contraseñas no coinciden.')
      return
    }

    setEnviando(true)
    const res = await onRegistro({ nombre: regNombre, email: regEmail, pass: regPass })
    setEnviando(false)

    if (!res?.exito) {
      setErrorMsg(res?.error || 'No se pudo crear la cuenta. Intenta de nuevo.')
    }
  }

  return (
    <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.55)', zIndex: 1070 }}>
      <div className="modal-dialog modal-dialog-centered" style={{ maxWidth: '440px' }}>
        <div className="modal-content border-0 shadow-lg rounded-4 overflow-hidden">

          <div className="modal-header bg-light border-bottom p-0 position-relative">
            <div className="d-flex w-100 pe-4">
              <button
                type="button"
                onClick={() => { setModo('login'); setErrorMsg(''); }}
                className={`btn flex-fill py-3 rounded-0 border-0 fw-bold small ${
                  modo === 'login' ? 'bg-white text-dark border-bottom border-2 border-dark' : 'text-muted bg-light'
                }`}
              >
                <i className="fa-solid fa-right-to-bracket me-1"></i>Iniciar Sesión
              </button>

              <button
                type="button"
                onClick={() => { setModo('registro'); setErrorMsg(''); }}
                className={`btn flex-fill py-3 rounded-0 border-0 fw-bold small ${
                  modo === 'registro' ? 'bg-white text-dark border-bottom border-2 border-dark' : 'text-muted bg-light'
                }`}
              >
                <i className="fa-solid fa-user-plus me-1"></i>Crear Cuenta
              </button>
            </div>
            
            <button 
              type="button" 
              className="btn-close me-2" 
              onClick={handleCerrar}
              disabled={enviando}
              style={{ position: 'absolute', right: '10px', top: '16px', zIndex: 10 }}
            ></button>
          </div>

          <div className="modal-body p-4">

            {errorMsg && (
              <div className="alert alert-danger p-2.5 small mb-3 text-center rounded-3 shadow-sm border-danger-subtle d-flex align-items-center justify-content-center gap-2">
                <i className="fa-solid fa-circle-exclamation"></i>
                <span>{errorMsg}</span>
              </div>
            )}

            {modo === 'login' ? (
              <form onSubmit={handleLoginSubmit} autoComplete="off">
                <p className="text-muted small mb-3">
                  Ingresa con tu correo electrónico para gestionar tus pedidos.
                </p>

                <div className="mb-3">
                  <label className="form-label small fw-semibold text-secondary">Correo Electrónico</label>
                  <input 
                    type="email" 
                    name="email_user_field"
                    autoComplete="off"
                    className="form-control rounded-pill px-3" 
                    placeholder="correo@ejemplo.com"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    disabled={enviando}
                    required 
                  />
                </div>

                <div className="mb-3">
                  <label className="form-label small fw-semibold text-secondary">Contraseña</label>
                  <div className="position-relative">
                    <input 
                      type={verLoginPass ? "text" : "password"} 
                      name="pass_user_field"
                      autoComplete="new-password"
                      data-lpignore="true"
                      data-form-type="other"
                      className="form-control rounded-pill ps-3 pe-5" 
                      placeholder="Tu contraseña"
                      value={loginPass}
                      onChange={(e) => setLoginPass(e.target.value)}
                      disabled={enviando}
                      required 
                    />
                    <button 
                      type="button"
                      onClick={() => setVerLoginPass(!verLoginPass)}
                      className="btn border-0 p-0 text-secondary position-absolute top-50 end-0 translate-middle-y me-3 bg-transparent"
                      disabled={enviando}
                    >
                      <i className={`fa-solid ${verLoginPass ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                    </button>
                  </div>
                </div>

                <button 
                  type="submit" 
                  disabled={enviando}
                  className="btn btn-dark w-100 rounded-pill py-2 mt-2 fw-bold small d-flex align-items-center justify-content-center gap-2"
                >
                  {enviando ? (
                    <>
                      <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                      <span>Ingresando...</span>
                    </>
                  ) : (
                    <span>Entrar</span>
                  )}
                </button>
              </form>
            ) : (
              <form onSubmit={handleRegistroSubmit} autoComplete="off">
                <p className="text-muted small mb-3">
                  Crea tu cuenta para realizar compras y solicitudes de arriendo.
                </p>

                <div className="mb-2">
                  <label className="form-label small fw-semibold text-secondary">Nombre Completo</label>
                  <input 
                    type="text" 
                    name="reg_fullname"
                    autoComplete="off"
                    className="form-control rounded-pill px-3" 
                    placeholder="Juan Pérez"
                    value={regNombre}
                    onChange={(e) => setRegNombre(e.target.value)}
                    disabled={enviando}
                    required 
                  />
                </div>

                <div className="mb-2">
                  <label className="form-label small fw-semibold text-secondary">Correo Electrónico</label>
                  <input 
                    type="email" 
                    name="reg_email"
                    autoComplete="off"
                    className="form-control rounded-pill px-3" 
                    placeholder="correo@ejemplo.com"
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                    disabled={enviando}
                    required 
                  />
                </div>

                <div className="mb-2">
                  <label className="form-label small fw-semibold text-secondary">
                    Contraseña
                  </label>
                  <div className="position-relative">
                    <input 
                      type={verRegPass ? "text" : "password"} 
                      name="reg_pass"
                      autoComplete="new-password"
                      data-lpignore="true"
                      data-form-type="other"
                      className="form-control rounded-pill ps-3 pe-5" 
                      placeholder="Ej: ClaveSegura2026!"
                      value={regPass}
                      onChange={(e) => setRegPass(e.target.value)}
                      disabled={enviando}
                      required 
                    />
                    <button 
                      type="button"
                      onClick={() => setVerRegPass(!verRegPass)}
                      className="btn border-0 p-0 text-secondary position-absolute top-50 end-0 translate-middle-y me-3 bg-transparent"
                      disabled={enviando}
                    >
                      <i className={`fa-solid ${verRegPass ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                    </button>
                  </div>
                </div>

                <div className="mb-3">
                  <label className="form-label small fw-semibold text-secondary">Confirmar Contraseña</label>
                  <div className="position-relative">
                    <input 
                      type={verRegPassConfirm ? "text" : "password"} 
                      name="reg_pass_confirm"
                      autoComplete="new-password"
                      data-lpignore="true"
                      data-form-type="other"
                      className="form-control rounded-pill ps-3 pe-5" 
                      placeholder="Repite tu contraseña"
                      value={regPassConfirm}
                      onChange={(e) => setRegPassConfirm(e.target.value)}
                      disabled={enviando}
                      required 
                    />
                    <button 
                      type="button"
                      onClick={() => setVerRegPassConfirm(!verRegPassConfirm)}
                      className="btn border-0 p-0 text-secondary position-absolute top-50 end-0 translate-middle-y me-3 bg-transparent"
                      disabled={enviando}
                    >
                      <i className={`fa-solid ${verRegPassConfirm ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                    </button>
                  </div>
                </div>

                <button 
                  type="submit" 
                  disabled={enviando}
                  className="btn btn-dark w-100 rounded-pill py-2 mt-1 fw-bold small d-flex align-items-center justify-content-center gap-2"
                >
                  {enviando ? (
                    <>
                      <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                      <span>Registrando...</span>
                    </>
                  ) : (
                    <span>Registrarme</span>
                  )}
                </button>
              </form>
            )}
          </div>

          <div className="modal-footer bg-light border-top p-3 text-center justify-content-center">
            <span className="small text-muted">
              {modo === 'login' ? '¿No tienes cuenta? ' : '¿Ya tienes una cuenta? '}
              <button 
                type="button" 
                onClick={() => { setModo(modo === 'login' ? 'registro' : 'login'); setErrorMsg(''); }}
                className="btn btn-link btn-sm p-0 text-decoration-none fw-bold text-dark"
                disabled={enviando}
              >
                {modo === 'login' ? 'Regístrate aquí' : 'Inicia Sesión'}
              </button>
            </span>
          </div>

        </div>
      </div>
    </div>
  )
}