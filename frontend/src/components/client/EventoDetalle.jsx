import React, { useEffect, useState } from 'react'
import axios from 'axios'
import { useNavigate, useParams } from 'react-router-dom'
import {
  CONDICIONES_OUTLET, TIPOS_EVENTO, beneficioEvento, fechaCorta, fechaDia, fechaHora, pesos, prorratearPack,
} from '../../eventos'

const hoyISO = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
const diasEntre = (inicio, fin) => Math.max(1, Math.ceil((new Date(fin) - new Date(inicio)) / 86400000))
const esLink = (texto) => /^https?:\/\//i.test(texto || '')

function TarjetaEvento({ prod, evento, vigente, onVer, onAgregar }) {
  const promo = prod.precioVentaPromo != null
  const enPack = evento.tipo_evento === 'pack_arriendo'
  const ventaDisponible = Number(prod.stockDisponibleVenta) > 0
  const reserva = evento.tipo_evento === 'preventa'
  const puedeAgregar = !enPack && ventaDisponible && (!reserva || evento.permite_reserva)

  return (
    <article className="tienda-tarjeta">
      <div className="tienda-tarjeta-foto" onClick={() => onVer(prod)}>
        {promo && <span className="tienda-etiqueta tienda-etiqueta-promo">-{Number(prod.descuentoPromo)}%</span>}
        {prod.foto
          ? <img src={prod.foto} alt={`${prod.marca} ${prod.nombre}`} className="tienda-foto" loading="lazy" />
          : <i className="fa-solid fa-guitar tienda-sin-foto" aria-hidden="true"></i>}
      </div>
      <div className="tienda-tarjeta-cuerpo">
        <span className="tienda-tarjeta-marca">{prod.marca}</span>
        <h3 className="tienda-tarjeta-titulo" onClick={() => onVer(prod)}>{prod.nombre}</h3>
        <div className="tienda-precio">
          {enPack ? (
            <>
              <strong>{pesos(prod.precioPackDia)} <span className="fs-6 fw-semibold">/ día</span></strong>
              <small>En el pack · <s>{pesos(prod.precioArriendoDia)} / día</s> por separado</small>
            </>
          ) : promo ? (
            <>
              <strong className="tienda-precio-promo">{pesos(prod.precioVentaPromo)}</strong>
              <small><s>{pesos(prod.precioVenta)}</s> precio normal</small>
            </>
          ) : (
            <>
              <strong>{pesos(prod.precioVenta)}</strong>
              <small>{!vigente && Number(evento.porcentaje_descuento) > 0 ? `El descuento comienza el ${fechaCorta(evento.fecha_inicio)}` : 'Precio de venta'}</small>
            </>
          )}
        </div>
        <div className="tienda-tarjeta-acciones">
          <button type="button" className="tienda-boton-primario" onClick={() => onVer(prod)}>
            {evento.tipo_evento === 'en_vivo' ? 'Ver o arrendar' : 'Ver detalles'}
          </button>
          {!enPack && evento.tipo_evento !== 'en_vivo' && (
            <button
              type="button"
              className="tienda-boton-carrito"
              disabled={!puedeAgregar}
              onClick={() => onAgregar(prod)}
              title={!ventaDisponible ? 'Sin stock para venta' : reserva ? 'Reservar' : 'Agregar al carrito'}
              aria-label={`${reserva ? 'Reservar' : 'Agregar al carrito'} ${prod.nombre}`}
            >
              <i className={`fa-solid ${reserva ? 'fa-bookmark' : 'fa-cart-shopping'}`}></i>
            </button>
          )}
        </div>
      </div>
    </article>
  )
}

