import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { createContext, useContext, useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'
import './index.css'

// ─── SUPABASE ────────────────────────────────────────────────
const supabase = createClient(
  'https://yyerrogmzdamqieuyqpv.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl5ZXJyb2dtemRhbXFpZXV5cXB2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIyMjQyNTcsImV4cCI6MjA5NzgwMDI1N30.B7R3WCsAZ_lxd_nfqOpSSOd9LWG_DMUsGq6pzZapnKs'
)

// ─── AUTH LOCAL ──────────────────────────────────────────────
const USUARIOS = [
  { email: 'ravilson@mpma.mp.br', senha: 'Mpma@2026', nome: 'Ravilson', perfil: 'admin' },
  { email: 'admin@mpma.mp.br',    senha: 'Mpma@2026', nome: 'Administrador', perfil: 'admin' },
]
const AuthCtx = createContext(null)
function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem('mpma_user')) } catch { return null }
  })
  function login(email, senha) {
    const u = USUARIOS.find(x => x.email.toLowerCase() === email.toLowerCase() && x.senha === senha)
    if (u) { const d = { email: u.email, nome: u.nome, perfil: u.perfil }; setUser(d); localStorage.setItem('mpma_user', JSON.stringify(d)); return { error: null } }
    return { error: 'invalido' }
  }
  function logout() { setUser(null); localStorage.removeItem('mpma_user') }
  return <AuthCtx.Provider value={{ user, loading: false, login, logout }}>{children}</AuthCtx.Provider>
}
const useAuth = () => useContext(AuthCtx)

// ─── HELPERS ─────────────────────────────────────────────────
const fmt = v => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2 })
const diasAte = d => { if (!d) return 9999; return Math.ceil((new Date(d + 'T00:00:00') - new Date()) / 864e5) }

// ─── LOGIN ───────────────────────────────────────────────────
function Login() {
  const { login } = useAuth()
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [erro, setErro] = useState('')
  function handleSubmit(e) {
    e.preventDefault(); setErro('')
    const { error } = login(email, senha)
    if (error) setErro('E-mail ou senha inválidos.')
  }
  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)' }}>
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '2rem', width: 'min(400px,90vw)' }}>
        <div style={{ marginBottom: '1.5rem' }}>
          <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--blue-text)' }}>MPMA</div>
          <div style={{ fontSize: 14, fontWeight: 600, marginTop: 4 }}>Contratos de Manutenção</div>
          <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 2 }}>Ministério Público do Maranhão</div>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="field" style={{ marginBottom: 12 }}>
            <label>E-mail</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="usuario@mpma.mp.br" required autoFocus />
          </div>
          <div className="field" style={{ marginBottom: 16 }}>
            <label>Senha</label>
            <input type="password" value={senha} onChange={e => setSenha(e.target.value)} required />
          </div>
          {erro && <div className="alert danger" style={{ marginBottom: 12, fontSize: 12 }}>{erro}</div>}
          <button type="submit" className="btn primary" style={{ width: '100%' }}>Entrar</button>
        </form>
      </div>
    </div>
  )
}

// ─── SIDEBAR ─────────────────────────────────────────────────
function Sidebar({ pagina, setPagina, qtdAlertas }) {
  const { user, logout } = useAuth()
  const itens = [
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'contratos', label: 'Contratos' },
    { id: 'alertas',   label: 'Alertas', badge: qtdAlertas },
    { id: 'orcamento', label: 'Orçamento 2026' },
  ]
  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <span>MPMA</span>
        <small>Contratos de Manutenção</small>
      </div>
      <nav style={{ flex: 1 }}>
        {itens.map(i => (
          <button key={i.id} className={`nav-item${pagina === i.id ? ' active' : ''}`} onClick={() => setPagina(i.id)}>
            {i.label}
            {i.badge > 0 && <span className="badge-count">{i.badge}</span>}
          </button>
        ))}
      </nav>
      <div style={{ padding: '1rem', borderTop: '1px solid var(--border)' }}>
        <div style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 8 }}>
          <div style={{ color: 'var(--text2)', fontWeight: 500 }}>{user?.nome}</div>
          <div>{user?.perfil}</div>
        </div>
        <button className="btn" style={{ width: '100%', fontSize: 12 }} onClick={logout}>Sair</button>
      </div>
    </aside>
  )
}

