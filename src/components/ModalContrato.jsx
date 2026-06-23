import { useState } from 'react'
import { supabase } from '../lib/supabase'

export default function ModalContrato({ onClose, onSalvo, contrato }) {
  const [f, setF] = useState({
    numero: contrato?.numero || '',
    empresa: contrato?.empresa || '',
    sei_contrato: contrato?.sei_contrato || '',
    sei_pagamentos: contrato?.sei_pagamentos || '',
    digidoc_contrato: contrato?.digidoc_contrato || '',
    digidoc_pagamento: contrato?.digidoc_pagamento || '',
    local_unidade: contrato?.local_unidade || '',
    objeto: contrato?.objeto || '',
    gestor_nome: contrato?.gestor_nome || '',
    fiscal_nome: contrato?.fiscal_nome || '',
    data_vencimento: contrato?.data_vencimento || '',
    valor_mensal_previsto: contrato?.valor_mensal_previsto || '',
    loa_2026: contrato?.loa_2026 || '',
    nova_previsao: contrato?.nova_previsao || '',
    prev_2sem: contrato?.prev_2sem || '',
    observacoes: contrato?.observacoes || '',
  })
  const [salvando, setSalvando] = useState(false)

  const upd = (k, v) => setF(prev => ({ ...prev, [k]: v }))

  async function salvar() {
    if (!f.numero || !f.empresa) return alert('Informe o número e a empresa do contrato.')
    setSalvando(true)
    const payload = {
      ...f,
      valor_mensal_previsto: Number(f.valor_mensal_previsto) || 0,
      loa_2026: Number(f.loa_2026) || 0,
      nova_previsao: Number(f.nova_previsao) || 0,
      prev_2sem: Number(f.prev_2sem) || 0,
      data_vencimento: f.data_vencimento || null,
    }
    if (contrato?.id) {
      await supabase.from('contratos').update(payload).eq('id', contrato.id)
    } else {
      await supabase.from('contratos').insert(payload)
    }
    setSalvando(false)
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
        <div className="form-grid" style={{ marginBottom: 10 }}>
          <div className="field"><label>Digidoc — contrato</label><input value={f.digidoc_contrato} onChange={e => upd('digidoc_contrato', e.target.value)} /></div>
          <div className="field"><label>Digidoc — pagamento</label><input value={f.digidoc_pagamento} onChange={e => upd('digidoc_pagamento', e.target.value)} /></div>
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
          <div className="field"><label>Valor mensal previsto (R$)</label><input type="number" step="0.01" value={f.valor_mensal_previsto} onChange={e => upd('valor_mensal_previsto', e.target.value)} /></div>
        </div>
        <div className="form-grid cols3" style={{ marginBottom: 10 }}>
          <div className="field"><label>LOA 2026 (R$)</label><input type="number" step="0.01" value={f.loa_2026} onChange={e => upd('loa_2026', e.target.value)} /></div>
          <div className="field"><label>Nova previsão (R$)</label><input type="number" step="0.01" value={f.nova_previsao} onChange={e => upd('nova_previsao', e.target.value)} /></div>
          <div className="field"><label>Prev. 2º semestre (R$)</label><input type="number" step="0.01" value={f.prev_2sem} onChange={e => upd('prev_2sem', e.target.value)} /></div>
        </div>

        <div className="btn-row">
          <button className="btn" onClick={onClose}>Cancelar</button>
          <button className="btn primary" onClick={salvar} disabled={salvando}>
            {salvando ? 'Salvando...' : 'Salvar contrato'}
          </button>
        </div>
      </div>
    </div>
  )
}
