import { PrismaClient, FieldType } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import bcrypt from 'bcryptjs';
import pg from 'pg';
import 'dotenv/config';

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('🌱 Seeding database…');

  // ──────────────────────────────────────────
  // 1. Empresa demo
  // ──────────────────────────────────────────
  const company = await prisma.company.upsert({
    where: { cnpj: '00.000.000/0001-00' },
    update: {},
    create: {
      name: 'Solidy Construtora Demo',
      cnpj: '00.000.000/0001-00',
    },
  });

  console.log(`✅ Company: ${company.name}`);

  // ──────────────────────────────────────────
  // 2. Usuários
  // ──────────────────────────────────────────
  const passwordHash = await bcrypt.hash('admin123', 12);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@solidy.demo' },
    update: {},
    create: {
      companyId: company.id,
      name: 'Admin Solidy',
      email: 'admin@solidy.demo',
      password: passwordHash,
      role: 'ADMIN',
    },
  });

  const userOp = await prisma.user.upsert({
    where: { email: 'operador@solidy.demo' },
    update: {},
    create: {
      companyId: company.id,
      name: 'Carlos Operador',
      email: 'operador@solidy.demo',
      password: await bcrypt.hash('senha123', 12),
      role: 'USER',
    },
  });

  console.log(`✅ User: ${admin.email} (ADMIN)`);
  console.log(`✅ User: ${userOp.email} (USER)`);

  // ──────────────────────────────────────────
  // 3. Templates de contrato
  // ──────────────────────────────────────────

  const tPrestacao = await prisma.contractTemplate.upsert({
    where: { id: 'seed-template-prestacao' },
    update: {},
    create: {
      id: 'seed-template-prestacao',
      companyId: company.id,
      name: 'Prestação de Serviço',
      category: 'service',
      body: `
<h2>CONTRATO DE PRESTAÇÃO DE SERVIÇOS</h2>
<p>
  <strong>CONTRATANTE:</strong> {{contratante_nome}}, inscrito(a) no CPF/CNPJ sob o nº {{contratante_documento}},
  com sede em {{contratante_endereco}}.
</p>
<p>
  <strong>CONTRATADO(A):</strong> {{contratado_nome}}, inscrito(a) no CPF/CNPJ sob o nº {{contratado_documento}},
  com sede em {{contratado_endereco}}.
</p>
<h3>OBJETO</h3>
<p>{{descricao_servico}}</p>
<h3>VALOR E PAGAMENTO</h3>
<p>Valor total: {{valor_total}}. Forma de pagamento: {{forma_pagamento}}.</p>
<h3>PRAZO</h3>
<p>Início: {{data_inicio}}. Término: {{data_termino}}.</p>
<p>{{contratante_assinatura}} &nbsp;&nbsp;&nbsp; {{contratado_assinatura}}</p>
`.trim(),
    },
  });

  await upsertFields(tPrestacao.id, [
    { key: 'contratante_nome',       label: 'Nome do Contratante',     type: 'TEXT',      order: 1 },
    { key: 'contratante_documento',  label: 'CPF/CNPJ do Contratante', type: 'CNPJ',      order: 2 },
    { key: 'contratante_endereco',   label: 'Endereço do Contratante', type: 'TEXT',      order: 3 },
    { key: 'contratado_nome',        label: 'Nome do Contratado',      type: 'TEXT',      order: 4 },
    { key: 'contratado_documento',   label: 'CPF/CNPJ do Contratado',  type: 'CPF',       order: 5 },
    { key: 'contratado_endereco',    label: 'Endereço do Contratado',  type: 'TEXT',      order: 6 },
    { key: 'descricao_servico',      label: 'Descrição do Serviço',    type: 'TEXT',      order: 7 },
    { key: 'valor_total',            label: 'Valor Total',             type: 'CURRENCY',  order: 8 },
    { key: 'forma_pagamento',        label: 'Forma de Pagamento',      type: 'TEXT',      order: 9 },
    { key: 'data_inicio',            label: 'Data de Início',          type: 'DATE',      order: 10 },
    { key: 'data_termino',           label: 'Data de Término',         type: 'DATE',      order: 11 },
    { key: 'contratante_assinatura', label: 'Assinatura do Contratante', type: 'SIGNATURE', order: 12 },
    { key: 'contratado_assinatura',  label: 'Assinatura do Contratado',  type: 'SIGNATURE', order: 13 },
  ]);

  console.log(`✅ Template: ${tPrestacao.name}`);

  const tTrabalho = await prisma.contractTemplate.upsert({
    where: { id: 'seed-template-trabalho' },
    update: {},
    create: {
      id: 'seed-template-trabalho',
      companyId: company.id,
      name: 'Contrato de Trabalho',
      category: 'employment',
      body: `
<h2>CONTRATO INDIVIDUAL DE TRABALHO</h2>
<p>
  <strong>EMPREGADOR:</strong> {{empregador_nome}}, CNPJ {{empregador_cnpj}},
  com sede em {{empregador_endereco}}.
</p>
<p>
  <strong>EMPREGADO(A):</strong> {{empregado_nome}}, CPF {{empregado_cpf}},
  residente em {{empregado_endereco}}.
</p>
<h3>CARGO E FUNÇÃO</h3>
<p>Cargo: {{cargo}}. Função: {{funcao}}.</p>
<h3>REMUNERAÇÃO</h3>
<p>Salário mensal: {{salario}}. Benefícios: {{beneficios}}.</p>
<h3>JORNADA</h3>
<p>{{jornada_trabalho}}</p>
<h3>INÍCIO</h3>
<p>Data de admissão: {{data_admissao}}.</p>
<p>{{empregador_assinatura}} &nbsp;&nbsp;&nbsp; {{empregado_assinatura}}</p>
`.trim(),
    },
  });

  await upsertFields(tTrabalho.id, [
    { key: 'empregador_nome',       label: 'Nome do Empregador',    type: 'TEXT',      order: 1 },
    { key: 'empregador_cnpj',       label: 'CNPJ do Empregador',    type: 'CNPJ',      order: 2 },
    { key: 'empregador_endereco',   label: 'Endereço do Empregador',type: 'TEXT',      order: 3 },
    { key: 'empregado_nome',        label: 'Nome do Empregado',     type: 'TEXT',      order: 4 },
    { key: 'empregado_cpf',         label: 'CPF do Empregado',      type: 'CPF',       order: 5 },
    { key: 'empregado_endereco',    label: 'Endereço do Empregado', type: 'TEXT',      order: 6 },
    { key: 'cargo',                 label: 'Cargo',                 type: 'TEXT',      order: 7 },
    { key: 'funcao',                label: 'Função',                type: 'TEXT',      order: 8 },
    { key: 'salario',               label: 'Salário Mensal',        type: 'CURRENCY',  order: 9 },
    { key: 'beneficios',            label: 'Benefícios',            type: 'TEXT',      order: 10, required: false },
    { key: 'jornada_trabalho',      label: 'Jornada de Trabalho',   type: 'TEXT',      order: 11 },
    { key: 'data_admissao',         label: 'Data de Admissão',      type: 'DATE',      order: 12 },
    { key: 'empregador_assinatura', label: 'Assinatura do Empregador', type: 'SIGNATURE', order: 13 },
    { key: 'empregado_assinatura',  label: 'Assinatura do Empregado',  type: 'SIGNATURE', order: 14 },
  ]);

  console.log(`✅ Template: ${tTrabalho.name}`);

  const tObra = await prisma.contractTemplate.upsert({
    where: { id: 'seed-template-obra' },
    update: {},
    create: {
      id: 'seed-template-obra',
      companyId: company.id,
      name: 'Contrato de Obra',
      category: 'work',
      body: `
<h2>CONTRATO DE EXECUÇÃO DE OBRA</h2>
<p>
  <strong>CONTRATANTE:</strong> {{contratante_nome}}, CNPJ {{contratante_cnpj}},
  com sede em {{contratante_endereco}}.
</p>
<p>
  <strong>CONTRATADA:</strong> {{contratada_nome}}, CNPJ {{contratada_cnpj}},
  com sede em {{contratada_endereco}}.
</p>
<h3>OBJETO DA OBRA</h3>
<p>{{objeto_obra}}</p>
<h3>ENDEREÇO DA OBRA</h3>
<p>{{endereco_obra}}</p>
<h3>VALOR E PAGAMENTO</h3>
<p>Valor global: {{valor_global}}. Forma de pagamento: {{forma_pagamento}}.</p>
<h3>PRAZO DE EXECUÇÃO</h3>
<p>Início previsto: {{data_inicio}}. Conclusão prevista: {{data_conclusao}}.</p>
<h3>RESPONSÁVEL TÉCNICO</h3>
<p>{{responsavel_tecnico}} — CREA/CAU: {{crea_cau}}</p>
<p>{{contratante_assinatura}} &nbsp;&nbsp;&nbsp; {{contratada_assinatura}}</p>
`.trim(),
    },
  });

  await upsertFields(tObra.id, [
    { key: 'contratante_nome',      label: 'Nome do Contratante',      type: 'TEXT',      order: 1 },
    { key: 'contratante_cnpj',      label: 'CNPJ do Contratante',      type: 'CNPJ',      order: 2 },
    { key: 'contratante_endereco',  label: 'Endereço do Contratante',  type: 'TEXT',      order: 3 },
    { key: 'contratada_nome',       label: 'Nome da Contratada',       type: 'TEXT',      order: 4 },
    { key: 'contratada_cnpj',       label: 'CNPJ da Contratada',       type: 'CNPJ',      order: 5 },
    { key: 'contratada_endereco',   label: 'Endereço da Contratada',   type: 'TEXT',      order: 6 },
    { key: 'objeto_obra',           label: 'Objeto da Obra',           type: 'TEXT',      order: 7 },
    { key: 'endereco_obra',         label: 'Endereço da Obra',         type: 'TEXT',      order: 8 },
    { key: 'valor_global',          label: 'Valor Global da Obra',     type: 'CURRENCY',  order: 9 },
    { key: 'forma_pagamento',       label: 'Forma de Pagamento',       type: 'TEXT',      order: 10 },
    { key: 'data_inicio',           label: 'Data de Início',           type: 'DATE',      order: 11 },
    { key: 'data_conclusao',        label: 'Data de Conclusão Prevista', type: 'DATE',    order: 12 },
    { key: 'responsavel_tecnico',   label: 'Responsável Técnico',      type: 'TEXT',      order: 13 },
    { key: 'crea_cau',              label: 'Nº CREA ou CAU',           type: 'TEXT',      order: 14 },
    { key: 'contratante_assinatura', label: 'Assinatura do Contratante', type: 'SIGNATURE', order: 15 },
    { key: 'contratada_assinatura',  label: 'Assinatura da Contratada',  type: 'SIGNATURE', order: 16 },
  ]);

  console.log(`✅ Template: ${tObra.name}`);

  const tLocacao = await prisma.contractTemplate.upsert({
    where: { id: 'seed-template-locacao' },
    update: {},
    create: {
      id: 'seed-template-locacao',
      companyId: company.id,
      name: 'Contrato de Locação',
      category: 'rent',
      body: `
<h2>CONTRATO DE LOCAÇÃO DE IMÓVEL</h2>
<p>
  <strong>LOCADOR(A):</strong> {{locador_nome}}, CPF/CNPJ {{locador_documento}},
  residente/com sede em {{locador_endereco}}.
</p>
<p>
  <strong>LOCATÁRIO(A):</strong> {{locatario_nome}}, CPF/CNPJ {{locatario_documento}},
  residente/com sede em {{locatario_endereco}}.
</p>
<h3>IMÓVEL LOCADO</h3>
<p>{{descricao_imovel}}, situado em {{endereco_imovel}}.</p>
<h3>VALOR DO ALUGUEL</h3>
<p>Valor mensal: {{valor_aluguel}}. Dia de vencimento: {{dia_vencimento}}.</p>
<h3>PRAZO DA LOCAÇÃO</h3>
<p>Início: {{data_inicio}}. Término: {{data_termino}}.</p>
<h3>GARANTIA</h3>
<p>Modalidade: {{tipo_garantia}}. Detalhes: {{detalhes_garantia}}.</p>
<p>{{locador_assinatura}} &nbsp;&nbsp;&nbsp; {{locatario_assinatura}}</p>
`.trim(),
    },
  });

  await upsertFields(tLocacao.id, [
    { key: 'locador_nome',        label: 'Nome do Locador',         type: 'TEXT',      order: 1 },
    { key: 'locador_documento',   label: 'CPF/CNPJ do Locador',     type: 'CNPJ',      order: 2 },
    { key: 'locador_endereco',    label: 'Endereço do Locador',     type: 'TEXT',      order: 3 },
    { key: 'locatario_nome',      label: 'Nome do Locatário',       type: 'TEXT',      order: 4 },
    { key: 'locatario_documento', label: 'CPF/CNPJ do Locatário',   type: 'CPF',       order: 5 },
    { key: 'locatario_endereco',  label: 'Endereço do Locatário',   type: 'TEXT',      order: 6 },
    { key: 'descricao_imovel',    label: 'Descrição do Imóvel',     type: 'TEXT',      order: 7 },
    { key: 'endereco_imovel',     label: 'Endereço do Imóvel',      type: 'TEXT',      order: 8 },
    { key: 'valor_aluguel',       label: 'Valor do Aluguel',        type: 'CURRENCY',  order: 9 },
    { key: 'dia_vencimento',      label: 'Dia de Vencimento',       type: 'TEXT',      order: 10 },
    { key: 'data_inicio',         label: 'Data de Início',          type: 'DATE',      order: 11 },
    { key: 'data_termino',        label: 'Data de Término',         type: 'DATE',      order: 12 },
    { key: 'tipo_garantia',       label: 'Tipo de Garantia',        type: 'TEXT',      order: 13 },
    { key: 'detalhes_garantia',   label: 'Detalhes da Garantia',    type: 'TEXT',      order: 14, required: false },
    { key: 'locador_assinatura',  label: 'Assinatura do Locador',   type: 'SIGNATURE', order: 15 },
    { key: 'locatario_assinatura', label: 'Assinatura do Locatário', type: 'SIGNATURE', order: 16 },
  ]);

  console.log(`✅ Template: ${tLocacao.name}`);

  // ──────────────────────────────────────────
  // 4. Contratos de demonstração
  // ──────────────────────────────────────────

  // ── 4a. Contrato de Obra — SIGNED ─────────
  const contract1 = await prisma.contract.upsert({
    where: { id: 'seed-contract-1' },
    update: {},
    create: {
      id:         'seed-contract-1',
      companyId:  company.id,
      templateId: tObra.id,
      title:      'Reforma Residencial — Jardins SP',
      category:   'work',
      status:     'SIGNED',
      body: `
<h2>CONTRATO DE EXECUÇÃO DE OBRA</h2>
<p><strong>CONTRATANTE:</strong> Solidy Construtora Demo, CNPJ 00.000.000/0001-00, com sede em Av. Paulista, 1000 — São Paulo/SP.</p>
<p><strong>CONTRATADA:</strong> Silva Engenharia Ltda., CNPJ 12.345.678/0001-90, com sede em Rua Augusta, 500 — São Paulo/SP.</p>
<h3>OBJETO DA OBRA</h3>
<p>Reforma completa de residência unifamiliar, incluindo estrutura, alvenaria, instalações hidrossanitárias e elétricas, acabamentos e paisagismo.</p>
<h3>ENDEREÇO DA OBRA</h3>
<p>Rua das Palmeiras, 42 — Jardins — São Paulo/SP — CEP 01403-000</p>
<h3>VALOR E PAGAMENTO</h3>
<p>Valor global: R$ 850.000,00. Forma de pagamento: 30% na assinatura, 40% na conclusão da estrutura, 30% na entrega.</p>
<h3>PRAZO DE EXECUÇÃO</h3>
<p>Início previsto: 01/03/2024. Conclusão prevista: 28/02/2025.</p>
<h3>RESPONSÁVEL TÉCNICO</h3>
<p>Eng. Roberto Lima — CREA: SP-123456/D</p>
`.trim(),
      fieldValues: {
        contratante_nome: 'Solidy Construtora Demo',
        contratante_cnpj: '00.000.000/0001-00',
        contratante_endereco: 'Av. Paulista, 1000 — São Paulo/SP',
        contratada_nome: 'Silva Engenharia Ltda.',
        contratada_cnpj: '12.345.678/0001-90',
        contratada_endereco: 'Rua Augusta, 500 — São Paulo/SP',
        objeto_obra: 'Reforma completa de residência unifamiliar',
        endereco_obra: 'Rua das Palmeiras, 42 — Jardins — São Paulo/SP',
        valor_global: 'R$ 850.000,00',
        forma_pagamento: '30% na assinatura, 40% na estrutura, 30% na entrega',
        data_inicio: '01/03/2024',
        data_conclusao: '28/02/2025',
        responsavel_tecnico: 'Eng. Roberto Lima',
        crea_cau: 'CREA SP-123456/D',
      },
      value:     850000,
      startDate: new Date('2024-03-01'),
      endDate:   new Date('2025-02-28'),
    },
  });

  // Signature para contrato 1 — SIGNED
  await prisma.signatureRequest.upsert({
    where: { id: 'seed-sig-1' },
    update: {},
    create: {
      id:          'seed-sig-1',
      contractId:  contract1.id,
      signerName:  'Dr. Marcos Ferreira',
      signerEmail: 'marcos.ferreira@silvaengenharia.com.br',
      channel:     'EMAIL',
      token:       'seed-token-signed-001',
      status:      'SIGNED',
      sentAt:      new Date('2024-02-20T10:00:00Z'),
      signedAt:    new Date('2024-02-21T14:32:00Z'),
      expiresAt:   new Date('2024-03-01T23:59:59Z'),
    },
  });

  console.log(`✅ Contract: ${contract1.title} (${contract1.status})`);

  // ── 4b. Contrato de Serviço — PENDING_SIGNATURE ──
  const contract2 = await prisma.contract.upsert({
    where: { id: 'seed-contract-2' },
    update: {},
    create: {
      id:         'seed-contract-2',
      companyId:  company.id,
      templateId: tPrestacao.id,
      title:      'Serviços de Engenharia Predial — Ed. Horizonte',
      category:   'service',
      status:     'PENDING_SIGNATURE',
      body: `
<h2>CONTRATO DE PRESTAÇÃO DE SERVIÇOS</h2>
<p><strong>CONTRATANTE:</strong> Solidy Construtora Demo, CNPJ 00.000.000/0001-00, com sede em Av. Paulista, 1000 — São Paulo/SP.</p>
<p><strong>CONTRATADO(A):</strong> Tech Inspeção e Laudos S/A, CNPJ 98.765.432/0001-11, com sede em Rua Funchal, 263 — São Paulo/SP.</p>
<h3>OBJETO</h3>
<p>Prestação de serviços de inspeção predial, laudos técnicos e acompanhamento de obras no Edifício Horizonte.</p>
<h3>VALOR E PAGAMENTO</h3>
<p>Valor total: R$ 120.000,00. Forma de pagamento: mensal em 12 parcelas de R$ 10.000,00.</p>
<h3>PRAZO</h3>
<p>Início: 01/06/2024. Término: 31/05/2025.</p>
`.trim(),
      fieldValues: {
        contratante_nome: 'Solidy Construtora Demo',
        contratante_documento: '00.000.000/0001-00',
        contratante_endereco: 'Av. Paulista, 1000 — São Paulo/SP',
        contratado_nome: 'Tech Inspeção e Laudos S/A',
        contratado_documento: '98.765.432/0001-11',
        contratado_endereco: 'Rua Funchal, 263 — São Paulo/SP',
        descricao_servico: 'Inspeção predial, laudos técnicos e acompanhamento de obras',
        valor_total: 'R$ 120.000,00',
        forma_pagamento: 'Mensal — 12 x R$ 10.000,00',
        data_inicio: '01/06/2024',
        data_termino: '31/05/2025',
      },
      value:     120000,
      startDate: new Date('2024-06-01'),
      endDate:   new Date('2025-05-31'),
    },
  });

  // Signature para contrato 2 — PENDING
  await prisma.signatureRequest.upsert({
    where: { id: 'seed-sig-2' },
    update: {},
    create: {
      id:          'seed-sig-2',
      contractId:  contract2.id,
      signerName:  'Dra. Ana Paula Souza',
      signerEmail: 'ana.souza@techinspe.com.br',
      signerPhone: '+5511999887766',
      channel:     'BOTH',
      token:       'seed-token-pending-002',
      status:      'PENDING',
      sentAt:      new Date('2024-05-15T09:00:00Z'),
      expiresAt:   new Date('2024-06-15T23:59:59Z'),
    },
  });

  console.log(`✅ Contract: ${contract2.title} (${contract2.status})`);

  // ── 4c. Contrato de Locação — DRAFT ──────
  const contract3 = await prisma.contract.upsert({
    where: { id: 'seed-contract-3' },
    update: {},
    create: {
      id:         'seed-contract-3',
      companyId:  company.id,
      templateId: tLocacao.id,
      title:      'Locação — Escritório Sede 2025',
      category:   'rent',
      status:     'DRAFT',
      body: `
<h2>CONTRATO DE LOCAÇÃO DE IMÓVEL</h2>
<p><strong>LOCADOR(A):</strong> Imóveis Capital Ltda., CNPJ 55.123.456/0001-77, com sede em Rua Bela Cintra, 800 — São Paulo/SP.</p>
<p><strong>LOCATÁRIO(A):</strong> Solidy Construtora Demo, CNPJ 00.000.000/0001-00, com sede em Av. Paulista, 1000 — São Paulo/SP.</p>
<h3>IMÓVEL LOCADO</h3>
<p>Conjunto comercial 142 m², situado na Av. Faria Lima, 3500 — 10º andar — São Paulo/SP — CEP 04538-132.</p>
<h3>VALOR DO ALUGUEL</h3>
<p>Valor mensal: R$ 18.000,00. Dia de vencimento: 10.</p>
<h3>PRAZO DA LOCAÇÃO</h3>
<p>Início: 01/01/2025. Término: 31/12/2027.</p>
`.trim(),
      fieldValues: {
        locador_nome: 'Imóveis Capital Ltda.',
        locador_documento: '55.123.456/0001-77',
        locador_endereco: 'Rua Bela Cintra, 800 — São Paulo/SP',
        locatario_nome: 'Solidy Construtora Demo',
        locatario_documento: '00.000.000/0001-00',
        locatario_endereco: 'Av. Paulista, 1000 — São Paulo/SP',
        descricao_imovel: 'Conjunto comercial 142 m²',
        endereco_imovel: 'Av. Faria Lima, 3500 — 10º andar — São Paulo/SP',
        valor_aluguel: 'R$ 18.000,00',
        dia_vencimento: '10',
        data_inicio: '01/01/2025',
        data_termino: '31/12/2027',
        tipo_garantia: 'Seguro fiança',
        detalhes_garantia: 'Apólice nº 2024/8821 — Tokio Marine',
      },
      value:     648000,
      startDate: new Date('2025-01-01'),
      endDate:   new Date('2027-12-31'),
    },
  });

  console.log(`✅ Contract: ${contract3.title} (${contract3.status})`);

  // ──────────────────────────────────────────
  // 5. Obras de demonstração
  // ──────────────────────────────────────────

  // ── 5a. Obra em execução ──────────────────
  const obra1 = await prisma.obra.upsert({
    where: { id: 'seed-obra-1' },
    update: {},
    create: {
      id:         'seed-obra-1',
      companyId:  company.id,
      contractId: contract1.id,
      name:       'Reforma Residencial — Jardins SP',
      address:    'Rua das Palmeiras, 42 — Jardins — São Paulo/SP',
      status:     'IN_PROGRESS',
      budget:     850000,
      startDate:  new Date('2024-03-01'),
      endDate:    new Date('2025-02-28'),
    },
  });

  // Steps — Obra 1
  const obra1Steps = [
    // PLANNING
    { id: 'seed-step-1-01', phase: 'PLANNING', title: 'Vistoria inicial e levantamento de dados', order: 1, done: true,  dueDate: new Date('2024-03-05') },
    { id: 'seed-step-1-02', phase: 'PLANNING', title: 'Aprovação do projeto arquitetônico',        order: 2, done: true,  dueDate: new Date('2024-03-15') },
    { id: 'seed-step-1-03', phase: 'PLANNING', title: 'Obtenção de alvarás e licenças',           order: 3, done: true,  dueDate: new Date('2024-03-30') },
    { id: 'seed-step-1-04', phase: 'PLANNING', title: 'Contratação de fornecedores',              order: 4, done: true,  dueDate: new Date('2024-04-15') },
    // EXECUTION
    { id: 'seed-step-1-05', phase: 'EXECUTION', title: 'Demolição e remoção de entulho',          order: 5, done: true,  dueDate: new Date('2024-05-01') },
    { id: 'seed-step-1-06', phase: 'EXECUTION', title: 'Estrutura e fundação',                    order: 6, done: true,  dueDate: new Date('2024-06-30') },
    { id: 'seed-step-1-07', phase: 'EXECUTION', title: 'Alvenaria e vedações',                    order: 7, done: true,  dueDate: new Date('2024-08-15') },
    { id: 'seed-step-1-08', phase: 'EXECUTION', title: 'Instalações hidrossanitárias',            order: 8, done: true,  dueDate: new Date('2024-09-30') },
    { id: 'seed-step-1-09', phase: 'EXECUTION', title: 'Instalações elétricas e lógica',          order: 9, done: false, dueDate: new Date('2024-11-15') },
    { id: 'seed-step-1-10', phase: 'EXECUTION', title: 'Revestimentos e acabamentos internos',    order: 10, done: false, dueDate: new Date('2025-01-15') },
    // DELIVERY
    { id: 'seed-step-1-11', phase: 'DELIVERY', title: 'Paisagismo e áreas externas',              order: 11, done: false, dueDate: new Date('2025-02-01') },
    { id: 'seed-step-1-12', phase: 'DELIVERY', title: 'Vistoria final e relatório de entrega',    order: 12, done: false, dueDate: new Date('2025-02-20') },
    { id: 'seed-step-1-13', phase: 'DELIVERY', title: 'Entrega das chaves ao cliente',            order: 13, done: false, dueDate: new Date('2025-02-28') },
  ] as const;

  for (const s of obra1Steps) {
    await prisma.obraStep.upsert({
      where: { id: s.id },
      update: {},
      create: { ...s, obraId: obra1.id },
    });
  }

  // Vistoria inicial — Obra 1
  await prisma.obraVistoria.upsert({
    where: { id: 'seed-vistoria-1-inicial' },
    update: {},
    create: {
      id:          'seed-vistoria-1-inicial',
      obraId:      obra1.id,
      type:        'INITIAL',
      description: 'Vistoria inicial realizada em 01/03/2024. Imóvel em estado de pré-reforma: pisos originais da década de 1980, paredes com umidade no pavimento térreo, instalações elétricas sem aterramento, telhado com infiltrações. Estrutura em bom estado. Documentação completa verificada.',
    },
  });

  // Custos — Obra 1
  const obra1Custos = [
    { id: 'seed-custo-1-01', category: 'mao_de_obra',      description: 'Equipe de demolição — 15 dias',              amount: 18500,  date: new Date('2024-04-25') },
    { id: 'seed-custo-1-02', category: 'material',          description: 'Cimento CP-II 50kg (200 sacos)',              amount: 6400,   date: new Date('2024-05-10') },
    { id: 'seed-custo-1-03', category: 'material',          description: 'Tijolos cerâmicos (10.000 unidades)',         amount: 12800,  date: new Date('2024-06-05') },
    { id: 'seed-custo-1-04', category: 'mao_de_obra',       description: 'Equipe de alvenaria — 30 dias',              amount: 38000,  date: new Date('2024-07-31') },
    { id: 'seed-custo-1-05', category: 'material',          description: 'Tubulação PVC e conexões hidro',              amount: 9750,   date: new Date('2024-08-15') },
    { id: 'seed-custo-1-06', category: 'servico_terceiro',  description: 'Engenheiro estrutural — laudos e vistorias',  amount: 15000,  date: new Date('2024-05-30') },
    { id: 'seed-custo-1-07', category: 'equipamento',       description: 'Locação betoneira + andaime (60 dias)',       amount: 8400,   date: new Date('2024-06-01') },
    { id: 'seed-custo-1-08', category: 'mao_de_obra',       description: 'Equipe hidráulica — instalações',            amount: 22000,  date: new Date('2024-09-20') },
    { id: 'seed-custo-1-09', category: 'material',          description: 'Fios e cabos elétricos THHN 2,5mm (500m)',    amount: 4200,   date: new Date('2024-10-01') },
    { id: 'seed-custo-1-10', category: 'outro',             description: 'Taxa de aprovação PMSP e licenças',           amount: 3200,   date: new Date('2024-03-28') },
  ] as const;

  for (const c of obra1Custos) {
    await prisma.obraCusto.upsert({
      where: { id: c.id },
      update: {},
      create: { ...c, obraId: obra1.id },
    });
  }

  // Fornecedores — Obra 1
  const obra1Forn = [
    { id: 'seed-forn-1-01', nome: 'Silva Engenharia Ltda.',    cnpj: '12.345.678/0001-90', contato: 'roberto@silvaeng.com.br',   servicoPrestado: 'Gestão e execução geral da obra',   valorContratado: 680000 },
    { id: 'seed-forn-1-02', nome: 'Elétrica Moderna S/A',      cnpj: '23.456.789/0001-01', contato: '(11) 3322-8800',             servicoPrestado: 'Instalações elétricas e automação', valorContratado: 95000  },
    { id: 'seed-forn-1-03', nome: 'HidroTech Instalações',     cnpj: '34.567.890/0001-12', contato: 'comercial@hidrotech.com.br', servicoPrestado: 'Hidrossanitário e AVAC',            valorContratado: 75000  },
  ] as const;

  for (const f of obra1Forn) {
    await prisma.obraFornecedor.upsert({
      where: { id: f.id },
      update: {},
      create: { ...f, obraId: obra1.id },
    });
  }

  // Equipe — Obra 1
  const obra1Equipe = [
    { id: 'seed-equipe-1-01', nome: 'Roberto Lima',      funcao: 'Engenheiro',       periodoInicio: new Date('2024-03-01'), periodoFim: null,                  valorContratado: 18000 },
    { id: 'seed-equipe-1-02', nome: 'Josué Santos',      funcao: 'Mestre de obras',  periodoInicio: new Date('2024-04-01'), periodoFim: null,                  valorContratado: 8500  },
    { id: 'seed-equipe-1-03', nome: 'Marco Pereira',     funcao: 'Pedreiro',         periodoInicio: new Date('2024-04-15'), periodoFim: new Date('2024-09-30'), valorContratado: 4800  },
    { id: 'seed-equipe-1-04', nome: 'Antônio Ferreira',  funcao: 'Ajudante',         periodoInicio: new Date('2024-04-15'), periodoFim: new Date('2024-09-30'), valorContratado: 2800  },
    { id: 'seed-equipe-1-05', nome: 'Fábio Almeida',     funcao: 'Eletricista',      periodoInicio: new Date('2024-10-01'), periodoFim: null,                  valorContratado: 5200  },
  ] as const;

  for (const m of obra1Equipe) {
    await prisma.obraEquipeMembro.upsert({
      where: { id: m.id },
      update: {},
      create: { ...m, obraId: obra1.id },
    });
  }

  console.log(`✅ Obra: ${obra1.name} (${obra1.status}) — steps, custos, fornecedores e equipe`);

  // ── 5b. Obra concluída ────────────────────
  const obra2 = await prisma.obra.upsert({
    where: { id: 'seed-obra-2' },
    update: {},
    create: {
      id:        'seed-obra-2',
      companyId: company.id,
      name:      'Construção Galpão Industrial — Guarulhos',
      address:   'Rodovia Presidente Dutra, km 218 — Guarulhos/SP — CEP 07175-000',
      status:    'COMPLETED',
      budget:    1200000,
      startDate: new Date('2023-02-01'),
      endDate:   new Date('2024-01-31'),
    },
  });

  const obra2Steps = [
    { id: 'seed-step-2-01', phase: 'PLANNING',   title: 'Vistoria e estudo de solo',                  order: 1,  done: true, dueDate: new Date('2023-02-10') },
    { id: 'seed-step-2-02', phase: 'PLANNING',   title: 'Projeto estrutural e aprovação prefeitura',  order: 2,  done: true, dueDate: new Date('2023-03-15') },
    { id: 'seed-step-2-03', phase: 'PLANNING',   title: 'Licitação e contratação de fornecedores',    order: 3,  done: true, dueDate: new Date('2023-04-01') },
    { id: 'seed-step-2-04', phase: 'EXECUTION',  title: 'Terraplenagem e preparação do terreno',      order: 4,  done: true, dueDate: new Date('2023-05-01') },
    { id: 'seed-step-2-05', phase: 'EXECUTION',  title: 'Fundação e radier',                          order: 5,  done: true, dueDate: new Date('2023-07-01') },
    { id: 'seed-step-2-06', phase: 'EXECUTION',  title: 'Estrutura metálica pré-fabricada',           order: 6,  done: true, dueDate: new Date('2023-09-15') },
    { id: 'seed-step-2-07', phase: 'EXECUTION',  title: 'Cobertura e fechamentos laterais',           order: 7,  done: true, dueDate: new Date('2023-10-31') },
    { id: 'seed-step-2-08', phase: 'EXECUTION',  title: 'Instalações elétricas industriais',          order: 8,  done: true, dueDate: new Date('2023-11-30') },
    { id: 'seed-step-2-09', phase: 'EXECUTION',  title: 'Piso industrial polido com endurecedor',     order: 9,  done: true, dueDate: new Date('2023-12-20') },
    { id: 'seed-step-2-10', phase: 'DELIVERY',   title: 'Vistoria final AVCB e bombeiros',            order: 10, done: true, dueDate: new Date('2024-01-10') },
    { id: 'seed-step-2-11', phase: 'DELIVERY',   title: 'Habite-se e documentação final',             order: 11, done: true, dueDate: new Date('2024-01-20') },
    { id: 'seed-step-2-12', phase: 'DELIVERY',   title: 'Entrega e aceite pelo cliente',              order: 12, done: true, dueDate: new Date('2024-01-31') },
  ] as const;

  for (const s of obra2Steps) {
    await prisma.obraStep.upsert({
      where: { id: s.id },
      update: {},
      create: { ...s, obraId: obra2.id },
    });
  }

  // Vistorias — Obra 2 (inicial + final = comparativo)
  await prisma.obraVistoria.upsert({
    where: { id: 'seed-vistoria-2-inicial' },
    update: {},
    create: {
      id:          'seed-vistoria-2-inicial',
      obraId:      obra2.id,
      type:        'INITIAL',
      description: 'Vistoria inicial em 01/02/2023. Terreno bruto de 8.000 m², vegetação rasteira, topografia plana com declive de 2% para drenagem natural. Solo classe 1 conforme sondagem SPT. Energia elétrica e água disponíveis no perímetro.',
    },
  });

  await prisma.obraVistoria.upsert({
    where: { id: 'seed-vistoria-2-final' },
    update: {},
    create: {
      id:          'seed-vistoria-2-final',
      obraId:      obra2.id,
      type:        'FINAL',
      description: 'Vistoria final em 25/01/2024. Galpão concluído: 5.000 m² de área coberta, pé direito de 12m, 8 docas de carga, 2 mezaninos administrativos, SPDA instalado, AVCB emitido. Obra dentro do prazo e 98,7% do orçamento. Todas as pendências de lista de verificação resolvidas.',
    },
  });

  // Custos — Obra 2
  const obra2Custos = [
    { id: 'seed-custo-2-01', category: 'mao_de_obra',     description: 'Equipe de terraplenagem',                  amount: 62000,  date: new Date('2023-04-30') },
    { id: 'seed-custo-2-02', category: 'material',         description: 'Concreto usinado para fundação (200 m³)',  amount: 94000,  date: new Date('2023-06-15') },
    { id: 'seed-custo-2-03', category: 'material',         description: 'Estrutura metálica pré-fabricada',        amount: 385000, date: new Date('2023-08-20') },
    { id: 'seed-custo-2-04', category: 'mao_de_obra',      description: 'Montagem da estrutura metálica',          amount: 78000,  date: new Date('2023-09-10') },
    { id: 'seed-custo-2-05', category: 'material',         description: 'Telhas termoacústicas cobertura',         amount: 142000, date: new Date('2023-10-05') },
    { id: 'seed-custo-2-06', category: 'mao_de_obra',      description: 'Instalações elétricas industriais',       amount: 95000,  date: new Date('2023-11-25') },
    { id: 'seed-custo-2-07', category: 'material',         description: 'Piso industrial com endurecedor',         amount: 88000,  date: new Date('2023-12-10') },
    { id: 'seed-custo-2-08', category: 'equipamento',      description: 'Locação de guindaste (45 dias)',          amount: 54000,  date: new Date('2023-08-01') },
    { id: 'seed-custo-2-09', category: 'servico_terceiro', description: 'Projeto elétrico e SPDA',                 amount: 32000,  date: new Date('2023-10-20') },
    { id: 'seed-custo-2-10', category: 'outro',            description: 'AVCB, alvarás e habite-se',               amount: 18500,  date: new Date('2024-01-08') },
    { id: 'seed-custo-2-11', category: 'mao_de_obra',      description: 'Pintura e acabamentos gerais',            amount: 38000,  date: new Date('2023-12-28') },
    { id: 'seed-custo-2-12', category: 'material',         description: 'Portões de aço e esquadrias',             amount: 47500,  date: new Date('2023-11-01') },
  ] as const;

  for (const c of obra2Custos) {
    await prisma.obraCusto.upsert({
      where: { id: c.id },
      update: {},
      create: { ...c, obraId: obra2.id },
    });
  }

  // Fornecedores — Obra 2
  const obra2Forn = [
    { id: 'seed-forn-2-01', nome: 'MetalBuild Estruturas',    cnpj: '45.678.901/0001-23', contato: 'vendas@metalbuild.com.br', servicoPrestado: 'Estrutura metálica pré-fabricada e montagem', valorContratado: 463000 },
    { id: 'seed-forn-2-02', nome: 'Elétrica Industrial BR',   cnpj: '56.789.012/0001-34', contato: '(11) 4455-7788',           servicoPrestado: 'Instalações elétricas industriais e SPDA',   valorContratado: 127000 },
    { id: 'seed-forn-2-03', nome: 'Concremax Concreto',       cnpj: '67.890.123/0001-45', contato: 'pedidos@concremax.com.br', servicoPrestado: 'Concreto usinado e bombeamento',              valorContratado: 94000  },
    { id: 'seed-forn-2-04', nome: 'MoviCarga Guindaste',      cnpj: '78.901.234/0001-56', contato: '(11) 2233-9900',           servicoPrestado: 'Locação de guindaste e operador',             valorContratado: 54000  },
  ] as const;

  for (const f of obra2Forn) {
    await prisma.obraFornecedor.upsert({
      where: { id: f.id },
      update: {},
      create: { ...f, obraId: obra2.id },
    });
  }

  // Equipe — Obra 2
  const obra2Equipe = [
    { id: 'seed-equipe-2-01', nome: 'Eng. Patricia Costa',  funcao: 'Engenheiro',      periodoInicio: new Date('2023-02-01'), periodoFim: new Date('2024-01-31'), valorContratado: 22000 },
    { id: 'seed-equipe-2-02', nome: 'Jorge Monteiro',       funcao: 'Supervisor',      periodoInicio: new Date('2023-03-01'), periodoFim: new Date('2024-01-31'), valorContratado: 10500 },
    { id: 'seed-equipe-2-03', nome: 'Cláudio Ribeiro',      funcao: 'Mestre de obras', periodoInicio: new Date('2023-04-01'), periodoFim: new Date('2024-01-31'), valorContratado: 9000  },
    { id: 'seed-equipe-2-04', nome: 'Wagner Nascimento',    funcao: 'Eletricista',     periodoInicio: new Date('2023-10-01'), periodoFim: new Date('2023-12-15'), valorContratado: 5500  },
    { id: 'seed-equipe-2-05', nome: 'Rogério Dias',         funcao: 'Ajudante',        periodoInicio: new Date('2023-04-01'), periodoFim: new Date('2023-12-31'), valorContratado: 2900  },
  ] as const;

  for (const m of obra2Equipe) {
    await prisma.obraEquipeMembro.upsert({
      where: { id: m.id },
      update: {},
      create: { ...m, obraId: obra2.id },
    });
  }

  console.log(`✅ Obra: ${obra2.name} (${obra2.status}) — steps, custos, fornecedores e equipe`);

  // ──────────────────────────────────────────
  // 6. Ordens de Compra
  // ──────────────────────────────────────────

  await prisma.purchaseOrder.upsert({
    where: { id: 'seed-po-1' },
    update: {},
    create: {
      id:        'seed-po-1',
      obraId:    obra1.id,
      number:    'OC-2024-001',
      payerCnpj: '00.000.000/0001-00',
      supplier:  'Elétrica Moderna S/A',
      items: [
        { description: 'Cabo THHN 2,5mm²',        qty: 500,  unit: 'm',  unitPrice: 4.20  },
        { description: 'Disjuntor 20A bipolar',    qty: 30,   unit: 'un', unitPrice: 48.50 },
        { description: 'Caixa de passagem 4x4',    qty: 80,   unit: 'un', unitPrice: 12.30 },
        { description: 'Eletroduto PVC 3/4"',      qty: 200,  unit: 'm',  unitPrice: 6.80  },
        { description: 'Tomada 20A com terra',     qty: 60,   unit: 'un', unitPrice: 22.90 },
      ],
      total:     9101,
      status:    'DRAFT',
      issuedAt:  new Date('2024-10-03T08:30:00Z'),
    },
  });

  await prisma.purchaseOrder.upsert({
    where: { id: 'seed-po-2' },
    update: {},
    create: {
      id:        'seed-po-2',
      obraId:    obra2.id,
      number:    'OC-2024-002',
      payerCnpj: '00.000.000/0001-00',
      supplier:  'MetalBuild Estruturas',
      items: [
        { description: 'Parafusos estruturais M20 x 80mm', qty: 1000, unit: 'un',  unitPrice: 3.85  },
        { description: 'Chapa de aço 6mm (1000x2000)',     qty: 50,   unit: 'ch',  unitPrice: 310.0 },
        { description: 'Perfil UDC 200mm',                 qty: 200,  unit: 'barra', unitPrice: 88.0  },
        { description: 'Tinta zarcão anticorrosiva 18L',   qty: 20,   unit: 'lt',  unitPrice: 145.0 },
      ],
      total:     34350,
      status:    'APPROVED',
      issuedAt:  new Date('2023-07-15T10:00:00Z'),
    },
  });

  console.log(`✅ PurchaseOrders: OC-2024-001 (DRAFT) e OC-2024-002 (APPROVED)`);

  // ──────────────────────────────────────────
  // 7. Audit logs de exemplo
  // ──────────────────────────────────────────

  const auditEntries = [
    { id: 'seed-audit-1', action: 'contract.created',    entityType: 'Contract',      entityId: contract1.id, payload: { title: contract1.title, status: 'SIGNED' }    },
    { id: 'seed-audit-2', action: 'contract.created',    entityType: 'Contract',      entityId: contract2.id, payload: { title: contract2.title, status: 'PENDING_SIGNATURE' } },
    { id: 'seed-audit-3', action: 'contract.created',    entityType: 'Contract',      entityId: contract3.id, payload: { title: contract3.title, status: 'DRAFT' }     },
    { id: 'seed-audit-4', action: 'signature.sent',      entityType: 'SignatureRequest', entityId: 'seed-sig-1', payload: { channel: 'EMAIL', signerName: 'Dr. Marcos Ferreira' } },
    { id: 'seed-audit-5', action: 'signature.completed', entityType: 'SignatureRequest', entityId: 'seed-sig-1', payload: { signedAt: '2024-02-21T14:32:00Z' }         },
    { id: 'seed-audit-6', action: 'obra.created',        entityType: 'Obra',          entityId: obra1.id,     payload: { name: obra1.name, budget: 850000 }            },
    { id: 'seed-audit-7', action: 'obra.created',        entityType: 'Obra',          entityId: obra2.id,     payload: { name: obra2.name, budget: 1200000 }           },
    { id: 'seed-audit-8', action: 'obra.status_changed', entityType: 'Obra',          entityId: obra2.id,     payload: { from: 'IN_PROGRESS', to: 'COMPLETED' }        },
    { id: 'seed-audit-9', action: 'purchase_order.approved', entityType: 'PurchaseOrder', entityId: 'seed-po-2', payload: { number: 'OC-2024-002', total: 34350 }      },
  ];

  for (const entry of auditEntries) {
    await prisma.auditLog.upsert({
      where: { id: entry.id },
      update: {},
      create: {
        id:         entry.id,
        companyId:  company.id,
        userId:     admin.id,
        action:     entry.action,
        entityType: entry.entityType,
        entityId:   entry.entityId,
        payload:    entry.payload,
      },
    });
  }

  console.log(`✅ AuditLogs: ${auditEntries.length} entradas`);

  // ──────────────────────────────────────────
  // Resumo final
  // ──────────────────────────────────────────
  console.log('\n🎉 Seed concluído com sucesso!\n');
  console.log('  ┌─────────────────────────────────────────────┐');
  console.log('  │  CREDENCIAIS DE ACESSO                      │');
  console.log('  ├─────────────────────────────────────────────┤');
  console.log(`  │  Admin   → admin@solidy.demo  / admin123    │`);
  console.log(`  │  Operador→ operador@solidy.demo / senha123  │`);
  console.log('  └─────────────────────────────────────────────┘\n');
  console.log('  Dados de demo:');
  console.log('   • 3 contratos (SIGNED / PENDING_SIGNATURE / DRAFT)');
  console.log('   • 2 signature requests');
  console.log('   • 2 obras completas (IN_PROGRESS / COMPLETED)');
  console.log('   • 25 obra steps, vistorias, custos, fornecedores e equipe');
  console.log('   • 2 ordens de compra (DRAFT / APPROVED)');
  console.log(`   • ${auditEntries.length} audit logs`);
}

// ──────────────────────────────────────────────
// Helper: upsert de campos de template
// ──────────────────────────────────────────────
async function upsertFields(
  templateId: string,
  fields: Array<{
    key: string;
    label: string;
    type: keyof typeof FieldType;
    order: number;
    required?: boolean;
  }>,
) {
  for (const f of fields) {
    await prisma.contractTemplateField.upsert({
      where: { id: `${templateId}-${f.key}` },
      update: { label: f.label, type: f.type as FieldType, order: f.order },
      create: {
        id: `${templateId}-${f.key}`,
        templateId,
        key: f.key,
        label: f.label,
        type: f.type as FieldType,
        required: f.required ?? true,
        order: f.order,
      },
    });
  }
}

main()
  .catch((e) => {
    console.error('❌ Seed falhou:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
