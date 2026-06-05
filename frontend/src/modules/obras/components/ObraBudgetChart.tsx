import { formatCurrency } from '@/shared/lib/format'

// ─── Types ────────────────────────────────────────────────────────────────────

type CostCategory = 'mao_de_obra' | 'material' | 'equipamento' | 'servico_terceiro' | 'outro'

interface Props {
  budget: string
  totalRealizado: string
  totaisPorCategoria: Record<CostCategory, string>
}

// ─── Constants ────────────────────────────────────────────────────────────────

const CATEGORY_CFG: Record<CostCategory, { label: string; bar: string; text: string; bg: string }> = {
  mao_de_obra:      { label: 'Mão de obra',      bar: 'bg-blue-500',    text: 'text-blue-700',    bg: 'bg-blue-50'    },
  material:         { label: 'Material',          bar: 'bg-primary-500', text: 'text-primary-700', bg: 'bg-primary-50' },
  equipamento:      { label: 'Equipamento',       bar: 'bg-warning-500', text: 'text-warning-700', bg: 'bg-warning-50' },
  servico_terceiro: { label: 'Serviço terceiro',  bar: 'bg-purple-500',  text: 'text-purple-700',  bg: 'bg-purple-50'  },
  outro:            { label: 'Outro',             bar: 'bg-secondary-400', text: 'text-secondary-600', bg: 'bg-secondary-50' },
}

const CATEGORIES: CostCategory[] = ['mao_de_obra', 'material', 'equipamento', 'servico_terceiro', 'outro']

// ─── Component ────────────────────────────────────────────────────────────────

