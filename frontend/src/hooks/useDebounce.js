import { useEffect, useState } from 'react'


export function useDebounce(valor, espera = 350) {
  const [retrasado, setRetrasado] = useState(valor)
  useEffect(() => {
    const t = setTimeout(() => setRetrasado(valor), espera)
    return () => clearTimeout(t)
  }, [valor, espera])
  return retrasado
}
