import { useEffect, useState } from 'react'
import { supabase, fmt, diasAte, statusContrato } from '../lib/supabase'
import { Bar } from 'react-chartjs-2'
import { Chart, CategoryScale, LinearScale, BarElement, Tooltip } from 'chart.js'

Chart.register(CategoryScale, LinearScale, BarElement, Tooltip)

export default function ModalDetalhe({ contratoId, onClose, onAtualizado }) {
  const [contrato, setContrato] = useState(null)
  const [resumo, setResumo] = useState(null)
  const [empenhos, setEmpenhos] = useState([])
  const [medicoes, setMedicoes] = useState([])
  const [aba, setAba] = useState('geral')
  const [loading, setLoading] = useState(true)

  // forms
  const [fEmp, setFEmp] = useState({ numero: '', data_empenho: '', valor: '', descricao: '' })
  const [fMed, setFMed] = useState({ numero: '', mes_referencia: '', data_medicao: '', valor: '', descricao: '', status: 'paga' })
  const [salvando, setSalvando] = useState(false)

  async function carregar() {
    const [{ data: c }, { data: r }, { data: e }, { data: m }] = await Promise.all([
      supabase.from('contratos').select('*').eq('id', contratoId).single(),
      supabase.from('resumo_financeiro').select('*').eq('id', contratoId).single(),
      supabase.from('empenhos').select('*').eq('contrato_id', contratoId).order('data_empenho'),
      supabase.from('medicoes_com_saldo').select('*').eq('contrato_id', contratoId).order('data_medicao').order('criado_em'),
    ])
    setContrato(c); setResumo(r); setEmpenhos(e || []); setMedicoes(m || [])
    setLoading(false)
  }

  useEffect(() => { carregar() }, [contratoId])

  async function salvarEmpenho() {
    if (!fEmp.numero || !fEmp.valor) return alert('Informe o nº e o valor do empenho.')
    setSalvando(true)
    await supabase.from('empenhos').insert({ ...fEmp, valor: Number(fEmp.valor), contrato_id: contratoId })
    setFEmp({ numero: '', data_empenho: '', valor: '', descricao: '' })
    await carregar(); onAtualizado(); setSalvando(false)
  }

  async function excluirEmpenho(id) {
    if (!confirm('Excluir este empenho?')) return
    await supabase.from('empenhos').delete().eq('id', id)
    await carregar(); onAtualizado()
  }

  async function salvarMedicao() {
    if (!fMed.numero || !fMed.valor) return alert('Informe o nº e o valor da medição.')
    setSalvando(true)
    await supabase.from('medicoes').insert({ ...fMed, valor: Number(fMed.valor), contrato_id: contratoId })
    setFMed({ numero: '', mes_referencia: '', data_medicao: '', valor: '', descricao: '', status: 'paga' })
    await carregar(); onAtualizado(); setSalvando(false)
  }

  async function excluirMedicao(id) {
    if (!confirm('Excluir esta medição?')) return
    await supabase.from('medicoes').delete().eq('id', id)
    await carregar(); onAtualizado()
  }

  if (loading) return (
    <div className="modal-bg"><div className="modal"><p style={{ color: 'var(--text3)' }}>Carregando...</p></div></div>
  )

  const sal = Number(resumo?.saldo_empenho || 0)
  const mensal = Number(contrato?.valor_mensal_previsto || 0)
  const temEmp = Number(resumo?.total_empenhado || 0) > 0
  const bannerCls = sal < 0 ? 'negativo' : sal < mensal ? 'baixo' : 'positivo'
  const dias = diasAte(contrato?.data_vencimento)
  const st = statusContrato({ ...contrato, ...resumo })

  // Gráfico de evolução de saldo
  const evolLabels = medicoes.map(m => m.mes_referencia?.replace('-', '/') || m.numero)
  const evolSaldos = medicoes.map(m => parseFloat(Number(m.saldo_apos_medicao || 0).toFixed(2)))
  const evolCores = evolSaldos.map(s => s < 0 ? '#A32D2D' : s < mensal ? '#BA7517' : '#3B6D11')

  // Preview saldo ao digitar nova medição
  const previewSaldo = temEmp ? (Number(resumo.total_empenhado) - Number(resumo.total_medido) - (Number(fMed.valor) || 0)) : null

  return (
    <div className="modal-bg" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <div>
            <h2>Contrato {contrato?.numero} — {contrato?.empresa}</h2>
            <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 2 }}>{contrato?.local_unidade}</div>
          </div>
          <button className="btn" onClick={onClose}>✕</button>
        </div>

        {/* Banner de saldo */}
        <div className={`saldo-banner ${bannerCls}`}>
          <div style={{ fontSize: 20 }}>{sal < 0 ? '⊖' : sal < mensal ? '⚠' : '✓'}</div>
          <div>
            <div style={{ fontWeight: 600 }}>
              {sal < 0
                ? `Saldo NEGATIVO: ${fmt(sal)} — empenho insuficiente`
                : sal < mensal
                ? `Saldo baixo: ${fmt(sal)} — insuficiente para uma medição mensal`
                : `Saldo disponível: ${fmt(sal)}`}
            </div>
            <div style={{ fontSize: 11, marginTop: 2, opacity: .8 }}>
              Empenhado: {fmt(resumo?.total_empenhado)} · Medido: {fmt(resumo?.total_medido)}
            </div>
          </div>
        </div>

        <div className="tabs">
          {['geral', 'empenhos', 'medicoes', 'evolucao'].map(t => (
            <button key={t} className={`tab-btn${aba === t ? ' active' : ''}`} onClick={() => setAba(t)}>
              {t === 'geral' ? 'Dados gerais' : t === 'empenhos' ? 'Empenhos' : t === 'medicoes' ? 'Medições' : 'Evolução'}
            </button>
          ))}
        </div>

        {/* GERAL */}
        {aba === 'geral' && (
          <div>
            {[
              ['Nº contrato', contrato?.numero],
              ['Empresa', contrato?.empresa],
              ['Local / unidade', contrato?.local_unidade],
              ['SEI — contrato', contrato?.sei_contrato],
              ['SEI — pagamentos', contrato?.sei_pagamentos],
              ['Digidoc — contrato', contrato?.digidoc_contrato],
              ['Digidoc — pagamento', contrato?.digidoc_pagamento],
              ['Vigência', contrato?.data_vencimento ? new Date(contrato.data_vencimento + 'T00:00:00').toLocaleDateString('pt-BR') + (dias >= 0 ? ` (${dias}d)` : ' — encerrado') : '—'],
              ['Gestor', contrato?.gestor_nome || '—'],
              ['Fiscal', contrato?.fiscal_nome || '—'],
              ['Valor mensal previsto', fmt(contrato?.valor_mensal_previsto)],
              ['LOA 2026', fmt(contrato?.loa_2026)],
              ['Nova previsão', fmt(contrato?.nova_previsao)],
            ].map(([l, v]) => (
              <div key={l} style={{ display: 'flex', gap: 8, padding: '6px 0', borderBottom: '1px solid var(--border)', fontSize: 12 }}>
                <div style={{ color: 'var(--text3)', minWidth: 150, flexShrink: 0, fontSize: 11 }}>{l}</div>
                <div className={l.startsWith('SEI') || l.startsWith('Dig') ? 'text-mono' : ''}>{v || <span className="text-muted">—</span>}</div>
              </div>
            ))}
          </div>
        )}

        {/* EMPENHOS */}
        {aba === 'empenhos' && (
          <div>
            <div style={{ background: 'var(--bg)', borderRadius: 'var(--radius)', padding: '1rem', marginBottom: '1rem' }}>
              <div style={{ fontSize: 12, fontWeight: 500, marginBottom: 10 }}>Registrar novo empenho</div>
              <div className="form-grid">
                <div className="field"><label>Nº do empenho</label>
                  <input value={fEmp.numero} onChange={e => setFEmp({ ...fEmp, numero: e.target.value })} placeholder="2026NE000001" />
                </div>
                <div className="field"><label>Data</label>
                  <input type="date" value={fEmp.data_empenho} onChange={e => setFEmp({ ...fEmp, data_empenho: e.target.value })} />
                </div>
                <div className="field"><label>Valor (R$)</label>
                  <input type="number" step="0.01" value={fEmp.valor} onChange={e => setFEmp({ ...fEmp, valor: e.target.value })} placeholder="0,00" />
                </div>
                <div className="field"><label>Descrição</label>
                  <input value={fEmp.descricao} onChange={e => setFEmp({ ...fEmp, descricao: e.target.value })} />
                </div>
              </div>
              <div className="btn-row">
                <button className="btn primary" onClick={salvarEmpenho} disabled={salvando}>Salvar empenho</button>
              </div>
            </div>

            <table>
              <thead><tr><th>Nº empenho</th><th>Data</th><th className="text-right">Valor</th><th>Descrição</th><th></th></tr></thead>
              <tbody>
                {empenhos.length === 0
                  ? <tr><td colSpan={5} style={{ textAlign: 'center', padding: '1.5rem', color: 'var(--text3)' }}>Nenhum empenho registrado</td></tr>
                  : empenhos.map(e => (
                    <tr key={e.id}>
                      <td className="text-mono">{e.numero}</td>
                      <td>{e.data_empenho ? new Date(e.data_empenho + 'T00:00:00').toLocaleDateString('pt-BR') : '—'}</td>
                      <td className="text-right fw-500">{fmt(e.valor)}</td>
                      <td style={{ color: 'var(--text3)' }}>{e.descricao || '—'}</td>
                      <td><button className="btn danger" style={{ padding: '2px 8px', fontSize: 11 }} onClick={() => excluirEmpenho(e.id)}>Excluir</button></td>
                    </tr>
                  ))
                }
              </tbody>
            </table>
            {empenhos.length > 0 && (
              <div style={{ textAlign: 'right', fontSize: 12, fontWeight: 500, marginTop: 8, paddingTop: 8, borderTop: '1px solid var(--border)' }}>
                Total empenhado: {fmt(resumo?.total_empenhado)}
              </div>
            )}
          </div>
        )}

        {/* MEDIÇÕES */}
        {aba === 'medicoes' && (
          <div>
            <div style={{ background: 'var(--bg)', borderRadius: 'var(--radius)', padding: '1rem', marginBottom: '1rem' }}>
              <div style={{ fontSize: 12, fontWeight: 500, marginBottom: 10 }}>Registrar nova medição</div>
              <div className="form-grid">
                <div className="field"><label>Nº da medição</label>
                  <input value={fMed.numero} onChange={e => setFMed({ ...fMed, numero: e.target.value })} placeholder="01" />
                </div>
                <div className="field"><label>Mês referência</label>
                  <input type="month" value={fMed.mes_referencia} onChange={e => setFMed({ ...fMed, mes_referencia: e.target.value })} />
                </div>
                <div className="field"><label>Data da medição</label>
                  <input type="date" value={fMed.data_medicao} onChange={e => setFMed({ ...fMed, data_medicao: e.target.value })} />
                </div>
                <div className="field"><label>Valor (R$)</label>
                  <input type="number" step="0.01" value={fMed.valor} onChange={e => setFMed({ ...fMed, valor: e.target.value })} placeholder="0,00" />
                </div>
                <div className="field"><label>Status</label>
                  <select value={fMed.status} onChange={e => setFMed({ ...fMed, status: e.target.value })}>
                    <option value="paga">Paga</option>
                    <option value="pendente">Pendente</option>
                    <option value="contestada">Contestada</option>
                  </select>
                </div>
                <div className="field"><label>Descrição</label>
                  <input value={fMed.descricao} onChange={e => setFMed({ ...fMed, descricao: e.target.value })} />
                </div>
              </div>
              {fMed.valor && previewSaldo !== null && (
                <div className={`alert ${previewSaldo < 0 ? 'danger' : previewSaldo < mensal ? 'warn' : 'ok'}`} style={{ marginTop: 10, fontSize: 12 }}>
                  Saldo após esta medição: <strong>{fmt(previewSaldo)}</strong>
                  {previewSaldo < 0 && ' — ATENÇÃO: saldo ficará negativo'}
                </div>
              )}
              <div className="btn-row">
                <button className="btn primary" onClick={salvarMedicao} disabled={salvando}>Salvar medição</button>
              </div>
            </div>

            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Nº</th><th>Mês</th><th>Data</th>
                    <th className="text-right">Valor medido</th>
                    <th className="text-right">Saldo após</th>
                    <th>Status</th><th>Descrição</th><th></th>
                  </tr>
                </thead>
                <tbody>
                  {medicoes.length === 0
                    ? <tr><td colSpan={8} style={{ textAlign: 'center', padding: '1.5rem', color: 'var(--text3)' }}>Nenhuma medição registrada</td></tr>
                    : medicoes.map(m => {
                      const s = Number(m.saldo_apos_medicao || 0)
                      return (
                        <tr key={m.id}>
                          <td>{m.numero}</td>
                          <td>{m.mes_referencia?.replace('-', '/') || '—'}</td>
                          <td>{m.data_medicao ? new Date(m.data_medicao + 'T00:00:00').toLocaleDateString('pt-BR') : '—'}</td>
                          <td className="text-right fw-500">{fmt(m.valor)}</td>
                          <td className="text-right fw-500" style={{ color: s < 0 ? 'var(--red)' : s < mensal ? 'var(--amber)' : 'var(--green)' }}>
                            {fmt(s)}
                          </td>
                          <td><span className={`badge ${m.status}`}>{m.status}</span></td>
                          <td style={{ color: 'var(--text3)', fontSize: 11 }}>{m.descricao || '—'}</td>
                          <td><button className="btn danger" style={{ padding: '2px 8px', fontSize: 11 }} onClick={() => excluirMedicao(m.id)}>Excluir</button></td>
                        </tr>
                      )
                    })
                  }
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* EVOLUÇÃO */}
        {aba === 'evolucao' && (
          <div>
            {medicoes.length === 0
              ? <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text3)' }}>Sem medições para exibir.</div>
              : (
                <>
                  <div style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 10 }}>
                    Saldo do empenho após cada medição registrada
                  </div>
                  <div style={{ position: 'relative', height: 220 }}>
                    <Bar
                      data={{
                        labels: evolLabels,
                        datasets: [{ label: 'Saldo após medição', data: evolSaldos, backgroundColor: evolCores, borderRadius: 4 }]
                      }}
                      options={{
                        responsive: true, maintainAspectRatio: false,
                        plugins: { legend: { display: false } },
                        scales: {
                          y: {
                            ticks: { callback: v => (v < 0 ? '-R$' : 'R$') + Math.abs(v / 1000).toFixed(0) + 'k' },
                            grid: { color: 'rgba(128,128,128,.07)' }
                          },
                          x: { grid: { display: false }, ticks: { autoSkip: false, font: { size: 11 } } }
                        }
                      }}
                    />
                  </div>
                </>
              )
            }
          </div>
        )}
      </div>
    </div>
  )
}
