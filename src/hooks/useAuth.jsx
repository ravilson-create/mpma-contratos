import { createContext, useContext, useState, useEffect } from 'react'

const AuthCtx = createContext(null)

// Usuarios do sistema - adicione novos usuarios aqui
const USUARIOS = [
  { email: 'ravilson@mpma.mp.br', senha: 'Mpma@2026', nome: 'Ravilson', perfil: 'admin' },
  { email: 'admin@mpma.mp.br',    senha: 'Mpma@2026', nome: 'Administrador', perfil: 'admin' },
]

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const salvo = localStorage.getItem('mpma_user')
    return salvo ? JSON.parse(salvo) : null
  })

  function login(email, senha) {
    const encontrado = USUARIOS.find(
      u => u.email.toLowerCase() === email.toLowerCase() && u.senha === senha
    )
    if (encontrado) {
      const userData = { email: encontrado.email, nome: encontrado.nome, perfil: encontrado.perfil }
      setUser(userData)
      localStorage.setItem('mpma_user', JSON.stringify(userData))
      return { error: null }
    }
    return { error: 'invalido' }
  }

  function logout() {
    setUser(null)
    localStorage.removeItem('mpma_user')
  }

  return (
    <AuthCtx.Provider value={{ user, perfil: user, loading: false, login, logout }}>
      {children}
    </AuthCtx.Provider>
  )
}

export const useAuth = () => useContext(AuthCtx)
