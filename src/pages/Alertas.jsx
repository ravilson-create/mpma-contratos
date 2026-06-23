import { useEffect, useState } from 'react'
import { supabase, gerarAlertas } from '../lib/supabase'

export default function Alertas() {
  const [alertas, setAlertas] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.from('resumo_financeiro').select('*').then(({ data }) => {
      setAlertas(gerarAlertas(data || []))
      setLoading(false)
    })
  }, [])

  const criticos = alertas.filter(a => a.tipo === 'critico')
  const avisos   = alertas.filter(a => a.tipo === 'warn')

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Alertas</h1>
          <p>{alertas.length} alerta{alertas.length !== 1 ? 's' : ''} ativo{alertas.length !== 1 ? 's' : ''}</p>
        </div>
      </div>

      {loading && <div style={{ color: 'var(--text3)' }}>Carregando...</div>}

      {!loading && alertas.length === 0 && (
        <div className="alert ok">Nenhum alerta ativo. Todos os contratos estão em dia.</div>
      )}

      {criticos.length > 0 && (
        <>
          <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 8, color: 'var(--red)' }}>
            Críticos ({criticos.length})
          </div>
          {criticos.map((a, i) => (
            <div key={i} className="alert danger">
              <div style={{ fontWeight: 600 }}>{a.contrato} — {a.empresa}</div>
              <div>{a.msg}</div>
            </div>
          ))}
        </>
      )}

      {avisos.length > 0 && (
        <>
          <div style={{ fontSize: 13, fontWeight: 500, margin: '1rem 0 8px', color: 'var(--amber)' }}>
            Atenção ({avisos.length})
          </div>
          {avisos.map((a, i) => (
            <div key={i} className="alert warn">
              <div style={{ fontWeight: 600 }}>{a.contrato} — {a.empresa}</div>
              <div>{a.msg}</div>
            </div>
          ))}
        </>
      )}
    </div>
  )
}
