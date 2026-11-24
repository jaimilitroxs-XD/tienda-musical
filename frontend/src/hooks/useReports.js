import { useState, useEffect } from 'react'

const API_URL = '/api/reportes/'

const EMPTY_REPORT = {
  ingresosVentas: 0, ingresosArriendos: 0, pedidosVentasCount: 0, pedidosArriendosCount: 0,
  topProductos: [], topClientes: [],
  serie: [], agrupacionSerie: 'dia', ingresosPorCategoria: [],
  alertas: { stockCriticoTotal: 0, stockCritico: [], enMantencionTotal: 0, enMantencion: [] },
}


const isoLocal = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`


export function fechasDeRango(rango, hoy = new Date()) {
  if (rango === '7d') {
    const inicio = new Date(hoy)
    inicio.setDate(hoy.getDate() - 6)
    return { inicio: isoLocal(inicio), fin: isoLocal(hoy) }
  }
  if (rango === 'mes') {
    return { inicio: isoLocal(new Date(hoy.getFullYear(), hoy.getMonth(), 1)), fin: isoLocal(hoy) }
  }
  return { inicio: '', fin: '' }
}

export function useReports() {
  const [reportData, setReportData] = useState(EMPTY_REPORT)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [fechaInicio, setFechaInicio] = useState('')
  const [fechaFin, setFechaFin] = useState('')
  const [rango, setRango] = useState('todo') 

  
  const fetchReports = async (inicio = fechaInicio, fin = fechaFin) => {
    try {
      setLoading(true)
      setError('')
      const filtros = new URLSearchParams()
      if (inicio) filtros.set('fecha_inicio', inicio)
      if (fin) filtros.set('fecha_fin', fin)
      const url = `${API_URL}?${filtros.toString()}`

      const res = await fetch(url)
      if (res.ok) {
        const data = await res.json()
        setReportData({ ...EMPTY_REPORT, ...data, alertas: { ...EMPTY_REPORT.alertas, ...data.alertas } })
      } else {
        const datos = await res.json()
        throw new Error(datos.error || 'No se pudo consultar el reporte.')
      }
    } catch (err) {
      console.error('Error al cargar reportes:', err)
      setReportData(EMPTY_REPORT)
      setError(err.message || 'No se pudo consultar el reporte.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchReports('', '')
  }, [])

  
  const aplicarRango = (nuevo) => {
    setRango(nuevo)
    if (nuevo === 'personalizado') return
    const { inicio, fin } = fechasDeRango(nuevo)
    setFechaInicio(inicio)
    setFechaFin(fin)
    fetchReports(inicio, fin)
  }

  const aplicarFiltroFechas = (e) => {
    e.preventDefault()
    setRango('personalizado')
    fetchReports(fechaInicio, fechaFin)
  }

  const limpiarFiltros = () => {
    setFechaInicio('')
    setFechaFin('')
    setRango('todo')
    fetchReports('', '')
  }

  return {
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
  }
}
