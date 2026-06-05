# Solidy - Desafio Técnico

Sistema SaaS multi-tenant para **controle de contratos** e **gestão orçamentária de obras** — cobre o ciclo completo desde a criação de contratos por template até a assinatura eletrônica, controle de custos, fornecedores, equipe e ordens de compra.

---

## Stack

| Camada        | Tecnologia                                    |
|---------------|-----------------------------------------------|
| Front-end     | React 19 + Vite + TypeScript                  |
| Estilização   | TailwindCSS v4                                |
| Estado global | Zustand 5 (persist middleware)                |
| HTTP client   | Axios                                         |
| Roteamento    | React Router v7                               |
| Back-end      | Node.js + Express + TypeScript                |
| ORM           | Prisma 7 (driver pg nativo)                   |
| Banco         | PostgreSQL 14+                                |
| Autenticação  | JWT (RS256) + multi-tenant por `companyId`    |
| Upload        | Multer (disco local)                          |
| E-mail        | Nodemailer (SMTP configurável)                |

---

## Pré-requisitos

- **Node.js 20+** — [nodejs.org](https://nodejs.org)
- **PostgreSQL 14+** rodando localmente ou via Docker
- **npm** (já incluso no Node) ou pnpm/yarn
- Conta de e-mail com SMTP para envio de assinaturas *(opcional — funciona sem)*

---

## Instalação e execução

### 1. Clone o repositório

```bash
git clone <url-do-repositorio>
cd desafio-solidy
```

### 2. Configure o banco de dados

Crie o banco no PostgreSQL:

```sql
CREATE DATABASE solidy_contracts;
```

Ou via Docker (forma rápida):

```bash
docker run -d \
  --name solidy-pg \
  -e POSTGRES_USER=solidy \
  -e POSTGRES_PASSWORD=solidy123 \
  -e POSTGRES_DB=solidy_contracts \
  -p 5432:5432 \
  postgres:16-alpine
```

### 3. Configure as variáveis de ambiente do backend

```bash
cd backend
cp .env.example .env
```

Edite o `.env` com os dados do seu banco:

```env
DATABASE_URL="postgresql://solidy:solidy123@localhost:5432/solidy_contracts"
JWT_SECRET="troque-por-uma-chave-segura-de-32-chars"
```

### 4. Instale as dependências

```bash
# Backend
cd backend
npm install

# Frontend
cd ../frontend
npm install
```

### 5. Execute as migrations e o seed

```bash
cd backend

# Cria/atualiza as tabelas
npm run db:migrate

# Popula com dados de demonstração
npm run db:seed
```

O seed cria:
- Empresa demo + 2 usuários (admin e operador)
- 4 templates de contrato (Obra, Serviço, Trabalho, Locação)
- 3 contratos de exemplo (SIGNED / PENDING_SIGNATURE / DRAFT)
- 2 obras completas com steps, custos, fornecedores e equipe
- 2 ordens de compra (DRAFT / APPROVED)
- Audit logs de exemplo

### 6. Inicie os servidores

Em dois terminais separados:

```bash
# Terminal 1 — backend (porta 3333)
cd backend
npm run dev

# Terminal 2 — frontend (porta 5173)
cd frontend
npm run dev
```

Acesse: **http://localhost:5173**

---

## Credenciais de acesso (seed)

| Usuário       | E-mail                    | Senha      | Perfil   |
|---------------|---------------------------|------------|----------|
| Admin Solidy  | admin@solidy.demo         | admin123   | ADMIN    |
| Carlos Operador | operador@solidy.demo    | senha123   | USER     |

---

## Variáveis de ambiente

### `backend/.env`

```env
# ─── Banco de dados ───────────────────────────────────────────
DATABASE_URL="postgresql://USER:PASSWORD@localhost:5432/solidy_contracts"

# ─── JWT ─────────────────────────────────────────────────────
JWT_SECRET="sua-chave-secreta-min-32-caracteres"
JWT_EXPIRES_IN="7d"                    # Expiração do token

# ─── Servidor ────────────────────────────────────────────────
PORT=3333
NODE_ENV="development"                 # development | production

# ─── SMTP (e-mail para links de assinatura) ──────────────────
SMTP_HOST="smtp.gmail.com"
SMTP_PORT=587
SMTP_SECURE=false                      # true para porta 465
SMTP_USER="seu-email@gmail.com"
SMTP_PASS="senha-de-app-do-google"     # Senha de app, não a senha da conta
SMTP_FROM="Solidy Contracts <seu-email@gmail.com>"

# ─── WhatsApp (opcional — Evolution API ou Twilio) ───────────
WHATSAPP_API_URL="https://sua-api-whatsapp.com"
WHATSAPP_API_KEY="sua-chave-api"
WHATSAPP_INSTANCE="default"

# ─── URLs da aplicação ────────────────────────────────────────
APP_URL="http://localhost:5173"        # URL do frontend (links de e-mail)
API_URL="http://localhost:3333"        # URL da API
```

> **Nota sobre SMTP:** O envio de e-mail é opcional para desenvolvimento. Se `SMTP_USER` não estiver configurado, a aplicação registra o link de assinatura no console em vez de enviar.

---

## Scripts disponíveis

### Backend

```bash
npm run dev          # Desenvolvimento com hot-reload (ts-node-dev)
npm run build        # Compila TypeScript → dist/
npm run start        # Inicia a versão compilada (produção)
npm run db:migrate   # Executa migrations pendentes
npm run db:seed      # Popula banco com dados de demonstração
npm run db:studio    # Abre o Prisma Studio (GUI do banco)
```

### Frontend

```bash
npm run dev          # Servidor de desenvolvimento Vite (porta 5173)
npm run build        # Build de produção → dist/
npm run preview      # Preview do build de produção
npm run lint         # ESLint
```

---

## Arquitetura Modular

```
desafio-solidy/
├── backend/                     # API Node.js + Express
│   ├── prisma/
│   │   ├── schema.prisma        # Schema completo do banco
│   │   ├── migrations/          # Migrations geradas pelo Prisma
│   │   └── seed.ts              # Dados de demonstração
│   └── src/
│       ├── modules/             # Módulos de negócio
│       │   ├── auth/            # Login, register, JWT
│       │   ├── companies/       # CRUD empresa (multi-tenant root)
│       │   ├── users/           # Gestão de usuários + convites
│       │   ├── contracts/       # CRUD contratos + vigência
│       │   ├── templates/       # Templates com campos dinâmicos
│       │   ├── signatures/      # Assinatura eletrônica + notificações
│       │   ├── obras/           # Obras + steps/vistorias/custos/equipe
│       │   │   ├── steps/
│       │   │   ├── vistorias/
│       │   │   ├── custos/
│       │   │   ├── fornecedores/
│       │   │   └── equipe/
│       │   ├── purchase-orders/ # Ordens de compra
│       │   ├── uploads/         # Upload de arquivos (multer)
│       │   └── reports/         # Relatórios consolidados
│       └── shared/
│           ├── middleware/      # auth, tenant, audit, error
│           └── lib/             # prisma singleton, jwt helpers
│
└── frontend/                    # React + Vite
    └── src/
        ├── modules/             # Módulos por domínio
        │   ├── auth/            # Login, register, Zustand store
        │   ├── dashboard/       # KPIs principais
        │   ├── contracts/       # Lista, detalhe, novo, gerenciador
        │   ├── templates/       # Biblioteca de templates
        │   ├── signatures/      # Fila de assinaturas + página pública
        │   ├── obras/           # Lista e detalhe com 6 abas
        │   ├── purchase-orders/ # Lista e formulário de O.C.
        │   ├── reports/         # Relatórios com exportação JSON
        │   └── settings/        # Empresa + gestão de usuários
        ├── shared/
        │   ├── components/ui/   # Button, Input, Modal, Badge, Card…
        │   ├── components/layout/ # Sidebar, TopBar, AppLayout
        │   └── lib/             # axios instance, formatters
        └── router/              # React Router v7 + PrivateRoute
```

### Isolamento multi-tenant

Cada requisição autenticada carrega `companyId` no payload do JWT. O middleware `tenant.middleware.ts` injeta `req.companyId` em todo endpoint protegido, garantindo que cada empresa acesse apenas seus próprios dados.

### Assinatura eletrônica

1. O usuário cria uma `SignatureRequest` com e-mail, telefone e canal (EMAIL / WhatsApp / Ambos).
2. A API gera um token único, calcula a expiração e dispara a notificação.
3. O signatário acessa `/sign/:token` (rota **pública**, sem login) e assina clicando no botão após aceitar os termos.
4. Após todas as assinaturas, o contrato muda para `SIGNED` automaticamente.
5. Fundamentação legal: MP 2.200-2/2001 + Lei 14.063/2020.

---

## Módulos e rotas principais

| Rota frontend         | Descrição                                     |
|-----------------------|-----------------------------------------------|
| `/dashboard`          | KPIs: contratos, obras, assinaturas, valores  |
| `/contracts`          | Listagem com filtros e paginação              |
| `/contracts/new`      | Wizard de criação a partir de template        |
| `/contracts/manager`  | Painel de vigência com alertas de vencimento  |
| `/contracts/:id`      | Detalhe do contrato + histórico de assinaturas|
| `/templates`          | Biblioteca de templates por categoria         |
| `/signatures/queue`   | Fila de assinaturas pendentes                 |
| `/sign/:token`        | **Página pública** de assinatura eletrônica   |
| `/obras`              | Listagem de obras com barra de orçamento      |
| `/obras/:id`          | Detalhe: Roteiro / Vistorias / Custos / Fornecedores / Equipe / O.C. |
| `/purchase-orders`    | Listagem e emissão de ordens de compra        |
| `/reports`            | Relatórios filtráveis + exportação JSON       |
| `/settings`           | Dados da empresa + gestão de usuários         |

---

## Fluxo completo da aplicação

```
Login
 └─► Dashboard (KPIs consolidados)
       ├─► Templates → Novo Contrato (wizard 4 etapas)
       │     └─► Preview HTML → Salvar como DRAFT
       │           └─► Enviar para assinatura (e-mail / WhatsApp)
       │                 └─► Signatário acessa /sign/:token → Assina
       │                       └─► Contrato SIGNED
       │                             └─► Vincular a uma Obra
       │                                   └─► Roteiro → Vistoria Inicial
       │                                         └─► Lançar Custos → Emitir O.C.
       │                                               └─► Vistoria Final → COMPLETED
       └─► Relatórios / Configurações / Gestão de Usuários
```

---

## Banco de dados — tabelas principais

| Tabela                    | Descrição                                              |
|---------------------------|--------------------------------------------------------|
| `companies`               | Root do multi-tenant                                   |
| `users`                   | Usuários com role (ADMIN / USER / VIEWER)              |
| `contract_templates`      | Templates com corpo HTML e campos dinâmicos            |
| `contract_template_fields`| Campos tipados por template (TEXT, DATE, CURRENCY…)    |
| `contracts`               | Contratos com status e fieldValues preenchidos         |
| `signature_requests`      | Solicitações de assinatura por token + canal           |
| `obras`                   | Obras vinculadas a contratos e empresas                |
| `obra_steps`              | Checklist por fase (PLANNING / EXECUTION / DELIVERY)   |
| `obra_vistorias`          | Vistorias INITIAL/FINAL com fotos                      |
| `obra_custos`             | Lançamentos de custo categorizados                     |
| `obra_fornecedores`       | Fornecedores da obra com CNPJ e valor contratado       |
| `obra_equipe_membros`     | Membros da equipe por função e período                 |
| `purchase_orders`         | Ordens de compra com itens JSON e status               |
| `uploads`                 | Arquivos polimórficos (vistorias, contratos…)          |
| `audit_logs`              | Log de ações com usuário, entidade e payload           |

---

## Solução de problemas

**`DATABASE_URL` inválida**
Verifique usuário, senha, host e nome do banco. Use `psql` para testar a conexão antes de rodar as migrations.

**Erro de CORS no frontend**
Confirme que `PORT=3333` no backend e que o `APP_URL` no `.env` aponta para `http://localhost:5173`.

**Upload de fotos não funciona**
O diretório `backend/uploads/` é criado automaticamente. Em produção, configure um storage externo (S3, Cloudflare R2) apontado pela variável de ambiente correspondente.

**E-mails não são enviados**
Configure `SMTP_USER` e `SMTP_PASS`. Para Gmail, gere uma *senha de app* em [myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords). Sem configuração, o link de assinatura é exibido no log do servidor.

---

## Licença

MIT — uso livre para fins educacionais e comerciais.
