import { useState } from 'react'
import { useAuth } from '../hooks/useAuth'

export default function Login() {
  const { login } = useAuth()
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [erro, setErro] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setErro('')
    setLoading(true)
    const { error } = await login(email, senha)
    if (error) setErro('E-mail ou senha inválidos.')
    setLoading(false)
  }

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center',
      justifyContent: 'center', background: 'var(--bg)'
    }}>
      <div style={{
        background: 'var(--surface)', border: '1px solid var(--border)',
        borderRadius: 'var(--radius-lg)', padding: '2rem', width: 'min(400px, 90vw)'
      }}>
        <div style={{ marginBottom: '1.5rem' }}>
          <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--blue-text)' }}>MPMA</div>
          <div style={{ fontSize: 14, fontWeight: 600, marginTop: 4 }}>Contratos de Manutenção</div>
          <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 2 }}>
            Ministério Público do Maranhão
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="field" style={{ marginBottom: 12 }}>
            <label>E-mail institucional</label>
            <input
              type="email" value={email} onChange={e => setEmail(e.target.value)}
              placeholder="usuario@mpma.mp.br" required autoFocus
            />
          </div>
          <div className="field" style={{ marginBottom: 16 }}>
            <label>Senha</label>
            <input
              type="password" value={senha} onChange={e => setSenha(e.target.value)}
              required
            />
          </div>
          {erro && (
            <div className="alert danger" style={{ marginBottom: 12, fontSize: 12 }}>
              {erro}
            </div>
          )}
          <button type="submit" className="btn primary" style={{ width: '100%' }} disabled={loading}>
            {loading ? 'Entrando...' : 'Entrar'}
          </button>
        </form>
      </div>
    </div>
  )
}
