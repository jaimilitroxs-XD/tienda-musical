import React, { useState } from 'react'
import axios from 'axios'

export function CheckoutPage({ 
  carrito, 
  volverAlCarrito, 
  onPedidoExitoso 
}) {
  const [rut, setRut] = useState('')
  const [nombre, setNombre] = useState('')
  const [apellidos, setApellidos] = useState('')
  const [telefono, setTelefono] = useState('')
  const [correo, setCorreo] = useState('')
  const [aceptaTerminos, setAceptaTerminos] = useState(false)
  
  const [intentoEnviar, setIntentoEnviar] = useState(false)
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState('')

  
  const subtotal = carrito.reduce((acc, item) => {
    const precioUnitario = item.tipoOperacion === 'arriendo' 
      ? Number(item.precioArriendoDia || 25000) * (item.diasArriendo || 1)
      : Number(item.precioVenta)
    return acc + (precioUnitario * item.cantidad)
  }, 0)

  const iva = subtotal * 0.19
  const totalGeneral = subtotal + iva

  
  const formatearRut = (valor) => {
    const limpio = valor.replace(/[^0-9kK]/g, '').toUpperCase()
    if (limpio.length <= 1) return limpio
    
    const cuerpo = limpio.slice(0, -1)
    const dv = limpio.slice(-1)
    
    let cuerpoFormateado = ''
    for (let i = cuerpo.length - 1, j = 0; i >= 0; i--, j++) {
      cuerpoFormateado = cuerpo.charAt(i) + (j > 0 && j % 3 === 0 ? '.' : '') + cuerpoFormateado
    }
    
    return `${cuerpoFormateado}-${dv}`
  }

  const manejarCambioRut = (e) => {
    const formateado = formatearRut(e.target.value)
    if (formateado.length <= 12) {
      setRut(formateado)
    }
  }

  
  const validarFormatoRut = (rutStr) => {
    const regex = /^(\d{1,2}\.\d{3}\.\d{3}-[\dkK])$/
    return regex.test(rutStr)
  }

  const validarSoloLetras = (texto) => {
    const trimmed = texto.trim()
    const regex = /^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]{2,40}$/
    return regex.test(trimmed)
  }

  const validarCorreo = (email) => {
    const regex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/
    return regex.test(email)
  }

  const validarTelefono = (tel) => {
    const regex = /^[0-9]{8,9}$/
    return regex.test(tel)
  }

  
  const handleSubmit = async (e) => {
    e.preventDefault()
    setIntentoEnviar(true)

    const esValido = 
      validarFormatoRut(rut) && 
      validarSoloLetras(nombre) && 
      validarSoloLetras(apellidos) && 
      validarTelefono(telefono) && 
      validarCorreo(correo) && 
      aceptaTerminos

    if (esValido) {
      const datosCliente = {
        rut,
        nombre: nombre.trim(),
        apellidos: apellidos.trim(),
        telefono,
        correo
      }
      
      if (enviando) return
      setEnviando(true)
      setError('')
      try {
        const res = await axios.post('/api/pedidos/', { cliente: datosCliente, items: carrito, aceptaTerminos })
        onPedidoExitoso?.(res.data)
      } catch (err) {
        setError(err.response?.data?.error || 'No se pudo guardar el pedido. Intenta nuevamente.')
      } finally { setEnviando(false) }
    }
  }

  return (
    <div className="container py-4" style={{ maxWidth: '1100px' }}>

      <div className="d-flex align-items-center justify-content-between mb-4 border-bottom pb-2">
        <h3 className="fw-bold text-dark mb-0 d-flex align-items-center gap-2">
          <i className="fa-solid fa-credit-card text-info"></i>
          Finalizar Pedido 
        </h3>
        <button 
          type="button" 
          onClick={volverAlCarrito} 
          className="btn btn-outline-secondary btn-sm rounded-pill px-3"
        >
          <i className="fa-solid fa-arrow-left me-1"></i>Volver al carrito
        </button>
      </div>

      <form onSubmit={handleSubmit} noValidate>
        <p className="alert alert-info">Retiro y pago presencial en tienda. El pedido quedará pendiente hasta confirmar el pago.</p>
        {error && <p role="alert" className="alert alert-danger">{error}</p>}
        <div className="row g-4">

          <div className="col-lg-7">
            <div className="card border-0 shadow-sm rounded-3 p-4">
              <h5 className="fw-bold text-dark mb-3 border-bottom pb-2">Datos de Facturación y Contacto</h5>
              
              <div className="mb-3">
                <label className="form-label small fw-semibold text-muted">RUT</label>
                <input 
                  type="text" 
                  className={`form-control form-control-sm ${intentoEnviar && !validarFormatoRut(rut) ? 'is-invalid' : ''}`}
                  placeholder="Ej: 12.345.678-K"
                  maxLength="12"
                  value={rut}
                  onChange={manejarCambioRut}
                />
                {intentoEnviar && !validarFormatoRut(rut) && (
                  <div className="invalid-feedback">Debe ingresar un RUT con formato válido (ej: 12.345.678-K).</div>
                )}
              </div>

              <div className="row">
                <div className="col-md-6 mb-3">
                  <label className="form-label small fw-semibold text-muted">Nombre</label>
                  <input 
                    type="text" 
                    className={`form-control form-control-sm ${intentoEnviar && !validarSoloLetras(nombre) ? 'is-invalid' : ''}`}
                    placeholder="Tu nombre"
                    maxLength="30"
                    value={nombre}
                    onChange={(e) => setNombre(e.target.value.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑ\s]/g, ''))}
                  />
                  {intentoEnviar && !validarSoloLetras(nombre) && (
                    <div className="invalid-feedback">Ingrese un nombre válido.</div>
                  )}
                </div>

                <div className="col-md-6 mb-3">
                  <label className="form-label small fw-semibold text-muted">Apellidos</label>
                  <input 
                    type="text" 
                    className={`form-control form-control-sm ${intentoEnviar && !validarSoloLetras(apellidos) ? 'is-invalid' : ''}`}
                    placeholder="Tus apellidos"
                    maxLength="40"
                    value={apellidos}
                    onChange={(e) => setApellidos(e.target.value.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑ\s]/g, ''))}
                  />
                  {intentoEnviar && !validarSoloLetras(apellidos) && (
                    <div className="invalid-feedback">Ingrese apellidos válidos.</div>
                  )}
                </div>
              </div>

              <div className="row">
                <div className="col-md-6 mb-3">
                  <label className="form-label small fw-semibold text-muted">Teléfono</label>
                  <input 
                    type="text" 
                    className={`form-control form-control-sm ${intentoEnviar && !validarTelefono(telefono) ? 'is-invalid' : ''}`}
                    placeholder="Ej: 912345678"
                    maxLength="9"
                    value={telefono}
                    onChange={(e) => setTelefono(e.target.value.replace(/\D/g, ''))}
                  />
                  {intentoEnviar && !validarTelefono(telefono) && (
                    <div className="invalid-feedback">Teléfono inválido (debe ingresar 8 u 9 dígitos).</div>
                  )}
                </div>

                <div className="col-md-6 mb-3">
                  <label className="form-label small fw-semibold text-muted">Correo electrónico</label>
                  <input 
                    type="email" 
                    className={`form-control form-control-sm ${intentoEnviar && !validarCorreo(correo) ? 'is-invalid' : ''}`}
                    placeholder="correo@ejemplo.com"
                    maxLength="50"
                    value={correo}
                    onChange={(e) => setCorreo(e.target.value)}
                  />
                  {intentoEnviar && !validarCorreo(correo) && (
                    <div className="invalid-feedback">Ingrese un correo electrónico válido.</div>
                  )}
                </div>
              </div>

              <div className="form-check mt-3">
                <input 
                  type="checkbox" 
                  className={`form-check-input ${intentoEnviar && !aceptaTerminos ? 'is-invalid' : ''}`}
                  id="terminosCheck"
                  checked={aceptaTerminos}
                  onChange={(e) => setAceptaTerminos(e.target.checked)}
                />
                <label className="form-check-label small text-muted" htmlFor="terminosCheck">
                  Acepto los términos y condiciones, políticas de arriendo y garantía de la tienda.
                </label>
                {intentoEnviar && !aceptaTerminos && (
                  <div className="invalid-feedback">Debe aceptar los términos y condiciones para continuar.</div>
                )}
              </div>

            </div>
          </div>

          <div className="col-lg-5">
            <div className="card border-0 shadow-sm rounded-3 p-4 bg-light">
              <h5 className="fw-bold text-dark mb-3 border-bottom pb-2">Resumen del Pedido</h5>
              
              <div className="mb-3 overflow-auto" style={{ maxHeight: '200px' }}>
                {carrito.map((item, idx) => {
                  const esArriendo = item.tipoOperacion === 'arriendo'
                  const subItem = esArriendo 
                    ? Number(item.precioArriendoDia || 25000) * (item.diasArriendo || 1) * item.cantidad
                    : Number(item.precioVenta) * item.cantidad

                  return (
                    <div key={idx} className="d-flex justify-content-between align-items-center mb-2 pb-2 border-bottom small">
                      <div>
                        <span className="fw-semibold d-block text-dark">{item.marca} - {item.nombre}</span>
                        <span className="text-muted" style={{ fontSize: '0.75rem' }}>
                          {esArriendo ? `Arriendo (${item.diasArriendo} días)` : `Cant: ${item.cantidad}`}
                        </span>
                      </div>
                      <span className="fw-bold text-dark">${subItem.toLocaleString('es-CL')}</span>
                    </div>
                  )
                })}
              </div>

              <div className="d-flex justify-content-between mb-2 text-muted small">
                <span>Subtotal:</span>
                <span className="fw-semibold text-dark">${subtotal.toLocaleString('es-CL')}</span>
              </div>
              
              <div className="d-flex justify-content-between mb-2 text-muted small">
                <span>IVA (19%):</span>
                <span className="fw-semibold text-dark">${iva.toLocaleString('es-CL')}</span>
              </div>

              <hr className="text-muted" />

              <div className="d-flex justify-content-between mb-4 align-items-center">
                <span className="fs-5 fw-bold text-dark">Total a Pagar:</span>
                <span className="fs-4 fw-bold" style={{ color: 'var(--store-primary)' }}>${totalGeneral.toLocaleString('es-CL')}</span>
              </div>

              <button 
                type="submit"
                disabled={enviando || !carrito.length}
                className="btn text-white w-100 py-2 shadow-sm rounded-pill fw-bold border-0"
                style={{ backgroundColor: 'var(--store-primary)' }}
              >
                <i className="fa-solid fa-check-circle me-2"></i>Realizar el pedido
              </button>

              {intentoEnviar && (!validarFormatoRut(rut) || !validarSoloLetras(nombre) || !validarSoloLetras(apellidos) || !validarTelefono(telefono) || !validarCorreo(correo) || !aceptaTerminos) && (
                <small className="text-danger text-center d-block mt-2" style={{ fontSize: '0.75rem' }}>
                  Hay errores en el formulario. Revisa los campos en rojo.
                </small>
              )}

            </div>
          </div>

        </div>
      </form>

    </div>
  )
}
