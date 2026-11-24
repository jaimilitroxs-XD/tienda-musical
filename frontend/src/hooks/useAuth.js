import { useState, useEffect } from 'react'
import axios from 'axios'
import { leerCompartido } from '../consultas'


axios.defaults.withCredentials = true

export function useAuth() {
  
  const [usuario, setUsuario] = useState(() => {
    try {
      const guardado = localStorage.getItem('usuario_tienda')
      return guardado ? JSON.parse(guardado) : null
    } catch {
      return null
    }
  })
  
  const [cargandoAuth, setCargandoAuth] = useState(true)
  const [mostrarModalAuth, setMostrarModalAuth] = useState(false)
  const [pestanaInicial, setPestanaInicial] = useState('login')
  const [destinoLogin, setDestinoLogin] = useState(null)
  const [avisoVencimiento, setAvisoVencimiento] = useState(null)

  useEffect(() => {
    if (!usuario) { setAvisoVencimiento(null); return }
    
    const revisar = () => leerCompartido('/api/pedidos/', { mios: 1 }).then(({ data }) => {
      const hoy = new Date(); hoy.setHours(0, 0, 0, 0)
      const items = data.filter(p => ['Pendiente', 'Pagado', 'Completado'].includes(p.estado)).flatMap(p => p.items)
      const item = items.find(i => i.tipoOperacion === 'arriendo' && Math.ceil((new Date(i.fechaTermino + 'T00:00:00') - hoy) / 86400000) <= 2)
      setAvisoVencimiento(item ? { producto: item.nombre, fechaLimite: item.fechaTermino,
        dias: Math.ceil((new Date(item.fechaTermino + 'T00:00:00') - hoy) / 86400000) } : null)
    }).catch(() => {})
    revisar()
    const timer = setInterval(revisar, 60000)
    return () => clearInterval(timer)
  }, [usuario?.id])

  
  const normalizarUsuario = (datos) => {
    if (!datos) return null
    return {
      ...datos,
      es_admin: Boolean(datos.es_admin || datos.is_staff || datos.is_superuser),
      es_tecnico: Boolean(datos.es_tecnico || datos.is_tecnico)
    }
  }

  const guardarSesionUsuario = (datos) => {
    if (datos) {
      const uNormalizado = normalizarUsuario(datos)
      setUsuario(uNormalizado)
      localStorage.setItem('usuario_tienda', JSON.stringify(uNormalizado))
      return uNormalizado
    } else {
      setUsuario(null)
      localStorage.removeItem('usuario_tienda')
      return null
    }
  }

  useEffect(() => {
    obtenerPerfilActual()
  }, [])

  const obtenerPerfilActual = async () => {
    try {
      const usuarioLocal = JSON.parse(localStorage.getItem('usuario_tienda') || 'null')
      const url = usuarioLocal?.id 
        ? `/api/usuarios/me/?user_id=${usuarioLocal.id}`
        : '/api/usuarios/me/'

      const res = await leerCompartido(url)
      guardarSesionUsuario(res.data)
    } catch (err) {
      if (err.response && [401, 403, 404].includes(err.response.status)) {
        guardarSesionUsuario(null)
      }
    } finally {
      setCargandoAuth(false)
    }
  }

  const abrirAuthModal = (modo = 'login', destino = null) => {
    setPestanaInicial(modo)
    setDestinoLogin(destino)
    setMostrarModalAuth(true)
  }

  const iniciarSesion = async (email, pass) => {
    try {
      const res = await axios.post('/api/usuarios/login/', { email, pass })
      const uLogueado = res.data.usuario || res.data
      guardarSesionUsuario(uLogueado)
      setMostrarModalAuth(false)
      return { exito: true, usuario: res.data.usuario || res.data }
    } catch (err) {
      const msgError = err.response?.data?.error || 'Error al iniciar sesión.'
      return { exito: false, error: msgError }
    }
  }

  const registrarUsuario = async (datos) => {
    try {
      const res = await axios.post('/api/usuarios/registro/', {
        nombre: datos.nombre,
        email: datos.email,
        pass: datos.pass
      })
      const uNuevo = res.data.usuario || res.data
      guardarSesionUsuario(uNuevo)
      setMostrarModalAuth(false)
      return { exito: true, usuario: res.data.usuario || res.data }
    } catch (err) {
      const msgError = err.response?.data?.error || 'Error al registrar usuario.'
      return { exito: false, error: msgError }
    }
  }

  const actualizarPerfil = async (datosActualizados) => {
    try {
      const payload = { user_id: usuario?.id, ...datosActualizados }
      const res = await axios.put('/api/usuarios/me/', payload)

      if (res.data?.usuario) {
        guardarSesionUsuario(res.data.usuario)
      } else {
        await obtenerPerfilActual()
      }

      return { exito: true, mensaje: res.data?.mensaje || 'Perfil actualizado correctamente.' }
    } catch (err) {
      const msgError = err.response?.data?.error || 'Error al actualizar perfil.'
      return { exito: false, error: msgError }
    }
  }

  const cambiarPassword = async (passActual, nuevaPass) => {
    try {
      const res = await axios.post('/api/usuarios/cambiar-password/', {
        user_id: usuario?.id,
        pass_actual: passActual,
        nueva_password: nuevaPass
      })
      return { exito: true, mensaje: res.data?.mensaje || 'Contraseña actualizada correctamente.' }
    } catch (err) {
      const msgError = err.response?.data?.error || err.response?.data?.detail || 'No se pudo actualizar la contraseña.'
      return { exito: false, error: msgError }
    }
  }

  const cerrarSesion = async () => {
    try {
      await axios.post('/api/usuarios/logout/')
    } catch (err) {
      console.error("Error cerrando sesión:", err)
    } finally {
      guardarSesionUsuario(null)
    }
  }

  const desactivarCuenta = async () => {
    try {
      await axios.delete('/api/usuarios/me/', {
        data: { user_id: usuario?.id }
      })
      guardarSesionUsuario(null)
      return { exito: true }
    } catch (err) {
      return { exito: false, error: err.response?.data?.error || 'No se pudo desactivar la cuenta.' }
    }
  }

  const cerrarAvisoVencimiento = () => setAvisoVencimiento(null)

  return {
    usuario,
    cargandoAuth,
    estaLogueado: !!usuario,
    mostrarModalAuth,
    setMostrarModalAuth,
    pestanaInicial,
    destinoLogin,
    avisoVencimiento,
    abrirAuthModal,
    iniciarSesion,
    registrarUsuario,
    actualizarPerfil,
    cambiarPassword,
    cerrarSesion,
    desactivarCuenta,
    cerrarAvisoVencimiento
  }
}
