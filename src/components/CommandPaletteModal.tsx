import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  Terminal,
  Search,
  Sliders,
  TrendingUp,
  Compass,
  Share2,
  QrCode,
  Sparkles,
  Eye,
  EyeOff,
  Pin,
  PinOff,
  Smartphone,
  Monitor,
  Sun,
  Moon,
  Calendar,
  Download,
  FileSpreadsheet,
  Printer,
  RotateCcw,
  Briefcase,
  Home,
  Flame,
  ShieldAlert,
  ArrowRight,
  Calculator,
  CornerDownLeft,
  Percent,
  Zap,
  History,
  Coins,
  FileText,
} from 'lucide-react';
import { PLAN_PRESETS, formatINR } from '../lib/finance';
import type { FinancePlan } from '../types/finance';
import {
  parseQuickCommand,
  type SipCalculationResult,
  type EmiCalculationResult,
  type FireTargetResult,
  type Rule72Result,
  type InflationErosionResult,
  type MacroActionType,
} from '../lib/cmdKParser';

interface CommandPaletteModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentPlan: FinancePlan;
  onUpdatePlan: (updater: (prev: FinancePlan) => FinancePlan, note: string) => void;
  onSelectPreset: (presetPlan: FinancePlan, name: string) => void;
  activeView: 'control' | 'terminal';
  onViewChange: (view: 'control' | 'terminal') => void;
  privacyMode: boolean;
  onTogglePrivacy: () => void;
  onOpenTour: () => void;
  onOpenShare: () => void;
  onOpenQR: () => void;
  onOpenSandbox: () => void;
  baseline: FinancePlan | null;
  onToggleBaseline: () => void;
  layoutMode: 'desktop' | 'mobile';
  onToggleLayout: () => void;
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
  period: 'monthly' | 'annual';
  onTogglePeriod: () => void;
  onOpenStatementParser?: () => void;
  onExportJSON: () => void;
  onExportCSV: () => void;
  onPrint: () => void;
  onResetDefaults: () => void;
  onLoadDemo: () => void;
}

export type PaletteCategory = 'all' | 'calc' | 'macro' | 'presets' | 'tools';

interface PaletteAction {
  id: string;
  category: 'Levers' | 'Calculator' | 'Macros' | 'Navigation' | 'Archetypes' | 'Tools' | 'Preferences' | 'Data';
  title: string;
  subtitle?: string;
  keywords: string;
  icon: React.ReactNode;
  badge?: string;
  calcResult?: SipCalculationResult | EmiCalculationResult | FireTargetResult | Rule72Result | InflationErosionResult;
  execute: () => void;
}

const STORAGE_KEY_HISTORY = 'psfi_cmdk_history';

function loadCommandHistory(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_HISTORY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveCommandToHistory(cmd: string) {
  try {
    const clean = cmd.trim();
    if (!clean) return;
    const history = loadCommandHistory().filter((h) => h.toLowerCase() !== clean.toLowerCase());
    history.unshift(clean);
    localStorage.setItem(STORAGE_KEY_HISTORY, JSON.stringify(history.slice(0, 10)));
  } catch {
    // Ignore storage issues
  }
}

// Retro sci-fi Web Audio synthesizer
function playTerminalAudio(type: 'open' | 'click' | 'exec') {
  try {
    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();

    if (type === 'open') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(1320, ctx.currentTime + 0.08);
      gain.gain.setValueAtTime(0.04, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.12);
    } else if (type === 'click') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(440, ctx.currentTime);
      gain.gain.setValueAtTime(0.02, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.03);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.03);
    } else if (type === 'exec') {
      [523.25, 659.25, 783.99].forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.04);
        gain.gain.setValueAtTime(0.05, ctx.currentTime + idx * 0.04);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + idx * 0.04 + 0.15);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime + idx * 0.04);
        osc.stop(ctx.currentTime + idx * 0.04 + 0.15);
      });
    }
  } catch {
    // Ignore audio permission restrictions
  }
}

