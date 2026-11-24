import axios from 'axios'

const pendientes = new Map()

export const invalidarLecturas = () => pendientes.clear()

export function leerCompartido(url, params = {}) {
  const clave = JSON.stringify([url, Object.entries(params).sort(([a], [b]) => a.localeCompare(b))])
  if (!pendientes.has(clave)) {
    const peticion = axios.get(url, { params }).finally(() => {
      if (pendientes.get(clave) === peticion) pendientes.delete(clave)
    })
    pendientes.set(clave, peticion)
  }
  return pendientes.get(clave)
}
