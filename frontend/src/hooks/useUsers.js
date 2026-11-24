import { useState, useEffect } from 'react'

const API_BASE = '/api/usuarios/'

export function useUsers() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(false)
  const [filterRole, setFilterRole] = useState('todos')
  const [searchTerm, setSearchTerm] = useState('')

  const fetchUsers = async () => {
    try {
      setLoading(true)
      
      const res = await fetch(API_BASE)
      if (res.ok) {
        const data = await res.json()
        setUsers(Array.isArray(data) ? data : [])
      } else {
        setUsers([])
      }
    } catch (err) {
      console.error('Error al cargar usuarios:', err)
      setUsers([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchUsers()
  }, [])

  
  const createUser = async (userData) => {
    const payload = {
      nombre: userData.nombre,
      email: userData.email,
      pass: userData.pass || userData.password,
      rol: userData.rol || 'Cliente',
      telefono: userData.telefono || ''
    }

    try {
      
      const res = await fetch(`${API_BASE}crear/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const data = await res.json()

      if (res.ok && data.exito) {
        
        setUsers((prev) => [data.usuario, ...prev])
        return { ok: true }
      } else {
        alert(data.error || 'No se pudo crear el usuario.')
        return { ok: false, error: data.error }
      }
    } catch (err) {
      console.error('Error al crear usuario:', err)
      alert('Error de conexión con el servidor.')
      return { ok: false }
    }
  }

  const toggleUserStatus = async (userId) => {
    const targetUser = users.find((u) => u.id === userId)
    if (!targetUser) return

    const newActiveState = !targetUser.activo

    try {
      const res = await fetch(`${API_BASE}${userId}/`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ activo: newActiveState })
      })
      if (!res.ok) throw new Error((await res.json()).error)
      await fetchUsers()
    } catch (err) { alert(err.message || 'No se pudo actualizar el usuario.') }
  }

  const filteredUsers = users.filter((user) => {
    return (
      user.nombre?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchTerm.toLowerCase())
    )
  })

  return {
    users: filteredUsers,
    rawUsers: users,
    loading,
    filterRole,
    setFilterRole,
    searchTerm,
    setSearchTerm,
    toggleUserStatus,
    createUser
  }
}