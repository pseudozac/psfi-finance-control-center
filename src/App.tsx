import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Download,
  Upload,
  Pin,
  PinOff,
  RotateCcw,
  FileSpreadsheet,
  Moon,
  Sun,
  Shield,
  CheckCircle2,
} from 'lucide-react';
import type { FinancePlan, ViewPeriod } from './types/finance';
import {
  calculateBudgetRule,
  calculateDebtPayoff,
  calculateProjections,
  calculateSummary,
  estimateIndianIncomeTax,
} from './lib/finance';
import { useFinancePlan } from './hooks/useFinancePlan';
import { SummaryCards } from './components/SummaryCards';
import { BudgetHealthWidget } from './components/BudgetHealthWidget';
import { PersonaPresetBar } from './components/PersonaPresetBar';
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
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    const saved = localStorage.getItem('psfi_theme');
    if (saved === 'light' || saved === 'dark') return saved;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'dark';
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync theme with document
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('psfi_theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  const summary = useMemo(() => calculateSummary(plan), [plan]);
  const budgetRule = useMemo(() => calculateBudgetRule(plan), [plan]);
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

  const handleSelectPreset = (presetPlan: FinancePlan, name: string) => {
    setPlan(presetPlan);
    setStatusMessage(`Loaded "${name}" archetype. Adjust any slider to explore your plan!`);
  };

  const handleFileImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      await importJSON(file);
      setStatusMessage('Plan successfully imported from JSON snapshot!');
    } catch (err) {
      setStatusMessage(err instanceof Error ? `Import failed: ${err.message}` : 'Import failed: invalid JSON.');
    } finally {
      e.target.value = '';
    }
  };

  const handlePinBaseline = () => {
    pinBaseline();
    setStatusMessage('Current plan pinned as baseline! Tweak sliders to see delta on the chart.');
  };

  const handleClearBaseline = () => {
    clearBaseline();
    setStatusMessage('Baseline cleared.');
  };

  const handleExportJSON = () => {
    exportJSON();
    setStatusMessage('Exported encrypted JSON snapshot to your downloads.');
  };

  const handleExportCSV = () => {
    exportCSV(horizonMonths);
    setStatusMessage(`Exported ${horizonMonths}-month projection as CSV for Excel/Sheets.`);
  };

  const handleReset = () => {
    resetToDefaults();
    setStatusMessage('Reset all values to baseline defaults.');
  };

  return (
    <div className="app-shell">
      {/* Top Header */}
      <header className="top-bar">
        <div className="brand-group">
          <div className="brand-logo">
            <span className="logo-symbol">₹</span>
          </div>
          <div>
            <div className="brand-title-wrap">
              <h1 className="brand-title">PsFi</h1>
              <span className="version-pill">v2.1 Pro</span>
              <span className="badge-vault">
                <Shield size={11} /> Offline Vault
              </span>
            </div>
            <p className="brand-subtitle">
              Executive Finance Control Center · India (INR ₹) · Step-Up SIP · Tax Regimes · 50/30/20 Audit
            </p>
          </div>
        </div>

        <div className="toolbar">
          {/* Monthly / Annual Switcher */}
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

          {/* Baseline Button */}
          {baseline ? (
            <button type="button" className="btn btn-amber" onClick={handleClearBaseline} title="Remove comparison baseline">
              <PinOff size={14} /> Clear Baseline
            </button>
          ) : (
            <button type="button" className="btn" onClick={handlePinBaseline} title="Pin current plan as baseline">
              <Pin size={14} /> Pin Baseline
            </button>
          )}

          {/* Import / Export Actions */}
          <button type="button" className="btn" onClick={() => fileInputRef.current?.click()}>
            <Upload size={14} /> Import
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/json,.json"
            onChange={handleFileImport}
            hidden
          />

          <button type="button" className="btn" onClick={handleExportJSON}>
            <Download size={14} /> JSON
          </button>
          <button type="button" className="btn" onClick={handleExportCSV}>
            <FileSpreadsheet size={14} /> CSV
          </button>
          <button type="button" className="btn btn-icon" onClick={handleReset} title="Reset to defaults">
            <RotateCcw size={14} />
          </button>

          {/* Theme Toggle */}
          <button
            type="button"
            className="btn btn-icon theme-btn"
            onClick={toggleTheme}
            title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
            aria-label="Toggle theme"
          >
            {theme === 'dark' ? <Sun size={15} className="text-amber" /> : <Moon size={15} className="text-indigo" />}
          </button>
        </div>
      </header>

      {/* Floating Status Notification */}
      {statusMessage && (
        <div className="status-banner animate-fade-in" role="status">
          <div className="flex-align gap-2">
            <CheckCircle2 size={16} className="text-emerald shrink-0" />
            <span>{statusMessage}</span>
          </div>
          <button type="button" onClick={() => setStatusMessage(null)} aria-label="Dismiss">
            ×
          </button>
        </div>
      )}

      {/* Main Dashboard Stack */}
      <main className="main-stack">
        {/* Archetypes Persona Bar */}
        <PersonaPresetBar currentPlan={plan} onSelectPreset={handleSelectPreset} />

        {/* Executive KPI Cards */}
        <SummaryCards summary={summary} debtPayoff={debtPayoff} period={period} />

        {/* 50/30/20 Rule Health Gauge */}
        <BudgetHealthWidget analysis={budgetRule} />

        {/* Income & Expense Breakdown */}
        <IncomeExpensePanel plan={plan} period={period} onChange={setPlan} />

        {/* Wealth & Step-Up SIP Compounding */}
        <ProjectionSection
          plan={plan}
          baseline={baseline}
          projections={projections}
          horizonMonths={horizonMonths}
          onHorizonChange={setHorizonMonths}
          onChange={setPlan}
        />

        {/* Tax Regime & Debt Payoff */}
        <IndiaTaxAndDebtPanel
          plan={plan}
          debtPayoff={debtPayoff}
          taxComparison={taxComparison}
          onChange={setPlan}
        />
      </main>

      {/* Modern Footer */}
      <footer className="app-footer">
        <div className="footer-content">
          <div className="flex-align gap-2">
            <Shield size={14} className="text-emerald" />
            <span className="font-semibold">PsFi Local Vault</span>
            <span className="muted">· Private by design. No backend database or bank credentials required.</span>
          </div>
          <div className="footer-links">
            <span className="muted">FY 2024-25 India Tax Rules · Recharts · PWA Enabled</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;
