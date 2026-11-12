import React, { useState } from 'react';
import { X, Sparkles, RotateCcw, Check, ArrowRight } from 'lucide-react';
import type { FinancePlan } from '../types/finance';
import { calculateProjections, calculateSummary, formatINR } from '../lib/finance';

interface WhatIfSandboxModalProps {
  currentPlan: FinancePlan;
  onApply: (simulatedPlan: FinancePlan) => void;
  onClose: () => void;
}

export const WhatIfSandboxModal: React.FC<WhatIfSandboxModalProps> = ({
  currentPlan,
  onApply,
  onClose,
}) => {
  // Scenario modifier levers
  const [salaryPercentChange, setSalaryPercentChange] = useState<number>(15); // +15% hike
  const [rentChangeINR, setRentChangeINR] = useState<number>(0);
  const [newLoanEmiINR, setNewLoanEmiINR] = useState<number>(0);
  const [marketReturnPercent, setMarketReturnPercent] = useState<number>(
    currentPlan.savings.expectedReturnPercent
  );

  // Derive simulated plan
  const simulatedPlan: FinancePlan = structuredClone(currentPlan);
  simulatedPlan.income.salary = Math.round(
    currentPlan.income.salary * (1 + salaryPercentChange / 100)
  );
  simulatedPlan.expenses.housing = Math.max(0, currentPlan.expenses.housing + rentChangeINR);
  if (newLoanEmiINR > 0) {
    simulatedPlan.debt.monthlyPayment = currentPlan.debt.monthlyPayment + newLoanEmiINR;
    simulatedPlan.debt.cardBalance = currentPlan.debt.cardBalance + newLoanEmiINR * 36;
  }
  simulatedPlan.savings.expectedReturnPercent = marketReturnPercent;

  // Comparison metrics
  const origSummary = calculateSummary(currentPlan);
  const simSummary = calculateSummary(simulatedPlan);

  const origProj = calculateProjections(currentPlan, 60);
  const simProj = calculateProjections(simulatedPlan, 60);

  const origFinalCorpus = origProj[origProj.length - 1]?.nominalCorpus ?? 0;
  const simFinalCorpus = simProj[simProj.length - 1]?.nominalCorpus ?? 0;
  const corpusDiff = simFinalCorpus - origFinalCorpus;

  const surplusDiff = simSummary.monthlySurplus - origSummary.monthlySurplus;

  const handleReset = () => {
    setSalaryPercentChange(0);
    setRentChangeINR(0);
    setNewLoanEmiINR(0);
    setMarketReturnPercent(currentPlan.savings.expectedReturnPercent);
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content sandbox-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <div className="flex-align gap-2">
            <span className="tag-pill tag-quasar font-mono">
              <Sparkles size={12} /> SCENARIO SANDBOX
            </span>
            <h2 className="title-md m-0">"What-If" Crisis &amp; Opportunity Simulator</h2>
          </div>
          <button type="button" className="icon-pill" onClick={onClose} aria-label="Close modal">
            <X size={15} />
          </button>
        </div>

        <p className="muted text-xs mb-4">
          Test promotions, rent surges, vehicle EMIs, or market volatility in an isolated sandbox without affecting your saved vault.
        </p>

        {/* Levers Section */}
        <div className="sandbox-levers-grid mb-4">
          <div className="sandbox-lever-card">
            <div className="lever-head">
              <span className="text-xs font-semibold">Salary Change (Hike / Bonus)</span>
              <span className="font-mono text-xs font-bold text-nebula">
                {salaryPercentChange >= 0 ? `+${salaryPercentChange}%` : `${salaryPercentChange}%`}
              </span>
            </div>
            <input
              type="range"
              min={-30}
              max={60}
              step={5}
              value={salaryPercentChange}
              onChange={(e) => setSalaryPercentChange(Number(e.target.value))}
              className="range-slider"
            />
            <span className="muted text-xs font-mono">
              Resulting Salary: {formatINR(simulatedPlan.income.salary)}
            </span>
          </div>

          <div className="sandbox-lever-card">
            <div className="lever-head">
              <span className="text-xs font-semibold">Rent / Housing Surge</span>
              <span className="font-mono text-xs font-bold text-solstice">
                {rentChangeINR >= 0 ? `+${formatINR(rentChangeINR)}` : formatINR(rentChangeINR)}
              </span>
            </div>
            <input
              type="range"
              min={-10000}
              max={30000}
              step={1000}
              value={rentChangeINR}
              onChange={(e) => setRentChangeINR(Number(e.target.value))}
              className="range-slider"
            />
            <span className="muted text-xs font-mono">
              Resulting Rent: {formatINR(simulatedPlan.expenses.housing)}
            </span>
          </div>

          <div className="sandbox-lever-card">
            <div className="lever-head">
              <span className="text-xs font-semibold">New Car / Personal Loan EMI</span>
              <span className="font-mono text-xs font-bold text-flare">
                +{formatINR(newLoanEmiINR)}/mo
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={40000}
              step={2000}
              value={newLoanEmiINR}
              onChange={(e) => setNewLoanEmiINR(Number(e.target.value))}
              className="range-slider"
            />
            <span className="muted text-xs font-mono">
              Dedicated monthly debt obligation
            </span>
          </div>

          <div className="sandbox-lever-card">
            <div className="lever-head">
              <span className="text-xs font-semibold">Market Returns (CAGR)</span>
              <span className="font-mono text-xs font-bold text-pulsar">
                {marketReturnPercent}%
              </span>
            </div>
            <input
              type="range"
              min={6}
              max={18}
              step={0.5}
              value={marketReturnPercent}
              onChange={(e) => setMarketReturnPercent(Number(e.target.value))}
              className="range-slider"
            />
            <span className="muted text-xs font-mono">
              Equity Mutual Fund annual compounding
            </span>
          </div>
        </div>

        {/* Live Comparison Delta Cards */}
        <div className="sandbox-comparison-grid mb-4">
          <div className="compare-pod">
            <span className="compare-label">Monthly Surplus Delta</span>
            <div className="compare-vals font-mono">
              <span className="muted text-xs">{formatINR(origSummary.monthlySurplus)}</span>
              <ArrowRight size={13} className="text-muted" />
              <span className={`font-bold ${surplusDiff >= 0 ? 'text-nebula' : 'text-flare'}`}>
                {formatINR(simSummary.monthlySurplus)}
              </span>
            </div>
            <span className={`delta-tag text-xs font-mono ${surplusDiff >= 0 ? 'text-nebula' : 'text-flare'}`}>
              {surplusDiff >= 0 ? `+${formatINR(surplusDiff)} / mo` : `${formatINR(surplusDiff)} / mo`}
            </span>
          </div>

          <div className="compare-pod">
            <span className="compare-label">Savings &amp; SIP Rate</span>
            <div className="compare-vals font-mono">
              <span className="muted text-xs">{origSummary.savingsRatePercent.toFixed(1)}%</span>
              <ArrowRight size={13} className="text-muted" />
              <span className="font-bold text-pulsar">{simSummary.savingsRatePercent.toFixed(1)}%</span>
            </div>
            <span className="delta-tag text-xs font-mono muted">
              {(simSummary.savingsRatePercent - origSummary.savingsRatePercent).toFixed(1)}% shift
            </span>
          </div>

          <div className="compare-pod">
            <span className="compare-label">5-Year Projected Corpus</span>
            <div className="compare-vals font-mono">
              <span className="muted text-xs">{formatINR(origFinalCorpus)}</span>
              <ArrowRight size={13} className="text-muted" />
              <span className={`font-bold ${corpusDiff >= 0 ? 'text-nebula' : 'text-flare'}`}>
                {formatINR(simFinalCorpus)}
              </span>
            </div>
            <span className={`delta-tag text-xs font-mono ${corpusDiff >= 0 ? 'text-nebula' : 'text-flare'}`}>
              {corpusDiff >= 0 ? `+${formatINR(corpusDiff)}` : formatINR(corpusDiff)}
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="modal-actions">
          <button type="button" className="action-pill" onClick={handleReset}>
            <RotateCcw size={13} /> Reset Levers
          </button>
          <div className="flex-align gap-2">
            <button type="button" className="action-pill" onClick={onClose}>
              Cancel
            </button>
            <button
              type="button"
              className="action-pill pill-nebula"
              onClick={() => {
                onApply(simulatedPlan);
                onClose();
              }}
            >
              <Check size={14} /> Apply Simulation to Vault
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
