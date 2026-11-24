import React, { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  Area, AreaChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts'
import { useReports } from '../../hooks/useReports'


const COLOR = { ventas: '#1cc88a', arriendos: '#36b9cc', total: '#e83e8c' }
const PALETA = ['#e83e8c', '#36b9cc', '#1cc88a', '#f6c23e', '#4e73df', '#fd7e14', '#858796', '#6f42c1']

const RANGOS = [
  { id: 'todo', texto: 'Todo' },
  { id: '7d', texto: 'Últimos 7 días' },
  { id: 'mes', texto: 'Este mes' },
  { id: 'personalizado', texto: 'Personalizado' },
]

const pesos = (n) => `$${Math.round(Number(n) || 0).toLocaleString('es-CL')}`
const pesosCorto = (n) => {
  const v = Number(n) || 0
  if (Math.abs(v) >= 1e6) return `$${(v / 1e6).toLocaleString('es-CL', { maximumFractionDigits: 1 })}M`
  if (Math.abs(v) >= 1e3) return `$${Math.round(v / 1e3).toLocaleString('es-CL')}k`
  return `$${v}`
}
const porcentaje = (parte, total) => (total > 0 ? (parte / total) * 100 : 0)


function etiquetaPeriodo(periodo, agrupacion) {
  if (!periodo) return ''
  if (agrupacion === 'mes') {
    const [y, m] = periodo.split('-').map(Number)
    return new Date(y, m - 1, 1).toLocaleDateString('es-CL', { month: 'short', year: '2-digit' })
  }
  const [, m, d] = periodo.split('-')
  return `${d}/${m}`
}


function useTemaOscuro() {
  const leer = () => document.documentElement.dataset.bsTheme === 'dark'
  const [oscuro, setOscuro] = useState(leer)
  useEffect(() => {
    const obs = new MutationObserver(() => setOscuro(leer()))
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['data-bs-theme'] })
    return () => obs.disconnect()
  }, [])
  return oscuro
}

function TarjetaKpi({ titulo, valor, detalle, color, icono }) {
  return (
    <div className="col-xl-4 col-md-6 mb-4">
      <div className={`card border-left-${color} shadow h-100 py-2`}>
        <div className="card-body">
          <div className="row g-0 align-items-center">
            <div className="col me-2">
              <div className={`text-xs fw-bold text-${color} text-uppercase mb-1`}>{titulo}</div>
              <div className="h5 mb-0 fw-bold text-gray-800">{valor}</div>
              <div className="small text-gray-600 mt-1">{detalle}</div>
            </div>
            <div className="col-auto">
              <i className={`fas ${icono} fa-2x text-gray-300`} aria-hidden="true"></i>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function SinDatos({ icono = 'fa-chart-area', texto }) {
  return (
    <div className="d-flex flex-column align-items-center justify-content-center text-center text-gray-500 h-100 py-5">
      <i className={`fas ${icono} fa-2x mb-2 opacity-50`} aria-hidden="true"></i>
      <span className="small">{texto}</span>
    </div>
  )
}


function TooltipTema({ active, payload, label, oscuro, formatoEtiqueta }) {
  if (!active || !payload?.length) return null
  return (
    <div style={{
      background: oscuro ? '#25262e' : '#fff', border: `1px solid ${oscuro ? '#2e303a' : '#e3e6f0'}`,
      borderRadius: '.5rem', padding: '.6rem .8rem', boxShadow: '0 .5rem 1rem rgba(0,0,0,.25)',
      color: oscuro ? '#f3f4f6' : '#5a5c69', fontSize: '.8rem',
    }}>
      {label !== undefined && <div className="fw-bold mb-1">{formatoEtiqueta ? formatoEtiqueta(label) : label}</div>}
      {payload.map(p => (
        <div key={p.dataKey ?? p.name} className="d-flex align-items-center gap-2">
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: p.color || p.payload?.color }} />
          <span>{p.name}:</span>
          <strong>{pesos(p.value)}</strong>
        </div>
      ))}
    </div>
  )
}

