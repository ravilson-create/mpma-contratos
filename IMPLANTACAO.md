# MPMA — Contratos de Manutenção
## Guia de implantação: Supabase + Vercel

---

## PASSO 1 — Criar o projeto no Supabase

1. Acesse https://supabase.com e crie uma conta gratuita
2. Clique em **New project**
3. Preencha:
   - Organization: crie ou selecione uma
   - Name: `mpma-contratos`
   - Database Password: anote em lugar seguro
   - Region: `South America (São Paulo)` — ap-southeast-1
4. Aguarde o projeto ser criado (~2 minutos)

---

## PASSO 2 — Criar o banco de dados

1. No painel do Supabase, clique em **SQL Editor** no menu lateral
2. Clique em **New query**
3. Abra o arquivo `supabase/migrations/001_schema_inicial.sql`
4. Cole todo o conteúdo no editor
5. Clique em **Run** (ou Ctrl+Enter)
6. Verifique se apareceu "Success. No rows returned"

---

## PASSO 3 — Criar o primeiro usuário administrador

1. No Supabase, vá em **Authentication > Users**
2. Clique em **Add user > Create new user**
3. Preencha:
   - Email: seu e-mail institucional
   - Password: senha segura
   - ✅ Auto Confirm User
4. Clique em **Create user**
5. Copie o **UUID** do usuário criado (coluna "UID")

6. Volte ao **SQL Editor** e execute:
```sql
UPDATE public.perfis
SET perfil = 'admin', nome = 'Seu Nome Aqui'
WHERE email = 'seu-email@mpma.mp.br';
```

---

## PASSO 4 — Inserir os contratos iniciais

1. No **SQL Editor**, abra o arquivo `supabase/migrations/001_schema_inicial.sql`
2. Role até o final — localize o bloco comentado com `/* insert into ... */`
3. Remova os `/*` e `*/` para descomentar
4. Execute para inserir os 10 contratos reais do MPMA

---

## PASSO 5 — Obter as chaves do Supabase

1. No Supabase, vá em **Settings > API**
2. Copie:
   - **Project URL** → ex: `https://abcdefgh.supabase.co`
   - **anon public key** → chave longa começando com `eyJ...`

---

## PASSO 6 — Publicar no Vercel

### Opção A — Via GitHub (recomendado)

1. Crie uma conta em https://github.com (se não tiver)
2. Crie um repositório novo: `mpma-contratos`
3. Faça upload de todos os arquivos da pasta do projeto
4. Acesse https://vercel.com e faça login com sua conta GitHub
5. Clique em **Add New > Project**
6. Selecione o repositório `mpma-contratos`
7. Em **Environment Variables**, adicione:
   ```
   VITE_SUPABASE_URL = https://SEU-PROJETO.supabase.co
   VITE_SUPABASE_ANON_KEY = sua-chave-anon
   ```
8. Clique em **Deploy**
9. Após ~2 minutos, o sistema estará no ar com uma URL do tipo:
   `https://mpma-contratos.vercel.app`

### Opção B — Via Vercel CLI (linha de comando)

```bash
npm install -g vercel
cd mpma-contratos
npm install
vercel
# Siga as instruções e informe as variáveis de ambiente quando solicitado
```

---

## PASSO 7 — Configurar domínio personalizado (opcional)

1. No Vercel, vá em **Settings > Domains**
2. Adicione seu domínio: ex: `contratos.mpma.mp.br`
3. Configure o DNS conforme as instruções do Vercel

---

## Estrutura de arquivos

```
mpma-contratos/
├── index.html
├── package.json
├── vite.config.js
├── .env.example           ← copie para .env.local com suas chaves
├── supabase/
│   └── migrations/
│       └── 001_schema_inicial.sql   ← execute no Supabase
└── src/
    ├── main.jsx
    ├── App.jsx
    ├── index.css
    ├── lib/
    │   └── supabase.js    ← cliente + helpers financeiros
    ├── hooks/
    │   └── useAuth.jsx    ← autenticação
    ├── components/
    │   ├── Sidebar.jsx
    │   ├── ModalContrato.jsx
    │   └── ModalDetalhe.jsx
    └── pages/
        ├── Login.jsx
        ├── Dashboard.jsx
        ├── Contratos.jsx
        ├── Alertas.jsx
        └── Orcamento.jsx
```

---

## Perfis de acesso

| Perfil       | Ver | Cadastrar contrato | Empenho/Medição | Excluir |
|---|---|---|---|---|
| admin        | ✅  | ✅                 | ✅              | ✅      |
| gestor       | ✅  | ✅                 | ✅              | ✅      |
| fiscal       | ✅  | ✗                  | ✅              | ✗       |
| visualizador | ✅  | ✗                  | ✗               | ✗       |

Para alterar o perfil de um usuário, execute no SQL Editor:
```sql
UPDATE public.perfis SET perfil = 'gestor' WHERE email = 'usuario@mpma.mp.br';
```

---

## Suporte e manutenção

- Backups automáticos diários: já habilitados no Supabase (plano gratuito = 7 dias)
- Logs de acesso: Supabase > Authentication > Logs
- Monitoramento: Vercel > Analytics (gratuito)
- Limite gratuito Supabase: 500 MB banco, 50.000 usuários ativos/mês
- Limite gratuito Vercel: 100 GB bandwidth/mês (mais que suficiente)
