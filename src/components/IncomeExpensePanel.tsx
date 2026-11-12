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

// Hipuku Cosmic Chroma Palette for categories
const CATEGORY_COLORS: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  Housing: { label: 'Housing & Home EMI', icon: <Home size={13} />, color: '#bf9ff1' }, // Quasar
  Groceries: { label: 'Groceries & Provisions', icon: <ShoppingBag size={13} />, color: '#5ec491' }, // Nebula
  Utilities: { label: 'Utilities & Gigabit Fiber', icon: <Wifi size={13} />, color: '#7193ed' }, // Pulsar
  Transport: { label: 'Transit, Fuel & Commute', icon: <Car size={13} />, color: '#f78d2c' }, // Solstice
  Lifestyle: { label: 'Dining, Culture & Lifestyle', icon: <Utensils size={13} />, color: '#f28bad' }, // Corona
  Insurance: { label: 'Life Term & Health Cover', icon: <Shield size={13} />, color: '#e15e42' }, // Flare
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
      {/* Left Column: Sliders */}
      <section className="hipuku-card">
        <div className="section-head mb-2">
          <div>
            <h2 className="card-title m-0">Cash Inflows &amp; Outflows</h2>
            <p className="muted text-xs">Tune primary salary, side consulting, and monthly living expenses</p>
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

        <div className="sub-group">
          <h3 className="group-title text-nebula">
            <span>●</span> Inflow Streams ({periodLabel})
          </h3>
          <SliderNumberField id="inc-salary" label="Primary Salary (Net Take-Home)" value={plan.income.salary} min={0} max={500_000} step={5_000} onChange={(v) => updateIncome('salary', v)} />
          <SliderNumberField id="inc-freelance" label="Freelance / Consulting / Bonus" value={plan.income.freelance} min={0} max={200_000} step={2_500} onChange={(v) => updateIncome('freelance', v)} />
          <SliderNumberField id="inc-other" label="Dividends / Rental / Other Income" value={plan.income.other} min={0} max={100_000} step={1_000} onChange={(v) => updateIncome('other', v)} />
        </div>

        <div className="sub-group">
          <h3 className="group-title text-corona">
            <span>●</span> Living Outflows ({periodLabel})
          </h3>
          <SliderNumberField id="exp-housing" label="Housing Lease / Home Loan EMI" value={plan.expenses.housing} min={0} max={150_000} step={1_000} onChange={(v) => updateExpense('housing', v)} />
          <SliderNumberField id="exp-groceries" label="Groceries &amp; Household Food" value={plan.expenses.groceries} min={0} max={50_000} step={500} onChange={(v) => updateExpense('groceries', v)} />
          <SliderNumberField id="exp-utilities" label="Power, Water, Gas &amp; Gigabit Fiber" value={plan.expenses.utilities} min={0} max={30_000} step={500} onChange={(v) => updateExpense('utilities', v)} />
          <SliderNumberField id="exp-transport" label="Vehicle Fuel, Metro &amp; Cab Commute" value={plan.expenses.transport} min={0} max={40_000} step={500} onChange={(v) => updateExpense('transport', v)} />
          <SliderNumberField id="exp-lifestyle" label="Dining Out, Leisure &amp; Shopping" value={plan.expenses.lifestyle} min={0} max={60_000} step={500} onChange={(v) => updateExpense('lifestyle', v)} />
          <SliderNumberField id="exp-insurance" label="Life Term &amp; Comprehensive Health" value={plan.expenses.insurance} min={0} max={30_000} step={500} onChange={(v) => updateExpense('insurance', v)} />
        </div>
      </section>

      {/* Right Column: Outflow Donut & Progress Bars */}
      <section className="hipuku-card flex-col">
        <div className="section-head mb-1">
          <div>
            <h2 className="card-title m-0">{periodLabel} Outflow Allocation</h2>
            <p className="muted text-xs">Visual category distribution and budget share</p>
          </div>
          <div className="text-right">
            <span className="font-mono font-bold text-base text-primary">{formatINR(totalExpense)}</span>
            <span className="muted block text-xs">Total Committed</span>
          </div>
        </div>

        <div className="donut-wrap">
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie
                data={pieData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius={65}
                outerRadius={92}
                paddingAngle={4}
                cornerRadius={6}
              >
                {pieData.map((entry) => (
                  <Cell
                    key={entry.name}
                    fill={CATEGORY_COLORS[entry.name]?.color ?? '#636b7b'}
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
              icon: null,
              color: '#636b7b',
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
      </section>
    </div>
  );
};
