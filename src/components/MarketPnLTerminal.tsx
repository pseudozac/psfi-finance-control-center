import React, { useState, useMemo } from 'react';
import {
  TrendingUp,
  Activity,
  ArrowUpRight,
  ArrowDownRight,
  Lightbulb,
  Zap,
  BarChart3,
  ArrowLeft,
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceLine,
} from 'recharts';
import type { FinancePlan, FinanceSummary } from '../types/finance';
import { InfoTooltip } from './InfoTooltip';

export type PnLTimeframe = '1D' | '1W' | '1M' | '3M' | '6M' | '12M';
export type PnLChartMode = 'pnl' | 'cashflow' | 'valuation';

interface MarketPnLTerminalProps {
  plan: FinancePlan;
  summary: FinanceSummary;
  onReturnToDashboard: () => void;
}

export const MarketPnLTerminal: React.FC<MarketPnLTerminalProps> = ({
  plan,
  summary,
  onReturnToDashboard,
}) => {
  const [timeframe, setTimeframe] = useState<PnLTimeframe>('1M');
  const [chartMode, setChartMode] = useState<PnLChartMode>('pnl');
  const [showTerminalTutorial, setShowTerminalTutorial] = useState(false);
  const [tutorialStep, setTutorialStep] = useState(0);

  // Financial calculations
  const monthlyInflow = summary.monthlyIncome;
  const monthlyOutflow = summary.monthlyExpenses;
  const monthlySurplus = summary.monthlySurplus;
  const isGain = monthlySurplus >= 0;
  const savingsRate = summary.savingsRatePercent;
  const dailyBurn = Math.round(monthlyOutflow / 30);
  const annualSurplus = monthlySurplus * 12;

  const currentSavings = plan.savings.emergencyFundBalance;
  const salary = plan.income.salary;
  const freelance = plan.income.freelance;
  const otherIncome = plan.income.other;
  const housing = plan.expenses.housing;
  const groceries = plan.expenses.groceries;
  const utilities = plan.expenses.utilities;
  const transport = plan.expenses.transport;
  const lifestyle = plan.expenses.lifestyle;
  const insurance = plan.expenses.insurance;
  const emi = plan.debt.monthlyPayment;
  const customExpenses = plan.expenses.custom || [];
  const stepUpRate = plan.savings.stepUpSipPercent;
  const investmentRate = plan.savings.expectedReturnPercent;

  // Generate granular stock-market style time-series points based on the active timeframe
  const timeSeriesData = useMemo(() => {
    switch (timeframe) {
      case '1D': {
        // 30-day daily breakdown showing payday spikes, rent/EMI drop days, and daily living burn
        const days = 30;
        let cumulative = currentSavings;
        return Array.from({ length: days }, (_, i) => {
          const dayNum = i + 1;
          let dayInflow = 0;
          let dayOutflow = dailyBurn;

          // Salary lands on Day 1
          if (dayNum === 1) {
            dayInflow += salary;
          }
          // Freelance lands mid-month (Day 15)
          if (dayNum === 15) {
            dayInflow += freelance;
          }
          // Housing deducted on Day 2
          if (dayNum === 2) {
            dayOutflow += housing;
          }
          // EMI deducted on Day 5
          if (dayNum === 5) {
            dayOutflow += emi;
          }

          const netPnL = dayInflow - dayOutflow;
          cumulative += netPnL;

          return {
            label: `Day ${dayNum}`,
            shortLabel: `D${dayNum}`,
            inflow: dayInflow,
            outflow: dayOutflow,
            netPnL,
            cumulativeValuation: cumulative,
          };
        });
      }

      case '1W': {
        // 8 weeks trajectory
        const weeks = 8;
        const weeklyInflow = Math.round(monthlyInflow / 4.33);
        const weeklyOutflow = Math.round(monthlyOutflow / 4.33);
        let cumulative = currentSavings;

        return Array.from({ length: weeks }, (_, i) => {
          // Add slight realistic variability +/- 4%
          const variance = 1 + ((i % 3) - 1) * 0.04;
          const adjustedOutflow = Math.round(weeklyOutflow * variance);
          const net = weeklyInflow - adjustedOutflow;
          cumulative += net;
          return {
            label: `Week ${i + 1}`,
            shortLabel: `W${i + 1}`,
            inflow: weeklyInflow,
            outflow: adjustedOutflow,
            netPnL: net,
            cumulativeValuation: cumulative,
          };
        });
      }

      case '1M': {
        // Past 6 months to forward 6 months (12 months cycle)
        const months = 12;
        let cumulative = currentSavings;
        return Array.from({ length: months }, (_, i) => {
          const mNum = i + 1;
          // Apply annual step-up compounding proportionally
          const stepUpMultiplier = 1 + (stepUpRate / 100) * (i / 12);
          const currentInflow = Math.round(monthlyInflow * stepUpMultiplier);
          const currentOutflow = Math.round(monthlyOutflow * (1 + 0.06 * (i / 12))); // 6% lifestyle inflation
          const net = currentInflow - currentOutflow;
          cumulative += net;

          const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
          return {
            label: `Month ${mNum} (${monthNames[i]})`,
            shortLabel: monthNames[i],
            inflow: currentInflow,
            outflow: currentOutflow,
            netPnL: net,
            cumulativeValuation: cumulative,
          };
        });
      }

      case '3M': {
        // 4 Quarters: Q1, Q2, Q3, Q4
        let cumulative = currentSavings;
        return ['Q1', 'Q2', 'Q3', 'Q4'].map((q, idx) => {
          const qInflow = Math.round(monthlyInflow * 3 * (1 + (stepUpRate / 100) * (idx / 4)));
          const qOutflow = Math.round(monthlyOutflow * 3);
          const net = qInflow - qOutflow;
          cumulative += net;
          return {
            label: `Fiscal ${q}`,
            shortLabel: q,
            inflow: qInflow,
            outflow: qOutflow,
            netPnL: net,
            cumulativeValuation: cumulative,
          };
        });
      }

      case '6M': {
        // H1 and H2
        let cumulative = currentSavings;
        return ['H1 (First Half)', 'H2 (Second Half)'].map((h, idx) => {
          const hInflow = Math.round(monthlyInflow * 6 * (1 + (stepUpRate / 100) * (idx / 2)));
          const hOutflow = Math.round(monthlyOutflow * 6);
          const net = hInflow - hOutflow;
          cumulative += net;
          return {
            label: h,
            shortLabel: idx === 0 ? 'H1' : 'H2',
            inflow: hInflow,
            outflow: hOutflow,
            netPnL: net,
            cumulativeValuation: cumulative,
          };
        });
      }

      case '12M': {
        // 5 Years Trajectory (Annual blocks)
        let cumulative = currentSavings;
        return [1, 2, 3, 4, 5].map((year) => {
          const growthFactor = Math.pow(1 + stepUpRate / 100, year - 1);
          const yInflow = Math.round(monthlyInflow * 12 * growthFactor);
          const yOutflow = Math.round(monthlyOutflow * 12 * Math.pow(1.06, year - 1));
          const net = yInflow - yOutflow;
          cumulative += net + Math.round(cumulative * (investmentRate / 100));
          return {
            label: `Year ${year}`,
            shortLabel: `Y${year}`,
            inflow: yInflow,
            outflow: yOutflow,
            netPnL: net,
            cumulativeValuation: cumulative,
          };
        });
      }

      default:
        return [];
    }
  }, [timeframe, currentSavings, salary, freelance, housing, emi, stepUpRate, investmentRate, monthlyInflow, monthlyOutflow, dailyBurn]);

  // Terminal Tutorial Steps
  const TERMINAL_TUTORIAL_STEPS = [
    {
      title: 'Stock Market Ticker & Live P&L',
      badge: '1. TICKER BASICS',
      text: 'Just like AAPL or RELIANCE on the stock exchange, your personal financial machine has a Net Gain/Loss P&L. A positive green surplus means your personal enterprise generates free cashflow!',
      target: 'terminal-ticker',
    },
    {
      title: 'Dynamic Timeframe Switches (1D to 12M)',
      badge: '2. TIMEFRAMES',
      text: 'Toggle between Daily (1D) burn, Weekly (1W) pace, Monthly (1M) compounding, Quarterly (3M) earnings, and Annual (12M) wealth valuation to detect dangerous cash leaks.',
      target: 'terminal-timeframes',
    },
    {
      title: 'Net P&L vs Inflow/Outflow Waterfall',
      badge: '3. CHART MODES',
      text: 'Switch between the Net P&L Area Chart (Green for surplus gain, Red for cash deficit), Inflow vs Outflow Waterfall, or the Cumulative Valuation curve.',
      target: 'terminal-chart-controls',
    },
    {
      title: 'Corporate Financial Statement',
      badge: '4. AUDIT MATRIX',
      text: 'Review Top-Line Revenue, Operating Living Expenses, COGS, and Discretionary Burn. Learn how high operating margins protect your emergency runway.',
      target: 'terminal-financial-statement',
    },
  ];

  return (
    <div className="terminal-container">
      {/* Top Breadcrumb & Action Bar */}
      <div className="terminal-header-bar">
        <div className="flex-align gap-3">
          <button
            type="button"
            className="btn-secondary font-mono text-xs flex-align gap-1.5"
            onClick={onReturnToDashboard}
            title="Return to Core Dashboard"
          >
            <ArrowLeft size={13} />
            <span>Control Center</span>
          </button>
          <span className="text-muted text-xs">/</span>
          <div className="terminal-ticker-tag font-mono">
            <span className="ticker-symbol">$PSFI.VAULT</span>
            <span className="ticker-exchange">· PERSONAL CAPITAL INDEX</span>
          </div>
        </div>

        <div className="flex-align gap-2">
          <button
            type="button"
            className={`terminal-tour-btn font-mono text-xs ${showTerminalTutorial ? 'active' : ''}`}
            onClick={() => setShowTerminalTutorial((prev) => !prev)}
          >
            <Lightbulb size={13} className="text-solstice" />
            <span>{showTerminalTutorial ? 'Close Tutorial' : 'P&L Terminal Guide'}</span>
          </button>
        </div>
      </div>

      {/* Terminal Interactive Tutorial Banner (if active) */}
      {showTerminalTutorial && (
        <div className="terminal-tutorial-card">
          <div className="flex-between items-center">
            <div className="flex-align gap-2">
              <span className="tag-pill tag-quasar font-mono text-xs">
                {TERMINAL_TUTORIAL_STEPS[tutorialStep].badge}
              </span>
              <h4 className="font-semibold text-sm m-0">
                {TERMINAL_TUTORIAL_STEPS[tutorialStep].title}
              </h4>
            </div>
            <div className="flex-align gap-2 font-mono text-xs text-muted">
              <span>{tutorialStep + 1} of {TERMINAL_TUTORIAL_STEPS.length}</span>
              <button
                type="button"
                className="tour-close-btn"
                onClick={() => setShowTerminalTutorial(false)}
              >
                ✕
              </button>
            </div>
          </div>

          <p className="terminal-tutorial-desc text-xs mt-2">
            {TERMINAL_TUTORIAL_STEPS[tutorialStep].text}
          </p>

          <div className="flex-between items-center mt-3 pt-2 border-t border-subtle">
            <div className="flex-align gap-1.5">
              {TERMINAL_TUTORIAL_STEPS.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  className={`tour-dot ${i === tutorialStep ? 'tour-dot-active' : ''}`}
                  onClick={() => setTutorialStep(i)}
                />
              ))}
            </div>
            <div className="flex-align gap-2">
              {tutorialStep > 0 && (
                <button
                  type="button"
                  className="btn-secondary text-xs px-2.5 py-1"
                  onClick={() => setTutorialStep((p) => p - 1)}
                >
                  Prev
                </button>
              )}
              {tutorialStep < TERMINAL_TUTORIAL_STEPS.length - 1 ? (
                <button
                  type="button"
                  className="btn-primary text-xs px-3 py-1 font-mono"
                  onClick={() => setTutorialStep((p) => p + 1)}
                >
                  Next Guide Tip →
                </button>
              ) : (
                <button
                  type="button"
                  className="btn-primary text-xs px-3 py-1 font-mono"
                  onClick={() => setShowTerminalTutorial(false)}
                >
                  Got It! Close Guide
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Stock Ticker Hero & Telemetry Strip */}
      <section className="terminal-hero-card" id="terminal-ticker">
        <div className="terminal-ticker-row">
          <div>
            <div className="flex-align gap-2">
              <span className="font-mono text-xs text-muted uppercase tracking-wider">
                Monthly Net Cashflow P&L
              </span>
              <InfoTooltip
                title="Personal Free Cashflow (P&L)"
                explanation="The bottom-line capital left after meeting all living expenses, housing, debt obligations, and discretionary outlays. Positive surplus compounds your net worth."
                formula="Net P&L = Total Monthly Inflow - Total Monthly Outflow"
                benchmark="Positive green surplus above 20% of income is institutional grade."
              />
            </div>
            <div className="terminal-price-row flex-align gap-3 mt-1">
              <h2 className={`terminal-price font-mono font-bold ${isGain ? 'text-nebula' : 'text-corona'}`}>
                {isGain ? '+' : '-'}₹{Math.abs(monthlySurplus).toLocaleString('en-IN')}
                <span className="text-xs font-normal text-muted"> / mo</span>
              </h2>

              <div className={`terminal-delta-pill font-mono text-xs flex-align gap-1 ${isGain ? 'pill-gain' : 'pill-loss'}`}>
                {isGain ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                <span>
                  {isGain ? '+' : ''}{savingsRate.toFixed(1)}% Operating Margin
                </span>
              </div>
            </div>
          </div>

          {/* Quick Metrics Matrix */}
          <div className="terminal-stats-matrix">
            <div className="terminal-stat-box">
              <span className="terminal-stat-label font-mono">ANNUALIZED P&L</span>
              <span className={`terminal-stat-val font-mono ${annualSurplus >= 0 ? 'text-nebula' : 'text-corona'}`}>
                {annualSurplus >= 0 ? '+' : ''}₹{annualSurplus.toLocaleString('en-IN')}
              </span>
            </div>

            <div className="terminal-stat-box">
              <span className="terminal-stat-label font-mono">DAILY BURN RATE</span>
              <span className="terminal-stat-val font-mono text-corona">
                -₹{dailyBurn.toLocaleString('en-IN')} / day
              </span>
            </div>

            <div className="terminal-stat-box">
              <span className="terminal-stat-label font-mono">RESERVE VALUATION</span>
              <span className="terminal-stat-val font-mono text-pulsar">
                ₹{currentSavings.toLocaleString('en-IN')}
              </span>
            </div>

            <div className="terminal-stat-box">
              <span className="terminal-stat-label font-mono">SAVINGS BENCHMARK</span>
              <span className="terminal-stat-val font-mono text-solstice">
                {savingsRate >= 20 ? 'Target Achieved (20%+)' : 'Needs Attention (<20%)'}
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Timeframe & Chart Controls Bar */}
      <div className="terminal-controls-bar" id="terminal-timeframes">
        {/* Timeframe selector (1D, 1W, 1M, 3M, 6M, 12M) */}
        <div className="timeframe-pill-group" role="group" aria-label="Select timeframe">
          {(['1D', '1W', '1M', '3M', '6M', '12M'] as PnLTimeframe[]).map((tf) => (
            <button
              key={tf}
              type="button"
              className={`timeframe-btn font-mono ${timeframe === tf ? 'timeframe-active' : ''}`}
              onClick={() => setTimeframe(tf)}
            >
              {tf}
            </button>
          ))}
        </div>

        {/* Chart View Modes */}
        <div className="chart-mode-pill-group" id="terminal-chart-controls">
          <button
            type="button"
            className={`chart-mode-btn font-mono ${chartMode === 'pnl' ? 'mode-active' : ''}`}
            onClick={() => setChartMode('pnl')}
          >
            <TrendingUp size={12} />
            <span>Net P&L Curve</span>
          </button>
          <button
            type="button"
            className={`chart-mode-btn font-mono ${chartMode === 'cashflow' ? 'mode-active' : ''}`}
            onClick={() => setChartMode('cashflow')}
          >
            <BarChart3 size={12} />
            <span>Inflow vs Outflow</span>
          </button>
          <button
            type="button"
            className={`chart-mode-btn font-mono ${chartMode === 'valuation' ? 'mode-active' : ''}`}
            onClick={() => setChartMode('valuation')}
          >
            <Activity size={12} />
            <span>Cumulative Valuation</span>
          </button>
        </div>
      </div>

      {/* High-Precision Interactive Stock Market Chart */}
      <section className="terminal-chart-card">
        <div className="terminal-chart-header">
          <div className="flex-align gap-2">
            <span className="dot-live-indicator" />
            <h3 className="terminal-chart-title font-mono text-xs uppercase tracking-wider text-muted">
              {timeframe === '1D' && '30-Day Daily Cash Burn & Payday Spikes'}
              {timeframe === '1W' && '8-Week Cashflow Run-Rate'}
              {timeframe === '1M' && '12-Month Compounding Trajectory'}
              {timeframe === '3M' && 'Quarterly Earnings Free Cashflow (Q1-Q4)'}
              {timeframe === '6M' && 'Half-Yearly Fiscal Trajectory (H1-H2)'}
              {timeframe === '12M' && '5-Year Long-Horizon Wealth Valuation'}
            </h3>
          </div>

          <div className="terminal-legend font-mono text-xs flex-align gap-3">
            <span className="flex-align gap-1">
              <span className="legend-swatch bg-nebula" /> Inflow Gain
            </span>
            <span className="flex-align gap-1">
              <span className="legend-swatch bg-corona" /> Outflow Burn
            </span>
            <span className="flex-align gap-1">
              <span className="legend-swatch bg-quasar" /> Net Reserve
            </span>
          </div>
        </div>

        <div className="terminal-chart-wrapper" style={{ height: 340, width: '100%' }}>
          <ResponsiveContainer width="100%" height="100%">
            {chartMode === 'cashflow' ? (
              <BarChart data={timeSeriesData} margin={{ top: 20, right: 10, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                <XAxis dataKey="shortLabel" stroke="var(--ink-muted)" tick={{ fontSize: 11, fontFamily: 'monospace' }} />
                <YAxis
                  stroke="var(--ink-muted)"
                  tick={{ fontSize: 11, fontFamily: 'monospace' }}
                  tickFormatter={(val) => `₹${val >= 100000 ? `${(val / 100000).toFixed(1)}L` : val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val}`}
                />
                <Tooltip content={<CustomTerminalTooltip />} />
                <Bar dataKey="inflow" name="Inflow" fill="#5ec491" radius={[3, 3, 0, 0]} />
                <Bar dataKey="outflow" name="Outflow" fill="#e56b6f" radius={[3, 3, 0, 0]} />
              </BarChart>
            ) : chartMode === 'valuation' ? (
              <AreaChart data={timeSeriesData} margin={{ top: 20, right: 10, left: 10, bottom: 5 }}>
                <defs>
                  <linearGradient id="valGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#bf9ff1" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#bf9ff1" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                <XAxis dataKey="shortLabel" stroke="var(--ink-muted)" tick={{ fontSize: 11, fontFamily: 'monospace' }} />
                <YAxis
                  stroke="var(--ink-muted)"
                  tick={{ fontSize: 11, fontFamily: 'monospace' }}
                  tickFormatter={(val) => `₹${(val / 100000).toFixed(1)}L`}
                />
                <Tooltip content={<CustomTerminalTooltip />} />
                <Area
                  type="monotone"
                  dataKey="cumulativeValuation"
                  name="Cumulative Valuation"
                  stroke="#bf9ff1"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#valGrad)"
                />
              </AreaChart>
            ) : (
              <AreaChart data={timeSeriesData} margin={{ top: 20, right: 10, left: 10, bottom: 5 }}>
                <defs>
                  <linearGradient id="pnlGainGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#5ec491" stopOpacity={0.45} />
                    <stop offset="95%" stopColor="#5ec491" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                <XAxis dataKey="shortLabel" stroke="var(--ink-muted)" tick={{ fontSize: 11, fontFamily: 'monospace' }} />
                <YAxis
                  stroke="var(--ink-muted)"
                  tick={{ fontSize: 11, fontFamily: 'monospace' }}
                  tickFormatter={(val) => `₹${val >= 100000 ? `${(val / 100000).toFixed(1)}L` : val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val}`}
                />
                <ReferenceLine y={0} stroke="rgba(255,255,255,0.25)" strokeDasharray="4 4" />
                <Tooltip content={<CustomTerminalTooltip />} />
                <Area
                  type="monotone"
                  dataKey="netPnL"
                  name="Net P&L Surplus"
                  stroke={isGain ? '#5ec491' : '#e56b6f'}
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#pnlGainGrad)"
                />
              </AreaChart>
            )}
          </ResponsiveContainer>
        </div>
      </section>

      {/* Corporate Financial Statement Matrix (P&L Breakdown) */}
      <section className="terminal-statement-card" id="terminal-financial-statement">
        <div className="terminal-statement-header">
          <div className="flex-align gap-2">
            <h3 className="font-semibold text-base m-0">Personal Income Statement (P&L Audit)</h3>
            <span className="tag-pill tag-nebula font-mono text-[10px]">GAAP/IFRS ANALOGY</span>
          </div>
          <span className="text-muted text-xs font-mono">Currency: INR (₹) · Client-Side Audit</span>
        </div>

        <div className="statement-table-wrapper">
          <table className="statement-table font-mono text-xs">
            <thead>
              <tr>
                <th className="text-left">ACCOUNT LINE</th>
                <th className="text-left">CATEGORY</th>
                <th className="text-right">MONTHLY RUN-RATE</th>
                <th className="text-right">ANNUALIZED</th>
                <th className="text-right">% OF REVENUE</th>
              </tr>
            </thead>
            <tbody>
              {/* Revenue Section */}
              <tr className="statement-row-heading">
                <td colSpan={5}>1. OPERATING REVENUE (INFLOWS)</td>
              </tr>
              <tr>
                <td className="pl-4">Primary Salary (Net Take-Home)</td>
                <td><span className="tag-badge">Core Operations</span></td>
                <td className="text-right text-nebula">+₹{salary.toLocaleString('en-IN')}</td>
                <td className="text-right text-nebula">+₹{(salary * 12).toLocaleString('en-IN')}</td>
                <td className="text-right text-muted">{((salary / monthlyInflow) * 100).toFixed(1)}%</td>
              </tr>
              {freelance > 0 && (
                <tr>
                  <td className="pl-4">Secondary Consulting / Gigs</td>
                  <td><span className="tag-badge">Ancillary Operations</span></td>
                  <td className="text-right text-nebula">+₹{freelance.toLocaleString('en-IN')}</td>
                  <td className="text-right text-nebula">+₹{(freelance * 12).toLocaleString('en-IN')}</td>
                  <td className="text-right text-muted">{((freelance / monthlyInflow) * 100).toFixed(1)}%</td>
                </tr>
              )}
              {otherIncome > 0 && (
                <tr>
                  <td className="pl-4">Other Inflow Streams</td>
                  <td><span className="tag-badge">Other Operations</span></td>
                  <td className="text-right text-nebula">+₹{otherIncome.toLocaleString('en-IN')}</td>
                  <td className="text-right text-nebula">+₹{(otherIncome * 12).toLocaleString('en-IN')}</td>
                  <td className="text-right text-muted">{((otherIncome / monthlyInflow) * 100).toFixed(1)}%</td>
                </tr>
              )}
              <tr className="statement-subtotal">
                <td className="font-bold">TOTAL OPERATING REVENUE</td>
                <td></td>
                <td className="text-right font-bold text-nebula">+₹{monthlyInflow.toLocaleString('en-IN')}</td>
                <td className="text-right font-bold text-nebula">+₹{(monthlyInflow * 12).toLocaleString('en-IN')}</td>
                <td className="text-right font-bold">100.0%</td>
              </tr>

              {/* Cost of Living (COGS) Section */}
              <tr className="statement-row-heading">
                <td colSpan={5}>2. COST OF SURVIVAL & DEBT SERVICE (ESSENTIAL OUTFLOWS)</td>
              </tr>
              <tr>
                <td className="pl-4">Shelter & Housing Rent</td>
                <td><span className="tag-badge tag-amber">Fixed Overhead</span></td>
                <td className="text-right text-corona">-₹{housing.toLocaleString('en-IN')}</td>
                <td className="text-right text-corona">-₹{(housing * 12).toLocaleString('en-IN')}</td>
                <td className="text-right text-muted">{((housing / monthlyInflow) * 100).toFixed(1)}%</td>
              </tr>
              <tr>
                <td className="pl-4">Essential Groceries & Food</td>
                <td><span className="tag-badge tag-amber">COGS</span></td>
                <td className="text-right text-corona">-₹{groceries.toLocaleString('en-IN')}</td>
                <td className="text-right text-corona">-₹{(groceries * 12).toLocaleString('en-IN')}</td>
                <td className="text-right text-muted">{((groceries / monthlyInflow) * 100).toFixed(1)}%</td>
              </tr>
              <tr>
                <td className="pl-4">Utilities & High-Speed Connectivity</td>
                <td><span className="tag-badge tag-amber">Essential Ops</span></td>
                <td className="text-right text-corona">-₹{utilities.toLocaleString('en-IN')}</td>
                <td className="text-right text-corona">-₹{(utilities * 12).toLocaleString('en-IN')}</td>
                <td className="text-right text-muted">{((utilities / monthlyInflow) * 100).toFixed(1)}%</td>
              </tr>
              <tr>
                <td className="pl-4">Commute & Transport</td>
                <td><span className="tag-badge tag-amber">Essential Ops</span></td>
                <td className="text-right text-corona">-₹{transport.toLocaleString('en-IN')}</td>
                <td className="text-right text-corona">-₹{(transport * 12).toLocaleString('en-IN')}</td>
                <td className="text-right text-muted">{((transport / monthlyInflow) * 100).toFixed(1)}%</td>
              </tr>
              {emi > 0 && (
                <tr>
                  <td className="pl-4">Debt Servicing & EMIs</td>
                  <td><span className="tag-badge tag-red">Debt Obligation</span></td>
                  <td className="text-right text-corona">-₹{emi.toLocaleString('en-IN')}</td>
                  <td className="text-right text-corona">-₹{(emi * 12).toLocaleString('en-IN')}</td>
                  <td className="text-right text-muted">{((emi / monthlyInflow) * 100).toFixed(1)}%</td>
                </tr>
              )}
              {insurance > 0 && (
                <tr>
                  <td className="pl-4">Term & Health Insurance</td>
                  <td><span className="tag-badge">Risk Shield</span></td>
                  <td className="text-right text-corona">-₹{insurance.toLocaleString('en-IN')}</td>
                  <td className="text-right text-corona">-₹{(insurance * 12).toLocaleString('en-IN')}</td>
                  <td className="text-right text-muted">{((insurance / monthlyInflow) * 100).toFixed(1)}%</td>
                </tr>
              )}
              <tr>
                <td className="pl-4">Discretionary Lifestyle & Leisure</td>
                <td><span className="tag-badge">OPEX</span></td>
                <td className="text-right text-corona">-₹{lifestyle.toLocaleString('en-IN')}</td>
                <td className="text-right text-corona">-₹{(lifestyle * 12).toLocaleString('en-IN')}</td>
                <td className="text-right text-muted">{((lifestyle / monthlyInflow) * 100).toFixed(1)}%</td>
              </tr>
              {customExpenses.map((exp: { id: string; name: string; amount: number }) => (
                <tr key={exp.id}>
                  <td className="pl-4">{exp.name}</td>
                  <td><span className="tag-badge">Custom Line</span></td>
                  <td className="text-right text-corona">-₹{exp.amount.toLocaleString('en-IN')}</td>
                  <td className="text-right text-corona">-₹{(exp.amount * 12).toLocaleString('en-IN')}</td>
                  <td className="text-right text-muted">{((exp.amount / monthlyInflow) * 100).toFixed(1)}%</td>
                </tr>
              ))}
              <tr className="statement-subtotal">
                <td className="font-bold">TOTAL OPERATING EXPENSES</td>
                <td></td>
                <td className="text-right font-bold text-corona">-₹{monthlyOutflow.toLocaleString('en-IN')}</td>
                <td className="text-right font-bold text-corona">-₹{(monthlyOutflow * 12).toLocaleString('en-IN')}</td>
                <td className="text-right font-bold">{((monthlyOutflow / monthlyInflow) * 100).toFixed(1)}%</td>
              </tr>

              {/* Bottom Line (Net Free Cashflow / Profit) */}
              <tr className="statement-final-row">
                <td className="font-bold">
                  <div className="flex-align gap-1.5">
                    <Zap size={14} className={isGain ? 'text-nebula' : 'text-corona'} />
                    <span>NET FREE CASHFLOW (OPERATING PROFIT)</span>
                  </div>
                </td>
                <td>
                  <span className={`tag-pill ${isGain ? 'tag-nebula' : 'tag-corona'} font-bold`}>
                    {isGain ? 'NET SURPLUS' : 'CASH DEFICIT'}
                  </span>
                </td>
                <td className={`text-right font-bold text-base ${isGain ? 'text-nebula' : 'text-corona'}`}>
                  {isGain ? '+' : ''}₹{monthlySurplus.toLocaleString('en-IN')}
                </td>
                <td className={`text-right font-bold text-base ${isGain ? 'text-nebula' : 'text-corona'}`}>
                  {isGain ? '+' : ''}₹{annualSurplus.toLocaleString('en-IN')}
                </td>
                <td className={`text-right font-bold text-base ${isGain ? 'text-nebula' : 'text-corona'}`}>
                  {savingsRate.toFixed(1)}%
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};

// Custom Terminal Tooltip component
const CustomTerminalTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="terminal-tooltip-box font-mono">
        <div className="terminal-tooltip-header">{data.label || label}</div>
        <div className="terminal-tooltip-body">
          {data.inflow !== undefined && (
            <div className="flex-between gap-3 text-xs">
              <span className="text-muted">Inflow Revenue:</span>
              <span className="text-nebula font-bold">+₹{data.inflow.toLocaleString('en-IN')}</span>
            </div>
          )}
          {data.outflow !== undefined && (
            <div className="flex-between gap-3 text-xs">
              <span className="text-muted">Outflow Burn:</span>
              <span className="text-corona font-bold">-₹{data.outflow.toLocaleString('en-IN')}</span>
            </div>
          )}
          {data.netPnL !== undefined && (
            <div className="flex-between gap-3 text-xs pt-1 border-t border-subtle">
              <span className="text-muted">Net Cashflow P&L:</span>
              <span className={`font-bold ${data.netPnL >= 0 ? 'text-nebula' : 'text-corona'}`}>
                {data.netPnL >= 0 ? '+' : ''}₹{data.netPnL.toLocaleString('en-IN')}
              </span>
            </div>
          )}
          {data.cumulativeValuation !== undefined && (
            <div className="flex-between gap-3 text-xs pt-1 border-t border-subtle">
              <span className="text-muted">Valuation Equity:</span>
              <span className="text-quasar font-bold">₹{data.cumulativeValuation.toLocaleString('en-IN')}</span>
            </div>
          )}
        </div>
      </div>
    );
  }
  return null;
};
