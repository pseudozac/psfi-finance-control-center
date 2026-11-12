import React from 'react';
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import { Home, ShoppingBag, Wifi, Car, Utensils, Shield, ArrowUpRight, ArrowDownRight, Layers } from 'lucide-react';
import type { ExpenseBreakdown, FinancePlan, IncomeBreakdown, ViewPeriod } from '../types/finance';
import { formatINR } from '../lib/finance';
import { SliderNumberField } from './SliderNumberField';

interface IncomeExpensePanelProps {
  plan: FinancePlan;
  period: ViewPeriod;
  onChange: (next: FinancePlan) => void;
}

const CATEGORY_META: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  Housing: { label: 'Housing & Home EMI', icon: <Home size={14} />, color: '#00F5A0' },
  Groceries: { label: 'Groceries & Provisions', icon: <ShoppingBag size={14} />, color: '#00E5FF' },
  Utilities: { label: 'Utilities, Power & Fiber', icon: <Wifi size={14} />, color: '#6366F1' },
  Transport: { label: 'Transit, Fuel & Commute', icon: <Car size={14} />, color: '#F59E0B' },
  Lifestyle: { label: 'Dining, Culture & Lifestyle', icon: <Utensils size={14} />, color: '#EC4899' },
  Insurance: { label: 'Term Life & Comprehensive Health', icon: <Shield size={14} />, color: '#A855F7' },
};

