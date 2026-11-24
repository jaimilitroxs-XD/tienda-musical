import axios from 'axios'
import { invalidarLecturas } from './consultas.js'

const csrf = () => document.cookie.split('; ').find(c => c.startsWith('csrftoken='))?.split('=')[1]
axios.defaults.withCredentials = true
axios.interceptors.request.use(async config => {
  if (!/^(get|head|options)$/i.test(config.method || 'get')) {
    if (!csrf()) await prepararSesion()
    if (!config.headers['X-CSRFToken']) config.headers['X-CSRFToken'] = csrf()
  }
  return config
})
axios.interceptors.response.use(respuesta => {
  if (!/^(get|head|options)$/i.test(respuesta.config.method || 'get')) invalidarLecturas()
  return respuesta
})

const originalFetch = window.fetch.bind(window)
window.fetch = async (input, options = {}) => {
  if (typeof input === 'string' && input.startsWith('/api/')) {
    const headers = new Headers(options.headers)
    const modifica = !/^(GET|HEAD|OPTIONS)$/i.test(options.method || 'GET')
    if (modifica) {
      if (!csrf()) await prepararSesion()
      headers.set('X-CSRFToken', csrf() || '')
    }
    const respuesta = await originalFetch(input, { ...options, headers, credentials: 'same-origin' })
    if (modifica && respuesta.ok) invalidarLecturas()
    return respuesta
  }
  return originalFetch(input, options)
}

let preparandoSesion
export const prepararSesion = () => {
  if (!preparandoSesion) preparandoSesion = axios.get('/api/csrf/').finally(() => { preparandoSesion = null })
  return preparandoSesion
}
