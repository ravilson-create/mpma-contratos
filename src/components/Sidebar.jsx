import { NavLink } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

export default function Sidebar({ qtdAlertas = 0 }) {
  const { perfil, logout } = useAuth()

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <span>MPMA</span>
        <small>Contratos de Manutenção</small>
      </div>

      <nav style={{ flex: 1 }}>
        <NavLink to="/" end className={({ isActive }) => 'nav-item' + (isActive ? ' active' : '')}>
          <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
            <rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>
          </svg>
          Dashboard
        </NavLink>

        <NavLink to="/contratos" className={({ isActive }) => 'nav-item' + (isActive ? ' active' : '')}>
          <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
            <polyline points="14 2 14 8 20 8"/><line x1="8" y1="13" x2="16" y2="13"/>
            <line x1="8" y1="17" x2="16" y2="17"/>
          </svg>
          Contratos
        </NavLink>

        <NavLink to="/alertas" className={({ isActive }) => 'nav-item' + (isActive ? ' active' : '')}>
          <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/>
            <path d="M13.73 21a2 2 0 01-3.46 0"/>
          </svg>
          Alertas
          {qtdAlertas > 0 && <span className="badge-count">{qtdAlertas}</span>}
        </NavLink>

        <NavLink to="/orcamento" className={({ isActive }) => 'nav-item' + (isActive ? ' active' : '')}>
          <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/>
            <line x1="6" y1="20" x2="6" y2="14"/>
          </svg>
          Orçamento 2026
        </NavLink>
      </nav>

      <div style={{ padding: '1rem', borderTop: '1px solid var(--border)' }}>
        {perfil && (
          <div style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 8 }}>
            <div style={{ color: 'var(--text2)', fontWeight: 500 }}>{perfil.nome}</div>
            <div>{perfil.perfil}</div>
          </div>
        )}
        <button className="btn" style={{ width: '100%', fontSize: 12 }} onClick={logout}>
          Sair
        </button>
      </div>
    </aside>
  )
}
