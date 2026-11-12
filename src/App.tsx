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
  ShieldCheck,
  CheckCircle2,
  Eye,
  EyeOff,
  FolderKanban,
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
import { IntroLoader } from './components/IntroLoader';
import { GatewayScreen } from './components/GatewayScreen';
import { SummaryCards } from './components/SummaryCards';
import { BudgetHealthWidget } from './components/BudgetHealthWidget';
import { PersonaPresetBar } from './components/PersonaPresetBar';
import { IncomeExpensePanel } from './components/IncomeExpensePanel';
import { ProjectionSection } from './components/ProjectionSection';
import { IndiaTaxAndDebtPanel } from './components/IndiaTaxAndDebtPanel';

type AppPhase = 'loading' | 'gateway' | 'dashboard';

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
    accounts,
    activeAccount,
    switchAccount,
    createVaultAndSwitch,
    deleteVault,
    statusMessage,
    setStatusMessage,
  } = useFinancePlan();

  // App phase control: loading -> gateway -> dashboard
  const [appPhase, setAppPhase] = useState<AppPhase>('loading');
  const [period, setPeriod] = useState<ViewPeriod>('monthly');
  const [horizonMonths, setHorizonMonths] = useState<number>(24);
  const [privacyMode, setPrivacyMode] = useState<boolean>(false);
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    const saved = localStorage.getItem('psfi_theme');
    if (saved === 'light' || saved === 'dark') return saved;
    return 'dark';
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
    setStatusMessage(`Loaded "${name}" scenario. Drag any slider to customize.`);
  };

  const handleFileImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      await importJSON(file);
      setStatusMessage('Plan imported successfully from JSON!');
    } catch (err) {
      setStatusMessage(err instanceof Error ? `Import failed: ${err.message}` : 'Import failed: invalid JSON.');
    } finally {
      e.target.value = '';
    }
  };

  // Phase 1: Intro Loader
  if (appPhase === 'loading') {
    return <IntroLoader onFinish={() => setAppPhase('gateway')} />;
  }

  // Phase 2: Gateway Choice Screen ("Start" vs "Continue")
  if (appPhase === 'gateway') {
    return (
      <GatewayScreen
        accounts={accounts}
        activeAccount={activeAccount}
        onContinue={() => setAppPhase('dashboard')}
        onSelectAccount={(id) => {
          switchAccount(id);
          setAppPhase('dashboard');
        }}
        onCreateAccount={(name, initialPlan, color) => {
          createVaultAndSwitch(name, initialPlan, color);
          setAppPhase('dashboard');
        }}
        onDeleteAccount={(id) => {
          deleteVault(id);
        }}
      />
    );
  }

  // Phase 3: Main Dashboard
  return (
    <div className={`app-shell ${privacyMode ? 'privacy-masked' : ''}`}>
      {/* Floating Pill Dock Navbar */}
      <header className="navbar-dock">
        <div className="brand-cluster">
          <div className="wordmark" onClick={() => setAppPhase('gateway')} style={{ cursor: 'pointer' }} title="Return to Gateway">
            <span className="wm-p">p</span>
            <span className="wm-s">s</span>
            <span className="wm-f">f</span>
            <span className="wm-i">i</span>
          </div>

          {/* Active Vault Switcher Pill */}
          <button
            type="button"
            className="action-pill pill-vault"
            onClick={() => setAppPhase('gateway')}
            title="Switch or manage vaults"
          >
            <span className={`status-dot dot-${activeAccount.avatarColor || 'nebula'}`} />
            <span className="vault-pill-name">{activeAccount.name}</span>
            <FolderKanban size={12} className="text-muted" />
          </button>
        </div>

        <div className="dock-actions">
          {/* Period Toggle */}
          <div className="pill-segmented" role="group" aria-label="View period">
            <button
              type="button"
              className={period === 'monthly' ? 'pill-active' : ''}
              onClick={() => setPeriod('monthly')}
            >
              monthly
            </button>
            <button
              type="button"
              className={period === 'annual' ? 'pill-active' : ''}
              onClick={() => setPeriod('annual')}
            >
              annual
            </button>
          </div>

          {/* Privacy Mask Toggle */}
          <button
            type="button"
            className={`icon-pill ${privacyMode ? 'pill-active-mode' : ''}`}
            onClick={() => setPrivacyMode(!privacyMode)}
            title={privacyMode ? 'Disable privacy masking' : 'Enable privacy mask (blur sensitive numbers)'}
          >
            {privacyMode ? <EyeOff size={14} className="text-corona" /> : <Eye size={14} />}
          </button>

          {/* Baseline Button */}
          {baseline ? (
            <button type="button" className="action-pill pill-amber" onClick={clearBaseline}>
              <PinOff size={13} /> clear baseline
            </button>
          ) : (
            <button type="button" className="action-pill" onClick={pinBaseline}>
              <Pin size={13} /> pin baseline
            </button>
          )}

          {/* File Operations */}
          <button type="button" className="action-pill" onClick={() => fileInputRef.current?.click()}>
            <Upload size={13} /> import
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/json,.json"
            onChange={handleFileImport}
            hidden
          />

          <button type="button" className="action-pill" onClick={exportJSON}>
            <Download size={13} /> json
          </button>
          <button type="button" className="action-pill" onClick={() => exportCSV(horizonMonths)}>
            <FileSpreadsheet size={13} /> csv
          </button>
          <button type="button" className="icon-pill" onClick={resetToDefaults} title="Reset to defaults">
            <RotateCcw size={13} />
          </button>

          {/* Theme Toggle */}
          <button
            type="button"
            className="icon-pill"
            onClick={toggleTheme}
            title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
          >
            {theme === 'dark' ? <Sun size={14} className="text-solstice" /> : <Moon size={14} className="text-pulsar" />}
          </button>
        </div>
      </header>

      {/* Hipuku Editorial Hero Header */}
      <section className="hero-section">
        <h1 className="hero-headline">
          Tactile personal finance control for India<span className="text-corona">.</span>
        </h1>
        <p className="hero-lede">
          Model your <span className="hl-quasar">monthly cashflow</span>, compound with{' '}
          <span className="hl-nebula">step-up SIPs</span>, audit your{' '}
          <span className="hl-solstice">50/30/20 budget balance</span>, and compare{' '}
          <span className="hl-pulsar">FY 2024-25 tax regimes</span>. Completely private, client-side, and offline.
        </p>
      </section>

      {/* Toast Notification */}
      {statusMessage && (
        <div className="hipuku-toast" role="status">
          <CheckCircle2 size={15} className="text-nebula shrink-0" />
          <span>{statusMessage}</span>
          <button type="button" onClick={() => setStatusMessage(null)} aria-label="Dismiss">
            ×
          </button>
        </div>
      )}

      {/* Main Stack */}
      <main className="main-stack">
        {/* Archetypes Persona Bar */}
        <PersonaPresetBar currentPlan={plan} onSelectPreset={handleSelectPreset} />

        {/* Key Vitals Telemetry */}
        <SummaryCards summary={summary} debtPayoff={debtPayoff} period={period} />

        {/* 50/30/20 Budget Health Audit */}
        <BudgetHealthWidget analysis={budgetRule} />

        {/* Cashflow Inflow & Outflow Mix */}
        <IncomeExpensePanel plan={plan} period={period} onChange={setPlan} />

        {/* Forward Wealth Curve */}
        <ProjectionSection
          plan={plan}
          baseline={baseline}
          projections={projections}
          horizonMonths={horizonMonths}
          onHorizonChange={setHorizonMonths}
          onChange={setPlan}
        />

        {/* Debt Elimination & Tax Regime */}
        <IndiaTaxAndDebtPanel
          plan={plan}
          debtPayoff={debtPayoff}
          taxComparison={taxComparison}
          onChange={setPlan}
        />
      </main>

      {/* Hipuku-Style Minimalist Footer */}
      <footer className="footer-capsule">
        <div className="flex-align gap-2">
          <ShieldCheck size={14} className="text-nebula" />
          <span className="font-semibold text-sm">psfi</span>
          <span className="muted text-xs">· active vault: <strong>{activeAccount.name}</strong> · zero server telemetry · inr (₹)</span>
        </div>
        <div className="flex-align gap-3 muted text-xs font-mono">
          <button
            type="button"
            className="link-btn font-mono"
            onClick={() => setAppPhase('gateway')}
          >
            switch vault
          </button>
          <span>·</span>
          <span>react 18 · vite 6 · recharts · local storage</span>
        </div>
      </footer>
    </div>
  );
}

export default App;