export const IncomeExpensePanel: React.FC<IncomeExpensePanelProps> = ({ plan, period, onChange }) => {
  const mult = period === 'annual' ? 12 : 1;
  const periodLabel = period === 'annual' ? 'Annual' : 'Monthly';

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

  const totalExpense =
    (plan.expenses.housing +
      plan.expenses.groceries +
      plan.expenses.utilities +
      plan.expenses.transport +
      plan.expenses.lifestyle +
      plan.expenses.insurance) *
    mult;

  const totalIncome =
    (plan.income.salary + plan.income.freelance + plan.income.other) * mult;

  const pieData = [
    { name: 'Housing', value: plan.expenses.housing * mult },
    { name: 'Groceries', value: plan.expenses.groceries * mult },
    { name: 'Utilities', value: plan.expenses.utilities * mult },
    { name: 'Transport', value: plan.expenses.transport * mult },
    { name: 'Lifestyle', value: plan.expenses.lifestyle * mult },
    { name: 'Insurance', value: plan.expenses.insurance * mult },
  ].filter((d) => d.value > 0);

  return (
    <div className="two-col-grid">
      {/* Left Column: Sliders Matrix */}
      <section className="card">
        <div className="section-head mb-2">
          <div className="flex-align gap-3">
            <div className="icon-chip icon-chip-emerald">
              <Layers size={16} />
            </div>
            <div>
              <div className="flex-align gap-2">
                <span className="tech-badge">// MODULE 03</span>
                <span className="text-xs font-mono text-emerald">CASHFLOW INFLOW/OUTFLOW MATRIX</span>
              </div>
              <h2 className="title-sm m-0">Income &amp; Living Expenses</h2>
            </div>
          </div>

          <div className="flex-align gap-2">
            <span className="badge-pill badge-emerald">
              <ArrowUpRight size={13} /> {formatINR(totalIncome)}
            </span>
            <span className="badge-pill badge-rose">
              <ArrowDownRight size={13} /> {formatINR(totalExpense)}
            </span>
          </div>
        </div>

        <div className="sub-group">
          <h3 className="section-subtitle text-emerald font-mono">
            <span>●</span> Primary Income Inflows ({periodLabel})
          </h3>
          <SliderNumberField id="inc-salary" label="Primary Salary (Net Take-Home)" value={plan.income.salary} min={0} max={500_000} step={5_000} onChange={(v) => updateIncome('salary', v)} />
          <SliderNumberField id="inc-freelance" label="Consulting / Freelance / Tech Bonus" value={plan.income.freelance} min={0} max={200_000} step={2_500} onChange={(v) => updateIncome('freelance', v)} />
          <SliderNumberField id="inc-other" label="Dividends / Passive Rental / Other" value={plan.income.other} min={0} max={100_000} step={1_000} onChange={(v) => updateIncome('other', v)} />
        </div>

        <div className="sub-group">
          <h3 className="section-subtitle text-rose font-mono">
            <span>●</span> Committed Expenses ({periodLabel})
          </h3>
          <SliderNumberField id="exp-housing" label="Housing Lease / Home Loan EMI" value={plan.expenses.housing} min={0} max={150_000} step={1_000} onChange={(v) => updateExpense('housing', v)} />
          <SliderNumberField id="exp-groceries" label="Provisions &amp; Household Food" value={plan.expenses.groceries} min={0} max={50_000} step={500} onChange={(v) => updateExpense('groceries', v)} />
          <SliderNumberField id="exp-utilities" label="Electricity, Gas &amp; Gigabit Fiber" value={plan.expenses.utilities} min={0} max={30_000} step={500} onChange={(v) => updateExpense('utilities', v)} />
          <SliderNumberField id="exp-transport" label="Vehicle Fuel, Metro &amp; Cab Transit" value={plan.expenses.transport} min={0} max={40_000} step={500} onChange={(v) => updateExpense('transport', v)} />
          <SliderNumberField id="exp-lifestyle" label="Dining Out, Leisure &amp; Purchases" value={plan.expenses.lifestyle} min={0} max={60_000} step={500} onChange={(v) => updateExpense('lifestyle', v)} />
          <SliderNumberField id="exp-insurance" label="Life Term &amp; Comprehensive Health" value={plan.expenses.insurance} min={0} max={30_000} step={500} onChange={(v) => updateExpense('insurance', v)} />
        </div>
      </section>

      {/* Right Column: Outflow Donut & Progress Bars */}
      <section className="card flex-col">
        <div className="section-head mb-1">
          <div>
            <div className="flex-align gap-2">
              <span className="tech-badge">// VISUAL TELEMETRY</span>
            </div>
            <h2 className="title-sm m-0">{periodLabel} Outflow Allocation</h2>
          </div>
          <div className="text-right">
            <span className="font-mono font-bold text-lg text-emerald">{formatINR(totalExpense)}</span>
            <span className="muted block text-xs font-mono">100% Total Committed</span>
          </div>
        </div>

        <div className="chart-box donut-container">
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie
                data={pieData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius={68}
                outerRadius={98}
                paddingAngle={4}
                cornerRadius={5}
              >
                {pieData.map((entry) => (
                  <Cell
                    key={entry.name}
                    fill={CATEGORY_META[entry.name]?.color ?? '#64748B'}
                    stroke="var(--card-solid)"
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
                      <div className="custom-tooltip font-mono">
                        <span className="tooltip-title">{data.name}</span>
                        <span className="tooltip-val font-bold text-emerald">{formatINR(Number(data.value))}</span>
                        <span className="tooltip-sub muted">{pct}% of outflow</span>
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
            const meta = CATEGORY_META[item.name] ?? {
              label: item.name,
              icon: null,
              color: '#64748B',
            };
            const pct = totalExpense > 0 ? Math.round((item.value / totalExpense) * 100) : 0;
            return (
              <div key={item.name} className="cat-bar-row">
                <div className="cat-bar-info">
                  <div className="flex-align gap-2">
                    <span className="cat-icon-chip" style={{ color: meta.color, backgroundColor: `${meta.color}18` }}>
                      {meta.icon}
                    </span>
                    <span className="cat-label text-sm">{meta.label}</span>
                  </div>
                  <div className="flex-align gap-2 font-mono">
                    <span className="cat-val">{formatINR(item.value)}</span>
                    <span className="cat-pct muted">({pct}%)</span>
                  </div>
                </div>
                <div className="progress-bg">
                  <div
                    className="progress-fill"
                    style={{
                      width: `${pct}%`,
                      background: `linear-gradient(90deg, ${meta.color}90, ${meta.color})`,
                      boxShadow: `0 0 8px ${meta.color}50`,
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
};
