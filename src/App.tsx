import React, { useMemo, useRef, useState } from 'react';
import { Download, Upload, Pin, PinOff, RotateCcw, FileSpreadsheet } from 'lucide-react';
import type { ViewPeriod } from './types/finance';
import {
  calculateDebtPayoff,
  calculateProjections,
  calculateSummary,
  estimateIndianIncomeTax,
} from './lib/finance';
import { useFinancePlan } from './hooks/useFinancePlan';
import { SummaryCards } from './components/SummaryCards';
import { IncomeExpensePanel } from './components/IncomeExpensePanel';
import { ProjectionSection } from './components/ProjectionSection';
import { IndiaTaxAndDebtPanel } from './components/IndiaTaxAndDebtPanel';

export function App() {
  const {
    plan,
    setPlan,
    baseline,
    pinBaseline,
    clearBaseline,
    resetToDefaults,
    exportJSON,
    exportCSV,
    importJSON,
    statusMessage,
    setStatusMessage,
  } = useFinancePlan();

  const [period, setPeriod] = useState<ViewPeriod>('monthly');
  const [horizonMonths, setHorizonMonths] = useState<number>(24);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const summary = useMemo(() => calculateSummary(plan), [plan]);
  const projections = useMemo(
    () => calculateProjections(plan, horizonMonths, baseline),
    [plan, horizonMonths, baseline]
  );
  const debtPayoff = useMemo(
    () => calculateDebtPayoff(plan.debt.cardBalance, plan.debt.aprPercent, plan.debt.monthlyPayment),
    [plan.debt]
  );
  const taxComparison = useMemo(
    () => estimateIndianIncomeTax(summary.monthlyIncome * 12, plan.tax.deductions80C, plan.tax.deductions80D),
    [summary.monthlyIncome, plan.tax]
  );

  const handleFileImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      await importJSON(file);
    } catch (err) {
      setStatusMessage(err instanceof Error ? `Import failed: ${err.message}` : 'Import failed: invalid JSON.');
    } finally {
      e.target.value = '';
    }
  };

  return (
    <div className="app-shell">
      <header className="top-bar">
        <div>
          <h1>PsFi Finance Control Center</h1>
          <p className="muted">Offline-first INR (₹) planner · Step-Up SIP · What-If comparison · Tax estimator</p>
        </div>

        <div className="toolbar">
          <div className="segmented" role="group" aria-label="View period">
            <button
              type="button"
              className={period === 'monthly' ? 'seg-active' : ''}
              onClick={() => setPeriod('monthly')}
            >
              Monthly
            </button>
            <button
              type="button"
              className={period === 'annual' ? 'seg-active' : ''}
              onClick={() => setPeriod('annual')}
            >
              Annual
            </button>
          </div>

          {baseline ? (
            <button type="button" className="btn btn-amber" onClick={clearBaseline}>
              <PinOff size={15} /> Clear Baseline
            </button>
          ) : (
            <button type="button" className="btn" onClick={pinBaseline}>
              <Pin size={15} /> Pin Baseline
            </button>
          )}

          <button type="button" className="btn" onClick={() => fileInputRef.current?.click()}>
            <Upload size={15} /> Import JSON
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/json,.json"
            onChange={handleFileImport}
            hidden
          />

          <button type="button" className="btn" onClick={exportJSON}>
            <Download size={15} /> Export JSON
          </button>
          <button type="button" className="btn" onClick={() => exportCSV(horizonMonths)}>
            <FileSpreadsheet size={15} /> Export CSV
          </button>
          <button type="button" className="btn btn-ghost" onClick={resetToDefaults} title="Reset to defaults">
            <RotateCcw size={15} />
          </button>
        </div>
      </header>

      {statusMessage && (
        <div className="status-banner" role="status">
          <span>{statusMessage}</span>
          <button type="button" onClick={() => setStatusMessage(null)} aria-label="Dismiss">×</button>
        </div>
      )}

      <main className="main-stack">
        <SummaryCards summary={summary} debtPayoff={debtPayoff} period={period} />
        <IncomeExpensePanel plan={plan} period={period} onChange={setPlan} />
        <ProjectionSection
          plan={plan}
          baseline={baseline}
          projections={projections}
          horizonMonths={horizonMonths}
          onHorizonChange={setHorizonMonths}
          onChange={setPlan}
        />
        <IndiaTaxAndDebtPanel
          plan={plan}
          debtPayoff={debtPayoff}
          taxComparison={taxComparison}
          onChange={setPlan}
        />
      </main>
    </div>
  );
}

export default App;
