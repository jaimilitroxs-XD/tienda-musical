import React from 'react'



export function AccesoDenegado({ mensaje, volverAlCatalogo, onIniciarSesion }) {
  return (
    <div className="container py-5" style={{ maxWidth: '560px' }}>
      <div className="card shadow-sm text-center p-4">
        <i className="fas fa-lock fa-3x text-secondary mb-3" aria-hidden="true"></i>
        <p role="alert" className="mb-4">{mensaje}</p>
        <div className="d-flex gap-2 justify-content-center flex-wrap">
          {onIniciarSesion && (
            <button type="button" className="btn btn-primary" onClick={onIniciarSesion}>Iniciar sesión</button>
          )}
          <button type="button" className="btn btn-outline-secondary" onClick={volverAlCatalogo}>Volver al catálogo</button>
        </div>
      </div>
    </div>
  )
}
