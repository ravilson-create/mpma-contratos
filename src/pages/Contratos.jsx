import { useEffect, useState } from 'react'
import { supabase, fmt, diasAte, statusContrato } from '../lib/supabase'
import ModalContrato from '../components/ModalContrato'
import ModalDetalhe from '../components/ModalDetalhe'

export default function Contratos() {
  const [resumos, setResumos] = useState([])
  const [loading, setLoading] = useState(true)
  const [busca, setBusca] = useState('')
  const [filtroStatus, setFiltroStatus] = useState('')
  const [modalNovo, setModalNovo] = useState(false)
  const [contratoSel, setContratoSel] = useState(null)

  async function carregar() {
    const { data } = await supabase.from('resumo_financeiro').select('*').order('numero')
    setResumos(data || [])
    setLoading(false)
  }

  useEffect(() => { carregar() }, [])

  const lista = resumos.filter(c => {
    const q = busca.toLowerCase()
    const match = !q || (c.numero + c.empresa + (c.local_unidade || '')).toLowerCase().includes(q)
    const st = statusContrato(c)
    const sal = Number(c.saldo_empenho || 0)
    const stReal = sal < 0 && Number(c.total_empenhado) > 0 ? 'negativo' : st
    const fst = !filtroStatus || stReal === filtroStatus
    return match && fst
  })

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Contratos</h1>
          <p>{resumos.length} contratos cadastrados</p>
        </div>
        <button className="btn primary" onClick={() => setModalNovo(true)}>
          + Novo contrato
        </button>
      </div>

      <div className="search-row">
        <input
          placeholder="Buscar número, empresa, local..."
          value={busca} onChange={e => setBusca(e.target.value)}
        />
        <select value={filtroStatus} onChange={e => setFiltroStatus(e.target.value)}>
          <option value="">Todos os status</option>
          <option value="ativo">Ativo</option>
          <option value="alerta">Alerta</option>
          <option value="critico">Crítico</option>
          <option value="negativo">Saldo negativo</option>
        </select>
      </div>

      {loading
        ? <div style={{ color: 'var(--text3)', padding: '2rem' }}>Carregando...</div>
        : (
          <div className="card" style={{ padding: 0 }}>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Nº</th><th>Empresa</th><th>Local</th><th>Vigência</th>
                    <th className="text-right">Empenhado</th>
                    <th className="text-right">Medido</th>
                    <th className="text-right">Saldo</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {lista.length === 0
                    ? <tr><td colSpan={8} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text3)' }}>Nenhum contrato encontrado</td></tr>
                    : lista.map(c => {
                      const st = statusContrato(c)
                      const sal = Number(c.saldo_empenho || 0)
                      const temEmp = Number(c.total_empenhado || 0) > 0
                      const stReal = sal < 0 && temEmp ? 'negativo' : st
                      const dias = diasAte(c.data_vencimento)
                      return (
                        <tr key={c.id} className="clickable" onClick={() => setContratoSel(c.id)}>
                          <td className="fw-500">{c.numero}</td>
                          <td>{c.empresa}</td>
                          <td style={{ maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--text3)', fontSize: 11 }}>{c.local_unidade}</td>
                          <td style={{ fontSize: 11 }}>
                            {c.data_vencimento ? new Date(c.data_vencimento + 'T00:00:00').toLocaleDateString('pt-BR') : '—'}
                            {c.data_vencimento && dias >= 0 && <div style={{ color: dias <= 30 ? 'var(--red)' : dias <= 120 ? 'var(--amber)' : 'var(--text3)', fontSize: 10 }}>{dias}d</div>}
                          </td>
                          <td className="text-right">{temEmp ? fmt(c.total_empenhado) : <span className="text-muted">—</span>}</td>
                          <td className="text-right">{fmt(c.total_medido)}</td>
                          <td className="text-right fw-500" style={{ color: sal < 0 ? 'var(--red)' : sal < Number(c.valor_mensal_previsto) ? 'var(--amber)' : 'var(--green)' }}>
                            {fmt(sal)}
                          </td>
                          <td><span className={`badge ${stReal}`}>{stReal}</span></td>
                        </tr>
                      )
                    })
                  }
                </tbody>
              </table>
            </div>
          </div>
        )}

      {modalNovo && (
        <ModalContrato onClose={() => setModalNovo(false)} onSalvo={() => { setModalNovo(false); carregar() }} />
      )}

      {contratoSel && (
        <ModalDetalhe contratoId={contratoSel} onClose={() => setContratoSel(null)} onAtualizado={carregar} />
      )}
    </div>
  )
}
