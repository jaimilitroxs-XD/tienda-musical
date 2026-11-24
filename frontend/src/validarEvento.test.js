import test from 'node:test'
import assert from 'node:assert/strict'
import { diaEnChile, validarEvento } from './validarEvento.js'

const ahora = new Date('2026-11-24T15:00:00Z')
const base = {
  titulo: 'Concierto', tipo_evento: 'en_vivo', fecha_inicio: '2026-11-24T15:00:00Z',
  fecha_fin: '2026-11-25T15:00:00Z', artista_invitado: 'Juan', lugar_o_link: 'Sala 1', productos: [],
}
const validar = f => validarEvento({ ...base, ...f }, {}, ahora)

test('usa el día chileno incluso después de medianoche UTC', () => {
  assert.equal(diaEnChile(new Date('2026-11-25T01:00:00Z')), '2026-11-24')
  assert.deepEqual(validar({}), {})
  assert.ok(validar({ fecha_inicio: '2026-11-23T15:00:00Z' }).fecha_inicio)
  assert.ok(validar({ fecha_fin: base.fecha_inicio }).fecha_fin)
})

test('no bloquea la edición de la fecha original de un evento iniciado', () => {
  const anterior = { ...base, id: 1, fecha_inicio: '2026-11-20T15:00:00Z' }
  assert.deepEqual(validarEvento({ ...anterior, titulo: 'Otro título' }, anterior, ahora), {})
  assert.ok(validarEvento({ ...anterior, fecha_inicio: '2026-11-19T15:00:00Z' }, anterior, ahora).fecha_inicio)
})

test('valida precio, productos y descuentos antes de enviar', () => {
  const pack = { tipo_evento: 'pack_arriendo', productos: [{ id: 1, precioArriendoDia: 100 }, { id: 2, precioArriendoDia: 200 }] }
  for (const precio of ['-10', '0', 'NaN', 'Infinity', '300']) assert.ok(validar({ ...pack, precio_pack_arriendo: precio }).precio_pack_arriendo)
  assert.deepEqual(validar({ ...pack, precio_pack_arriendo: '250' }), {})
  assert.ok(validar({ tipo_evento: 'descuento', porcentaje_descuento: '91', productos: [{}] }).porcentaje_descuento)
  assert.ok(validar({ titulo: '  ' }).titulo)
  assert.ok(validar({ artista_invitado: '  ' }).artista_invitado)
})

test('la disponibilidad no puede preceder al inicio de la preventa', () => {
  const errores = validar({ tipo_evento: 'preventa', fecha_inicio: '2026-11-25T15:00:00Z',
    fecha_fin: '2026-11-28T15:00:00Z', fecha_disponibilidad: '2026-11-24', productos: [{}] })
  assert.ok(errores.fecha_disponibilidad)
})
