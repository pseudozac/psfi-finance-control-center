import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
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
  Lock,
  Image as ImageIcon,
  X,
  Search,
  Scale,
  FolderArchive,
} from 'lucide-react';
import type { FinancePlan, ViewPeriod } from './types/finance';
import {
  calculateBudgetRule,
  calculateDebtPayoff,
  calculateProjections,
  calculateSummary,
  estimateIndianIncomeTax,
} from './lib/finance';
import { calculateSkillTree } from './lib/skillTree';
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
import { SovereignMilestoneRibbon } from './components/SovereignMilestoneRibbon';
import { ImpulseShieldWidget } from './components/ImpulseShieldWidget';
import { ExcelCamouflageOverlay } from './components/ExcelCamouflageOverlay';
import { SteganographyModal } from './components/SteganographyModal';
import { ReverseMonteCarloModal } from './components/ReverseMonteCarloModal';
import { VaultLockGate } from './components/VaultLockGate';
import { VaultSecurityModal } from './components/VaultSecurityModal';
import { VaultRecoveryGate } from './components/VaultRecoveryGate';
import { LoanPrepaymentArbitrageModal } from './components/LoanPrepaymentArbitrageModal';
import { TactileCommitSlider } from './components/TactileCommitSlider';
import { ExecutivePrintableStatement } from './components/ExecutivePrintableStatement';
import { recoverDeviceUnlock, clearSecureStorage } from './lib/encryptedVaultStorage';
import { decodeVaultBeamSecure } from './lib/vaultBeam';

type AppPhase = 'loading' | 'gateway' | 'dashboard';

export type DashboardMode = 'simple' | 'advance' | 'custom';

export interface CustomModulesConfig {
  archetypes: boolean;
  rpg: boolean;
  vitals: boolean;
  cashflow: boolean;
  taxDebt: boolean;
  budget503020: boolean;
  impulseShield: boolean;
  emergencyFire: boolean;
  compounding: boolean;
}

export const DEFAULT_CUSTOM_MODULES: CustomModulesConfig = {
  archetypes: false,
  rpg: false,
  vitals: true,
  cashflow: true,
  taxDebt: true,
  budget503020: true,
  impulseShield: true,
  emergencyFire: true,
  compounding: true,
};

export const ALL_CUSTOM_MODULES: CustomModulesConfig = {
  archetypes: true,
  rpg: true,
  vitals: true,
  cashflow: true,
  taxDebt: true,
  budget503020: true,
  impulseShield: true,
  emergencyFire: true,
  compounding: true,
};

export const MINIMAL_CUSTOM_MODULES: CustomModulesConfig = {
  archetypes: false,
  rpg: false,
  vitals: true,
  cashflow: true,
  taxDebt: false,
  budget503020: true,
  impulseShield: false,
  emergencyFire: false,
  compounding: true,
};

interface CustomModuleDef {
  id: keyof CustomModulesConfig;
  label: string;
  shortLabel: string;
  badge?: string;
  description: string;
}

const CUSTOM_MODULE_DEFS: CustomModuleDef[] = [
  { id: 'vitals', label: 'Key Vitals Telemetry', shortLabel: 'Vitals', badge: 'Core', description: 'Net Worth, Liquid Runway, Savings Rate & Debt Health' },
  { id: 'cashflow', label: 'Cashflow Architecture', shortLabel: 'Cashflow', badge: 'Core', description: 'Income streams, fixed expenses, EMI outgo & horizon cashflow' },
  { id: 'budget503020', label: '50/30/20 Budget Health', shortLabel: '50/30/20', badge: 'Core', description: 'Needs vs Wants vs Compounding Savings allocation audit' },
  { id: 'compounding', label: 'Wealth Compounding Curve', shortLabel: 'Compounding', badge: 'Core', description: 'Long-term forward SIP equity compounding projections' },
  { id: 'taxDebt', label: 'Indian Tax & Debt Optimization', shortLabel: 'Tax & Debt', badge: 'Statutory', description: 'Sec 115BAC vs 1961 itemized tax audit & debt elimination' },
  { id: 'impulseShield', label: 'Impulse Shield & Pocket', shortLabel: 'Impulse Shield', badge: 'Tactile', description: 'Daily burn allowance, 72h cooling chamber & impulse defense' },
  { id: 'emergencyFire', label: 'Emergency Defense & FIRE', shortLabel: 'Defense & FIRE', badge: 'Actuarial', description: 'Liquid runway months & Financial Independence milestones' },
  { id: 'archetypes', label: 'Archetype Presets', shortLabel: 'Archetypes', badge: 'Models', description: 'Quick-load demographic financial personas and scenarios' },
  { id: 'rpg', label: 'Sovereign RPG Milestones', shortLabel: 'Sovereign RPG', badge: 'Progress', description: 'Gamified financial sovereignty skill tree & badge progression' },
];

