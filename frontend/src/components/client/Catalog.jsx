import React, { Fragment, useEffect, useState } from 'react'
import { leerCompartido } from '../../consultas'
import { useParams, useSearchParams, useNavigate } from 'react-router-dom'
import { useListaPaginada } from '../../hooks/useListaPaginada'
import { Paginador } from '../Paginador'
import { SUBCATEGORIAS } from '../../categorias'
import { EventosBanner } from './EventosBanner'
import { Estrellas } from '../Estrellas'


const PRODUCTOS_POR_PAGINA = 6






const simple = (nombre, icono) => ({ etiqueta: nombre, slug: normalizarSlug(nombre), icono, categorias: [nombre] })
const sub = (etiqueta, categoria, subcategoria, slug = normalizarSlug(etiqueta)) => ({ etiqueta, slug, categorias: [categoria], subcategoria })

const familia = (nombre, icono) => ({
  ...simple(nombre, icono),
  subcategorias: SUBCATEGORIAS[nombre].map(s => sub(s, nombre, s)),
})
const CATEGORIAS = [
  { etiqueta: 'Todas', slug: '', icono: 'fa-table-cells-large', categorias: [] },
  {
    etiqueta: 'Pianos y teclados', slug: 'pianos-y-teclados', icono: 'fa-keyboard',
    categorias: ['Pianos', 'Teclados y sintetizadores'],
    subcategorias: [
      { etiqueta: 'Pianos', slug: 'pianos', categorias: ['Pianos'] },
      sub('Teclados', 'Teclados y sintetizadores', 'Teclados'),
      sub('Sintetizadores', 'Teclados y sintetizadores', 'Sintetizadores'),
      { etiqueta: 'Teclados y sintetizadores', slug: 'teclados-y-sintetizadores', categorias: ['Teclados y sintetizadores'], oculta: true },
    ],
  },
  {
    etiqueta: 'Guitarras y bajos', slug: 'guitarras-y-bajos', icono: 'fa-guitar',
    categorias: ['Guitarras y bajos', 'Guitarra electrica', 'Ukeleles'],
    subcategorias: [
      sub('Guitarras acústicas', 'Guitarras y bajos', 'Guitarras acústicas'),
      sub('Bajos', 'Guitarras y bajos', 'Bajos'),
      { etiqueta: 'Guitarra eléctrica', slug: 'guitarra-electrica', categorias: ['Guitarra electrica'] },
      { etiqueta: 'Ukeleles', slug: 'ukeleles', categorias: ['Ukeleles'] },
      { etiqueta: 'Acústicas y bajos', slug: 'guitarras-acusticas-y-bajos', categorias: ['Guitarras y bajos'], oculta: true },
    ],
  },
  familia('Pedales y efectos', 'fa-sliders'),
  simple('Audio profesional', 'fa-volume-high'),
  simple('Micrófonos', 'fa-microphone'),
  simple('Audífonos', 'fa-headphones'),
  familia('Baterías y percusión', 'fa-drum'),
  familia('Vientos y orquesta', 'fa-wind'),
  simple('Accesorios', 'fa-plug'),
]
const TODAS_LAS_CATEGORIAS = CATEGORIAS.flatMap(c => [c, ...(c.subcategorias || [])])

const familiaDe = (opcion) => CATEGORIAS.find(c => c.subcategorias && (c === opcion || c.subcategorias.includes(opcion)))

const ORDENES = [
  { valor: '', texto: 'Relevancia' },
  { valor: 'precio_asc', texto: 'Menor precio' },
  { valor: 'precio_desc', texto: 'Mayor precio' },
]

function normalizarSlug(texto) {
  if (!texto) return ''
  return String(texto)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') 
    .trim()
    .replace(/\s+/g, '-')             
}
const formatearPrecio = (valor) => `$${Number(valor ?? 0).toLocaleString('es-CL')}`


function estadoStock(prod) {
  const venta = Number(prod.stockDisponibleVenta ?? 0)
  const arriendo = Number(prod.stockDisponibleArriendo ?? 0)
  if (venta > 0) return { texto: 'En stock', clase: 'ok' }
  if (arriendo > 0) return { texto: 'Solo arriendo', clase: 'marca' }
  return { texto: 'Agotado', clase: 'agotado' }
}

