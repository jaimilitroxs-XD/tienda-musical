

export const TIPOS_EVENTO = {
  descuento: { etiqueta: 'Descuento directo', corta: 'Descuento', icono: 'fa-percent', color: '#e83e8c' },
  pack_arriendo: { etiqueta: 'Pack de arriendo', corta: 'Pack arriendo', icono: 'fa-boxes-stacked', color: '#36b9cc' },
  preventa: { etiqueta: 'Lanzamiento / Preventa', corta: 'Preventa', icono: 'fa-rocket', color: '#f6c23e' },
  outlet: { etiqueta: 'Liquidación / Outlet ex-arriendo', corta: 'Outlet', icono: 'fa-tags', color: '#fd7e14' },
  en_vivo: { etiqueta: 'DJs y músicos en vivo', corta: 'En vivo', icono: 'fa-microphone-lines', color: '#1cc88a' },
}


export const ESTADOS_EVENTO = {
  activo: { etiqueta: 'Activo', fondo: '#1cc88a', texto: '#fff' },
  programado: { etiqueta: 'Programado', fondo: '#36b9cc', texto: '#fff' },
  finalizado: { etiqueta: 'Finalizado', fondo: '#858796', texto: '#fff' },
  desactivado: { etiqueta: 'Desactivado', fondo: '#f6c23e', texto: '#212529' },
}

export const CONDICIONES_OUTLET = {
  como_nuevo: 'Como nuevo',
  buen_estado: 'Buen estado',
  con_detalles: 'Con detalles estéticos',
}

export const pesos = (n) => `$${Math.round(Number(n) || 0).toLocaleString('es-CL')}`

export const fechaHora = (iso, opciones = {}) => (iso
  ? new Date(iso).toLocaleString('es-CL', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', ...opciones })
  : '')

export const fechaCorta = (iso) => (iso ? new Date(iso).toLocaleDateString('es-CL', { day: 'numeric', month: 'short', year: 'numeric' }) : '')


export const fechaDia = (texto) => {
  if (!texto) return ''
  const [y, m, d] = texto.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('es-CL', { day: 'numeric', month: 'long', year: 'numeric' })
}


export function beneficioEvento(e) {
  switch (e.tipo_evento) {
    case 'descuento':
    case 'outlet':
      return `${Number(e.porcentaje_descuento)}% de descuento`
    case 'preventa':
      return Number(e.porcentaje_descuento) > 0
        ? `${Number(e.porcentaje_descuento)}% en preventa`
        : `Disponible desde ${fechaDia(e.fecha_disponibilidad)}`
    case 'pack_arriendo':
      return `Pack a ${pesos(e.precio_pack_arriendo)} / día`
    case 'en_vivo':
      return e.artista_invitado ? `Con ${e.artista_invitado}` : 'Evento en vivo'
    default:
      return ''
  }
}


export function prorratearPack(precioPack, productos) {
  const ordenados = [...productos].sort((a, b) => a.id - b.id)
  const pack = Math.trunc(Number(precioPack))
  const bases = ordenados.map(p => Math.trunc(Number(p.precioArriendoDia)))
  const total = bases.reduce((s, b) => s + b, 0)
  const precios = {}
  let asignado = 0
  ordenados.forEach((p, i) => {
    const parte = i === ordenados.length - 1
      ? pack - asignado
      : (total ? Math.floor((pack * bases[i]) / total) : Math.floor(pack / ordenados.length))
    precios[p.id] = parte
    asignado += parte
  })
  return precios
}
