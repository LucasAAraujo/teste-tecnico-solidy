-- =============================================================
-- ROW LEVEL SECURITY (RLS) — Solidy Contracts
--
-- Estratégia:
--   1. A aplicação seta `SET LOCAL app.company_id = '<id>'`
--      dentro de cada transação (via rls-middleware.ts).
--   2. Cada policy usa current_setting('app.company_id', true)
--      para filtrar as linhas pelo tenant correto.
--   3. FORCE ROW LEVEL SECURITY garante que mesmo o dono da
--      tabela (role de migração) seja afetado quando conectado
--      como app_user.
--   4. O role app_user é usado pela aplicação; o role owner
--      (usado nas migrations) bypassa o RLS naturalmente.
-- =============================================================


-- -------------------------------------------------------------
-- ROLES
-- -------------------------------------------------------------

-- Role para a aplicação (sem permissão de bypass de RLS)
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'app_user') THEN
    CREATE ROLE app_user NOLOGIN;
  END IF;
END
$$;

-- Concede acesso às tabelas para app_user (ajuste o schema se necessário)
GRANT USAGE ON SCHEMA public TO app_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO app_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO app_user;


-- =============================================================
-- TABELAS COM company_id DIRETO
-- =============================================================

-- -------------------------------------------------------------
-- companies
-- Cada empresa vê apenas o próprio registro.
-- -------------------------------------------------------------
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE companies FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS companies_tenant_isolation ON companies;
CREATE POLICY companies_tenant_isolation ON companies
  USING (id = current_setting('app.company_id', true));


-- -------------------------------------------------------------
-- users
-- -------------------------------------------------------------
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE users FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS users_tenant_isolation ON users;
CREATE POLICY users_tenant_isolation ON users
  USING (company_id = current_setting('app.company_id', true));


-- -------------------------------------------------------------
-- contract_templates
-- -------------------------------------------------------------
ALTER TABLE contract_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE contract_templates FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS contract_templates_tenant_isolation ON contract_templates;
CREATE POLICY contract_templates_tenant_isolation ON contract_templates
  USING (company_id = current_setting('app.company_id', true));


-- -------------------------------------------------------------
-- contracts
-- -------------------------------------------------------------
ALTER TABLE contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE contracts FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS contracts_tenant_isolation ON contracts;
CREATE POLICY contracts_tenant_isolation ON contracts
  USING (company_id = current_setting('app.company_id', true));


-- -------------------------------------------------------------
-- obras
-- -------------------------------------------------------------
ALTER TABLE obras ENABLE ROW LEVEL SECURITY;
ALTER TABLE obras FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS obras_tenant_isolation ON obras;
CREATE POLICY obras_tenant_isolation ON obras
  USING (company_id = current_setting('app.company_id', true));


-- -------------------------------------------------------------
-- uploads
-- -------------------------------------------------------------
ALTER TABLE uploads ENABLE ROW LEVEL SECURITY;
ALTER TABLE uploads FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS uploads_tenant_isolation ON uploads;
CREATE POLICY uploads_tenant_isolation ON uploads
  USING (company_id = current_setting('app.company_id', true));


-- -------------------------------------------------------------
-- audit_logs
-- -------------------------------------------------------------
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS audit_logs_tenant_isolation ON audit_logs;
CREATE POLICY audit_logs_tenant_isolation ON audit_logs
  USING (company_id = current_setting('app.company_id', true));


-- =============================================================
-- TABELAS FILHAS (sem company_id — filtradas via parent)
-- =============================================================

-- -------------------------------------------------------------
-- contract_template_fields  →  template → company_id
-- -------------------------------------------------------------
ALTER TABLE contract_template_fields ENABLE ROW LEVEL SECURITY;
ALTER TABLE contract_template_fields FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS contract_template_fields_tenant_isolation ON contract_template_fields;
CREATE POLICY contract_template_fields_tenant_isolation ON contract_template_fields
  USING (
    EXISTS (
      SELECT 1 FROM contract_templates t
      WHERE t.id = contract_template_fields.template_id
        AND t.company_id = current_setting('app.company_id', true)
    )
  );


