import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
)

// Formata valor em R$
export const fmt = (v) =>
  Number(v || 0).toLocaleString('pt-BR', {
    style: 'currency', currency: 'BRL',
    minimumFractionDigits: 2, maximumFractionDigits: 2
  })

// Dias até uma data
export const diasAte = (d) => {
  if (!d) return 9999
  return Math.ceil((new Date(d + 'T00:00:00') - new Date()) / 864e5)
}

// Status do contrato baseado em prazo e saldo
export const statusContrato = (c) => {
  const dias = diasAte(c.data_vencimento)
  const saldo = Number(c.saldo_empenho || 0)
  const mensal = Number(c.valor_mensal_previsto || 0)
  const temEmp = Number(c.total_empenhado || 0) > 0
  if (saldo < 0 && temEmp) return 'negativo'
  if (temEmp && saldo < mensal) return 'critico'
  if (!c.data_vencimento) return 'ativo'
  if (dias <= 30) return 'critico'
  if (dias <= 120) return 'alerta'
  return 'ativo'
}

// Gera alertas a partir dos resumos financeiros
export const gerarAlertas = (resumos) => {
  const al = []
  resumos.forEach(c => {
    const dias = diasAte(c.data_vencimento)
    const saldo = Number(c.saldo_empenho || 0)
    const mensal = Number(c.valor_mensal_previsto || 0)
    const temEmp = Number(c.total_empenhado || 0) > 0
    if (saldo < 0 && temEmp)
      al.push({ tipo: 'critico', contrato: c.numero, empresa: c.empresa,
        msg: `Saldo NEGATIVO (${fmt(saldo)}) — empenho precisa ser reforçado urgentemente` })
    else if (temEmp && saldo < mensal)
      al.push({ tipo: 'critico', contrato: c.numero, empresa: c.empresa,
        msg: `Saldo insuficiente (${fmt(saldo)}) para cobrir uma medição mensal (${fmt(mensal)})` })
    else if (temEmp && saldo < mensal * 2)
      al.push({ tipo: 'warn', contrato: c.numero, empresa: c.empresa,
        msg: `Saldo baixo (${fmt(saldo)}) — reforce o empenho em breve` })
    if (c.data_vencimento && dias >= 0 && dias <= 30)
      al.push({ tipo: 'critico', contrato: c.numero, empresa: c.empresa,
        msg: `Contrato vence em ${dias} dia${dias === 1 ? '' : 's'} — providencie renovação` })
    else if (c.data_vencimento && dias > 30 && dias <= 120)
      al.push({ tipo: 'warn', contrato: c.numero, empresa: c.empresa,
        msg: `Contrato vence em ${dias} dias (${new Date(c.data_vencimento + 'T00:00:00').toLocaleDateString('pt-BR')})` })
  })
  return al
}
