import React from 'react';
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import { Home, ShoppingBag, Wifi, Car, Utensils, Shield, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import type { ExpenseBreakdown, FinancePlan, IncomeBreakdown, ViewPeriod } from '../types/finance';
import { formatINR } from '../lib/finance';
import { SliderNumberField } from './SliderNumberField';

interface IncomeExpensePanelProps {
  plan: FinancePlan;
  period: ViewPeriod;
  onChange: (next: FinancePlan) => void;
}

const CATEGORY_META: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  Housing: { label: 'Housing & EMI', icon: <Home size={14} />, color: '#10B981' },
  Groceries: { label: 'Groceries & Food', icon: <ShoppingBag size={14} />, color: '#06B6D4' },
  Utilities: { label: 'Utilities & WiFi', icon: <Wifi size={14} />, color: '#6366F1' },
  Transport: { label: 'Transport & Fuel', icon: <Car size={14} />, color: '#F59E0B' },
  Lifestyle: { label: 'Lifestyle & Dining', icon: <Utensils size={14} />, color: '#EC4899' },
  Insurance: { label: 'Term & Health Cover', icon: <Shield size={14} />, color: '#8B5CF6' },
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
      {/* Left: Inputs */}
      <section className="card">
        <div className="section-head mb-2">
          <div>
            <h2 className="title-sm m-0">Cash Inflows &amp; Outflows</h2>
            <p className="muted text-xs">Tune your salary, extra gigs, and household spending</p>
          </div>
          <div className="flex-align gap-2">
            <span className="badge-pill badge-emerald">
              <ArrowUpRight size={13} /> {formatINR(totalIncome)} In
            </span>
            <span className="badge-pill badge-rose">
              <ArrowDownRight size={13} /> {formatINR(totalExpense)} Out
            </span>
          </div>
        </div>

        <div className="sub-group">
          <h3 className="section-subtitle text-emerald">
            <span>●</span> Monthly Income Inflows
          </h3>
          <SliderNumberField id="inc-salary" label="Primary Salary (Take-home)" value={plan.income.salary} min={0} max={500_000} step={5_000} onChange={(v) => updateIncome('salary', v)} />
          <SliderNumberField id="inc-freelance" label="Freelance / Consulting / Bonus" value={plan.income.freelance} min={0} max={200_000} step={2_500} onChange={(v) => updateIncome('freelance', v)} />
          <SliderNumberField id="inc-other" label="Dividends / Rental / Other" value={plan.income.other} min={0} max={100_000} step={1_000} onChange={(v) => updateIncome('other', v)} />
        </div>

        <div className="sub-group">
          <h3 className="section-subtitle text-rose">
            <span>●</span> Monthly Living Expenses
          </h3>
          <SliderNumberField id="exp-housing" label="Housing Rent / Home Loan EMI" value={plan.expenses.housing} min={0} max={150_000} step={1_000} onChange={(v) => updateExpense('housing', v)} />
          <SliderNumberField id="exp-groceries" label="Groceries &amp; Daily Essentials" value={plan.expenses.groceries} min={0} max={50_000} step={500} onChange={(v) => updateExpense('groceries', v)} />
          <SliderNumberField id="exp-utilities" label="Electricity, Gas, Water &amp; WiFi" value={plan.expenses.utilities} min={0} max={30_000} step={500} onChange={(v) => updateExpense('utilities', v)} />
          <SliderNumberField id="exp-transport" label="Vehicle Fuel, Metro, Cab &amp; Service" value={plan.expenses.transport} min={0} max={40_000} step={500} onChange={(v) => updateExpense('transport', v)} />
          <SliderNumberField id="exp-lifestyle" label="Dining Out, Weekend &amp; Shopping" value={plan.expenses.lifestyle} min={0} max={60_000} step={500} onChange={(v) => updateExpense('lifestyle', v)} />
          <SliderNumberField id="exp-insurance" label="Health &amp; Life Insurance Premiums" value={plan.expenses.insurance} min={0} max={30_000} step={500} onChange={(v) => updateExpense('insurance', v)} />
        </div>
      </section>

      {/* Right: Modern Donut & Breakdown */}
      <section className="card flex-col">
        <div className="section-head mb-1">
          <div>
            <h2 className="title-sm m-0">{periodLabel} Outflow Distribution</h2>
            <p className="muted text-xs">Visual category breakdown &amp; share of budget</p>
          </div>
          <div className="text-right">
            <span className="font-mono font-bold text-lg">{formatINR(totalExpense)}</span>
            <span className="muted block text-xs">Total {periodLabel} Outflow</span>
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
                innerRadius={65}
                outerRadius={95}
                paddingAngle={4}
                cornerRadius={4}
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
                      <div className="custom-tooltip">
                        <span className="tooltip-title">{data.name}</span>
                        <span className="tooltip-val font-mono">{formatINR(Number(data.value))}</span>
                        <span className="tooltip-sub font-mono">{pct}% of outflow</span>
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
                    <span className="cat-icon-chip" style={{ color: meta.color, backgroundColor: `${meta.color}15` }}>
                      {meta.icon}
                    </span>
                    <span className="cat-label">{meta.label}</span>
                  </div>
                  <div className="flex-align gap-2 font-mono">
                    <span className="cat-val">{formatINR(item.value)}</span>
                    <span className="cat-pct muted">({pct}%)</span>
                  </div>
                </div>
                <div className="progress-bg">
                  <div
                    className="progress-fill"
                    style={{ width: `${pct}%`, backgroundColor: meta.color }}
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
