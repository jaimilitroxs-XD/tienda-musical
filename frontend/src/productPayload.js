export function peticionProducto(datos) {
  const campos = ['nombre', 'categoria', 'subcategoria', 'marca', 'descripcion', 'precioVenta',
    'precioArriendoDia', 'stockTotal', 'stockDisponibleVenta', 'stockDisponibleArriendo', 'estado']
  const valores = Object.fromEntries(campos.filter(campo => datos[campo] !== undefined)
    .map(campo => [campo, datos[campo] ?? '']))
  if (datos.fotoArchivo instanceof File) {
    const body = new FormData()
    Object.entries(valores).forEach(([campo, valor]) => body.append(campo, String(valor)))
    body.append('foto', datos.fotoArchivo)
    return { body }
  }
  return { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(valores) }
}
