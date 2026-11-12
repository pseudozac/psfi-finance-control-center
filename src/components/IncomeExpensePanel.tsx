import React from 'react';
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import type { ExpenseBreakdown, FinancePlan, IncomeBreakdown, ViewPeriod } from '../types/finance';
import { formatINR } from '../lib/finance';
import { SliderNumberField } from './SliderNumberField';

interface IncomeExpensePanelProps {
  plan: FinancePlan;
  period: ViewPeriod;
  onChange: (next: FinancePlan) => void;
}

const PIE_COLORS = ['#059669', '#0284c7', '#d97706', '#7c3aed', '#e11d48', '#475569'];

export const IncomeExpensePanel: React.FC<IncomeExpensePanelProps> = ({ plan, period, onChange }) => {
  const mult = period === 'annual' ? 12 : 1;

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
      <section className="card">
        <h2>Monthly Income &amp; Expenses</h2>
        <div className="sub-group">
          <h3>Income (Monthly)</h3>
          <SliderNumberField id="inc-salary" label="Salary" value={plan.income.salary} min={0} max={500_000} step={5_000} onChange={(v) => updateIncome('salary', v)} />
          <SliderNumberField id="inc-freelance" label="Freelance / Bonus" value={plan.income.freelance} min={0} max={200_000} step={2_500} onChange={(v) => updateIncome('freelance', v)} />
          <SliderNumberField id="inc-other" label="Other Income" value={plan.income.other} min={0} max={100_000} step={1_000} onChange={(v) => updateIncome('other', v)} />
        </div>

        <div className="sub-group">
          <h3>Expenses (Monthly)</h3>
          <SliderNumberField id="exp-housing" label="Housing / Rent / EMI" value={plan.expenses.housing} min={0} max={150_000} step={1_000} onChange={(v) => updateExpense('housing', v)} />
          <SliderNumberField id="exp-groceries" label="Groceries" value={plan.expenses.groceries} min={0} max={50_000} step={500} onChange={(v) => updateExpense('groceries', v)} />
          <SliderNumberField id="exp-utilities" label="Utilities &amp; Internet" value={plan.expenses.utilities} min={0} max={30_000} step={500} onChange={(v) => updateExpense('utilities', v)} />
          <SliderNumberField id="exp-transport" label="Transport &amp; Fuel" value={plan.expenses.transport} min={0} max={40_000} step={500} onChange={(v) => updateExpense('transport', v)} />
          <SliderNumberField id="exp-lifestyle" label="Lifestyle &amp; Dining" value={plan.expenses.lifestyle} min={0} max={60_000} step={500} onChange={(v) => updateExpense('lifestyle', v)} />
          <SliderNumberField id="exp-insurance" label="Insurance Premiums" value={plan.expenses.insurance} min={0} max={30_000} step={500} onChange={(v) => updateExpense('insurance', v)} />
        </div>
      </section>

      <section className="card">
        <h2>{period === 'annual' ? 'Annual' : 'Monthly'} Expense Mix</h2>
        <div className="chart-box">
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={3}>
                {pieData.map((_, idx) => (
                  <Cell key={idx} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(val: number) => formatINR(val)} />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <ul className="legend-list">
          {pieData.map((item, idx) => (
            <li key={item.name} className="legend-item">
              <span className="legend-dot" style={{ backgroundColor: PIE_COLORS[idx % PIE_COLORS.length] }} />
              <span>{item.name}</span>
              <strong>{formatINR(item.value)}</strong>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
};
