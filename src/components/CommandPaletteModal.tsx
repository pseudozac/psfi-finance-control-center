import React, { useState, useEffect, useRef, useMemo } from 'react';
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
} from 'lucide-react';
import { PLAN_PRESETS, formatINR } from '../lib/finance';
import type { FinancePlan } from '../types/finance';
import { parseQuickCommand, type SipCalculationResult } from '../lib/cmdKParser';

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
  onExportJSON: () => void;
  onExportCSV: () => void;
  onPrint: () => void;
  onResetDefaults: () => void;
  onLoadDemo: () => void;
}

interface PaletteAction {
  id: string;
  category: 'Levers' | 'Calculator' | 'Navigation' | 'Archetypes' | 'Tools' | 'Preferences' | 'Data';
  title: string;
  subtitle?: string;
  keywords: string;
  icon: React.ReactNode;
  badge?: string;
  calcResult?: SipCalculationResult;
  execute: () => void;
}

// Retro sci-fi Web Audio synthesizer
function playTerminalAudio(type: 'open' | 'click' | 'exec') {
  try {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
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
  onExportJSON,
  onExportCSV,
  onPrint,
  onResetDefaults,
  onLoadDemo,
}) => {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Play audio and focus input on open
  useEffect(() => {
    if (isOpen) {
      playTerminalAudio('open');
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 40);
    }
  }, [isOpen]);

  // Construct dynamic action database
  const actions = useMemo<PaletteAction[]>(() => {
    const list: PaletteAction[] = [];

    // 1. Check if user typed a dynamic lever or SIP calculation
    const parsed = parseQuickCommand(query);

    if (parsed?.type === 'sip_calc') {
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
    } else if (parsed?.type === 'set_lever') {
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
            }
            else if (lever === 'groceries') next.expenses = { ...next.expenses, groceries: value };
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

    // 2. Navigation Actions
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

    // 3. Archetype Models
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

    // 4. Tools & Scenarios
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

    // 5. Preferences & Toggles
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

    // 6. Data & Backups
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
  ]);

  // Filter actions based on search query
  const filteredActions = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return actions;

    // Direct parser matches already placed at top of actions array
    return actions.filter((action) => {
      if (action.category === 'Levers' || action.category === 'Calculator') return true;
      return (
        action.title.toLowerCase().includes(q) ||
        (action.subtitle && action.subtitle.toLowerCase().includes(q)) ||
        action.keywords.toLowerCase().includes(q)
      );
    });
  }, [actions, query]);

  // Handle keyboard navigation inside palette
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      playTerminalAudio('click');
      setSelectedIndex((prev) => (prev + 1) % Math.max(1, filteredActions.length));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      playTerminalAudio('click');
      setSelectedIndex((prev) => (prev - 1 + filteredActions.length) % Math.max(1, filteredActions.length));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const selected = filteredActions[selectedIndex];
      if (selected) {
        playTerminalAudio('exec');
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
            placeholder="Type a command, scenario or math (e.g. 'fire', 'sip 30k 12%', 'salary 2L', 'tour')..."
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

        {/* Results List */}
        <div className="palette-list" ref={listRef}>
          {filteredActions.length === 0 ? (
            <div className="palette-empty-state font-mono">
              <Search size={24} className="text-muted opacity-40 mb-2" />
              <p className="text-sm text-primary m-0">No matching terminal commands found</p>
              <p className="text-xs text-muted m-0 mt-1">
                Try typing <code>salary 1.5L</code>, <code>sip 40k 15y 12%</code>, <code>fire</code>, or <code>tour</code>
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
            <span><kbd>↵</kbd> execute</span>
            <span><kbd>esc</kbd> dismiss</span>
          </div>
          <span className="text-[10px] text-muted opacity-60">
            psfi terminal omnibar · client-side
          </span>
        </div>
      </div>
    </div>
  );
};
