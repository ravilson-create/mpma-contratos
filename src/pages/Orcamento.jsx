import { useEffect, useState } from 'react'
import { supabase, fmt } from '../lib/supabase'

export default function Orcamento() {
  const [resumos, setResumos] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.from('resumo_financeiro').select('*').order('numero').then(({ data }) => {
      setResumos(data || [])
      setLoading(false)
    })
  }, [])

  const tLoa  = resumos.reduce((a, c) => a + Number(c.loa_2026 || 0), 0)
  const tNova = resumos.reduce((a, c) => a + Number(c.nova_previsao || 0), 0)
  const tEmp  = resumos.reduce((a, c) => a + Number(c.total_empenhado || 0), 0)
  const tMed  = resumos.reduce((a, c) => a + Number(c.total_medido || 0), 0)
  const t2sem = resumos.reduce((a, c) => a + Number(c.prev_2sem || 0), 0)
  const diff  = tLoa - tNova

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Orçamento 2026</h1>
          <p>LOA, previsão atualizada e execução financeira</p>
        </div>
      </div>

      {loading && <div style={{ color: 'var(--text3)' }}>Carregando...</div>}

      {!loading && (
        <>
          <div className="metric-grid">
            <div className="metric-card"><div className="lbl">LOA 2026 total</div><div className="val" style={{ fontSize: 14 }}>{fmt(tLoa)}</div></div>
            <div className="metric-card"><div className="lbl">Nova previsão</div><div className="val" style={{ fontSize: 14 }}>{fmt(tNova)}</div></div>
            <div className="metric-card"><div className="lbl">Total empenhado</div><div className="val" style={{ fontSize: 14 }}>{fmt(tEmp)}</div></div>
            <div className="metric-card"><div className="lbl">Total pago/medido</div><div className="val" style={{ fontSize: 14 }}>{fmt(tMed)}</div></div>
            <div className="metric-card"><div className="lbl">Prev. 2º semestre</div><div className="val" style={{ fontSize: 14 }}>{fmt(t2sem)}</div></div>
            <div className="metric-card">
              <div className="lbl">Diferença LOA × nova prev.</div>
              <div className={`val ${diff < 0 ? 'danger' : 'ok'}`} style={{ fontSize: 14 }}>{fmt(diff)}</div>
            </div>
          </div>

          <div className="card" style={{ padding: 0 }}>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Nº</th><th>Empresa</th>
                    <th className="text-right">LOA 2026</th>
                    <th className="text-right">Nova prev.</th>
                    <th className="text-right">Empenhado</th>
                    <th className="text-right">Pago/medido</th>
                    <th className="text-right">Prev. 2º sem.</th>
                    <th className="text-right">Saldo empenho</th>
                    <th className="text-right">Dif. LOA</th>
                  </tr>
                </thead>
                <tbody>
                  {resumos.map(c => {
                    const sal = Number(c.saldo_empenho || 0)
                    const dif = Number(c.loa_2026 || 0) - Number(c.nova_previsao || 0)
                    const mensal = Number(c.valor_mensal_previsto || 0)
                    return (
                      <tr key={c.id}>
                        <td className="fw-500">{c.numero}</td>
                        <td>{c.empresa}</td>
                        <td className="text-right">{fmt(c.loa_2026)}</td>
                        <td className="text-right">{fmt(c.nova_previsao)}</td>
                        <td className="text-right">{Number(c.total_empenhado) > 0 ? fmt(c.total_empenhado) : <span className="text-muted">—</span>}</td>
                        <td className="text-right">{fmt(c.total_medido)}</td>
                        <td className="text-right">{fmt(c.prev_2sem)}</td>
                        <td className="text-right fw-500" style={{ color: sal < 0 ? 'var(--red)' : sal < mensal ? 'var(--amber)' : 'var(--green)' }}>
                          {fmt(sal)}
                        </td>
                        <td className="text-right" style={{ color: dif < 0 ? 'var(--red)' : 'var(--green)' }}>{fmt(dif)}</td>
                      </tr>
                    )
                  })}
                </tbody>
                <tfoot>
                  <tr style={{ fontWeight: 600, borderTop: '1px solid var(--border2)' }}>
                    <td colSpan={2}>Total</td>
                    <td className="text-right">{fmt(tLoa)}</td>
                    <td className="text-right">{fmt(tNova)}</td>
                    <td className="text-right">{fmt(tEmp)}</td>
                    <td className="text-right">{fmt(tMed)}</td>
                    <td className="text-right">{fmt(t2sem)}</td>
                    <td className="text-right" style={{ color: (tEmp - tMed) < 0 ? 'var(--red)' : 'var(--green)' }}>{fmt(tEmp - tMed)}</td>
                    <td className="text-right" style={{ color: diff < 0 ? 'var(--red)' : 'var(--green)' }}>{fmt(diff)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
