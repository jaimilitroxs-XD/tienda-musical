import { forwardRef, useCallback, useEffect, useRef, useState } from 'react'
import DataTable, { Column } from 'datatables.net-react'
import BootstrapTable from 'datatables.net-bs5'
import axios from 'axios'
import 'datatables.net-bs5/css/dataTables.bootstrap5.css'
import './TablaGestion.css'

DataTable.use(BootstrapTable)

const idioma = {
  search: 'Buscar',
  searchPlaceholder: 'Escribe para buscar…',
  lengthMenu: 'Mostrar _MENU_ registros',
  info: 'Mostrando _START_ a _END_ de _TOTAL_ registros',
  infoEmpty: 'Sin registros para mostrar',
  infoFiltered: '',
  zeroRecords: 'No se encontraron registros con estos filtros.',
  emptyTable: 'No hay registros disponibles.',
  processing: 'Cargando registros…',
  loadingRecords: 'Cargando registros…',
  paginate: { first: 'Primera', previous: 'Anterior', next: 'Siguiente', last: 'Última' },
  aria: { orderable: 'Ordenar esta columna', orderableReverse: 'Invertir orden', orderableRemove: 'Quitar orden',
    paginate: { first: 'Primera', previous: 'Anterior', next: 'Siguiente', last: 'Última' } },
}

export const TablaGestion = forwardRef(function TablaGestion({ url, columnas, filtros = {}, evento, orden = [],
  local = false, filtrarLocal, textoBusqueda = 'Escribe para buscar…' }, ref) {
  const tabla = useRef(null)
  const solicitud = useRef(null)
  const filasLocales = useRef(null)
  const actuales = useRef({ url, filtros, columnas, local, filtrarLocal })
  actuales.current = { url, filtros, columnas, local, filtrarLocal }
  const [error, setError] = useState('')
  const claveFiltros = JSON.stringify(filtros)
  const filtrosAnteriores = useRef(claveFiltros)

  const cargar = useCallback(async (peticion, responder) => {
    solicitud.current?.abort()
    const controlador = new AbortController()
    solicitud.current = controlador
    const datos = actuales.current
    if (datos.local) {
      try {
        const { data } = await axios.get(datos.url, { signal: controlador.signal })
        if (controlador.signal.aborted) return
        filasLocales.current = data
        setError('')
        const vigente = actuales.current
        responder({ data: vigente.filtrarLocal ? vigente.filtrarLocal(data, vigente.filtros) : data })
      } catch (fallo) {
        if (controlador.signal.aborted) return
        filasLocales.current = []
        setError(fallo.response?.data?.detail || 'No se pudieron cargar los datos. Intenta nuevamente.')
        responder({ data: [] })
      }
      return
    }
    const tamano = peticion.length
    const params = { ...datos.filtros, page: Math.floor(peticion.start / tamano) + 1, page_size: tamano }
    Object.keys(params).forEach(campo => {
      if (params[campo] === '' || params[campo] === 'todos') delete params[campo]
    })
    if (peticion.search.value.trim()) params.q = peticion.search.value.trim()
    const criterio = peticion.order[0]
    if (criterio) {
      const campo = datos.columnas[criterio.column].campo
      params.ordering = `${criterio.dir === 'desc' ? '-' : ''}${campo}`
    }
    try {
      const { data } = await axios.get(datos.url, { params, signal: controlador.signal })
      if (controlador.signal.aborted) return
      setError('')
      responder({ draw: peticion.draw, recordsTotal: data.count, recordsFiltered: data.count, data: data.results })
      if (data.page < params.page) tabla.current?.dt()?.page(data.page - 1).draw('page')
    } catch (fallo) {
      if (controlador.signal.aborted) return
      setError(fallo.response?.data?.error || fallo.response?.data?.detail || 'No se pudieron cargar los datos. Intenta nuevamente.')
      responder({ draw: peticion.draw, recordsTotal: 0, recordsFiltered: 0, data: [] })
    }
  }, [])

  useEffect(() => {
    if (filtrosAnteriores.current === claveFiltros) return
    filtrosAnteriores.current = claveFiltros
    const dt = tabla.current?.dt()
    const datos = actuales.current
    if (datos.local) {
      if (filasLocales.current === null || !dt) return
      const filas = datos.filtrarLocal ? datos.filtrarLocal(filasLocales.current, datos.filtros) : filasLocales.current
      dt.clear().rows.add(filas).draw()
    } else dt?.ajax.reload(null, true)
  }, [claveFiltros])

  useEffect(() => {
    const recargar = () => tabla.current?.dt()?.ajax.reload(null, false)
    if (evento) window.addEventListener(evento, recargar)
    return () => {
      if (evento) window.removeEventListener(evento, recargar)
    }
  }, [evento])

  useEffect(() => () => solicitud.current?.abort(), [])

  const enlazarTabla = useCallback(instancia => {
    tabla.current = instancia
    if (typeof ref === 'function') ref(instancia)
    else if (ref) ref.current = instancia
  }, [ref])

  return <div className="tabla-gestion">
    {error && <div role="alert" className="alert alert-danger d-flex flex-wrap align-items-center gap-2">
      <span>{error}</span>
      <button className="btn btn-sm btn-outline-danger" onClick={() => tabla.current?.dt()?.ajax.reload()}>Reintentar</button>
    </div>}
    <DataTable ref={enlazarTabla} ajax={cargar} className="table table-hover align-middle w-100"
      options={{ serverSide: !local, processing: true, searchDelay: local ? 0 : 350, orderMulti: false,
        order: orden, pageLength: 10, lengthMenu: [10, 25, 50], scrollX: true,
        autoWidth: false, language: { ...idioma, searchPlaceholder: textoBusqueda } }}>
      {columnas.map((columna, indice) => <Column key={columna.campo} title={columna.titulo} data={null}
        options={{ name: columna.campo, orderable: columna.ordenable !== false,
          searchable: columna.campo !== 'acciones', className: columna.clase || '' }}>
        {(fila, tipo, registro) => {
          const columnaActual = actuales.current.columnas[indice]
          if (tipo === 'display') return columnaActual.mostrar(registro)
          return columnaActual.valor ? columnaActual.valor(registro) : registro[columnaActual.campo] ?? ''
        }}
      </Column>)}
    </DataTable>
  </div>
})
