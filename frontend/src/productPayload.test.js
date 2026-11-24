import test from 'node:test'
import assert from 'node:assert/strict'
import { peticionProducto } from './productPayload.js'

test('editar conserva la imagen existente sin enviar su URL como archivo', () => {
  const request = peticionProducto({ nombre: 'Guitarra', foto: '/media/productos/guitarra.webp', stockTotal: 4, stockComprometidoVenta: 0 })
  const body = JSON.parse(request.body)
  assert.equal(body.nombre, 'Guitarra')
  assert.equal(body.stockTotal, 4)
  assert.equal(Object.hasOwn(body, 'foto'), false)
  assert.equal(Object.hasOwn(body, 'stockComprometidoVenta'), false)
})

test('envia la subcategoria, tambien vacia para poder quitarla', () => {
  assert.equal(JSON.parse(peticionProducto({ nombre: 'Bajo', subcategoria: 'Bajos' }).body).subcategoria, 'Bajos')
  assert.equal(JSON.parse(peticionProducto({ nombre: 'Bajo', subcategoria: '' }).body).subcategoria, '')
})

test('reemplazar foto envia multipart y deja que el navegador defina el boundary', () => {
  const archivo = new File(['imagen'], 'guitarra.webp', { type: 'image/webp' })
  const request = peticionProducto({ nombre: 'Guitarra', estado: false, fotoArchivo: archivo })
  assert.ok(request.body instanceof FormData)
  assert.equal(request.body.get('foto').name, 'guitarra.webp')
  assert.equal(request.body.get('estado'), 'false')
  assert.equal(request.headers, undefined)
})
