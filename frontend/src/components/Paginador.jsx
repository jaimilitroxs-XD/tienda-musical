import React from 'react'


function numerosVisibles(actual, total) {
  const set = new Set([1, total, actual - 1, actual, actual + 1])
  const nums = [...set].filter(n => n >= 1 && n <= total).sort((a, b) => a - b)
  return nums.flatMap((n, i) => (i > 0 && n - nums[i - 1] > 1 ? ['…', n] : [n]))
}


export function Paginador({ pagina, paginas, total, tamano, onCambiar, etiqueta = 'resultados', className = '' }) {
  if (!total) return null
  const desde = (pagina - 1) * tamano + 1
  const hasta = Math.min(pagina * tamano, total)
  const ir = (n) => { if (n >= 1 && n <= paginas && n !== pagina) onCambiar(n) }

  return (
    <div className={`d-flex flex-wrap align-items-center justify-content-between gap-2 mt-3 ${className}`}>
      <span className="small text-muted">Mostrando {desde}–{hasta} de {total} {etiqueta}</span>
      {paginas > 1 && (
        <nav aria-label={`Páginas de ${etiqueta}`}>
          <ul className="pagination pagination-sm mb-0">
            <li className={`page-item${pagina === 1 ? ' disabled' : ''}`}>
              <button type="button" className="page-link" onClick={() => ir(pagina - 1)} aria-label="Página anterior">
                <i className="fa-solid fa-chevron-left"></i>
              </button>
            </li>
            {numerosVisibles(pagina, paginas).map((n, i) => n === '…' ? (
              <li key={`s${i}`} className="page-item disabled"><span className="page-link">…</span></li>
            ) : (
              <li key={n} className={`page-item${n === pagina ? ' active' : ''}`}>
                <button type="button" className="page-link" onClick={() => ir(n)} aria-current={n === pagina ? 'page' : undefined}>{n}</button>
              </li>
            ))}
            <li className={`page-item${pagina === paginas ? ' disabled' : ''}`}>
              <button type="button" className="page-link" onClick={() => ir(pagina + 1)} aria-label="Página siguiente">
                <i className="fa-solid fa-chevron-right"></i>
              </button>
            </li>
          </ul>
        </nav>
      )}
    </div>
  )
}
