


export const SUBCATEGORIAS = {
  'Guitarras y bajos': ['Guitarras acústicas', 'Bajos'],
  'Teclados y sintetizadores': ['Teclados', 'Sintetizadores'],
  'Pedales y efectos': ['Pedales', 'Efectos'],
  'Baterías y percusión': ['Baterías', 'Percusión'],
  'Vientos y orquesta': ['Vientos', 'Orquesta'],
}


const normalizar = (t) => String(t || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim()
export function subcategoriasDe(categoria) {
  const clave = Object.keys(SUBCATEGORIAS).find(c => normalizar(c) === normalizar(categoria))
  return clave ? SUBCATEGORIAS[clave] : []
}
