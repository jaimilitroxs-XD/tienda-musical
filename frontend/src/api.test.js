import test from 'node:test'
import assert from 'node:assert/strict'
import axios from 'axios'

test('las escrituras esperan el token CSRF aunque la pantalla ya se haya mostrado', async () => {
  const peticiones = []
  globalThis.document = { cookie: '' }
  globalThis.window = { fetch: async (url, opciones) => {
    assert.equal(opciones.headers.get('X-CSRFToken'), 'token-de-prueba')
    return { ok: true }
  } }
  axios.defaults.adapter = async config => {
    peticiones.push(config)
    if (config.url === '/api/csrf/') document.cookie = 'csrftoken=token-de-prueba'
    else assert.equal(config.headers['X-CSRFToken'], 'token-de-prueba')
    return { status: 200, data: {}, config, headers: {} }
  }
  const { prepararSesion } = await import('./api.js')
  await Promise.all([prepararSesion(), axios.post('/api/eventos/', {})])
  assert.equal(peticiones.filter(p => p.url === '/api/csrf/').length, 1)
  assert.equal(peticiones.filter(p => p.url === '/api/eventos/').length, 1)
  await window.fetch('/api/productos/', { method: 'POST' })
})
