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
    setStatusMessage(`Loaded "${name}" simulation blueprint. Adjust any parameter below!`);
  };

  const handleFileImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      await importJSON(file);
      setStatusMessage('Plan snapshot successfully imported from JSON!');
    } catch (err) {
      setStatusMessage(err instanceof Error ? `Import failed: ${err.message}` : 'Import failed: invalid JSON structure.');
    } finally {
      e.target.value = '';
    }
  };

  const handlePinBaseline = () => {
    pinBaseline();
    setStatusMessage('Pinned current plan as Baseline for delta comparison on projections.');
  };

  const handleClearBaseline = () => {
    clearBaseline();
    setStatusMessage('Baseline cleared.');
  };

  const handleExportJSON = () => {
    exportJSON();
    setStatusMessage('Encrypted JSON plan snapshot exported to downloads.');
  };

  const handleExportCSV = () => {
    exportCSV(horizonMonths);
    setStatusMessage(`Exported ${horizonMonths}-month wealth projection as CSV for spreadsheets.`);
  };

  const handleReset = () => {
    resetToDefaults();
    setStatusMessage('Restored all parameters to original default model.');
  };

  return (
    <div className="app-shell">
      {/* Background Cyber Ambient Flares */}
      <div className="ambient-glow-top-left" aria-hidden="true" />
      <div className="ambient-glow-bottom-right" aria-hidden="true" />

      {/* Floating HUD Top Navigation */}
      <header className="top-bar">
        <div className="brand-group">
          <div className="brand-logo-hud">
            <span className="logo-symbol font-mono">₹</span>
            <span className="logo-pulse-ring" />
          </div>
          <div>
            <div className="brand-title-wrap">
              <h1 className="brand-title font-mono">PsFi</h1>
              <span className="tech-badge-primary font-mono">v2.1 PRO</span>
              <span className="badge-vault font-mono">
                <Shield size={11} className="text-emerald" /> LOCAL ENCLAVE
              </span>
            </div>
            <p className="brand-subtitle font-mono">
              ENGINEERING-GRADE PERSONAL FINANCE CONTROL CENTER · INDIA (INR ₹)
            </p>
          </div>
        </div>

        <div className="toolbar">
          {/* View Period Segmented Control */}
          <div className="segmented" role="group" aria-label="View period">
            <button
              type="button"
              className={period === 'monthly' ? 'seg-active' : ''}
              onClick={() => setPeriod('monthly')}
            >
              MONTHLY
            </button>
            <button
              type="button"
              className={period === 'annual' ? 'seg-active' : ''}
              onClick={() => setPeriod('annual')}
            >
              ANNUAL
            </button>
          </div>

          {/* Baseline Button */}
          {baseline ? (
            <button type="button" className="btn btn-amber font-mono" onClick={handleClearBaseline} title="Clear pinned baseline">
              <PinOff size={14} /> Clear Baseline
            </button>
          ) : (
            <button type="button" className="btn font-mono" onClick={handlePinBaseline} title="Pin current plan as baseline for what-if comparison">
              <Pin size={14} /> Pin Baseline
            </button>
          )}

          {/* Import / Export Actions */}
          <button type="button" className="btn font-mono" onClick={() => fileInputRef.current?.click()} title="Import JSON plan snapshot">
            <Upload size={14} /> Import
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/json,.json"
            onChange={handleFileImport}
            hidden
          />

          <button type="button" className="btn font-mono" onClick={handleExportJSON} title="Download JSON snapshot">
            <Download size={14} /> JSON
          </button>
          <button type="button" className="btn font-mono" onClick={handleExportCSV} title="Download projection CSV">
            <FileSpreadsheet size={14} /> CSV
          </button>
          <button type="button" className="btn btn-icon" onClick={handleReset} title="Reset to standard defaults">
            <RotateCcw size={14} />
          </button>

          {/* Theme Toggle */}
          <button
            type="button"
            className="btn btn-icon theme-btn"
            onClick={toggleTheme}
            title={`Toggle ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
            aria-label="Toggle theme"
          >
            {theme === 'dark' ? <Sun size={15} className="text-amber" /> : <Moon size={15} className="text-cyan" />}
          </button>
        </div>
      </header>

      {/* Floating Status Notification */}
      {statusMessage && (
        <div className="status-banner animate-fade-in font-mono" role="status">
          <div className="flex-align gap-2">
            <CheckCircle2 size={16} className="text-emerald shrink-0" />
            <span>{statusMessage}</span>
          </div>
          <button type="button" onClick={() => setStatusMessage(null)} aria-label="Dismiss">
            ×
          </button>
        </div>
      )}

      {/* Main Dashboard Grid Stack */}
      <main className="main-stack">
        {/* Simulation Archetypes Bar */}
        <PersonaPresetBar currentPlan={plan} onSelectPreset={handleSelectPreset} />

        {/* Executive KPI Telemetry HUD */}
        <SummaryCards summary={summary} debtPayoff={debtPayoff} period={period} />

        {/* 50/30/20 Capital Allocation Architecture */}
        <BudgetHealthWidget analysis={budgetRule} />

        {/* Inflows & Outflows Matrix */}
        <IncomeExpensePanel plan={plan} period={period} onChange={setPlan} />

        {/* Forward Wealth Accumulation Curve */}
        <ProjectionSection
          plan={plan}
          baseline={baseline}
          projections={projections}
          horizonMonths={horizonMonths}
          onHorizonChange={setHorizonMonths}
          onChange={setPlan}
        />

        {/* Debt Elimination & Tax Regime Optimizer */}
        <IndiaTaxAndDebtPanel
          plan={plan}
          debtPayoff={debtPayoff}
          taxComparison={taxComparison}
          onChange={setPlan}
        />
      </main>

      {/* Engineering Footer */}
      <footer className="app-footer font-mono">
        <div className="footer-content">
          <div className="flex-align gap-2 text-xs">
            <div className="live-dot-pulse">
              <span className="live-dot" />
            </div>
            <span className="font-semibold text-emerald">PSFI LOCAL ENCLAVE</span>
            <span className="muted">· Zero External Telemetry · Zero Server Latency · Client-Side State</span>
          </div>
          <div className="footer-links text-xs muted">
            <span>[FY 2024-25 TAX ENGINE · RECHARTS 2.15 · VITE 6 · PWA OFFLINE]</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;
