-- ============================================================
--  MPMA — Gestão de Contratos de Manutenção
--  Schema inicial — Supabase / PostgreSQL
--  Execute este arquivo no SQL Editor do Supabase
-- ============================================================

-- Extensões
create extension if not exists "uuid-ossp";

-- ============================================================
-- TABELA: usuarios (gerenciada pelo Supabase Auth)
-- Perfis complementares ao auth.users
-- ============================================================
create table public.perfis (
  id          uuid primary key references auth.users(id) on delete cascade,
  nome        text not null,
  email       text not null,
  perfil      text not null default 'visualizador'
                check (perfil in ('admin','gestor','fiscal','visualizador')),
  ativo       boolean not null default true,
  criado_em   timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

-- ============================================================
-- TABELA: contratos
-- ============================================================
create table public.contratos (
  id              uuid primary key default uuid_generate_v4(),
  numero          text not null unique,
  empresa         text not null,
  sei_contrato    text,
  sei_pagamentos  text,
  digidoc_contrato  text,
  digidoc_pagamento text,
  local_unidade   text,
  objeto          text,
  gestor_id       uuid references public.perfis(id),
  fiscal_id       uuid references public.perfis(id),
  gestor_nome     text,
  fiscal_nome     text,
  data_inicio     date,
  data_vencimento date,
  valor_mensal_previsto numeric(15,2) default 0,
  loa_2026        numeric(15,2) default 0,
  nova_previsao   numeric(15,2) default 0,
  prev_2sem       numeric(15,2) default 0,
  status          text not null default 'ativo'
                    check (status in ('ativo','encerrado','suspenso')),
  observacoes     text,
  criado_por      uuid references public.perfis(id),
  criado_em       timestamptz not null default now(),
  atualizado_em   timestamptz not null default now()
);

-- ============================================================
-- TABELA: empenhos
-- ============================================================
create table public.empenhos (
  id            uuid primary key default uuid_generate_v4(),
  contrato_id   uuid not null references public.contratos(id) on delete cascade,
  numero        text not null,
  data_empenho  date not null,
  valor         numeric(15,2) not null check (valor > 0),
  descricao     text,
  criado_por    uuid references public.perfis(id),
  criado_em     timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

-- ============================================================
-- TABELA: medicoes
-- ============================================================
create table public.medicoes (
  id            uuid primary key default uuid_generate_v4(),
  contrato_id   uuid not null references public.contratos(id) on delete cascade,
  numero        text not null,
  mes_referencia text,              -- ex: '2026-06'
  data_medicao  date,
  valor         numeric(15,2) not null check (valor > 0),
  descricao     text,
  status        text not null default 'paga'
                  check (status in ('paga','pendente','contestada')),
  criado_por    uuid references public.perfis(id),
  criado_em     timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

-- ============================================================
-- VIEW: resumo_financeiro
-- Calcula totais empenhados, medidos e saldo por contrato
-- ============================================================
create or replace view public.resumo_financeiro as
select
  c.id,
  c.numero,
  c.empresa,
  c.local_unidade,
  c.data_vencimento,
  c.valor_mensal_previsto,
  c.loa_2026,
  c.nova_previsao,
  c.prev_2sem,
  c.status,
  coalesce(sum(distinct e.valor), 0)   as total_empenhado,
  coalesce(sum(distinct m.valor), 0)   as total_medido,
  coalesce(sum(distinct e.valor), 0)
    - coalesce(sum(distinct m.valor), 0) as saldo_empenho,
  count(distinct e.id)                 as qtd_empenhos,
  count(distinct m.id)                 as qtd_medicoes
from public.contratos c
left join public.empenhos e  on e.contrato_id = c.id
left join public.medicoes m  on m.contrato_id = c.id
group by c.id;

-- ============================================================
-- VIEW: medicoes_com_saldo
-- Saldo acumulado após cada medição (para tabela de evolução)
-- ============================================================
create or replace view public.medicoes_com_saldo as
select
  m.*,
  c.numero as contrato_numero,
  c.empresa,
  (
    select coalesce(sum(e2.valor), 0)
    from public.empenhos e2
    where e2.contrato_id = m.contrato_id
  ) -
  (
    select coalesce(sum(m2.valor), 0)
    from public.medicoes m2
    where m2.contrato_id = m.contrato_id
      and (m2.data_medicao < m.data_medicao
           or (m2.data_medicao = m.data_medicao and m2.criado_em <= m.criado_em))
  ) as saldo_apos_medicao
from public.medicoes m
join public.contratos c on c.id = m.contrato_id;

-- ============================================================
-- RLS — Row Level Security
-- ============================================================
alter table public.perfis   enable row level security;
alter table public.contratos enable row level security;
alter table public.empenhos  enable row level security;
alter table public.medicoes  enable row level security;

-- Perfis: cada usuário lê todos, edita só o próprio
create policy "perfis_select" on public.perfis for select using (true);
create policy "perfis_update" on public.perfis for update using (auth.uid() = id);

-- Contratos: todos autenticados leem; gestor/admin cria e edita
create policy "contratos_select" on public.contratos for select
  using (auth.role() = 'authenticated');

create policy "contratos_insert" on public.contratos for insert
  with check (
    exists (
      select 1 from public.perfis
      where id = auth.uid() and perfil in ('admin','gestor')
    )
  );

create policy "contratos_update" on public.contratos for update
  using (
    exists (
      select 1 from public.perfis
      where id = auth.uid() and perfil in ('admin','gestor')
    )
  );

-- Empenhos: todos leem; gestor/admin/fiscal insere
create policy "empenhos_select" on public.empenhos for select
  using (auth.role() = 'authenticated');

create policy "empenhos_insert" on public.empenhos for insert
  with check (
    exists (
      select 1 from public.perfis
      where id = auth.uid() and perfil in ('admin','gestor','fiscal')
    )
  );

create policy "empenhos_delete" on public.empenhos for delete
  using (
    exists (
      select 1 from public.perfis
      where id = auth.uid() and perfil in ('admin','gestor')
    )
  );

-- Medições: todos leem; fiscal/gestor/admin insere
create policy "medicoes_select" on public.medicoes for select
  using (auth.role() = 'authenticated');

create policy "medicoes_insert" on public.medicoes for insert
  with check (
    exists (
      select 1 from public.perfis
      where id = auth.uid() and perfil in ('admin','gestor','fiscal')
    )
  );

create policy "medicoes_delete" on public.medicoes for delete
  using (
    exists (
      select 1 from public.perfis
      where id = auth.uid() and perfil in ('admin','gestor')
    )
  );

-- ============================================================
-- FUNÇÃO: atualiza campo atualizado_em automaticamente
-- ============================================================
create or replace function public.set_atualizado_em()
returns trigger language plpgsql as $$
begin
  new.atualizado_em = now();
  return new;
end;
$$;

create trigger tr_contratos_upd before update on public.contratos
  for each row execute function public.set_atualizado_em();
create trigger tr_empenhos_upd  before update on public.empenhos
  for each row execute function public.set_atualizado_em();
create trigger tr_medicoes_upd  before update on public.medicoes
  for each row execute function public.set_atualizado_em();
create trigger tr_perfis_upd    before update on public.perfis
  for each row execute function public.set_atualizado_em();

-- ============================================================
-- FUNÇÃO: cria perfil automaticamente ao registrar usuário
-- ============================================================
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.perfis (id, nome, email, perfil)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'nome', split_part(new.email,'@',1)),
    new.email,
    'visualizador'
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================
-- DADOS INICIAIS — Contratos reais do MPMA (2026)
-- Execute após criar o primeiro usuário admin
-- ============================================================

-- Substitua 'SEU-USER-ID-AQUI' pelo UUID do primeiro usuário admin
-- que você criará no Supabase Auth após configurar o projeto.

/*
insert into public.contratos
  (numero, empresa, sei_contrato, sei_pagamentos, digidoc_contrato, digidoc_pagamento,
   local_unidade, data_vencimento, valor_mensal_previsto, loa_2026, nova_previsao, prev_2sem)
values
  ('05/2020','Superfrio','19.13.0048.0001784/2026-90','19.13.0048.0005908/2026-98','15199/2020','24031/2024','Prédio sede das Promotorias da Capital',null,64230,770760,436689.55,389880),
  ('22/2020','Superfrio','19.13.0048.0031648/2025-29','19.13.0048.0006096/2026-66','22290/2019','24034/2024','Promotorias da capital e região metropolitana','2026-08-13',14675.89,176110.68,176740.67,88595.34),
  ('03/2022','Superfrio','19.13.0048.0030045/2025-48','19.13.0048.0006183/2026-45','23498/2024 / 13431/2021','24026/2024','Promotorias dos municípios do MA','2027-01-20',170483.82,2045805.88,1410987.12,735493.56),
  ('32/2023','Superfrio','19.13.0048.0031687/2025-43','19.13.0048.0006212/2026-38','18969/2022','24027/2024','Prédio sede da PGJ-MA','2028-08-08',73012.80,876153.60,876153.60,438076.80),
  ('61/2021','MDA Elevadores','19.13.0048.0031695/2025-21','19.13.0048.0006303/2026-06','14592/2021','24616/2024','PGJ e PROMOCAP','2026-06-30',7016.65,84199.80,84199.80,42099.90),
  ('62/2025','Elevadores Ok','19.13.0048.0031699/2025-10','19.13.0048.0006314/2026-97','11051/2025','24274/2024','CCA e Timon','2026-11-17',5399.99,64799.88,64799.88,32399.94),
  ('02/2023','ICP','19.13.0048.0026024/2025-72','19.13.0048.0006373/2026-56','15124/2022','24193/2024','Promotorias de Justiça de Imperatriz','2027-01-31',1800,21600,21600,10800),
  ('22/2024','SAGA','19.13.0048.0014585/2026-74','19.13.0048.0005635/2026-97','20964/2023','510/2025','PGJ, PROMOCAP, Região Metropolitana e Capital','2029-04-08',126271.51,1515258.08,1308515.13,1057629.06),
  ('18/2023','TORQUATO','19.13.0048.0010937/2026-18','19.13.0048.0005779/2026-89','3975/2022','503/2025','Promotorias dos municípios do MA','2026-07-05',280761.72,3369140.62,2732915.11,2184570.31),
  ('12/2026','FAM DA AMAZÔNIA',null,'19.13.0048.0011807/2026-02',null,null,'Compra de Peças Climatização VRF',null,0,89192,89192,4574.01);
*/