function TarjetaProducto({ prod, onVerDetalle, onAgregar }) {
  const stock = estadoStock(prod)
  const ventaDisponible = Number(prod.stockDisponibleVenta ?? 0) > 0
  const arriendoDisponible = Number(prod.stockDisponibleArriendo ?? 0) > 0 && Number(prod.precioArriendoDia ?? 0) > 0
  const nombreCompleto = `${prod.marca || ''} ${prod.nombre || ''}`.trim()
  const promo = prod.precioVentaPromo != null

  return (
    <article className="tienda-tarjeta">
      <div className="tienda-tarjeta-foto" onClick={() => onVerDetalle(prod)}>
        <span className={`tienda-etiqueta ${stock.clase}`}>{stock.texto}</span>
        {promo && <span className="tienda-etiqueta tienda-etiqueta-promo" title={prod.promocion?.titulo}>-{Number(prod.promocion?.porcentaje)}%</span>}
        {prod.foto ? (
          <img src={prod.foto} alt={nombreCompleto || 'Instrumento'} className="tienda-foto" loading="lazy" />
        ) : (
          <i className="fa-solid fa-guitar tienda-sin-foto" aria-hidden="true"></i>
        )}
      </div>

      <div className="tienda-tarjeta-cuerpo">
        <span className="tienda-tarjeta-marca">{prod.marca || 'Marca'}</span>
        <h3 className="tienda-tarjeta-titulo" onClick={() => onVerDetalle(prod)} title={prod.nombre}>
          {prod.nombre || 'Producto'}
        </h3>
        {prod.totalResenas > 0 && (
          <div className="tienda-calificacion">
            <Estrellas valor={prod.calificacionPromedio} tamano=".75rem" />
            <span>{Number(prod.calificacionPromedio).toLocaleString('es-CL', { minimumFractionDigits: 1 })} ({prod.totalResenas})</span>
          </div>
        )}

        <div className="tienda-precio">
          {promo ? (
            <>
              <strong className="tienda-precio-promo">{formatearPrecio(prod.precioVentaPromo)}</strong>
              <small><s>{formatearPrecio(prod.precioVenta)}</s> · {prod.promocion?.titulo}</small>
            </>
          ) : (
            <>
              <strong>{formatearPrecio(prod.precioVenta)}</strong>
              <small>
                {arriendoDisponible
                  ? `Arriendo desde ${formatearPrecio(prod.precioArriendoDia)} / día`
                  : 'Precio de venta'}
              </small>
            </>
          )}
        </div>

        <div className="tienda-tarjeta-acciones">
          <button type="button" className="tienda-boton-primario" onClick={() => onVerDetalle(prod)}>
            Ver detalles
          </button>
          <button
            type="button"
            className="tienda-boton-carrito"
            onClick={() => onAgregar(prod)}
            disabled={!ventaDisponible}
            title={ventaDisponible ? 'Agregar al carrito' : 'Sin stock para venta'}
            aria-label={ventaDisponible ? `Agregar ${nombreCompleto} al carrito` : `${nombreCompleto} sin stock para venta`}
          >
            <i className="fa-solid fa-cart-shopping"></i>
          </button>
        </div>
      </div>
    </article>
  )
}

function TarjetaCargando() {
  return (
    <div className="tienda-tarjeta" aria-hidden="true">
      <div className="tienda-tarjeta-foto"><div className="tienda-esqueleto w-75 h-75" /></div>
      <div className="tienda-tarjeta-cuerpo gap-2">
        <div className="tienda-esqueleto" style={{ height: '.7rem', width: '35%' }} />
        <div className="tienda-esqueleto" style={{ height: '1rem', width: '85%' }} />
        <div className="tienda-esqueleto mt-3" style={{ height: '1.5rem', width: '50%' }} />
        <div className="tienda-esqueleto mt-3" style={{ height: '2.5rem' }} />
      </div>
    </div>
  )
}

