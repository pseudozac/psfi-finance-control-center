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
  Terminal,
  FileText,
  Crown,
  Activity,
  Image as ImageIcon,
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
import { CommandPaletteModal } from './components/CommandPaletteModal';
import { StatementParserModal } from './components/StatementParserModal';
import { SovereignSkillTreeModal } from './components/SovereignSkillTreeModal';
import { ImpulseShieldWidget } from './components/ImpulseShieldWidget';
import { ExcelCamouflageOverlay } from './components/ExcelCamouflageOverlay';
import { SteganographyModal } from './components/SteganographyModal';
import { ReverseMonteCarloModal } from './components/ReverseMonteCarloModal';
import { decodeVaultBeam } from './lib/vaultBeam';

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
  const [showCmdK, setShowCmdK] = useState<boolean>(false);
  const [showStatementParser, setShowStatementParser] = useState<boolean>(false);
  const [showSkillTree, setShowSkillTree] = useState<boolean>(false);
  const [showCamouflage, setShowCamouflage] = useState<boolean>(false);
  const [showSteganography, setShowSteganography] = useState<boolean>(false);
  const [showMonteCarlo, setShowMonteCarlo] = useState<boolean>(false);
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

  // Click outside or press Escape to close tools dropdown
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent | TouchEvent) => {
      if (toolsDropdownRef.current && !toolsDropdownRef.current.contains(e.target as Node)) {
        setToolsMenuOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setToolsMenuOpen(false);
      }
    };
    if (toolsMenuOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
      document.addEventListener('touchstart', handleOutsideClick);
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('touchstart', handleOutsideClick);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [toolsMenuOpen]);

  // Listen for incoming #beam= URL hash transfers
  useEffect(() => {
    const handleHash = () => {
      const hash = window.location.hash;
      if (hash && hash.startsWith('#beam=')) {
        const payload = hash.slice(6);
        const result = decodeVaultBeam(payload);
        if (result.success && result.plan) {
          setPlan(result.plan);
          setStatusMessage(`Beamed vault successfully imported from link: ${result.vaultName || 'Shared Vault'}`);
          window.history.replaceState(null, '', window.location.pathname);
        } else if (result.needsPin) {
          setShowQRModal(true);
        }
      }
    };
    handleHash();
    window.addEventListener('hashchange', handleHash);
    return () => window.removeEventListener('hashchange', handleHash);
  }, [setPlan, setStatusMessage]);

  // Global hotkey listener for Alt+X (Camouflage) and Cmd+K / Ctrl+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const targetTag = (e.target as HTMLElement)?.tagName;
      const isInput =
        targetTag === 'INPUT' || targetTag === 'TEXTAREA' || (e.target as HTMLElement)?.isContentEditable;

      if (e.key === 'Escape' && showCamouflage) {
        setShowCamouflage(false);
      } else if (e.altKey && (e.key === 'x' || e.key === 'X')) {
        e.preventDefault();
        setShowCamouflage((prev) => !prev);
      } else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setShowCmdK((prev) => !prev);
      } else if (e.key === '/' && !isInput) {
        e.preventDefault();
        setShowCmdK(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showCamouflage]);

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
            <span className="view-label view-label-full">Control Center</span>
            <span className="view-label view-label-compact">Control</span>
          </button>
          <button
            type="button"
            className={activeView === 'terminal' ? 'pill-active pill-terminal-active' : ''}
            onClick={() => setActiveView('terminal')}
            title="Wealth Terminal (Stock-Market Expenditure & Valuation Engine)"
          >
            <TrendingUp size={12} className={activeView === 'terminal' ? 'text-nebula' : ''} />
            <span className="view-label view-label-full">Wealth Terminal</span>
            <span className="view-label view-label-compact">Terminal</span>
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

          {/* Terminal Command Omnibar Trigger */}
          <button
            type="button"
            id="tour-cmdk"
            className="action-pill pill-cmdk"
            onClick={() => setShowCmdK(true)}
            title="Terminal Command Omnibar (Cmd+K / Ctrl+K or '/')"
          >
            <Terminal size={12} className="text-quasar" />
            <span className="font-mono text-xs">⌘K</span>
          </button>

          {/* Statement Parser Trigger */}
          <button
            type="button"
            className="action-pill pill-ingest"
            onClick={() => setShowStatementParser(true)}
            title="Ingest Financial Statements: Mutual Fund CAS, Bank, Credit Cards & Payslips (100% Private in-memory)"
          >
            <FileText size={12} className="text-nebula" />
            <span className="font-mono text-xs">ingest</span>
          </button>

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

          {/* Sovereign Skill Tree Trigger */}
          <button
            type="button"
            id="tour-skills"
            className="action-pill pill-skills"
            onClick={() => setShowSkillTree(true)}
            title="Sovereign Wealth RPG Skill Tree (Gamified Financial Freedom)"
          >
            <Crown size={12} className="text-solstice" />
            <span className="font-mono text-xs">skills</span>
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
              <>
                <div
                  className="tools-dropdown-backdrop"
                  onClick={() => setToolsMenuOpen(false)}
                  aria-hidden="true"
                />
                <div className="tools-dropdown-menu" role="menu">
                <div className="tools-mega-grid">
                  {/* COLUMN 1: ACTUARIAL ENGINES & STRESS-TESTS */}
                  <div className="tools-category-column">
                    <div className="tools-category-header text-nebula">
                      <Sparkles size={11} className="text-nebula" />
                      <span>Actuarial & Simulations</span>
                    </div>

                    <button
                      type="button"
                      className="tools-menu-item"
                      onClick={() => { setShowStatementParser(true); setToolsMenuOpen(false); }}
                    >
                      <FileText size={13} className="text-nebula" />
                      <div>
                        <span className="item-title">Ingest Statements</span>
                        <span className="item-sub">CAS, Bank, Cards & Payslips</span>
                      </div>
                    </button>

                    <button
                      type="button"
                      className="tools-menu-item"
                      onClick={() => { setShowSkillTree(true); setToolsMenuOpen(false); }}
                    >
                      <Crown size={13} className="text-solstice" />
                      <div>
                        <span className="item-title">Sovereign Skill Tree</span>
                        <span className="item-sub">RPG financial independence constellation</span>
                      </div>
                    </button>

                    <button
                      type="button"
                      className="tools-menu-item"
                      onClick={() => { setShowMonteCarlo(true); setToolsMenuOpen(false); }}
                    >
                      <Activity size={13} className="text-cyan-400" />
                      <div>
                        <span className="item-title">Reverse Monte Carlo</span>
                        <span className="item-sub">10,000 black swan simulations</span>
                      </div>
                    </button>

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
                        <span className="item-sub">{baseline ? 'Remove delta snapshot' : 'Snapshot figures for variance'}</span>
                      </div>
                    </button>
                  </div>

                  {/* COLUMN 2: PRIVACY & SOVEREIGN CLOAKING */}
                  <div className="tools-category-column">
                    <div className="tools-category-header text-corona">
                      <ShieldCheck size={11} className="text-corona" />
                      <span>Privacy & Sovereign Defense</span>
                    </div>

                    <button
                      type="button"
                      className="tools-menu-item"
                      onClick={() => { setShowCamouflage(true); setToolsMenuOpen(false); }}
                    >
                      <FileSpreadsheet size={13} className="text-emerald-400" />
                      <div>
                        <span className="item-title">
                          <span>Excel Camouflage</span>
                          <span className="font-mono text-[9px] px-1.5 py-0.5 rounded bg-emerald-950/80 text-emerald-300 border border-emerald-800/80 shrink-0 ml-auto">Alt+X</span>
                        </span>
                        <span className="item-sub">Panic logistics spreadsheet disguise</span>
                      </div>
                    </button>

                    <button
                      type="button"
                      className="tools-menu-item"
                      onClick={() => { setShowSteganography(true); setToolsMenuOpen(false); }}
                    >
                      <ImageIcon size={13} className="text-purple-400" />
                      <div>
                        <span className="item-title">Steganographic PNG</span>
                        <span className="item-sub">Hide encrypted vault inside wallpaper</span>
                      </div>
                    </button>

                    <button
                      type="button"
                      id="tour-vault-sync"
                      className="tools-menu-item"
                      onClick={() => { setShowQRModal(true); setToolsMenuOpen(false); }}
                    >
                      <QrCode size={13} className="text-quasar" />
                      <div>
                        <span className="item-title">Cross-Device QR Beam</span>
                        <span className="item-sub">P2P zero-cloud offline sync</span>
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
                        <span className="item-sub">Anonymized 16:9 / 1:1 scorecard</span>
                      </div>
                    </button>
                  </div>

                  {/* COLUMN 3: DATA LEDGERS & ARCHIVES */}
                  <div className="tools-category-column">
                    <div className="tools-category-header text-solstice">
                      <Download size={11} className="text-solstice" />
                      <span>Ledgers & System</span>
                    </div>

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
                        <span className="item-sub">Download offline vault state</span>
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
                        <span className="item-title">Print Executive PDF</span>
                        <span className="item-sub">1-page formatted report</span>
                      </div>
                    </button>

                    <button
                      type="button"
                      className="tools-menu-item"
                      onClick={() => { launchDemoVault(); setToolsMenuOpen(false); }}
                    >
                      <Sparkles size={13} className="text-solstice" />
                      <div>
                        <span className="item-title">Load Demo Vault</span>
                        <span className="item-sub">Seeded Tech Lead portfolio</span>
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
                </div>

                <div className="tools-mega-footer">
                  <span>⚡ Quick dispatch: Press <strong>⌘K</strong> or <strong>/</strong> anywhere</span>
                  <span>🔒 Panic Disguise: <strong>Alt + X</strong></span>
                </div>
              </div>
            </>
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

          {/* 2-Column Wide Desktop Cockpit Grid (Symmetrically Balanced) */}
          <div className="cockpit-grid">
            <div className="cockpit-col">
              {/* Cashflow Inflow & Outflow Mix */}
              <div id="tour-cashflows">
                <IncomeExpensePanel plan={plan} period={period} onChange={setPlan} />
              </div>

              {/* Debt Elimination & Tax Regime */}
              <div id="tour-tax">
                <IndiaTaxAndDebtPanel
                  plan={plan}
                  debtPayoff={debtPayoff}
                  taxComparison={taxComparison}
                  onChange={setPlan}
                />
              </div>

              {/* Emergency Runway Survival Stress Test & FIRE Milestones */}
              <div id="tour-survival" className="tour-survival-block">
                <EmergencyStressTestWidget plan={plan} />
                <FireMilestoneTracker plan={plan} />
              </div>
            </div>

            <div className="cockpit-col">
              {/* 50/30/20 Budget Health Audit */}
              <BudgetHealthWidget analysis={budgetRule} />

              {/* Local Impulse Shield & Daily Burn Pocket */}
              <div id="tour-impulse-shield">
                <ImpulseShieldWidget plan={plan} summary={summary} />
              </div>
            </div>
          </div>

          {/* Full-Width Majestic Forward Wealth Compounding Curve */}
          <div className="cockpit-fullwidth-section">
            <ProjectionSection
              plan={plan}
              baseline={baseline}
              projections={projections}
              horizonMonths={horizonMonths}
              onHorizonChange={setHorizonMonths}
              onChange={setPlan}
            />
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
        onOpenSkillTree={() => setShowSkillTree(true)}
        onOpenCmdK={() => setShowCmdK(true)}
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

      {/* Terminal Command Omnibar Modal (Cmd+K / Ctrl+K) */}
      <CommandPaletteModal
        isOpen={showCmdK}
        onClose={() => setShowCmdK(false)}
        currentPlan={plan}
        onUpdatePlan={(updater, note) => {
          setPlan(updater(plan));
          setStatusMessage(note);
        }}
        onSelectPreset={handleSelectPreset}
        activeView={activeView}
        onViewChange={(v) => setActiveView(v)}
        privacyMode={privacyMode}
        onTogglePrivacy={() => setPrivacyMode(!privacyMode)}
        onOpenTour={() => setShowTour(true)}
        onOpenShare={() => setShowShareModal(true)}
        onOpenQR={() => setShowQRModal(true)}
        onOpenSandbox={() => setShowSandbox(true)}
        baseline={baseline}
        onToggleBaseline={() => {
          if (baseline) clearBaseline();
          else pinBaseline();
        }}
        layoutMode={layoutMode}
        onToggleLayout={toggleLayoutMode}
        theme={theme}
        onToggleTheme={toggleTheme}
        period={period}
        onTogglePeriod={() => setPeriod(period === 'monthly' ? 'annual' : 'monthly')}
        onExportJSON={exportJSON}
        onExportCSV={() => exportCSV(horizonMonths)}
        onPrint={() => window.print()}
        onResetDefaults={resetToDefaults}
        onLoadDemo={launchDemoVault}
        onOpenStatementParser={() => setShowStatementParser(true)}
        onOpenSkillTree={() => setShowSkillTree(true)}
        onOpenCamouflage={() => setShowCamouflage(true)}
        onOpenSteganography={() => setShowSteganography(true)}
        onOpenMonteCarlo={() => setShowMonteCarlo(true)}
      />

      {/* Excel Corporate Camouflage Screen Overlay [Esc Esc] */}
      <ExcelCamouflageOverlay
        isOpen={showCamouflage}
        onExit={() => setShowCamouflage(false)}
      />

      {/* Steganographic PNG Vault & Decoy Modal */}
      <SteganographyModal
        isOpen={showSteganography}
        onClose={() => setShowSteganography(false)}
        plan={plan}
        onRestorePlan={(restored) => {
          setPlan(restored);
          setStatusMessage('Restored vault successfully from Steganographic PNG image.');
        }}
      />

      {/* Reverse Monte Carlo FIRE Stress-Testing Modal */}
      <ReverseMonteCarloModal
        isOpen={showMonteCarlo}
        onClose={() => setShowMonteCarlo(false)}
        plan={plan}
        summary={summary}
      />

      {/* Sovereign Wealth RPG Skill Tree Modal */}
      <SovereignSkillTreeModal
        isOpen={showSkillTree}
        onClose={() => setShowSkillTree(false)}
        plan={plan}
        summary={summary}
        taxSavingsDelta={taxComparison.savings}
        onApplySimulatedPlan={(updated) => setPlan(updated)}
      />

      {/* Zero-Server Private Statement & Document Ingestion Modal */}
      <StatementParserModal
        isOpen={showStatementParser}
        onClose={() => setShowStatementParser(false)}
        currentPlan={plan}
        onApplyPlan={(updatedPlan, msg) => {
          setPlan(updatedPlan);
          setStatusMessage(msg);
        }}
        onCreateVault={(name, vaultPlan) => {
          createVaultAndSwitch(name, vaultPlan);
          setStatusMessage(`Created and switched to new isolated vault: "${name}"`);
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