export const CommandPaletteModal: React.FC<CommandPaletteModalProps> = ({
  isOpen,
  onClose,
  currentPlan,
  onUpdatePlan,
  onSelectPreset,
  activeView,
  onViewChange,
  privacyMode,
  onTogglePrivacy,
  onOpenTour,
  onOpenShare,
  onOpenQR,
  onOpenSandbox,
  baseline,
  onToggleBaseline,
  layoutMode,
  onToggleLayout,
  theme,
  onToggleTheme,
  period,
  onTogglePeriod,
  onOpenStatementParser,
  onExportJSON,
  onExportCSV,
  onPrint,
  onResetDefaults,
  onLoadDemo,
}) => {
  const [query, setQuery] = useState('');
  const [activeTab, setActiveTab] = useState<PaletteCategory>('all');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [history, setHistory] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Play audio and focus input on open
  useEffect(() => {
    if (isOpen) {
      playTerminalAudio('open');
      setQuery('');
      setActiveTab('all');
      setSelectedIndex(0);
      setHistory(loadCommandHistory());
      setTimeout(() => inputRef.current?.focus(), 40);
    }
  }, [isOpen]);

  // Execute macro logic
  const handleExecuteMacro = useCallback(
    (macro: MacroActionType) => {
      if (macro.type === 'raise') {
        onUpdatePlan((prev) => {
          const currentSalary = prev.income.salary;
          const newSalary = macro.percent
            ? Math.round(currentSalary * (1 + macro.percent / 100))
            : currentSalary + (macro.amount || 0);
          return {
            ...prev,
            income: { ...prev.income, salary: newSalary },
          };
        }, macro.label);
      } else if (macro.type === 'boost_sip') {
        onUpdatePlan((prev) => {
          const currentSip = prev.savings.monthlySip;
          const newSip = macro.percent
            ? Math.round(currentSip * (1 + macro.percent / 100))
            : currentSip + (macro.amount || 0);
          return {
            ...prev,
            savings: { ...prev.savings, monthlySip: newSip },
          };
        }, macro.label);
      } else if (macro.type === 'cut_lifestyle') {
        onUpdatePlan((prev) => {
          const currentLifestyle = prev.expenses.lifestyle;
          const newLifestyle = macro.percent
            ? Math.max(0, Math.round(currentLifestyle * (1 - macro.percent / 100)))
            : Math.max(0, currentLifestyle - (macro.amount || 0));
          return {
            ...prev,
            expenses: { ...prev.expenses, lifestyle: newLifestyle },
          };
        }, macro.label);
      } else if (macro.type === 'max_80c') {
        onUpdatePlan(
          (prev) => ({
            ...prev,
            tax: { ...prev.tax, deductions80C: 150000 },
          }),
          'Maximized Section 80C deductions to ₹1,50,000 / yr'
        );
      } else if (macro.type === 'max_nps') {
        onUpdatePlan(
          (prev) => ({
            ...prev,
            tax: { ...prev.tax, deductionsNPS: 50000 },
          }),
          'Maximized Section 80CCD(1B) NPS deductions to ₹50,000 / yr'
        );
      } else if (macro.type === 'zero_debt') {
        onUpdatePlan(
          (prev) => ({
            ...prev,
            debt: { ...prev.debt, cardBalance: 0 },
          }),
          'Cleared all revolving credit card balance to zero'
        );
      }
    },
    [onUpdatePlan]
  );

  // Construct dynamic action database
  const actions = useMemo<PaletteAction[]>(() => {
    const list: PaletteAction[] = [];

    // Check query intelligence parser
    const parsed = parseQuickCommand(query);

    if (parsed) {
      if (parsed.type === 'sip_calc') {
        const { monthlyInvestment, years, annualRatePercent, totalInvested, futureValue, wealthGain } = parsed.result;
        list.push({
          id: 'calc_sip_apply',
          category: 'Calculator',
          title: `SIP: ${formatINR(monthlyInvestment)}/mo × ${years}y @ ${annualRatePercent}%`,
          subtitle: `Invested: ${formatINR(totalInvested)} → Est. Wealth: ${formatINR(futureValue)} (Gain: +${formatINR(wealthGain)})`,
          keywords: 'sip calc compound interest future value returns',
          icon: <Calculator size={15} className="text-solstice" />,
          badge: 'Apply to Vault',
          calcResult: parsed.result,
          execute: () => {
            onUpdatePlan((prev) => ({
              ...prev,
              savings: {
                ...prev.savings,
                monthlySip: monthlyInvestment,
                expectedReturnPercent: annualRatePercent,
              },
            }), `Applied SIP lever: ${formatINR(monthlyInvestment)}/mo @ ${annualRatePercent}%`);
          },
        });
      } else if (parsed.type === 'emi_calc') {
        const { principal, years, annualRatePercent, monthlyEmi, totalInterest, totalRepayment } = parsed.result;
        list.push({
          id: 'calc_emi_apply',
          category: 'Calculator',
          title: `Loan EMI: ${formatINR(monthlyEmi)}/mo (${years}y @ ${annualRatePercent}%)`,
          subtitle: `Principal: ${formatINR(principal)} · Total Interest: ${formatINR(totalInterest)} · Repayment: ${formatINR(totalRepayment)}`,
          keywords: 'emi loan mortgage home interest debt',
          icon: <Coins size={15} className="text-corona" />,
          badge: 'Apply Housing EMI',
          calcResult: parsed.result,
          execute: () => {
            onUpdatePlan((prev) => ({
              ...prev,
              expenses: { ...prev.expenses, housing: monthlyEmi },
              tax: { ...prev.tax, rentPaidMonthly: monthlyEmi },
            }), `Updated Housing EMI to ${formatINR(monthlyEmi)}/mo`);
          },
        });
      } else if (parsed.type === 'fire_calc') {
        const { monthlyExpense, annualExpense, fire25x, lean33x, fat40x } = parsed.result;
        list.push({
          id: 'calc_fire_result',
          category: 'Calculator',
          title: `FIRE Corpus for ${formatINR(monthlyExpense)}/mo: 25x = ${formatINR(fire25x)}`,
          subtitle: `Annual: ${formatINR(annualExpense)} | 25x (4% SWR): ${formatINR(fire25x)} · 33x Lean: ${formatINR(lean33x)} · 40x Fat: ${formatINR(fat40x)}`,
          keywords: 'fire corpus retirement target financial independence',
          icon: <Flame size={15} className="text-solstice" />,
          badge: 'Actuarial Target',
          calcResult: parsed.result,
          execute: () => {
            onViewChange('control');
          },
        });
      } else if (parsed.type === 'rule72_calc') {
        const { annualRatePercent, doublingYears } = parsed.result;
        list.push({
          id: 'calc_rule72_result',
          category: 'Calculator',
          title: `Rule of 72: Money doubles in ${doublingYears} years @ ${annualRatePercent}% CAGR`,
          subtitle: `Exponential wealth velocity metric for compounding investment portfolios`,
          keywords: 'rule72 double doubling time compound velocity',
          icon: <Percent size={15} className="text-quasar" />,
          badge: 'Compounding Law',
          calcResult: parsed.result,
          execute: () => {},
        });
      } else if (parsed.type === 'inf_calc') {
        const { presentAmount, years, inflationPercent, futurePurchasingPower, erodedPercentage } = parsed.result;
        list.push({
          id: 'calc_inf_result',
          category: 'Calculator',
          title: `Inflation Erosion: ${formatINR(presentAmount)} in ${years}y @ ${inflationPercent}% = ${formatINR(futurePurchasingPower)} today`,
          subtitle: `Purchasing power reduced by -${erodedPercentage}% due to cumulative currency inflation`,
          keywords: 'inflation erosion purchasing power real value',
          icon: <ShieldAlert size={15} className="text-corona" />,
          badge: 'Purchasing Power',
          calcResult: parsed.result,
          execute: () => {},
        });
      } else if (parsed.type === 'macro_action') {
        list.push({
          id: `macro_${parsed.macro.type}`,
          category: 'Macros',
          title: parsed.macro.label,
          subtitle: 'Execute instant multi-variable scenario macro across your balance sheet',
          keywords: `macro ${parsed.macro.type} raise boost cut 80c nps debt`,
          icon: <Zap size={15} className="text-solstice" />,
          badge: 'Run Macro',
          execute: () => handleExecuteMacro(parsed.macro),
        });
      } else if (parsed.type === 'set_lever') {
        const { lever, value, label } = parsed;
        list.push({
          id: `lever_${lever}`,
          category: 'Levers',
          title: label,
          subtitle: `Instantly update ${lever} in your active balance sheet`,
          keywords: `${lever} set update change lever`,
          icon: <Sliders size={15} className="text-quasar" />,
          badge: 'Execute Lever',
          execute: () => {
            onUpdatePlan((prev) => {
              const next = { ...prev };
              if (lever === 'salary') next.income = { ...next.income, salary: value };
              else if (lever === 'freelance') next.income = { ...next.income, freelance: value };
              else if (lever === 'sip') next.savings = { ...next.savings, monthlySip: value };
              else if (lever === 'rent') {
                next.expenses = { ...next.expenses, housing: value };
                next.tax = { ...next.tax, rentPaidMonthly: value };
              } else if (lever === 'groceries') next.expenses = { ...next.expenses, groceries: value };
              else if (lever === 'utilities') next.expenses = { ...next.expenses, utilities: value };
              else if (lever === 'lifestyle') next.expenses = { ...next.expenses, lifestyle: value };
              else if (lever === 'cagr') next.savings = { ...next.savings, expectedReturnPercent: value };
              else if (lever === 'stepup') next.savings = { ...next.savings, stepUpSipPercent: value };
              else if (lever === 'inflation') next.savings = { ...next.savings, inflationPercent: value };
              return next;
            }, label);
          },
        });
      }
    }

    // Default Macros when no query typed
    list.push({
      id: 'macro_max_80c',
      category: 'Macros',
      title: 'Maximize Section 80C Deductions (₹1.5 Lakhs)',
      subtitle: 'Set ELSS, EPF, and PPF tax deductions to statutory maximum ₹1,50,000 / yr',
      keywords: '80c tax maximize elss ppf epf deduction',
      icon: <Zap size={15} className="text-solstice" />,
      badge: 'Macro',
      execute: () => handleExecuteMacro({ type: 'max_80c', label: 'Maximized 80C to ₹1,50,000' }),
    });

    list.push({
      id: 'macro_max_nps',
      category: 'Macros',
      title: 'Maximize NPS 80CCD(1B) Deductions (₹50,000)',
      subtitle: 'Add ₹50,000 Tier-1 National Pension System deduction for Old Tax Regime',
      keywords: 'nps 80ccd 80ccd1b pension deduction tax',
      icon: <Zap size={15} className="text-quasar" />,
      badge: 'Macro',
      execute: () => handleExecuteMacro({ type: 'max_nps', label: 'Maximized NPS to ₹50,000' }),
    });

    list.push({
      id: 'macro_zero_debt',
      category: 'Macros',
      title: 'Zero Out Revolving Credit Card Debt',
      subtitle: 'Instantly clear high-interest card balance to restore full positive cashflow',
      keywords: 'zero debt clear debt pay credit card payoff',
      icon: <Zap size={15} className="text-nebula" />,
      badge: 'Macro',
      execute: () => handleExecuteMacro({ type: 'zero_debt', label: 'Cleared credit card debt to ₹0' }),
    });

    // Navigation Actions
    list.push({
      id: 'nav_control',
      category: 'Navigation',
      title: 'Switch to Control Center Cockpit',
      subtitle: 'Tactile sliders, cashflow allocation & actuarial stress tests',
      keywords: 'control center sliders cockpit cashflow main',
      icon: <Sliders size={15} className={activeView === 'control' ? 'text-nebula' : 'text-muted'} />,
      badge: activeView === 'control' ? 'Current' : 'View',
      execute: () => onViewChange('control'),
    });

    list.push({
      id: 'nav_terminal',
      category: 'Navigation',
      title: 'Switch to Wealth Terminal',
      subtitle: 'Stock market P&L ticker, GAAP operating statement & 12M trajectory',
      keywords: 'wealth terminal market pnl ticker statement valuation stocks',
      icon: <TrendingUp size={15} className={activeView === 'terminal' ? 'text-nebula' : 'text-muted'} />,
      badge: activeView === 'terminal' ? 'Current' : 'View',
      execute: () => onViewChange('terminal'),
    });

    list.push({
      id: 'action_tour',
      category: 'Navigation',
      title: 'Start Interactive Guided Tour',
      subtitle: '8-step holographic instructor with virtual mouse walkthrough',
      keywords: 'tour guide tutorial walkthrough mouse help demo',
      icon: <Compass size={15} className="text-quasar" />,
      badge: 'Interactive',
      execute: () => onOpenTour(),
    });

    // Archetype Models
    PLAN_PRESETS.forEach((preset) => {
      const isCurrent =
        preset.plan.income.salary === currentPlan.income.salary &&
        preset.plan.savings.monthlySip === currentPlan.savings.monthlySip;

      const iconMap: Record<string, React.ReactNode> = {
        starter: <Briefcase size={15} className="text-quasar" />,
        family: <Home size={15} className="text-pulsar" />,
        fire: <Flame size={15} className="text-solstice" />,
        debt_crush: <ShieldAlert size={15} className="text-corona" />,
      };

      list.push({
        id: `preset_${preset.id}`,
        category: 'Archetypes',
        title: `Load Archetype: ${preset.name}`,
        subtitle: `${preset.tagline} (Inflow: +${formatINR(preset.plan.income.salary)} | SIP: ${formatINR(preset.plan.savings.monthlySip)}/mo)`,
        keywords: `archetype preset scenario ${preset.id} ${preset.name} ${preset.badge}`,
        icon: iconMap[preset.id] || <Sparkles size={15} className="text-quasar" />,
        badge: isCurrent ? 'Active' : preset.badge,
        execute: () => onSelectPreset(preset.plan, preset.name),
      });
    });

    // Tools & Scenarios
    if (onOpenStatementParser) {
      list.push({
        id: 'tool_statement_parser',
        category: 'Tools',
        title: 'Ingest Financial Statements & Documents',
        subtitle: 'Parse Mutual Fund CAS, Bank Statement, Credit Card, or Payslip in local memory',
        keywords: 'statement ingest parse pdf cas bank statement payslip salary slip credit card cams kfintech zerodha import',
        icon: <FileText size={15} className="text-nebula" />,
        badge: '100% Private',
        execute: () => onOpenStatementParser(),
      });
    }

    list.push({
      id: 'tool_share',
      category: 'Tools',
      title: 'Generate Shareable Financial Health Card',
      subtitle: 'Export an anonymized 16:9, 1:1, or 9:16 social card to PNG or clipboard',
      keywords: 'share social card scorecard export image health png',
      icon: <Share2 size={15} className="text-pulsar" />,
      badge: 'Card',
      execute: () => onOpenShare(),
    });

    list.push({
      id: 'tool_qr',
      category: 'Tools',
      title: 'Cross-Device QR Vault Beam',
      subtitle: 'Encrypted P2P scan & sync without cloud servers or telemetry',
      keywords: 'qr beam sync p2p transfer cross device camera mobile',
      icon: <QrCode size={15} className="text-quasar" />,
      badge: 'Zero-Cloud',
      execute: () => onOpenQR(),
    });

    list.push({
      id: 'tool_sandbox',
      category: 'Tools',
      title: 'What-If Scenario Sandbox',
      subtitle: 'Simulate annual appraisals, windfalls, and lifestyle creep',
      keywords: 'whatif sandbox simulate raise bonus inflation windfall scenario',
      icon: <Sparkles size={15} className="text-solstice" />,
      badge: 'Simulate',
      execute: () => onOpenSandbox(),
    });

    list.push({
      id: 'tool_baseline',
      category: 'Tools',
      title: baseline ? 'Clear Comparison Baseline' : 'Pin Baseline Snapshot',
      subtitle: baseline ? 'Remove pinned comparison deltas' : 'Freeze current figures to calculate variance as you tweak',
      keywords: 'baseline pin snapshot delta compare variance diff',
      icon: baseline ? <PinOff size={15} className="text-solstice" /> : <Pin size={15} className="text-muted" />,
      badge: baseline ? 'Pinned' : 'Snapshot',
      execute: () => onToggleBaseline(),
    });

    // Preferences & Toggles
    list.push({
      id: 'pref_privacy',
      category: 'Preferences',
      title: privacyMode ? 'Disable Privacy Mask' : 'Enable Privacy Mask',
      subtitle: privacyMode ? 'Unblur monetary figures and salary numbers' : 'Censor sensitive amounts for public co-working spaces',
      keywords: 'privacy mask blur hide numbers sensitive figures',
      icon: privacyMode ? <EyeOff size={15} className="text-corona" /> : <Eye size={15} className="text-muted" />,
      badge: privacyMode ? 'Masked' : 'Normal',
      execute: () => onTogglePrivacy(),
    });

    list.push({
      id: 'pref_period',
      category: 'Preferences',
      title: `Switch View Frequency: ${period === 'monthly' ? 'Annualized View' : 'Monthly View'}`,
      subtitle: `Currently viewing figures on a ${period} basis`,
      keywords: 'frequency monthly annual yearly period timescale',
      icon: <Calendar size={15} className="text-solstice" />,
      badge: period.toUpperCase(),
      execute: () => onTogglePeriod(),
    });

    list.push({
      id: 'pref_layout',
      category: 'Preferences',
      title: `Toggle Display Density: ${layoutMode === 'mobile' ? 'Desktop View' : 'Compact Mobile View'}`,
      subtitle: `Current density: ${layoutMode.toUpperCase()} display mode`,
      keywords: 'density layout mobile desktop compact view',
      icon: layoutMode === 'mobile' ? <Smartphone size={15} className="text-nebula" /> : <Monitor size={15} className="text-pulsar" />,
      badge: layoutMode.toUpperCase(),
      execute: () => onToggleLayout(),
    });

    list.push({
      id: 'pref_theme',
      category: 'Preferences',
      title: `Switch Theme: ${theme === 'dark' ? 'Light Mode' : 'Dark Mode'}`,
      subtitle: `Currently using ${theme} color palette`,
      keywords: 'theme dark light appearance mode colors',
      icon: theme === 'dark' ? <Sun size={15} className="text-solstice" /> : <Moon size={15} className="text-pulsar" />,
      badge: theme.toUpperCase(),
      execute: () => onToggleTheme(),
    });

    // Data & Backups
    list.push({
      id: 'data_json',
      category: 'Data',
      title: 'Export Vault Backup (JSON)',
      subtitle: 'Download complete offline state for instant restoration',
      keywords: 'export backup json save download file vault',
      icon: <Download size={15} className="text-muted" />,
      badge: 'Offline',
      execute: () => onExportJSON(),
    });

    list.push({
      id: 'data_csv',
      category: 'Data',
      title: 'Export Projections Matrix (CSV)',
      subtitle: 'Download monthly compounding matrix for Excel or Google Sheets',
      keywords: 'export csv spreadsheet excel table matrix download',
      icon: <FileSpreadsheet size={15} className="text-muted" />,
      badge: 'Spreadsheet',
      execute: () => onExportCSV(),
    });

    list.push({
      id: 'data_print',
      category: 'Data',
      title: 'Print Executive Statement (PDF)',
      subtitle: '1-page formatted financial summary for personal records or visa applications',
      keywords: 'print pdf statement report export document',
      icon: <Printer size={15} className="text-muted" />,
      badge: 'Print',
      execute: () => onPrint(),
    });

    list.push({
      id: 'data_demo',
      category: 'Data',
      title: 'Load Demo Vault Profile',
      subtitle: 'Pre-populate seeded Indian tech professional profile (₹1.4L salary, ₹40k SIP)',
      keywords: 'demo sample seeded load profile test',
      icon: <Sparkles size={15} className="text-solstice" />,
      badge: 'Demo',
      execute: () => onLoadDemo(),
    });

    list.push({
      id: 'data_reset',
      category: 'Data',
      title: 'Reset Vault to Defaults',
      subtitle: 'Clear all cashflow sliders and start from a blank zero slate',
      keywords: 'reset clear defaults blank slate scratch',
      icon: <RotateCcw size={15} className="text-corona" />,
      badge: 'Reset',
      execute: () => onResetDefaults(),
    });

    return list;
  }, [
    query,
    currentPlan,
    activeView,
    privacyMode,
    baseline,
    layoutMode,
    theme,
    period,
    onViewChange,
    onOpenTour,
    onSelectPreset,
    onOpenShare,
    onOpenQR,
    onOpenSandbox,
    onToggleBaseline,
    onTogglePrivacy,
    onTogglePeriod,
    onToggleLayout,
    onToggleTheme,
    onExportJSON,
    onExportCSV,
    onPrint,
    onLoadDemo,
    onResetDefaults,
    onUpdatePlan,
    handleExecuteMacro,
  ]);

  // Filter actions based on search query and category tab
  const filteredActions = useMemo(() => {
    let result = actions;

    // Filter by tab
    if (activeTab === 'calc') {
      result = result.filter((a) => a.category === 'Calculator');
    } else if (activeTab === 'macro') {
      result = result.filter((a) => a.category === 'Macros' || a.category === 'Levers');
    } else if (activeTab === 'presets') {
      result = result.filter((a) => a.category === 'Archetypes');
    } else if (activeTab === 'tools') {
      result = result.filter(
        (a) => a.category === 'Tools' || a.category === 'Navigation' || a.category === 'Data' || a.category === 'Preferences'
      );
    }

    const q = query.trim().toLowerCase();
    if (!q) return result;

    return result.filter((action) => {
      if (
        action.category === 'Levers' ||
        action.category === 'Calculator' ||
        action.category === 'Macros'
      ) {
        return true;
      }
      return (
        action.title.toLowerCase().includes(q) ||
        (action.subtitle && action.subtitle.toLowerCase().includes(q)) ||
        action.keywords.toLowerCase().includes(q)
      );
    });
  }, [actions, query, activeTab]);

  // Handle keyboard navigation inside palette
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      playTerminalAudio('click');
      setSelectedIndex((prev) => (prev + 1) % Math.max(1, filteredActions.length));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (!query && selectedIndex === 0 && history.length > 0) {
        setQuery(history[0]);
        return;
      }
      playTerminalAudio('click');
      setSelectedIndex((prev) => (prev - 1 + filteredActions.length) % Math.max(1, filteredActions.length));
    } else if (e.key === 'Tab') {
      e.preventDefault();
      const tabs: PaletteCategory[] = ['all', 'calc', 'macro', 'presets', 'tools'];
      const nextIdx = (tabs.indexOf(activeTab) + 1) % tabs.length;
      setActiveTab(tabs[nextIdx]);
      setSelectedIndex(0);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const selected = filteredActions[selectedIndex];
      if (selected) {
        playTerminalAudio('exec');
        if (query.trim()) saveCommandToHistory(query.trim());
        selected.execute();
        onClose();
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  };

  // Keep selected index within bounds
  useEffect(() => {
    if (selectedIndex >= filteredActions.length) {
      setSelectedIndex(0);
    }
  }, [filteredActions.length, selectedIndex]);

  // Scroll active item into view
  useEffect(() => {
    const activeEl = listRef.current?.querySelector('.palette-item-selected');
    if (activeEl && typeof activeEl.scrollIntoView === 'function') {
      activeEl.scrollIntoView({ block: 'nearest' });
    }
  }, [selectedIndex]);

  if (!isOpen) return null;

  return (
    <div
      className="palette-backdrop"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Terminal Command Omnibar"
    >
      <div className="palette-modal" onClick={(e) => e.stopPropagation()}>
        {/* Omnibar Header Bar */}
        <div className="palette-input-wrap">
          <Terminal size={17} className="palette-terminal-icon text-quasar" />
          <input
            ref={inputRef}
            type="text"
            className="palette-input font-mono"
            placeholder="Type command, math or macro e.g. 'fire 60k', 'emi 40L 15y', 'raise 15%', 'double 12%'..."
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            onKeyDown={handleKeyDown}
          />
          {query ? (
            <button
              type="button"
              className="palette-clear-btn"
              onClick={() => {
                setQuery('');
                setSelectedIndex(0);
                inputRef.current?.focus();
              }}
              aria-label="Clear input"
            >
              ×
            </button>
          ) : (
            <span className="palette-kbd font-mono">ESC to close</span>
          )}
        </div>

        {/* Filter Tabs Bar */}
        <div className="palette-tabs-bar font-mono text-[11px]">
          <button
            type="button"
            className={`palette-tab-btn ${activeTab === 'all' ? 'tab-btn-active' : ''}`}
            onClick={() => {
              setActiveTab('all');
              setSelectedIndex(0);
            }}
          >
            All Commands
          </button>
          <button
            type="button"
            className={`palette-tab-btn ${activeTab === 'calc' ? 'tab-btn-active' : ''}`}
            onClick={() => {
              setActiveTab('calc');
              setSelectedIndex(0);
            }}
          >
            <Calculator size={11} className="inline mr-1 text-solstice" />
            Calculators
          </button>
          <button
            type="button"
            className={`palette-tab-btn ${activeTab === 'macro' ? 'tab-btn-active' : ''}`}
            onClick={() => {
              setActiveTab('macro');
              setSelectedIndex(0);
            }}
          >
            <Zap size={11} className="inline mr-1 text-quasar" />
            Macros & Levers
          </button>
          <button
            type="button"
            className={`palette-tab-btn ${activeTab === 'presets' ? 'tab-btn-active' : ''}`}
            onClick={() => {
              setActiveTab('presets');
              setSelectedIndex(0);
            }}
          >
            <Sparkles size={11} className="inline mr-1 text-pulsar" />
            Archetypes
          </button>
          <button
            type="button"
            className={`palette-tab-btn ${activeTab === 'tools' ? 'tab-btn-active' : ''}`}
            onClick={() => {
              setActiveTab('tools');
              setSelectedIndex(0);
            }}
          >
            Tools & Views
          </button>
        </div>

        {/* Recent History Quick-Chips (Shown when input is empty and history exists) */}
        {!query && history.length > 0 && (
          <div className="palette-history-strip font-mono text-[11px]">
            <div className="flex-align gap-1 text-muted text-[10px]">
              <History size={11} />
              <span>RECENT:</span>
            </div>
            <div className="palette-history-chips">
              {history.slice(0, 4).map((h) => (
                <button
                  key={h}
                  type="button"
                  className="palette-chip-btn"
                  onClick={() => {
                    setQuery(h);
                    inputRef.current?.focus();
                  }}
                >
                  {h}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Results List */}
        <div className="palette-list" ref={listRef}>
          {filteredActions.length === 0 ? (
            <div className="palette-empty-state font-mono">
              <Search size={24} className="text-muted opacity-40 mb-2" />
              <p className="text-sm text-primary m-0">No matching terminal commands found</p>
              <p className="text-xs text-muted m-0 mt-1">
                Try typing <code>fire 60k</code>, <code>emi 40L 15y 8.5%</code>, <code>raise 15%</code>, <code>double 12%</code>, or <code>zero debt</code>
              </p>
            </div>
          ) : (
            filteredActions.map((action, idx) => {
              const isSelected = idx === selectedIndex;
              return (
                <div
                  key={action.id}
                  className={`palette-item ${isSelected ? 'palette-item-selected' : ''}`}
                  onClick={() => {
                    playTerminalAudio('exec');
                    if (query.trim()) saveCommandToHistory(query.trim());
                    action.execute();
                    onClose();
                  }}
                  onMouseEnter={() => setSelectedIndex(idx)}
                >
                  <div className="palette-item-icon-box">{action.icon}</div>

                  <div className="palette-item-content">
                    <div className="flex-align gap-2">
                      <span className="palette-item-title font-semibold text-xs">{action.title}</span>
                      {action.badge && (
                        <span className="palette-badge font-mono">{action.badge}</span>
                      )}
                    </div>
                    {action.subtitle && (
                      <p className="palette-item-subtitle font-mono text-[11px] text-muted m-0">
                        {action.subtitle}
                      </p>
                    )}
                  </div>

                  <div className="palette-item-trailing">
                    {isSelected ? (
                      <div className="palette-enter-hint font-mono text-[10px] flex-align gap-1 text-quasar">
                        <span>Select</span>
                        <CornerDownLeft size={10} />
                      </div>
                    ) : (
                      <ArrowRight size={12} className="text-muted opacity-30" />
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Quick Helper Footer */}
        <div className="palette-footer flex-between items-center font-mono text-[11px] text-muted">
          <div className="flex-align gap-3">
            <span><kbd>↑</kbd><kbd>↓</kbd> navigate</span>
            <span><kbd>tab</kbd> categories</span>
            <span><kbd>↵</kbd> execute</span>
            <span><kbd>esc</kbd> dismiss</span>
          </div>
          <span className="text-[10px] text-muted opacity-60">
            psfi omnibar intelligence · client-side
          </span>
        </div>
      </div>
    </div>
  );
};
