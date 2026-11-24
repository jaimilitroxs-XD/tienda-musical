import { useRef, useState } from 'react'
import axios from 'axios'

import { TablaGestion } from '../TablaGestion'

const filtrarUsuarios = (usuarios, filtros) => usuarios.filter(u =>
  (filtros.rol === 'todos' || u.rol === filtros.rol) &&
  (filtros.estado === 'todos' || u.activo === (filtros.estado === 'activos'))
)

export function UserManagement({ usuario }) {
  const [rol, setRol] = useState('todos')
  const [estadoCuenta, setEstadoCuenta] = useState('todos')
  const [form, setForm] = useState(null)
  const [error, setError] = useState('')
  const [errorForm, setErrorForm] = useState('')
  const [guardando, setGuardando] = useState(false)
  const tabla = useRef(null)
  const cargar = () => tabla.current?.dt()?.ajax.reload(null, false)

  const abrir = (user = {}) => { setErrorForm(''); setForm({ nombre: '', email: '', telefono: '', rol: 'Cliente', ...user, pass: '' }) }
  const guardar = async e => {
    e.preventDefault()
    if (guardando) return
    setGuardando(true); setErrorForm('')
    try {
      if (form.id) await axios.patch(`/api/usuarios/${form.id}/`, form)
      else await axios.post('/api/usuarios/crear/', form)
      setForm(null); await cargar()
    } catch (e) { setErrorForm(e.response?.data?.error || e.response?.data?.detail || 'No se pudo guardar el usuario.') }
    finally { setGuardando(false) }
  }
  const cambiarEstado = async user => {
    if (!window.confirm(`¿${user.activo ? 'Desactivar' : 'Activar'} la cuenta de ${user.nombre}?`)) return
    try { await axios.patch(`/api/usuarios/${user.id}/`, { activo: !user.activo }); await cargar() }
    catch (e) { setError(e.response?.data?.error || 'No se pudo cambiar el estado.') }
  }
  const eliminar = async user => {
    if (!window.confirm(`¿Eliminar definitivamente la cuenta de ${user.nombre}? Si tiene pedidos, deberás desactivarla para conservar el historial.`)) return
    try { await axios.delete(`/api/usuarios/${user.id}/`); await cargar() }
    catch (e) { setError(e.response?.data?.error || 'No se pudo eliminar la cuenta.') }
  }
  const celdasUsuario = (u) => {
    return [
      <>
{u.nombre}
      </>,
      <>
{u.email}
      </>,
      <>
{u.rol}
      </>,
      <>
{u.activo ? 'Activo' : 'Inactivo'}
      </>,
      <>
<div className="d-flex flex-wrap gap-2"><button className="btn btn-sm btn-outline-dark" onClick={() => abrir(u)}>Editar</button>
          <button className="btn btn-sm btn-outline-secondary" disabled={u.id === usuario.id} onClick={() => cambiarEstado(u)}>{u.activo ? 'Desactivar' : 'Activar'}</button>
          <button className="btn btn-sm btn-outline-danger" disabled={u.id === usuario.id} onClick={() => eliminar(u)}>Eliminar</button></div>
      </>
    ]
  }

  const columnas = [
    { titulo: 'Nombre', campo: 'nombre', mostrar: u => celdasUsuario(u)[0] },
    { titulo: 'Correo', campo: 'email', mostrar: u => celdasUsuario(u)[1] },
    { titulo: 'Rol', campo: 'rol', mostrar: u => celdasUsuario(u)[2] },
    { titulo: 'Estado', campo: 'activo', valor: u => u.activo ? 'Activo' : 'Inactivo', mostrar: u => celdasUsuario(u)[3] },
    { titulo: 'Acciones', campo: 'acciones', ordenable: false, mostrar: u => celdasUsuario(u)[4] }
  ]

  return <div>
    <div className="d-flex flex-wrap gap-3 align-items-center justify-content-between mb-3">
      <div><h4>Usuarios</h4><p className="text-muted mb-0">Cuentas y permisos de acceso.</p></div>
      <div className="d-flex flex-wrap gap-2">
        <button className="btn btn-outline-secondary rounded-pill" onClick={cargar}>Actualizar</button>
        <button className="btn btn-primary rounded-pill" onClick={() => abrir()}>Crear usuario</button>
      </div>
    </div>
    {error && <div role="alert" className="alert alert-danger">{error}</div>}
    <div className="row g-2 mb-3">
      <div className="col-12 col-sm-6"><label htmlFor="filtro-rol" className="form-label">Rol</label><select id="filtro-rol" aria-label="Filtrar usuarios por rol" className="form-select" value={rol} onChange={e => setRol(e.target.value)}>
        <option value="todos">Todos los roles</option>{['Superadmin', 'Vendedor', 'Tecnico', 'Cliente'].map(r => <option key={r} value={r}>{r === 'Tecnico' ? 'Técnico' : r}</option>)}
      </select></div>
      <div className="col-12 col-sm-6"><label htmlFor="filtro-estado-cuenta" className="form-label">Estado de la cuenta</label><select id="filtro-estado-cuenta" aria-label="Filtrar usuarios por estado" className="form-select" value={estadoCuenta} onChange={e => setEstadoCuenta(e.target.value)}>
        <option value="todos">Activos e inactivos</option><option value="activos">Solo activos</option><option value="inactivos">Solo inactivos</option>
      </select></div>
    </div>
    <TablaGestion ref={tabla} url="/api/usuarios/" columnas={columnas}
      local filtrarLocal={filtrarUsuarios} textoBusqueda="Nombre, correo, rol o estado…"
      filtros={{ rol, estado: estadoCuenta }} />
    {form && <div className="modal show d-block" role="dialog" aria-modal="true" aria-labelledby="titulo-usuario" style={{ backgroundColor: 'rgba(0,0,0,.6)', zIndex: 1080 }}>
      <div className="modal-dialog modal-dialog-centered modal-dialog-scrollable"><form className="modal-content" onSubmit={guardar}>
        <div className="modal-header"><h5 id="titulo-usuario" className="modal-title">{form.id ? 'Editar usuario' : 'Crear usuario'}</h5><button type="button" aria-label="Cerrar" disabled={guardando} className="btn-close" onClick={() => setForm(null)} /></div>
        <div className="modal-body">
          {errorForm && <p role="alert" className="alert alert-danger">{errorForm}</p>}
          {[['nombre', 'Nombre', 'text'], ['email', 'Correo', 'email'], ['telefono', 'Teléfono', 'tel'], ['pass', form.id ? 'Nueva contraseña (opcional)' : 'Contraseña', 'password']].map(([campo, label, tipo]) => <div className="mb-3" key={campo}>
            <label htmlFor={`usuario-${campo}`} className="form-label">{label}</label><input id={`usuario-${campo}`} type={tipo} className="form-control" disabled={guardando} required={campo !== 'telefono' && !(campo === 'pass' && form.id)} minLength={campo === 'pass' ? 8 : undefined} value={form[campo] || ''} onChange={e => setForm({ ...form, [campo]: e.target.value })} autoComplete={campo === 'pass' ? 'new-password' : undefined} />
          </div>)}
          <label htmlFor="usuario-rol" className="form-label">Rol</label><select id="usuario-rol" className="form-select" value={form.rol} disabled={guardando || form.id === usuario.id} onChange={e => setForm({ ...form, rol: e.target.value })}>
            <option value="Cliente">Cliente</option><option value="Vendedor">Vendedor</option><option value="Tecnico">Técnico</option><option value="Superadmin">Superadministrador</option>
          </select><p className="small text-muted mt-2">La contraseña debe incluir 8 caracteres, un número y un símbolo.</p>
        </div>
        <div className="modal-footer"><button type="button" className="btn btn-outline-secondary" disabled={guardando} onClick={() => setForm(null)}>Cancelar</button><button className="btn btn-primary" disabled={guardando}>{guardando ? 'Guardando...' : 'Guardar'}</button></div>
      </form></div>
    </div>}
  </div>
}
