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
  // 2. Usuário admin
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

  console.log(`✅ User: ${admin.email} (ADMIN)`);

  // ──────────────────────────────────────────
  // 3. Templates de contrato com campos dinâmicos
  // ──────────────────────────────────────────

  // ── 3a. Prestação de Serviço ──────────────
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

  // ── 3b. Contrato de Trabalho ──────────────
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

  // ── 3c. Contrato de Obra ──────────────────
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

  // ── 3d. Contrato de Locação ───────────────
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

  console.log('\n🎉 Seed concluído com sucesso!');
  console.log(`   Empresa: ${company.name}`);
  console.log(`   Login:   admin@solidy.demo`);
  console.log(`   Senha:   admin123`);
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
