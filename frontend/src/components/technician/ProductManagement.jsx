import React, { useEffect, useRef, useState } from 'react';
import axios from 'axios';
import { useProducts } from '../../hooks/useProducts';
import { subcategoriasDe } from '../../categorias';
import { TablaGestion } from '../TablaGestion';


export function ProductManagement({ usuario }) {
  
  const {
    modalOpen,
    setModalOpen,
    formData,
    stockError,
    openModal,
    toggleProductStatus,
    handleChange,
    handleSubmit,
    reportarFalla,
  } = useProducts();
  const tabla = useRef(null);

  const esTecnicoExclusivo = usuario?.es_tecnico && !usuario?.es_admin;


  
  const [msgExito, setMsgExito] = useState('');

  
  const [productoFalla, setProductoFalla] = useState(null);
  const [descripcionFalla, setDescripcionFalla] = useState('');
  const [tipoStockFalla, setTipoStockFalla] = useState('venta');
  const [enviandoFalla, setEnviandoFalla] = useState(false);
  const [msgFalla, setMsgFalla] = useState('');

  
  const [productoHistorial, setProductoHistorial] = useState(null);
  const [historialMantenciones, setHistorialMantenciones] = useState([]);
  const [cargandoHistorial, setCargandoHistorial] = useState(false);

  
  const [textoDetalle, setTextoDetalle] = useState({ titulo: '', contenido: '' });

  
  const [categoria, setCategoria] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('todos');
  const [categorias, setCategorias] = useState([]);

  useEffect(() => {
    axios.get('/api/productos/categorias/', { params: { admin: 'true' } })
      .then(({ data }) => setCategorias(data))
      .catch(() => setCategorias([]));
  }, []);


  
  const abrirModalFalla = (prod) => {
    setProductoFalla(prod);
    setTipoStockFalla(prod.stockDisponibleVenta > 0 ? 'venta' : 'arriendo');
    setDescripcionFalla('');
    setMsgFalla('');
  };

  const cerrarModalFalla = () => {
    setProductoFalla(null);
    setDescripcionFalla('');
    setMsgFalla('');
  };

  const handleConfirmarReporteFalla = async (e) => {
    e.preventDefault();
    if (enviandoFalla) return;
    setMsgFalla('');

    if (!descripcionFalla.trim()) {
      setMsgFalla('Por favor ingresa una breve descripción del problema.');
      return;
    }

    setEnviandoFalla(true);
    try {
      const res = await reportarFalla(productoFalla.id, descripcionFalla.trim(), usuario?.id, tipoStockFalla);
      if (res?.exito) {
        cerrarModalFalla();
        setMsgExito('Falla reportada. Se descontó una unidad disponible hasta que el técnico registre la reparación.');
      } else {
        setMsgFalla(res?.error || 'Error al enviar el reporte.');
      }
    } catch (err) {
      setMsgFalla('Error de conexión con el servidor.');
    } finally {
      setEnviandoFalla(false);
    }
  };

  const abrirModalHistorial = async (prod) => {
    setProductoHistorial(prod);
    setCargandoHistorial(true);
    setHistorialMantenciones([]);

    try {
      const res = await axios.get(`/api/productos/${prod.id}/historial-mantenciones/`);
      setHistorialMantenciones(res.data);
    } catch (err) {
      console.error('Error al cargar historial de mantenciones:', err);
    } finally {
      setCargandoHistorial(false);
    }
  };

  const cerrarModalHistorial = () => {
    setProductoHistorial(null);
    setHistorialMantenciones([]);
  };

  const truncarTexto = (texto, limite = 30) => {
    if (!texto) return '-';
    if (texto.length <= limite) return texto;
    return `${texto.substring(0, limite)}...`;
  };

  const celdasProducto = (p) => {
    return [
      <>
{p.id}
      </>,
      <>
{p.nombre}
      </>,
      <>
{p.categoria}{p.subcategoria ? ` › ${p.subcategoria}` : ''} - {p.marca}
      </>,
      <>
${Number(p.precioVenta).toLocaleString('es-CL')}
      </>,
      <>
${Number(p.precioArriendoDia).toLocaleString('es-CL')}
      </>,
      <>
<span className="badge bg-light text-dark border px-2 py-1">
                      {p.stockTotal} ({p.stockDisponibleVenta} / {p.stockDisponibleArriendo})
                    </span>
      </>,
      <>
<span
                      className={`badge ${
                        p.estado
                          ? 'bg-success-subtle text-success border border-success-subtle'
                          : 'bg-danger-subtle text-danger border border-danger-subtle'
                      } px-2 py-1`}
                    >
                      {p.estado ? 'Disponible' : 'Deshabilitado'}
                    </span>
      </>,
      <>
<div className="d-flex justify-content-end gap-2 text-nowrap align-items-center">

                      <button
                        onClick={() => abrirModalHistorial(p)}
                        className="btn btn-outline-info btn-sm rounded-pill px-3 fw-medium text-dark"
                        title="Ver historial de mantenciones"
                      >
                        <i className="fa-solid fa-clock-rotate-left me-1 text-info"></i>
                        Historial
                      </button>

                      {!esTecnicoExclusivo && (
                        <>
                          <button
                            onClick={() => abrirModalFalla(p)}
                            className="btn btn-outline-warning btn-sm rounded-pill px-3 fw-medium text-dark"
                            title="Reportar falla y enviar a mantención"
                          >
                            <i className="fa-solid fa-triangle-exclamation me-1 text-warning"></i>
                            Reportar Falla
                          </button>

                          <button
                            onClick={() => openModal(p)}
                            className="btn btn-outline-dark btn-sm rounded-pill px-3"
                            style={{ minWidth: '80px', fontWeight: '500' }}
                          >
                            Editar
                          </button>
                        </>
                      )}

                      {!esTecnicoExclusivo && (p.estado ? (
                        <button
                          onClick={() => toggleProductStatus(p)}
                          className="btn btn-outline-danger btn-sm rounded-pill px-3"
                          style={{ minWidth: '95px', fontWeight: '500' }}
                          title="Dar de baja este producto"
                        >
                          Dar de Baja
                        </button>
                      ) : (
                        <button
                          onClick={() => toggleProductStatus(p)}
                          className="btn btn-outline-success btn-sm rounded-pill px-3"
                          style={{ minWidth: '95px', fontWeight: '500' }}
                          title="Volver a habilitar en el catálogo"
                        >
                          Habilitar
                        </button>
                      ))}

                    </div>
      </>
    ]
  }

  const columnas = [
    { titulo: 'ID', campo: 'id', mostrar: p => celdasProducto(p)[0] },
    { titulo: 'Producto', campo: 'nombre', clase: 'celda-producto', mostrar: p => celdasProducto(p)[1] },
    { titulo: 'Categoría / Marca', campo: 'categoria', mostrar: p => celdasProducto(p)[2] },
    { titulo: 'P. Venta', campo: 'precioVenta', mostrar: p => celdasProducto(p)[3] },
    { titulo: 'P. Arriendo/Día', campo: 'precioArriendoDia', mostrar: p => celdasProducto(p)[4] },
    { titulo: 'Stock (Total / Ven / Arr)', campo: 'stockTotal', mostrar: p => celdasProducto(p)[5] },
    { titulo: 'Estado', campo: 'estado', mostrar: p => celdasProducto(p)[6] },
    { titulo: 'Acciones', campo: 'acciones', ordenable: false, mostrar: p => celdasProducto(p)[7] }
  ]

  return (
    <div>

      {msgExito && (
        <div className="alert alert-success p-3 mb-4 rounded-3 d-flex align-items-center justify-content-between shadow-sm border border-success border-opacity-25">
          <div className="d-flex align-items-center gap-2">
            <i className="fa-solid fa-circle-check text-success fs-5"></i>
            <span className="small fw-semibold">{msgExito}</span>
          </div>
          <button 
            type="button" 
            className="btn-close ms-3" 
            onClick={() => setMsgExito('')}
            aria-label="Cerrar aviso"
            style={{ fontSize: '0.8rem' }}
          ></button>
        </div>
      )}

      <div className="d-flex justify-content-between align-items-center border-bottom pb-3 mb-3 flex-wrap gap-3">
        <div>
          <h5 className="fw-bold text-dark mb-1">Sección Productos</h5>
          <p className="text-muted small mb-0">
            Mantenimiento de inventario, registro, consulta de historial y baja de catálogo.
          </p>
        </div>

        <div className="d-flex align-items-center gap-2 flex-grow-1 flex-md-grow-0">

          {!esTecnicoExclusivo && (
            <button
              onClick={() => openModal()}
              className="btn btn-primary btn-sm rounded-pill px-3 fw-bold text-nowrap"
            >
              <i className="fa-solid fa-plus me-1"></i>Nuevo Producto
            </button>
          )}
        </div>
      </div>

      <div className="row g-2 mb-3">
        <div className="col-12 col-sm-6 col-lg-4">
          <select
            className="form-select form-select-sm rounded-pill ps-3"
            aria-label="Filtrar por categoría"
            value={categoria}
            onChange={(e) => setCategoria(e.target.value)}
          >
            <option value="">Todas las categorías</option>
            {categorias.map((c) => (
              <option key={c.nombre} value={c.nombre}>{c.nombre} ({c.cantidad})</option>
            ))}
          </select>
        </div>
        <div className="col-12 col-sm-6 col-lg-3">
          <select
            className="form-select form-select-sm rounded-pill ps-3"
            aria-label="Filtrar por estado"
            value={filtroEstado}
            onChange={(e) => setFiltroEstado(e.target.value)}
          >
            <option value="todos">Todos los estados</option>
            <option value="activos">Solo activos</option>
            <option value="inactivos">Solo dados de baja</option>
          </select>
        </div>
      </div>

      <TablaGestion ref={tabla} url="/api/productos/" columnas={columnas}
        filtros={{ admin: 'true', categoria, estado: filtroEstado }} evento="catalogo-actualizado" />

      {productoHistorial && (
        <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.55)', zIndex: 1080 }}>
          <div className="modal-dialog modal-lg modal-dialog-centered">
            <div className="modal-content rounded-4 border-0 shadow-lg">
              <div className="modal-header border-bottom px-4 py-3">
                <h5 className="fw-bold text-dark mb-0 d-flex align-items-center gap-2">
                  <i className="fa-solid fa-clock-rotate-left text-info"></i>
                  Historial de Mantenciones
                </h5>
                <button type="button" className="btn-close" onClick={cerrarModalHistorial}></button>
              </div>

              <div className="modal-body p-4">
                <p className="small text-muted mb-3">
                  <strong>Producto:</strong> #{productoHistorial.id} - {productoHistorial.nombre} ({productoHistorial.marca})
                </p>

                {cargandoHistorial ? (
                  <p className="text-muted small my-4 text-center">Cargando registros...</p>
                ) : historialMantenciones.length === 0 ? (
                  <div className="alert alert-light text-center py-4 border rounded-3 my-2">
                    <p className="text-muted small mb-0">Este producto no tiene mantenciones registradas.</p>
                  </div>
                ) : (
                  <div className="table-responsive">
                    <table className="table table-bordered table-hover align-middle small mb-0">
                      <thead className="table-light">
                        <tr>
                          <th>ID</th>
                          <th>Fecha Reporte</th>
                          <th>Falla Reportada</th>
                          <th>Descripción de Reparación</th>
                          <th>Estado</th>
                        </tr>
                      </thead>
                      <tbody>
                        {historialMantenciones.map((h) => (
                          <tr key={h.id}>
                            <td className="fw-bold">#{h.id}</td>
                            <td className="text-nowrap">{h.fechaReporte}</td>

                            <td>
                              <div className="d-flex align-items-center justify-content-between gap-2">
                                <span>{truncarTexto(h.fallaReportada, 30)}</span>
                                {h.fallaReportada && h.fallaReportada.length > 30 && (
                                  <button
                                    type="button"
                                    className="btn btn-sm btn-light rounded-circle border p-1 lh-1"
                                    onClick={() => setTextoDetalle({ titulo: 'Falla Reportada', contenido: h.fallaReportada })}
                                    title="Ver detalle completo de la falla"
                                  >
                                    <i className="fa-solid fa-eye text-secondary" style={{ fontSize: '0.75rem' }}></i>
                                  </button>
                                )}
                              </div>
                            </td>

                            <td>
                              {h.descripcionReparacion ? (
                                <div className="d-flex align-items-center justify-content-between gap-2">
                                  <span>{truncarTexto(h.descripcionReparacion, 30)}</span>
                                  {h.descripcionReparacion.length > 30 && (
                                    <button
                                      type="button"
                                      className="btn btn-sm btn-light rounded-circle border p-1 lh-1"
                                      onClick={() => setTextoDetalle({ titulo: 'Trabajo Realizado', contenido: h.descripcionReparacion })}
                                      title="Ver detalle completo de la reparación"
                                    >
                                      <i className="fa-solid fa-eye text-secondary" style={{ fontSize: '0.75rem' }}></i>
                                    </button>
                                  )}
                                </div>
                              ) : (
                                <span className="text-muted fst-italic">Pendiente de reparación</span>
                              )}
                            </td>

                            <td>
                              <span className={`badge ${h.estado === 'reparado' ? 'bg-success-subtle text-success border border-success-subtle' : 'bg-warning-subtle text-dark border border-warning-subtle'} px-2 py-1`}>
                                {h.estado}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              <div className="modal-footer border-top p-3 justify-content-end">
                <button
                  type="button"
                  className="btn btn-dark rounded-pill px-4 fw-semibold small"
                  onClick={cerrarModalHistorial}
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {textoDetalle.contenido && (
        <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 1090 }}>
          <div className="modal-dialog modal-dialog-centered" style={{ maxWidth: '500px' }}>
            <div className="modal-content rounded-4 border-0 shadow-lg">
              <div className="modal-header border-bottom px-4 py-3">
                <h6 className="fw-bold text-dark mb-0 d-flex align-items-center gap-2">
                  <i className="fa-solid fa-file-text text-secondary"></i>
                  {textoDetalle.titulo}
                </h6>
                <button type="button" className="btn-close" onClick={() => setTextoDetalle({ titulo: '', contenido: '' })}></button>
              </div>
              <div className="modal-body p-4">
                <p className="small text-dark mb-0 style-preserve-lines" style={{ whiteSpace: 'pre-wrap', lineHeight: '1.6' }}>
                  {textoDetalle.contenido}
                </p>
              </div>
              <div className="modal-footer border-top p-3 justify-content-end">
                <button
                  type="button"
                  className="btn btn-light rounded-pill px-4 fw-semibold small"
                  onClick={() => setTextoDetalle({ titulo: '', contenido: '' })}
                >
                  Volver al historial
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {modalOpen && (
        <div
          className="modal show d-block"
          style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
        >
          <div className="modal-dialog modal-lg modal-dialog-centered">
            <div className="modal-content rounded-4 border-0 shadow">
              <form onSubmit={handleSubmit}>
                <div className="modal-header border-bottom">
                  <h5 className="modal-title fw-bold">
                    {formData.id ? 'Editar Producto' : 'Registrar Nuevo Producto'}
                  </h5>
                  <button
                    type="button"
                    className="btn-close"
                    onClick={() => setModalOpen(false)}
                  ></button>
                </div>
                <div className="modal-body p-4">
                  {stockError && (
                    <div className="alert alert-danger small rounded-3 mb-3">
                      <i className="fa-solid fa-circle-exclamation me-1"></i>
                      {stockError}
                    </div>
                  )}

                  <div className="row g-3">
                    <div className="col-md-6">
                      <label className="form-label small fw-bold">
                        Nombre del Producto
                      </label>
                      <input
                        type="text"
                        className="form-control"
                        name="nombre"
                        value={formData.nombre}
                        onChange={handleChange}
                        required
                      />
                    </div>
                    <div className="col-md-3">
                      <label className="form-label small fw-bold">Categoría</label>
                      <input
                        type="text"
                        className="form-control"
                        name="categoria"
                        value={formData.categoria}
                        onChange={handleChange}
                        required
                      />
                    </div>
                    <div className="col-md-3">
                      <label htmlFor="producto-subcategoria" className="form-label small fw-bold">Subcategoría <span className="fw-normal text-muted">(opcional)</span></label>
                      <input
                        id="producto-subcategoria"
                        type="text"
                        className="form-control"
                        name="subcategoria"
                        value={formData.subcategoria || ''}
                        onChange={handleChange}
                        list="sugerencias-subcategoria"
                        placeholder={subcategoriasDe(formData.categoria)[0] ? `Ej: ${subcategoriasDe(formData.categoria).join(', ')}` : ''}
                      />
                      <datalist id="sugerencias-subcategoria">
                        {subcategoriasDe(formData.categoria).map((s) => <option key={s} value={s} />)}
                      </datalist>
                    </div>
                    <div className="col-md-3">
                      <label className="form-label small fw-bold">Marca</label>
                      <input
                        type="text"
                        className="form-control"
                        name="marca"
                        value={formData.marca}
                        onChange={handleChange}
                        required
                      />
                    </div>

                    <div className="col-12">
                      <label className="form-label small fw-bold">
                        Foto del producto
                      </label>
                      <input
                        type="file"
                        className="form-control"
                        name="fotoArchivo"
                        accept="image/jpeg,image/png,image/webp"
                        onChange={handleChange}
                      />
                      <small className="text-muted">JPG, PNG o WebP. Si no seleccionas una imagen, se conserva la foto actual.</small>
                      {formData.foto && <img src={formData.foto} alt="Foto actual del producto" className="d-block rounded border mt-2" style={{ width: '100px', height: '80px', objectFit: 'contain', backgroundColor: '#fff' }} />}
                    </div>

                    <div className="col-md-6">
                      <label className="form-label small fw-bold">
                        Precio de Venta ($)
                      </label>
                      <input
                        type="number"
                        className="form-control"
                        name="precioVenta"
                        value={formData.precioVenta}
                        onChange={handleChange}
                        required
                      />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label small fw-bold">
                        Precio Arriendo por Día ($)
                      </label>
                      <input
                        type="number"
                        className="form-control"
                        name="precioArriendoDia"
                        value={formData.precioArriendoDia}
                        onChange={handleChange}
                        required
                      />
                    </div>

                    <div className="col-md-4">
                      <label className="form-label small fw-bold">
                        Stock Total Físico
                      </label>
                      <input
                        type="number"
                        className="form-control"
                        name="stockTotal"
                        value={formData.stockTotal}
                        onChange={handleChange}
                        min="0"
                        required
                      />
                    </div>
                    <div className="col-md-4">
                      <label className="form-label small fw-bold">
                        Stock para Venta
                      </label>
                      <input
                        type="number"
                        className="form-control"
                        name="stockDisponibleVenta"
                        value={formData.stockDisponibleVenta}
                        onChange={handleChange}
                        min={formData.stockComprometidoVenta || 0}
                        required
                      />
                    </div>
                    <div className="col-md-4">
                      <label className="form-label small fw-bold">
                        Stock para Arriendo
                      </label>
                      <input
                        type="number"
                        className="form-control"
                        name="stockDisponibleArriendo"
                        value={formData.stockDisponibleArriendo}
                        onChange={handleChange}
                        min={formData.stockComprometidoArriendo || 0}
                        required
                      />
                    </div>

                    <div className="col-12">
                      <label className="form-label small fw-bold">
                        Descripción
                      </label>
                      <textarea
                        className="form-control"
                        rows="3"
                        name="descripcion"
                        value={formData.descripcion || ''}
                        onChange={handleChange}
                      ></textarea>
                    </div>

                    <div className="col-12">
                      <div className="form-check form-switch mt-2">
                        <input
                          className="form-check-input"
                          type="checkbox"
                          id="estadoCheck"
                          name="estado"
                          checked={formData.estado}
                          onChange={handleChange}
                        />
                        <label
                          className="form-check-label small fw-bold"
                          htmlFor="estadoCheck"
                        >
                          Producto Habilitado / Disponible en el catálogo público
                        </label>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="modal-footer border-top">
                  <button
                    type="button"
                    className="btn btn-light rounded-pill px-4"
                    onClick={() => setModalOpen(false)}
                  >
                    Cancelar
                  </button>
                  <button type="submit" className="btn btn-dark rounded-pill px-4">
                    Guardar Cambios
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {productoFalla && (
        <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.55)', zIndex: 1080 }}>
          <div className="modal-dialog modal-dialog-centered" style={{ maxWidth: '480px' }}>
            <div className="modal-content rounded-4 border-0 shadow-lg">
              <div className="modal-header border-bottom px-4 py-3">
                <h5 className="fw-bold text-dark mb-0 d-flex align-items-center gap-2">
                  <i className="fa-solid fa-triangle-exclamation text-warning"></i>
                  Reportar Falla de Producto
                </h5>
                <button type="button" className="btn-close" onClick={cerrarModalFalla} disabled={enviandoFalla}></button>
              </div>

              <form onSubmit={handleConfirmarReporteFalla}>
                <div className="modal-body p-4">
                  {msgFalla && (
                    <div className="alert alert-danger p-3 mb-3 rounded-3 d-flex align-items-center justify-content-between border border-danger border-opacity-25">
                      <div className="d-flex align-items-center gap-2">
                        <i className="fa-solid fa-circle-exclamation text-danger fs-5"></i>
                        <span className="small fw-semibold">{msgFalla}</span>
                      </div>
                      <button 
                        type="button" 
                        className="btn-close ms-2" 
                        onClick={() => setMsgFalla('')}
                        style={{ fontSize: '0.75rem' }}
                      ></button>
                    </div>
                  )}

                  <div className="mb-3">
                    <label className="form-label small text-muted mb-1 fw-semibold">Producto Afiliado</label>
                    <input 
                      type="text" 
                      className="form-control rounded-pill px-3 bg-light text-muted"
                      value={`#${productoFalla.id} - ${productoFalla.nombre}`}
                      disabled
                      readOnly
                    />
                  </div>

                  <div className="mb-3">
                    <label htmlFor="stock-falla" className="form-label small fw-semibold">Unidad con falla del stock de:</label>
                    <select id="stock-falla" className="form-select" value={tipoStockFalla}
                      onChange={e => setTipoStockFalla(e.target.value)} disabled={enviandoFalla}>
                      <option value="venta" disabled={productoFalla.stockDisponibleVenta < 1}>Venta ({productoFalla.stockDisponibleVenta} disponibles)</option>
                      <option value="arriendo" disabled={productoFalla.stockDisponibleArriendo < 1}>Arriendo ({productoFalla.stockDisponibleArriendo} disponibles)</option>
                    </select>
                    <small className="text-muted">Se retirará una unidad disponible hasta completar la reparación.</small>
                  </div>

                  <div className="mb-3">
                    <label className="form-label small fw-semibold text-secondary">
                      Descripción de la falla / problema *
                    </label>
                    <textarea 
                      className="form-control rounded-3 p-3"
                      rows="4"
                      placeholder="Describe brevemente el fallo que presenta el producto..."
                      value={descripcionFalla}
                      onChange={(e) => setDescripcionFalla(e.target.value)}
                      disabled={enviandoFalla}
                      required
                    ></textarea>
                  </div>
                </div>

                <div className="modal-footer border-top p-3 justify-content-end">
                  <button 
                    type="button" 
                    className="btn btn-light rounded-pill px-3 fw-semibold small" 
                    onClick={cerrarModalFalla}
                    disabled={enviandoFalla}
                  >
                    Cancelar
                  </button>
                  <button 
                    type="submit" 
                    disabled={enviandoFalla}
                    className="btn btn-warning rounded-pill px-4 fw-bold small text-dark"
                  >
                    {enviandoFalla ? 'Enviando...' : 'Enviar a Mantención'}
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