export function EventoDetalle({ onAgregarAlCarrito }) {
  const { id } = useParams()
  const navigate = useNavigate()
  const [evento, setEvento] = useState(null)
  const [estado, setEstado] = useState('cargando')
  const [fechaInicio, setFechaInicio] = useState('')
  const [fechaTermino, setFechaTermino] = useState('')
  const [errorPack, setErrorPack] = useState('')

  useEffect(() => {
    let activo = true
    setEstado('cargando')
    axios.get(`/api/eventos/${id}/`)
      .then(({ data }) => { if (activo) { setEvento(data); setEstado('listo') } })
      .catch(() => { if (activo) setEstado('no-encontrado') })
    return () => { activo = false }
  }, [id])

  if (estado === 'cargando') {
    return <div className="text-center my-5"><div className="spinner-border" style={{ color: 'var(--store-primary)' }} role="status"><span className="visually-hidden">Cargando…</span></div></div>
  }
  if (estado === 'no-encontrado' || !evento) {
    return (
      <div className="tienda-vacio">
        <div className="tienda-vacio-icono"><i className="fa-solid fa-calendar-xmark"></i></div>
        <h3>Este evento ya no está disponible</h3>
        <p>Puede que haya terminado o que se haya retirado.</p>
        <button type="button" className="tienda-boton-primario mt-4 px-4" style={{ flex: 'none' }} onClick={() => navigate('/')}>Ver el catálogo</button>
      </div>
    )
  }

  const tipo = TIPOS_EVENTO[evento.tipo_evento] || {}
  const vigente = evento.estado === 'activo'
  const productos = evento.productos || []
  const verProducto = (p) => { navigate(`/producto/${p.id}`); window.scrollTo({ top: 0 }) }

  const agregar = (prod) => onAgregarAlCarrito({
    ...prod, keyUnico: `item-${prod.id}-venta-${Date.now()}`, tipoOperacion: 'venta', cantidad: 1,
    fechaInicio: '', fechaTermino: '', diasArriendo: 1,
  })

  
  const sinStockPack = productos.filter(p => Number(p.stockDisponibleArriendo) < 1)
  const arrendarPack = () => {
    setErrorPack('')
    if (!fechaInicio || !fechaTermino) return setErrorPack('Elige las fechas de inicio y término del arriendo.')
    if (fechaInicio < hoyISO() || fechaTermino < fechaInicio) return setErrorPack('Revisa las fechas: el término no puede ser anterior al inicio.')
    const dias = diasEntre(fechaInicio, fechaTermino)
    const reparto = prorratearPack(evento.precio_pack_arriendo, productos)
    productos.forEach(p => onAgregarAlCarrito({
      ...p,
      keyUnico: `pack-${evento.id}-${p.id}-${Date.now()}`,
      tipoOperacion: 'arriendo', cantidad: 1, fechaInicio, fechaTermino, diasArriendo: dias,
      packId: evento.id, precioArriendoDiaOriginal: p.precioArriendoDia, precioArriendoDia: reparto[p.id],
    }))
  }
  const ahorroPack = Number(evento.precio_pack_normal) - Number(evento.precio_pack_arriendo)

  return (
    <div>
      <button type="button" className="btn btn-link px-0 mb-3 text-decoration-none" onClick={() => navigate('/')}>
        <i className="fa-solid fa-arrow-left me-1"></i>Volver al catálogo
      </button>

      <section
        className="tienda-evento tienda-evento-detalle mb-4"
        style={{
          '--evento-color': tipo.color,
          backgroundImage: evento.imagen_banner
            ? `linear-gradient(90deg, rgba(10,10,14,.92) 0%, rgba(10,10,14,.7) 50%, rgba(10,10,14,.25) 100%), url(${evento.imagen_banner})`
            : undefined,
        }}
      >
        <div className="tienda-evento-contenido">
          <span className="tienda-evento-tipo">
            <i className={`fa-solid ${tipo.icono}`} aria-hidden="true"></i>{tipo.etiqueta}
            {evento.estado === 'programado' && <span className="tienda-evento-pronto">Próximamente</span>}
          </span>
          <h1>{evento.titulo}</h1>
          <p className="tienda-evento-beneficio">{beneficioEvento(evento)}</p>
          {evento.descripcion && <p className="tienda-evento-descripcion">{evento.descripcion}</p>}
          <ul className="tienda-evento-datos">
            {evento.tipo_evento === 'en_vivo' ? (
              <>
                <li><i className="fa-solid fa-microphone-lines"></i>{evento.artista_invitado}</li>
                <li><i className="fa-regular fa-calendar"></i>{fechaHora(evento.fecha_inicio, { weekday: 'long', year: 'numeric' })}</li>
                <li>
                  <i className={`fa-solid ${esLink(evento.lugar_o_link) ? 'fa-video' : 'fa-location-dot'}`}></i>
                  {esLink(evento.lugar_o_link)
                    ? <a href={evento.lugar_o_link} target="_blank" rel="noopener noreferrer">Ver transmisión</a>
                    : evento.lugar_o_link}
                </li>
              </>
            ) : (
              <li><i className="fa-regular fa-calendar"></i>{vigente ? `Válido hasta el ${fechaCorta(evento.fecha_fin)}` : `Desde el ${fechaCorta(evento.fecha_inicio)} al ${fechaCorta(evento.fecha_fin)}`}</li>
            )}
            {evento.tipo_evento === 'preventa' && evento.fecha_disponibilidad && (
              <li><i className="fa-solid fa-truck-fast"></i>Disponible desde el {fechaDia(evento.fecha_disponibilidad)}{evento.permite_reserva ? ' · Reserva anticipada abierta' : ''}</li>
            )}
            {evento.tipo_evento === 'outlet' && (
              <li>
                <i className="fa-solid fa-circle-check"></i>
                Ex-arriendo{evento.condicion_outlet ? ` · ${CONDICIONES_OUTLET[evento.condicion_outlet]}` : ''}
                {evento.estado_verificado && ' · Estado verificado por técnico'}
              </li>
            )}
          </ul>
        </div>
        {!evento.imagen_banner && <i className={`fa-solid ${tipo.icono} tienda-evento-icono`} aria-hidden="true"></i>}
      </section>

      {evento.tipo_evento === 'pack_arriendo' && (
        <div className="tienda-panel mb-4">
          <div className="d-flex flex-wrap justify-content-between align-items-end gap-3">
            <div>
              <h2 className="h5 fw-bold mb-1">Arrienda el pack completo</h2>
              <p className="mb-0 text-secondary small">
                {productos.length} instrumentos por <strong className="text-body">{pesos(evento.precio_pack_arriendo)} / día</strong>
                {ahorroPack > 0 && <> · por separado {pesos(evento.precio_pack_normal)} / día · <span className="text-success fw-semibold">ahorras {pesos(ahorroPack)} al día</span></>}
              </p>
            </div>
            {vigente ? (
              <div className="d-flex flex-wrap align-items-end gap-2">
                <div>
                  <label htmlFor="pack-inicio" className="form-label small mb-1">Desde</label>
                  <input id="pack-inicio" type="date" className="form-control form-control-sm" min={hoyISO()} value={fechaInicio} onChange={(e) => setFechaInicio(e.target.value)} />
                </div>
                <div>
                  <label htmlFor="pack-fin" className="form-label small mb-1">Hasta</label>
                  <input id="pack-fin" type="date" className="form-control form-control-sm" min={fechaInicio || hoyISO()} value={fechaTermino} onChange={(e) => setFechaTermino(e.target.value)} />
                </div>
                <button type="button" className="tienda-boton-primario" style={{ flex: 'none' }} disabled={sinStockPack.length > 0} onClick={arrendarPack}>
                  <i className="fa-solid fa-boxes-stacked me-2"></i>Arrendar pack
                </button>
              </div>
            ) : (
              <span className="badge bg-info">Disponible desde el {fechaCorta(evento.fecha_inicio)}</span>
            )}
          </div>
          {fechaInicio && fechaTermino && fechaTermino >= fechaInicio && (
            <p className="small mt-2 mb-0">Total estimado: <strong>{pesos(Number(evento.precio_pack_arriendo) * diasEntre(fechaInicio, fechaTermino))}</strong> por {diasEntre(fechaInicio, fechaTermino)} día(s) + IVA</p>
          )}
          {sinStockPack.length > 0 && <p role="alert" className="small text-danger mt-2 mb-0">Sin stock de arriendo por ahora: {sinStockPack.map(p => p.nombre).join(', ')}.</p>}
          {errorPack && <p role="alert" className="small text-danger mt-2 mb-0">{errorPack}</p>}
        </div>
      )}

      {productos.length > 0 && (
        <>
          <h2 className="h5 fw-bold mb-3">{evento.tipo_evento === 'en_vivo' ? 'Equipos protagonistas' : 'Productos del evento'}</h2>
          <div className="tienda-grilla">
            {productos.map(p => (
              <TarjetaEvento key={p.id} prod={p} evento={evento} vigente={vigente} onVer={verProducto} onAgregar={agregar} />
            ))}
          </div>
        </>
      )}
    </div>
  )
}