export function Catalog({ onSeleccionarProducto, onAgregarAlCarrito }) {
  
  const { slug } = useParams()

  
  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()

  const busquedaURL = searchParams.get('q') || ''
  const pagina = Math.max(1, parseInt(searchParams.get('pagina'), 10) || 1)
  const orden = searchParams.get('orden') || ''

  
  const categoriaSlugURL = slug ? slug.toLowerCase() : ''
  const categoriaActual = categoriaSlugURL ? TODAS_LAS_CATEGORIAS.find(c => c.slug === categoriaSlugURL) : undefined

  
  const familiaActiva = categoriaActual ? familiaDe(categoriaActual) : undefined
  const [grupoAbierto, setGrupoAbierto] = useState(familiaActiva?.slug ?? null)
  useEffect(() => { setGrupoAbierto(familiaActiva?.slug ?? null) }, [familiaActiva?.slug])

  
  const [conteos, setConteos] = useState(null)
  useEffect(() => {
    leerCompartido('/api/productos/categorias/')
      .then(({ data }) => setConteos(data))
      .catch(() => setConteos(null))
  }, [])
  const tieneProductos = (opcion) => {
    if (!conteos) return true 
    return opcion.categorias.some(nombre => {
      const cat = conteos.find(c => c.nombre.toLowerCase() === nombre.toLowerCase())
      if (!cat) return false
      if (!opcion.subcategoria) return cat.cantidad > 0
      return cat.subcategorias.some(s => s.nombre.toLowerCase() === opcion.subcategoria.toLowerCase() && s.cantidad > 0)
    })
  }

  
  const [panelAbierto, setPanelAbierto] = useState(false)
  useEffect(() => {
    if (!panelAbierto) return
    const alTecla = (e) => { if (e.key === 'Escape') setPanelAbierto(false) }
    document.addEventListener('keydown', alTecla)
    return () => document.removeEventListener('keydown', alTecla)
  }, [panelAbierto])

  
  const { items: productos, total, paginas, cargando, error } = useListaPaginada('/api/productos/', {
    pagina,
    tamano: PRODUCTOS_POR_PAGINA,
    
    filtros: {
      categoria: categoriaActual ? categoriaActual.categorias.join(',') : '',
      subcategoria: categoriaActual?.subcategoria || '',
      q: busquedaURL.trim(),
      orden,
    },
    evento: 'catalogo-actualizado',
  })

  const actualizarParams = (cambios) => {
    const params = new URLSearchParams(searchParams)
    Object.entries(cambios).forEach(([k, v]) => (v ? params.set(k, v) : params.delete(k)))
    setSearchParams(params)
  }

  const cambiarPagina = (n) => {
    actualizarParams({ pagina: n > 1 ? n : '' })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const seleccionarCategoria = (opcion) => {
    const params = orden ? `?orden=${orden}` : ''
    navigate(opcion.slug ? `/categoria/${opcion.slug}${params}` : `/${params}`)
    setPanelAbierto(false)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const verTodo = () => {
    navigate('/')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  
  const agregarRapido = (prod) => {
    onAgregarAlCarrito?.({
      ...prod,
      keyUnico: `item-${prod.id}-venta-${Date.now()}`,
      tipoOperacion: 'venta',
      cantidad: 1,
      fechaInicio: '',
      fechaTermino: '',
      diasArriendo: 1,
    })
  }

  const esActiva = (opcion) => (opcion.slug ? categoriaActual === opcion : !categoriaActual)
  const titulo = busquedaURL
    ? `Resultados para “${busquedaURL}”`
    : categoriaActual ? categoriaActual.etiqueta : 'Todas las categorías'
  const primeraCarga = cargando && productos.length === 0

  return (
    <div className="tienda-catalogo">

      {panelAbierto && <div className="tienda-fondo-panel" onClick={() => setPanelAbierto(false)} aria-hidden="true" />}

      <aside id="panel-categorias" className={`tienda-categorias${panelAbierto ? ' abierta' : ''}`} aria-label="Categorías">
        <div className="tienda-panel">
          <div className="d-flex align-items-center justify-content-between mb-2 px-2">
            <h2>Categorías</h2>
            <button type="button" className="tienda-cerrar-panel d-lg-none" onClick={() => setPanelAbierto(false)} aria-label="Cerrar categorías">
              <i className="fa-solid fa-xmark fs-5"></i>
            </button>
          </div>

          <nav className="d-flex flex-column gap-1">
            {CATEGORIAS.map(cat => {
              if (!cat.subcategorias) {
                return (
                  <button
                    key={cat.slug || 'todas'}
                    type="button"
                    onClick={() => seleccionarCategoria(cat)}
                    className={`tienda-categoria${esActiva(cat) ? ' activa' : ''}`}
                    aria-current={esActiva(cat) ? 'page' : undefined}
                  >
                    <i className={`fa-solid ${cat.icono}`} aria-hidden="true"></i>
                    <span>{cat.etiqueta}</span>
                  </button>
                )
              }

              
              const abierto = grupoAbierto === cat.slug
              const grupoActivo = familiaActiva === cat
              const alPulsarFamilia = () => {
                if (esActiva(cat)) setGrupoAbierto(abierto ? null : cat.slug) 
                else seleccionarCategoria(cat)
              }
              return (
                <Fragment key={cat.slug}>
                  <button
                    type="button"
                    onClick={alPulsarFamilia}
                    className={`tienda-categoria${grupoActivo ? ' activa' : ''}`}
                    aria-expanded={abierto}
                    aria-current={esActiva(cat) ? 'page' : undefined}
                  >
                    <i className={`fa-solid ${cat.icono}`} aria-hidden="true"></i>
                    <span>{cat.etiqueta}</span>
                    <i className={`fa-solid fa-chevron-down flecha${abierto ? ' abierta' : ''}`} aria-hidden="true"></i>
                  </button>
                  {abierto && (
                    <div className="tienda-subcategorias">
                      {cat.subcategorias.filter(s => !s.oculta && (tieneProductos(s) || esActiva(s))).map(sub => (
                        <button
                          key={sub.slug}
                          type="button"
                          onClick={() => seleccionarCategoria(sub)}
                          className={`tienda-subcategoria${esActiva(sub) ? ' activa' : ''}`}
                          aria-current={esActiva(sub) ? 'page' : undefined}
                        >
                          {sub.etiqueta}
                        </button>
                      ))}
                    </div>
                  )}
                </Fragment>
              )
            })}
          </nav>
        </div>
      </aside>

      <section className="tienda-catalogo-main">

        
        {!categoriaActual && !busquedaURL && pagina === 1 && <EventosBanner />}

        <div className="tienda-toolbar">
          <div className="min-w-0">
            <h1>{titulo}</h1>
            <p>
              {busquedaURL ? (
                <button type="button" className="btn btn-link p-0 small align-baseline" onClick={verTodo}>Limpiar búsqueda</button>
              ) : 'Equipamiento musical para comprar o arrendar'}
            </p>
          </div>

          <div className="d-flex align-items-center gap-2">
            <button
              type="button"
              className="tienda-boton-secundario d-lg-none"
              onClick={() => setPanelAbierto(true)}
              aria-controls="panel-categorias"
              aria-expanded={panelAbierto}
            >
              <i className="fa-solid fa-bars"></i> Categorías
            </button>
            <div className="tienda-orden">
              <label htmlFor="orden-catalogo">Ordenar por:</label>
              <select
                id="orden-catalogo"
                className="form-select"
                value={orden}
                onChange={(e) => actualizarParams({ orden: e.target.value, pagina: '' })}
              >
                {ORDENES.map(o => <option key={o.valor} value={o.valor}>{o.texto}</option>)}
              </select>
            </div>
          </div>
        </div>

        {error && <p role="alert" className="alert alert-danger">{error}</p>}

        {primeraCarga ? (
          <div className="tienda-grilla" role="status" aria-label="Cargando productos">
            {Array.from({ length: PRODUCTOS_POR_PAGINA }, (_, i) => <TarjetaCargando key={i} />)}
          </div>
        ) : !error && productos.length === 0 ? (
          <div className="tienda-vacio">
            <div className="tienda-vacio-icono"><i className="fa-solid fa-magnifying-glass"></i></div>
            <h3>No encontramos instrumentos con ese criterio</h3>
            <p>Intenta buscar con otro término o revisa otra categoría.</p>
            <button type="button" className="tienda-boton-primario mt-4 px-4" style={{ flex: 'none' }} onClick={verTodo}>
              Ver todo el catálogo
            </button>
          </div>
        ) : (
          <>
            <div className="tienda-grilla" style={{ opacity: cargando ? 0.6 : 1, transition: 'opacity .15s' }} aria-busy={cargando}>
              {productos.map(prod => (
                <TarjetaProducto
                  key={prod.id}
                  prod={prod}
                  onVerDetalle={onSeleccionarProducto}
                  onAgregar={agregarRapido}
                />
              ))}
            </div>
            <Paginador
              pagina={Math.min(pagina, paginas)}
              paginas={paginas}
              total={total}
              tamano={PRODUCTOS_POR_PAGINA}
              onCambiar={cambiarPagina}
              etiqueta="productos"
              className="mt-4"
            />
          </>
        )}
      </section>
    </div>
  )
}
