import { Link } from 'react-router-dom'

const categorias = [
  ['Pianos', 'pianos'],
  ['Teclados y sintetizadores', 'teclados-y-sintetizadores'],
  ['Guitarras y bajos', 'guitarras-y-bajos'],
  ['Guitarra electrica', 'guitarra-electrica'],
  ['Ukeleles', 'ukeleles'],
  ['Pedales y efectos', 'pedales-y-efectos'],
  ['Audio profesional', 'audio-profesional'],
  ['Micrófonos', 'microfonos'],
  ['Audífonos', 'audifonos'],
  ['Baterías y percusión', 'baterias-y-percusion'],
  ['Vientos y orquesta', 'vientos-y-orquesta'],
  ['Accesorios', 'accesorios'],
]

export function Footer() {
  return (
    <footer className="bg-dark text-white pt-4 pb-3 mt-auto border-top border-secondary">
      <div className="container-fluid px-4">
        <div className="row">
          <div className="col-md-3 mb-3">
            <h5 className="fw-bold text-uppercase border-bottom pb-2 d-inline-block">CONTACTO</h5>
            <ul className="list-unstyled small text-secondary mt-2">
              <li>• Dirección: Rodó 1969, Of. 101, Providencia</li>
              <li>• Teléfonos: (+56) 9 4458 1354</li>
              <li>• Correo: contacto@ejemplo.cl</li>
              <li>• Horario: Lunes - Viernes / 10:30 AM - 18:30 PM</li>
            </ul>
          </div>
          <div className="col-md-9">
            <h5 className="fw-bold text-uppercase mb-3">CATEGORÍAS</h5>
            <div className="row small text-secondary">
              {[0, 4, 8].map(inicio => (
                <div className="col-md-4" key={inicio}>
                  {categorias.slice(inicio, inicio + 4).map(([nombre, slug]) => (
                    <p className="mb-1" key={slug}>• <Link
                      to={`/categoria/${slug}`}
                      onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                      className="text-secondary text-decoration-none"
                    >{nombre}</Link></p>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}
