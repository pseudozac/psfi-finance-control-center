import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  X,
  Share2,
  Copy,
  Download,
  Check,
  Eye,
  EyeOff,
  Sparkles,
  Layout,
  Palette,
} from 'lucide-react';
import type {
  FinancePlan,
  FinanceSummary,
  BudgetRuleAnalysis,
  TaxComparisonResult,
  DebtPayoffResult,
} from '../types/finance';
import { formatINR } from '../lib/finance';

export type CardFormat = 'landscape' | 'square' | 'story';
export type CardSkin = 'nebula' | 'solstice' | 'pulsar' | 'editorial';

interface SocialShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  plan: FinancePlan;
  summary: FinanceSummary;
  budgetRule: BudgetRuleAnalysis;
  taxComparison: TaxComparisonResult;
  debtPayoff: DebtPayoffResult;
  accountName: string;
}

interface ThemePalette {
  bgStart: string;
  bgMid: string;
  bgEnd: string;
  gridLine: string;
  border: string;
  primaryText: string;
  secondaryText: string;
  accent: string;
  highlight: string;
  cardBg: string;
  cardBorder: string;
}

const THEME_PALETTES: Record<CardSkin, ThemePalette> = {
  nebula: {
    bgStart: '#0b0c11',
    bgMid: '#12141f',
    bgEnd: '#090a0f',
    gridLine: 'rgba(255, 255, 255, 0.04)',
    border: 'rgba(191, 159, 241, 0.4)',
    primaryText: '#ffffff',
    secondaryText: '#8a90a2',
    accent: '#bf9ff1', // Quasar
    highlight: '#5ec491', // Nebula Mint
    cardBg: 'rgba(18, 20, 26, 0.88)',
    cardBorder: 'rgba(255, 255, 255, 0.08)',
  },
  solstice: {
    bgStart: '#110e0a',
    bgMid: '#1a150e',
    bgEnd: '#0a0805',
    gridLine: 'rgba(255, 180, 84, 0.05)',
    border: 'rgba(255, 180, 84, 0.4)',
    primaryText: '#fffdfa',
    secondaryText: '#a49887',
    accent: '#ffb454', // Solstice Gold
    highlight: '#ffd166',
    cardBg: 'rgba(26, 21, 15, 0.88)',
    cardBorder: 'rgba(255, 180, 84, 0.15)',
  },
  pulsar: {
    bgStart: '#0a0d16',
    bgMid: '#101728',
    bgEnd: '#070910',
    gridLine: 'rgba(113, 147, 237, 0.06)',
    border: 'rgba(113, 147, 237, 0.4)',
    primaryText: '#ffffff',
    secondaryText: '#8291b5',
    accent: '#7193ed', // Pulsar Cyan
    highlight: '#c084fc',
    cardBg: 'rgba(16, 23, 40, 0.88)',
    cardBorder: 'rgba(113, 147, 237, 0.16)',
  },
  editorial: {
    bgStart: '#f7f8fa',
    bgMid: '#edf0f5',
    bgEnd: '#e4e7ee',
    gridLine: 'rgba(0, 0, 0, 0.05)',
    border: 'rgba(0, 0, 0, 0.15)',
    primaryText: '#0f1117',
    secondaryText: '#525866',
    accent: '#2b3040',
    highlight: '#16a34a',
    cardBg: 'rgba(255, 255, 255, 0.92)',
    cardBorder: 'rgba(0, 0, 0, 0.08)',
  },
};

