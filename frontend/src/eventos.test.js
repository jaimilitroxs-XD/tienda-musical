import test from 'node:test'
import assert from 'node:assert/strict'
import { prorratearPack, beneficioEvento } from './eventos.js'

test('prorratearPack reparte en enteros igual que el backend (precios.py)', () => {
  
  const reparto = prorratearPack('33333.00', [
    { id: 2, precioArriendoDia: '20000.00' },
    { id: 1, precioArriendoDia: '10000.00' },
    { id: 3, precioArriendoDia: '5000.00' },
  ])
  assert.deepEqual(reparto, { 1: 9523, 2: 19047, 3: 4763 })
  assert.equal(Object.values(reparto).reduce((s, v) => s + v, 0), 33333)
})

test('beneficioEvento describe cada tipo', () => {
  assert.equal(beneficioEvento({ tipo_evento: 'descuento', porcentaje_descuento: '20.00' }), '20% de descuento')
  assert.equal(beneficioEvento({ tipo_evento: 'pack_arriendo', precio_pack_arriendo: '24000.00' }), 'Pack a $24.000 / día')
  assert.equal(beneficioEvento({ tipo_evento: 'en_vivo', artista_invitado: 'DJ Nova' }), 'Con DJ Nova')
})
