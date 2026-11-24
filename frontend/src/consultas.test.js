import test from 'node:test'
import assert from 'node:assert/strict'
import axios from 'axios'
import { invalidarLecturas, leerCompartido } from './consultas.js'

test('comparte lecturas simultáneas sin conservar datos al terminar', async () => {
  const original = axios.get
  let llamadas = 0
  axios.get = async () => { llamadas++; return { data: [] } }
  try {
    invalidarLecturas()
    const a = leerCompartido('/api/productos/', { page: 1, page_size: 6 })
    const b = leerCompartido('/api/productos/', { page_size: 6, page: 1 })
    assert.equal(a, b)
    await Promise.all([a, b])
    assert.equal(llamadas, 1)
    await leerCompartido('/api/productos/', { page: 1, page_size: 6 })
    assert.equal(llamadas, 2)
  } finally { axios.get = original; invalidarLecturas() }
})

test('invalidar evita reutilizar una lectura anterior a un cambio', async () => {
  const original = axios.get
  let llamadas = 0
  const resolver = []
  axios.get = () => { llamadas++; return new Promise(r => resolver.push(r)) }
  try {
    invalidarLecturas()
    const anterior = leerCompartido('/api/pedidos/')
    invalidarLecturas()
    const nueva = leerCompartido('/api/pedidos/')
    resolver[0]({ data: ['antes'] })
    await anterior
    assert.equal(leerCompartido('/api/pedidos/'), nueva)
    resolver[1]({ data: ['después'] })
    assert.deepEqual((await nueva).data, ['después'])
    assert.equal(llamadas, 2)
  } finally { axios.get = original; invalidarLecturas() }
})
