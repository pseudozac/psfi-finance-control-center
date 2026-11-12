import React, { useState, useRef, useEffect } from 'react';
import {
  X,
  Share2,
  Copy,
  Download,
  Check,
  Eye,
  EyeOff,
  Sparkles,
} from 'lucide-react';
import type {
  FinancePlan,
  FinanceSummary,
  BudgetRuleAnalysis,
  TaxComparisonResult,
  DebtPayoffResult,
} from '../types/finance';
import { formatINR } from '../lib/finance';

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

  // Draw card onto canvas for crisp 2x export
  const drawCardToCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = 1200;
    const height = 630;
    canvas.width = width;
    canvas.height = height;

    // Background Gradient & Card Base
    const bgGrad = ctx.createLinearGradient(0, 0, width, height);
    bgGrad.addColorStop(0, '#0c0d12');
    bgGrad.addColorStop(0.5, '#121520');
    bgGrad.addColorStop(1, '#090a0f');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, width, height);

    // Subtle Grid Accent Lines
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
    ctx.lineWidth = 1;
    for (let x = 40; x < width; x += 40) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    for (let y = 40; y < height; y += 40) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    // Outer Glow Border
    ctx.strokeStyle = 'rgba(191, 159, 241, 0.35)';
    ctx.lineWidth = 2;
    ctx.strokeRect(20, 20, width - 40, height - 40);

    // Header: Brand & Tagline
    ctx.fillStyle = '#bf9ff1';
    ctx.font = 'bold 36px monospace';
    ctx.fillText('p · s · f · i', 60, 80);

    ctx.fillStyle = '#8a90a2';
    ctx.font = '500 18px sans-serif';
    ctx.fillText('FINANCIAL HEALTH SCORECARD · CLIENT-SIDE & PRIVATE', 260, 75);

    // Score Ring / Pill Box
    ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.fillRect(width - 240, 50, 180, 50);
    ctx.strokeStyle = 'rgba(94, 196, 145, 0.5)';
    ctx.strokeRect(width - 240, 50, 180, 50);
    ctx.fillStyle = '#5ec491';
    ctx.font = 'bold 20px monospace';
    ctx.fillText(`SCORE: ${overallHealthScore}/100`, width - 225, 82);

    // Main Persona Banner
    ctx.fillStyle = '#ffffff';
    ctx.font = '800 48px sans-serif';
    ctx.fillText(personaTitle, 60, 175);

    ctx.fillStyle = '#ffb454';
    ctx.font = '600 20px monospace';
    ctx.fillText(`[ ${personaBadge.toUpperCase()} ] · ARCHETYPE STATUS`, 60, 215);

    // Divider Line
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
    ctx.beginPath();
    ctx.moveTo(60, 245);
    ctx.lineTo(width - 60, 245);
    ctx.stroke();

    // 4 Key Pillars Matrix (2x2)
    // Pillar 1: Savings & SIP
    ctx.fillStyle = 'rgba(18, 20, 26, 0.85)';
    ctx.fillRect(60, 275, 510, 130);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.strokeRect(60, 275, 510, 130);

    ctx.fillStyle = '#8a90a2';
    ctx.font = '600 15px monospace';
    ctx.fillText('COMPOUNDING SAVINGS RATE', 85, 310);
    ctx.fillStyle = '#5ec491';
    ctx.font = 'bold 38px monospace';
    ctx.fillText(`${savingsRate}% / MO`, 85, 360);
    ctx.fillStyle = '#8a90a2';
    ctx.font = '14px sans-serif';
    ctx.fillText(
      anonymized ? 'Target Met: 20%+ wealth acceleration tier' : `Net Monthly SIP: ${formatINR(plan.savings.monthlySip)}`,
      85,
      388
    );

    // Pillar 2: 50/30/20 Balance
    ctx.fillRect(630, 275, 510, 130);
    ctx.strokeRect(630, 275, 510, 130);

    ctx.fillStyle = '#8a90a2';
    ctx.font = '600 15px monospace';
    ctx.fillText('50/30/20 BUDGET EQUILIBRIUM', 655, 310);
    ctx.fillStyle = '#bf9ff1';
    ctx.font = 'bold 36px monospace';
    ctx.fillText(
      `${Math.round(budgetRule.needsPercent)}% / ${Math.round(budgetRule.wantsPercent)}% / ${Math.round(budgetRule.savingsPercent)}%`,
      655,
      360
    );
    ctx.fillStyle = '#8a90a2';
    ctx.font = '14px sans-serif';
    ctx.fillText('Needs / Wants / Wealth Preservation', 655, 388);

    // Pillar 3: Emergency Runway
    ctx.fillRect(60, 430, 510, 130);
    ctx.strokeRect(60, 430, 510, 130);

    ctx.fillStyle = '#8a90a2';
    ctx.font = '600 15px monospace';
    ctx.fillText('EMERGENCY SURVIVAL RUNWAY', 85, 465);
    ctx.fillStyle = '#ffb454';
    ctx.font = 'bold 38px monospace';
    ctx.fillText(`${runwayMonths} MONTHS`, 85, 515);
    ctx.fillStyle = '#8a90a2';
    ctx.font = '14px sans-serif';
    ctx.fillText(
      runwayMonths >= 6 ? 'Tier 2 Fortress: Full 6-Month Shock Absorption' : 'Building towards 6-month buffer',
      85,
      543
    );

    // Pillar 4: Tax Optimization
    ctx.fillRect(630, 430, 510, 130);
    ctx.strokeRect(630, 430, 510, 130);

    ctx.fillStyle = '#8a90a2';
    ctx.font = '600 15px monospace';
    ctx.fillText('INDIAN TAX REGIME EFFICIENCY', 655, 465);
    ctx.fillStyle = '#7193ed';
    ctx.font = 'bold 32px sans-serif';
    ctx.fillText(
      taxComparison.recommended === 'new' ? 'New Regime Optimal' : 'Old Regime Optimal',
      655,
      512
    );
    ctx.fillStyle = '#8a90a2';
    ctx.font = '14px sans-serif';
    ctx.fillText(
      anonymized ? 'Sec 87A + 80CCD(1B) NPS + Cess Audited' : `Net Annual Savings: ${formatINR(taxComparison.savings)}`,
      655,
      543
    );

    // Footer Watermark
    ctx.fillStyle = '#555b6e';
    ctx.font = '13px monospace';
    ctx.fillText('Generated client-side with zero telemetry · pseudo-fi.vercel.app', 60, 595);
    ctx.fillText(`Vault: ${accountName || 'Personal'} · 100% Offline PWA`, width - 360, 595);
  };

  useEffect(() => {
    if (isOpen) {
      setTimeout(drawCardToCanvas, 100);
    }
  }, [isOpen, anonymized, plan, summary, budgetRule, taxComparison]);

  if (!isOpen) return null;

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
    link.download = `psfi-financial-health-card-${Date.now()}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
    setTimeout(() => setDownloading(false), 800);
  };

  // Share to X / Twitter intent
  const shareTwitterIntent = () => {
    const text = encodeURIComponent(
      `Just audited my personal cashflow, 50/30/20 balance & emergency runway on PsFi.\n\n` +
      `🔥 Health Score: ${overallHealthScore}/100\n` +
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

        {/* Live Canvas Preview */}
        <div className="share-canvas-container">
          <canvas ref={canvasRef} className="share-health-canvas" />
        </div>

        {/* Privacy & Action Controls */}
        <div className="share-modal-toolbar flex-between items-center mt-3 pt-3 border-t border-subtle">
          {/* Privacy Anonymize Toggle */}
          <button
            type="button"
            className={`action-pill ${anonymized ? 'pill-active-mode' : ''}`}
            onClick={() => setAnonymized(!anonymized)}
            title={anonymized ? 'Showing percentages and ratings only (Safe for LinkedIn/X)' : 'Showing raw rupee numbers'}
          >
            {anonymized ? <EyeOff size={13} className="text-corona" /> : <Eye size={13} />}
            <span className="font-mono text-xs">
              {anonymized ? 'Anonymized Ratios (Safe to Share)' : 'Show Rupee Figures'}
            </span>
          </button>

          {/* Action Buttons */}
          <div className="flex-align gap-2">
            <button
              type="button"
              className="btn-secondary font-mono text-xs flex-align gap-1.5"
              onClick={shareTwitterIntent}
              title="Post to X / Twitter"
            >
              <Share2 size={13} className="text-pulsar" />
              <span>Tweet</span>
            </button>

            <button
              type="button"
              className="btn-secondary font-mono text-xs flex-align gap-1.5"
              onClick={handleCopyImage}
              title="Copy card image to clipboard"
            >
              {copied ? <Check size={13} className="text-nebula" /> : <Copy size={13} />}
              <span>{copied ? 'Copied Image!' : 'Copy Image'}</span>
            </button>

            <button
              type="button"
              className="btn-primary font-mono text-xs flex-align gap-1.5"
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
