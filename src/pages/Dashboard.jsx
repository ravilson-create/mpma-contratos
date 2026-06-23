import { useEffect, useState } from 'react'
import { supabase, fmt, statusContrato, gerarAlertas } from '../lib/supabase'
import { Bar } from 'react-chartjs-2'
import { Chart, CategoryScale, LinearScale, BarElement, Tooltip } from 'chart.js'

Chart.register(CategoryScale, LinearScale, BarElement, Tooltip)

export default function Dashboard() {
  const [resumos, setResumos] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.from('resumo_financeiro').select('*').then(({ data }) => {
      setResumos(data || [])
      setLoading(false)
    })
  }, [])

  if (loading) return <div style={{ color: 'var(--text3)', padding: '2rem' }}>Carregando...</div>

  const alertas = gerarAlertas(resumos)
  const tEmp  = resumos.reduce((a, c) => a + Number(c.total_empenhado || 0), 0)
  const tMed  = resumos.reduce((a, c) => a + Number(c.total_medido || 0), 0)
  const tSal  = tEmp - tMed
  const tLoa  = resumos.reduce((a, c) => a + Number(c.loa_2026 || 0), 0)
  const negativos = resumos.filter(c => Number(c.saldo_empenho) < 0 && Number(c.total_empenhado) > 0).length

  const saldoData = {
    labels: resumos.map(c => c.numero),
    datasets: [{
      label: 'Saldo',
      data: resumos.map(c => Math.round(Number(c.saldo_empenho || 0))),
      backgroundColor: resumos.map(c => Number(c.saldo_empenho) < 0 ? '#A32D2D' : Number(c.saldo_empenho) < Number(c.valor_mensal_previsto) * 2 ? '#BA7517' : '#3B6D11'),
      borderRadius: 3,
    }]
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Dashboard</h1>
          <p>Gestão de contratos de manutenção — MPMA · 2026</p>
        </div>
      </div>

      <div className="metric-grid">
        <div className="metric-card"><div className="lbl">Contratos ativos</div><div className="val ok">{resumos.length}</div></div>
        <div className="metric-card"><div className="lbl">Total empenhado</div><div className="val" style={{ fontSize: 14 }}>{fmt(tEmp)}</div></div>
        <div className="metric-card"><div className="lbl">Total medido/pago</div><div className="val" style={{ fontSize: 14 }}>{fmt(tMed)}</div></div>
        <div className="metric-card"><div className="lbl">Saldo empenhos</div><div className={`val ${tSal < 0 ? 'danger' : tSal < 500000 ? 'warn' : 'ok'}`} style={{ fontSize: 14 }}>{fmt(tSal)}</div></div>
        <div className="metric-card"><div className="lbl">LOA 2026 total</div><div className="val" style={{ fontSize: 14 }}>{fmt(tLoa)}</div></div>
        <div className="metric-card"><div className="lbl">Saldo negativo</div><div className={`val ${negativos > 0 ? 'danger' : 'ok'}`}>{negativos}</div></div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.25rem' }}>
        <div className="card">
          <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 10 }}>Saldo por contrato</div>
          <div style={{ position: 'relative', height: 180 }}>
            <Bar data={saldoData} options={{
              responsive: true, maintainAspectRatio: false,
              plugins: { legend: { display: false } },
              scales: {
                y: { ticks: { callback: v => 'R$' + (v / 1000).toFixed(0) + 'k' }, grid: { color: 'rgba(128,128,128,.07)' } },
                x: { grid: { display: false }, ticks: { font: { size: 10 } } }
              }
            }} />
          </div>
        </div>

        <div className="card">
          <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 10 }}>Situação dos saldos</div>
          <div style={{ overflowX: 'auto' }}>
            <table>
              <thead>
                <tr>
                  <th>Contrato</th><th>Empresa</th>
                  <th className="text-right">Empenhado</th>
                  <th className="text-right">Saldo</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {resumos.map(c => {
                  const st = statusContrato(c)
                  const sal = Number(c.saldo_empenho || 0)
                  const temEmp = Number(c.total_empenhado || 0) > 0
                  return (
                    <tr key={c.id}>
                      <td className="fw-500">{c.numero}</td>
                      <td>{c.empresa}</td>
                      <td className="text-right">{temEmp ? fmt(c.total_empenhado) : <span className="text-muted">—</span>}</td>
                      <td className={`text-right fw-500 ${sal < 0 ? 'danger' : ''}`} style={{ color: sal < 0 ? 'var(--red)' : sal < Number(c.valor_mensal_previsto) ? 'var(--amber)' : 'var(--green)' }}>
                        {fmt(sal)}
                      </td>
                      <td><span className={`badge ${sal < 0 ? 'negativo' : st}`}>{sal < 0 ? 'negativo' : st}</span></td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="card">
        <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 10 }}>
          Alertas ativos {alertas.length > 0 && <span className="badge critico" style={{ marginLeft: 6 }}>{alertas.length}</span>}
        </div>
        {alertas.length === 0
          ? <div className="alert ok">Nenhum alerta ativo no momento.</div>
          : alertas.map((a, i) => (
            <div key={i} className={`alert ${a.tipo}`}>
              <strong>{a.contrato} — {a.empresa}:</strong>&nbsp;{a.msg}
            </div>
          ))
        }
      </div>
    </div>
  )
}