// ─── MODAL CONTRATO ──────────────────────────────────────────
function ModalContrato({ contrato, onClose, onSalvo }) {
  const vazio = { numero: '', empresa: '', sei_contrato: '', sei_pagamentos: '', local_unidade: '', objeto: '', gestor_nome: '', fiscal_nome: '', data_vencimento: '', valor_anual: '', valor_mensal_previsto: '', loa_2026: '', observacoes: '' }
  const [f, setF] = useState(contrato ? { ...vazio, ...contrato, valor_anual: contrato.valor_anual || '', valor_mensal_previsto: contrato.valor_mensal_previsto || '', loa_2026: contrato.loa_2026 || '' } : vazio)
  const [salvando, setSalvando] = useState(false)
  const upd = (k, v) => setF(p => ({ ...p, [k]: v }))

  async function salvar() {
    if (!f.numero.trim() || !f.empresa.trim()) return alert('Informe o número e a empresa.')
    setSalvando(true)
    const payload = {
      numero: f.numero.trim(),
      empresa: f.empresa.trim(),
      sei_contrato: f.sei_contrato || null,
      sei_pagamentos: f.sei_pagamentos || null,
      local_unidade: f.local_unidade || null,
      objeto: f.objeto || null,
      gestor_nome: f.gestor_nome || null,
      fiscal_nome: f.fiscal_nome || null,
      data_vencimento: f.data_vencimento || null,
      valor_anual: Number(f.valor_anual) || 0,
      valor_mensal_previsto: Number(f.valor_mensal_previsto) || 0,
      loa_2026: Number(f.loa_2026) || 0,
      observacoes: f.observacoes || null,
    }
    let erro
    if (contrato?.id) {
      const { error } = await supabase.from('contratos').update(payload).eq('id', contrato.id)
      erro = error
    } else {
      const { error } = await supabase.from('contratos').insert(payload)
      erro = error
    }
    setSalvando(false)
    if (erro) { alert('Erro ao salvar: ' + erro.message); return }
    onSalvo()
  }

  return (
    <div className="modal-bg" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <h2>{contrato ? 'Editar contrato' : 'Novo contrato'}</h2>
          <button className="btn" onClick={onClose}>✕</button>
        </div>
        <div className="form-grid" style={{ marginBottom: 10 }}>
          <div className="field"><label>Nº contrato *</label><input value={f.numero} onChange={e => upd('numero', e.target.value)} placeholder="01/2026" /></div>
          <div className="field"><label>Empresa *</label><input value={f.empresa} onChange={e => upd('empresa', e.target.value)} /></div>
        </div>
        <div className="form-grid" style={{ marginBottom: 10 }}>
          <div className="field"><label>SEI — contrato</label><input value={f.sei_contrato} onChange={e => upd('sei_contrato', e.target.value)} /></div>
          <div className="field"><label>SEI — pagamentos</label><input value={f.sei_pagamentos} onChange={e => upd('sei_pagamentos', e.target.value)} /></div>
        </div>
        <div className="form-grid full" style={{ marginBottom: 10 }}>
          <div className="field"><label>Local / unidade</label><input value={f.local_unidade} onChange={e => upd('local_unidade', e.target.value)} /></div>
        </div>
        <div className="form-grid full" style={{ marginBottom: 10 }}>
          <div className="field"><label>Objeto do contrato</label><textarea value={f.objeto} onChange={e => upd('objeto', e.target.value)} /></div>
        </div>
        <div className="form-grid" style={{ marginBottom: 10 }}>
          <div className="field"><label>Gestor</label><input value={f.gestor_nome} onChange={e => upd('gestor_nome', e.target.value)} /></div>
          <div className="field"><label>Fiscal</label><input value={f.fiscal_nome} onChange={e => upd('fiscal_nome', e.target.value)} /></div>
        </div>
        <div className="form-grid" style={{ marginBottom: 10 }}>
          <div className="field"><label>Data de vencimento</label><input type="date" value={f.data_vencimento} onChange={e => upd('data_vencimento', e.target.value)} /></div>
          <div className="field"><label>Valor anual do contrato (R$)</label><input type="number" step="0.01" value={f.valor_anual} onChange={e => upd('valor_anual', e.target.value)} /></div>
        </div>
        <div className="form-grid" style={{ marginBottom: 10 }}>
          <div className="field"><label>Valor mensal previsto (R$)</label><input type="number" step="0.01" value={f.valor_mensal_previsto} onChange={e => upd('valor_mensal_previsto', e.target.value)} /></div>
          <div className="field"><label>LOA 2026 (R$)</label><input type="number" step="0.01" value={f.loa_2026} onChange={e => upd('loa_2026', e.target.value)} /></div>
        </div>
        <div className="form-grid full" style={{ marginBottom: 10 }}>
          <div className="field"><label>Observações</label><textarea value={f.observacoes} onChange={e => upd('observacoes', e.target.value)} /></div>
        </div>
        <div className="btn-row">
          <button className="btn" onClick={onClose}>Cancelar</button>
          <button className="btn primary" onClick={salvar} disabled={salvando}>{salvando ? 'Salvando...' : 'Salvar contrato'}</button>
        </div>
      </div>
    </div>
  )
}

