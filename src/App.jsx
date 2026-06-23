import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { AuthProvider, useAuth } from './hooks/useAuth'
import { supabase, gerarAlertas } from './lib/supabase'
import Sidebar from './components/Sidebar'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Contratos from './pages/Contratos'
import Alertas from './pages/Alertas'
import Orcamento from './pages/Orcamento'
import './index.css'

function AppShell() {
  const { user, loading } = useAuth()
  const [qtdAlertas, setQtdAlertas] = useState(0)

  useEffect(() => {
    if (!user) return
    supabase.from('resumo_financeiro').select('*').then(({ data }) => {
      setQtdAlertas(gerarAlertas(data || []).length)
    })
  }, [user])

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', color: 'var(--text3)' }}>
      Carregando...
    </div>
  )

  if (!user) return <Login />

  return (
    <div className="layout">
      <Sidebar qtdAlertas={qtdAlertas} />
      <main className="main">
        <Routes>
          <Route path="/"          element={<Dashboard />} />
          <Route path="/contratos" element={<Contratos />} />
          <Route path="/alertas"   element={<Alertas />} />
          <Route path="/orcamento" element={<Orcamento />} />
          <Route path="*"          element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppShell />
      </AuthProvider>
    </BrowserRouter>
  )
}