export function App() {
  const {
    storageReady,
    storageError,
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
    refreshAccounts,
    statusMessage,
    setStatusMessage,
    isDirty,
    commitPlanChanges,
    discardPlanChanges,
    exportAllVaultsBundle,
    importAllVaultsBundle,
  } = useFinancePlan();


  // App phase control: loading -> gateway -> dashboard
  const [appPhase, setAppPhase] = useState<AppPhase>(() => {
    if (typeof window !== 'undefined' && (window.location.search.includes('dashboard') || window.location.search.includes('skipIntro'))) {
      return 'dashboard';
    }
    return 'loading';
  });
  const [activeView, setActiveView] = useState<'control' | 'terminal'>('control');
  const [dashboardMode, setDashboardMode] = useState<DashboardMode>(() => {
    try {
      const saved = localStorage.getItem('psfi_dashboard_mode');
      if (saved === 'simple' || saved === 'advance' || saved === 'custom') {
        return saved;
      }
    } catch (e) {
      console.error(e);
    }
    return 'advance';
  });

  useEffect(() => {
    try {
      localStorage.setItem('psfi_dashboard_mode', dashboardMode);
    } catch (e) {
      console.error(e);
    }
  }, [dashboardMode]);

  const [customModules, setCustomModules] = useState<CustomModulesConfig>(() => {
    try {
      const saved = localStorage.getItem('psfi_custom_modules');
      if (saved) {
        const parsed = JSON.parse(saved);
        return { ...DEFAULT_CUSTOM_MODULES, ...parsed };
      }
    } catch (e) {
      console.error(e);
    }
    return DEFAULT_CUSTOM_MODULES;
  });

  useEffect(() => {
    try {
      localStorage.setItem('psfi_custom_modules', JSON.stringify(customModules));
    } catch (e) {
      console.error(e);
    }
  }, [customModules]);

  const activeCustomCount = useMemo(() => {
    return Object.values(customModules).filter(Boolean).length;
  }, [customModules]);

  const handleStartTour = (stepIdx?: number) => {
    if (dashboardMode !== 'advance') {
      setDashboardMode('advance');
      setStatusMessage('Switched to Advance View to display all interactive tour modules.');
    }
    setTourInitialStep(stepIdx ?? 0);
    setShowTour(true);
  };
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
  const [showVaultSecurity, setShowVaultSecurity] = useState<boolean>(false);
  const [showLoanArbitrage, setShowLoanArbitrage] = useState<boolean>(false);
  const [showPrintableStatement, setShowPrintableStatement] = useState<boolean>(false);
  const [unlockedVaultIds, setUnlockedVaultIds] = useState<Set<string>>(new Set());
  const [toolsMenuOpen, setToolsMenuOpen] = useState<boolean>(false);
  const [toolsSearchQuery, setToolsSearchQuery] = useState<string>('');
  const [toolsCategoryFilter, setToolsCategoryFilter] = useState<'all' | 'sim' | 'privacy' | 'data'>('all');
  const toolsDropdownRef = useRef<HTMLDivElement>(null);
  const toolsMenuRef = useRef<HTMLDivElement>(null);

  // Toast auto-dismiss and smooth fade transition
  const [toastFading, setToastFading] = useState<boolean>(false);

  useEffect(() => {
    if (!statusMessage) {
      setToastFading(false);
      return;
    }
    setToastFading(false);
    const fadeTimer = setTimeout(() => {
      setToastFading(true);
    }, 1500);

    const removeTimer = setTimeout(() => {
      setStatusMessage(null);
      setToastFading(false);
    }, 1850);

    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(removeTimer);
    };
  }, [statusMessage, setStatusMessage]);

  // Incoming PIN-protected beam resolution states
  const [pendingBeamPayload, setPendingBeamPayload] = useState<string | null>(null);
  const [pendingBeamPin, setPendingBeamPin] = useState<string>('');
  const [pendingBeamError, setPendingBeamError] = useState<string | null>(null);

  const closeAllMobileOverlays = () => {
    setShowSkillTree(false);
    setToolsMenuOpen(false);
    setShowSandbox(false);
    setShowStatementParser(false);
    setShowMonteCarlo(false);
    setShowSteganography(false);
    setShowShareModal(false);
    setShowQRModal(false);
    setShowVaultSecurity(false);
    setShowLoanArbitrage(false);
    setShowPrintableStatement(false);
    setShowCmdK(false);
  };

  const isAnyModalActive = Boolean(
    showSkillTree ||
    toolsMenuOpen ||
    showSandbox ||
    showStatementParser ||
    showMonteCarlo ||
    showSteganography ||
    showShareModal ||
    showQRModal ||
    showVaultSecurity ||
    showLoanArbitrage ||
    showPrintableStatement
  );

  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    const saved = localStorage.getItem('psfi_theme');
    if (saved === 'light' || saved === 'dark') return saved;
    return 'dark';
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  const [windowWidth, setWindowWidth] = useState<number>(() => typeof window !== 'undefined' ? window.innerWidth : 1024);

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    // Purge any stale legacy layoutMode locks that squished desktop screens
    try {
      localStorage.removeItem('psfi_layout_mode');
    } catch {
      // ignore
    }
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const isMobileViewport = windowWidth <= 768;
  const layoutMode: 'mobile' | 'desktop' = isMobileViewport ? 'mobile' : 'desktop';

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('psfi_theme', theme);
  }, [theme]);

  // Click outside or press Escape to close tools dropdown
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent | TouchEvent) => {
      const target = e.target as Node;
      if (
        toolsDropdownRef.current &&
        !toolsDropdownRef.current.contains(target) &&
        (!toolsMenuRef.current || !toolsMenuRef.current.contains(target))
      ) {
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
    if (!storageReady) return;
    const handleHash = async () => {
      const hash = window.location.hash;
      if (hash && hash.startsWith('#beam=')) {
        const payload = hash.slice(6);
        const result = await decodeVaultBeamSecure(payload);
        if (result.success && result.plan) {
          setPlan(result.plan);
          setAppPhase('dashboard');
          setStatusMessage(`⚡ Beamed vault "${result.vaultName || 'Shared Vault'}" successfully imported!`);
          window.history.replaceState(null, '', window.location.pathname);
        } else if (result.needsPin) {
          setPendingBeamPayload(payload);
          setPendingBeamPin('');
          setPendingBeamError(null);
        }
      }
    };
    handleHash();
    window.addEventListener('hashchange', handleHash);
    return () => window.removeEventListener('hashchange', handleHash);
  }, [storageReady, setPlan, setStatusMessage]);

  const handleUnlockPendingBeam = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!pendingBeamPayload || pendingBeamPin.length < 4) {
      setPendingBeamError('Please enter a 4-digit PIN.');
      return;
    }
    const result = await decodeVaultBeamSecure(pendingBeamPayload, pendingBeamPin);
    if (result.success && result.plan) {
      setPlan(result.plan);
      setAppPhase('dashboard');
      setStatusMessage(`🔓 Beamed vault "${result.vaultName || 'Shared Vault'}" unlocked and imported!`);
      setPendingBeamPayload(null);
      setPendingBeamPin('');
      setPendingBeamError(null);
      window.history.replaceState(null, '', window.location.pathname);
    } else {
      setPendingBeamError(result.error || 'Incorrect 4-digit PIN. Please try again.');
      setPendingBeamPin('');
    }
  };

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
      } else if (e.altKey && (e.key === 'l' || e.key === 'L')) {
        e.preventDefault();
        // Instant Lock Active Vault
        if (activeAccount.pinHash) {
          setUnlockedVaultIds((prev) => {
            const next = new Set(prev);
            next.delete(activeAccount.id);
            return next;
          });
          setStatusMessage(`🔒 Vault "${activeAccount.name}" locked.`);
        } else {
          setShowVaultSecurity(true);
        }
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
  }, [showCamouflage, activeAccount]);

  // Auto-lock vault on document visibility change (tab hidden / screen locked)
  useEffect(() => {
    const handleVisibilityChange = () => {
      // Auto-arm locks when tab is hidden/unfocused if autoLockMinutes is 0 (default) or not explicitly disabled (-1)
      const minutes = activeAccount?.autoLockMinutes;
      if (document.hidden && activeAccount?.pinHash && (minutes === undefined || minutes === 0)) {
        setUnlockedVaultIds((prev) => {
          const next = new Set(prev);
          next.delete(activeAccount.id);
          return next;
        });
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [activeAccount]);

  // Idle inactivity auto-lock timer for positive autoLockMinutes (e.g. 5m, 15m)
  useEffect(() => {
    if (!activeAccount?.pinHash) return;
    const timeoutMinutes = activeAccount.autoLockMinutes;
    if (!timeoutMinutes || timeoutMinutes <= 0) return;

    let timer: ReturnType<typeof setTimeout>;

    const resetTimer = () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        setUnlockedVaultIds((prev) => {
          const next = new Set(prev);
          next.delete(activeAccount.id);
          return next;
        });
        setStatusMessage(`🔒 Vault "${activeAccount.name}" locked due to inactivity.`);
      }, timeoutMinutes * 60 * 1000);
    };

    const activityEvents = ['mousedown', 'keydown', 'scroll', 'touchstart'];
    activityEvents.forEach((ev) => window.addEventListener(ev, resetTimer, { passive: true }));
    resetTimer();

    return () => {
      clearTimeout(timer);
      activityEvents.forEach((ev) => window.removeEventListener(ev, resetTimer));
    };
  }, [activeAccount]);

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
  const taxComparison = useMemo(() => {
    const { tax } = plan;
    const grossSalary = tax.grossSalaryAnnual;
    const otherIncome = tax.otherOrdinaryIncomeAnnual ?? 0;
    if (grossSalary == null || !Number.isFinite(grossSalary) || grossSalary + otherIncome > 5_000_000) {
      return null;
    }
    return estimateIndianIncomeTax(
      grossSalary + otherIncome,
      tax.deductions80C,
      tax.deductions80D,
      tax.deductionsNPS,
      tax.rentPaidMonthly,
      tax.isMetroCity,
      { grossSalaryAnnual: grossSalary, hraSalaryMonthly: tax.hraSalaryMonthly, hraReceivedMonthly: tax.hraReceivedMonthly }
    );
  }, [plan.tax]);

  const optimalTaxSavings = taxComparison?.savings ?? 0;

  const skillTreeState = useMemo(() => {
    return calculateSkillTree(plan, summary, optimalTaxSavings);
  }, [plan, summary, optimalTaxSavings]);

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

  const renderPinUnlockModal = () => {
    if (!pendingBeamPayload) return null;
    return (
      <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label="PIN Unlock">
        <div className="modal-card max-w-sm w-full mx-4 p-6 bg-surface-primary border border-medium rounded-2xl shadow-2xl text-center animate-slideDown">
          <div className="w-12 h-12 rounded-full bg-solstice/15 border border-solstice/30 text-solstice flex items-center justify-center mx-auto mb-3 shadow-lg">
            <Lock size={22} />
          </div>
          <h3 className="text-base font-semibold text-primary m-0">PIN-Protected Vault Beam</h3>
          <p className="text-xs text-secondary mt-1.5 leading-relaxed">
            This incoming portfolio was locked with a 4-digit security PIN by the sender. Enter the PIN to decrypt and load:
          </p>

          <form onSubmit={handleUnlockPendingBeam} className="mt-4">
            <input
              type="password"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={4}
              placeholder="••••"
              value={pendingBeamPin}
              onChange={(e) => setPendingBeamPin(e.target.value.replace(/\D/g, ''))}
              className="w-32 text-center text-lg tracking-widest font-mono py-2 px-3 bg-surface-overlay border border-medium rounded-lg text-primary focus:border-solstice focus:outline-none"
              autoFocus
            />

            {pendingBeamError && (
              <p className="text-xs text-corona font-mono mt-2 mb-0 animate-fadeIn">{pendingBeamError}</p>
            )}

            <div className="flex gap-2 mt-4">
              <button
                type="button"
                className="btn-secondary flex-1 py-2 text-xs font-mono"
                onClick={() => {
                  setPendingBeamPayload(null);
                  setPendingBeamPin('');
                  setPendingBeamError(null);
                  window.history.replaceState(null, '', window.location.pathname);
                  setAppPhase('dashboard');
                }}
              >
                Dismiss
              </button>
              <button
                type="submit"
                className="btn-primary flex-1 py-2 text-xs font-mono font-semibold"
                disabled={pendingBeamPin.length < 4}
              >
                Unlock Vault
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  };

  // If receiving a PIN-protected beam before dashboard mounts, block and prompt
  if (pendingBeamPayload && appPhase !== 'dashboard') {
    return renderPinUnlockModal();
  }

  // Phase 1: Intro Loader
  if (appPhase === 'loading') {
    return <IntroLoader onFinish={() => setAppPhase('gateway')} />;
  }

  // Phase 2: Vault Storage Unlock / Recovery
  if (!storageReady) {
    return (
      <VaultRecoveryGate
        storageError={storageError}
        onRecover={async (secret) => {
          await recoverDeviceUnlock(secret);
          window.location.reload();
        }}
        onResetStorage={async () => {
          await clearSecureStorage();
          try {
            localStorage.removeItem('psfi_vault_migrated_v3');
            localStorage.removeItem('psfi_accounts_v1');
            localStorage.removeItem('psfi_active_account_id');
          } catch {}
          window.location.href = window.location.pathname + '?dashboard=true';
        }}
        onLaunchDemo={() => {
          launchDemoVault();
          setAppPhase('dashboard');
        }}
        onRetry={() => window.location.reload()}
      />
    );
  }

  if (appPhase === 'gateway') {
    return (
      <GatewayScreen
        accounts={accounts}
        activeAccount={activeAccount}
        onContinue={() => setAppPhase('dashboard')}
        onLaunchDemo={() => {
          launchDemoVault();
          setAppPhase('dashboard');
          handleStartTour(0);
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

  // Check if current active vault has a PIN set and is currently locked
  const isCurrentVaultLocked = Boolean(
    activeAccount.pinHash && activeAccount.pinSalt && !unlockedVaultIds.has(activeAccount.id)
  );

  if (isCurrentVaultLocked) {
    return (
      <VaultLockGate
        account={activeAccount}
        accounts={accounts}
        onUnlock={() => {
          setUnlockedVaultIds((prev) => new Set(prev).add(activeAccount.id));
          setStatusMessage(`🔓 Unlocked ${activeAccount.name}`);
        }}
        onSwitchAccount={(id) => {
          switchAccount(id);
        }}
      />
    );
  }

  const matchesToolsSearch = (title: string, sub: string) => {
    if (!toolsSearchQuery.trim()) return true;
    const q = toolsSearchQuery.toLowerCase();
    return title.toLowerCase().includes(q) || sub.toLowerCase().includes(q);
  };

  const renderToolsMenu = () => (
    <>
      <div
        className="tools-dropdown-backdrop"
        onClick={() => setToolsMenuOpen(false)}
        aria-hidden="true"
      />
      <div className="tools-dropdown-menu" ref={toolsMenuRef} role="menu">
        {/* Mobile Drawer Handle & Header */}
        <div
          className="tools-mobile-drawer-handle"
          onClick={() => setToolsMenuOpen(false)}
          aria-label="Drag down to close"
        />
        <div className="tools-mobile-drawer-header">
          <div className="tools-mobile-drawer-title">
            <Sparkles size={14} className="text-solstice shrink-0" />
            <span className="truncate">{isMobileViewport ? 'Sovereign Tools' : 'Actuarial & Sovereign Tools'}</span>
            <span className="tools-badge-count shrink-0">14 Tools</span>
          </div>
          <button
            type="button"
            className="tools-mobile-drawer-close"
            onClick={() => setToolsMenuOpen(false)}
            aria-label="Close tools menu"
          >
            <X size={15} />
          </button>
        </div>

        {/* Live Search & Filter Bar */}
        <div className="tools-search-bar">
          <Search size={14} className="text-quasar shrink-0" />
          <input
            type="text"
            placeholder={isMobileViewport ? "Search tools & scenarios..." : "Search tools, scenarios, shortcuts (or Alt+L, Alt+X)..."}
            value={toolsSearchQuery}
            onChange={(e) => setToolsSearchQuery(e.target.value)}
            className="tools-search-input"
          />
          {toolsSearchQuery && (
            <button
              type="button"
              onClick={() => setToolsSearchQuery('')}
              className="tools-search-clear"
              aria-label="Clear search"
            >
              <X size={12} />
            </button>
          )}
        </div>

        {/* Category Filter Pills */}
        <div className="tools-category-segmented-pills">
          <button
            type="button"
            className={toolsCategoryFilter === 'all' ? 'pill-cat-active' : ''}
            onClick={() => setToolsCategoryFilter('all')}
          >
            All (14)
          </button>
          <button
            type="button"
            className={toolsCategoryFilter === 'sim' ? 'pill-cat-active' : ''}
            onClick={() => setToolsCategoryFilter('sim')}
          >
            🔮 Simulations
          </button>
          <button
            type="button"
            className={toolsCategoryFilter === 'privacy' ? 'pill-cat-active' : ''}
            onClick={() => setToolsCategoryFilter('privacy')}
          >
            🛡️ Privacy & Defense
          </button>
          <button
            type="button"
            className={toolsCategoryFilter === 'data' ? 'pill-cat-active' : ''}
            onClick={() => setToolsCategoryFilter('data')}
          >
            📂 Ledgers & Backup
          </button>
        </div>

        <div className="tools-mega-grid">
        {/* COLUMN 1: ACTUARIAL ENGINES & STRESS-TESTS */}
        {(toolsCategoryFilter === 'all' || toolsCategoryFilter === 'sim') && (
        <div className="tools-category-column">
          <div className="tools-category-header text-nebula">
            <Sparkles size={11} className="text-nebula" />
            <span>Actuarial & Simulations</span>
          </div>

          {matchesToolsSearch('Ingest Statements', 'CAS, Bank, Cards & Payslips') && (
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
          )}

          {matchesToolsSearch('Sovereign Skill Tree', 'RPG financial independence constellation') && (
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
          )}

          {matchesToolsSearch('Reverse Monte Carlo', '5,000 stochastic lifespan simulations') && (
          <button
            type="button"
            className="tools-menu-item"
            onClick={() => { setShowMonteCarlo(true); setToolsMenuOpen(false); }}
          >
            <Activity size={13} className="text-cyan-400" />
            <div>
              <span className="item-title">Reverse Monte Carlo</span>
              <span className="item-sub">5,000 stochastic lifespan simulations</span>
            </div>
          </button>
          )}

          {matchesToolsSearch('What-If Sandbox', 'Simulate raises, bonuses & inflation') && (
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
          )}

          {matchesToolsSearch('Loan Prepayment Arbitrage', 'Debt prepayment vs. Equity SIP') && (
          <button
            type="button"
            className="tools-menu-item"
            onClick={() => { setShowLoanArbitrage(true); setToolsMenuOpen(false); }}
          >
            <Scale size={13} className="text-solstice" />
            <div>
              <span className="item-title">Loan Arbitrage Simulator</span>
              <span className="item-sub">Prepay home/edu loan vs Equity SIP compounding</span>
            </div>
          </button>
          )}

          {matchesToolsSearch(baseline ? 'Clear Baseline' : 'Pin Baseline', baseline ? 'Remove delta snapshot' : 'Snapshot figures for variance') && (
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
          )}
        </div>
        )}

        {/* COLUMN 2: PRIVACY & SOVEREIGN CLOAKING */}
        {(toolsCategoryFilter === 'all' || toolsCategoryFilter === 'privacy') && (
        <div className="tools-category-column">
          <div className="tools-category-header text-corona">
            <ShieldCheck size={11} className="text-corona" />
            <span>Privacy & Sovereign Defense</span>
          </div>

          {matchesToolsSearch('Vault PIN & Security', activeAccount.pinHash ? 'PIN active · Lock or reconfigure' : 'Set 4-digit PIN lock Alt+L') && (
          <button
            type="button"
            className="tools-menu-item"
            onClick={() => { setShowVaultSecurity(true); setToolsMenuOpen(false); }}
          >
            <Lock size={13} className="text-amber-400" />
            <div>
              <span className="item-title">
                <span>Vault PIN & Security</span>
                <span className="font-mono text-[9px] px-1.5 py-0.5 rounded bg-amber-950/80 text-amber-300 border border-amber-800/80 shrink-0 ml-auto">Alt+L</span>
              </span>
              <span className="item-sub">
                {activeAccount.pinHash ? 'PIN active · Lock or reconfigure' : 'Set 4-digit PIN lock'}
              </span>
            </div>
          </button>
          )}

          {matchesToolsSearch('Excel Camouflage', 'Panic logistics spreadsheet disguise Alt+X') && (
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
          )}

          {matchesToolsSearch('Steganographic PNG', 'Hide encrypted vault inside wallpaper') && (
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
          )}

          {matchesToolsSearch('Cross-Device QR Beam', 'P2P zero-cloud offline sync') && (
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
          )}

          {matchesToolsSearch('Share Health Card', 'Anonymized 16:9 / 1:1 scorecard') && (
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
          )}
        </div>
        )}

        {/* COLUMN 3: DATA LEDGERS & ARCHIVES */}
        {(toolsCategoryFilter === 'all' || toolsCategoryFilter === 'data') && (
        <div className="tools-category-column">
          <div className="tools-category-header text-solstice">
            <Download size={11} className="text-solstice" />
            <span>Ledgers & System</span>
          </div>

          {matchesToolsSearch('Import JSON', 'Load vault backup file') && (
          <>
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
          </>
          )}

          {matchesToolsSearch('Export JSON', 'Download offline vault state') && (
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
          )}

          {matchesToolsSearch('Export CSV', 'Spreadsheet projections matrix') && (
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
          )}

          {matchesToolsSearch('Executive Wealth Dossier', 'Audit, debt & RPG PDF dossier') && (
          <button
            type="button"
            className="tools-menu-item"
            onClick={() => { setToolsMenuOpen(false); setShowPrintableStatement(true); }}
          >
            <Printer size={13} className="text-solstice" />
            <div>
              <span className="item-title">Executive Wealth Dossier</span>
              <span className="item-sub">Audit, debt &amp; RPG PDF dossier</span>
            </div>
          </button>
          )}

          {matchesToolsSearch('Master Vault Archive', 'Encrypted multi-vault backup') && (
          <button
            type="button"
            className="tools-menu-item"
            onClick={() => { setToolsMenuOpen(false); setShowVaultSecurity(true); }}
          >
            <FolderArchive size={13} className="text-solstice" />
            <div>
              <span className="item-title">Master Vault Archive</span>
              <span className="item-sub">Encrypted multi-vault .psfi.json bundle</span>
            </div>
          </button>
          )}

          {matchesToolsSearch('Load Demo Vault', 'Seeded Tech Lead portfolio') && (
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
          )}

          {matchesToolsSearch('Reset to Defaults', 'Clear plan to zeroed slate') && (
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
          )}
        </div>
        )}
      </div>

      <div className="tools-mega-footer">
        <span>⚡ Quick dispatch: Press <strong>⌘K</strong> or <strong>/</strong> anywhere</span>
        <span>🔒 Panic Disguise: <strong>Alt + X</strong></span>
      </div>
    </div>
  </>
);

  // Phase 3: Main Dashboard
  return (
    <div className={`app-shell layout-${layoutMode} ${isDirty && !showTour ? 'has-draft' : ''} ${privacyMode ? 'privacy-masked' : ''} ${showTour ? 'tour-active' : ''}`}>
      <div className="app-scroll">
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
            {activeAccount.pinHash && <Lock size={10} className="text-amber-400 shrink-0" />}
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
            <span className="font-mono text-xs pill-label">⌘K</span>
          </button>

          {/* Statement Parser Trigger */}
          <button
            type="button"
            className="action-pill pill-ingest"
            onClick={() => setShowStatementParser(true)}
            title="Ingest Financial Statements: Mutual Fund CAS, Bank, Credit Cards & Payslips (100% Private in-memory)"
          >
            <FileText size={12} className="text-nebula" />
            <span className="font-mono text-xs pill-label">ingest</span>
          </button>

          {/* Guided Tour Trigger */}
          <button
            type="button"
            className="action-pill pill-tour"
            onClick={() => handleStartTour(0)}
            title="Start Interactive Guided Tour"
          >
            <Compass size={13} className="text-quasar" />
            <span className="font-mono text-xs pill-label">tour</span>
          </button>

          {/* Sovereign Skill Tree Trigger */}
          <button
            type="button"
            id="tour-skills"
            className="action-pill pill-skills"
            onClick={() => setShowSkillTree(true)}
            title={`Sovereign Wealth RPG Skill Tree · Lvl ${skillTreeState.level} (${skillTreeState.levelTitle})`}
          >
            <Crown size={12} className="text-solstice" />
            <span className="font-mono text-xs pill-label">skills · Lvl {skillTreeState.level}</span>
          </button>

          {/* Unified Tools Dropdown Menu */}
          <div className="tools-dropdown-wrapper" ref={toolsDropdownRef}>
            <button
              type="button"
              className={`action-pill pill-tools ${toolsMenuOpen ? 'pill-active-mode' : ''}`}
              onClick={() => setToolsMenuOpen(!toolsMenuOpen)}
              title="Tools, Scenarios & Data Operations"
            >
              <Sparkles size={13} className="text-solstice" />
              <span className="font-mono text-xs pill-label">tools</span>
              <ChevronDown size={11} className={`text-muted transition-transform ${toolsMenuOpen ? 'rotate-180' : ''}`} />
            </button>

            {/* Tools menu portal is handled globally at bottom of document body */}
          </div>
        </div>

        {/* Quick Utility Icon Group: Permanently Anchored at Dock Far Right */}
        <div className="dock-utility-icons" role="toolbar" aria-label="Quick utilities">
          {/* Privacy Mask Toggle */}
          <button
            type="button"
            className={`icon-pill ${privacyMode ? 'pill-active-mode' : ''}`}
            onClick={() => setPrivacyMode(!privacyMode)}
            title={privacyMode ? 'Disable privacy masking' : 'Enable privacy mask (blur sensitive figures)'}
            aria-label={privacyMode ? 'Disable privacy masking' : 'Enable privacy masking'}
          >
            {privacyMode ? <EyeOff size={13} className="text-corona" /> : <Eye size={13} />}
          </button>

          {/* Theme Toggle */}
          <button
            type="button"
            className="icon-pill"
            onClick={toggleTheme}
            title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
            aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
          >
            {theme === 'dark' ? <Sun size={13} className="text-solstice" /> : <Moon size={13} className="text-pulsar" />}
          </button>
        </div>
      </header>

      {/* Minimalist Yet Cool Editorial Hero */}
      <section className="hero-section hero-minimal-cool">
        <div className="hero-ambient-aura" aria-hidden="true" />

        <div className="hero-cyber-badge">
          <span className="cyber-pulse-dot" />
          <span className="cyber-badge-tag" title="Income-tax Act, 1961 (FY 2025–26 / AY 2026–27) &amp; Income-tax Act, 2025 (TY 2026–27)">
            FY 2025–26 (AY 2026–27) · TY 2026–27
          </span>
          <span className="cyber-badge-sep">·</span>
          <span className="cyber-badge-secure">🛡️ OFFLINE / PRIVATE</span>
        </div>

        <h1 className="hero-headline">
          Tactile personal finance control for India<span className="hero-dot">.</span>
        </h1>

        {/* 3-Way Perspective Dock: Simple | Advance | Custom */}
        <div className="hero-view-dock" role="tablist" aria-label="Dashboard perspective switcher">
          <button
            type="button"
            role="tab"
            aria-selected={dashboardMode === 'simple'}
            className={`hero-view-tab ${dashboardMode === 'simple' ? 'active-tab-simple' : ''}`}
            onClick={() => {
              setDashboardMode('simple');
              setStatusMessage('Switched to Simple View — focused essentials');
            }}
            title="Simple View: Clean, focused essentials (Vitals, Cashflow, 50/30/20 & Compounding)"
          >
            <Sparkles size={14} className="view-tab-icon" />
            <span className="view-tab-label">Simple</span>
            <span className="view-tab-hint">Essentials</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={dashboardMode === 'advance'}
            className={`hero-view-tab ${dashboardMode === 'advance' ? 'active-tab-advance' : ''}`}
            onClick={() => {
              setDashboardMode('advance');
              setStatusMessage('Switched to Advance View — full telemetry & analytics');
            }}
            title="Advance View: Full deep telemetry, archetypes, statutory tax optimization & stress tests"
          >
            <Compass size={14} className="view-tab-icon" />
            <span className="view-tab-label">Advance</span>
            <span className="view-tab-hint">Full Suite</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={dashboardMode === 'custom'}
            className={`hero-view-tab ${dashboardMode === 'custom' ? 'active-tab-custom' : ''}`}
            onClick={() => {
              setDashboardMode('custom');
              setStatusMessage('Switched to Custom View — tailored modular workspace');
            }}
            title="Custom View: Modular cockpit — toggle individual modules on and off"
          >
            <Sliders size={14} className="view-tab-icon" />
            <span className="view-tab-label">Custom</span>
            <span className="custom-active-count font-mono">{activeCustomCount}/9</span>
          </button>
        </div>
      </section>

      {/* Toast Notification */}
      {statusMessage && (
        <div className={`hipuku-toast ${toastFading ? 'toast-fading' : ''}`} role="status">
          <CheckCircle2 size={15} className="text-nebula shrink-0" />
          <span>{statusMessage}</span>
          <button
            type="button"
            onClick={() => {
              setToastFading(false);
              setStatusMessage(null);
            }}
            aria-label="Dismiss"
          >
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
          onLaunchTour={(stepIdx) => handleStartTour(stepIdx ?? 4)}
        />
      ) : (
        /* Main Stack */
        <main className="main-stack">
          {/* Simple Perspective: Clean 1-Page Essentials */}
          {dashboardMode === 'simple' && (
            <>
              {/* Key Vitals Telemetry */}
              <div id="tour-vitals">
                <SummaryCards summary={summary} debtPayoff={debtPayoff} period={period} />
              </div>

              {/* Pillar 1: Monthly Cashflow Architecture */}
              <section id="tour-cashflows" className="dashboard-section" aria-label="Cashflow Architecture">
                <IncomeExpensePanel plan={plan} period={period} onChange={setPlan} />
              </section>

              {/* Pillar 3: Discretionary Micro-Budgeting & 50/30/20 Rule */}
              <div id="tour-budget-health" className="dashboard-section" aria-label="50/30/20 Budget Health">
                <BudgetHealthWidget analysis={budgetRule} />
              </div>

              {/* Full-Width Forward Wealth Compounding Curve */}
              <div id="tour-stepup" className="cockpit-fullwidth-section">
                <ProjectionSection
                  plan={plan}
                  baseline={baseline}
                  projections={projections}
                  horizonMonths={horizonMonths}
                  onHorizonChange={setHorizonMonths}
                  onChange={setPlan}
                />
              </div>
            </>
          )}

          {/* Advance Perspective: Full Cockpit Telemetry */}
          {dashboardMode === 'advance' && (
            <>
              {/* Archetypes Persona Bar */}
              <PersonaPresetBar currentPlan={plan} onSelectPreset={handleSelectPreset} />

              {/* Sovereign Wealth Mastery & Milestones Ribbon */}
              <SovereignMilestoneRibbon
                skillTree={skillTreeState}
                onOpenSkillTree={() => setShowSkillTree(true)}
              />

              {/* Key Vitals Telemetry */}
              <div id="tour-vitals">
                <SummaryCards summary={summary} debtPayoff={debtPayoff} period={period} />
              </div>

              {/* Pillar 1: Monthly Cashflow Architecture (Inflow & Outflows) */}
              <section id="tour-cashflows" className="dashboard-section" aria-label="Cashflow Architecture">
                <IncomeExpensePanel plan={plan} period={period} onChange={setPlan} />
              </section>

              {/* Pillar 2: Statutory Indian Tax Optimization & Debt Elimination */}
              <section id="tour-tax" className="dashboard-section" aria-label="Tax & Debt Elimination">
                <IndiaTaxAndDebtPanel
                  plan={plan}
                  debtPayoff={debtPayoff}
                  taxComparison={taxComparison}
                  onChange={setPlan}
                  onOpenLoanArbitrage={() => setShowLoanArbitrage(true)}
                />
              </section>

              {/* Pillar 3: Discretionary Micro-Budgeting & 50/30/20 Rule (2-Card Symmetrical Row) */}
              <div className="dashboard-two-col-row" aria-label="Budget Health and Discretionary Pocket">
                <div id="tour-budget-health" className="dashboard-col">
                  <BudgetHealthWidget analysis={budgetRule} />
                </div>
                <div id="tour-impulse-shield" className="dashboard-col">
                  <ImpulseShieldWidget plan={plan} summary={summary} onPlanChange={setPlan} />
                </div>
              </div>

              {/* Pillar 4: Emergency Runway Survival & FIRE Milestones (2-Card Symmetrical Row) */}
              <div id="tour-survival" className="dashboard-two-col-row tour-survival-block" aria-label="Emergency Defense and Independence">
                <div className="dashboard-col">
                  <EmergencyStressTestWidget plan={plan} />
                </div>
                <div className="dashboard-col">
                  <FireMilestoneTracker plan={plan} />
                </div>
              </div>

              {/* Full-Width Majestic Forward Wealth Compounding Curve */}
              <div id="tour-stepup" className="cockpit-fullwidth-section">
                <ProjectionSection
                  plan={plan}
                  baseline={baseline}
                  projections={projections}
                  horizonMonths={horizonMonths}
                  onHorizonChange={setHorizonMonths}
                  onChange={setPlan}
                />
              </div>
            </>
          )}

          {/* Custom Perspective: Modular User-Configured Cockpit */}
          {dashboardMode === 'custom' && (
            <div className="custom-view-container">
              {/* Custom Architect Toolbar */}
              <div className="custom-architect-toolbar" role="region" aria-label="Custom View Architect Toolbar">
                <div className="custom-toolbar-top">
                  <div className="custom-toolbar-title-wrap">
                    <div className="custom-toolbar-badge">
                      <Sliders size={13} className="text-corona" />
                      <span>MODULAR ARCHITECT</span>
                    </div>
                    <h2 className="custom-toolbar-heading">Configure Dashboard Modules</h2>
                    <p className="custom-toolbar-sub">
                      Tailor your control center by turning modules on or off. Changes persist automatically to your vault.
                    </p>
                  </div>

                  <div className="custom-toolbar-actions">
                    <button
                      type="button"
                      className="custom-quick-btn"
                      onClick={() => setCustomModules(ALL_CUSTOM_MODULES)}
                      title="Enable all 9 modules"
                    >
                      All (9)
                    </button>
                    <button
                      type="button"
                      className="custom-quick-btn active-quick-btn"
                      onClick={() => setCustomModules(DEFAULT_CUSTOM_MODULES)}
                      title="Reset to recommended 7 modules"
                    >
                      Recommended (7)
                    </button>
                    <button
                      type="button"
                      className="custom-quick-btn"
                      onClick={() => setCustomModules(MINIMAL_CUSTOM_MODULES)}
                      title="Enable 4 essential modules"
                    >
                      Minimal (4)
                    </button>
                    <button
                      type="button"
                      className="custom-quick-btn custom-quick-clear"
                      onClick={() =>
                        setCustomModules({
                          archetypes: false,
                          rpg: false,
                          vitals: false,
                          cashflow: false,
                          taxDebt: false,
                          budget503020: false,
                          impulseShield: false,
                          emergencyFire: false,
                          compounding: false,
                        })
                      }
                      title="Turn off all modules"
                    >
                      Clear All
                    </button>
                  </div>
                </div>

                {/* 9 Module Toggle Pills */}
                <div className="custom-toggle-grid" role="group" aria-label="Module visibility toggles">
                  {CUSTOM_MODULE_DEFS.map((mod) => {
                    const isActive = customModules[mod.id];
                    return (
                      <button
                        key={mod.id}
                        type="button"
                        className={`custom-toggle-pill ${isActive ? 'is-active' : 'is-inactive'}`}
                        onClick={() => {
                          setCustomModules((prev) => ({
                            ...prev,
                            [mod.id]: !prev[mod.id],
                          }));
                        }}
                        title={`${mod.description} (Click to ${isActive ? 'hide' : 'show'})`}
                        aria-pressed={isActive}
                      >
                        <span className={`custom-pill-status-dot ${isActive ? 'dot-active' : 'dot-inactive'}`} />
                        <span className="custom-pill-label">{mod.shortLabel}</span>
                        {mod.badge && <span className="custom-pill-tag font-mono">{mod.badge}</span>}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Conditionally rendered modules or empty state */}
              {activeCustomCount === 0 ? (
                <div className="empty-custom-slate">
                  <div className="empty-slate-icon-ring">
                    <Sliders size={28} className="text-corona" />
                  </div>
                  <h3 className="empty-slate-title">All Dashboard Modules Are Hidden</h3>
                  <p className="empty-slate-desc">
                    You currently have zero modules enabled in Custom View. Select modules from the Architect Toolbar above to construct your custom dashboard.
                  </p>
                  <button
                    type="button"
                    className="btn-primary empty-slate-cta"
                    onClick={() => setCustomModules(DEFAULT_CUSTOM_MODULES)}
                  >
                    <Sparkles size={14} />
                    <span>Load Recommended Layout</span>
                  </button>
                </div>
              ) : (
                <div className="custom-modules-stack">
                  {customModules.archetypes && (
                    <PersonaPresetBar currentPlan={plan} onSelectPreset={handleSelectPreset} />
                  )}

                  {customModules.rpg && (
                    <SovereignMilestoneRibbon
                      skillTree={skillTreeState}
                      onOpenSkillTree={() => setShowSkillTree(true)}
                    />
                  )}

                  {customModules.vitals && (
                    <div id="tour-vitals">
                      <SummaryCards summary={summary} debtPayoff={debtPayoff} period={period} />
                    </div>
                  )}

                  {customModules.cashflow && (
                    <section id="tour-cashflows" className="dashboard-section" aria-label="Cashflow Architecture">
                      <IncomeExpensePanel plan={plan} period={period} onChange={setPlan} />
                    </section>
                  )}

                  {customModules.taxDebt && (
                    <section id="tour-tax" className="dashboard-section" aria-label="Tax & Debt Elimination">
                      <IndiaTaxAndDebtPanel
                        plan={plan}
                        debtPayoff={debtPayoff}
                        taxComparison={taxComparison}
                        onChange={setPlan}
                        onOpenLoanArbitrage={() => setShowLoanArbitrage(true)}
                      />
                    </section>
                  )}

                  {/* Budget Health & Impulse Shield: 2-column when both active, single column otherwise */}
                  {(customModules.budget503020 || customModules.impulseShield) && (
                    <div
                      className={
                        customModules.budget503020 && customModules.impulseShield
                          ? 'dashboard-two-col-row'
                          : 'dashboard-section'
                      }
                      aria-label="Budget Health and Discretionary Pocket"
                    >
                      {customModules.budget503020 && (
                        <div id="tour-budget-health" className={customModules.impulseShield ? 'dashboard-col' : ''}>
                          <BudgetHealthWidget analysis={budgetRule} />
                        </div>
                      )}
                      {customModules.impulseShield && (
                        <div
                          id="tour-impulse-shield"
                          className={customModules.budget503020 ? 'dashboard-col' : ''}
                        >
                          <ImpulseShieldWidget plan={plan} summary={summary} onPlanChange={setPlan} />
                        </div>
                      )}
                    </div>
                  )}

                  {/* Emergency Stress Test & FIRE Tracker */}
                  {customModules.emergencyFire && (
                    <div
                      id="tour-survival"
                      className="dashboard-two-col-row tour-survival-block"
                      aria-label="Emergency Defense and Independence"
                    >
                      <div className="dashboard-col">
                        <EmergencyStressTestWidget plan={plan} />
                      </div>
                      <div className="dashboard-col">
                        <FireMilestoneTracker plan={plan} />
                      </div>
                    </div>
                  )}

                  {/* Full-Width Wealth Compounding Curve */}
                  {customModules.compounding && (
                    <div id="tour-stepup" className="cockpit-fullwidth-section">
                      <ProjectionSection
                        plan={plan}
                        baseline={baseline}
                        projections={projections}
                        horizonMonths={horizonMonths}
                        onHorizonChange={setHorizonMonths}
                        onChange={setPlan}
                      />
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
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

      {/* Incoming URL Beam PIN Unlock Modal */}
      {renderPinUnlockModal()}

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
        dashboardMode={dashboardMode}
        onDashboardModeChange={(m) => {
          setDashboardMode(m);
          setStatusMessage(`Switched to ${m.charAt(0).toUpperCase() + m.slice(1)} View`);
        }}
        onOpenTour={() => handleStartTour(0)}
        onOpenShare={() => setShowShareModal(true)}
        onOpenQR={() => setShowQRModal(true)}
        onOpenSandbox={() => setShowSandbox(true)}
        baseline={baseline}
        onToggleBaseline={() => {
          if (baseline) clearBaseline();
          else pinBaseline();
        }}
        layoutMode={layoutMode}
        onToggleLayout={() => {
          setStatusMessage(`Active display density: ${layoutMode.toUpperCase()} (${windowWidth}px responsive viewport).`);
        }}
        theme={theme}
        onToggleTheme={toggleTheme}
        period={period}
        onTogglePeriod={() => setPeriod(period === 'monthly' ? 'annual' : 'monthly')}
        onExportJSON={exportJSON}
        onExportCSV={() => exportCSV(horizonMonths)}
        onPrint={() => setShowPrintableStatement(true)}
        onResetDefaults={resetToDefaults}
        onLoadDemo={launchDemoVault}
        onOpenStatementParser={() => setShowStatementParser(true)}
        onOpenSkillTree={() => setShowSkillTree(true)}
        onOpenCamouflage={() => setShowCamouflage(true)}
        onOpenSteganography={() => setShowSteganography(true)}
        onOpenMonteCarlo={() => setShowMonteCarlo(true)}
        onOpenVaultSecurity={() => setShowVaultSecurity(true)}
        isVaultProtected={Boolean(activeAccount.pinHash)}
        onLockVault={() => {
          if (activeAccount.pinHash) {
            setUnlockedVaultIds((prev) => {
              const next = new Set(prev);
              next.delete(activeAccount.id);
              return next;
            });
            setShowCmdK(false);
            setStatusMessage(`🔒 Vault "${activeAccount.name}" locked.`);
          } else {
            setShowCmdK(false);
            setShowVaultSecurity(true);
          }
        }}
        onOpenLoanArbitrage={() => setShowLoanArbitrage(true)}
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
        taxSavingsDelta={optimalTaxSavings}
        onApplySimulatedPlan={(updated) => setPlan(updated)}
      />

      {/* Master Vault PIN Security Modal */}
      <VaultSecurityModal
        isOpen={showVaultSecurity}
        onClose={() => setShowVaultSecurity(false)}
        activeAccount={activeAccount}
        onUpdateAccount={() => {
          refreshAccounts();
          // Keep current vault unlocked in this session
          setUnlockedVaultIds((prev) => new Set(prev).add(activeAccount.id));
        }}
        onLockNow={() => {
          setUnlockedVaultIds((prev) => {
            const next = new Set(prev);
            next.delete(activeAccount.id);
            return next;
          });
        }}
        onExportAllVaults={exportAllVaultsBundle}
        onImportAllVaults={importAllVaultsBundle}
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

      {/* Loan Prepayment vs. Equity SIP Arbitrage Simulator Modal */}
      <LoanPrepaymentArbitrageModal
        isOpen={showLoanArbitrage}
        onClose={() => setShowLoanArbitrage(false)}
        defaultLoanAmount={5000000}
      />

      {/* Floating Bi-Directional Slide-to-Commit / Discard Capsule portaled to document.body */}
      {!isMobileViewport && typeof document !== 'undefined' &&
        createPortal(
          <TactileCommitSlider
            isDirty={isDirty}
            onSave={commitPlanChanges}
            onDiscard={discardPlanChanges}
          />,
          document.body
        )}

      {/* Institutional Executive 1-Page Printable PDF Statement (rendered exclusively during print/PDF generation) */}
      <ExecutivePrintableStatement
        plan={plan}
        summary={summary}
        budgetRule={budgetRule}
        taxComparison={taxComparison}
        projections={projections}
        activeAccount={activeAccount}
        baseline={baseline}
        skillTree={skillTreeState}
      />

      {/* Interactive Dossier Preview Modal */}
      {showPrintableStatement && (
        <div
          className="executive-dossier-preview-modal"
          onClick={() => setShowPrintableStatement(false)}
          role="dialog"
          aria-modal="true"
          aria-label="Executive Wealth Dossier Preview"
        >
          <div
            className="executive-dossier-modal-container"
            onClick={(e) => e.stopPropagation()}
          >
            <ExecutivePrintableStatement
              plan={plan}
              summary={summary}
              budgetRule={budgetRule}
              taxComparison={taxComparison}
              projections={projections}
              activeAccount={activeAccount}
              baseline={baseline}
              skillTree={skillTreeState}
              onClose={() => setShowPrintableStatement(false)}
            />
          </div>
        </div>
      )}

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
            onClick={() => handleStartTour(0)}
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

      {isMobileViewport && !showTour && (
        <TactileCommitSlider isDirty={isDirty} onSave={commitPlanChanges} onDiscard={discardPlanChanges} />
      )}

      {/* Mobile Floating Bottom Navigation Dock (Hidden during Tour so tour controls are 100% unobstructed) */}
      {!showTour && (
        <nav className="mobile-bottom-dock" aria-label="Mobile Navigation Dock">
          <button
            type="button"
            className={`mobile-dock-btn ${activeView === 'control' && !isAnyModalActive ? 'active' : ''}`}
            onClick={() => {
              closeAllMobileOverlays();
              setActiveView('control');
            }}
            title="Tactile Control Center"
          >
            <Sliders size={17} />
            <span>Control</span>
          </button>

          <button
            type="button"
            className={`mobile-dock-btn ${activeView === 'terminal' && !isAnyModalActive ? 'active' : ''}`}
            onClick={() => {
              closeAllMobileOverlays();
              setActiveView('terminal');
            }}
            title="Wealth Terminal"
          >
            <TrendingUp size={17} />
            <span>Terminal</span>
          </button>

          <button
            type="button"
            className={`mobile-dock-btn mobile-dock-omnibar-btn ${showCmdK ? 'active' : ''}`}
            onClick={() => {
              closeAllMobileOverlays();
              setShowCmdK(true);
            }}
            title="Search & Omnibar (⌘K)"
          >
            <div className="mobile-dock-omnibar-icon">
              <Search size={16} />
            </div>
            <span>Omnibar</span>
          </button>

          <button
            type="button"
            className={`mobile-dock-btn ${showSkillTree ? 'active' : ''}`}
            onClick={() => {
              if (showSkillTree) {
                setShowSkillTree(false);
              } else {
                closeAllMobileOverlays();
                setShowSkillTree(true);
              }
            }}
            title="Sovereign RPG Constellation"
          >
            <Crown size={17} className="text-solstice" />
            <span>RPG</span>
          </button>

          <button
            type="button"
            className={`mobile-dock-btn ${toolsMenuOpen ? 'active' : ''}`}
            onClick={() => {
              if (toolsMenuOpen) {
                setToolsMenuOpen(false);
              } else {
                closeAllMobileOverlays();
                setToolsMenuOpen(true);
              }
            }}
            title="Tools & Scenarios"
          >
            <Sparkles size={17} className="text-solstice" />
            <span>Tools</span>
          </button>
        </nav>
      )}

      {/* Tools Action Sheet portaled directly to document.body to bypass navbar-dock's backdrop-filter containing block on all screens */}
      {toolsMenuOpen && typeof document !== 'undefined' && createPortal(renderToolsMenu(), document.body)}
    </div>
  );
}

export default App;