export function ObraBudgetChart({ budget, totalRealizado, totaisPorCategoria }: Props) {
  const previsto  = parseFloat(String(budget))
  const realizado = parseFloat(String(totalRealizado))
  const saldo     = previsto - realizado
  const pctTotal  = previsto > 0 ? Math.min((realizado / previsto) * 100, 100) : 0

  const totalBarColor =
    pctTotal >= 90 ? 'bg-danger-500' :
    pctTotal >= 70 ? 'bg-warning-400' :
                     'bg-success-500'

  const saldoColor = saldo < 0 ? 'text-danger-600' : 'text-success-600'

  // Max value across categories for scaling individual bars
  const catValues = CATEGORIES.map((c) => parseFloat(String(totaisPorCategoria[c] ?? 0)))
  const maxCatVal  = Math.max(...catValues, 1)

  return (
    <div className="space-y-5">
      {/* ── Summary KPIs ─────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: 'Previsto',   value: formatCurrency(budget),                     color: 'text-secondary-900' },
          { label: 'Realizado',  value: formatCurrency(totalRealizado),              color: pctTotal >= 90 ? 'text-danger-600' : 'text-secondary-900' },
          { label: 'Saldo',      value: formatCurrency(String(saldo)),               color: saldoColor },
          { label: 'Consumido',  value: `${pctTotal.toFixed(1)}%`,                  color: pctTotal >= 90 ? 'text-danger-600' : pctTotal >= 70 ? 'text-warning-600' : 'text-success-600' },
        ].map(({ label, value, color }) => (
          <div key={label} className="rounded-xl border border-secondary-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-medium text-secondary-500">{label}</p>
            <p className={`mt-1 text-lg font-bold ${color}`}>{value}</p>
          </div>
        ))}
      </div>

      {/* ── Total progress bar ────────────────────────────────────────────────── */}
      <div className="rounded-xl border border-secondary-200 bg-white px-5 py-4 shadow-sm">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-secondary-600">Orçamento total consumido</span>
          <span className={`text-sm font-bold ${pctTotal >= 90 ? 'text-danger-600' : 'text-success-600'}`}>
            {pctTotal.toFixed(1)}%
          </span>
        </div>
        <div className="relative h-4 w-full rounded-full bg-secondary-100 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-700 ${totalBarColor}`}
            style={{ width: `${pctTotal}%` }}
          />
        </div>
        <div className="mt-2 flex justify-between text-xs text-secondary-400">
          <span>{formatCurrency(totalRealizado)} realizado</span>
          <span>{formatCurrency(budget)} previsto</span>
        </div>
      </div>

      {/* ── Per-category bar chart ────────────────────────────────────────────── */}
      <div className="rounded-xl border border-secondary-200 bg-white shadow-sm overflow-hidden">
        <div className="border-b border-secondary-100 px-5 py-3">
          <h3 className="text-sm font-semibold text-secondary-700">Realizado por categoria</h3>
          <p className="mt-0.5 text-xs text-secondary-400">Barras relativas ao maior valor entre categorias</p>
        </div>

        <div className="divide-y divide-secondary-50">
          {CATEGORIES.map((cat, i) => {
            const val      = catValues[i]
            const cfg      = CATEGORY_CFG[cat]
            const pctOfMax = maxCatVal > 0 ? (val / maxCatVal) * 100 : 0
            const pctOfBudget = previsto > 0 ? (val / previsto) * 100 : 0

            return (
              <div key={cat} className="flex items-center gap-4 px-5 py-3.5">
                {/* Label */}
                <div className="flex w-36 flex-shrink-0 items-center gap-2">
                  <span className={`h-2.5 w-2.5 flex-shrink-0 rounded-sm ${cfg.bar}`} />
                  <span className="text-sm text-secondary-700 truncate">{cfg.label}</span>
                </div>

                {/* Bar */}
                <div className="flex-1">
                  <div className="h-5 w-full rounded-md bg-secondary-100 overflow-hidden">
                    <div
                      className={`h-full rounded-md transition-all duration-500 ${cfg.bar} opacity-80`}
                      style={{ width: `${pctOfMax}%` }}
                    />
                  </div>
                </div>

                {/* Values */}
                <div className="w-32 flex-shrink-0 text-right">
                  <p className="text-sm font-semibold text-secondary-900">{formatCurrency(String(val))}</p>
                  <p className="text-xs text-secondary-400">{pctOfBudget.toFixed(1)}% do previsto</p>
                </div>
              </div>
            )
          })}
        </div>

        {/* Legend */}
        <div className="border-t border-secondary-100 bg-secondary-50 px-5 py-3">
          <div className="flex flex-wrap gap-4">
            {CATEGORIES.filter((c, i) => catValues[i] > 0).map((cat) => {
              const cfg = CATEGORY_CFG[cat]
              return (
                <span key={cat} className="flex items-center gap-1.5 text-xs text-secondary-600">
                  <span className={`h-2 w-2 rounded-sm ${cfg.bar}`} />
                  {cfg.label}
                </span>
              )
            })}
          </div>
        </div>
      </div>

      {/* ── Grouped visual: Previsto × Realizado side by side ─────────────────── */}
      <div className="rounded-xl border border-secondary-200 bg-white shadow-sm overflow-hidden">
        <div className="border-b border-secondary-100 px-5 py-3">
          <h3 className="text-sm font-semibold text-secondary-700">Previsto × Realizado</h3>
          <p className="mt-0.5 text-xs text-secondary-400">Comparativo por categoria em relação ao orçamento total</p>
        </div>
        <div className="px-5 py-4 space-y-3">
          {CATEGORIES.map((cat, i) => {
            const val     = catValues[i]
            const cfg     = CATEGORY_CFG[cat]
            // We don't have per-category budget, so show realizado as % of total budget
            const pct     = previsto > 0 ? Math.min((val / previsto) * 100, 100) : 0

            return (
              <div key={cat} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className={`font-medium ${cfg.text}`}>{cfg.label}</span>
                  <span className="text-secondary-500">{pct.toFixed(1)}% do orçamento</span>
                </div>
                <div className="flex h-6 w-full gap-0.5 rounded overflow-hidden bg-secondary-100">
                  {/* Realizado bar */}
                  <div
                    className={`h-full transition-all duration-500 ${cfg.bar}`}
                    style={{ width: `${pct}%` }}
                    title={`Realizado: ${formatCurrency(String(val))}`}
                  />
                </div>
              </div>
            )
          })}

          {/* Total row */}
          <div className="mt-4 pt-3 border-t border-secondary-100 space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-secondary-700">Total realizado</span>
              <span className={`font-semibold ${pctTotal >= 90 ? 'text-danger-600' : 'text-success-600'}`}>
                {pctTotal.toFixed(1)}% do orçamento
              </span>
            </div>
            <div className="flex h-6 w-full rounded overflow-hidden bg-secondary-100">
              <div
                className={`h-full transition-all duration-500 ${totalBarColor}`}
                style={{ width: `${pctTotal}%` }}
                title={`Realizado total: ${formatCurrency(totalRealizado)}`}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
