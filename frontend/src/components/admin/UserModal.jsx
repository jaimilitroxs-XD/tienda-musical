import React, { useState, useEffect } from 'react'

export function UserModal({ mostrar, onClose, onGuardar }) {
  const [nombre, setNombre] = useState('')
  const [email, setEmail] = useState('')
  const [telefono, setTelefono] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [rol, setRol] = useState('Cliente')
  
  
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  
  const [error, setError] = useState('')
  const [exito, setExito] = useState('')
  const [guardando, setGuardando] = useState(false)

  
  useEffect(() => {
    if (mostrar) {
      setNombre('')
      setEmail('')
      setTelefono('')
      setPassword('')
      setConfirmPassword('')
      setRol('Cliente')
      setError('')
      setExito('')
      setShowPassword(false)
      setShowConfirmPassword(false)
      setGuardando(false)
    }
  }, [mostrar])

  if (!mostrar) return null

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setExito('')

    
    if (!nombre.trim() || !email.trim() || !password.trim() || !confirmPassword.trim()) {
      setError('Todos los campos son obligatorios excepto el teléfono.')
      return
    }

    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden.')
      return
    }

    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres.')
      return
    }

    setGuardando(true)

    
    let rolFormateado = 'Cliente'
    if (rol === 'tecnico' || rol === 'Tecnico') rolFormateado = 'Tecnico'
    if (rol === 'admin' || rol === 'vendedor' || rol === 'Admin') rolFormateado = 'Admin'

    const resultado = await onGuardar({
      nombre: nombre.trim(),
      email: email.trim(),
      telefono: telefono.trim(),
      pass: password,
      password: password,
      rol: rolFormateado
    })

    setGuardando(false)

    if (resultado && resultado.ok) {
      setExito('¡Usuario creado y guardado exitosamente en la base de datos!')
      setTimeout(() => {
        onClose()
      }, 1500)
    } else {
      setError(resultado?.error || 'No se pudo registrar el usuario en la base de datos.')
    }
  }

  return (
    <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
      <div className="modal-dialog modal-dialog-centered">
        <div className="modal-content rounded-4 border-0 shadow">
          <div className="modal-header border-bottom-0 pb-0">
            <h5 className="modal-title fw-bold text-dark">Crear Nuevo Usuario</h5>
            <button type="button" className="btn-close" onClick={onClose} disabled={guardando}></button>
          </div>

          <form onSubmit={handleSubmit} autoComplete="off">
            <div className="modal-body py-3">
              {error && <div className="alert alert-danger small py-2 mb-3 rounded-3">{error}</div>}
              {exito && <div className="alert alert-success small py-2 mb-3 rounded-3">{exito}</div>}

              <div className="mb-3">
                <label className="form-label small fw-semibold text-muted">Nombre Completo</label>
                <input
                  type="text"
                  className="form-control form-control-sm rounded-pill px-3"
                  placeholder="Ingrese nombre y apellido"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  disabled={guardando}
                  autoComplete="off"
                />
              </div>

              <div className="mb-3">
                <label className="form-label small fw-semibold text-muted">Correo Electrónico</label>
                <input
                  type="email"
                  className="form-control form-control-sm rounded-pill px-3"
                  placeholder="correo@ejemplo.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={guardando}
                  autoComplete="new-email"
                />
              </div>

              <div className="mb-3">
                <label className="form-label small fw-semibold text-muted">Teléfono de Contacto (Opcional)</label>
                <input
                  type="text"
                  className="form-control form-control-sm rounded-pill px-3"
                  placeholder="+56 9 1234 5678"
                  value={telefono}
                  onChange={(e) => setTelefono(e.target.value)}
                  disabled={guardando}
                />
              </div>

              <div className="mb-3">
                <label className="form-label small fw-semibold text-muted">Contraseña</label>
                <div className="position-relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    className="form-control form-control-sm rounded-pill ps-3 pe-5"
                    placeholder="******"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={guardando}
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    className="btn btn-link position-absolute end-0 top-50 translate-middle-y text-secondary pe-3 py-0 border-0"
                    onClick={() => setShowPassword(!showPassword)}
                    tabIndex="-1"
                    style={{ textDecoration: 'none' }}
                  >
                    <i className={`fa-solid ${showPassword ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                  </button>
                </div>
              </div>

              <div className="mb-3">
                <label className="form-label small fw-semibold text-muted">Confirmar Contraseña</label>
                <div className="position-relative">
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    className="form-control form-control-sm rounded-pill ps-3 pe-5"
                    placeholder="******"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    disabled={guardando}
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    className="btn btn-link position-absolute end-0 top-50 translate-middle-y text-secondary pe-3 py-0 border-0"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    tabIndex="-1"
                    style={{ textDecoration: 'none' }}
                  >
                    <i className={`fa-solid ${showConfirmPassword ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                  </button>
                </div>
              </div>

              <div className="mb-3">
                <label className="form-label small fw-semibold text-muted">Rol en el Sistema</label>
                <select
                  className="form-select form-select-sm rounded-pill ps-3 pe-5"
                  value={rol}
                  onChange={(e) => setRol(e.target.value)}
                  disabled={guardando}
                >
                  <option value="Cliente">Cliente</option>
                  <option value="Admin">Vendedor / Administrador</option>
                  <option value="Tecnico">Técnico</option>
                </select>
              </div>
            </div>

            <div className="modal-footer border-top-0 pt-0">
              <button 
                type="button" 
                className="btn btn-outline-secondary btn-sm rounded-pill px-3" 
                onClick={onClose}
                disabled={guardando}
              >
                Cancelar
              </button>
              <button 
                type="submit" 
                className="btn btn-dark btn-sm rounded-pill px-4 fw-medium"
                disabled={guardando}
              >
                {guardando ? 'Guardando...' : 'Guardar Usuario'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}