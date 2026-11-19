import React, { useState, useMemo } from 'react';
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import {
  Home,
  ShoppingBag,
  Wifi,
  Car,
  Utensils,
  Shield,
  ArrowUpRight,
  ArrowDownRight,
  Plus,
  Trash2,
  Tag,
  PieChart as PieIcon,
  Layers,
  Calendar,
  Sparkles,
  Zap,
  ArrowDown,
  Wallet,
} from 'lucide-react';
import type {
  CustomExpenseItem,
  ExpenseBreakdown,
  FinancePlan,
  IncomeBreakdown,
  ViewPeriod,
} from '../types/finance';
import {
  formatINR,
  formatCompactINR,
  calculateCashflowWaterfall,
  calculateBudgetRule,
} from '../lib/finance';
import { SliderNumberField } from './SliderNumberField';

interface IncomeExpensePanelProps {
  plan: FinancePlan;
  period: ViewPeriod;
  onChange: (next: FinancePlan) => void;
}

// Cosmic Chroma Palette for categories
const CATEGORY_COLORS: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  Housing: { label: 'Housing & Home EMI', icon: <Home size={13} />, color: '#bf9ff1' },
  Groceries: { label: 'Groceries & Provisions', icon: <ShoppingBag size={13} />, color: '#5ec491' },
  Utilities: { label: 'Utilities & Gigabit Fiber', icon: <Wifi size={13} />, color: '#7193ed' },
  Transport: { label: 'Transit, Fuel & Commute', icon: <Car size={13} />, color: '#f78d2c' },
  Lifestyle: { label: 'Dining, Culture & Lifestyle', icon: <Utensils size={13} />, color: '#f28bad' },
  Insurance: { label: 'Life Term & Health Cover', icon: <Shield size={13} />, color: '#e15e42' },
};

