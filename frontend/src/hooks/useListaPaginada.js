import { useCallback, useEffect, useRef, useState } from 'react'
import { leerCompartido } from '../consultas'


export function limpiarFiltros(filtros = {}) {
  return Object.fromEntries(Object.entries(filtros).filter(([, v]) => v !== '' && v !== null && v !== undefined && v !== 'todos'))
}


export function leerPagina(data) {
  if (Array.isArray(data)) return { items: data, total: data.length, pagina: 1, paginas: 1 }
  return { items: data?.results || [], total: data?.count || 0, pagina: data?.page || 1, paginas: data?.pages || 1 }
}


export function useListaPaginada(url, { pagina = 1, tamano = 10, filtros = {}, evento } = {}) {
  const [estado, setEstado] = useState({ items: [], total: 0, pagina: 1, paginas: 1 })
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')
  const ultimaPeticion = useRef(0)
  const clave = JSON.stringify(limpiarFiltros(filtros))

  const recargar = useCallback(async () => {
    const id = ++ultimaPeticion.current
    setCargando(true)
    try {
      const { data } = await leerCompartido(url, { ...JSON.parse(clave), page: pagina, page_size: tamano })
      if (id !== ultimaPeticion.current) return
      setEstado(leerPagina(data))
      setError('')
    } catch (e) {
      if (id !== ultimaPeticion.current) return
      setError(e.response?.data?.error || e.response?.data?.detail || 'No se pudo cargar la información. Comprueba que Django esté iniciado.')
    } finally {
      if (id === ultimaPeticion.current) setCargando(false)
    }
  }, [url, pagina, tamano, clave])

  useEffect(() => {
    recargar()
    return () => { ultimaPeticion.current++ }
  }, [recargar])

  
  useEffect(() => {
    if (!evento) return
    window.addEventListener(evento, recargar)
    return () => window.removeEventListener(evento, recargar)
  }, [evento, recargar])

  return { ...estado, cargando, error, recargar }
}
