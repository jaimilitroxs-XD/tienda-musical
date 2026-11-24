import React from 'react'
import { useSearchParams } from 'react-router-dom'
import { OrderHistory } from './OrderHistory'
import { UserProfile } from './UserProfile'
import { DashboardLayout } from '../dashboard/DashboardLayout'
import { AccesoDenegado } from '../dashboard/AccesoDenegado'



export function ClientArea({
  usuario, pedidos, verComprobante, volverAlCatalogo, onCerrarSesion, onIniciarSesion,
  modoOscuro, setModoOscuro, aviso, ...perfilProps
}) {
  const [params, setParams] = useSearchParams()

  if (!usuario) {
    return <AccesoDenegado mensaje="Inicia sesión para ver tus pedidos y tu perfil." volverAlCatalogo={volverAlCatalogo} onIniciarSesion={onIniciarSesion} />
  }

  const opciones = [
    { id: 'pedidos', titulo: 'Mis pedidos', icono: 'fa-receipt', grupo: 'Mi cuenta' },
    { id: 'perfil', titulo: 'Mi perfil', icono: 'fa-user', grupo: 'Mi cuenta' },
  ]
  const activa = params.get('seccion') === 'perfil' ? 'perfil' : 'pedidos'
  const seleccionar = (id) => setParams(id === 'pedidos' ? {} : { seccion: id })

  return (
    <DashboardLayout
      usuario={usuario}
      rolEtiqueta="Cliente"
      titulo={activa === 'perfil' ? 'Mi perfil' : 'Mis pedidos'}
      opciones={opciones}
      activa={activa}
      onSeleccionar={seleccionar}
      onVolverAlCatalogo={volverAlCatalogo}
      onCerrarSesion={onCerrarSesion}
      modoOscuro={modoOscuro}
      setModoOscuro={setModoOscuro}
      aviso={aviso}
    >
      <div className="card shadow mb-4">
        <div className="card-body">
          {activa === 'pedidos' ? (
            <OrderHistory pedidos={pedidos} verComprobante={verComprobante} volverAlCatalogo={volverAlCatalogo} />
          ) : (
            <UserProfile
              usuario={usuario}
              volverAlCatalogo={volverAlCatalogo}
              onCerrarSesion={onCerrarSesion}
              onIrAlHistorial={() => seleccionar('pedidos')}
              {...perfilProps}
            />
          )}
        </div>
      </div>
    </DashboardLayout>
  )
}
