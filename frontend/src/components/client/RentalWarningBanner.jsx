import React from 'react'

export function RentalWarningBanner({ aviso, onClose }) {
  if (!aviso) return null

  return (
    <div className="container mt-3">
      <div 
        className="alert alert-warning border border-warning-subtle d-flex align-items-center justify-content-between p-3 rounded-3 shadow-sm mb-0"
        style={{ backgroundColor: '#fffbe6', color: '#856404' }}
      >
        <div className="d-flex align-items-center gap-3">
          <i className="fa-solid fa-triangle-exclamation fa-2x text-warning"></i>
          <div>
            <h6 className="fw-bold mb-0">¡Aviso de devolución de arriendo!</h6>
            <small className="mb-0">
              Tu arriendo del producto <strong>"{aviso.producto}"</strong> vence en <strong>{aviso.dias} días</strong> (Fecha límite: {aviso.fechaLimite}). Por favor planifica tu devolución.
            </small>
          </div>
        </div>

        <button 
          type="button" 
          className="btn-close" 
          onClick={onClose}
          aria-label="Close"
        ></button>
      </div>
    </div>
  )
}