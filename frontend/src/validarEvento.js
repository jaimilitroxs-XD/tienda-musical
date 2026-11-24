export const diaEnChile = (fecha = new Date()) => new Intl.DateTimeFormat('en-CA', {
  timeZone: 'America/Santiago', year: 'numeric', month: '2-digit', day: '2-digit',
}).format(fecha)

export function validarEvento(f, inicial = {}, ahora = new Date()) {
  const errores = {}
  const hoy = diaEnChile(ahora)
  const inicio = new Date(f.fecha_inicio)
  const fin = new Date(f.fecha_fin)
  const cambiaInicio = !f.id || f.fecha_inicio !== inicial.fecha_inicio
  const cambiaFin = !f.id || f.fecha_fin !== inicial.fecha_fin
  const tipo = f.tipo_evento
  const productos = f.productos || []
  const porcentaje = Number(f.porcentaje_descuento || 0)

  if (f.titulo.trim().length < 3 || f.titulo.trim().length > 150) errores.titulo = 'El título debe tener entre 3 y 150 caracteres.'
  if (!f.fecha_inicio || !Number.isFinite(inicio.getTime())) errores.fecha_inicio = 'Indica una fecha de inicio válida.'
  else if (cambiaInicio && diaEnChile(inicio) < hoy) errores.fecha_inicio = 'El evento no puede comenzar antes de hoy.'
  if (!f.fecha_fin || !Number.isFinite(fin.getTime())) errores.fecha_fin = 'Indica una fecha de término válida.'
  else if (fin <= inicio) errores.fecha_fin = 'La fecha de término debe ser posterior al inicio.'
  else if ((cambiaInicio || cambiaFin) && fin <= ahora) errores.fecha_fin = 'La fecha de término debe estar en el futuro.'

  if (['descuento', 'outlet', 'preventa'].includes(tipo)) {
    if (!Number.isFinite(porcentaje) || porcentaje < 0 || porcentaje > 90 || (tipo !== 'preventa' && porcentaje === 0)) {
      errores.porcentaje_descuento = tipo === 'preventa' ? 'El descuento debe estar entre 0 y 90%.' : 'El descuento debe ser mayor a 0 y no superar el 90%.'
    }
  }
  if (['descuento', 'outlet', 'preventa', 'pack_arriendo'].includes(tipo) && !productos.length) errores.productos_asociados = 'Selecciona los productos del evento.'
  if (tipo === 'pack_arriendo') {
    const precio = Number(f.precio_pack_arriendo)
    if (productos.length < 2) errores.productos_asociados = 'Un pack necesita al menos 2 productos.'
    else if (productos.some(p => Number(p.precioArriendoDia) <= 0)) errores.productos_asociados = 'Todos los productos del pack deben tener precio de arriendo.'
    if (!Number.isFinite(precio) || precio <= 0 || precio > 99999999.99) errores.precio_pack_arriendo = 'El precio debe ser mayor a 0 y no superar $99.999.999,99.'
    else if (productos.length >= 2 && precio >= productos.reduce((s, p) => s + Number(p.precioArriendoDia), 0)) errores.precio_pack_arriendo = 'El pack debe costar menos que arrendar los productos por separado.'
  }
  if (tipo === 'preventa') {
    const disponible = f.fecha_disponibilidad
    if (!disponible) errores.fecha_disponibilidad = 'Indica desde cuándo estará disponible.'
    else if ((!f.id || disponible !== inicial.fecha_disponibilidad) && disponible < hoy) errores.fecha_disponibilidad = 'La disponibilidad no puede ser anterior a hoy.'
    else if (Number.isFinite(inicio.getTime()) && disponible < diaEnChile(inicio)) errores.fecha_disponibilidad = 'La disponibilidad no puede ser anterior al inicio de la preventa.'
  }
  if (tipo === 'en_vivo') {
    if (!f.artista_invitado.trim()) errores.artista_invitado = 'Indica el artista o DJ invitado.'
    if (!f.lugar_o_link.trim()) errores.lugar_o_link = 'Indica el lugar o el link de la transmisión.'
  }
  return errores
}
