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
  { email: 'coea@mpma.mp.br', senha: 'coea@mpma',  nome: 'COEA', perfil: 'visualizador' },
  { email: 'coea@mpma.mp.br', senha: 'Mpma@coea',  nome: 'Administrador COEA', perfil: 'admin' },
  { email: 'ravilson@mpma.mp.br', senha: 'Mpma@2026', nome: 'Ravilson', perfil: 'admin' },
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

// ─── CÁLCULO DE PERÍODOS DE VIGÊNCIA (renovação anual do contrato) ──
// Cada aditivo de prazo inicia um novo "período" contratual, no qual o valor
// do contrato retorna ao valor anual original, somado aos aditivos de valor
// registrados dentro daquele período específico.
function calcularPeriodosContrato(contrato, aditivosContrato) {
  const aditivosPrazo = (aditivosContrato || [])
    .filter(a => (a.tipo === 'prazo' || a.tipo === 'prazo_valor') && a.nova_vigencia)
    .slice()
    .sort((a, b) => new Date(a.data_assinatura) - new Date(b.data_assinatura))

  const periodos = [{ inicio: null, fim: contrato?.data_vencimento || null, valorBase: Number(contrato?.valor_anual || 0) }]
  let fimAtual = contrato?.data_vencimento || null
  aditivosPrazo.forEach(ad => {
    const inicioNovo = fimAtual
    fimAtual = ad.nova_vigencia
    periodos.push({ inicio: inicioNovo, fim: fimAtual, valorBase: Number(contrato?.valor_anual || 0), aditivoId: ad.id })
  })
  return periodos
}

// Encontra o índice do período ao qual uma data pertence (o último período cujo início é <= data)
function indicePeriodo(periodos, dataStr) {
  if (!dataStr) return periodos.length - 1
  const d = new Date(dataStr + 'T00:00:00')
  let idx = 0
  for (let i = 0; i < periodos.length; i++) {
    const ini = periodos[i].inicio ? new Date(periodos[i].inicio + 'T00:00:00') : null
    if (!ini || d >= ini) idx = i
  }
  return idx
}

// Calcula, para um contrato, o valor e o saldo de cada período de vigência,
// considerando aditivos de valor e medições realizadas em cada período.
function calcularSituacaoPeriodos(contrato, aditivosContrato, medicoesContrato) {
  const periodos = calcularPeriodosContrato(contrato, aditivosContrato)
  const aditivosValor = (aditivosContrato || []).filter(a => a.tipo === 'valor' || a.tipo === 'prazo_valor')

  const valores = periodos.map((p, i) => {
    const extra = aditivosValor
      .filter(av => indicePeriodo(periodos, av.data_assinatura) === i)
      .reduce((s, av) => s + Number(av.valor_acrescido || 0), 0)
    return p.valorBase + extra
  })

  const medidos = periodos.map(() => 0)
  ;(medicoesContrato || []).forEach(m => {
    const dataRef = m.data_medicao || (m.mes_referencia ? m.mes_referencia + '-01' : null)
    const idx = indicePeriodo(periodos, dataRef)
    medidos[idx] += Number(m.valor || 0)
  })

  const idxAtual = periodos.length - 1
  return {
    periodos, valores, medidos, idxAtual,
    valorPeriodoAtual: valores[idxAtual],
    medidoPeriodoAtual: medidos[idxAtual],
    saldoPeriodoAtual: valores[idxAtual] - medidos[idxAtual],
  }
}

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
function Sidebar({ pagina, setPagina, qtdAlertas, area, mudarArea }) {
  const { user, logout } = useAuth()
  const [modalRelatorio, setModalRelatorio] = useState(false)
  const itens = [
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'contratos', label: 'Contratos' },
    { id: 'alertas',   label: 'Alertas', badge: qtdAlertas },
    { id: 'orcamento', label: 'Orçamento 2026' },
    { id: 'previsao',  label: 'Previsão de Gastos' },
  ]
  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <span>MPMA</span>
        <small>Gestão de Contratos</small>
      </div>
      <div style={{ padding: '0 12px 12px', borderBottom: '1px solid var(--border)', marginBottom: 8 }}>
        <div style={{ fontSize: 10, color: 'var(--text3)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: .5 }}>Área</div>
        <button className={`area-btn${area==='manutencao'?' active':''}`} onClick={() => mudarArea('manutencao')}>
          Manutenção Predial
        </button>
        <button className={`area-btn${area==='fiscalizacao'?' active':''}`} onClick={() => mudarArea('fiscalizacao')}>
          Fiscalização de Obras
        </button>
      </div>
      <nav style={{ flex: 1 }}>
        {itens.map(i => (
          <button key={i.id} className={`nav-item${pagina === i.id ? ' active' : ''}`} onClick={() => setPagina(i.id)}>
            {i.label}
            {i.badge > 0 && <span className="badge-count">{i.badge}</span>}
          </button>
        ))}
      </nav>
      <div style={{ padding: '.5rem 1rem 0' }}>
        <button className='nav-item' style={{width:'100%'}} onClick={() => setModalRelatorio(true)}>📄 Gerar Relatório</button>
      </div>
      <div style={{ padding: '1rem', borderTop: '1px solid var(--border)' }}>
        <div style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 8 }}>
          <div style={{ color: 'var(--text2)', fontWeight: 500 }}>{user?.nome}</div>
          <div>{user?.perfil}</div>
        </div>
        <button className="btn" style={{ width: '100%', fontSize: 12 }} onClick={logout}>Sair</button>
      </div>
      {modalRelatorio && <ModalRelatorio area={area} onClose={() => setModalRelatorio(false)} />}
    </aside>
  )
}

// ─── MODAL RELATÓRIO ─────────────────────────────────────────
function ModalRelatorio({ area, onClose }) {
  const [contratos, setContratos] = useState([])
  const [contratoId, setContratoId] = useState('')
  const [dataInicio, setDataInicio] = useState('')
  const [dataFim, setDataFim] = useState('')
  const [gerando, setGerando] = useState(false)

  useEffect(() => {
    supabase.from('contratos').select('id,numero,empresa').eq('area', area).order('numero').then(({ data }) => setContratos(data || []))
  }, [area])

  async function handleGerar() {
    setGerando(true)
    await gerarRelatorio(area, { contratoId: contratoId || null, dataInicio: dataInicio || null, dataFim: dataFim || null })
    setGerando(false)
    onClose()
  }

  return (
    <div className="modal-bg" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 460 }}>
        <div className="modal-header">
          <h2>Gerar relatório</h2>
          <button className="btn" onClick={onClose}>✕</button>
        </div>
        <div className="field" style={{ marginBottom: 12 }}>
          <label>Contrato</label>
          <select value={contratoId} onChange={e => setContratoId(e.target.value)}>
            <option value="">Todos os contratos da área</option>
            {contratos.map(c => <option key={c.id} value={c.id}>{c.numero} — {c.empresa}</option>)}
          </select>
        </div>
        <div className="form-grid">
          <div className="field"><label>Data início</label><input type="date" value={dataInicio} onChange={e => setDataInicio(e.target.value)} /></div>
          <div className="field"><label>Data fim</label><input type="date" value={dataFim} onChange={e => setDataFim(e.target.value)} /></div>
        </div>
        <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 10 }}>
          Deixe as datas em branco para incluir todo o histórico. Empenhos, medições e aditivos serão filtrados pelo período escolhido — o relatório sempre mostra também a quebra por período de vigência do contrato (renovações), independente do filtro de datas.
        </div>
        <div className="btn-row">
          <button className="btn" onClick={onClose}>Cancelar</button>
          <button className="btn primary" onClick={handleGerar} disabled={gerando}>{gerando ? 'Gerando...' : 'Gerar relatório'}</button>
        </div>
      </div>
    </div>
  )
}