// ─── MODAL DETALHE ───────────────────────────────────────────
function ModalDetalhe({ contratoId, onClose, onAtualizado }) {
  const [contrato, setContrato] = useState(null)
  const [empenhos, setEmpenhos] = useState([])
  const [medicoes, setMedicoes] = useState([])
  const [aba, setAba] = useState('geral')
  const [editando, setEditando] = useState(false)
  const [fEmp, setFEmp] = useState({ numero: '', data_empenho: '', valor: '', descricao: '' })
  const [fMed, setFMed] = useState({ numero: '', mes_referencia: '', data_medicao: '', valor: '', descricao: '', status: 'paga' })
  const [salvando, setSalvando] = useState(false)

  async function carregar() {
    const [{ data: c }, { data: e }, { data: m }] = await Promise.all([
      supabase.from('contratos').select('*').eq('id', contratoId).single(),
      supabase.from('empenhos').select('*').eq('contrato_id', contratoId).order('data_empenho'),
      supabase.from('medicoes').select('*').eq('contrato_id', contratoId).order('data_medicao').order('criado_em'),
    ])
    setContrato(c)
    setEmpenhos(e || [])
    setMedicoes(m || [])
  }

  useEffect(() => { carregar() }, [contratoId])

  const totalEmp = empenhos.reduce((a, e) => a + Number(e.valor), 0)
  const totalMed = medicoes.reduce((a, m) => a + Number(m.valor), 0)
  const saldo = totalEmp - totalMed
  const mensal = Number(contrato?.valor_mensal_previsto || 0)
  const bannerCls = saldo < 0 ? 'negativo' : saldo < mensal ? 'baixo' : 'positivo'

  async function salvarEmpenho() {
    if (!fEmp.numero || !fEmp.valor) return alert('Informe o nº e o valor.')
    setSalvando(true)
    const { error } = await supabase.from('empenhos').insert({ ...fEmp, valor: Number(fEmp.valor), contrato_id: contratoId, data_empenho: fEmp.data_empenho || null })
    if (error) { alert('Erro: ' + error.message); setSalvando(false); return }
    setFEmp({ numero: '', data_empenho: '', valor: '', descricao: '' })
    await carregar(); onAtualizado(); setSalvando(false)
  }

  async function excluirEmpenho(id) {
    if (!confirm('Excluir este empenho?')) return
    await supabase.from('empenhos').delete().eq('id', id)
    await carregar(); onAtualizado()
  }

  async function salvarMedicao() {
    if (!fMed.numero || !fMed.valor) return alert('Informe o nº e o valor.')
    setSalvando(true)
    const { error } = await supabase.from('medicoes').insert({ ...fMed, valor: Number(fMed.valor), contrato_id: contratoId, data_medicao: fMed.data_medicao || null })
    if (error) { alert('Erro: ' + error.message); setSalvando(false); return }
    setFMed({ numero: '', mes_referencia: '', data_medicao: '', valor: '', descricao: '', status: 'paga' })
    await carregar(); onAtualizado(); setSalvando(false)
  }

  async function excluirMedicao(id) {
    if (!confirm('Excluir esta medição?')) return
    await supabase.from('medicoes').delete().eq('id', id)
    await carregar(); onAtualizado()
  }

  if (!contrato) return (
    <div className="modal-bg"><div className="modal"><p style={{ color: 'var(--text3)' }}>Carregando...</p></div></div>
  )

  // Saldo acumulado por medição
  let saldoAcum = totalEmp
  const medicoesComSaldo = medicoes.map(m => {
    saldoAcum -= Number(m.valor)
    return { ...m, saldoApos: saldoAcum }
  })

  const previewSaldo = totalEmp - totalMed - (Number(fMed.valor) || 0)

  return (
    <>
      <div className="modal-bg" onClick={e => e.target === e.currentTarget && onClose()}>
        <div className="modal" style={{ width: 'min(820px,96vw)' }}>
          <div className="modal-header">
            <div>
              <h2>Contrato {contrato.numero} — {contrato.empresa}</h2>
              <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 2 }}>{contrato.local_unidade}</div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn" onClick={() => setEditando(true)}>✏ Editar</button>
              <button className="btn" onClick={onClose}>✕</button>
            </div>
          </div>

          {/* Banner saldo */}
          <div className={`saldo-banner ${bannerCls}`}>
            <div style={{ fontSize: 22 }}>{saldo < 0 ? '⊖' : saldo < mensal ? '⚠' : '✓'}</div>
            <div>
              <div style={{ fontWeight: 600, fontSize: 14 }}>
                {saldo < 0 ? `Saldo NEGATIVO: ${fmt(saldo)} — reforce o empenho urgentemente`
                  : saldo < mensal ? `Saldo baixo: ${fmt(saldo)} — insuficiente para uma medição`
                  : `Saldo disponível: ${fmt(saldo)}`}
              </div>
              <div style={{ fontSize: 11, marginTop: 2, opacity: .8 }}>
                Empenhado: {fmt(totalEmp)} · Medido/pago: {fmt(totalMed)}
              </div>
            </div>
          </div>

          <div className="tabs">
            {[['geral','Dados gerais'],['empenhos','Empenhos'],['medicoes','Medições'],['evolucao','Evolução']].map(([id,label]) => (
              <button key={id} className={`tab-btn${aba===id?' active':''}`} onClick={() => setAba(id)}>{label}</button>
            ))}
          </div>

          {/* ABA GERAL */}
          {aba === 'geral' && (
            <div>
              {[
                ['Nº contrato', contrato.numero],
                ['Empresa', contrato.empresa],
                ['Local / unidade', contrato.local_unidade],
                ['Objeto', contrato.objeto],
                ['SEI — contrato', contrato.sei_contrato],
                ['SEI — pagamentos', contrato.sei_pagamentos],
                ['Vigência', contrato.data_vencimento ? new Date(contrato.data_vencimento+'T00:00:00').toLocaleDateString('pt-BR') + (diasAte(contrato.data_vencimento) >= 0 ? ` (${diasAte(contrato.data_vencimento)}d)` : ' — encerrado') : '—'],
                ['Gestor', contrato.gestor_nome],
                ['Fiscal', contrato.fiscal_nome],
                ['Valor anual', contrato.valor_anual ? fmt(contrato.valor_anual) : '—'],
                ['Valor mensal previsto', contrato.valor_mensal_previsto ? fmt(contrato.valor_mensal_previsto) : '—'],
                ['LOA 2026', contrato.loa_2026 ? fmt(contrato.loa_2026) : '—'],
                ['Observações', contrato.observacoes],
              ].map(([l, v]) => v ? (
                <div key={l} style={{ display: 'flex', gap: 8, padding: '6px 0', borderBottom: '1px solid var(--border)', fontSize: 13 }}>
                  <div style={{ color: 'var(--text3)', minWidth: 160, flexShrink: 0, fontSize: 11 }}>{l}</div>
                  <div style={{ fontFamily: l.startsWith('SEI') ? 'monospace' : 'inherit', fontSize: l.startsWith('SEI') ? 11 : 13 }}>{v}</div>
                </div>
              ) : null)}
            </div>
          )}

          {/* ABA EMPENHOS */}
          {aba === 'empenhos' && (
            <div>
              <div style={{ background: 'var(--bg)', borderRadius: 'var(--radius)', padding: '1rem', marginBottom: '1rem' }}>
                <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 10 }}>Registrar novo empenho</div>
                <div className="form-grid">
                  <div className="field"><label>Nº do empenho *</label><input value={fEmp.numero} onChange={e => setFEmp({...fEmp,numero:e.target.value})} placeholder="2026NE000001" /></div>
                  <div className="field"><label>Data</label><input type="date" value={fEmp.data_empenho} onChange={e => setFEmp({...fEmp,data_empenho:e.target.value})} /></div>
                  <div className="field"><label>Valor (R$) *</label><input type="number" step="0.01" value={fEmp.valor} onChange={e => setFEmp({...fEmp,valor:e.target.value})} placeholder="0,00" /></div>
                  <div className="field"><label>Descrição</label><input value={fEmp.descricao} onChange={e => setFEmp({...fEmp,descricao:e.target.value})} /></div>
                </div>
                <div className="btn-row"><button className="btn primary" onClick={salvarEmpenho} disabled={salvando}>Salvar empenho</button></div>
              </div>
              <table>
                <thead><tr><th>Nº empenho</th><th>Data</th><th className="text-right">Valor</th><th>Descrição</th><th></th></tr></thead>
                <tbody>
                  {empenhos.length === 0
                    ? <tr><td colSpan={5} style={{ textAlign:'center', padding:'1.5rem', color:'var(--text3)' }}>Nenhum empenho registrado</td></tr>
                    : empenhos.map(e => (
                      <tr key={e.id}>
                        <td style={{ fontFamily:'monospace', fontSize:11 }}>{e.numero}</td>
                        <td>{e.data_empenho ? new Date(e.data_empenho+'T00:00:00').toLocaleDateString('pt-BR') : '—'}</td>
                        <td className="text-right" style={{ fontWeight:500 }}>{fmt(e.valor)}</td>
                        <td style={{ color:'var(--text3)' }}>{e.descricao||'—'}</td>
                        <td><button className="btn danger" style={{ padding:'2px 8px',fontSize:11 }} onClick={() => excluirEmpenho(e.id)}>Excluir</button></td>
                      </tr>
                    ))}
                </tbody>
              </table>
              {empenhos.length > 0 && (
                <div style={{ textAlign:'right', fontSize:13, fontWeight:600, marginTop:8, paddingTop:8, borderTop:'1px solid var(--border)' }}>
                  Total empenhado: {fmt(totalEmp)} &nbsp;|&nbsp; Saldo atual: <span style={{ color: saldo < 0 ? 'var(--red)' : 'var(--green)' }}>{fmt(saldo)}</span>
                </div>
              )}
            </div>
          )}

          {/* ABA MEDIÇÕES */}
          {aba === 'medicoes' && (
            <div>
              <div style={{ background:'var(--bg)', borderRadius:'var(--radius)', padding:'1rem', marginBottom:'1rem' }}>
                <div style={{ fontSize:12, fontWeight:600, marginBottom:10 }}>Registrar nova medição</div>
                <div className="form-grid">
                  <div className="field"><label>Nº da medição *</label><input value={fMed.numero} onChange={e => setFMed({...fMed,numero:e.target.value})} placeholder="01" /></div>
                  <div className="field"><label>Mês de referência</label><input type="month" value={fMed.mes_referencia} onChange={e => setFMed({...fMed,mes_referencia:e.target.value})} /></div>
                  <div className="field"><label>Data da medição</label><input type="date" value={fMed.data_medicao} onChange={e => setFMed({...fMed,data_medicao:e.target.value})} /></div>
                  <div className="field"><label>Valor (R$) *</label><input type="number" step="0.01" value={fMed.valor} onChange={e => setFMed({...fMed,valor:e.target.value})} placeholder="0,00" /></div>
                  <div className="field"><label>Status</label>
                    <select value={fMed.status} onChange={e => setFMed({...fMed,status:e.target.value})}>
                      <option value="paga">Paga</option>
                      <option value="pendente">Pendente</option>
                      <option value="contestada">Contestada</option>
                    </select>
                  </div>
                  <div className="field"><label>Descrição</label><input value={fMed.descricao} onChange={e => setFMed({...fMed,descricao:e.target.value})} /></div>
                </div>
                {fMed.valor && (
                  <div className={`alert ${previewSaldo < 0 ? 'danger' : previewSaldo < mensal ? 'warn' : 'ok'}`} style={{ marginTop:10, fontSize:12 }}>
                    Saldo após esta medição: <strong>{fmt(previewSaldo)}</strong>
                    {previewSaldo < 0 && ' — ATENÇÃO: saldo ficará negativo'}
                  </div>
                )}
                <div className="btn-row"><button className="btn primary" onClick={salvarMedicao} disabled={salvando}>Salvar medição</button></div>
              </div>
              <div style={{ overflowX:'auto' }}>
                <table>
                  <thead>
                    <tr>
                      <th>Nº</th><th>Mês ref.</th><th>Data</th>
                      <th className="text-right">Valor medido</th>
                      <th className="text-right">Saldo após</th>
                      <th>Status</th><th>Descrição</th><th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {medicoesComSaldo.length === 0
                      ? <tr><td colSpan={8} style={{ textAlign:'center', padding:'1.5rem', color:'var(--text3)' }}>Nenhuma medição registrada</td></tr>
                      : medicoesComSaldo.map(m => (
                        <tr key={m.id}>
                          <td>{m.numero}</td>
                          <td>{m.mes_referencia ? m.mes_referencia.replace('-','/') : '—'}</td>
                          <td>{m.data_medicao ? new Date(m.data_medicao+'T00:00:00').toLocaleDateString('pt-BR') : '—'}</td>
                          <td className="text-right" style={{ fontWeight:500 }}>{fmt(m.valor)}</td>
                          <td className="text-right" style={{ fontWeight:600, color: m.saldoApos < 0 ? 'var(--red)' : m.saldoApos < mensal ? 'var(--amber)' : 'var(--green)' }}>
                            {fmt(m.saldoApos)}
                          </td>
                          <td><span className={`badge ${m.status}`}>{m.status}</span></td>
                          <td style={{ color:'var(--text3)', fontSize:11 }}>{m.descricao||'—'}</td>
                          <td><button className="btn danger" style={{ padding:'2px 8px',fontSize:11 }} onClick={() => excluirMedicao(m.id)}>Excluir</button></td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
              {medicoes.length > 0 && (
                <div style={{ textAlign:'right', fontSize:13, fontWeight:600, marginTop:8, paddingTop:8, borderTop:'1px solid var(--border)' }}>
                  Total medido: {fmt(totalMed)} &nbsp;|&nbsp; Saldo atual: <span style={{ color: saldo < 0 ? 'var(--red)' : 'var(--green)' }}>{fmt(saldo)}</span>
                </div>
              )}
            </div>
          )}

          {/* ABA EVOLUÇÃO */}
          {aba === 'evolucao' && (
            <div>
              {medicoesComSaldo.length === 0
                ? <div style={{ textAlign:'center', padding:'2rem', color:'var(--text3)' }}>Sem medições para exibir evolução.</div>
                : (
                  <table>
                    <thead>
                      <tr>
                        <th>#</th><th>Mês</th><th className="text-right">Empenhado acum.</th>
                        <th className="text-right">Medido acum.</th><th className="text-right">Saldo</th><th>Situação</th>
                      </tr>
                    </thead>
                    <tbody>
                      {medicoesComSaldo.map((m, i) => {
                        const medAcum = medicoes.slice(0,i+1).reduce((a,x)=>a+Number(x.valor),0)
                        const sal = totalEmp - medAcum
                        return (
                          <tr key={m.id}>
                            <td style={{ color:'var(--text3)' }}>{i+1}</td>
                            <td>{m.mes_referencia ? m.mes_referencia.replace('-','/') : m.numero}</td>
                            <td className="text-right">{fmt(totalEmp)}</td>
                            <td className="text-right">{fmt(medAcum)}</td>
                            <td className="text-right" style={{ fontWeight:600, color: sal<0?'var(--red)':sal<mensal?'var(--amber)':'var(--green)' }}>{fmt(sal)}</td>
                            <td>
                              <span className={`badge ${sal<0?'negativo':sal<mensal?'alerta':'ativo'}`}>
                                {sal<0?'negativo':sal<mensal?'atenção':'ok'}
                              </span>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                )
              }
            </div>
          )}
        </div>
      </div>
      {editando && <ModalContrato contrato={contrato} onClose={() => setEditando(false)} onSalvo={() => { setEditando(false); carregar(); onAtualizado() }} />}
    </>
  )
}

// ─── DASHBOARD ───────────────────────────────────────────────
function Dashboard({ onVerContrato }) {
  const [contratos, setContratos] = useState([])
  const [loading, setLoading] = useState(true)

  async function carregar() {
    const { data: cs } = await supabase.from('contratos').select('*').order('numero')
    const { data: es } = await supabase.from('empenhos').select('contrato_id, valor')
    const { data: ms } = await supabase.from('medicoes').select('contrato_id, valor')
    const lista = (cs || []).map(c => ({
      ...c,
      totalEmp: (es||[]).filter(e=>e.contrato_id===c.id).reduce((a,e)=>a+Number(e.valor),0),
      totalMed: (ms||[]).filter(m=>m.contrato_id===c.id).reduce((a,m)=>a+Number(m.valor),0),
    }))
    setContratos(lista); setLoading(false)
  }
  useEffect(() => { carregar() }, [])

  const tEmp = contratos.reduce((a,c)=>a+c.totalEmp,0)
  const tMed = contratos.reduce((a,c)=>a+c.totalMed,0)
  const tLoa = contratos.reduce((a,c)=>a+Number(c.loa_2026||0),0)
  const negativos = contratos.filter(c=>c.totalEmp>0&&c.totalEmp-c.totalMed<0).length

  const alertas = []
  contratos.forEach(c => {
    const sal = c.totalEmp - c.totalMed
    const dias = diasAte(c.data_vencimento)
    const anual = Number(c.valor_anual || 0)
    const loa = Number(c.loa_2026 || 0)
    const percAnual = anual > 0 ? c.totalMed / anual * 100 : 0
    const percLoa   = loa   > 0 ? c.totalEmp / loa   * 100 : 0
    // Alertas empenho x medição
    if (c.totalEmp>0&&sal<0) alertas.push({ tipo:'danger', msg:`Contrato ${c.numero} (${c.empresa}): saldo de empenho NEGATIVO ${fmt(sal)}` })
    else if (c.totalEmp>0&&sal<Number(c.valor_mensal_previsto||0)) alertas.push({ tipo:'danger', msg:`Contrato ${c.numero} (${c.empresa}): saldo de empenho insuficiente ${fmt(sal)}` })
    // Alertas valor anual
    if (anual>0&&percAnual>=100) alertas.push({ tipo:'danger', msg:`Contrato ${c.numero} (${c.empresa}): total medido (${fmt(c.totalMed)}) ULTRAPASSOU o valor anual (${fmt(anual)})` })
    else if (anual>0&&percAnual>=80) alertas.push({ tipo:'warn', msg:`Contrato ${c.numero} (${c.empresa}): ${percAnual.toFixed(0)}% do valor anual já medido — saldo restante ${fmt(anual-c.totalMed)}` })
    // Alertas LOA
    if (loa>0&&percLoa>=100) alertas.push({ tipo:'danger', msg:`Contrato ${c.numero} (${c.empresa}): total empenhado (${fmt(c.totalEmp)}) ULTRAPASSOU a LOA 2026 (${fmt(loa)})` })
    else if (loa>0&&percLoa>=80) alertas.push({ tipo:'warn', msg:`Contrato ${c.numero} (${c.empresa}): ${percLoa.toFixed(0)}% da LOA já empenhado — saldo LOA restante ${fmt(loa-c.totalEmp)}` })
    // Alertas prazo
    if (c.data_vencimento&&dias>=0&&dias<=30) alertas.push({ tipo:'danger', msg:`Contrato ${c.numero} (${c.empresa}): vence em ${dias} dia${dias===1?'':'s'}` })
    else if (c.data_vencimento&&dias>30&&dias<=120) alertas.push({ tipo:'warn', msg:`Contrato ${c.numero} (${c.empresa}): vence em ${dias} dias` })
  })

  if (loading) return <div style={{ color:'var(--text3)', padding:'2rem' }}>Carregando...</div>

  return (
    <div>
      <div className="page-header"><div><h1>Dashboard</h1><p>Gestão de contratos · MPMA 2026</p></div></div>
      <div className="metric-grid">
        <div className="metric-card"><div className="lbl">Contratos ativos</div><div className="val ok">{contratos.length}</div></div>
        <div className="metric-card"><div className="lbl">Total empenhado</div><div className="val" style={{fontSize:14}}>{fmt(tEmp)}</div></div>
        <div className="metric-card"><div className="lbl">Total medido/pago</div><div className="val" style={{fontSize:14}}>{fmt(tMed)}</div></div>
        <div className="metric-card"><div className="lbl">Saldo empenhos</div><div className={`val ${tEmp-tMed<0?'danger':tEmp-tMed<500000?'warn':'ok'}`} style={{fontSize:14}}>{fmt(tEmp-tMed)}</div></div>
        <div className="metric-card"><div className="lbl">LOA 2026 total</div><div className="val" style={{fontSize:14}}>{fmt(tLoa)}</div></div>
        <div className="metric-card"><div className="lbl">Saldo negativo</div><div className={`val ${negativos>0?'danger':'ok'}`}>{negativos}</div></div>
      </div>
      <div className="card" style={{padding:0}}>
        <div style={{padding:'1rem 1rem .5rem',fontWeight:600,fontSize:14}}>Situação dos saldos</div>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Nº</th><th>Empresa</th><th className="text-right">Empenhado</th><th className="text-right">Medido</th><th className="text-right">Saldo</th><th>% exec.</th></tr></thead>
            <tbody>
              {contratos.map(c => {
                const sal = c.totalEmp-c.totalMed
                const perc = c.totalEmp>0?Math.min(100,Math.round(c.totalMed/c.totalEmp*100)):0
                return (
                  <tr key={c.id} className="clickable" onClick={() => onVerContrato(c.id)}>
                    <td style={{fontWeight:600}}>{c.numero}</td>
                    <td>{c.empresa}</td>
                    <td className="text-right">{c.totalEmp>0?fmt(c.totalEmp):<span className="text-muted">—</span>}</td>
                    <td className="text-right">{fmt(c.totalMed)}</td>
                    <td className="text-right" style={{fontWeight:600,color:sal<0?'var(--red)':sal<Number(c.valor_mensal_previsto||0)?'var(--amber)':'var(--green)'}}>{fmt(sal)}</td>
                    <td style={{minWidth:100}}>
                      {c.totalEmp>0&&<><div className="pbar"><div className={`fill ${perc>90?'danger':perc>70?'warn':'ok'}`} style={{width:perc+'%'}}></div></div><span style={{fontSize:10,color:'var(--text3)'}}>{perc}%</span></>}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
      {alertas.length>0&&(
        <div className="card" style={{marginTop:'1rem'}}>
          <div style={{fontWeight:600,fontSize:14,marginBottom:10}}>Alertas <span className="badge critico">{alertas.length}</span></div>
          {alertas.map((a,i)=><div key={i} className={`alert ${a.tipo}`}>{a.msg}</div>)}
        </div>
      )}
    </div>
  )
}

// ─── CONTRATOS ───────────────────────────────────────────────
function Contratos({ onVerContrato }) {
  const [contratos, setContratos] = useState([])
  const [loading, setLoading] = useState(true)
  const [busca, setBusca] = useState('')
  const [modalNovo, setModalNovo] = useState(false)

  async function carregar() {
    const { data: cs } = await supabase.from('contratos').select('*').order('numero')
    const { data: es } = await supabase.from('empenhos').select('contrato_id, valor')
    const { data: ms } = await supabase.from('medicoes').select('contrato_id, valor')
    setContratos((cs||[]).map(c=>({
      ...c,
      totalEmp:(es||[]).filter(e=>e.contrato_id===c.id).reduce((a,e)=>a+Number(e.valor),0),
      totalMed:(ms||[]).filter(m=>m.contrato_id===c.id).reduce((a,m)=>a+Number(m.valor),0),
    })))
    setLoading(false)
  }
  useEffect(() => { carregar() }, [])

  const lista = contratos.filter(c => !busca || (c.numero+c.empresa+(c.local_unidade||'')).toLowerCase().includes(busca.toLowerCase()))

  return (
    <div>
      <div className="page-header">
        <div><h1>Contratos</h1><p>{contratos.length} contratos cadastrados</p></div>
        <button className="btn primary" onClick={() => setModalNovo(true)}>+ Novo contrato</button>
      </div>
      <div className="search-row">
        <input placeholder="Buscar número, empresa, local..." value={busca} onChange={e => setBusca(e.target.value)} />
      </div>
      {loading ? <div style={{color:'var(--text3)',padding:'2rem'}}>Carregando...</div> : (
        <div className="card" style={{padding:0}}>
          <div className="table-wrap">
            <table>
              <thead>
                <tr><th>Nº</th><th>Empresa</th><th>Local</th><th>Vigência</th><th className="text-right">Valor anual</th><th className="text-right">Empenhado</th><th className="text-right">Medido</th><th className="text-right">Saldo</th><th>Status</th></tr>
              </thead>
              <tbody>
                {lista.length===0
                  ? <tr><td colSpan={9} style={{textAlign:'center',padding:'2rem',color:'var(--text3)'}}>Nenhum contrato encontrado</td></tr>
                  : lista.map(c => {
                    const sal = c.totalEmp-c.totalMed
                    const dias = diasAte(c.data_vencimento)
                    const st = sal<0&&c.totalEmp>0?'negativo':dias<=30&&c.data_vencimento?'critico':dias<=120&&c.data_vencimento?'alerta':'ativo'
                    return (
                      <tr key={c.id} className="clickable" onClick={() => onVerContrato(c.id)}>
                        <td style={{fontWeight:600}}>{c.numero}</td>
                        <td>{c.empresa}</td>
                        <td style={{maxWidth:140,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',color:'var(--text3)',fontSize:11}}>{c.local_unidade}</td>
                        <td style={{fontSize:11}}>
                          {c.data_vencimento?new Date(c.data_vencimento+'T00:00:00').toLocaleDateString('pt-BR'):'—'}
                          {c.data_vencimento&&dias>=0&&<div style={{fontSize:10,color:dias<=30?'var(--red)':dias<=120?'var(--amber)':'var(--text3)'}}>{dias}d</div>}
                        </td>
                        <td className="text-right">{c.valor_anual?fmt(c.valor_anual):'—'}</td>
                        <td className="text-right">{c.totalEmp>0?fmt(c.totalEmp):<span className="text-muted">—</span>}</td>
                        <td className="text-right">{fmt(c.totalMed)}</td>
                        <td className="text-right" style={{fontWeight:600,color:sal<0?'var(--red)':sal<Number(c.valor_mensal_previsto||0)?'var(--amber)':'var(--green)'}}>{fmt(sal)}</td>
                        <td><span className={`badge ${st}`}>{st}</span></td>
                      </tr>
                    )
                  })}
              </tbody>
            </table>
          </div>
        </div>
      )}
      {modalNovo && <ModalContrato onClose={() => setModalNovo(false)} onSalvo={() => { setModalNovo(false); carregar() }} />}
    </div>
  )
}

// ─── ALERTAS ─────────────────────────────────────────────────
function Alertas() {
  const [alertas, setAlertas] = useState([])
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    async function carregar() {
      const { data: cs } = await supabase.from('contratos').select('*')
      const { data: es } = await supabase.from('empenhos').select('contrato_id, valor')
      const { data: ms } = await supabase.from('medicoes').select('contrato_id, valor')
      const al = []
      ;(cs||[]).forEach(c => {
        const emp=(es||[]).filter(e=>e.contrato_id===c.id).reduce((a,e)=>a+Number(e.valor),0)
        const med=(ms||[]).filter(m=>m.contrato_id===c.id).reduce((a,m)=>a+Number(m.valor),0)
        const sal=emp-med; const dias=diasAte(c.data_vencimento)
        const anual=Number(c.valor_anual||0); const loa=Number(c.loa_2026||0)
        const percAnual=anual>0?med/anual*100:0
        const percLoa=loa>0?emp/loa*100:0
        if (emp>0&&sal<0) al.push({tipo:'danger',contrato:c.numero,empresa:c.empresa,msg:`Saldo de empenho NEGATIVO: ${fmt(sal)} — reforce urgentemente`})
        else if (emp>0&&sal<Number(c.valor_mensal_previsto||0)) al.push({tipo:'danger',contrato:c.numero,empresa:c.empresa,msg:`Saldo de empenho insuficiente: ${fmt(sal)} — menor que uma medição mensal`})
        else if (emp>0&&sal<Number(c.valor_mensal_previsto||0)*2) al.push({tipo:'warn',contrato:c.numero,empresa:c.empresa,msg:`Saldo de empenho baixo: ${fmt(sal)} — reforce em breve`})
        if (anual>0&&percAnual>=100) al.push({tipo:'danger',contrato:c.numero,empresa:c.empresa,msg:`Total medido (${fmt(med)}) ULTRAPASSOU o valor anual do contrato (${fmt(anual)})`})
        else if (anual>0&&percAnual>=80) al.push({tipo:'warn',contrato:c.numero,empresa:c.empresa,msg:`${percAnual.toFixed(0)}% do valor anual já executado — saldo restante: ${fmt(anual-med)}`})
        if (loa>0&&percLoa>=100) al.push({tipo:'danger',contrato:c.numero,empresa:c.empresa,msg:`Total empenhado (${fmt(emp)}) ULTRAPASSOU a LOA 2026 (${fmt(loa)})`})
        else if (loa>0&&percLoa>=80) al.push({tipo:'warn',contrato:c.numero,empresa:c.empresa,msg:`${percLoa.toFixed(0)}% da LOA 2026 já empenhado — saldo LOA restante: ${fmt(loa-emp)}`})
        if (c.data_vencimento&&dias>=0&&dias<=30) al.push({tipo:'danger',contrato:c.numero,empresa:c.empresa,msg:`Vence em ${dias} dia${dias===1?'':'s'} — providencie renovação`})
        else if (c.data_vencimento&&dias>30&&dias<=120) al.push({tipo:'warn',contrato:c.numero,empresa:c.empresa,msg:`Vence em ${dias} dias (${new Date(c.data_vencimento+'T00:00:00').toLocaleDateString('pt-BR')})`})
      })
      setAlertas(al); setLoading(false)
    }
    carregar()
  }, [])

  return (
    <div>
      <div className="page-header"><div><h1>Alertas</h1><p>{alertas.length} alerta{alertas.length!==1?'s':''} ativo{alertas.length!==1?'s':''}</p></div></div>
      {loading&&<div style={{color:'var(--text3)'}}>Carregando...</div>}
      {!loading&&alertas.length===0&&<div className="alert ok">Nenhum alerta ativo. Todos os contratos estão em dia.</div>}
      {alertas.filter(a=>a.tipo==='danger').length>0&&<>
        <div style={{fontSize:13,fontWeight:600,marginBottom:8,color:'var(--red)'}}>Críticos ({alertas.filter(a=>a.tipo==='danger').length})</div>
        {alertas.filter(a=>a.tipo==='danger').map((a,i)=><div key={i} className="alert danger"><strong>{a.contrato} — {a.empresa}:</strong> {a.msg}</div>)}
      </>}
      {alertas.filter(a=>a.tipo==='warn').length>0&&<>
        <div style={{fontSize:13,fontWeight:600,margin:'1rem 0 8px',color:'var(--amber)'}}>Atenção ({alertas.filter(a=>a.tipo==='warn').length})</div>
        {alertas.filter(a=>a.tipo==='warn').map((a,i)=><div key={i} className="alert warn"><strong>{a.contrato} — {a.empresa}:</strong> {a.msg}</div>)}
      </>}
    </div>
  )
}

// ─── ORÇAMENTO ───────────────────────────────────────────────
function Orcamento() {
  const [contratos, setContratos] = useState([])
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    async function carregar() {
      const { data: cs } = await supabase.from('contratos').select('*').order('numero')
      const { data: es } = await supabase.from('empenhos').select('contrato_id, valor')
      const { data: ms } = await supabase.from('medicoes').select('contrato_id, valor')
      setContratos((cs||[]).map(c=>({
        ...c,
        totalEmp:(es||[]).filter(e=>e.contrato_id===c.id).reduce((a,e)=>a+Number(e.valor),0),
        totalMed:(ms||[]).filter(m=>m.contrato_id===c.id).reduce((a,m)=>a+Number(m.valor),0),
      })))
      setLoading(false)
    }
    carregar()
  }, [])

  const tLoa=contratos.reduce((a,c)=>a+Number(c.loa_2026||0),0)
  const tAnual=contratos.reduce((a,c)=>a+Number(c.valor_anual||0),0)
  const tEmp=contratos.reduce((a,c)=>a+c.totalEmp,0)
  const tMed=contratos.reduce((a,c)=>a+c.totalMed,0)

  return (
    <div>
      <div className="page-header"><div><h1>Orçamento 2026</h1><p>LOA e execução financeira</p></div></div>
      {loading&&<div style={{color:'var(--text3)'}}>Carregando...</div>}
      {!loading&&<>
        <div className="metric-grid">
          <div className="metric-card"><div className="lbl">LOA 2026 total</div><div className="val" style={{fontSize:14}}>{fmt(tLoa)}</div></div>
          <div className="metric-card"><div className="lbl">Valor anual contratos</div><div className="val" style={{fontSize:14}}>{fmt(tAnual)}</div></div>
          <div className="metric-card"><div className="lbl">Total empenhado</div><div className="val" style={{fontSize:14}}>{fmt(tEmp)}</div></div>
          <div className="metric-card"><div className="lbl">Total pago/medido</div><div className="val" style={{fontSize:14}}>{fmt(tMed)}</div></div>
          <div className="metric-card"><div className="lbl">Saldo empenhos</div><div className={`val ${tEmp-tMed<0?'danger':'ok'}`} style={{fontSize:14}}>{fmt(tEmp-tMed)}</div></div>
          <div className="metric-card"><div className="lbl">Dif. LOA × Anual</div><div className={`val ${tLoa-tAnual<0?'danger':'ok'}`} style={{fontSize:14}}>{fmt(tLoa-tAnual)}</div></div>
        </div>
        <div className="card" style={{padding:0}}>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Nº</th><th>Empresa</th><th className="text-right">LOA 2026</th><th className="text-right">Valor anual</th><th className="text-right">Empenhado</th><th className="text-right">Medido/pago</th><th className="text-right">Saldo empenho</th></tr></thead>
              <tbody>
                {contratos.map(c=>{
                  const sal=c.totalEmp-c.totalMed
                  return(
                    <tr key={c.id}>
                      <td style={{fontWeight:600}}>{c.numero}</td><td>{c.empresa}</td>
                      <td className="text-right">{fmt(c.loa_2026)}</td>
                      <td className="text-right">{c.valor_anual?fmt(c.valor_anual):'—'}</td>
                      <td className="text-right">{c.totalEmp>0?fmt(c.totalEmp):'—'}</td>
                      <td className="text-right">{fmt(c.totalMed)}</td>
                      <td className="text-right" style={{fontWeight:600,color:sal<0?'var(--red)':sal<Number(c.valor_mensal_previsto||0)?'var(--amber)':'var(--green)'}}>{fmt(sal)}</td>
                    </tr>
                  )
                })}
              </tbody>
              <tfoot>
                <tr style={{fontWeight:700,borderTop:'2px solid var(--border2)'}}>
                  <td colSpan={2}>Total</td>
                  <td className="text-right">{fmt(tLoa)}</td>
                  <td className="text-right">{fmt(tAnual)}</td>
                  <td className="text-right">{fmt(tEmp)}</td>
                  <td className="text-right">{fmt(tMed)}</td>
                  <td className="text-right" style={{color:tEmp-tMed<0?'var(--red)':'var(--green)'}}>{fmt(tEmp-tMed)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </>}
    </div>
  )
}

// ─── APP SHELL ───────────────────────────────────────────────
function AppShell() {
  const { user } = useAuth()
  const [pagina, setPagina] = useState('dashboard')
  const [contratoSel, setContratoSel] = useState(null)
  const [qtdAlertas, setQtdAlertas] = useState(0)
  const [tick, setTick] = useState(0)

  useEffect(() => {
    if (!user) return
    async function contarAlertas() {
      const { data: cs } = await supabase.from('contratos').select('id,data_vencimento,valor_mensal_previsto')
      const { data: es } = await supabase.from('empenhos').select('contrato_id,valor')
      const { data: ms } = await supabase.from('medicoes').select('contrato_id,valor')
      let n = 0
      ;(cs||[]).forEach(c => {
        const emp=(es||[]).filter(e=>e.contrato_id===c.id).reduce((a,e)=>a+Number(e.valor),0)
        const med=(ms||[]).filter(m=>m.contrato_id===c.id).reduce((a,m)=>a+Number(m.valor),0)
        const sal=emp-med; const dias=diasAte(c.data_vencimento)
        if (emp>0&&sal<=Number(c.valor_mensal_previsto||0)) n++
        if (c.data_vencimento&&dias>=0&&dias<=120) n++
      })
      setQtdAlertas(n)
    }
    contarAlertas()
  }, [user, tick])

  if (!user) return <Login />

  function handleVerContrato(id) { setContratoSel(id) }
  function handleAtualizado() { setTick(t=>t+1) }

  return (
    <div className="layout">
      <Sidebar pagina={pagina} setPagina={setPagina} qtdAlertas={qtdAlertas} />
      <main className="main">
        {pagina==='dashboard' && <Dashboard onVerContrato={handleVerContrato} />}
        {pagina==='contratos' && <Contratos onVerContrato={handleVerContrato} />}
        {pagina==='alertas'   && <Alertas />}
        {pagina==='orcamento' && <Orcamento />}
      </main>
      {contratoSel && <ModalDetalhe contratoId={contratoSel} onClose={() => setContratoSel(null)} onAtualizado={handleAtualizado} />}
    </div>
  )
}

export default function App() {
  return <AuthProvider><AppShell /></AuthProvider>
}
