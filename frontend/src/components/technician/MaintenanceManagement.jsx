import React, { useState, useRef } from 'react';
import axios from 'axios';

import { TablaGestion } from '../TablaGestion';

// El vendedor consulta; el técnico y el superadmin reparan.
export function MaintenanceManagement({ soloLectura = false }) {
  const [ordenAntiguedad, setOrdenAntiguedad] = useState('antiguos');
  const [filtroStock, setFiltroStock] = useState('todos');
  const tabla = useRef(null);
  const cargarMantenciones = () => tabla.current?.dt()?.ajax.reload(null, false);

  
  const [msgGeneral, setMsgGeneral] = useState({ tipo: '', texto: '' });

  
  const [reporteSeleccionado, setReporteSeleccionado] = useState(null);
  const [descripcionReparacion, setDescripcionReparacion] = useState('');
  const [tipoStock, setTipoStock] = useState('venta');
  const [errorReparacion, setErrorReparacion] = useState('');
  const [guardandoReparacion, setGuardandoReparacion] = useState(false);


  const abrirModalReparado = (reporte) => {
    setReporteSeleccionado(reporte);
    setDescripcionReparacion('');
    setTipoStock(reporte.tipoStock || 'venta');
    setErrorReparacion('');
  };

  const cerrarModalReparado = () => {
    setReporteSeleccionado(null);
    setDescripcionReparacion('');
    setErrorReparacion('');
  };

  const handleGuardarReparacion = async (e) => {
    e.preventDefault();
    if (guardandoReparacion || !reporteSeleccionado) return;
    setErrorReparacion('');

    if (!descripcionReparacion.trim()) {
      setErrorReparacion('El campo "Trabajo Realizado" es obligatorio y no puede quedar vacío.');
      return;
    }

    setGuardandoReparacion(true);

    try {
      const seguridad = await axios.get('/api/csrf/');
      const res = await axios.post(`/api/mantenciones/${reporteSeleccionado.id}/marcar-reparado/`, {
        descripcionReparacion: descripcionReparacion.trim(),
        tipoStock: tipoStock
      }, {
        headers: { 'X-CSRFToken': seguridad.data.csrfToken }
      });

      cerrarModalReparado();
      window.dispatchEvent(new Event('catalogo-actualizado'));
      setMsgGeneral({
        tipo: 'success',
        texto: res.data?.mensaje || '¡El producto ha sido marcado como reparado y su stock reintegrado correctamente!'
      });
      cargarMantenciones();
    } catch (err) {
      const datos = err.response?.data;
      const detalle = datos?.error || datos?.detail;
      const mensaje = typeof detalle === 'string' && detalle.includes('CSRF')
        ? 'La sesión de seguridad cambió. Cierra sesión, vuelve a ingresar como técnico e intenta nuevamente.'
        : typeof detalle === 'string' ? detalle
        : err.response?.status === 403 ? 'Tu sesión no tiene permisos de técnico. Vuelve a ingresar con la cuenta del técnico.'
        : err.response?.status === 401 ? 'La sesión venció. Vuelve a iniciar sesión.'
        : !err.response ? 'No se pudo conectar con Django. Comprueba que esté ejecutándose.'
        : 'No se pudo guardar la reparación. Intenta nuevamente y revisa la terminal de Django si el error continúa.';
      setErrorReparacion(mensaje);
    } finally {
      setGuardandoReparacion(false);
    }
  };

  const celdasMantencion = (m) => {
    return [
      <>
#{m.id}
      </>,
      <>
{m.producto_nombre || `Producto #${m.producto}`}
      </>,
      <>
{m.fallaReportada}
      </>,
      <>
{m.fechaReporte}
      </>,
      <>
<span className="badge bg-warning-subtle text-dark border border-warning-subtle px-2 py-1">
                      {m.estado || 'Pendiente'}
                    </span>
      </>,
      <>
{soloLectura ? (
                      <span className="text-muted small">Solo técnico</span>
                    ) : (
                      <button
                        onClick={() => abrirModalReparado(m)}
                        className="btn btn-success btn-sm rounded-pill px-3 fw-semibold"
                      >
                        <i className="fa-solid fa-check me-1"></i>Marcar Reparado
                      </button>
                    )}
      </>
    ]
  }

  const columnas = [
    { titulo: 'ID Reporte', campo: 'id', mostrar: m => celdasMantencion(m)[0] },
    { titulo: 'Producto afectado', campo: 'producto_nombre', mostrar: m => celdasMantencion(m)[1] },
    { titulo: 'Falla reportada', campo: 'fallaReportada', mostrar: m => celdasMantencion(m)[2] },
    { titulo: 'Fecha de reporte', campo: 'fechaReporte', mostrar: m => celdasMantencion(m)[3] },
    { titulo: 'Estado', campo: 'estado', ordenable: false, mostrar: m => celdasMantencion(m)[4] },
    { titulo: 'Acción', campo: 'acciones', ordenable: false, mostrar: m => celdasMantencion(m)[5] }
  ]

  return (
    <div>

      {msgGeneral.texto && (
        <div className={`alert alert-${msgGeneral.tipo} p-3 mb-4 rounded-3 d-flex align-items-center justify-content-between shadow-sm border`}>
          <div className="d-flex align-items-center gap-2">
            <i className={`fa-solid ${msgGeneral.tipo === 'success' ? 'fa-circle-check text-success' : 'fa-circle-exclamation text-danger'} fs-5`}></i>
            <span className="small fw-semibold">{msgGeneral.texto}</span>
          </div>
          <button 
            type="button" 
            className="btn-close ms-3" 
            onClick={() => setMsgGeneral({ tipo: '', texto: '' })}
            aria-label="Cerrar aviso"
            style={{ fontSize: '0.8rem' }}
          ></button>
        </div>
      )}

      <div className="d-flex justify-content-between align-items-center border-bottom pb-3 mb-3 flex-wrap gap-2">
        <div>
          <h5 className="fw-bold text-dark mb-1">
            <i className="fa-solid fa-screwdriver-wrench text-warning me-2"></i>
            Productos en Mantención
          </h5>
          <p className="text-muted small mb-0">
            Listado de productos reportados con falla o pendientes de revisión.
          </p>
        </div>

        <div className="d-flex align-items-center gap-2 flex-wrap w-100">
          <span className="small text-muted fw-semibold text-nowrap">Ordenar por:</span>
          <select
            className="form-select form-select-sm rounded-pill ps-3 pe-5"
            value={ordenAntiguedad}
            onChange={(e) => {
              tabla.current?.dt()?.order([]);
              setOrdenAntiguedad(e.target.value);
            }}
            style={{ flex: '1 1 180px', minWidth: 0, width: 'auto' }}
          >
            <option value="antiguos">Más antiguos primero (Prioridad)</option>
            <option value="recientes">Más recientes primero</option>
          </select>

          <button 
            onClick={() => cargarMantenciones()} 
            className="btn btn-outline-secondary btn-sm rounded-pill px-3 fw-bold ms-1 text-nowrap"
          >
            <i className="fa-solid fa-rotate me-1"></i>Actualizar
          </button>
        </div>
      </div>

      <div className="row g-2 mb-3">
        <div className="col-12 col-sm-5 col-lg-3">
          <select
            className="form-select form-select-sm rounded-pill ps-3"
            aria-label="Filtrar por tipo de stock"
            value={filtroStock}
            onChange={(e) => setFiltroStock(e.target.value)}
          >
            <option value="todos">Venta y arriendo</option>
            <option value="venta">Solo stock de venta</option>
            <option value="arriendo">Solo stock de arriendo</option>
          </select>
        </div>
      </div>

      <TablaGestion ref={tabla} url="/api/mantenciones/" columnas={columnas}
        filtros={{ orden: ordenAntiguedad, tipoStock: filtroStock }} />

      {reporteSeleccionado && (
        <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.55)', zIndex: 1080 }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content rounded-4 border-0 shadow-lg">
              <div className="modal-header border-bottom px-4 py-3">
                <h5 className="fw-bold text-dark mb-0">Registrar Reparación</h5>
                <button type="button" className="btn-close" onClick={cerrarModalReparado} disabled={guardandoReparacion}></button>
              </div>

              <form onSubmit={handleGuardarReparacion} autoComplete="off">
                <div className="modal-body p-4">

                  {errorReparacion && (
                    <div className="alert alert-danger p-3 mb-3 rounded-3 d-flex align-items-center justify-content-between shadow-sm border border-danger border-opacity-25">
                      <div className="d-flex align-items-center gap-2">
                        <i className="fa-solid fa-circle-exclamation text-danger fs-5"></i>
                        <span className="small fw-semibold">{errorReparacion}</span>
                      </div>
                      <button 
                        type="button" 
                        className="btn-close ms-2" 
                        onClick={() => setErrorReparacion('')}
                        aria-label="Cerrar error"
                        style={{ fontSize: '0.75rem' }}
                      ></button>
                    </div>
                  )}

                  <p className="small text-muted mb-3">
                    <strong>Producto:</strong> {reporteSeleccionado.producto_nombre || `Producto #${reporteSeleccionado.producto}`}
                  </p>

                  <div className="mb-3">
                    <label className="form-label small fw-semibold text-secondary">Trabajo Realizado *</label>
                    <textarea
                      className="form-control rounded-3"
                      rows="3"
                      placeholder="Describa brevemente qué reparaciones o ajustes se le realizaron al equipo..."
                      value={descripcionReparacion}
                      onChange={(e) => setDescripcionReparacion(e.target.value)}
                      disabled={guardandoReparacion}
                      required
                    ></textarea>
                  </div>

                  <div className="mb-3">
                    <p className="form-label small fw-semibold text-secondary">Stock de devolución:</p>
                    <div className="border rounded-3 p-3 bg-light">
                      <strong>{tipoStock === 'arriendo' ? 'Stock de Arriendo' : 'Stock de Venta'}</strong>
                      <small className="d-block text-muted mt-1">Al confirmar la reparación, la unidad volverá automáticamente al stock del que fue retirada.</small>
                    </div>
                  </div>
                </div>

                <div className="modal-footer border-top p-3 justify-content-end">
                  <button
                    type="button"
                    className="btn btn-light rounded-pill px-3 fw-semibold small"
                    onClick={cerrarModalReparado}
                    disabled={guardandoReparacion}
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="btn btn-success rounded-pill px-4 fw-medium small"
                    disabled={guardandoReparacion}
                  >
                    {guardandoReparacion ? 'Guardando...' : 'Confirmar y Reponer Stock'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