-- -------------------------------------------------------------
-- signature_requests  →  contract → company_id
-- -------------------------------------------------------------
ALTER TABLE signature_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE signature_requests FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS signature_requests_tenant_isolation ON signature_requests;
CREATE POLICY signature_requests_tenant_isolation ON signature_requests
  USING (
    EXISTS (
      SELECT 1 FROM contracts c
      WHERE c.id = signature_requests.contract_id
        AND c.company_id = current_setting('app.company_id', true)
    )
  );


-- -------------------------------------------------------------
-- obra_steps  →  obra → company_id
-- -------------------------------------------------------------
ALTER TABLE obra_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE obra_steps FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS obra_steps_tenant_isolation ON obra_steps;
CREATE POLICY obra_steps_tenant_isolation ON obra_steps
  USING (
    EXISTS (
      SELECT 1 FROM obras o
      WHERE o.id = obra_steps.obra_id
        AND o.company_id = current_setting('app.company_id', true)
    )
  );


-- -------------------------------------------------------------
-- obra_vistorias  →  obra → company_id
-- -------------------------------------------------------------
ALTER TABLE obra_vistorias ENABLE ROW LEVEL SECURITY;
ALTER TABLE obra_vistorias FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS obra_vistorias_tenant_isolation ON obra_vistorias;
CREATE POLICY obra_vistorias_tenant_isolation ON obra_vistorias
  USING (
    EXISTS (
      SELECT 1 FROM obras o
      WHERE o.id = obra_vistorias.obra_id
        AND o.company_id = current_setting('app.company_id', true)
    )
  );


-- -------------------------------------------------------------
-- obra_custos  →  obra → company_id
-- -------------------------------------------------------------
ALTER TABLE obra_custos ENABLE ROW LEVEL SECURITY;
ALTER TABLE obra_custos FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS obra_custos_tenant_isolation ON obra_custos;
CREATE POLICY obra_custos_tenant_isolation ON obra_custos
  USING (
    EXISTS (
      SELECT 1 FROM obras o
      WHERE o.id = obra_custos.obra_id
        AND o.company_id = current_setting('app.company_id', true)
    )
  );


-- -------------------------------------------------------------
-- obra_fornecedores  →  obra → company_id
-- -------------------------------------------------------------
ALTER TABLE obra_fornecedores ENABLE ROW LEVEL SECURITY;
ALTER TABLE obra_fornecedores FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS obra_fornecedores_tenant_isolation ON obra_fornecedores;
CREATE POLICY obra_fornecedores_tenant_isolation ON obra_fornecedores
  USING (
    EXISTS (
      SELECT 1 FROM obras o
      WHERE o.id = obra_fornecedores.obra_id
        AND o.company_id = current_setting('app.company_id', true)
    )
  );


-- -------------------------------------------------------------
-- obra_equipe_membros  →  obra → company_id
-- -------------------------------------------------------------
ALTER TABLE obra_equipe_membros ENABLE ROW LEVEL SECURITY;
ALTER TABLE obra_equipe_membros FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS obra_equipe_membros_tenant_isolation ON obra_equipe_membros;
CREATE POLICY obra_equipe_membros_tenant_isolation ON obra_equipe_membros
  USING (
    EXISTS (
      SELECT 1 FROM obras o
      WHERE o.id = obra_equipe_membros.obra_id
        AND o.company_id = current_setting('app.company_id', true)
    )
  );


-- -------------------------------------------------------------
-- purchase_orders  →  obra → company_id
-- -------------------------------------------------------------
ALTER TABLE purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_orders FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS purchase_orders_tenant_isolation ON purchase_orders;
CREATE POLICY purchase_orders_tenant_isolation ON purchase_orders
  USING (
    EXISTS (
      SELECT 1 FROM obras o
      WHERE o.id = purchase_orders.obra_id
        AND o.company_id = current_setting('app.company_id', true)
    )
  );


-- =============================================================
-- ROTA PÚBLICA: assinatura eletrônica via token
-- Permite SELECT em signature_requests sem company_id setado
-- (usado na página pública /sign/:token).
-- =============================================================

DROP POLICY IF EXISTS signature_requests_public_token ON signature_requests;
CREATE POLICY signature_requests_public_token ON signature_requests
  FOR SELECT
  USING (
    current_setting('app.company_id', true) IS NOT DISTINCT FROM ''
    OR current_setting('app.company_id', true) IS NULL
  );
