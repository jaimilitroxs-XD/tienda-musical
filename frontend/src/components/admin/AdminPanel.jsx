import React, { Suspense, lazy } from 'react'
import { useSearchParams } from 'react-router-dom'
import { ProductManagement } from '../technician/ProductManagement'
import { OrderManagement } from './OrderManagement'

const EventsManagement = lazy(() => import('./EventsManagement').then(m => ({ default: m.EventsManagement })))
import { UserManagement } from './UserManagement'

const ReportsManagement = lazy(() => import('./ReportsManagement').then(m => ({ default: m.ReportsManagement })))
import { MaintenanceManagement } from '../technician/MaintenanceManagement'
import { UserProfile } from './UserProfile'
import { DashboardLayout } from '../dashboard/DashboardLayout'
import { AccesoDenegado } from '../dashboard/AccesoDenegado'

export function AdminPanel({ usuario, volverAlCatalogo, onCerrarSesion, modoOscuro, setModoOscuro, aviso, ...perfilProps }) {
  const [params, setParams] = useSearchParams()

  
  const superadmin = !!usuario?.es_superadmin
  const gestion = !!usuario?.es_admin                       
  const tecnicoExclusivo = !!usuario?.es_tecnico && !gestion
  
  const mantencionSoloLectura = gestion && !superadmin && !usuario?.es_tecnico

  if (!usuario || (!gestion && !usuario?.es_tecnico)) {
    return <AccesoDenegado mensaje="No tienes permisos para acceder al panel de gestión." volverAlCatalogo={volverAlCatalogo} />
  }

  const opciones = [
    { id: 'productos', titulo: 'Productos', icono: 'fa-guitar', grupo: 'Inventario', permitido: true },
    { id: 'mantencion', titulo: 'Mantención', icono: 'fa-screwdriver-wrench', grupo: 'Inventario', permitido: true },
    { id: 'pedidos', titulo: 'Pedidos', icono: 'fa-receipt', grupo: 'Comercial', permitido: gestion },
    { id: 'eventos', titulo: 'Eventos', icono: 'fa-bullhorn', grupo: 'Comercial', permitido: gestion },
    { id: 'reportes', titulo: 'Reportes', icono: 'fa-chart-area', grupo: 'Comercial', permitido: gestion },
    { id: 'usuarios', titulo: 'Usuarios', icono: 'fa-users', grupo: 'Administración', permitido: superadmin },
    { id: 'perfil', titulo: 'Mi perfil', icono: 'fa-user', grupo: 'Cuenta', permitido: true },
  ].filter(op => op.permitido)

  const porDefecto = tecnicoExclusivo ? 'mantencion' : 'productos'
  const pedida = params.get('seccion') || porDefecto
  const activa = opciones.some(op => op.id === pedida) ? pedida : porDefecto
  const seleccionar = (id) => setParams(id === porDefecto ? {} : { seccion: id })

  const titulos = {
    productos: 'Gestión de productos',
    mantencion: 'Taller y mantenciones',
    pedidos: 'Gestión de pedidos',
    eventos: 'Eventos y promociones',
    reportes: 'Reportes y métricas',
    usuarios: 'Gestión de usuarios',
    perfil: 'Mi perfil',
  }

  const contenido = (
    <>
      {activa === 'productos' && <ProductManagement usuario={usuario} />}
      {activa === 'mantencion' && <MaintenanceManagement soloLectura={mantencionSoloLectura} />}
      {activa === 'pedidos' && gestion && <OrderManagement />}
      {activa === 'eventos' && gestion && (
        <Suspense fallback={<p role="status" className="text-gray-600">Cargando eventos...</p>}>
          <EventsManagement />
        </Suspense>
      )}
      {activa === 'reportes' && gestion && (
        <Suspense fallback={<p role="status" className="text-gray-600">Cargando reportes...</p>}>
          <ReportsManagement />
        </Suspense>
      )}
      {activa === 'usuarios' && superadmin && <UserManagement usuario={usuario} />}
      {activa === 'perfil' && <UserProfile usuario={usuario} volverAlCatalogo={volverAlCatalogo} onCerrarSesion={onCerrarSesion} {...perfilProps} />}
    </>
  )

  return (
    <DashboardLayout
      usuario={usuario}
      rolEtiqueta={superadmin ? 'Superadministrador' : gestion ? 'Vendedor' : 'Técnico'}
      titulo={titulos[activa]}
      opciones={opciones}
      activa={activa}
      onSeleccionar={seleccionar}
      onVolverAlCatalogo={volverAlCatalogo}
      onCerrarSesion={onCerrarSesion}
      modoOscuro={modoOscuro}
      setModoOscuro={setModoOscuro}
      aviso={aviso}
    >
      
      {activa === 'reportes' || activa === 'eventos' ? contenido : (
        <div className="card shadow mb-4">
          <div className="card-body">{contenido}</div>
        </div>
      )}
    </DashboardLayout>
  )
}