export function ReportsManagement() {
  const {
    reportData,
    loading,
    error,
    fechaInicio,
    setFechaInicio,
    fechaFin,
    setFechaFin,
    rango,
    aplicarRango,
    aplicarFiltroFechas,
    limpiarFiltros
  } = useReports()
  const [, setParams] = useSearchParams()
  const oscuro = useTemaOscuro()
  const [vistaDona, setVistaDona] = useState('tipo') 

  const ingresosVentas = Number(reportData.ingresosVentas || 0)
  const ingresosArriendos = Number(reportData.ingresosArriendos || 0)
  const totalGeneralIngresos = ingresosVentas + ingresosArriendos
  const operaciones = (reportData.pedidosVentasCount || 0) + (reportData.pedidosArriendosCount || 0)

  const ejes = {
    grilla: oscuro ? '#2e303a' : '#e3e6f0',
    texto: oscuro ? '#9ca3af' : '#858796',
  }

  const serie = reportData.serie || []
  const agrupacion = reportData.agrupacionSerie

  
  const datosDona = useMemo(() => {
    if (vistaDona === 'categoria') {
      return (reportData.ingresosPorCategoria || [])
        .filter(c => c.total > 0)
        .map((c, i) => ({ name: c.categoria, value: Number(c.total), color: PALETA[i % PALETA.length] }))
    }
    return [
      { name: 'Ventas', value: ingresosVentas, color: COLOR.ventas },
      { name: 'Arriendos', value: ingresosArriendos, color: COLOR.arriendos },
    ].filter(d => d.value > 0)
  }, [vistaDona, reportData.ingresosPorCategoria, ingresosVentas, ingresosArriendos])
  const totalDona = datosDona.reduce((s, d) => s + d.value, 0)

  
  const topCinco = useMemo(() => {
    const porProducto = new Map()
    for (const item of reportData.topProductos || []) {
      const actual = porProducto.get(item.id) || { id: item.id, nombre: item.nombre, cantidad: 0, total: 0, tipos: new Set() }
      actual.cantidad += Number(item.cantidad || 0)
      actual.total += Number(item.totalGenerado || 0)
      actual.tipos.add(String(item.tipo || '').toLowerCase() === 'arriendo' ? 'Arriendo' : 'Venta')
      porProducto.set(item.id, actual)
    }
    
    return [...porProducto.values()].sort((a, b) => b.total - a.total || b.cantidad - a.cantidad).slice(0, 5)
  }, [reportData.topProductos])

  const alertas = reportData.alertas || {}
  const textoPeriodo = fechaInicio || fechaFin
    ? `${fechaInicio || 'inicio'} al ${fechaFin || 'hoy'}`
    : 'Todo el historial'

  
  const exportarCsv = () => {
    const celda = (v) => {
      const s = String(v ?? '')
      return /[;"\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
    }
    const filas = [
      ['Reporte Distortion House'], ['Período', textoPeriodo], ['Generado', new Date().toLocaleString('es-CL')], [],
      ['Indicador', 'Valor'],
      ['Ingresos por ventas', Math.round(ingresosVentas)],
      ['Ingresos por arriendos', Math.round(ingresosArriendos)],
      ['Ingresos totales', Math.round(totalGeneralIngresos)],
      ['Pedidos con ventas', reportData.pedidosVentasCount || 0],
      ['Pedidos con arriendos', reportData.pedidosArriendosCount || 0], [],
      [agrupacion === 'mes' ? 'Mes' : 'Día', 'Ventas', 'Arriendos', 'Total'],
      ...serie.map(s => [s.periodo, Math.round(s.ventas), Math.round(s.arriendos), Math.round(s.ventas + s.arriendos)]), [],
      ['Categoría', 'Ingresos', '% del total'],
      ...(reportData.ingresosPorCategoria || []).map(c => [c.categoria, Math.round(c.total), porcentaje(c.total, totalGeneralIngresos).toFixed(1)]), [],
      ['Producto', 'Modalidad', 'Unidades', 'Ingresos', '% del total'],
      ...topCinco.map(p => [p.nombre, [...p.tipos].join(' y '), p.cantidad, Math.round(p.total), porcentaje(p.total, totalGeneralIngresos).toFixed(1)]), [],
      ['Cliente', 'Correo', 'Pedidos', 'Monto total'],
      ...(reportData.topClientes || []).map(c => [c.nombre, c.email, c.cantidadPedidos, Math.round(c.totalGastado)]),
    ]
    const csv = '﻿' + filas.map(f => f.map(celda).join(';')).join('\r\n')
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
    const a = Object.assign(document.createElement('a'), { href: url, download: `reporte-distortion-house-${new Date().toISOString().slice(0, 10)}.csv` })
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="reportes-dashboard" aria-busy={loading}>

      
      <div className="card shadow mb-4 no-imprimir">
        <div className="card-body py-3">
          <div className="d-flex flex-wrap align-items-center justify-content-between gap-3">
            <div className="btn-group flex-wrap" role="group" aria-label="Rango de fechas">
              {RANGOS.map(r => (
                <button
                  key={r.id}
                  type="button"
                  className={`btn btn-sm ${rango === r.id ? 'btn-primary' : 'btn-outline-secondary'}`}
                  aria-pressed={rango === r.id}
                  onClick={() => aplicarRango(r.id)}
                >
                  {r.texto}
                </button>
              ))}
            </div>
            <div className="d-flex gap-2">
              <button type="button" className="btn btn-sm btn-outline-secondary" onClick={exportarCsv} disabled={loading}>
                <i className="fas fa-file-csv me-1" aria-hidden="true"></i>Exportar CSV
              </button>
              <button type="button" className="btn btn-sm btn-primary" onClick={() => window.print()} disabled={loading}>
                <i className="fas fa-print me-1" aria-hidden="true"></i>Imprimir
              </button>
            </div>
          </div>

          {rango === 'personalizado' && (
            <form onSubmit={aplicarFiltroFechas} className="row g-2 align-items-end mt-2">
              <div className="col-sm-4">
                <label htmlFor="reporte-desde" className="form-label small fw-semibold text-gray-600 mb-1">Desde</label>
                <input id="reporte-desde" type="date" className="form-control form-control-sm" value={fechaInicio} onChange={(e) => setFechaInicio(e.target.value)} />
              </div>
              <div className="col-sm-4">
                <label htmlFor="reporte-hasta" className="form-label small fw-semibold text-gray-600 mb-1">Hasta</label>
                <input id="reporte-hasta" type="date" className="form-control form-control-sm" value={fechaFin} onChange={(e) => setFechaFin(e.target.value)} />
              </div>
              <div className="col-sm-4 d-flex gap-2">
                <button type="submit" className="btn btn-sm btn-primary flex-grow-1"><i className="fas fa-filter me-1"></i>Filtrar</button>
                <button type="button" onClick={limpiarFiltros} className="btn btn-sm btn-outline-secondary">Limpiar</button>
              </div>
            </form>
          )}
        </div>
      </div>

      <p className="text-gray-600 small mb-3">
        <i className="far fa-calendar me-1" aria-hidden="true"></i>Período: <strong>{textoPeriodo}</strong>
        {loading && <span className="ms-2"><span className="spinner-border spinner-border-sm" role="status" aria-label="Cargando" /></span>}
      </p>

      {error && <div role="alert" className="alert alert-danger">{error}</div>}

      
      <div className="row">
        <TarjetaKpi titulo="Ingresos por ventas" color="success" icono="fa-bag-shopping"
          valor={pesos(ingresosVentas)} detalle={`${reportData.pedidosVentasCount || 0} pedidos con ventas`} />
        <TarjetaKpi titulo="Ingresos por arriendos" color="info" icono="fa-key"
          valor={pesos(ingresosArriendos)} detalle={`${reportData.pedidosArriendosCount || 0} pedidos con arriendos`} />
        <TarjetaKpi titulo="Ingresos totales" color="primary" icono="fa-chart-pie"
          valor={pesos(totalGeneralIngresos)} detalle={`${operaciones} operaciones en el período`} />
      </div>

      
      <div className="row">
        <div className="col-lg-8 mb-4">
          <div className="card shadow h-100">
            <div className="card-header py-3 d-flex align-items-center justify-content-between">
              <h6 className="m-0 fw-bold text-primary">Evolución de ingresos: ventas vs. arriendos</h6>
              <span className="small text-gray-500">{agrupacion === 'mes' ? 'Por mes' : 'Por día'}</span>
            </div>
            <div className="card-body">
              <div style={{ height: 320 }}>
                {serie.length === 0 ? (
                  <SinDatos texto="No hay ingresos pagados en este período." />
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={serie} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id="gradVentas" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={COLOR.ventas} stopOpacity={0.35} />
                          <stop offset="95%" stopColor={COLOR.ventas} stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="gradArriendos" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={COLOR.arriendos} stopOpacity={0.35} />
                          <stop offset="95%" stopColor={COLOR.arriendos} stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid stroke={ejes.grilla} strokeDasharray="3 3" vertical={false} />
                      <XAxis
                        dataKey="periodo"
                        tickFormatter={(p) => etiquetaPeriodo(p, agrupacion)}
                        tick={{ fill: ejes.texto, fontSize: 12 }}
                        axisLine={{ stroke: ejes.grilla }}
                        tickLine={false}
                        minTickGap={16}
                      />
                      <YAxis tickFormatter={pesosCorto} tick={{ fill: ejes.texto, fontSize: 12 }} axisLine={false} tickLine={false} width={64} />
                      <Tooltip
                        content={<TooltipTema oscuro={oscuro} formatoEtiqueta={(p) => etiquetaPeriodo(p, agrupacion)} />}
                        cursor={{ stroke: ejes.texto, strokeDasharray: '3 3' }}
                      />
                      <Area type="monotone" dataKey="ventas" name="Ventas" stroke={COLOR.ventas} strokeWidth={2} fill="url(#gradVentas)" />
                      <Area type="monotone" dataKey="arriendos" name="Arriendos" stroke={COLOR.arriendos} strokeWidth={2} fill="url(#gradArriendos)" />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </div>
              <div className="d-flex justify-content-center gap-4 small mt-2">
                <span><i className="fas fa-circle me-1" style={{ color: COLOR.ventas }}></i>Ventas</span>
                <span><i className="fas fa-circle me-1" style={{ color: COLOR.arriendos }}></i>Arriendos</span>
              </div>
            </div>
          </div>
        </div>

        <div className="col-lg-4 mb-4">
          <div className="card shadow h-100">
            <div className="card-header py-3 d-flex align-items-center justify-content-between gap-2">
              <h6 className="m-0 fw-bold text-primary">Distribución de ingresos</h6>
              <div className="btn-group btn-group-sm no-imprimir" role="group" aria-label="Ver distribución por">
                <button type="button" className={`btn ${vistaDona === 'tipo' ? 'btn-primary' : 'btn-outline-secondary'}`} aria-pressed={vistaDona === 'tipo'} onClick={() => setVistaDona('tipo')}>Tipo</button>
                <button type="button" className={`btn ${vistaDona === 'categoria' ? 'btn-primary' : 'btn-outline-secondary'}`} aria-pressed={vistaDona === 'categoria'} onClick={() => setVistaDona('categoria')}>Categoría</button>
              </div>
            </div>
            <div className="card-body d-flex flex-column">
              {totalDona === 0 ? (
                <div style={{ height: 240 }}><SinDatos icono="fa-chart-pie" texto="Sin ingresos para distribuir." /></div>
              ) : (
                <>
                  <div className="position-relative" style={{ height: 240 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={datosDona} dataKey="value" nameKey="name" innerRadius="62%" outerRadius="88%" paddingAngle={2} stroke={oscuro ? '#1c1d22' : '#fff'} strokeWidth={2}>
                          {datosDona.map(d => <Cell key={d.name} fill={d.color} />)}
                        </Pie>
                        <Tooltip content={<TooltipTema oscuro={oscuro} />} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="position-absolute top-50 start-50 translate-middle text-center" style={{ pointerEvents: 'none' }}>
                      <div className="text-xs text-gray-500 text-uppercase fw-bold">Total</div>
                      <div className="fw-bold text-gray-800">{pesosCorto(totalDona)}</div>
                    </div>
                  </div>
                  <ul className="list-unstyled small mt-3 mb-0">
                    {datosDona.map(d => (
                      <li key={d.name} className="d-flex align-items-center justify-content-between py-1">
                        <span className="text-truncate me-2"><i className="fas fa-circle me-2" style={{ color: d.color }}></i>{d.name}</span>
                        <strong className="text-gray-800">{porcentaje(d.value, totalDona).toFixed(1)}%</strong>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      
      <div className="row">
        <div className="col-lg-6 mb-4">
          <div className="card shadow h-100">
            <div className="card-header py-3 d-flex align-items-center justify-content-between">
              <h6 className="m-0 fw-bold text-primary"><i className="fas fa-trophy text-warning me-2"></i>Top 5 instrumentos</h6>
              <span className="small text-gray-500">% de los ingresos del período</span>
            </div>
            <div className="card-body">
              {topCinco.length === 0 ? (
                <SinDatos icono="fa-trophy" texto="Aún no hay productos vendidos o arrendados en este período." />
              ) : topCinco.map((p, i) => {
                const pct = porcentaje(p.total, totalGeneralIngresos)
                return (
                  <div key={p.id} className="mb-4">
                    <div className="d-flex justify-content-between align-items-baseline gap-2 mb-1">
                      <h4 className="small fw-bold mb-0 text-gray-800 text-truncate">
                        {i + 1}. {p.nombre}
                        {[...p.tipos].map(t => (
                          <span key={t} className="badge rounded-pill ms-2 fw-semibold" style={{ background: t === 'Arriendo' ? COLOR.arriendos : COLOR.ventas, fontSize: '.6rem' }}>{t}</span>
                        ))}
                      </h4>
                      <span className="small fw-bold text-gray-800 text-nowrap">{pct.toFixed(1)}%</span>
                    </div>
                    <div className="progress" style={{ height: '.6rem' }} role="progressbar" aria-label={`Participación de ${p.nombre}`} aria-valuenow={Math.round(pct)} aria-valuemin="0" aria-valuemax="100">
                      <div className="progress-bar" style={{ width: `${pct}%`, background: PALETA[i % PALETA.length] }} />
                    </div>
                    <div className="small text-gray-500 mt-1">{p.cantidad} {p.cantidad === 1 ? 'unidad' : 'unidades'} · {pesos(p.total)}</div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        <div className="col-lg-6 mb-4">
          <div className="card shadow h-100">
            <div className="card-header py-3 d-flex align-items-center justify-content-between">
              <h6 className="m-0 fw-bold text-primary"><i className="fas fa-triangle-exclamation text-warning me-2"></i>Alertas de inventario y taller</h6>
              <span className="small text-gray-500">Estado actual</span>
            </div>
            <div className="card-body">
              <div className="d-flex align-items-center justify-content-between mb-2">
                <span className="fw-bold small text-uppercase text-gray-600">Stock crítico (menos de 2 libres)</span>
                <span className={`badge rounded-pill ${alertas.stockCriticoTotal ? 'bg-danger' : 'bg-success'}`}>{alertas.stockCriticoTotal || 0}</span>
              </div>
              {alertas.stockCriticoTotal ? (
                <ul className="list-group list-group-flush mb-2">
                  {alertas.stockCritico.map(p => (
                    <li key={p.id} className="list-group-item px-0 d-flex justify-content-between align-items-center gap-2 bg-transparent">
                      <span className="small text-truncate"><span className="text-gray-500">{p.marca}</span> {p.nombre}</span>
                      <span className="text-nowrap small">
                        <span className={`badge ${p.venta === 0 ? 'bg-danger' : 'bg-warning text-dark'} me-1`}>Venta {p.venta}</span>
                        <span className={`badge ${p.arriendo === 0 ? 'bg-danger' : 'bg-warning text-dark'}`}>Arriendo {p.arriendo}</span>
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="small text-gray-500 mb-2"><i className="fas fa-circle-check text-success me-1"></i>Todos los productos activos tienen stock suficiente.</p>
              )}
              {alertas.stockCriticoTotal > (alertas.stockCritico?.length || 0) && (
                <p className="small text-gray-500 mb-2">y {alertas.stockCriticoTotal - alertas.stockCritico.length} más…</p>
              )}
              <button type="button" className="btn btn-link btn-sm p-0 mb-4 no-imprimir" onClick={() => setParams({ seccion: 'productos' })}>Ir a Productos →</button>

              <div className="d-flex align-items-center justify-content-between mb-2">
                <span className="fw-bold small text-uppercase text-gray-600">En mantención</span>
                <span className={`badge rounded-pill ${alertas.enMantencionTotal ? 'bg-warning text-dark' : 'bg-success'}`}>{alertas.enMantencionTotal || 0}</span>
              </div>
              {alertas.enMantencionTotal ? (
                <ul className="list-group list-group-flush mb-2">
                  {alertas.enMantencion.map(m => (
                    <li key={m.id} className="list-group-item px-0 bg-transparent">
                      <div className="d-flex justify-content-between gap-2">
                        <span className="small fw-semibold text-truncate">{m.producto}</span>
                        <span className="small text-gray-500 text-nowrap">{m.fecha}</span>
                      </div>
                      <div className="small text-gray-500 text-truncate">{m.falla} · stock de {m.tipoStock}</div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="small text-gray-500 mb-2"><i className="fas fa-circle-check text-success me-1"></i>No hay equipos en el taller.</p>
              )}
              {alertas.enMantencionTotal > (alertas.enMantencion?.length || 0) && (
                <p className="small text-gray-500 mb-2">y {alertas.enMantencionTotal - alertas.enMantencion.length} más…</p>
              )}
              <button type="button" className="btn btn-link btn-sm p-0 no-imprimir" onClick={() => setParams({ seccion: 'mantencion' })}>Ir a Mantención →</button>
            </div>
          </div>
        </div>
      </div>

      
      <div className="card shadow mb-4">
        <div className="card-header py-3">
          <h6 className="m-0 fw-bold text-primary"><i className="fas fa-users me-2"></i>Clientes frecuentes</h6>
        </div>
        <div className="card-body">
          {(reportData.topClientes || []).length === 0 ? (
            <SinDatos icono="fa-users" texto="Sin clientes con compras pagadas en este período." />
          ) : (
            <div className="table-responsive">
              <table className="table table-hover table-sm align-middle small mb-0">
                <thead>
                  <tr><th>Cliente</th><th className="text-center">Pedidos</th><th className="text-end">Monto total</th></tr>
                </thead>
                <tbody>
                  {reportData.topClientes.map((c) => (
                    <tr key={c.id}>
                      <td><div className="fw-semibold">{c.nombre}</div><div className="text-gray-500" style={{ fontSize: '.75rem' }}>{c.email}</div></td>
                      <td className="text-center fw-bold">{c.cantidadPedidos}</td>
                      <td className="text-end fw-bold">{pesos(c.totalGastado)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
