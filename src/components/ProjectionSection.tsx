import React, { useState } from 'react';
import { Area, AreaChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { FinancePlan, MonthlyProjectionPoint } from '../types/finance';
import { formatINR } from '../lib/finance';
import { SliderNumberField } from './SliderNumberField';

interface ProjectionSectionProps {
  plan: FinancePlan;
  baseline: FinancePlan | null;
  projections: MonthlyProjectionPoint[];
  horizonMonths: number;
  onHorizonChange: (months: number) => void;
  onChange: (next: FinancePlan) => void;
}

export const ProjectionSection: React.FC<ProjectionSectionProps> = ({
  plan,
  baseline,
  projections,
  horizonMonths,
  onHorizonChange,
  onChange,
}) => {
  const [showInflationAdjusted, setShowInflationAdjusted] = useState(true);

  const updateSavings = (key: keyof FinancePlan['savings'], val: number) => {
    onChange({
      ...plan,
      savings: { ...plan.savings, [key]: val },
    });
  };

  const finalPoint = projections[projections.length - 1];

  return (
    <section className="card">
      <div className="section-head">
        <div>
          <h2>Wealth &amp; Step-Up SIP Projection</h2>
          {finalPoint && (
            <p className="muted">
              At Month {finalPoint.month}: <strong>{formatINR(finalPoint.nominalCorpus)}</strong> nominal
              {showInflationAdjusted && <> ({formatINR(finalPoint.realCorpus)} inflation-adjusted)</>}
              {baseline && finalPoint.baselineCorpus !== undefined && (
                <> · Baseline: <strong>{formatINR(finalPoint.baselineCorpus)}</strong></>
              )}
            </p>
          )}
        </div>
        <div className="controls-inline">
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={showInflationAdjusted}
              onChange={(e) => setShowInflationAdjusted(e.target.checked)}
            />
            Show inflation-adjusted
          </label>
          <select
            value={horizonMonths}
            onChange={(e) => onHorizonChange(Number(e.target.value))}
            className="select-input"
            aria-label="Projection horizon"
          >
            <option value={12}>12 Months</option>
            <option value={24}>24 Months</option>
            <option value={36}>36 Months</option>
            <option value={60}>60 Months</option>
          </select>
        </div>
      </div>

      <div className="two-col-grid">
        <div>
          <SliderNumberField id="sav-ef" label="Emergency Fund Balance" value={plan.savings.emergencyFundBalance} min={0} max={2_000_000} step={10_000} onChange={(v) => updateSavings('emergencyFundBalance', v)} />
          <SliderNumberField id="sav-cash" label="Monthly Cash Savings" value={plan.savings.monthlySavings} min={0} max={150_000} step={1_000} onChange={(v) => updateSavings('monthlySavings', v)} />
          <SliderNumberField id="sav-sip" label="Monthly SIP Investment" value={plan.savings.monthlySip} min={0} max={200_000} step={1_000} onChange={(v) => updateSavings('monthlySip', v)} />
          <SliderNumberField id="sav-stepup" label="Annual Step-Up SIP" value={plan.savings.stepUpSipPercent} min={0} max={30} step={1} unit="%" onChange={(v) => updateSavings('stepUpSipPercent', v)} />
          <SliderNumberField id="sav-ret" label="Expected Annual Return" value={plan.savings.expectedReturnPercent} min={0} max={24} step={0.5} unit="%" onChange={(v) => updateSavings('expectedReturnPercent', v)} />
          <SliderNumberField id="sav-inf" label="Assumed Inflation" value={plan.savings.inflationPercent} min={0} max={12} step={0.5} unit="%" onChange={(v) => updateSavings('inflationPercent', v)} />
        </div>

        <div className="chart-box">
          <ResponsiveContainer width="100%" height={320}>
            <AreaChart data={projections} margin={{ top: 10, right: 16, left: 8, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="label" tick={{ fontSize: 12 }} />
              <YAxis tickFormatter={(v) => `₹${Math.round(v / 1000)}k`} tick={{ fontSize: 12 }} />
              <Tooltip formatter={(val: number) => formatINR(val)} />
              <Legend />
              <Area type="monotone" dataKey="nominalCorpus" name="Nominal Corpus" stroke="#059669" fill="#a7f3d0" fillOpacity={0.45} />
              {showInflationAdjusted && (
                <Area type="monotone" dataKey="realCorpus" name="Real (Inflation-Adj.)" stroke="#0284c7" fill="#bae6fd" fillOpacity={0.35} />
              )}
              {baseline && (
                <Area type="monotone" dataKey="baselineCorpus" name="Pinned Baseline" stroke="#d97706" fill="none" strokeDasharray="5 5" />
              )}
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </section>
  );
};