export const IncomeExpensePanel: React.FC<IncomeExpensePanelProps> = ({ plan, period, onChange }) => {
  const mult = period === 'annual' ? 12 : 1;
  const periodLabel = period === 'annual' ? 'Annual' : 'Monthly';

  const [activeTab, setActiveTab] = useState<'donut' | 'waterfall' | 'horizon'>('donut');

  const updateIncome = (key: keyof IncomeBreakdown, val: number) => {
    onChange({
      ...plan,
      income: { ...plan.income, [key]: val },
    });
  };

  const updateExpense = (key: keyof ExpenseBreakdown, val: number) => {
    onChange({
      ...plan,
      expenses: { ...plan.expenses, [key]: val },
    });
  };

  const addCustomExpense = () => {
    const newItem: CustomExpenseItem = {
      id: `cust_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      name: 'Custom Outflow',
      amount: 2500,
      category: 'wants',
    };
    onChange({
      ...plan,
      expenses: {
        ...plan.expenses,
        custom: [...(plan.expenses.custom ?? []), newItem],
      },
    });
  };

  const updateCustomExpense = (id: string, updates: Partial<CustomExpenseItem>) => {
    const nextCustom = (plan.expenses.custom ?? []).map((item) =>
      item.id === id ? { ...item, ...updates } : item
    );
    onChange({
      ...plan,
      expenses: {
        ...plan.expenses,
        custom: nextCustom,
      },
    });
  };

  const removeCustomExpense = (id: string) => {
    const nextCustom = (plan.expenses.custom ?? []).filter((item) => item.id !== id);
    onChange({
      ...plan,
      expenses: {
        ...plan.expenses,
        custom: nextCustom,
      },
    });
  };

  const customTotal = (plan.expenses.custom ?? []).reduce(
    (sum, item) => sum + (Number.isFinite(item.amount) ? item.amount : 0),
    0
  );

  const totalExpense =
    (plan.expenses.housing +
      plan.expenses.groceries +
      plan.expenses.utilities +
      plan.expenses.transport +
      plan.expenses.lifestyle +
      plan.expenses.insurance +
      customTotal) *
    mult;

  const totalIncome =
    (plan.income.salary + plan.income.freelance + plan.income.other) * mult;

  // Waterfall and Budget Rule calculations
  const waterfall = useMemo(() => calculateCashflowWaterfall(plan), [plan]);
  const budgetRule = useMemo(() => calculateBudgetRule(plan), [plan]);

  // Projected 20Y wealth gain if surplus is redirected to SIP (at 12% CAGR)
  const potentialSurplusSIPWealth = useMemo(() => {
    if (waterfall.unallocatedSurplus <= 0) return 0;
    const monthlyRate = 0.12 / 12;
    const n = 240; // 20 years
    // FV of an annuity = P * ((1 + r)^n - 1) / r
    return Math.round(waterfall.unallocatedSurplus * ((Math.pow(1 + monthlyRate, n) - 1) / monthlyRate));
  }, [waterfall.unallocatedSurplus]);

  const customPieItems = (plan.expenses.custom ?? [])
    .filter((c) => c.amount > 0)
    .map((c) => ({
      name: c.name.trim() || 'Custom',
      value: c.amount * mult,
      color: c.category === 'needs' ? '#bf9ff1' : c.category === 'sinking' ? '#e15e42' : '#f28bad',
    }));

  const pieData = [
    { name: 'Housing', value: plan.expenses.housing * mult, color: CATEGORY_COLORS.Housing.color },
    { name: 'Groceries', value: plan.expenses.groceries * mult, color: CATEGORY_COLORS.Groceries.color },
    { name: 'Utilities', value: plan.expenses.utilities * mult, color: CATEGORY_COLORS.Utilities.color },
    { name: 'Transport', value: plan.expenses.transport * mult, color: CATEGORY_COLORS.Transport.color },
    { name: 'Lifestyle', value: plan.expenses.lifestyle * mult, color: CATEGORY_COLORS.Lifestyle.color },
    { name: 'Insurance', value: plan.expenses.insurance * mult, color: CATEGORY_COLORS.Insurance.color },
    ...customPieItems,
  ].filter((d) => d.value > 0);

  return (
    <div className="two-col-grid" id="tour-cashflows">
      {/* Left Column: Sliders & Micro-Budgeting */}
      <section className="hipuku-card">
        <div className="section-head mb-2">
          <div>
            <h2 className="card-title m-0">Cash Inflows &amp; Envelope Allocation</h2>
            <p className="muted text-xs">Tune take-home salary, consulting streams, and granular envelope expenses</p>
          </div>
          <div className="flex-align gap-2">
            <span className="tag-pill tag-nebula font-mono">
              <ArrowUpRight size={12} /> {formatINR(totalIncome)} In
            </span>
            <span className="tag-pill tag-flare font-mono">
              <ArrowDownRight size={12} /> {formatINR(totalExpense)} Out
            </span>
          </div>
        </div>

        {/* 50/30/20 Quick Distribution Health Bar with Denominator & Complete Allocation */}
        <div
          className="p-2.5 rounded-xl bg-slate-900/60 border border-subtle mb-3 flex items-center justify-between flex-wrap gap-2 text-xs font-mono"
          title={`Denominator: Total Monthly Inflow ${formatINR(budgetRule.totalIncome)} (100% Base). Pillars: Needs ${budgetRule.needsPercent}% + Wants ${budgetRule.wantsPercent}% + Savings ${budgetRule.savingsPercent}% = ${budgetRule.pillarPercentSum}%. Auxiliary: Debt ${budgetRule.debtPercent}% + Buffer ${budgetRule.unallocatedBufferPercent}% = ${budgetRule.debtPercent + budgetRule.unallocatedBufferPercent}%. Percentages are rounded. Score: ${budgetRule.score}/100.`}
        >
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-purple-400" />
            <span className="text-muted">Needs:</span>
            <strong className={budgetRule.needsPercent > 50 ? 'text-amber-400' : 'text-primary'}>
              {budgetRule.needsPercent}%
            </strong>
            <span className="text-[10px] text-muted">(&le;50%)</span>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-rose-400" />
            <span className="text-muted">Wants:</span>
            <strong className={budgetRule.wantsPercent > 30 ? 'text-amber-400' : 'text-primary'}>
              {budgetRule.wantsPercent}%
            </strong>
            <span className="text-[10px] text-muted">(&le;30%)</span>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span className="text-muted">Savings/SIP:</span>
            <strong className={budgetRule.savingsPercent < 20 ? 'text-amber-400' : 'text-emerald-300'}>
              {budgetRule.savingsPercent}%
            </strong>
            <span className="text-[10px] text-muted">(&ge;20%)</span>
          </div>

          {budgetRule.debtPercent > 0 && (
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-400" />
              <span className="text-muted">Debt:</span>
              <strong className="text-amber-400">{budgetRule.debtPercent}%</strong>
            </div>
          )}

          {budgetRule.unallocatedBufferPercent > 0 && (
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-cyan-400" />
              <span className="text-muted">Buffer:</span>
              <strong className="text-cyan-300">{budgetRule.unallocatedBufferPercent}%</strong>
            </div>
          )}

          <div className="flex items-center gap-2">
            <span className="text-[10px] text-muted border border-subtle px-1.5 py-0.5 rounded bg-slate-950/60 font-mono">
              Base: {formatINR(budgetRule.totalIncome)}
            </span>
            <span
              className={`text-[10px] px-2 py-0.5 rounded-full font-sans font-bold border ${
                budgetRule.score >= 80
                  ? 'bg-emerald-950/60 text-emerald-300 border-emerald-600/40'
                  : budgetRule.score >= 60
                  ? 'bg-blue-950/60 text-blue-300 border-blue-600/40'
                  : 'bg-amber-950/60 text-amber-300 border-amber-600/40'
              }`}
            >
              {budgetRule.rating} ({budgetRule.score}/100)
            </span>
          </div>
        </div>

        {/* Inflow Streams */}
        <div className="sub-group">
          <h3 className="group-title text-nebula">
            <span>●</span> Inflow Streams ({periodLabel})
          </h3>
          <SliderNumberField
            id="inc-salary"
            label="Primary Salary (Net Take-Home)"
            value={plan.income.salary}
            min={0}
            max={500_000}
            step={5_000}
            onChange={(v) => updateIncome('salary', v)}
          />
          <SliderNumberField
            id="inc-freelance"
            label="Freelance / Consulting / Bonus"
            value={plan.income.freelance}
            min={0}
            max={200_000}
            step={2_500}
            onChange={(v) => updateIncome('freelance', v)}
          />
          <SliderNumberField
            id="inc-other"
            label="Dividends / Rental / Other Income"
            value={plan.income.other}
            min={0}
            max={100_000}
            step={1_000}
            onChange={(v) => updateIncome('other', v)}
          />
        </div>

        {/* Core Living Outflows */}
        <div className="sub-group">
          <h3 className="group-title text-corona">
            <span>●</span> Core Living Outflows ({periodLabel})
          </h3>
          <SliderNumberField
            id="exp-housing"
            label="Housing Lease / Home Loan EMI"
            value={plan.expenses.housing}
            min={0}
            max={150_000}
            step={1_000}
            onChange={(v) => updateExpense('housing', v)}
          />
          <SliderNumberField
            id="exp-groceries"
            label="Groceries &amp; Household Food"
            value={plan.expenses.groceries}
            min={0}
            max={50_000}
            step={500}
            onChange={(v) => updateExpense('groceries', v)}
          />
          <SliderNumberField
            id="exp-utilities"
            label="Power, Water, Gas &amp; Gigabit Fiber"
            value={plan.expenses.utilities}
            min={0}
            max={30_000}
            step={500}
            onChange={(v) => updateExpense('utilities', v)}
          />
          <SliderNumberField
            id="exp-transport"
            label="Vehicle Fuel, Metro &amp; Cab Commute"
            value={plan.expenses.transport}
            min={0}
            max={40_000}
            step={500}
            onChange={(v) => updateExpense('transport', v)}
          />
          <SliderNumberField
            id="exp-lifestyle"
            label="Dining Out, Leisure &amp; Shopping"
            value={plan.expenses.lifestyle}
            min={0}
            max={60_000}
            step={500}
            onChange={(v) => updateExpense('lifestyle', v)}
          />
          <SliderNumberField
            id="exp-insurance"
            label="Life Term &amp; Comprehensive Health"
            value={plan.expenses.insurance}
            min={0}
            max={30_000}
            step={500}
            onChange={(v) => updateExpense('insurance', v)}
          />
        </div>

        {/* Custom Outflow Streams with Envelope Categorization */}
        <div className="sub-group">
          <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
            <h3 className="group-title text-pulsar m-0 flex items-center gap-1.5">
              <span>●</span> Custom Expense Lines &amp; Sinking Funds ({periodLabel})
            </h3>
            <button
              type="button"
              className="tag-pill tag-pulsar cursor-pointer flex items-center gap-1 shrink-0 ml-auto"
              onClick={addCustomExpense}
            >
              <Plus size={11} /> Add Outflow Line
            </button>
          </div>

          {(plan.expenses.custom ?? []).length === 0 ? (
            <p className="muted text-xs font-mono m-0">
              No custom lines configured. Tap "+ Add Outflow Line" to add pets, gym, cloud subscriptions, tuition, annual insurance buffers, or remittances.
            </p>
          ) : (
            <div className="custom-expense-list space-y-2">
              {(plan.expenses.custom ?? []).map((c) => {
                const cat = c.category ?? 'wants';
                return (
                  <div key={c.id} className="custom-expense-row flex items-center gap-2 flex-wrap sm:flex-nowrap p-1.5 rounded-lg bg-slate-900/30 border border-subtle">
                    <input
                      type="text"
                      value={c.name}
                      placeholder="Expense Label"
                      className="custom-expense-input flex-1 bg-transparent px-2 py-1 text-xs text-primary font-medium focus:outline-none"
                      onChange={(e) => updateCustomExpense(c.id, { name: e.target.value })}
                    />

                    {/* Category Envelope Selector */}
                    <div className="flex items-center gap-1 text-[10px] font-mono">
                      {(['needs', 'wants', 'sinking'] as const).map((tag) => (
                        <button
                          key={tag}
                          type="button"
                          onClick={() => updateCustomExpense(c.id, { category: tag })}
                          className={`px-1.5 py-0.5 rounded uppercase font-bold transition-colors ${
                            cat === tag
                              ? tag === 'needs'
                                ? 'bg-purple-900/80 text-purple-200 border border-purple-500/60'
                                : tag === 'wants'
                                ? 'bg-rose-900/80 text-rose-200 border border-rose-500/60'
                                : 'bg-amber-900/80 text-amber-200 border border-amber-500/60'
                              : 'text-muted hover:text-primary bg-slate-800/40'
                          }`}
                          aria-pressed={cat === tag}
                          title={`Tag as ${tag.toUpperCase()}`}
                        >
                          {tag}
                        </button>
                      ))}
                    </div>

                    <div className="custom-expense-amt-box flex items-center gap-1 bg-slate-950 px-2 py-1 rounded border border-subtle">
                      <span className="muted font-mono text-xs">₹</span>
                      <input
                        type="number"
                        min={0}
                        step={500}
                        value={c.amount || ''}
                        placeholder="0"
                        className="custom-expense-num font-mono text-xs text-primary bg-transparent w-20 focus:outline-none"
                        onChange={(e) =>
                          updateCustomExpense(c.id, {
                            amount: Math.max(0, Number(e.target.value) || 0),
                          })
                        }
                      />
                    </div>

                    <button
                      type="button"
                      className="p-1 rounded text-muted hover:text-rose-400 hover:bg-rose-950/30 transition-colors"
                      onClick={() => removeCustomExpense(c.id)}
                      title="Remove expense"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* Right Column: Interactive Cashflow Views (Donut, Waterfall, Horizon) */}
      <section className="hipuku-card flex-col">
        {/* Tab Switcher & Total Committed */}
        <div className="section-head mb-3">
          <div>
            <div className="pill-segmented segmented-sm mb-1" role="group" aria-label="Cashflow views">
              <button
                type="button"
                className={activeTab === 'donut' ? 'pill-active' : ''}
                onClick={() => setActiveTab('donut')}
              >
                <PieIcon size={12} className="inline mr-1" /> Donut
              </button>
              <button
                type="button"
                className={activeTab === 'waterfall' ? 'pill-active' : ''}
                onClick={() => setActiveTab('waterfall')}
              >
                <Layers size={12} className="inline mr-1" /> Waterfall
              </button>
              <button
                type="button"
                className={activeTab === 'horizon' ? 'pill-active' : ''}
                onClick={() => setActiveTab('horizon')}
              >
                <Calendar size={12} className="inline mr-1" /> Horizon
              </button>
            </div>
            <p className="muted text-xs">
              {activeTab === 'donut'
                ? 'Visual category distribution and budget share'
                : activeTab === 'waterfall'
                ? 'Sequential income-to-outflow cashflow stream'
                : 'Paycheck longevity & daily guilt-free burn rate'}
            </p>
          </div>
          <div className="text-right">
            <span className="font-mono font-bold text-base text-primary">{formatINR(totalExpense)}</span>
            <span className="muted block text-xs">Total Committed</span>
          </div>
        </div>

        {/* TAB 1: DONUT ALLOCATION */}
        {activeTab === 'donut' && (
          <div className="space-y-3">
            <div className="donut-wrap">
              <ResponsiveContainer width="100%" height={230}>
                <PieChart>
                  <Pie
                    data={pieData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={62}
                    outerRadius={88}
                    paddingAngle={4}
                    cornerRadius={6}
                  >
                    {pieData.map((entry) => (
                      <Cell
                        key={entry.name}
                        fill={CATEGORY_COLORS[entry.name]?.color ?? entry.color ?? '#bf9ff1'}
                        stroke="var(--surface)"
                        strokeWidth={2}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0];
                        const pct = totalExpense > 0 ? ((Number(data.value) / totalExpense) * 100).toFixed(1) : '0';
                        return (
                          <div className="hipuku-tooltip font-mono">
                            <div className="tooltip-name">{data.name}</div>
                            <div className="tooltip-val font-bold">{formatINR(Number(data.value))}</div>
                            <div className="tooltip-sub muted">{pct}% of outflow</div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="category-bars-list">
              {pieData.map((item) => {
                const meta = CATEGORY_COLORS[item.name] ?? {
                  label: item.name,
                  icon: <Tag size={13} />,
                  color: item.color ?? '#bf9ff1',
                };
                const pct = totalExpense > 0 ? Math.round((item.value / totalExpense) * 100) : 0;
                return (
                  <div key={item.name} className="cat-row">
                    <div className="cat-info">
                      <div className="flex-align gap-2">
                        <span className="cat-chip" style={{ color: meta.color, backgroundColor: `${meta.color}15` }}>
                          {meta.icon}
                        </span>
                        <span className="cat-label font-medium">{meta.label}</span>
                      </div>
                      <div className="flex-align gap-2 font-mono text-xs">
                        <span className="cat-num">{formatINR(item.value)}</span>
                        <span className="muted">({pct}%)</span>
                      </div>
                    </div>
                    <div className="cat-track">
                      <div
                        className="cat-fill"
                        style={{ width: `${pct}%`, backgroundColor: meta.color }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 2: CASHFLOW WATERFALL STREAM */}
        {activeTab === 'waterfall' && (
          <div className="space-y-3.5 pt-1">
            <div className="p-2.5 rounded-xl bg-slate-900/40 border border-subtle text-xs text-muted flex items-center justify-between">
              <span>Gross Monthly Inflow: <strong className="text-emerald-400 font-mono">{formatINR(waterfall.totalIncome)}</strong></span>
              <span>Committed Outflows: <strong className="text-rose-400 font-mono">{formatINR(totalExpense + waterfall.debtObligations + waterfall.investmentsAndSavings)}</strong></span>
            </div>

            {/* Waterfall Flow Cards */}
            <div className="space-y-2 font-mono text-xs">
              {waterfall.steps.map((step, idx) => (
                <div
                  key={step.id}
                  className={`p-3 rounded-xl border transition-all ${
                    step.id === 'unallocated_surplus'
                      ? step.remaining >= 0
                        ? 'bg-emerald-950/30 border-emerald-500/40 text-emerald-200'
                        : 'bg-rose-950/30 border-rose-500/40 text-rose-200'
                      : 'bg-slate-900/50 border-subtle'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: step.color }} />
                      <span className="font-sans font-bold text-primary">{step.label}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold">{formatINR(step.amount)}</span>
                      <span className="text-[11px] text-muted">({step.percentOfIncome}%)</span>
                    </div>
                  </div>

                  {/* Progress bar showing remaining cashflow buffer */}
                  <div className="w-full h-1.5 bg-slate-950 rounded-full overflow-hidden mb-1">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${Math.min(100, (Math.max(0, step.remaining) / Math.max(1, waterfall.totalIncome)) * 100)}%`,
                        backgroundColor: step.color,
                      }}
                    />
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-muted">
                    <span>
                      {step.id === 'gross_inflow'
                        ? 'Starting cashflow pool'
                        : step.id === 'unallocated_surplus'
                        ? 'Net uncommitted monthly buffer'
                        : `Buffer after ${step.label.split(' ')[0]}: ${formatINR(step.remaining)}`}
                    </span>
                    {idx < waterfall.steps.length - 1 && (
                      <span className="flex items-center text-slate-500 gap-0.5">
                        <ArrowDown size={10} /> Next
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 3: PAYCHECK HORIZON & DAILY DISPOSABLE BURN */}
        {activeTab === 'horizon' && (
          <div className="space-y-4 pt-1">
            {/* Daily Burn Rate Cards */}
            <div className="grid grid-cols-2 gap-3">
              <div className="telemetry-pill">
                <span className="telemetry-label font-mono">Daily Living Burn</span>
                <span className="telemetry-val font-mono text-pulsar">
                  {formatINR(waterfall.dailyLivingBurn)}/day
                </span>
                <span className="telemetry-sub muted text-[11px]">Needs + Debt + Lifestyle</span>
              </div>

              <div className="telemetry-pill">
                <span className="telemetry-label font-mono flex items-center gap-1">
                  <Wallet size={12} className="text-emerald-400" /> Daily Guilt-Free Pocket
                </span>
                <span className="telemetry-val font-mono text-emerald-400">
                  {formatINR(waterfall.dailyDiscretionaryPocket)}/day
                </span>
                <span className="telemetry-sub muted text-[11px]">Guilt-Free Spending Buffer</span>
              </div>
            </div>

            {/* Landmark Paycheck Milestone Day */}
            <div className="p-3.5 rounded-xl bg-purple-950/25 border border-purple-800/40 space-y-2">
              <div className="flex items-center justify-between text-xs font-semibold text-purple-200">
                <span className="flex items-center gap-1.5">
                  <Sparkles size={14} className="text-purple-400" />
                  <span>Fixed Obligations Freedom Day</span>
                </span>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30">
                    [BUDGETED PROJECTION]
                  </span>
                  <span className="font-mono text-purple-300 font-bold">
                    {waterfall.fixedObligationsDay == null ? 'Not covered this month' : `Day ${waterfall.fixedObligationsDay} of 30`}
                  </span>
                </div>
              </div>

              {/* Monthly 30-Day Progress Bar */}
              <div className="relative w-full h-3 bg-slate-950 rounded-full overflow-hidden border border-subtle">
                <div
                  className="h-full bg-gradient-to-r from-purple-500 to-indigo-500 rounded-full transition-all"
                  style={{ width: `${waterfall.fixedObligationsDay == null ? 0 : waterfall.fixedObligationsDay / 30 * 100}%` }}
                />
              </div>

              <p className="text-[11.5px] text-muted font-sans leading-relaxed m-0">
                {waterfall.fixedObligationsDay == null
                  ? `Planned income falls short of essential expenses and debt payments by ${formatINR(waterfall.essentialNeeds + waterfall.debtObligations - waterfall.totalIncome)} this month.`
                  : waterfall.fixedObligationsDay === 0
                    ? 'No essential expenses or debt payments are scheduled.'
                    : `If income arrives evenly over the month, projected income covers ${formatINR(waterfall.essentialNeeds + waterfall.debtObligations)} in essential expenses and debt payments by day ${waterfall.fixedObligationsDay}.`}
              </p>
            </div>

            {/* Surplus Deployment Recommender */}
            {waterfall.unallocatedSurplus > 0 ? (
              <div className="p-3 rounded-xl bg-emerald-950/25 border border-emerald-800/30 text-xs font-mono space-y-1.5">
                <div className="flex items-center gap-1.5 text-emerald-300 font-bold">
                  <Zap size={13} className="text-emerald-400" />
                  <span>Surplus Wealth Acceleration</span>
                </div>
                <p className="text-[11.5px] text-muted font-sans leading-relaxed m-0">
                  You have an uncommitted surplus of <strong className="text-emerald-300 font-mono">{formatINR(waterfall.unallocatedSurplus)}/month</strong>. If deployed into an equity index SIP at 12% CAGR, this alone would compound to <strong className="text-emerald-400 font-mono">+{formatCompactINR(potentialSurplusSIPWealth)}</strong> over 20 years!
                </p>
              </div>
            ) : waterfall.unallocatedSurplus < 0 ? (
              <div className="p-3 rounded-xl bg-rose-950/25 border border-rose-800/30 text-xs font-mono space-y-1">
                <div className="text-rose-300 font-bold">⚠️ Cashflow Deficit Warning</div>
                <p className="text-[11px] text-muted font-sans m-0">
                  Monthly outflows and investments exceed income by {formatINR(Math.abs(waterfall.unallocatedSurplus))}. Trim lifestyle or optimize SIP allocations to prevent capital depletion.
                </p>
              </div>
            ) : null}
          </div>
        )}
      </section>
    </div>
  );
};
