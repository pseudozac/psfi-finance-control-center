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
  Printer,
  Sparkles,
  Smartphone,
  Monitor,
  Compass,
  Sliders,
  TrendingUp,
  ChevronDown,
  QrCode,
  Share2,
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
import { FireMilestoneTracker } from './components/FireMilestoneTracker';
import { EmergencyStressTestWidget } from './components/EmergencyStressTestWidget';
import { WhatIfSandboxModal } from './components/WhatIfSandboxModal';
import { GuidedTourModal } from './components/GuidedTourModal';
import { WealthTerminal } from './components/WealthTerminal';
import { SocialShareModal } from './components/SocialShareModal';
import { QRVaultSyncModal } from './components/QRVaultSyncModal';

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
    launchDemoVault,
    createVaultAndSwitch,
    deleteVault,
    statusMessage,
    setStatusMessage,
  } = useFinancePlan();

  // App phase control: loading -> gateway -> dashboard
  const [appPhase, setAppPhase] = useState<AppPhase>('loading');
  const [activeView, setActiveView] = useState<'control' | 'terminal'>('control');
  const [period, setPeriod] = useState<ViewPeriod>('monthly');
  const [horizonMonths, setHorizonMonths] = useState<number>(24);
  const [privacyMode, setPrivacyMode] = useState<boolean>(false);
  const [showSandbox, setShowSandbox] = useState<boolean>(false);
  const [showTour, setShowTour] = useState<boolean>(false);
  const [tourInitialStep, setTourInitialStep] = useState<number>(0);
  const [showShareModal, setShowShareModal] = useState<boolean>(false);
  const [showQRModal, setShowQRModal] = useState<boolean>(false);
  const [toolsMenuOpen, setToolsMenuOpen] = useState<boolean>(false);
  const toolsDropdownRef = useRef<HTMLDivElement>(null);
  const [layoutMode, setLayoutMode] = useState<'mobile' | 'desktop'>(() => {
    const saved = localStorage.getItem('psfi_layout_mode');
    if (saved === 'mobile' || saved === 'desktop') return saved;
    if (typeof window !== 'undefined' && window.innerWidth <= 768) return 'mobile';
    return 'desktop';
  });
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

  // Click outside to close tools dropdown
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent | TouchEvent) => {
      if (toolsDropdownRef.current && !toolsDropdownRef.current.contains(e.target as Node)) {
        setToolsMenuOpen(false);
      }
    };
    if (toolsMenuOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
      document.addEventListener('touchstart', handleOutsideClick);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('touchstart', handleOutsideClick);
    };
  }, [toolsMenuOpen]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  const toggleLayoutMode = () => {
    const next = layoutMode === 'mobile' ? 'desktop' : 'mobile';
    setLayoutMode(next);
    localStorage.setItem('psfi_layout_mode', next);
    setStatusMessage(`Display density switched to ${next.toUpperCase()} VIEW.`);
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
    () =>
      estimateIndianIncomeTax(
        summary.monthlyIncome * 12,
        plan.tax.deductions80C,
        plan.tax.deductions80D,
        plan.tax.deductionsNPS ?? 0,
        plan.tax.rentPaidMonthly ?? 0,
        Boolean(plan.tax.isMetroCity)
      ),
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
        onLaunchDemo={() => {
          launchDemoVault();
          setAppPhase('dashboard');
          setShowTour(true);
        }}
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
    <div className={`app-shell layout-${layoutMode} ${privacyMode ? 'privacy-masked' : ''}`}>
      {/* Floating Pill Dock Navbar */}
      <header className="navbar-dock" id="tour-dock">
        {/* Left: Brand & Active Vault */}
        <div className="brand-cluster">
          <div className="wordmark" onClick={() => setAppPhase('gateway')} style={{ cursor: 'pointer' }} title="Return to Gateway">
            <span className="wm-p">p</span>
            <span className="wm-s">s</span>
            <span className="wm-f">f</span>
            <span className="wm-i">i</span>
          </div>

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

        {/* Center: Primary Workspace Switcher (Control Center vs Wealth Terminal) */}
        <div className="pill-segmented dock-view-switcher" role="group" aria-label="Workspace view">
          <button
            type="button"
            className={activeView === 'control' ? 'pill-active' : ''}
            onClick={() => setActiveView('control')}
            title="Tactile Control Center (Sliders & Cockpit)"
          >
            <Sliders size={12} />
            <span className="view-label">Control Center</span>
          </button>
          <button
            type="button"
            className={activeView === 'terminal' ? 'pill-active pill-terminal-active' : ''}
            onClick={() => setActiveView('terminal')}
            title="Wealth Terminal (Stock-Market Expenditure & Valuation Engine)"
          >
            <TrendingUp size={12} className={activeView === 'terminal' ? 'text-nebula' : ''} />
            <span className="view-label">Wealth Terminal</span>
          </button>
        </div>

        {/* Right: Consolidated Action Cluster */}
        <div className="dock-actions-cluster">
          {/* Frequency Toggle */}
          <div className="pill-segmented period-switcher" role="group" aria-label="View period">
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

          {/* Guided Tour Trigger */}
          <button
            type="button"
            className="action-pill pill-tour"
            onClick={() => setShowTour(true)}
            title="Start Interactive Guided Tour"
          >
            <Compass size={13} className="text-quasar" />
            <span className="font-mono text-xs">tour</span>
          </button>

          {/* Unified Tools Dropdown Menu */}
          <div className="tools-dropdown-wrapper" ref={toolsDropdownRef}>
            <button
              type="button"
              className={`action-pill ${toolsMenuOpen ? 'pill-active-mode' : ''}`}
              onClick={() => setToolsMenuOpen(!toolsMenuOpen)}
              title="Tools, Scenarios & Data Operations"
            >
              <Sparkles size={13} className="text-solstice" />
              <span className="font-mono text-xs">tools</span>
              <ChevronDown size={11} className={`text-muted transition-transform ${toolsMenuOpen ? 'rotate-180' : ''}`} />
            </button>

            {toolsMenuOpen && (
              <div className="tools-dropdown-menu" role="menu">
                <button
                  type="button"
                  className="tools-menu-item"
                  onClick={() => { setShowSandbox(true); setToolsMenuOpen(false); }}
                >
                  <Sparkles size={13} className="text-quasar" />
                  <div>
                    <span className="item-title">What-If Sandbox</span>
                    <span className="item-sub">Simulate raises, bonuses & inflation</span>
                  </div>
                </button>

                <button
                  type="button"
                  className="tools-menu-item"
                  onClick={() => {
                    if (baseline) clearBaseline(); else pinBaseline();
                    setToolsMenuOpen(false);
                  }}
                >
                  {baseline ? <PinOff size={13} className="text-solstice" /> : <Pin size={13} />}
                  <div>
                    <span className="item-title">{baseline ? 'Clear Baseline' : 'Pin Baseline'}</span>
                    <span className="item-sub">{baseline ? 'Remove comparison snapshot' : 'Snapshot current figures for deltas'}</span>
                  </div>
                </button>

                <div className="tools-menu-divider" />

                <button
                  type="button"
                  className="tools-menu-item"
                  onClick={() => { fileInputRef.current?.click(); setToolsMenuOpen(false); }}
                >
                  <Upload size={13} className="text-muted" />
                  <div>
                    <span className="item-title">Import JSON</span>
                    <span className="item-sub">Load vault backup file</span>
                  </div>
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="application/json,.json"
                  onChange={handleFileImport}
                  hidden
                />

                <button
                  type="button"
                  className="tools-menu-item"
                  onClick={() => { exportJSON(); setToolsMenuOpen(false); }}
                >
                  <Download size={13} className="text-muted" />
                  <div>
                    <span className="item-title">Export JSON</span>
                    <span className="item-sub">Download vault state</span>
                  </div>
                </button>

                <button
                  type="button"
                  className="tools-menu-item"
                  onClick={() => { exportCSV(horizonMonths); setToolsMenuOpen(false); }}
                >
                  <FileSpreadsheet size={13} className="text-muted" />
                  <div>
                    <span className="item-title">Export CSV</span>
                    <span className="item-sub">Spreadsheet projections matrix</span>
                  </div>
                </button>

                <button
                  type="button"
                  className="tools-menu-item"
                  onClick={() => { setToolsMenuOpen(false); window.print(); }}
                >
                  <Printer size={13} className="text-muted" />
                  <div>
                    <span className="item-title">Print Executive Statement</span>
                    <span className="item-sub">1-page formatted PDF report</span>
                  </div>
                </button>

                <button
                  type="button"
                  className="tools-menu-item"
                  onClick={() => { setShowShareModal(true); setToolsMenuOpen(false); }}
                >
                  <Share2 size={13} className="text-pulsar" />
                  <div>
                    <span className="item-title">Share Health Card</span>
                    <span className="item-sub">Generate anonymized social scorecard</span>
                  </div>
                </button>

                <button
                  type="button"
                  className="tools-menu-item"
                  onClick={() => { setShowQRModal(true); setToolsMenuOpen(false); }}
                >
                  <QrCode size={13} className="text-quasar" />
                  <div>
                    <span className="item-title">Cross-Device QR Beam</span>
                    <span className="item-sub">P2P scan & sync without cloud</span>
                  </div>
                </button>

                <div className="tools-menu-divider" />

                <button
                  type="button"
                  className="tools-menu-item"
                  onClick={() => { launchDemoVault(); setToolsMenuOpen(false); }}
                >
                  <Sparkles size={13} className="text-solstice" />
                  <div>
                    <span className="item-title">Load Demo Vault</span>
                    <span className="item-sub">Seeded Indian tech profile</span>
                  </div>
                </button>

                <button
                  type="button"
                  className="tools-menu-item item-danger"
                  onClick={() => { resetToDefaults(); setToolsMenuOpen(false); }}
                >
                  <RotateCcw size={13} />
                  <div>
                    <span className="item-title">Reset to Defaults</span>
                    <span className="item-sub">Clear plan to zeroed slate</span>
                  </div>
                </button>
              </div>
            )}
          </div>

          {/* Quick Utility Icon Group */}
          <div className="dock-utility-icons">
            {/* View Density Switcher */}
            <button
              type="button"
              className={`icon-pill pill-density-toggle ${layoutMode === 'mobile' ? 'mode-mobile-active' : 'mode-desktop-active'}`}
              onClick={toggleLayoutMode}
              title={layoutMode === 'mobile' ? 'Mobile View. Click for Desktop View' : 'Desktop View. Click for Mobile View'}
            >
              {layoutMode === 'mobile' ? <Smartphone size={13} className="text-nebula" /> : <Monitor size={13} className="text-pulsar" />}
            </button>

            {/* Privacy Mask Toggle */}
            <button
              type="button"
              className={`icon-pill ${privacyMode ? 'pill-active-mode' : ''}`}
              onClick={() => setPrivacyMode(!privacyMode)}
              title={privacyMode ? 'Disable privacy masking' : 'Enable privacy mask (blur sensitive figures)'}
            >
              {privacyMode ? <EyeOff size={13} className="text-corona" /> : <Eye size={13} />}
            </button>

            {/* Theme Toggle */}
            <button
              type="button"
              className="icon-pill"
              onClick={toggleTheme}
              title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
            >
              {theme === 'dark' ? <Sun size={13} className="text-solstice" /> : <Moon size={13} className="text-pulsar" />}
            </button>
          </div>
        </div>
      </header>

      {/* Editorial Hero Header */}
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

      {/* View Switch: Core Control Stack vs Wealth Terminal */}
      {activeView === 'terminal' ? (
        <WealthTerminal
          plan={plan}
          summary={summary}
          onReturnToDashboard={() => setActiveView('control')}
          onLaunchTour={(stepIdx) => {
            setTourInitialStep(stepIdx ?? 4);
            setShowTour(true);
          }}
        />
      ) : (
        /* Main Stack */
        <main className="main-stack">
          {/* Archetypes Persona Bar */}
          <PersonaPresetBar currentPlan={plan} onSelectPreset={handleSelectPreset} />

          {/* Key Vitals Telemetry */}
          <SummaryCards summary={summary} debtPayoff={debtPayoff} period={period} />

          {/* 2-Column Wide Desktop Cockpit Grid (Eliminates side gutters) */}
          <div className="cockpit-grid">
            <div className="cockpit-col">
              {/* Cashflow Inflow & Outflow Mix */}
              <IncomeExpensePanel plan={plan} period={period} onChange={setPlan} />

              {/* Debt Elimination & Tax Regime */}
              <IndiaTaxAndDebtPanel
                plan={plan}
                debtPayoff={debtPayoff}
                taxComparison={taxComparison}
                onChange={setPlan}
              />
            </div>

            <div className="cockpit-col">
              {/* 50/30/20 Budget Health Audit */}
              <BudgetHealthWidget analysis={budgetRule} />

              {/* Emergency Runway Survival Stress Test & FIRE Milestones */}
              <div id="tour-survival" className="tour-survival-block">
                <EmergencyStressTestWidget plan={plan} />
                <FireMilestoneTracker plan={plan} />
              </div>

              {/* Forward Wealth Curve */}
              <ProjectionSection
                plan={plan}
                baseline={baseline}
                projections={projections}
                horizonMonths={horizonMonths}
                onHorizonChange={setHorizonMonths}
                onChange={setPlan}
              />
            </div>
          </div>
        </main>
      )}

      {/* What-If Scenario Modal */}
      {showSandbox && (
        <WhatIfSandboxModal
          currentPlan={plan}
          onApply={(simPlan) => {
            setPlan(simPlan);
            setShowSandbox(false);
            setStatusMessage('Simulated sandbox scenario applied to active vault!');
          }}
          onClose={() => setShowSandbox(false)}
        />
      )}

      {/* Interactive Guided Spotlight Tour */}
      <GuidedTourModal
        isOpen={showTour}
        initialStepIndex={tourInitialStep}
        activeView={activeView}
        onViewChange={(v) => setActiveView(v)}
        onClose={() => {
          setShowTour(false);
          setTourInitialStep(0);
        }}
        onComplete={() => {
          setShowTour(false);
          setTourInitialStep(0);
          setStatusMessage('Master Guided Tour completed! You now have full tactical control.');
        }}
      />

      {/* Shareable Financial Health Card Modal */}
      <SocialShareModal
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
        plan={plan}
        summary={summary}
        budgetRule={budgetRule}
        taxComparison={taxComparison}
        debtPayoff={debtPayoff}
        accountName={activeAccount.name}
      />

      {/* Cross-Device QR Vault Beam Modal */}
      <QRVaultSyncModal
        isOpen={showQRModal}
        onClose={() => setShowQRModal(false)}
        plan={plan}
        activeAccountName={activeAccount.name}
        onImportPlan={(importedPlan, vaultName) => {
          setPlan(importedPlan);
          setStatusMessage(`Beamed vault successfully imported: ${vaultName || 'Imported Vault'}`);
        }}
      />

      {/* Minimalist Footer */}
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
            onClick={() => setShowTour(true)}
          >
            take tour
          </button>
          <span>·</span>
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