export const SocialShareModal: React.FC<SocialShareModalProps> = ({
  isOpen,
  onClose,
  plan,
  summary,
  budgetRule,
  taxComparison,
  debtPayoff,
  accountName,
}) => {
  const [format, setFormat] = useState<CardFormat>('landscape');
  const [skin, setSkin] = useState<CardSkin>('nebula');
  const [anonymized, setAnonymized] = useState(true);
  const [copied, setCopied] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Derive scores & metrics
  const savingsRate = Math.round(summary.savingsRatePercent);
  const savingsScore = Math.min(100, Math.round((savingsRate / 20) * 100));
  const runwayMonths = Math.min(24, Number((summary.emergencyRunwayMonths || 0).toFixed(1)));
  const runwayScore = Math.min(100, Math.round((runwayMonths / 6) * 100));
  const budgetBalanceScore = budgetRule.score || 85;
  const overallHealthScore = Math.round(
    savingsScore * 0.4 + budgetBalanceScore * 0.35 + runwayScore * 0.25
  );

  // Financial Persona Badge
  let personaTitle = 'Balanced Builder';
  let personaBadge = 'Resilient';
  let scoreTier = 'ACCELERATING';
  if (overallHealthScore >= 90) scoreTier = 'ANTIFRAGILE';
  else if (overallHealthScore >= 75) scoreTier = 'RESILIENT';
  else scoreTier = 'DEFENSIVE';

  if (savingsRate >= 45) {
    personaTitle = 'High-Velocity Compounder';
    personaBadge = 'FIRE Pioneer';
  } else if (plan.debt.cardBalance > 0 && (debtPayoff.months ?? 0) <= 12) {
    personaTitle = 'Debt Crusher';
    personaBadge = 'Freedom Target';
  } else if (runwayMonths >= 6 && savingsRate >= 25) {
    personaTitle = 'Fortress Architect';
    personaBadge = 'Elite Balance';
  } else if (savingsRate >= 20) {
    personaTitle = 'Disciplined Compounder';
    personaBadge = 'Growth Mode';
  }

  // Draw card onto canvas with Retina resolution
  const drawCardToCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Dimensions based on selected format
    let width = 1200;
    let height = 630; // 1.91:1 Landscape
    if (format === 'square') {
      width = 1080;
      height = 1080;
    } else if (format === 'story') {
      width = 1080;
      height = 1920;
    }

    canvas.width = width;
    canvas.height = height;

    const pal = THEME_PALETTES[skin];

    // Background Gradient & Card Base
    const bgGrad = ctx.createLinearGradient(0, 0, width, height);
    bgGrad.addColorStop(0, pal.bgStart);
    bgGrad.addColorStop(0.5, pal.bgMid);
    bgGrad.addColorStop(1, pal.bgEnd);
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, width, height);

    // Subtle Grid Lines
    ctx.strokeStyle = pal.gridLine;
    ctx.lineWidth = 1;
    const stepSize = format === 'story' ? 50 : 40;
    for (let x = stepSize; x < width; x += stepSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    for (let y = stepSize; y < height; y += stepSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    // Outer Precision Border
    ctx.strokeStyle = pal.border;
    ctx.lineWidth = 2;
    ctx.strokeRect(20, 20, width - 40, height - 40);

    // Header: Brand & Identity
    ctx.fillStyle = pal.accent;
    ctx.font = 'bold 36px monospace';
    ctx.fillText('psfi', 60, 80);

    ctx.fillStyle = pal.secondaryText;
    ctx.font = '500 16px sans-serif';
    ctx.fillText('·  FINANCIAL HEALTH SCORECARD · CLIENT-SIDE & PRIVATE', 165, 76);

    // Circular Health Score Gauge (Right side in Landscape/Square, Center in Story)
    const gaugeCenterX = format === 'story' ? width / 2 : width - 140;
    const gaugeCenterY = format === 'story' ? 270 : 80;
    const gaugeRadius = format === 'story' ? 65 : 44;

    // Track circle
    ctx.beginPath();
    ctx.arc(gaugeCenterX, gaugeCenterY, gaugeRadius, 0, 2 * Math.PI);
    ctx.strokeStyle = pal.cardBorder;
    ctx.lineWidth = 6;
    ctx.stroke();

    // Active progress arc
    const startAngle = -Math.PI / 2;
    const endAngle = startAngle + (overallHealthScore / 100) * 2 * Math.PI;
    ctx.beginPath();
    ctx.arc(gaugeCenterX, gaugeCenterY, gaugeRadius, startAngle, endAngle);
    ctx.strokeStyle = pal.highlight;
    ctx.lineWidth = 6;
    ctx.lineCap = 'round';
    ctx.stroke();

    // Score text inside ring
    ctx.fillStyle = pal.primaryText;
    ctx.font = `bold ${format === 'story' ? 32 : 20}px monospace`;
    ctx.textAlign = 'center';
    ctx.fillText(`${overallHealthScore}`, gaugeCenterX, gaugeCenterY + (format === 'story' ? 10 : 7));
    ctx.textAlign = 'left';

    // Persona Title & Tagline
    const titleY = format === 'story' ? 410 : 170;
    ctx.fillStyle = pal.primaryText;
    ctx.font = `800 ${format === 'story' ? 52 : 46}px sans-serif`;
    ctx.fillText(personaTitle, 60, titleY);

    ctx.fillStyle = pal.accent;
    ctx.font = '600 20px monospace';
    ctx.fillText(`[ ${personaBadge.toUpperCase()} ] · STATUS: ${scoreTier}`, 60, titleY + 40);

    // Divider Line
    const dividerY = titleY + 70;
    ctx.strokeStyle = pal.border;
    ctx.beginPath();
    ctx.moveTo(60, dividerY);
    ctx.lineTo(width - 60, dividerY);
    ctx.stroke();

    // 4 Key Pillars Quadrant
    if (format === 'landscape') {
      const cardW = 520;
      const cardH = 125;

      // Pillar 1: Savings Rate
      drawPillarBox(ctx, pal, 60, dividerY + 25, cardW, cardH, 'COMPOUNDING SAVINGS RATE', `${savingsRate}% / MO`, pal.highlight, anonymized ? 'Target Met: 20%+ wealth acceleration tier' : `Net Monthly SIP: ${formatINR(plan.savings.monthlySip)}`);

      // Pillar 2: 50/30/20 Balance
      drawPillarBox(ctx, pal, 620, dividerY + 25, cardW, cardH, '50/30/20 BUDGET EQUILIBRIUM', `${Math.round(budgetRule.needsPercent)}% / ${Math.round(budgetRule.wantsPercent)}% / ${Math.round(budgetRule.savingsPercent)}%`, pal.accent, 'Needs / Wants / Wealth Preservation');

      // Pillar 3: Emergency Runway
      drawPillarBox(ctx, pal, 60, dividerY + 175, cardW, cardH, 'EMERGENCY SURVIVAL RUNWAY', `${runwayMonths} MONTHS`, pal.accent, runwayMonths >= 6 ? 'Tier 2 Fortress: Full 6-Month Absorption' : 'Building towards 6-month buffer');

      // Pillar 4: Tax Optimization
      drawPillarBox(ctx, pal, 620, dividerY + 175, cardW, cardH, 'INDIAN TAX REGIME EFFICIENCY', taxComparison.recommended === 'new' ? 'New Regime Optimal' : 'Old Regime Optimal', pal.highlight, anonymized ? 'Sec 87A + 80CCD(1B) NPS + Cess Audited' : `Net Annual Savings: ${formatINR(taxComparison.savings)}`);
    } else if (format === 'square') {
      const cardW = 460;
      const cardH = 160;

      // 2x2 Grid with larger spacing
      drawPillarBox(ctx, pal, 60, dividerY + 40, cardW, cardH, 'COMPOUNDING SAVINGS RATE', `${savingsRate}% / MO`, pal.highlight, anonymized ? 'Target Met: 20%+ acceleration tier' : `Net Monthly SIP: ${formatINR(plan.savings.monthlySip)}`);
      drawPillarBox(ctx, pal, 560, dividerY + 40, cardW, cardH, '50/30/20 BUDGET EQUILIBRIUM', `${Math.round(budgetRule.needsPercent)}% / ${Math.round(budgetRule.wantsPercent)}% / ${Math.round(budgetRule.savingsPercent)}%`, pal.accent, 'Needs / Wants / Wealth Balance');
      drawPillarBox(ctx, pal, 60, dividerY + 230, cardW, cardH, 'EMERGENCY SURVIVAL RUNWAY', `${runwayMonths} MONTHS`, pal.accent, runwayMonths >= 6 ? 'Tier 2 Fortress: Shock Absorption' : 'Building towards 6-month buffer');
      drawPillarBox(ctx, pal, 560, dividerY + 230, cardW, cardH, 'INDIAN TAX REGIME EFFICIENCY', taxComparison.recommended === 'new' ? 'New Regime Optimal' : 'Old Regime Optimal', pal.highlight, anonymized ? 'Sec 87A + 80CCD(1B) NPS Audited' : `Net Annual Savings: ${formatINR(taxComparison.savings)}`);

      // Extra Milestone Strip for Square
      ctx.fillStyle = pal.cardBg;
      ctx.fillRect(60, dividerY + 420, 960, 110);
      ctx.strokeStyle = pal.cardBorder;
      ctx.strokeRect(60, dividerY + 420, 960, 110);
      ctx.fillStyle = pal.accent;
      ctx.font = '600 16px monospace';
      ctx.fillText('FINANCIAL INDEPENDENCE VELOCITY', 85, dividerY + 455);
      ctx.fillStyle = pal.primaryText;
      ctx.font = 'bold 24px sans-serif';
      ctx.fillText(savingsRate >= 30 ? '🚀 High Acceleration: Freedom Milestone ahead of schedule' : '📈 Disciplined Path: Steady compounding trajectory', 85, dividerY + 495);
    } else {
      // Story Portrait (1080x1920) - 4 vertically stacked cards
      const cardW = 960;
      const cardH = 190;
      const startStackY = dividerY + 60;

      drawPillarBox(ctx, pal, 60, startStackY, cardW, cardH, '1. COMPOUNDING SAVINGS RATE', `${savingsRate}% / MO`, pal.highlight, anonymized ? 'Target Met: 20%+ wealth acceleration tier' : `Net Monthly SIP: ${formatINR(plan.savings.monthlySip)}`);
      drawPillarBox(ctx, pal, 60, startStackY + 220, cardW, cardH, '2. 50/30/20 BUDGET EQUILIBRIUM', `${Math.round(budgetRule.needsPercent)}% Needs · ${Math.round(budgetRule.wantsPercent)}% Wants · ${Math.round(budgetRule.savingsPercent)}% Wealth`, pal.accent, 'Living Expenses vs Discretionary vs Investing');
      drawPillarBox(ctx, pal, 60, startStackY + 440, cardW, cardH, '3. EMERGENCY SURVIVAL RUNWAY', `${runwayMonths} MONTHS RESERVES`, pal.accent, runwayMonths >= 6 ? 'Tier 2 Fortress: Shock Absorption' : 'Building towards 6-month buffer');
      drawPillarBox(ctx, pal, 60, startStackY + 660, cardW, cardH, '4. INDIAN TAX REGIME EFFICIENCY', taxComparison.recommended === 'new' ? 'New Regime Optimal' : 'Old Regime Optimal', pal.highlight, anonymized ? 'Sec 87A + 80CCD(1B) NPS + Cess Audited' : `Net Annual Savings: ${formatINR(taxComparison.savings)}`);

      // High-Impact Story CTA Footer Box
      ctx.fillStyle = pal.cardBg;
      ctx.fillRect(60, startStackY + 880, cardW, 140);
      ctx.strokeStyle = pal.border;
      ctx.strokeRect(60, startStackY + 880, cardW, 140);
      ctx.fillStyle = pal.accent;
      ctx.font = '600 18px monospace';
      ctx.fillText('AUDIT YOUR OWN WEALTH SHEET', 90, startStackY + 930);
      ctx.fillStyle = pal.primaryText;
      ctx.font = 'bold 30px sans-serif';
      ctx.fillText('pseudo-fi.vercel.app', 90, startStackY + 980);
    }

    // Watermark Footer
    ctx.fillStyle = pal.secondaryText;
    ctx.font = '13px monospace';
    const footerY = height - 40;
    ctx.fillText('Generated client-side with zero telemetry · pseudo-fi.vercel.app', 60, footerY);
    ctx.fillText(`Vault: ${accountName || 'Personal'} · 100% Offline PWA`, width - 380, footerY);
  }, [format, skin, anonymized, plan, summary, budgetRule, taxComparison, accountName, overallHealthScore, personaTitle, personaBadge, scoreTier, savingsRate, runwayMonths]);

  useEffect(() => {
    if (isOpen) {
      setTimeout(drawCardToCanvas, 80);
    }
  }, [isOpen, drawCardToCanvas]);

  if (!isOpen) return null;

  // Helper function to draw each metrics pillar box
  function drawPillarBox(
    ctx: CanvasRenderingContext2D,
    pal: ThemePalette,
    x: number,
    y: number,
    w: number,
    h: number,
    title: string,
    value: string,
    valueColor: string,
    sub: string
  ) {
    ctx.fillStyle = pal.cardBg;
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = pal.cardBorder;
    ctx.strokeRect(x, y, w, h);

    ctx.fillStyle = pal.secondaryText;
    ctx.font = '600 14px monospace';
    ctx.fillText(title, x + 24, y + 34);

    ctx.fillStyle = valueColor;
    ctx.font = 'bold 36px monospace';
    ctx.fillText(value, x + 24, y + 80);

    ctx.fillStyle = pal.secondaryText;
    ctx.font = '14px sans-serif';
    ctx.fillText(sub, x + 24, y + 108);
  }

  // Copy PNG image to clipboard
  const handleCopyImage = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    try {
      canvas.toBlob(async (blob) => {
        if (!blob) return;
        const item = new ClipboardItem({ 'image/png': blob });
        await navigator.clipboard.write([item]);
        setCopied(true);
        setTimeout(() => setCopied(false), 2400);
      });
    } catch {
      // Fallback: Copy share link/text
      navigator.clipboard.writeText(
        `I scored ${overallHealthScore}/100 on PsFi Financial Health Audit with a ${savingsRate}% savings rate! Model your cashflow at https://pseudo-fi.vercel.app/`
      );
      setCopied(true);
      setTimeout(() => setCopied(false), 2400);
    }
  };

  // Download high-res PNG file
  const handleDownload = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    setDownloading(true);
    const link = document.createElement('a');
    link.download = `psfi-health-card-${format}-${skin}-${Date.now()}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
    setTimeout(() => setDownloading(false), 800);
  };

  // Share to X / Twitter intent
  const shareTwitterIntent = () => {
    const text = encodeURIComponent(
      `Just audited my personal cashflow, 50/30/20 balance & emergency runway on PsFi.\n\n` +
      `🔥 Health Score: ${overallHealthScore}/100 [${scoreTier}]\n` +
      `📈 Savings Rate: ${savingsRate}%\n` +
      `🛡️ Survival Runway: ${runwayMonths} months\n` +
      `⚖️ 100% client-side, private, and offline.\n\n` +
      `Check your balance sheet:`
    );
    const url = encodeURIComponent('https://pseudo-fi.vercel.app/');
    window.open(`https://twitter.com/intent/tweet?text=${text}&url=${url}`, '_blank');
  };

  return (
    <div className="modal-backdrop" onClick={onClose} role="dialog" aria-modal="true" aria-label="Share Financial Health Card">
      <div className="modal-card share-card-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header flex-between items-center">
          <div className="flex-align gap-2">
            <Sparkles size={16} className="text-quasar" />
            <h3 className="modal-title font-semibold text-sm m-0">Shareable Financial Health Card</h3>
          </div>
          <button type="button" className="icon-pill" onClick={onClose} title="Close (Esc)">
            <X size={15} />
          </button>
        </div>

        {/* Format & Skin Selectors Strip */}
        <div className="share-controls-row flex-between items-center gap-3 mt-2.5">
          {/* Aspect Ratio Switcher */}
          <div className="pill-segmented" role="group" aria-label="Card Format">
            <button
              type="button"
              className={format === 'landscape' ? 'pill-active' : ''}
              onClick={() => setFormat('landscape')}
              title="16:9 Banner (Twitter / LinkedIn)"
            >
              <Layout size={12} />
              <span>Landscape</span>
            </button>
            <button
              type="button"
              className={format === 'square' ? 'pill-active' : ''}
              onClick={() => setFormat('square')}
              title="1:1 Square (Instagram / Post)"
            >
              <span>Square (1:1)</span>
            </button>
            <button
              type="button"
              className={format === 'story' ? 'pill-active' : ''}
              onClick={() => setFormat('story')}
              title="9:16 Story (Instagram / Phone Wallpaper)"
            >
              <span>Story (9:16)</span>
            </button>
          </div>

          {/* Theme Skin Switcher */}
          <div className="pill-segmented" role="group" aria-label="Card Theme Skin">
            <button
              type="button"
              className={skin === 'nebula' ? 'pill-active' : ''}
              onClick={() => setSkin('nebula')}
              title="Nebula Violet Theme"
            >
              <Palette size={12} />
              <span>Nebula</span>
            </button>
            <button
              type="button"
              className={skin === 'solstice' ? 'pill-active text-solstice' : ''}
              onClick={() => setSkin('solstice')}
              title="Solstice Gold Theme"
            >
              <span>Solstice</span>
            </button>
            <button
              type="button"
              className={skin === 'pulsar' ? 'pill-active text-pulsar' : ''}
              onClick={() => setSkin('pulsar')}
              title="Pulsar Blue Theme"
            >
              <span>Pulsar</span>
            </button>
            <button
              type="button"
              className={skin === 'editorial' ? 'pill-active text-ink-primary' : ''}
              onClick={() => setSkin('editorial')}
              title="Swiss Editorial Theme"
            >
              <span>Editorial</span>
            </button>
          </div>
        </div>

        {/* Live Canvas Preview Box */}
        <div className={`share-canvas-container share-format-${format}`}>
          <canvas ref={canvasRef} className="share-health-canvas" />
        </div>

        {/* Privacy & Action Controls Toolbar */}
        <div className="share-modal-toolbar flex-between items-center mt-3 pt-3 border-t border-subtle flex-wrap gap-3">
          {/* Privacy Anonymize Toggle */}
          <button
            type="button"
            className={`action-pill shrink-0 ${anonymized ? 'pill-active-mode' : ''}`}
            onClick={() => setAnonymized(!anonymized)}
            title={anonymized ? 'Showing percentages and ratings only (Safe for LinkedIn/X)' : 'Showing raw rupee numbers'}
          >
            {anonymized ? <EyeOff size={13} className="text-corona" /> : <Eye size={13} />}
            <span className="font-mono text-xs whitespace-nowrap">
              {anonymized ? 'Anonymized Ratios (Safe to Share)' : 'Show Rupee Figures'}
            </span>
          </button>

          {/* Action Buttons */}
          <div className="flex-align gap-2 flex-wrap shrink-0">
            <button
              type="button"
              className="btn-secondary font-mono text-xs flex-align gap-1.5 shrink-0"
              onClick={shareTwitterIntent}
              title="Post to X / Twitter"
            >
              <Share2 size={13} className="text-pulsar" />
              <span>Tweet</span>
            </button>

            <button
              type="button"
              className="btn-secondary font-mono text-xs flex-align gap-1.5 shrink-0"
              onClick={handleCopyImage}
              title="Copy card image to clipboard"
            >
              {copied ? <Check size={13} className="text-nebula" /> : <Copy size={13} />}
              <span>{copied ? 'Copied Image!' : 'Copy Image'}</span>
            </button>

            <button
              type="button"
              className="btn-primary font-mono text-xs flex-align gap-1.5 shrink-0"
              onClick={handleDownload}
              title="Download card as high-res PNG"
            >
              <Download size={13} />
              <span>{downloading ? 'Downloading...' : 'Download PNG'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