function ModalContrato({ contrato, onClose, onSalvo, areaAtual }) {
  const vazio = { numero: '', empresa: '', sei_contrato: '', sei_pagamentos: '', local_unidade: '', objeto: '', gestor_nome: '', fiscal_nome: '', data_vencimento: '', valor_anual: '', valor_mensal_previsto: '', loa_2026: '', observacoes: '', area: areaAtual || 'manutencao' }
  const [f, setF] = useState(contrato ? { ...vazio, ...contrato, valor_anual: contrato.valor_anual || '', valor_mensal_previsto: contrato.valor_mensal_previsto || '', loa_2026: contrato.loa_2026 || '' } : vazio)
  const [salvando, setSalvando] = useState(false)
  const upd = (k, v) => setF(p => ({ ...p, [k]: v }))

  async function salvar() {
    if (!f.numero.trim() || !f.empresa.trim()) return alert('Informe o número e a empresa.')
    setSalvando(true)
    const payload = {
      numero: f.numero.trim(),
      empresa: f.empresa.trim(),
      area: contrato?.area || areaAtual || 'manutencao',
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
  const { user } = useAuth()
  const isAdmin = user?.perfil === 'admin'
  const [contrato, setContrato] = useState(null)
  const [empenhos, setEmpenhos] = useState([])
  const [medicoes, setMedicoes] = useState([])
  const [aba, setAba] = useState('geral')
  const [editando, setEditando] = useState(false)
  const [fEmp, setFEmp] = useState({ numero: '', data_empenho: '', valor: '', descricao: '' })
  const [fMed, setFMed] = useState({ numero: '', mes_referencia: '', data_medicao: '', valor: '', descricao: '', status: 'paga' })
  const [salvando, setSalvando] = useState(false)
  const [editandoEmpId, setEditandoEmpId] = useState(null)
  const [editandoMedId, setEditandoMedId] = useState(null)
  const [editandoAdiId, setEditandoAdiId] = useState(null)

  const [aditivos, setAditivos] = useState([])
  const [fAdi, setFAdi] = useState({ numero:'', sei:'', data_assinatura:'', tipo:'prazo', meses_acrescidos:12, nova_vigencia:'', valor_acrescido:'', indice_reajuste:'SINAPI', percentual_reajuste:'', valor_mensal_anterior:'', valor_mensal_novo:'', descricao:'' })

  const [previsoes, setPrevisoes] = useState([])
  const [fPrev, setFPrev] = useState({ descricao:'', valor_previsto:'', data_prevista:'', status:'planejado', observacoes:'' })
  const [editandoPrevId, setEditandoPrevId] = useState(null)

  async function carregar() {
    const [{ data: c }, { data: e }, { data: m }, { data: a }, { data: p }] = await Promise.all([
      supabase.from('contratos').select('*').eq('id', contratoId).single(),
      supabase.from('empenhos').select('*').eq('contrato_id', contratoId).order('data_empenho'),
      supabase.from('medicoes').select('*').eq('contrato_id', contratoId).order('data_medicao').order('criado_em'),
      supabase.from('aditivos').select('*').eq('contrato_id', contratoId).order('data_assinatura'),
      supabase.from('previsoes_orcamento').select('*').eq('contrato_id', contratoId).order('data_prevista'),
    ])
    setContrato(c)
    setEmpenhos(e || [])
    setMedicoes(m || [])
    setAditivos(a || [])
    setPrevisoes(p || [])
  }

  useEffect(() => { carregar() }, [contratoId])

  const totalEmp = empenhos.reduce((a, e) => a + Number(e.valor), 0)
  const totalMed = medicoes.reduce((a, m) => a + Number(m.valor), 0)
  const saldo = totalEmp - totalMed

  // Situação por período de vigência: cada aditivo de prazo renova o valor do contrato
  const situacaoPeriodos = calcularSituacaoPeriodos(contrato, aditivos, medicoes)
  const valorAnualOriginal = Number(contrato?.valor_anual || 0)
  const valorAnualAditivos = aditivos.filter(a => a.tipo === 'valor' || a.tipo === 'prazo_valor').reduce((s, a) => s + Number(a.valor_acrescido || 0), 0)
  const valorAnualVigente = situacaoPeriodos.valorPeriodoAtual
  const medidoPeriodoAtual = situacaoPeriodos.medidoPeriodoAtual

  // Valor mensal vigente: aplica reajustes em ordem cronológica
  const mensalVigente = (() => {
    let m = Number(contrato?.valor_mensal_previsto || 0)
    aditivos.filter(a => a.tipo === 'reajuste' && Number(a.valor_mensal_novo) > 0)
      .sort((a, b) => new Date(a.data_assinatura) - new Date(b.data_assinatura))
      .forEach(a => { m = Number(a.valor_mensal_novo) })
    return m
  })()

  // Vigência vigente: aplica aditivos de prazo em ordem
  const vigenciaVigente = (() => {
    let d = contrato?.data_vencimento || null
    aditivos.filter(a => (a.tipo === 'prazo' || a.tipo === 'prazo_valor') && a.nova_vigencia)
      .sort((a, b) => new Date(a.data_assinatura) - new Date(b.data_assinatura))
      .forEach(a => { d = a.nova_vigencia })
    return d
  })()

  const mensal = mensalVigente || Number(contrato?.valor_mensal_previsto || 0)
  const loa = Number(contrato?.loa_2026 || 0)
  const saldoLoa = loa - totalEmp
  const saldoAnual = situacaoPeriodos.saldoPeriodoAtual
  const bannerCls = saldo < 0 ? 'negativo' : saldo < mensal ? 'baixo' : 'positivo'

  // Previsões de serviços/orçamentos futuros ainda não empenhados
  const totalPrevisto = previsoes.filter(p => p.status === 'planejado' || p.status === 'em_execucao').reduce((s, p) => s + Number(p.valor_previsto || 0), 0)
  const saldoProjetadoEmpenho = saldo - totalPrevisto
  const saldoProjetadoPeriodo = saldoAnual - totalPrevisto

  function editarAditivo(a) {
    setEditandoAdiId(a.id)
    setFAdi({
      numero: a.numero, sei: a.sei || '', data_assinatura: a.data_assinatura || '', tipo: a.tipo,
      meses_acrescidos: a.meses_acrescidos || 12, nova_vigencia: a.nova_vigencia || '',
      valor_acrescido: a.valor_acrescido || '', indice_reajuste: a.indice_reajuste || 'SINAPI',
      percentual_reajuste: a.percentual_reajuste || '', valor_mensal_anterior: a.valor_mensal_anterior || '',
      valor_mensal_novo: a.valor_mensal_novo || '', descricao: a.descricao || ''
    })
  }

  function cancelarEdicaoAditivo() {
    setEditandoAdiId(null)
    setFAdi({ numero:'', sei:'', data_assinatura:'', tipo:'prazo', meses_acrescidos:12, nova_vigencia:'', valor_acrescido:'', indice_reajuste:'SINAPI', percentual_reajuste:'', valor_mensal_anterior:'', valor_mensal_novo:'', descricao:'' })
  }

  async function salvarAditivo() {
    if (!fAdi.numero || !fAdi.data_assinatura || !fAdi.tipo) return alert('Informe o nº, data e tipo do aditivo.')
    setSalvando(true)
    const payload = {
      contrato_id: contratoId,
      numero: fAdi.numero,
      sei: fAdi.sei || null,
      data_assinatura: fAdi.data_assinatura,
      tipo: fAdi.tipo,
      meses_acrescidos: Number(fAdi.meses_acrescidos) || 0,
      nova_vigencia: fAdi.nova_vigencia || null,
      valor_acrescido: Number(fAdi.valor_acrescido) || 0,
      indice_reajuste: (fAdi.tipo === 'reajuste') ? fAdi.indice_reajuste : null,
      percentual_reajuste: Number(fAdi.percentual_reajuste) || 0,
      valor_mensal_anterior: Number(fAdi.valor_mensal_anterior) || 0,
      valor_mensal_novo: Number(fAdi.valor_mensal_novo) || 0,
      descricao: fAdi.descricao || null,
    }
    const { error } = editandoAdiId
      ? await supabase.from('aditivos').update(payload).eq('id', editandoAdiId)
      : await supabase.from('aditivos').insert(payload)
    if (error) { alert('Erro: ' + error.message); setSalvando(false); return }
    setFAdi({ numero:'', sei:'', data_assinatura:'', tipo:'prazo', meses_acrescidos:12, nova_vigencia:'', valor_acrescido:'', indice_reajuste:'SINAPI', percentual_reajuste:'', valor_mensal_anterior:'', valor_mensal_novo:'', descricao:'' })
    setEditandoAdiId(null)
    await carregar(); onAtualizado(); setSalvando(false)
  }

  async function excluirAditivo(id) {
    if (!confirm('Excluir este aditivo? Os cálculos serão revertidos.')) return
    await supabase.from('aditivos').delete().eq('id', id)
    if (editandoAdiId === id) cancelarEdicaoAditivo()
    await carregar(); onAtualizado()
  }

  function editarPrevisao(p) {
    setEditandoPrevId(p.id)
    setFPrev({ descricao: p.descricao, valor_previsto: p.valor_previsto, data_prevista: p.data_prevista || '', status: p.status || 'planejado', observacoes: p.observacoes || '' })
  }

  function cancelarEdicaoPrevisao() {
    setEditandoPrevId(null)
    setFPrev({ descricao:'', valor_previsto:'', data_prevista:'', status:'planejado', observacoes:'' })
  }

  async function salvarPrevisao() {
    if (!fPrev.descricao || !fPrev.valor_previsto) return alert('Informe a descrição e o valor previsto.')
    setSalvando(true)
    const payload = {
      contrato_id: contratoId,
      descricao: fPrev.descricao,
      valor_previsto: Number(fPrev.valor_previsto),
      data_prevista: fPrev.data_prevista || null,
      status: fPrev.status,
      observacoes: fPrev.observacoes || null,
    }
    const { error } = editandoPrevId
      ? await supabase.from('previsoes_orcamento').update(payload).eq('id', editandoPrevId)
      : await supabase.from('previsoes_orcamento').insert(payload)
    if (error) { alert('Erro: ' + error.message); setSalvando(false); return }
    setFPrev({ descricao:'', valor_previsto:'', data_prevista:'', status:'planejado', observacoes:'' })
    setEditandoPrevId(null)
    await carregar(); onAtualizado(); setSalvando(false)
  }

  async function excluirPrevisao(id) {
    if (!confirm('Excluir esta previsão de orçamento?')) return
    await supabase.from('previsoes_orcamento').delete().eq('id', id)
    if (editandoPrevId === id) cancelarEdicaoPrevisao()
    await carregar(); onAtualizado()
  }

  function editarEmpenho(e) {
    setEditandoEmpId(e.id)
    setFEmp({ numero: e.numero, data_empenho: e.data_empenho || '', valor: e.valor, descricao: e.descricao || '' })
  }

  function cancelarEdicaoEmpenho() {
    setEditandoEmpId(null)
    setFEmp({ numero: '', data_empenho: '', valor: '', descricao: '' })
  }

  async function salvarEmpenho() {
    if (!fEmp.numero || !fEmp.valor) return alert('Informe o nº e o valor.')
    setSalvando(true)
    const payload = { ...fEmp, valor: Number(fEmp.valor), contrato_id: contratoId, data_empenho: fEmp.data_empenho || null }
    const { error } = editandoEmpId
      ? await supabase.from('empenhos').update(payload).eq('id', editandoEmpId)
      : await supabase.from('empenhos').insert(payload)
    if (error) { alert('Erro: ' + error.message); setSalvando(false); return }
    setFEmp({ numero: '', data_empenho: '', valor: '', descricao: '' })
    setEditandoEmpId(null)
    await carregar(); onAtualizado(); setSalvando(false)
  }

  async function excluirEmpenho(id) {
    if (!confirm('Excluir este empenho?')) return
    await supabase.from('empenhos').delete().eq('id', id)
    if (editandoEmpId === id) cancelarEdicaoEmpenho()
    await carregar(); onAtualizado()
  }

  function editarMedicao(m) {
    setEditandoMedId(m.id)
    setFMed({ numero: m.numero, mes_referencia: m.mes_referencia || '', data_medicao: m.data_medicao || '', valor: m.valor, descricao: m.descricao || '', status: m.status || 'paga' })
  }

  function cancelarEdicaoMedicao() {
    setEditandoMedId(null)
    setFMed({ numero: '', mes_referencia: '', data_medicao: '', valor: '', descricao: '', status: 'paga' })
  }

  async function salvarMedicao() {
    if (!fMed.numero || !fMed.valor) return alert('Informe o nº e o valor.')
    setSalvando(true)
    const payload = { ...fMed, valor: Number(fMed.valor), contrato_id: contratoId, data_medicao: fMed.data_medicao || null }
    const { error } = editandoMedId
      ? await supabase.from('medicoes').update(payload).eq('id', editandoMedId)
      : await supabase.from('medicoes').insert(payload)
    if (error) { alert('Erro: ' + error.message); setSalvando(false); return }
    setFMed({ numero: '', mes_referencia: '', data_medicao: '', valor: '', descricao: '', status: 'paga' })
    setEditandoMedId(null)
    await carregar(); onAtualizado(); setSalvando(false)
  }

  async function excluirMedicao(id) {
    if (!confirm('Excluir esta medição?')) return
    await supabase.from('medicoes').delete().eq('id', id)
    if (editandoMedId === id) cancelarEdicaoMedicao()
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
              {isAdmin && <button className="btn" onClick={() => setEditando(true)}>✏ Editar</button>}
              <button className="btn" onClick={onClose}>✕</button>
            </div>
          </div>

          {!isAdmin && (
            <div className="alert info" style={{marginBottom:10, fontSize:11}}>
              Modo visualização — apenas administradores podem editar empenhos, medições e aditivos.
            </div>
          )}
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
            {[['geral','Dados gerais'],['empenhos','Empenhos'],['medicoes','Medições'],['evolucao','Evolução'],['aditivos','Aditivos'],['previsao','Previsão']].map(([id,label]) => (
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
              {isAdmin && <div style={{ background: 'var(--bg)', borderRadius: 'var(--radius)', padding: '1rem', marginBottom: '1rem' }}>
                <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 10 }}>{editandoEmpId ? 'Editando empenho' : 'Registrar novo empenho'}</div>
                <div className="form-grid">
                  <div className="field"><label>Nº do empenho *</label><input value={fEmp.numero} onChange={e => setFEmp({...fEmp,numero:e.target.value})} placeholder="2026NE000001" /></div>
                  <div className="field"><label>Data</label><input type="date" value={fEmp.data_empenho} onChange={e => setFEmp({...fEmp,data_empenho:e.target.value})} /></div>
                  <div className="field"><label>Valor (R$) *</label><input type="number" step="0.01" value={fEmp.valor} onChange={e => setFEmp({...fEmp,valor:e.target.value})} placeholder="0,00" /></div>
                  <div className="field"><label>Descrição</label><input value={fEmp.descricao} onChange={e => setFEmp({...fEmp,descricao:e.target.value})} /></div>
                </div>
                <div className="btn-row">
                  {editandoEmpId && <button className="btn" onClick={cancelarEdicaoEmpenho}>Cancelar</button>}
                  <button className="btn primary" onClick={salvarEmpenho} disabled={salvando}>{editandoEmpId ? 'Atualizar empenho' : 'Salvar empenho'}</button>
                </div>
              </div>}
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
                        <td>{isAdmin && <div style={{display:'flex',gap:4}}><button className="btn" style={{ padding:'2px 8px',fontSize:11 }} onClick={() => editarEmpenho(e)}>Editar</button><button className="btn danger" style={{ padding:'2px 8px',fontSize:11 }} onClick={() => excluirEmpenho(e.id)}>Excluir</button></div>}</td>
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
              {isAdmin && <div style={{ background:'var(--bg)', borderRadius:'var(--radius)', padding:'1rem', marginBottom:'1rem' }}>
                <div style={{ fontSize:12, fontWeight:600, marginBottom:10 }}>{editandoMedId ? 'Editando medição' : 'Registrar nova medição'}</div>
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
                <div className="btn-row">
                  {editandoMedId && <button className="btn" onClick={cancelarEdicaoMedicao}>Cancelar</button>}
                  <button className="btn primary" onClick={salvarMedicao} disabled={salvando}>{editandoMedId ? 'Atualizar medição' : 'Salvar medição'}</button>
                </div>
              </div>}
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
                          <td>{isAdmin && <div style={{display:'flex',gap:4}}><button className="btn" style={{ padding:'2px 8px',fontSize:11 }} onClick={() => editarMedicao(m)}>Editar</button><button className="btn danger" style={{ padding:'2px 8px',fontSize:11 }} onClick={() => excluirMedicao(m.id)}>Excluir</button></div>}</td>
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


          {/* ABA ADITIVOS */}
          {aba === 'aditivos' && (
            <div>
              {valorAnualVigente > Number(contrato?.loa_2026||0) && Number(contrato?.loa_2026||0) > 0 && (
                <div className="alert danger" style={{marginBottom:10}}>
                  Valor anual vigente ({fmt(valorAnualVigente)}) supera a LOA 2026 ({fmt(Number(contrato?.loa_2026||0))}) em {fmt(valorAnualVigente - Number(contrato?.loa_2026||0))} — atualize a LOA.
                </div>
              )}
              {vigenciaVigente && vigenciaVigente !== contrato?.data_vencimento && (
                <div className="alert info" style={{marginBottom:10}}>
                  Vigência atualizada por aditivo: {new Date(vigenciaVigente+'T00:00:00').toLocaleDateString('pt-BR')} ({diasAte(vigenciaVigente)}d restantes)
                </div>
              )}
              {isAdmin && <div style={{background:'var(--bg)',borderRadius:'var(--radius)',padding:'1rem',marginBottom:'1rem'}}>
                <div style={{fontSize:12,fontWeight:600,marginBottom:10}}>{editandoAdiId ? 'Editando aditivo' : 'Registrar novo aditivo'}</div>
                <div className="form-grid">
                  <div className="field"><label>Nº do aditivo *</label><input value={fAdi.numero} onChange={e=>setFAdi({...fAdi,numero:e.target.value})} placeholder="1º Aditivo" /></div>
                  <div className="field"><label>Data de assinatura *</label><input type="date" value={fAdi.data_assinatura} onChange={e=>setFAdi({...fAdi,data_assinatura:e.target.value})} /></div>
                  <div className="field"><label>Tipo *</label>
                    <select value={fAdi.tipo} onChange={e=>setFAdi({...fAdi,tipo:e.target.value})}>
                      <option value="prazo">Aditivo de prazo</option>
                      <option value="valor">Aditivo de valor</option>
                      <option value="reajuste">Reajuste (SINAPI/INCC)</option>
                      <option value="prazo_valor">Prazo + Valor</option>
                    </select>
                  </div>
                  <div className="field"><label>SEI do aditivo</label><input value={fAdi.sei} onChange={e=>setFAdi({...fAdi,sei:e.target.value})} placeholder="19.13.0048.000..." /></div>
                </div>
                {(fAdi.tipo==='prazo'||fAdi.tipo==='prazo_valor') && (
                  <div className="form-grid" style={{marginTop:10}}>
                    <div className="field"><label>Meses acrescidos</label><input type="number" value={fAdi.meses_acrescidos} onChange={e=>setFAdi({...fAdi,meses_acrescidos:e.target.value})} placeholder="12" /></div>
                    <div className="field"><label>Nova data de vencimento</label><input type="date" value={fAdi.nova_vigencia} onChange={e=>setFAdi({...fAdi,nova_vigencia:e.target.value})} /></div>
                  </div>
                )}
                {(fAdi.tipo==='valor'||fAdi.tipo==='prazo_valor') && (
                  <div className="form-grid" style={{marginTop:10}}>
                    <div className="field"><label>Valor acrescido (R$)</label><input type="number" step="0.01" value={fAdi.valor_acrescido} onChange={e=>setFAdi({...fAdi,valor_acrescido:e.target.value})} placeholder="0,00" /></div>
                  </div>
                )}
                {fAdi.tipo==='reajuste' && (
                  <div className="form-grid" style={{marginTop:10}}>
                    <div className="field"><label>Índice</label>
                      <select value={fAdi.indice_reajuste} onChange={e=>setFAdi({...fAdi,indice_reajuste:e.target.value})}>
                        <option value="SINAPI">SINAPI</option>
                        <option value="INCC">INCC</option>
                        <option value="outro">Outro</option>
                      </select>
                    </div>
                    <div className="field"><label>Percentual (%)</label>
                      <input type="number" step="0.0001" value={fAdi.percentual_reajuste}
                        onChange={e=>{
                          const perc=Number(e.target.value)
                          const ant=Number(fAdi.valor_mensal_anterior)||mensal
                          const novo=ant*(1+perc/100)
                          setFAdi({...fAdi,percentual_reajuste:e.target.value,valor_mensal_anterior:ant.toFixed(2),valor_mensal_novo:novo.toFixed(2)})
                        }} placeholder="5.00" />
                    </div>
                    <div className="field"><label>Valor mensal anterior (R$)</label><input type="number" step="0.01" value={fAdi.valor_mensal_anterior} onChange={e=>setFAdi({...fAdi,valor_mensal_anterior:e.target.value})} /></div>
                    <div className="field"><label>Valor mensal novo (R$)</label><input type="number" step="0.01" value={fAdi.valor_mensal_novo} onChange={e=>setFAdi({...fAdi,valor_mensal_novo:e.target.value})} /></div>
                  </div>
                )}
                <div className="form-grid full" style={{marginTop:10}}>
                  <div className="field"><label>Descrição</label><input value={fAdi.descricao} onChange={e=>setFAdi({...fAdi,descricao:e.target.value})} placeholder="Ex: Renovação anual com reajuste SINAPI 4,85%" /></div>
                </div>
                <div className="btn-row">
                  {editandoAdiId && <button className="btn" onClick={cancelarEdicaoAditivo}>Cancelar</button>}
                  <button className="btn primary" onClick={salvarAditivo} disabled={salvando}>{editandoAdiId ? 'Atualizar aditivo' : 'Salvar aditivo'}</button>
                </div>
              </div>}
              {aditivos.length===0
                ? <div style={{textAlign:'center',padding:'1.5rem',color:'var(--text3)'}}>Nenhum aditivo registrado.</div>
                : <>
                  <div style={{overflowX:'auto'}}>
                    <table>
                      <thead><tr><th>Nº</th><th>Data</th><th>Tipo</th><th>SEI</th><th className="text-right">Valor acrescido</th><th>Nova vigência</th><th>Reajuste</th><th>Descrição</th><th></th></tr></thead>
                      <tbody>
                        {aditivos.map(a=>(
                          <tr key={a.id}>
                            <td style={{fontWeight:600}}>{a.numero}</td>
                            <td>{a.data_assinatura?new Date(a.data_assinatura+'T00:00:00').toLocaleDateString('pt-BR'):'—'}</td>
                            <td><span className={`badge ${a.tipo==='reajuste'?'info':a.tipo.includes('valor')?'ativo':'alerta'}`}>{a.tipo==='prazo'?'Prazo':a.tipo==='valor'?'Valor':a.tipo==='reajuste'?'Reajuste':'Prazo+Valor'}</span></td>
                            <td style={{fontFamily:'monospace',fontSize:10}}>{a.sei||'—'}</td>
                            <td className="text-right">{Number(a.valor_acrescido)>0?fmt(a.valor_acrescido):'—'}</td>
                            <td>{a.nova_vigencia?new Date(a.nova_vigencia+'T00:00:00').toLocaleDateString('pt-BR'):'—'}</td>
                            <td>{a.indice_reajuste&&Number(a.percentual_reajuste)>0?`${a.indice_reajuste} ${Number(a.percentual_reajuste).toFixed(2)}%`:'—'}</td>
                            <td style={{color:'var(--text3)',fontSize:11}}>{a.descricao||'—'}</td>
                            <td>{isAdmin && <div style={{display:'flex',gap:4}}><button className="btn" style={{padding:'2px 8px',fontSize:11}} onClick={()=>editarAditivo(a)}>Editar</button><button className="btn danger" style={{padding:'2px 8px',fontSize:11}} onClick={()=>excluirAditivo(a.id)}>Excluir</button></div>}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div style={{marginTop:12,padding:'10px 14px',background:'var(--bg)',borderRadius:'var(--radius)',fontSize:12}}>
                    <div style={{fontWeight:600,marginBottom:6}}>Resumo vigente (período atual)</div>
                    <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:8}}>
                      <div><span style={{color:'var(--text3)'}}>Valor do período atual: </span><strong style={{color:'var(--green-text)'}}>{fmt(valorAnualVigente)}</strong></div>
                      <div><span style={{color:'var(--text3)'}}>Medido no período atual: </span><strong>{fmt(medidoPeriodoAtual)}</strong></div>
                      <div><span style={{color:'var(--text3)'}}>Saldo do período atual: </span><strong style={{color:saldoAnual<0?'var(--red)':'var(--green-text)'}}>{fmt(saldoAnual)}</strong></div>
                      <div><span style={{color:'var(--text3)'}}>Mensal vigente: </span><strong>{fmt(mensal)}</strong></div>
                      <div><span style={{color:'var(--text3)'}}>Vigência vigente: </span><strong>{vigenciaVigente?new Date(vigenciaVigente+'T00:00:00').toLocaleDateString('pt-BR'):'—'}</strong></div>
                      <div><span style={{color:'var(--text3)'}}>LOA 2026: </span><strong style={{color:valorAnualVigente>Number(contrato?.loa_2026||0)&&Number(contrato?.loa_2026||0)>0?'var(--red)':'inherit'}}>{fmt(contrato?.loa_2026)}</strong></div>
                    </div>
                  </div>
                  {situacaoPeriodos.periodos.length > 1 && (
                    <div style={{marginTop:12}}>
                      <div style={{fontSize:12,fontWeight:600,marginBottom:6}}>Histórico de períodos de vigência</div>
                      <table>
                        <thead><tr><th>Período</th><th>De</th><th>Até</th><th className="text-right">Valor do período</th><th className="text-right">Medido</th><th className="text-right">Saldo</th></tr></thead>
                        <tbody>
                          {situacaoPeriodos.periodos.map((p, i) => {
                            const val = situacaoPeriodos.valores[i]
                            const med = situacaoPeriodos.medidos[i]
                            const sal = val - med
                            const atual = i === situacaoPeriodos.idxAtual
                            return (
                              <tr key={i} style={atual ? {background:'#e6f1fb'} : {}}>
                                <td>{i+1}º {atual && <span className="badge info" style={{marginLeft:4}}>vigente</span>}</td>
                                <td style={{fontSize:11}}>{p.inicio ? new Date(p.inicio+'T00:00:00').toLocaleDateString('pt-BR') : 'Início do contrato'}</td>
                                <td style={{fontSize:11}}>{p.fim ? new Date(p.fim+'T00:00:00').toLocaleDateString('pt-BR') : '—'}</td>
                                <td className="text-right">{fmt(val)}</td>
                                <td className="text-right">{fmt(med)}</td>
                                <td className="text-right" style={{fontWeight:600,color:sal<0?'var(--red)':'var(--green)'}}>{fmt(sal)}</td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </>
              }
            </div>
          )}

          {/* ABA PREVISÃO DE SERVIÇOS / ORÇAMENTOS FUTUROS */}
          {aba === 'previsao' && (
            <div>
              <div style={{fontSize:11,color:'var(--text3)',marginBottom:10}}>
                Cadastre aqui serviços ou orçamentos planejados que ainda não foram empenhados, para verificar se o saldo atual do contrato consegue cobrir a demanda futura.
              </div>

              {totalPrevisto > 0 && (
                <div className={`saldo-banner ${saldoProjetadoEmpenho<0?'negativo':saldoProjetadoEmpenho<mensal?'baixo':'positivo'}`} style={{marginBottom:10}}>
                  <div style={{fontSize:20}}>{saldoProjetadoEmpenho<0?'⊖':saldoProjetadoEmpenho<mensal?'⚠':'✓'}</div>
                  <div>
                    <div style={{fontWeight:600,fontSize:14}}>
                      {saldoProjetadoEmpenho<0
                        ? `Empenho INSUFICIENTE — reforçar em ${fmt(Math.abs(saldoProjetadoEmpenho))} para cobrir os serviços previstos`
                        : `Saldo de empenho cobre os serviços previstos — sobra projetada de ${fmt(saldoProjetadoEmpenho)}`}
                    </div>
                    <div style={{fontSize:11,marginTop:2,opacity:.8}}>
                      Saldo atual de empenho: {fmt(saldo)} · Serviços previstos: {fmt(totalPrevisto)}
                    </div>
                  </div>
                </div>
              )}

              {totalPrevisto > 0 && saldoProjetadoPeriodo < 0 && (
                <div className="alert warn" style={{marginBottom:10}}>
                  Atenção: mesmo reforçando o empenho, o valor do período vigente do contrato ({fmt(valorAnualVigente)}) pode não ser suficiente — considere um aditivo de valor. Saldo projetado do período: {fmt(saldoProjetadoPeriodo)}
                </div>
              )}

              {isAdmin && <div style={{background:'var(--bg)',borderRadius:'var(--radius)',padding:'1rem',marginBottom:'1rem'}}>
                <div style={{fontSize:12,fontWeight:600,marginBottom:10}}>{editandoPrevId ? 'Editando previsão' : 'Registrar novo orçamento/serviço previsto'}</div>
                <div className="form-grid full">
                  <div className="field"><label>Descrição do serviço/orçamento *</label><input value={fPrev.descricao} onChange={e=>setFPrev({...fPrev,descricao:e.target.value})} placeholder="Ex: Substituição de compressores - climatização PGJ" /></div>
                </div>
                <div className="form-grid" style={{marginTop:10}}>
                  <div className="field"><label>Valor previsto (R$) *</label><input type="number" step="0.01" value={fPrev.valor_previsto} onChange={e=>setFPrev({...fPrev,valor_previsto:e.target.value})} placeholder="0,00" /></div>
                  <div className="field"><label>Data prevista</label><input type="date" value={fPrev.data_prevista} onChange={e=>setFPrev({...fPrev,data_prevista:e.target.value})} /></div>
                </div>
                <div className="form-grid" style={{marginTop:10}}>
                  <div className="field"><label>Status</label>
                    <select value={fPrev.status} onChange={e=>setFPrev({...fPrev,status:e.target.value})}>
                      <option value="planejado">Planejado</option>
                      <option value="em_execucao">Em execução</option>
                      <option value="concluido">Concluído</option>
                      <option value="cancelado">Cancelado</option>
                    </select>
                  </div>
                  <div className="field"><label>Observações</label><input value={fPrev.observacoes} onChange={e=>setFPrev({...fPrev,observacoes:e.target.value})} /></div>
                </div>
                <div className="btn-row">
                  {editandoPrevId && <button className="btn" onClick={cancelarEdicaoPrevisao}>Cancelar</button>}
                  <button className="btn primary" onClick={salvarPrevisao} disabled={salvando}>{editandoPrevId ? 'Atualizar previsão' : 'Salvar previsão'}</button>
                </div>
              </div>}

              {previsoes.length === 0
                ? <div style={{textAlign:'center',padding:'1.5rem',color:'var(--text3)'}}>Nenhum orçamento futuro cadastrado.</div>
                : (
                  <table>
                    <thead><tr><th>Descrição</th><th>Data prevista</th><th className="text-right">Valor previsto</th><th>Status</th><th>Observações</th><th></th></tr></thead>
                    <tbody>
                      {previsoes.map(p => (
                        <tr key={p.id}>
                          <td style={{maxWidth:220}}>{p.descricao}</td>
                          <td style={{fontSize:11}}>{p.data_prevista?new Date(p.data_prevista+'T00:00:00').toLocaleDateString('pt-BR'):'—'}</td>
                          <td className="text-right" style={{fontWeight:600}}>{fmt(p.valor_previsto)}</td>
                          <td><span className={`badge ${p.status==='concluido'?'ativo':p.status==='cancelado'?'critico':p.status==='em_execucao'?'info':'alerta'}`}>{p.status==='planejado'?'Planejado':p.status==='em_execucao'?'Em execução':p.status==='concluido'?'Concluído':'Cancelado'}</span></td>
                          <td style={{color:'var(--text3)',fontSize:11}}>{p.observacoes||'—'}</td>
                          <td>{isAdmin && <div style={{display:'flex',gap:4}}><button className="btn" style={{padding:'2px 8px',fontSize:11}} onClick={()=>editarPrevisao(p)}>Editar</button><button className="btn danger" style={{padding:'2px 8px',fontSize:11}} onClick={()=>excluirPrevisao(p.id)}>Excluir</button></div>}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )
              }

              {previsoes.length > 0 && (
                <div style={{marginTop:12,padding:'10px 14px',background:'var(--bg)',borderRadius:'var(--radius)',fontSize:12}}>
                  <div style={{fontWeight:600,marginBottom:6}}>Resumo da projeção</div>
                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:8}}>
                    <div><span style={{color:'var(--text3)'}}>Saldo de empenho atual: </span><strong>{fmt(saldo)}</strong></div>
                    <div><span style={{color:'var(--text3)'}}>Serviços previstos (não empenhados): </span><strong style={{color:'var(--blue-text)'}}>-{fmt(totalPrevisto)}</strong></div>
                    <div><span style={{color:'var(--text3)'}}>Saldo projetado de empenho: </span><strong style={{color:saldoProjetadoEmpenho<0?'var(--red)':'var(--green-text)'}}>{fmt(saldoProjetadoEmpenho)}</strong></div>
                    <div><span style={{color:'var(--text3)'}}>Saldo do período atual: </span><strong>{fmt(saldoAnual)}</strong></div>
                    <div><span style={{color:'var(--text3)'}}>Saldo projetado do período: </span><strong style={{color:saldoProjetadoPeriodo<0?'var(--red)':'var(--green-text)'}}>{fmt(saldoProjetadoPeriodo)}</strong></div>
                  </div>
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
function Dashboard({ onVerContrato, area }) {
  const [contratos, setContratos] = useState([])
  const [loading, setLoading] = useState(true)

  async function carregar() {
    const { data: cs } = await supabase.from('contratos').select('*').eq('area', area).order('numero')
    const { data: es } = await supabase.from('empenhos').select('contrato_id, valor')
    const { data: ms } = await supabase.from('medicoes').select('contrato_id, valor, data_medicao, mes_referencia')
    const { data: as } = await supabase.from('aditivos').select('*')
    const lista = (cs || []).map(c => {
      const adis=(as||[]).filter(a=>a.contrato_id===c.id)
      const medsContrato=(ms||[]).filter(m=>m.contrato_id===c.id)
      const situacao = calcularSituacaoPeriodos(c, adis, medsContrato)
      let mensalVig=Number(c.valor_mensal_previsto||0)
      adis.filter(a=>a.tipo==='reajuste'&&Number(a.valor_mensal_novo)>0).sort((a,b)=>new Date(a.data_assinatura)-new Date(b.data_assinatura)).forEach(a=>{mensalVig=Number(a.valor_mensal_novo)})
      let vigVig=c.data_vencimento
      adis.filter(a=>(a.tipo==='prazo'||a.tipo==='prazo_valor')&&a.nova_vigencia).sort((a,b)=>new Date(a.data_assinatura)-new Date(b.data_assinatura)).forEach(a=>{vigVig=a.nova_vigencia})
      return { ...c, totalEmp:(es||[]).filter(e=>e.contrato_id===c.id).reduce((a,e)=>a+Number(e.valor),0), totalMed: medsContrato.reduce((a,m)=>a+Number(m.valor),0), valorAnualVigente:situacao.valorPeriodoAtual, medidoPeriodoAtual:situacao.medidoPeriodoAtual, mensalVigente:mensalVig, vigenciaVigente:vigVig }
    })
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
    const dias = diasAte(c.vigenciaVigente || c.data_vencimento)
    const anual = c.valorAnualVigente || Number(c.valor_anual || 0)
    const loa = Number(c.loa_2026 || 0)
    const percAnual = anual > 0 ? c.medidoPeriodoAtual / anual * 100 : 0
    const percLoa   = loa   > 0 ? c.totalEmp / loa   * 100 : 0
    // Alertas empenho x medição
    if (c.totalEmp>0&&sal<0) alertas.push({ tipo:'danger', msg:`Contrato ${c.numero} (${c.empresa}): saldo de empenho NEGATIVO ${fmt(sal)}` })
    else if (c.totalEmp>0&&sal<Number(c.valor_mensal_previsto||0)) alertas.push({ tipo:'danger', msg:`Contrato ${c.numero} (${c.empresa}): saldo de empenho insuficiente ${fmt(sal)}` })
    // Alertas valor anual (período de vigência atual)
    if (anual>0&&percAnual>=100) alertas.push({ tipo:'danger', msg:`Contrato ${c.numero} (${c.empresa}): total medido no período (${fmt(c.medidoPeriodoAtual)}) ULTRAPASSOU o valor do período (${fmt(anual)})` })
    else if (anual>0&&percAnual>=80) alertas.push({ tipo:'warn', msg:`Contrato ${c.numero} (${c.empresa}): ${percAnual.toFixed(0)}% do valor do período já medido — saldo restante ${fmt(anual-c.medidoPeriodoAtual)}` })
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
      <div className="page-header"><div><h1>Dashboard</h1><p>{area==='fiscalizacao'?'Fiscalização de Obras':'Manutenção Predial'} · MPMA 2026</p></div></div>
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
function Contratos({ onVerContrato, area }) {
  const { user } = useAuth()
  const isAdmin = user?.perfil === 'admin'
  const [contratos, setContratos] = useState([])
  const [loading, setLoading] = useState(true)
  const [busca, setBusca] = useState('')
  const [modalNovo, setModalNovo] = useState(false)

  async function carregar() {
    const { data: cs } = await supabase.from('contratos').select('*').eq('area', area).order('numero')
    const { data: es } = await supabase.from('empenhos').select('contrato_id, valor')
    const { data: ms } = await supabase.from('medicoes').select('contrato_id, valor, data_medicao, mes_referencia')
    const { data: as } = await supabase.from('aditivos').select('*')
    setContratos((cs||[]).map(c=>{
      const adis=(as||[]).filter(a=>a.contrato_id===c.id)
      const medsContrato=(ms||[]).filter(m=>m.contrato_id===c.id)
      const situacao = calcularSituacaoPeriodos(c, adis, medsContrato)
      let vigVig=c.data_vencimento
      adis.filter(a=>(a.tipo==='prazo'||a.tipo==='prazo_valor')&&a.nova_vigencia).sort((a,b)=>new Date(a.data_assinatura)-new Date(b.data_assinatura)).forEach(a=>{vigVig=a.nova_vigencia})
      return {
        ...c,
        totalEmp:(es||[]).filter(e=>e.contrato_id===c.id).reduce((a,e)=>a+Number(e.valor),0),
        totalMed: medsContrato.reduce((a,m)=>a+Number(m.valor),0),
        valorAnualVigente: situacao.valorPeriodoAtual,
        medidoPeriodoAtual: situacao.medidoPeriodoAtual,
        vigenciaVigente: vigVig,
      }
    }))
    setLoading(false)
  }
  useEffect(() => { carregar() }, [])

  const lista = contratos.filter(c => !busca || (c.numero+c.empresa+(c.local_unidade||'')).toLowerCase().includes(busca.toLowerCase()))

  return (
    <div>
      <div className="page-header">
        <div><h1>Contratos — {area==='fiscalizacao'?'Fiscalização de Obras':'Manutenção Predial'}</h1><p>{contratos.length} contratos cadastrados</p></div>
        {isAdmin && <button className="btn primary" onClick={() => setModalNovo(true)}>+ Novo contrato</button>}
      </div>
      <div className="search-row">
        <input placeholder="Buscar número, empresa, local..." value={busca} onChange={e => setBusca(e.target.value)} />
      </div>
      {loading ? <div style={{color:'var(--text3)',padding:'2rem'}}>Carregando...</div> : (
        <div className="card" style={{padding:0}}>
          <div className="table-wrap">
            <table>
              <thead>
                <tr><th>Nº</th><th>Empresa</th><th>Local</th><th>Vigência</th><th className="text-right">Valor do período</th><th className="text-right">Empenhado</th><th className="text-right">Medido</th><th className="text-right">Saldo</th><th>Status</th></tr>
              </thead>
              <tbody>
                {lista.length===0
                  ? <tr><td colSpan={9} style={{textAlign:'center',padding:'2rem',color:'var(--text3)'}}>Nenhum contrato encontrado</td></tr>
                  : lista.map(c => {
                    const sal = c.totalEmp-c.totalMed
                    const dias = diasAte(c.vigenciaVigente||c.data_vencimento)
                    const st = sal<0&&c.totalEmp>0?'negativo':dias<=30&&(c.vigenciaVigente||c.data_vencimento)?'critico':dias<=120&&(c.vigenciaVigente||c.data_vencimento)?'alerta':'ativo'
                    return (
                      <tr key={c.id} className="clickable" onClick={() => onVerContrato(c.id)}>
                        <td style={{fontWeight:600}}>{c.numero}</td>
                        <td>{c.empresa}</td>
                        <td style={{maxWidth:140,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',color:'var(--text3)',fontSize:11}}>{c.local_unidade}</td>
                        <td style={{fontSize:11}}>
                          {(c.vigenciaVigente||c.data_vencimento)?new Date((c.vigenciaVigente||c.data_vencimento)+'T00:00:00').toLocaleDateString('pt-BR'):'—'}
                          {c.vigenciaVigente&&c.vigenciaVigente!==c.data_vencimento&&<span style={{fontSize:9,background:'#e6f1fb',color:'#0c447c',borderRadius:4,padding:'1px 4px',marginLeft:3}}>+Adit.</span>}
                          {(c.vigenciaVigente||c.data_vencimento)&&diasAte(c.vigenciaVigente||c.data_vencimento)>=0&&<div style={{fontSize:10,color:diasAte(c.vigenciaVigente||c.data_vencimento)<=30?'var(--red)':diasAte(c.vigenciaVigente||c.data_vencimento)<=120?'var(--amber)':'var(--text3)'}}>{diasAte(c.vigenciaVigente||c.data_vencimento)}d</div>}
                        </td>
                        <td className="text-right">{c.valorAnualVigente?fmt(c.valorAnualVigente):'—'}</td>
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
      {modalNovo && <ModalContrato areaAtual={area} onClose={() => setModalNovo(false)} onSalvo={() => { setModalNovo(false); carregar() }} />}
    </div>
  )
}

// ─── ALERTAS ─────────────────────────────────────────────────
function Alertas({ area }) {
  const [alertas, setAlertas] = useState([])
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    async function carregar() {
      const { data: cs } = await supabase.from('contratos').select('*').eq('area', area)
      const { data: es } = await supabase.from('empenhos').select('contrato_id, valor')
      const { data: ms } = await supabase.from('medicoes').select('contrato_id, valor, data_medicao, mes_referencia')
      const { data: as2 } = await supabase.from('aditivos').select('*')
      const al = []
      ;(cs||[]).forEach(c => {
        const emp=(es||[]).filter(e=>e.contrato_id===c.id).reduce((a,e)=>a+Number(e.valor),0)
        const med=(ms||[]).filter(m=>m.contrato_id===c.id).reduce((a,m)=>a+Number(m.valor),0)
        const adis2=(as2||[]).filter(a=>a.contrato_id===c.id)
        const medsContrato2=(ms||[]).filter(m=>m.contrato_id===c.id)
        const situacao2 = calcularSituacaoPeriodos(c, adis2, medsContrato2)
        let vigVig2=c.data_vencimento; adis2.filter(a=>(a.tipo==='prazo'||a.tipo==='prazo_valor')&&a.nova_vigencia).sort((a,b)=>new Date(a.data_assinatura)-new Date(b.data_assinatura)).forEach(a=>{vigVig2=a.nova_vigencia})
        const sal=emp-med; const dias=diasAte(vigVig2||c.data_vencimento)
        const anual=situacao2.valorPeriodoAtual; const loa=Number(c.loa_2026||0)
        const percAnual=anual>0?situacao2.medidoPeriodoAtual/anual*100:0
        const percLoa=loa>0?emp/loa*100:0
        if (emp>0&&sal<0) al.push({tipo:'danger',contrato:c.numero,empresa:c.empresa,msg:`Saldo de empenho NEGATIVO: ${fmt(sal)} — reforce urgentemente`})
        else if (emp>0&&sal<Number(c.valor_mensal_previsto||0)) al.push({tipo:'danger',contrato:c.numero,empresa:c.empresa,msg:`Saldo de empenho insuficiente: ${fmt(sal)} — menor que uma medição mensal`})
        else if (emp>0&&sal<Number(c.valor_mensal_previsto||0)*2) al.push({tipo:'warn',contrato:c.numero,empresa:c.empresa,msg:`Saldo de empenho baixo: ${fmt(sal)} — reforce em breve`})
        if (anual>0&&percAnual>=100) al.push({tipo:'danger',contrato:c.numero,empresa:c.empresa,msg:`Total medido no período (${fmt(situacao2.medidoPeriodoAtual)}) ULTRAPASSOU o valor do período (${fmt(anual)})`})
        else if (anual>0&&percAnual>=80) al.push({tipo:'warn',contrato:c.numero,empresa:c.empresa,msg:`${percAnual.toFixed(0)}% do valor do período já executado — saldo restante: ${fmt(anual-situacao2.medidoPeriodoAtual)}`})
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
function Orcamento({ area }) {
  const [contratos, setContratos] = useState([])
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    async function carregar() {
      const { data: cs } = await supabase.from('contratos').select('*').eq('area', area).order('numero')
      const { data: es } = await supabase.from('empenhos').select('contrato_id, valor')
      const { data: ms } = await supabase.from('medicoes').select('contrato_id, valor, data_medicao, mes_referencia')
      const { data: as } = await supabase.from('aditivos').select('*')
      setContratos((cs||[]).map(c=>{
        const adis=(as||[]).filter(a=>a.contrato_id===c.id)
        const medsContrato=(ms||[]).filter(m=>m.contrato_id===c.id)
        const situacao = calcularSituacaoPeriodos(c, adis, medsContrato)
        return {
          ...c,
          totalEmp:(es||[]).filter(e=>e.contrato_id===c.id).reduce((a,e)=>a+Number(e.valor),0),
          totalMed: medsContrato.reduce((a,m)=>a+Number(m.valor),0),
          valorAnualVigente: situacao.valorPeriodoAtual,
        }
      }))
      setLoading(false)
    }
    carregar()
  }, [])

  const tLoa=contratos.reduce((a,c)=>a+Number(c.loa_2026||0),0)
  const tAnual=contratos.reduce((a,c)=>a+Number(c.valorAnualVigente||0),0)
  const tEmp=contratos.reduce((a,c)=>a+c.totalEmp,0)
  const tMed=contratos.reduce((a,c)=>a+c.totalMed,0)

  return (
    <div>
      <div className="page-header"><div><h1>Orçamento 2026</h1><p>LOA e execução financeira</p></div></div>
      {loading&&<div style={{color:'var(--text3)'}}>Carregando...</div>}
      {!loading&&<>
        <div className="metric-grid">
          <div className="metric-card"><div className="lbl">LOA 2026 total</div><div className="val" style={{fontSize:14}}>{fmt(tLoa)}</div></div>
          <div className="metric-card"><div className="lbl">Valor do período (contratos)</div><div className="val" style={{fontSize:14}}>{fmt(tAnual)}</div></div>
          <div className="metric-card"><div className="lbl">Total empenhado</div><div className="val" style={{fontSize:14}}>{fmt(tEmp)}</div></div>
          <div className="metric-card"><div className="lbl">Total pago/medido</div><div className="val" style={{fontSize:14}}>{fmt(tMed)}</div></div>
          <div className="metric-card"><div className="lbl">Saldo empenhos</div><div className={`val ${tEmp-tMed<0?'danger':'ok'}`} style={{fontSize:14}}>{fmt(tEmp-tMed)}</div></div>
          <div className="metric-card"><div className="lbl">Dif. LOA × Período</div><div className={`val ${tLoa-tAnual<0?'danger':'ok'}`} style={{fontSize:14}}>{fmt(tLoa-tAnual)}</div></div>
        </div>
        <div className="card" style={{padding:0}}>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Nº</th><th>Empresa</th><th className="text-right">LOA 2026</th><th className="text-right">Valor do período</th><th className="text-right">Empenhado</th><th className="text-right">Medido/pago</th><th className="text-right">Saldo empenho</th></tr></thead>
              <tbody>
                {contratos.map(c=>{
                  const sal=c.totalEmp-c.totalMed
                  return(
                    <tr key={c.id}>
                      <td style={{fontWeight:600}}>{c.numero}</td><td>{c.empresa}</td>
                      <td className="text-right">{fmt(c.loa_2026)}</td>
                      <td className="text-right">{c.valorAnualVigente?fmt(c.valorAnualVigente):'—'}</td>
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

// ─── PREVISÃO DE GASTOS ──────────────────────────────────────
function addMesesData(n) {
  const d = new Date()
  d.setMonth(d.getMonth() + n)
  return d
}

function Previsao({ onVerContrato, area }) {
  const [contratos, setContratos] = useState([])
  const [loading, setLoading] = useState(true)

  async function carregar() {
    const { data: cs } = await supabase.from('contratos').select('*').eq('area', area).order('numero')
    const { data: es } = await supabase.from('empenhos').select('contrato_id, valor')
    const { data: ms } = await supabase.from('medicoes').select('contrato_id, valor, data_medicao, mes_referencia')
    const { data: as } = await supabase.from('aditivos').select('*')
    const { data: ps } = await supabase.from('previsoes_orcamento').select('contrato_id, valor_previsto, status')
    const lista = (cs||[]).map(c => {
      const adis=(as||[]).filter(a=>a.contrato_id===c.id)
      const medsContrato=(ms||[]).filter(m=>m.contrato_id===c.id)
      const empC=(es||[]).filter(e=>e.contrato_id===c.id).reduce((a,e)=>a+Number(e.valor),0)
      const medC=medsContrato.reduce((a,m)=>a+Number(m.valor),0)
      const situacao = calcularSituacaoPeriodos(c, adis, medsContrato)
      const totalPrevistoC = (ps||[]).filter(p=>p.contrato_id===c.id && (p.status==='planejado'||p.status==='em_execucao')).reduce((s,p)=>s+Number(p.valor_previsto||0),0)

      let mensalVig=Number(c.valor_mensal_previsto||0)
      adis.filter(a=>a.tipo==='reajuste'&&Number(a.valor_mensal_novo)>0).sort((a,b)=>new Date(a.data_assinatura)-new Date(b.data_assinatura)).forEach(a=>{mensalVig=Number(a.valor_mensal_novo)})
      let vigVig=c.data_vencimento
      adis.filter(a=>(a.tipo==='prazo'||a.tipo==='prazo_valor')&&a.nova_vigencia).sort((a,b)=>new Date(a.data_assinatura)-new Date(b.data_assinatura)).forEach(a=>{vigVig=a.nova_vigencia})

      const saldoEmp = empC - medC
      const saldoPer = situacao.saldoPeriodoAtual
      const saldoProjEmp = saldoEmp - totalPrevistoC
      const saldoProjPer = saldoPer - totalPrevistoC

      const mesesEmp = mensalVig > 0 ? Math.floor(saldoEmp / mensalVig) : null
      const mesesPer = mensalVig > 0 ? Math.floor(saldoPer / mensalVig) : null

      return {
        ...c, totalEmp: empC, totalMed: medC, saldoEmp, saldoPer,
        mensalVigente: mensalVig, vigenciaVigente: vigVig,
        mesesEmp, mesesPer, totalPrevisto: totalPrevistoC, saldoProjEmp, saldoProjPer,
        valorPeriodoAtual: situacao.valorPeriodoAtual, medidoPeriodoAtual: situacao.medidoPeriodoAtual,
      }
    })
    // Ordena por urgência: contratos com saldo projetado negativo primeiro, depois por meses restantes
    lista.sort((a,b) => {
      if (a.totalPrevisto>0 && a.saldoProjEmp<0 && !(b.totalPrevisto>0 && b.saldoProjEmp<0)) return -1
      if (b.totalPrevisto>0 && b.saldoProjEmp<0 && !(a.totalPrevisto>0 && a.saldoProjEmp<0)) return 1
      const ma = a.mesesEmp===null ? 9999 : a.mesesEmp
      const mb = b.mesesEmp===null ? 9999 : b.mesesEmp
      return ma - mb
    })
    setContratos(lista)
    setLoading(false)
  }
  useEffect(() => { carregar() }, [])

  function situacaoRecomendacao(c) {
    if (c.totalPrevisto > 0 && c.saldoProjEmp < 0) return { nivel:'critico', texto:`Reforçar empenho em ${fmt(Math.abs(c.saldoProjEmp))} p/ cobrir serviços previstos` }
    if (c.mensalVigente <= 0) return { nivel:'info', texto:'Sem valor mensal definido' }
    if (c.saldoEmp <= 0) return { nivel:'critico', texto:'Empenho já esgotado — solicitar reforço imediatamente' }
    if (c.mesesEmp <= 1) return { nivel:'critico', texto:`Reforçar empenho em até 30 dias` }
    if (c.mesesEmp <= 3) return { nivel:'atencao', texto:'Planejar solicitação de reforço de empenho' }
    return { nivel:'ok', texto:'Empenho suficiente por enquanto' }
  }

  const criticos = contratos.filter(c => (c.mensalVigente>0 && c.mesesEmp<=1) || (c.totalPrevisto>0 && c.saldoProjEmp<0)).length
  const atencao  = contratos.filter(c => !((c.mensalVigente>0 && c.mesesEmp<=1) || (c.totalPrevisto>0 && c.saldoProjEmp<0)) && c.mensalVigente>0 && c.mesesEmp>1 && c.mesesEmp<=3).length
  const comServicoPrevisto = contratos.filter(c => c.totalPrevisto > 0).length

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Previsão de Gastos</h1>
          <p>Projeção de saldo com base na execução mensal e serviços previstos — {area==='fiscalizacao'?'Fiscalização de Obras':'Manutenção Predial'}</p>
        </div>
      </div>

      {loading ? <div style={{color:'var(--text3)',padding:'2rem'}}>Carregando...</div> : (
        <>
          <div className="metric-grid">
            <div className="metric-card"><div className="lbl">Contratos monitorados</div><div className="val ok">{contratos.length}</div></div>
            <div className="metric-card"><div className="lbl">Reforço necessário</div><div className={`val ${criticos>0?'danger':'ok'}`}>{criticos}</div></div>
            <div className="metric-card"><div className="lbl">Planejar reforço (≤90 dias)</div><div className={`val ${atencao>0?'warn':'ok'}`}>{atencao}</div></div>
            <div className="metric-card"><div className="lbl">Com serviços previstos</div><div className="val">{comServicoPrevisto}</div></div>
          </div>

          <div className="card" style={{padding:0}}>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Nº</th><th>Empresa</th>
                    <th className="text-right">Saldo empenho</th>
                    <th className="text-right">Mensal vigente</th>
                    <th>Meses restantes</th>
                    <th className="text-right">Serviços previstos</th>
                    <th className="text-right">Saldo projetado</th>
                    <th>Recomendação</th>
                  </tr>
                </thead>
                <tbody>
                  {contratos.length===0
                    ? <tr><td colSpan={8} style={{textAlign:'center',padding:'2rem',color:'var(--text3)'}}>Nenhum contrato encontrado</td></tr>
                    : contratos.map(c => {
                      const rec = situacaoRecomendacao(c)
                      return (
                        <tr key={c.id} className="clickable" onClick={() => onVerContrato(c.id)}>
                          <td style={{fontWeight:600}}>{c.numero}</td>
                          <td>{c.empresa}</td>
                          <td className="text-right" style={{fontWeight:600,color:c.saldoEmp<0?'var(--red)':c.saldoEmp<c.mensalVigente?'var(--amber)':'var(--green)'}}>{fmt(c.saldoEmp)}</td>
                          <td className="text-right">{c.mensalVigente>0?fmt(c.mensalVigente):'—'}</td>
                          <td>{c.mensalVigente>0 ? (c.mesesEmp<=0 ? <span style={{color:'var(--red)',fontWeight:600}}>Esgotado</span> : `${c.mesesEmp} mês(es)`) : '—'}</td>
                          <td className="text-right">{c.totalPrevisto>0?fmt(c.totalPrevisto):<span className="text-muted">—</span>}</td>
                          <td className="text-right" style={{fontWeight:600,color:(c.totalPrevisto>0?c.saldoProjEmp:c.saldoEmp)<0?'var(--red)':'var(--green)'}}>{c.totalPrevisto>0?fmt(c.saldoProjEmp):'—'}</td>
                          <td><span className={`badge ${rec.nivel==='critico'?'critico':rec.nivel==='atencao'?'alerta':rec.nivel==='ok'?'ativo':'info'}`}>{rec.texto}</span></td>
                        </tr>
                      )
                    })}
                </tbody>
              </table>
            </div>
          </div>
          <div style={{fontSize:11,color:'var(--text3)',marginTop:10}}>
            * A previsão considera o valor mensal vigente (após reajustes) aplicado de forma constante. Clique em um contrato para ver detalhes e lançar um novo empenho.
          </div>
        </>
      )}
    </div>
  )
}

// ─── APP SHELL ───────────────────────────────────────────────

// ─── RELATÓRIO ───────────────────────────────────────────────
function dentroDoIntervalo(dataStr, ini, fim) {
  if (!dataStr) return !ini && !fim
  const d = new Date(dataStr+'T00:00:00')
  if (ini && d < new Date(ini+'T00:00:00')) return false
  if (fim && d > new Date(fim+'T00:00:00')) return false
  return true
}

async function gerarRelatorio(area, opts) {
  opts = opts || {}
  const { contratoId, dataInicio, dataFim } = opts
  let query = supabase.from('contratos').select('*').order('numero')
  query = contratoId ? query.eq('id', contratoId) : query.eq('area', area||'manutencao')
  const { data: cs } = await query
  const { data: es } = await supabase.from('empenhos').select('*').order('data_empenho')
  const { data: ms } = await supabase.from('medicoes').select('*').order('data_medicao').order('criado_em')
  const { data: adsr } = await supabase.from('aditivos').select('*').order('data_assinatura')
  const { data: psr } = await supabase.from('previsoes_orcamento').select('*').order('data_prevista')

  const fmtR = v => Number(v||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL',minimumFractionDigits:2})
  const fmtD = d => d ? new Date(d+'T00:00:00').toLocaleDateString('pt-BR') : '—'
  const diasAteR = d => { if(!d) return 9999; return Math.ceil((new Date(d+'T00:00:00')-new Date())/864e5) }

  const contratos = (cs||[]).map(c => {
    const adisC=(adsr||[]).filter(a=>a.contrato_id===c.id)
    const medicoesC=(ms||[]).filter(m=>m.contrato_id===c.id)
    const previsoesC=(psr||[]).filter(p=>p.contrato_id===c.id)
    const empenhosC=(es||[]).filter(e=>e.contrato_id===c.id)
    const totalPrevistoC=previsoesC.filter(p=>p.status==='planejado'||p.status==='em_execucao').reduce((s,p)=>s+Number(p.valor_previsto||0),0)
    const situacaoC = calcularSituacaoPeriodos(c, adisC, medicoesC)
    let vigVigR=c.data_vencimento; adisC.filter(a=>(a.tipo==='prazo'||a.tipo==='prazo_valor')&&a.nova_vigencia).sort((a,b)=>new Date(a.data_assinatura)-new Date(b.data_assinatura)).forEach(a=>{vigVigR=a.nova_vigencia})
    const totalEmpC=empenhosC.reduce((a,e)=>a+Number(e.valor),0)
    const totalMedC=medicoesC.reduce((a,m)=>a+Number(m.valor),0)
    // Listas filtradas pelo intervalo de datas escolhido (apenas para exibição nas tabelas)
    const empenhosFiltrados = (dataInicio||dataFim) ? empenhosC.filter(e=>dentroDoIntervalo(e.data_empenho,dataInicio,dataFim)) : empenhosC
    const medicoesFiltradas = (dataInicio||dataFim) ? medicoesC.filter(m=>dentroDoIntervalo(m.data_medicao||(m.mes_referencia?m.mes_referencia+'-01':null),dataInicio,dataFim)) : medicoesC
    const aditivosFiltrados = (dataInicio||dataFim) ? adisC.filter(a=>dentroDoIntervalo(a.data_assinatura,dataInicio,dataFim)) : adisC
    return { ...c, empenhos:empenhosC, medicoes:medicoesC, aditivos:adisC, previsoes:previsoesC,
      empenhosFiltrados, medicoesFiltradas, aditivosFiltrados,
      totalPrevisto:totalPrevistoC, totalEmp:totalEmpC, totalMed:totalMedC,
      valorAnualVigente:situacaoC.valorPeriodoAtual, medidoPeriodoAtual:situacaoC.medidoPeriodoAtual,
      vigenciaVigente:vigVigR, saldoProjetadoEmpenho:(totalEmpC-totalMedC)-totalPrevistoC,
      periodos:situacaoC.periodos, valoresPeriodos:situacaoC.valores, medidosPeriodos:situacaoC.medidos, idxAtualPeriodo:situacaoC.idxAtual }
  })

  // Gerar alertas
  const alertas = []
  contratos.forEach(c => {
    const sal=c.totalEmp-c.totalMed; const dias=diasAteR(c.vigenciaVigente||c.data_vencimento)
    const anual=c.valorAnualVigente||0; const loa=Number(c.loa_2026||0)
    const percAnual=anual>0?c.medidoPeriodoAtual/anual*100:0
    const percLoa=loa>0?c.totalEmp/loa*100:0
    if (c.totalEmp>0&&sal<0) alertas.push({tipo:'CRITICO',contrato:c.numero,empresa:c.empresa,msg:`Saldo de empenho NEGATIVO: ${fmtR(sal)}`})
    else if (c.totalEmp>0&&sal<Number(c.valor_mensal_previsto||0)) alertas.push({tipo:'CRITICO',contrato:c.numero,empresa:c.empresa,msg:`Saldo de empenho insuficiente: ${fmtR(sal)}`})
    else if (c.totalEmp>0&&sal<Number(c.valor_mensal_previsto||0)*2) alertas.push({tipo:'ATENCAO',contrato:c.numero,empresa:c.empresa,msg:`Saldo de empenho baixo: ${fmtR(sal)}`})
    if (c.totalPrevisto>0&&c.saldoProjetadoEmpenho<0) alertas.push({tipo:'CRITICO',contrato:c.numero,empresa:c.empresa,msg:`Empenho insuficiente para cobrir servicos previstos — reforcar em ${fmtR(Math.abs(c.saldoProjetadoEmpenho))}`})
    if (anual>0&&percAnual>=100) alertas.push({tipo:'CRITICO',contrato:c.numero,empresa:c.empresa,msg:`Total medido no periodo ultrapassou o valor do periodo vigente`})
    else if (anual>0&&percAnual>=80) alertas.push({tipo:'ATENCAO',contrato:c.numero,empresa:c.empresa,msg:`${percAnual.toFixed(0)}% do valor do periodo ja executado — saldo: ${fmtR(anual-c.medidoPeriodoAtual)}`})
    if (loa>0&&percLoa>=100) alertas.push({tipo:'CRITICO',contrato:c.numero,empresa:c.empresa,msg:`Total empenhado ultrapassou a LOA 2026`})
    else if (loa>0&&percLoa>=80) alertas.push({tipo:'ATENCAO',contrato:c.numero,empresa:c.empresa,msg:`${percLoa.toFixed(0)}% da LOA ja empenhado — saldo LOA: ${fmtR(loa-c.totalEmp)}`})
    if (c.data_vencimento&&dias>=0&&dias<=30) alertas.push({tipo:'CRITICO',contrato:c.numero,empresa:c.empresa,msg:`Vence em ${dias} dia(s) — providencie renovacao`})
    else if (c.data_vencimento&&dias>30&&dias<=120) alertas.push({tipo:'ATENCAO',contrato:c.numero,empresa:c.empresa,msg:`Vence em ${dias} dias (${fmtD(c.vigenciaVigente||c.data_vencimento)})`})
  })

  const tEmp=contratos.reduce((a,c)=>a+c.totalEmp,0)
  const tMed=contratos.reduce((a,c)=>a+c.totalMed,0)
  const tLoa=contratos.reduce((a,c)=>a+Number(c.loa_2026||0),0)
  const tAnual=contratos.reduce((a,c)=>a+Number(c.valorAnualVigente||0),0)
  const hoje = new Date().toLocaleDateString('pt-BR')

  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<title>Relatorio de Contratos MPMA</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: Arial, sans-serif; font-size: 11px; color: #1a1a1a; background: #fff; }
  .page { padding: 20mm 15mm; }
  h1 { font-size: 16px; font-weight: 700; color: #0c447c; margin-bottom: 2px; }
  h2 { font-size: 13px; font-weight: 700; color: #0c447c; margin: 16px 0 6px; border-bottom: 1.5px solid #0c447c; padding-bottom: 3px; }
  h3 { font-size: 11px; font-weight: 700; margin: 10px 0 4px; color: #333; }
  .subtitulo { font-size: 11px; color: #555; margin-bottom: 2px; }
  .data-rel { font-size: 10px; color: #888; margin-bottom: 16px; }
  .sumario { display: grid; grid-template-columns: repeat(4,1fr); gap: 8px; margin-bottom: 16px; }
  .sum-card { background: #f0f4fa; border-radius: 5px; padding: 8px 10px; }
  .sum-card .lbl { font-size: 9px; color: #666; margin-bottom: 2px; }
  .sum-card .val { font-size: 13px; font-weight: 700; color: #0c447c; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 10px; font-size: 10px; }
  th { background: #0c447c; color: #fff; padding: 5px 6px; text-align: left; font-size: 9px; font-weight: 600; }
  td { padding: 4px 6px; border-bottom: 0.5px solid #ddd; vertical-align: top; }
  tr:nth-child(even) td { background: #f7f9fc; }
  .tr { text-align: right; }
  .verde { color: #27500a; font-weight: 700; }
  .amarelo { color: #633806; font-weight: 700; }
  .vermelho { color: #7a1010; font-weight: 700; }
  .badge-critico { background: #fce8e8; color: #7a1010; padding: 1px 6px; border-radius: 8px; font-size: 9px; font-weight: 700; }
  .badge-atencao { background: #fef3e2; color: #633806; padding: 1px 6px; border-radius: 8px; font-size: 9px; font-weight: 700; }
  .bloco-contrato { border: 0.5px solid #ccc; border-radius: 5px; padding: 10px 12px; margin-bottom: 14px; page-break-inside: avoid; }
  .contrato-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 6px; }
  .contrato-titulo { font-size: 12px; font-weight: 700; color: #0c447c; }
  .contrato-empresa { font-size: 11px; color: #333; }
  .contrato-local { font-size: 10px; color: #777; margin-top: 1px; }
  .financeiro-grid { display: grid; grid-template-columns: repeat(5,1fr); gap: 6px; margin: 8px 0; }
  .fin-item { background: #f7f9fc; border-radius: 4px; padding: 5px 7px; }
  .fin-item .lbl { font-size: 9px; color: #888; }
  .fin-item .val { font-size: 11px; font-weight: 700; margin-top: 1px; }
  .alerta-row { padding: 4px 8px; margin: 3px 0; border-radius: 4px; font-size: 10px; }
  .alerta-critico { background: #fce8e8; color: #7a1010; border-left: 3px solid #c0392b; }
  .alerta-atencao { background: #fef3e2; color: #633806; border-left: 3px solid #e67e22; }
  .secao-alertas { margin-top: 16px; }
  .rodape { margin-top: 20px; padding-top: 8px; border-top: 0.5px solid #ccc; font-size: 9px; color: #999; text-align: center; }
  @media print {
    @page { size: A4; margin: 15mm; }
    .no-print { display: none; }
    .bloco-contrato { page-break-inside: avoid; }
  }
</style>
</head>
<body>
<div class="page">
  <div class="no-print" style="background:#0c447c;color:#fff;padding:10px 14px;margin-bottom:16px;border-radius:5px;display:flex;justify-content:space-between;align-items:center">
    <span style="font-weight:700">Relatorio gerado — clique em Imprimir para salvar como PDF</span>
    <button onclick="window.print()" style="background:#fff;color:#0c447c;border:none;padding:6px 16px;border-radius:4px;font-weight:700;cursor:pointer;font-size:12px">Imprimir / Salvar PDF</button>
  </div>

  <h1>Ministerio Publico do Maranhao — MPMA</h1>
  <div class="subtitulo">Relatorio de Contratos — ${area==='fiscalizacao'?'Fiscalizacao de Obras':'Manutencao Predial'}</div>
  <div class="subtitulo">${contratoId?'Contrato: '+(contratos[0]?contratos[0].numero+' — '+contratos[0].empresa:''):'Todos os contratos da area ('+contratos.length+')'}</div>
  <div class="subtitulo">Periodo do relatorio: ${(dataInicio||dataFim)?(fmtD(dataInicio)+' ate '+fmtD(dataFim)):'Todo o historico'}</div>
  <div class="data-rel">Emitido em: ${hoje} &nbsp;|&nbsp; Total de contratos: ${contratos.length}</div>

  <h2>Resumo Financeiro Consolidado</h2>
  <div class="sumario">
    <div class="sum-card"><div class="lbl">Total empenhado</div><div class="val">${fmtR(tEmp)}</div></div>
    <div class="sum-card"><div class="lbl">Total medido/pago</div><div class="val">${fmtR(tMed)}</div></div>
    <div class="sum-card"><div class="lbl">Saldo total empenhos</div><div class="val" style="color:${tEmp-tMed<0?'#c0392b':'#27500a'}">${fmtR(tEmp-tMed)}</div></div>
    <div class="sum-card"><div class="lbl">LOA 2026 total</div><div class="val">${fmtR(tLoa)}</div></div>
    <div class="sum-card"><div class="lbl">Valor do periodo (contratos)</div><div class="val">${fmtR(tAnual)}</div></div>
    <div class="sum-card"><div class="lbl">Alertas criticos</div><div class="val" style="color:${alertas.filter(a=>a.tipo==='CRITICO').length>0?'#c0392b':'#27500a'}">${alertas.filter(a=>a.tipo==='CRITICO').length}</div></div>
    <div class="sum-card"><div class="lbl">Alertas de atencao</div><div class="val" style="color:${alertas.filter(a=>a.tipo==='ATENCAO').length>0?'#e67e22':'#27500a'}">${alertas.filter(a=>a.tipo==='ATENCAO').length}</div></div>
    <div class="sum-card"><div class="lbl">Total alertas</div><div class="val">${alertas.length}</div></div>
  </div>

  ${alertas.length>0?`
  <h2>Alertas da Situacao dos Contratos</h2>
  ${alertas.filter(a=>a.tipo==='CRITICO').length>0?`
    <div style="font-size:10px;font-weight:700;color:#7a1010;margin-bottom:4px">CRITICOS (${alertas.filter(a=>a.tipo==='CRITICO').length})</div>
    ${alertas.filter(a=>a.tipo==='CRITICO').map(a=>`<div class="alerta-row alerta-critico"><strong>${a.contrato} — ${a.empresa}:</strong> ${a.msg}</div>`).join('')}
  `:''}
  ${alertas.filter(a=>a.tipo==='ATENCAO').length>0?`
    <div style="font-size:10px;font-weight:700;color:#633806;margin:8px 0 4px">ATENCAO (${alertas.filter(a=>a.tipo==='ATENCAO').length})</div>
    ${alertas.filter(a=>a.tipo==='ATENCAO').map(a=>`<div class="alerta-row alerta-atencao"><strong>${a.contrato} — ${a.empresa}:</strong> ${a.msg}</div>`).join('')}
  `:''}
  `:'<div style="background:#eaf3de;color:#27500a;padding:6px 10px;border-radius:4px;font-size:10px;margin-bottom:12px">Nenhum alerta ativo no momento.</div>'}

  <h2>Detalhamento por Contrato</h2>
  ${contratos.map(c => {
    const sal=c.totalEmp-c.totalMed
    const anual=Number(c.valorAnualVigente||0); const loa=Number(c.loa_2026||0)
    const salCor=sal<0?'vermelho':sal<Number(c.valor_mensal_previsto||0)?'amarelo':'verde'
    let saldoAcum=c.totalEmp
    const medsComSaldo=c.medicoesFiltradas.map(m=>{ saldoAcum-=Number(m.valor); return {...m,saldoApos:saldoAcum} })
    return `
    <div class="bloco-contrato">
      <div class="contrato-header">
        <div>
          <div class="contrato-titulo">Contrato ${c.numero}</div>
          <div class="contrato-empresa">${c.empresa}</div>
          <div class="contrato-local">${c.local_unidade||''}</div>
        </div>
        <div style="text-align:right;font-size:10px;color:#555">
          ${c.sei_contrato?`SEI: ${c.sei_contrato}<br>`:''}
          ${(c.vigenciaVigente||c.data_vencimento)?`Vigencia: ${fmtD(c.vigenciaVigente||c.data_vencimento)}`:''}
          ${c.gestor_nome?`<br>Gestor: ${c.gestor_nome}`:''}
          ${c.fiscal_nome?`<br>Fiscal: ${c.fiscal_nome}`:''}
        </div>
      </div>
      <div class="financeiro-grid">
        <div class="fin-item"><div class="lbl">Valor do periodo vigente</div><div class="val">${anual>0?fmtR(anual):'—'}</div></div>
        <div class="fin-item"><div class="lbl">LOA 2026</div><div class="val">${loa>0?fmtR(loa):'—'}</div></div>
        <div class="fin-item"><div class="lbl">Total empenhado</div><div class="val">${c.totalEmp>0?fmtR(c.totalEmp):'—'}</div></div>
        <div class="fin-item"><div class="lbl">Medido no periodo</div><div class="val">${fmtR(c.medidoPeriodoAtual)}</div></div>
        <div class="fin-item"><div class="lbl">Saldo empenho</div><div class="val ${salCor}">${fmtR(sal)}</div></div>
        ${anual>0?`<div class="fin-item"><div class="lbl">Saldo do periodo</div><div class="val ${(anual-c.medidoPeriodoAtual)<0?'vermelho':'verde'}">${fmtR(anual-c.medidoPeriodoAtual)}</div></div>`:''}
        ${loa>0?`<div class="fin-item"><div class="lbl">Saldo LOA 2026</div><div class="val ${(loa-c.totalEmp)<0?'vermelho':'verde'}">${fmtR(loa-c.totalEmp)}</div></div>`:''}
      </div>
      ${c.periodos&&c.periodos.length>0?`
      <h3>Periodos de Vigencia do Contrato</h3>
      <table>
        <thead><tr><th>Periodo</th><th>De</th><th>Ate</th><th class="tr">Valor do periodo</th><th class="tr">Medido</th><th class="tr">Saldo</th></tr></thead>
        <tbody>
          ${c.periodos.map((p,i)=>{
            const val=c.valoresPeriodos[i]; const med=c.medidosPeriodos[i]; const sp=val-med
            const atual=i===c.idxAtualPeriodo
            return `<tr style="${atual?'background:#e6f1fb;font-weight:700':''}"><td>${i+1}o ${atual?'(vigente)':''}</td><td>${p.inicio?fmtD(p.inicio):'Inicio do contrato'}</td><td>${p.fim?fmtD(p.fim):'—'}</td><td class="tr">${fmtR(val)}</td><td class="tr">${fmtR(med)}</td><td class="tr ${sp<0?'vermelho':'verde'}">${fmtR(sp)}</td></tr>`
          }).join('')}
        </tbody>
      </table>`:''}
      ${c.empenhosFiltrados.length>0?`
      <h3>Empenhos${(dataInicio||dataFim)?' (no periodo selecionado)':''}</h3>
      <table>
        <thead><tr><th>No empenho</th><th>Data</th><th class="tr">Valor</th><th>Descricao</th></tr></thead>
        <tbody>
          ${c.empenhosFiltrados.map(e=>`<tr><td style="font-family:monospace">${e.numero}</td><td>${fmtD(e.data_empenho)}</td><td class="tr">${fmtR(e.valor)}</td><td>${e.descricao||'—'}</td></tr>`).join('')}
          <tr style="font-weight:700;background:#e8f0fb"><td colspan="2">Total ${(dataInicio||dataFim)?'no periodo':'empenhado'}</td><td class="tr">${fmtR(c.empenhosFiltrados.reduce((a,e)=>a+Number(e.valor),0))}</td><td></td></tr>
        </tbody>
      </table>`:'<div style="font-size:10px;color:#999;margin:4px 0">Nenhum empenho registrado no periodo.</div>'}
      ${medsComSaldo.length>0?`
      <h3>Medicoes realizadas${(dataInicio||dataFim)?' (no periodo selecionado)':''}</h3>
      <table>
        <thead><tr><th>No</th><th>Mes ref.</th><th>Data</th><th class="tr">Valor medido</th><th class="tr">Saldo apos</th><th>Status</th></tr></thead>
        <tbody>
          ${medsComSaldo.map(m=>{
            const sc=m.saldoApos<0?'vermelho':m.saldoApos<Number(c.valor_mensal_previsto||0)?'amarelo':'verde'
            return `<tr><td>${m.numero}</td><td>${m.mes_referencia?m.mes_referencia.replace('-','/'):'—'}</td><td>${fmtD(m.data_medicao)}</td><td class="tr">${fmtR(m.valor)}</td><td class="tr ${sc}">${fmtR(m.saldoApos)}</td><td>${m.status}</td></tr>`
          }).join('')}
          <tr style="font-weight:700;background:#e8f0fb"><td colspan="3">Total medido ${(dataInicio||dataFim)?'no periodo':''}</td><td class="tr">${fmtR(medsComSaldo.reduce((a,m)=>a+Number(m.valor),0))}</td><td class="tr ${salCor}">${fmtR(sal)}</td><td></td></tr>
        </tbody>
      </table>`:'<div style="font-size:10px;color:#999;margin:4px 0">Nenhuma medicao registrada no periodo.</div>'}
      ${c.aditivosFiltrados&&c.aditivosFiltrados.length>0?`
      <h3>Aditivos${(dataInicio||dataFim)?' (no periodo selecionado)':''}</h3>
      <table>
        <thead><tr><th>No</th><th>Data</th><th>Tipo</th><th class="tr">Valor acrescido</th><th>Nova vigencia</th><th>Reajuste</th></tr></thead>
        <tbody>
          ${c.aditivosFiltrados.map(a=>`<tr><td>${a.numero}</td><td>${fmtD(a.data_assinatura)}</td><td>${a.tipo==='prazo'?'Prazo':a.tipo==='valor'?'Valor':a.tipo==='reajuste'?'Reajuste':'Prazo+Valor'}</td><td class="tr">${Number(a.valor_acrescido)>0?fmtR(a.valor_acrescido):'—'}</td><td>${a.nova_vigencia?fmtD(a.nova_vigencia):'—'}</td><td>${a.indice_reajuste&&Number(a.percentual_reajuste)>0?a.indice_reajuste+' '+Number(a.percentual_reajuste).toFixed(2)+'%':'—'}</td></tr>`).join('')}
        </tbody>
      </table>`:''}
      ${c.previsoes&&c.previsoes.filter(p=>p.status==='planejado'||p.status==='em_execucao').length>0?`
      <h3>Orcamentos/Servicos Futuros Previstos</h3>
      <table>
        <thead><tr><th>Descricao</th><th>Data prevista</th><th class="tr">Valor previsto</th><th>Status</th></tr></thead>
        <tbody>
          ${c.previsoes.filter(p=>p.status==='planejado'||p.status==='em_execucao').map(p=>`<tr><td>${p.descricao}</td><td>${fmtD(p.data_prevista)}</td><td class="tr">${fmtR(p.valor_previsto)}</td><td>${p.status==='planejado'?'Planejado':'Em execucao'}</td></tr>`).join('')}
          <tr style="font-weight:700;background:#e8f0fb"><td colspan="2">Total previsto</td><td class="tr">${fmtR(c.totalPrevisto)}</td><td></td></tr>
        </tbody>
      </table>
      <div style="font-size:10px;margin-top:4px;padding:4px 8px;border-radius:4px;background:${c.saldoProjetadoEmpenho<0?'#fce8e8':'#eaf3de'}">
        <strong class="${c.saldoProjetadoEmpenho<0?'vermelho':'verde'}">Saldo projetado de empenho: ${fmtR(c.saldoProjetadoEmpenho)}</strong>
        ${c.saldoProjetadoEmpenho<0?' — reforco de empenho necessario':' — saldo suficiente para os servicos previstos'}
      </div>
      `:''}
    </div>`
  }).join('')}

  <div class="rodape">
    Ministerio Publico do Maranhao — MPMA &nbsp;|&nbsp; Relatorio emitido em ${hoje} &nbsp;|&nbsp; Sistema de Gestao de Contratos de Manutencao Predial
  </div>
</div>
</body>
</html>`

  const janela = window.open('', '_blank')
  janela.document.write(html)
  janela.document.close()
}

function AppShell() {
  const { user } = useAuth()
  const [area, setArea] = useState(() => localStorage.getItem('mpma_area') || 'manutencao')
  const [pagina, setPagina] = useState('dashboard')
  const [contratoSel, setContratoSel] = useState(null)
  function mudarArea(a) { setArea(a); localStorage.setItem('mpma_area', a); setContratoSel(null) }
  const [qtdAlertas, setQtdAlertas] = useState(0)
  const [tick, setTick] = useState(0)

  useEffect(() => {
    if (!user) return
    async function contarAlertas() {
      const { data: cs } = await supabase.from('contratos').select('id,data_vencimento,valor_mensal_previsto').eq('area', area)
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
  }, [user, tick, area])

  if (!user) return <Login />

  function handleVerContrato(id) { setContratoSel(id) }
  function handleAtualizado() { setTick(t=>t+1) }

  return (
    <div className="layout">
      <Sidebar pagina={pagina} setPagina={setPagina} qtdAlertas={qtdAlertas} area={area} mudarArea={mudarArea} />
      <main className="main">
        {pagina==='dashboard' && <Dashboard onVerContrato={handleVerContrato} area={area} key={'d'+area+tick} />}
        {pagina==='contratos' && <Contratos onVerContrato={handleVerContrato} area={area} key={'c'+area+tick} />}
        {pagina==='alertas'   && <Alertas area={area} key={'a'+area+tick} />}
        {pagina==='orcamento' && <Orcamento area={area} key={'o'+area+tick} />}
        {pagina==='previsao'  && <Previsao onVerContrato={handleVerContrato} area={area} key={'p'+area+tick} />}
      </main>
      {contratoSel && <ModalDetalhe contratoId={contratoSel} onClose={() => setContratoSel(null)} onAtualizado={handleAtualizado} />}
    </div>
  )
}

const areaStyles = `
.area-btn { display:block; width:100%; text-align:left; padding:7px 10px; margin-bottom:4px; border:1px solid var(--border); border-radius:var(--radius); background:var(--surface); color:var(--text2); cursor:pointer; font-size:12px; font-family:inherit; }
.area-btn:hover { background:var(--bg); }
.area-btn.active { background:var(--blue); color:#fff; border-color:var(--blue); font-weight:600; }
`

export default function App() {
  useEffect(() => {
    const s = document.createElement('style')
    s.textContent = areaStyles
    document.head.appendChild(s)
    return () => { document.head.removeChild(s) }
  }, [])
  return <AuthProvider><AppShell /></AuthProvider>
}
